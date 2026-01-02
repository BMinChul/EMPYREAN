import Phaser from 'phaser';
import { OKXService } from '../../services/okxService';
import { useGameStore, BetRequest } from '../../store/gameStore';
import Assets from '../../assets.json';

interface PricePoint {
  worldX: number;
  worldY: number;
}

interface BettingBox {
  id: string; // Added ID for tracking
  container: Phaser.GameObjects.Container;
  rect: Phaser.GameObjects.Rectangle; // Hitbox
  bg: Phaser.GameObjects.Graphics; // Visual Background
  glow: Phaser.GameObjects.Image; // Proximity Glow
  textAmount: Phaser.GameObjects.Text;
  textMulti: Phaser.GameObjects.Text;
  betAmount: number;
  multiplier: number;
  hit: boolean;
  boxWidth: number;
  boxHeight: number;
  basePrice: number; 
}

export class MainScene extends Phaser.Scene {
  private okxService: OKXService;
  private priceHistory: PricePoint[] = [];
  private chartGraphics: Phaser.GameObjects.Graphics;
  private gridGraphics: Phaser.GameObjects.Graphics;
  
  // Containers for UI elements
  private headPriceLabel: Phaser.GameObjects.Container;
  private headPriceText: Phaser.GameObjects.Text;
  private headPriceBg: Phaser.GameObjects.Rectangle;

  private bettingBoxes: BettingBox[] = [];
  private pendingBoxes: Map<string, Phaser.GameObjects.Container> = new Map(); // Track pending bets

  private axisLabels: Phaser.GameObjects.Text[] = [];
  private gridLabels: Phaser.GameObjects.Text[] = [];

  // --- Configuration ---
  private timeWindowSeconds: number = 60; 
  private pixelsPerSecond: number = 0; 
  private pixelPerDollar: number = 200; 
  private gridPriceInterval: number = 0.5; 
  private gridCols: number = 6;
  
  // --- State ---
  private initialPrice: number | null = null;
  private currentPrice: number = 0;
  
  // Head Physics
  private headX: number = 0;
  private headY: number = 0;
  private targetHeadY: number = 0;
  
  // Volatility
  private jitterOffset: number = 0;
  private jitterTimer: number = 0;

  // Visuals
  private headEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private goldEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  
  private lastPointTime: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.audio('sfx_win', Assets.audio.sfx.win.url);
    this.load.audio('sfx_place', Assets.audio.sfx.place_bet.url);
    this.load.audio('sfx_error', Assets.audio.sfx.error.url);
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a0b2e'); 
    this.pixelsPerSecond = this.scale.width / this.timeWindowSeconds;
    
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    if (this.chartGraphics.postFX) {
        this.chartGraphics.postFX.addBloom(0xffffff, 1.0, 1.0, 1.2, 1.2);
    }
    if (this.gridGraphics.postFX) {
        this.gridGraphics.postFX.addBloom(0xffffff, 0.5, 0.5, 1.0, 1.0);
    }
    
    this.createTextures();

    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 50,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00ffff, 
      blendMode: 'ADD',
      lifespan: 300,
      frequency: 20
    });

    this.goldEmitter = this.add.particles(0, 0, 'flare', {
      speed: { min: 200, max: 600 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffd700,
      blendMode: 'ADD',
      lifespan: 1200,
      emitting: false,
      quantity: 60,
      gravityY: 300
    });

    this.createHeadLabel();
    this.headPriceLabel.setVisible(false);

    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    this.time.delayedCall(4000, () => {
        if (this.initialPrice === null) {
            console.warn("OKX Feed Timeout - Starting Simulation Mode");
            
            const statusText = this.children.getByName('statusText');
            if (statusText) statusText.destroy();
            
            const startPrice = 3000;
            this.handleNewPrice(startPrice);
            
            this.time.addEvent({
                delay: 500, 
                loop: true,
                callback: () => {
                    const volatility = 5;
                    const change = (Math.random() - 0.5) * volatility;
                    const newPrice = this.currentPrice + change;
                    this.handleNewPrice(newPrice);
                }
            });

            const width = this.scale.width;
            const height = this.scale.height;
            this.add.text(width - 10, height - 30, '⚠️ SIMULATION MODE', {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#ffaa00'
            }).setOrigin(1, 1).setScrollFactor(0).setDepth(1000);
        }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add.text(centerX, centerY, 'WAITING FOR OKX FEED...', { 
      fontFamily: 'Orbitron', fontSize: '24px', color: '#ff00ff', fontStyle: 'bold'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setName('statusText');

    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
      this.pixelsPerSecond = gameSize.width / this.timeWindowSeconds;
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
  }

  private createTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);

    graphics.clear();
    for (let i = 0; i < 10; i++) {
        const alpha = 0.2 - (i * 0.015); 
        graphics.fillStyle(0xfffacd, alpha); 
        const size = 64 + (i * 10); 
        const offset = (160 - size) / 2; 
        graphics.fillRoundedRect(offset, offset, size, size, 20);
    }
    graphics.generateTexture('box_glow_rect', 160, 160);
  }

  private createHeadLabel() {
    this.headPriceLabel = this.add.container(0, 0);
    this.headPriceLabel.setDepth(100);

    this.headPriceBg = this.add.rectangle(0, 0, 80, 24, 0x000000, 0.8);
    this.headPriceBg.setStrokeStyle(1, 0x00ffff);
    
    this.headPriceText = this.add.text(0, 0, '$0,000.0', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    this.headPriceLabel.add([this.headPriceBg, this.headPriceText]);
  }

  private cleanup() {
    if (this.okxService) {
      this.okxService.disconnect();
    }
  }

  update(time: number, delta: number) {
    if (!this.sys.isActive()) return;
    if (!this.initialPrice) return;

    const dt = delta / 1000;

    // --- Sync Logic ---
    this.checkBettingState();

    // --- Movement Logic ---
    this.headX += this.pixelsPerSecond * dt;
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { 
        this.jitterOffset = (Math.random() - 0.5) * 10; 
        this.jitterTimer = 0;
    }
    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15);

    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    const targetScrollX = this.headX - (viewportW * 0.40);
    const targetScrollY = this.headY - (viewportH * 0.5);
    this.cameras.main.scrollX = targetScrollX;
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.2);

    // --- History ---
    if (time - this.lastPointTime > 50) { 
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      const buffer = viewportW * 1.5;
      if (this.priceHistory.length > 0 && this.priceHistory[0].worldX < this.cameras.main.scrollX - buffer) {
         this.priceHistory.shift();
      }
    }

    // --- Draw ---
    this.drawGridAndAxis();
    this.drawChart();
    
    // --- Update Visuals ---
    this.headEmitter.setPosition(this.headX, this.headY);
    this.checkCollisions();
  }

  // --- NEW: Sync Store State (Pending/Confirmed Bets) ---
  private checkBettingState() {
      const store = useGameStore.getState();

      // 1. Check for Confirmation
      if (store.lastConfirmedBet) {
          const req = store.lastConfirmedBet;
          
          // Find the pending visual
          const pendingContainer = this.pendingBoxes.get(req.id);
          
          if (pendingContainer) {
              // Convert to Real Box
              this.createConfirmedBox(req, pendingContainer);
              this.pendingBoxes.delete(req.id);
          } else {
              // Fallback if visual missing (rare): Create new
              this.createConfirmedBox(req, null);
          }
          
          store.clearLastConfirmedBet();
      }

      // 2. Check for Cancellation
      // If we have pending boxes locally, but store has NO pending bet AND NO confirmed bet
      // It means the pending bet was rejected/cancelled in UI
      if (this.pendingBoxes.size > 0 && !store.pendingBet && !store.lastConfirmedBet) {
          // Destroy all pending boxes (refunded)
          this.pendingBoxes.forEach((container) => {
              this.tweens.add({
                  targets: container,
                  scale: 0,
                  alpha: 0,
                  duration: 200,
                  onComplete: () => container.destroy()
              });
          });
          this.pendingBoxes.clear();
      }
  }

  private handleNewPrice(price: number) {
    if (!this.sys.isActive()) return;
    if (this.initialPrice === null) {
      this.initialPrice = price;
      const statusText = this.children.getByName('statusText');
      if (statusText) statusText.destroy();
    }
    this.currentPrice = price;
    useGameStore.getState().setCurrentPrice(price);
    const priceDelta = price - this.initialPrice;
    this.targetHeadY = -(priceDelta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    if (this.priceHistory.length < 2) return;
    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 200;
    const points: {x: number, y: number}[] = [];
    
    for (const p of this.priceHistory) {
        if (p.worldX < scrollX - buffer) continue;
        if (p.worldX > scrollX + width + buffer) break;
        points.push({ x: p.worldX, y: p.worldY });
    }
    points.push({ x: this.headX, y: this.headY });
    if (points.length < 2) return;

    const drawPath = () => {
        this.chartGraphics.beginPath();
        this.chartGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.chartGraphics.lineTo(points[i].x, points[i].y);
        }
        this.chartGraphics.strokePath();
    };

    this.chartGraphics.lineStyle(10, 0x4B0082, 1); 
    drawPath();
    this.chartGraphics.lineStyle(5, 0xE0B0FF, 1); 
    drawPath();
  }

  private calculateDynamicMultiplier(targetPrice: number, colIndex: number): number {
      const headColPos = this.gridCols * 0.4; 
      const t = Math.max(1.0, (colIndex - headColPos));
      const x = Math.abs(targetPrice - this.currentPrice);
      const sigma = 0.7;     
      const baseScale = 0.85; 
      const houseEdge = 0.05; 
      const numerator = x * x;
      const denominator = 2 * sigma * sigma * t;
      const exponentialTerm = Math.exp(numerator / denominator);
      const multiplier = baseScale * Math.sqrt(t) * exponentialTerm * (1 - houseEdge);
      return parseFloat(Math.max(1.05, Math.min(99.99, multiplier)).toFixed(2));
  }

  private getTextFade(normalizedScreenX: number): number {
      if (normalizedScreenX < 0.45) return 0;
      return Phaser.Math.Clamp((normalizedScreenX - 0.45) * 10, 0, 1);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    let axisLabelIdx = 0;
    let gridLabelIdx = 0;
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;
    const colWidth = width / this.gridCols;
    const gridStartTime = Math.floor(scrollX / colWidth) * colWidth;
    const gridEndTime = scrollX + width;
    const minVisibleY = scrollY;
    const maxVisibleY = scrollY + height;
    
    const highPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    const lowPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    const startPrice = Math.floor(lowPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const endPrice = Math.ceil(highPrice / this.gridPriceInterval) * this.gridPriceInterval;
    
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15);
    
    for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        const centerX = scrollX + (width * 0.5);
        this.gridGraphics.moveTo(centerX, y);
        this.gridGraphics.lineTo(scrollX + width, y);
        
        const labelX = scrollX + width - 10;
        let label = this.axisLabels[axisLabelIdx];
        if (!label) {
            label = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '14px', color: '#ff00ff', align: 'right', fontStyle: 'bold'
            }).setOrigin(1, 0.5);
            this.axisLabels.push(label);
        }
        label.setPosition(labelX, y);
        label.setText(p.toFixed(1));
        label.setVisible(true);
        axisLabelIdx++;
    }

    const startColIdx = Math.floor(gridStartTime / colWidth);
    const endColIdx = Math.ceil(gridEndTime / colWidth);
    const now = new Date();

    for (let c = startColIdx; c <= endColIdx; c++) {
        const x = c * colWidth;
        const screenX = x - scrollX;
        const normalizedScreenX = screenX / width;
        const colIndexOnScreen = Math.floor(normalizedScreenX * this.gridCols); 
        const textFade = this.getTextFade(normalizedScreenX);
        const alpha = 0.15 + (textFade * 0.3); 

        this.gridGraphics.lineStyle(1, 0xaa00ff, alpha);
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);

        const distFromHead = x - this.headX;
        const secondsDiff = distFromHead / this.pixelsPerSecond;
        const gridTime = new Date(now.getTime() + (secondsDiff * 1000));
        
        const timeString = gridTime.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York', hour12: false,
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        let timeLabel = this.gridLabels[gridLabelIdx];
        if (!timeLabel) {
            timeLabel = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '10px', color: '#888888'
            }).setOrigin(0.5, 1);
            this.gridLabels.push(timeLabel);
        }
        timeLabel.setPosition(x, scrollY + height - 5);
        timeLabel.setText(timeString);
        timeLabel.setVisible(true);
        gridLabelIdx++;

        if (textFade > 0.01) {
            const cellCenterX = x + colWidth/2;
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;
                const cellCenterPrice = p + (this.gridPriceInterval / 2);
                const dynamicMulti = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);
                
                let gl = this.gridLabels[gridLabelIdx];
                if (!gl) {
                    gl = this.add.text(0, 0, '', {
                        fontFamily: 'Orbitron', fontSize: '12px', color: '#ffccff'
                    }).setOrigin(0.5);
                    this.gridLabels.push(gl);
                }
                gl.setPosition(cellCenterX, cellCenterY);
                gl.setText(dynamicMulti.toFixed(2) + 'x');
                gl.setAlpha(textFade); 
                gl.setVisible(true);
                gridLabelIdx++;
            }
        }
    }
    
    this.gridGraphics.strokePath();

    for (let i = axisLabelIdx; i < this.axisLabels.length; i++) this.axisLabels[i].setVisible(false);
    for (let i = gridLabelIdx; i < this.gridLabels.length; i++) this.gridLabels[i].setVisible(false);

    this.drawCurrentPriceBox(scrollY, height, width);
  }

  private drawCurrentPriceBox(scrollY: number, height: number, width: number) {
     const boxY = Phaser.Math.Clamp(this.headY, scrollY + 40, scrollY + height - 40);
     const boxX = this.cameras.main.scrollX + width; 
     this.gridGraphics.fillStyle(0x9F88FF, 0.7); 
     this.gridGraphics.lineStyle(2, 0xE0B0FF, 1); 
     const boxW = 80;
     const boxH = 45;
     this.gridGraphics.fillRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     this.gridGraphics.strokeRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     
     let priceLabel = this.children.getByName('currentPriceLabel') as Phaser.GameObjects.Text;
     if (!priceLabel) {
         priceLabel = this.add.text(0, 0, '', {
             fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
         }).setOrigin(0.5, 0.5).setName('currentPriceLabel').setDepth(20);
     }
     priceLabel.setPosition(boxX - boxW / 2, boxY);
     priceLabel.setText(this.currentPrice.toFixed(2));
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;
    
    // Check pending (Limit 1 at a time)
    const store = useGameStore.getState();
    if (store.pendingBet) {
        // Already betting
        return; 
    }

    const screenX = pointer.x;
    const width = this.scale.width;
    const normalizedClickX = screenX / width;
    const visibility = this.getTextFade(normalizedClickX);
    
    if (visibility < 0.4) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    if (store.balance < store.betAmount) {
        this.sound.play('sfx_error');
        // Optional: Show toast via store state if needed, but error sound is simpler
        return;
    }

    // Coordinates
    const colWidth = width / this.gridCols;
    const colIdx = Math.floor(pointer.worldX / colWidth);
    const cellX = (colIdx * colWidth) + (colWidth/2);
    const colIndexOnScreen = Math.floor(normalizedClickX * this.gridCols);

    const priceY = -(pointer.worldY / this.pixelPerDollar); 
    const rawPrice = this.initialPrice! + priceY;
    const snappedBottomPrice = Math.floor(rawPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const cellCenterPrice = snappedBottomPrice + (this.gridPriceInterval / 2);
    const cellY = -(cellCenterPrice - this.initialPrice!) * this.pixelPerDollar;

    // Check existing
    const existingBet = this.bettingBoxes.find(b => 
      Math.abs(b.container.x - cellX) < 5 && 
      Math.abs(b.container.y - cellY) < 5
    );
    if (existingBet) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    // Logic
    const multi = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);
    const boxW = colWidth - 8; 
    const boxH = (this.gridPriceInterval * this.pixelPerDollar) - 8;
    const betId = Date.now().toString();

    // 1. Create Pending "Ghost" Box (Grey, alpha 0.5)
    const container = this.add.container(cellX, cellY);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x666666, 0.5); // Grey, 0.5 Alpha
    bg.lineStyle(2, 0x888888, 0.5);
    bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
    bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
    
    const txt = this.add.text(0, 0, 'SIGN...', {
         fontFamily: 'monospace', fontSize: '10px', color: '#dddddd', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, txt]);
    this.pendingBoxes.set(betId, container);

    // 2. Request Bet
    store.requestBet({
        id: betId,
        amount: store.betAmount,
        x: cellX,
        y: cellY,
        multiplier: multi,
        boxWidth: boxW,
        boxHeight: boxH,
        basePrice: cellCenterPrice
    });
  }

  // Called when Transaction is Confirmed
  private createConfirmedBox(req: BetRequest, pendingContainer: Phaser.GameObjects.Container | null) {
      let container = pendingContainer;
      
      if (!container) {
          container = this.add.container(req.x, req.y);
      } else {
          // Clear Pending Visuals
          container.removeAll(true);
      }

      // Re-create as Real Box (Yellow/Bright)
      this.sound.play('sfx_place', { volume: 0.5 });
      
      const boxW = req.boxWidth;
      const boxH = req.boxHeight;
      
      const bg = this.add.graphics();
      bg.fillStyle(0xfffacd, 1); // Yellow #fffacd
      bg.lineStyle(2, 0xffffff, 0.7); 
      bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8); 
      bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8); 
      
      const glow = this.add.image(0, 0, 'box_glow_rect');
      glow.setTint(0xfffacd); 
      glow.setAlpha(0); 
      const glowScaleX = (boxW + 80) / 160;
      const glowScaleY = (boxH + 80) / 160;
      glow.setScale(glowScaleX, glowScaleY);

      const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0); 
      
      const txtAmt = this.add.text(0, -8, `${req.amount} CR`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);
      
      const txtMulti = this.add.text(0, 8, `${req.multiplier.toFixed(2)}X`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);

      // --- NEW: SCAN Link ---
      if (req.txHash) {
          const scanLink = this.add.text(0, -boxH/2 + 8, '🔗 SCAN', {
              fontFamily: 'monospace', fontSize: '10px', color: '#555555'
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

          scanLink.on('pointerdown', () => {
              window.open(`https://testnet.crossscan.io/tx/${req.txHash}`, '_blank');
          });
          
          container.add(scanLink);
      }

      container.add([glow, bg, rect, txtAmt, txtMulti]); 
      
      // Pop Effect
      container.setScale(0.8);
      this.tweens.add({
          targets: container,
          scale: 1,
          duration: 300,
          ease: 'Back.out'
      });

      this.bettingBoxes.push({
          id: req.id,
          container, rect, bg, glow, 
          textAmount: txtAmt, textMulti: txtMulti,
          betAmount: req.amount, multiplier: req.multiplier,
          hit: false, boxWidth: boxW, boxHeight: boxH, basePrice: req.basePrice
      });

      // Register with Backend
      useGameStore.getState().registerServerBet(req);
  }

  private checkCollisions() {
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 180; 
        
        if (dist < proximityRange) {
             const intensity = 1 - (dist / proximityRange);
             const targetAlpha = intensity * 1.0;
             box.glow.setAlpha(targetAlpha);
        } else {
             box.glow.setAlpha(0);
        }

        const halfW = box.boxWidth / 2;
        const halfH = box.boxHeight / 2;
        
        if (this.headX >= (boxX - halfW) && this.headX <= (boxX + halfW)) {
            if (Math.abs(this.headY - boxY) <= halfH) {
                this.handleWin(box, i);
                continue; 
            }
        }

        if (this.headX > (boxX + halfW)) {
             this.handleLoss(box, i);
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win');

    const winVal = box.betAmount * box.multiplier;
    const winText = this.add.text(box.container.x, box.container.y - (box.boxHeight/2) - 20, `+${winVal.toFixed(2)}`, {
        fontFamily: 'Orbitron', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5).setStroke('#000000', 4);

    this.tweens.add({
        targets: winText,
        y: winText.y - 60,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => winText.destroy()
    });

    const pulse = this.add.sprite(box.container.x, box.container.y, 'flare');
    pulse.setScale(2);
    pulse.setTint(0xffd700);
    this.tweens.add({
        targets: pulse, scale: 8.0, alpha: 0, duration: 400,
        onComplete: () => pulse.destroy()
    });

    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(30);
    
    // Server Payout
    const store = useGameStore.getState();
    store.claimServerPayout(box.id);

    store.requestWin(winVal);
    store.setLastWinAmount(winVal);

    this.tweens.add({
        targets: box.container, scale: 1.2, alpha: 0, duration: 300,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    box.bg.clear();
    box.bg.fillStyle(0x555555, 1);
    box.bg.fillRoundedRect(-box.boxWidth/2, -box.boxHeight/2, box.boxWidth, box.boxHeight, 8);
    
    this.tweens.add({
        targets: box.container,
        y: box.container.y + 50,
        alpha: 0,
        duration: 500,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }
}
