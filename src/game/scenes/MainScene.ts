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
  private initializingBets: Set<string> = new Set(); // Track bets waiting for API response
  private hasRestoredBets: boolean = false; // Flag to ensure restoration runs once

  private axisLabels: Phaser.GameObjects.Text[] = [];
  private gridLabels: Phaser.GameObjects.Text[] = []; // Only for Multipliers
  private timeLabels: Phaser.GameObjects.Text[] = []; // Only for Time

  // --- Configuration ---
  private readonly API_URL = 'https://gene-fragmental-addisyn.ngrok-free.dev';
  private timeWindowSeconds: number = 60; 
  private pixelsPerSecond: number = 0; 
  private pixelPerDollar: number = 200; 
  private gridPriceInterval: number = 0.5; 
  private gridCols: number = 7;
  
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
    
    // --- Late Confirmation Prevention (Exploit Protection) ---
    // 1. DEADLINE Logic (Column 4)
    // If a pending box moves past Column 4 (towards the head) before confirming, INVALIDATE IT.
    // 2. HEAD Logic (Physical Overlap)
    // If the head physically hits a pending box, INVALIDATE IT.
    if (this.pendingBoxes.size > 0) {
        const toRemove: string[] = [];
        const viewportW = this.scale.width;
        const colWidth = viewportW / this.gridCols;
        
        // Safe Zone Boundary: Column 4 X-Coordinate (World Space)
        // Screen Logic: Left (0) -> Right (Width). Head is at 22%. Deadline is at ~57% (Col 4/7).
        // Boxes are at fixed World X. Camera moves Right.
        // So visually, boxes move Right -> Left.
        // If Box Screen X < Deadline Screen X, it has crossed the line.
        const scrollX = this.cameras.main.scrollX;
        const deadlineWorldX = scrollX + (4 * colWidth);

        this.pendingBoxes.forEach((container, id) => {
             const boxWidth = 80; // Approximate
             const boxWorldX = container.x;
             
             let isInvalid = false;
             let reason = '';

             // A. Deadline Check (Anti-Snipe)
             // If box is to the LEFT of the Deadline Line
             if (boxWorldX < deadlineWorldX) {
                 isInvalid = true;
                 reason = 'EXPIRED';
             }
             
             // B. Head Check (Safety Net)
             // If Head has passed the center of the pending box
             if (this.headX > (boxWorldX + boxWidth/2)) {
                 isInvalid = true;
                 reason = 'EXPIRED';
             }

             if (isInvalid) {
                 // 1. Visual Invalidation
                 const bg = container.list[0] as Phaser.GameObjects.Graphics;
                 if (bg) {
                     bg.clear();
                     bg.fillStyle(0xff0000, 0.5); // RED for Invalid
                     bg.fillRoundedRect(-boxWidth/2, -20, boxWidth, 40, 8);
                     bg.strokeRoundedRect(-boxWidth/2, -20, boxWidth, 40, 8);
                 }
                 
                 const txt = container.list[1] as Phaser.GameObjects.Text;
                 if (txt) txt.setText(reason);

                 // 2. Destroy after brief delay
                 this.tweens.add({
                     targets: container,
                     alpha: 0,
                     scale: 0.8,
                     duration: 300,
                     delay: 500,
                     onComplete: () => container.destroy()
                 });
                 
                 toRemove.push(id);
                 
                 // 3. Unlock Store if this was the pending bet
                 const store = useGameStore.getState();
                 if (store.pendingBet && store.pendingBet.id === id) {
                     store.clearPendingBet(); // Clears lock, refunds (if needed)
                 }
             }
        });
        
        toRemove.forEach(id => this.pendingBoxes.delete(id));
    }

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
    // New Head Position: 22% (was 40%)
    const targetScrollX = this.headX - (viewportW * 0.22);
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
          } 
          // FIX: If pendingContainer is undefined, it means the bet Expired locally.
          // We DO NOT create a confirmed box. We ignore it to prevent "Ghost Bets".
          
          store.clearLastConfirmedBet();
      }

      // 2. Check for Cancellation or Expiration Clean-up
      // If we have pending boxes locally, but store has NO pending bet AND NO confirmed bet
      // It means the pending bet was rejected/cancelled in UI OR Expired via update() loop
      if (this.pendingBoxes.size > 0 && !store.pendingBet && !store.lastConfirmedBet) {
          const toRemove: string[] = [];

          this.pendingBoxes.forEach((container, id) => {
              // SKIP if this bet is still initializing (waiting for API)
              if (this.initializingBets.has(id)) return;
              
              // Only remove if it hasn't been marked as EXPIRED (handled in update)
              // We check if it's still "normal" pending
              const bg = container.list[0] as Phaser.GameObjects.Graphics;
              // If we wanted to check color, we could, but generally if it's here and not in store, it's dead.
              
              this.tweens.add({
                  targets: container,
                  scale: 0,
                  alpha: 0,
                  duration: 200,
                  onComplete: () => container.destroy()
              });
              toRemove.push(id);
          });
          
          toRemove.forEach(id => this.pendingBoxes.delete(id));
      }
  }

  private handleNewPrice(price: number) {
    if (!this.sys.isActive()) return;
    if (this.initialPrice === null) {
      this.initialPrice = price;
      const statusText = this.children.getByName('statusText');
      if (statusText) statusText.destroy();
      
      // Trigger Restoration once we have a valid price context
      if (!this.hasRestoredBets) {
          this.hasRestoredBets = true;
          this.restoreBets();
      }
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

  private isOccupied(x: number, y: number): boolean {
    // Check Pending
    for (const container of this.pendingBoxes.values()) {
        if (Math.abs(container.x - x) < 5 && Math.abs(container.y - y) < 5) return true;
    }
    // Check Active
    for (const box of this.bettingBoxes) {
        if (Math.abs(box.container.x - x) < 5 && Math.abs(box.container.y - y) < 5) return true;
    }
    return false;
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
      // Map range [0.45, 0.6] to [0, 1]
      // < 0.45 = 0 (Invisible)
      // > 0.60 = 1 (Fully Visible)
      if (normalizedScreenX < 0.45) return 0;
      if (normalizedScreenX > 0.6) return 1;
      
      return (normalizedScreenX - 0.45) / (0.6 - 0.45);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    let axisLabelIdx = 0;
    let gridLabelIdx = 0;
    let timeLabelIdx = 0;
    
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

        let timeLabel = this.timeLabels[timeLabelIdx];
        if (!timeLabel) {
            timeLabel = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '10px', color: '#888888'
            }).setOrigin(0.5, 1);
            this.timeLabels.push(timeLabel);
        }
        timeLabel.setPosition(x, scrollY + height - 5);
        timeLabel.setText(timeString);
        timeLabel.setVisible(true);
        timeLabelIdx++;

        if (textFade > 0.01) {
            const cellCenterX = x + colWidth/2;
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;
                const cellCenterPrice = p + (this.gridPriceInterval / 2);
                const dynamicMulti = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);
                
                // Hide multiplier if cell is occupied
                if (this.isOccupied(cellCenterX, cellCenterY)) {
                    continue;
                }

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
    for (let i = timeLabelIdx; i < this.timeLabels.length; i++) this.timeLabels[i].setVisible(false);

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

  private async placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;
    
    // 0. Wallet Connection Check
    const store = useGameStore.getState();
    if (!store.userAddress) {
        this.sound.play('sfx_error', { volume: 0.2 });
        store.setConnectionError(true); 
        return;
    }

    // --- Safe Zone Check (Columns 0-3 are blocked) ---
    // Columns 1, 2, 3, 4 (Indices 0, 1, 2, 3) are Safe/Waiting Zones.
    // Interaction is only allowed in Columns 5, 6, 7 (Indices 4, 5, 6).
    const _screenX = pointer.x;
    const _width = this.scale.width;
    const _colIdx = Math.floor((_screenX / _width) * this.gridCols);
    
    if (_colIdx <= 3) return;

    // 1. GLOBAL LOCK (Strict Sequential Betting)
    if (store.pendingBet || this.initializingBets.size > 0) {
        // Strict block: No new bets while one is processing
        return; 
    }

    // 2. Click Validation
    const screenX = pointer.x;
    const width = this.scale.width;
    const normalizedClickX = screenX / width;
    const visibility = this.getTextFade(normalizedClickX);
    
    if (visibility < 0.4) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    // 3. Balance Check
    const tokenCost = store.betAmount; 

    // 4. Coordinates & Snap logic
    const colWidth = width / this.gridCols;
    const colIdx = Math.floor(pointer.worldX / colWidth);
    const cellX = (colIdx * colWidth) + (colWidth/2);
    const colIndexOnScreen = Math.floor(normalizedClickX * this.gridCols);

    const priceY = -(pointer.worldY / this.pixelPerDollar); 
    const rawPrice = this.initialPrice! + priceY;
    const snappedBottomPrice = Math.floor(rawPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const cellCenterPrice = snappedBottomPrice + (this.gridPriceInterval / 2);
    const cellY = -(cellCenterPrice - this.initialPrice!) * this.pixelPerDollar;

    // 5. Check Existing Bets (Prevent Overlap)
    if (this.isOccupied(cellX, cellY)) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    // 6. Setup Bet Data & Snapshot
    const multi = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);
    const boxW = colWidth - 8; 
    const boxH = (this.gridPriceInterval * this.pixelPerDollar) - 8;
    const betId = Date.now().toString();

    // 7. Calculate Expiry Snapshot (Corrected for Column 4 Deadline)
    // We want the timestamp when the Box hits Column 4 (Safe Zone Boundary).
    const scrollX = this.cameras.main.scrollX;
    const deadlineWorldX = scrollX + (4 * colWidth);
    const distToDeadline = cellX - deadlineWorldX;
    const timeToDeadline = distToDeadline / this.pixelsPerSecond; // Seconds
    const expiryTimestamp = Date.now() + (timeToDeadline * 1000);

    // 8. Visual Feedback: Create "Pending" Ghost Box
    const container = this.add.container(cellX, cellY);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x555555, 0.5); 
    bg.lineStyle(2, 0x888888, 0.5);
    bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
    bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
    
    const txt = this.add.text(0, boxH/2 - 12, 'PENDING...', {
         fontFamily: 'monospace', fontSize: '10px', color: '#cccccc'
    }).setOrigin(0.5);

    const txtMulti = this.add.text(0, 0, `${multi.toFixed(2)}x`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, txt, txtMulti]);
    this.pendingBoxes.set(betId, container);

    // 9. Server Communication & Store Lock
    try {
        this.initializingBets.add(betId); // Mark as initializing

        const userAddress = store.userAddress || "0xTestUser";

        // A. Call Server API (Validation Snapshot)
        try {
            const response = await fetch(`${this.API_URL}/api/place-bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    betId: betId,
                    userAddress: userAddress,
                    betAmount: store.betAmount,
                    multiplier: multi,
                    expiryTimestamp: Math.floor(expiryTimestamp) // Send Validation Data
                })
            });

            if (!response.ok) {
                console.warn(`Backend returned ${response.status}. Proceeding in Offline/Preview Mode.`);
            }
        } catch (networkErr) {
            console.warn("Backend unreachable (Network Error). Proceeding in Offline/Preview Mode.");
        }

        // B. Lock Store & Request Wallet Signature
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
        
        this.initializingBets.delete(betId); // API done, handed over to Store

    } catch (err) {
        console.error("❌ Bet Registration Logic Error:", err);
        
        this.initializingBets.delete(betId);
        
        // C. Error Handling: ROLLBACK
        this.pendingBoxes.delete(betId);
        container.destroy(); 

        if (store.clearPendingBet) {
            store.clearPendingBet(); 
        }
        
        this.sound.play('sfx_error');
    }
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
      
      const txtAmt = this.add.text(0, -8, `$${req.amount} Cross`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);
      
      const txtMulti = this.add.text(0, 8, `${req.multiplier.toFixed(2)}X`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);

      if (req.txHash) {
          const scanLink = this.add.text(0, -boxH/2 + 8, '🔗 SCAN', {
              fontFamily: 'monospace', fontSize: '10px', color: '#0000ff'
          })
          .setOrigin(0.5)
          .setDepth(100)
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

      // No need to call registerServerBet here again as placeBet handled it
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

  private async requestPayout(betId: string) {
    const store = useGameStore.getState();
    const userAddress = store.userAddress || "0xTestUser";
    
    try {
        await fetch(`${this.API_URL}/api/payout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                betId: betId,
                userAddress: userAddress
            })
        });
        console.log("✅ Payout Requested for", betId);
    } catch (err) {
        console.warn("⚠️ Payout Request Failed (Offline Mode):", err);
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
    this.requestPayout(box.id);

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

  private async restoreBets() {
      const store = useGameStore.getState();
      const bets = await store.fetchActiveBets();

      if (!bets || bets.length === 0) return;

      const viewportW = this.scale.width;
      const colWidth = viewportW / this.gridCols;
      const boxW = colWidth - 8;
      const boxH = 40; // Approximate if not stored, or derive from price interval

      bets.forEach((bet: any) => {
          // 1. Calculate Position
          // X: Derived from Time to Deadline (Column 4)
          // expiryTimestamp = Now + (DistToCol4 / Speed) * 1000
          // DistToCol4 = (expiryTimestamp - Now)/1000 * Speed
          // BoxX = Col4X + DistToCol4
          const now = Date.now();
          if (bet.expiryTimestamp <= now) return; // Already expired

          const timeRemainingSeconds = (bet.expiryTimestamp - now) / 1000;
          const distRemaining = timeRemainingSeconds * this.pixelsPerSecond;
          
          const scrollX = this.cameras.main.scrollX;
          const deadlineWorldX = scrollX + (4 * colWidth);
          const restoredX = deadlineWorldX + distRemaining;

          // Y: Derived from Base Price
          // y = -(price - initialPrice) * pixelPerDollar
          if (!bet.basePrice || !this.initialPrice) return;
          const restoredY = -(bet.basePrice - this.initialPrice) * this.pixelPerDollar;

          // 2. Validate Position (Screen Bounds Check - Optional but good)
          // If it's too far left (past head), it's invalid anyway.
          if (restoredX < this.headX) return;

          // 3. Re-create Visuals
          // If txHash exists, it's Active (Yellow). If not, Pending (Grey).
          if (bet.txHash) {
              const req: BetRequest = {
                  id: bet.betId,
                  amount: bet.amount,
                  multiplier: bet.multiplier,
                  x: restoredX,
                  y: restoredY,
                  boxWidth: boxW,
                  boxHeight: boxH,
                  basePrice: bet.basePrice,
                  txHash: bet.txHash
              };
              this.createConfirmedBox(req, null);
          } else {
              // Create Grey Pending Box
              const container = this.add.container(restoredX, restoredY);
              
              const bg = this.add.graphics();
              bg.fillStyle(0x555555, 0.5); 
              bg.lineStyle(2, 0x888888, 0.5);
              bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
              bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
              
              const txt = this.add.text(0, boxH/2 - 12, 'PENDING...', {
                  fontFamily: 'monospace', fontSize: '10px', color: '#cccccc'
              }).setOrigin(0.5);

              const txtMulti = this.add.text(0, 0, `${bet.multiplier.toFixed(2)}x`, {
                  fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
              }).setOrigin(0.5);

              container.add([bg, txt, txtMulti]);
              this.pendingBoxes.set(bet.betId, container);
          }
      });
  }
}
