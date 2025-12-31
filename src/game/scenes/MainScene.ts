import Phaser from 'phaser';
import { OKXService } from '../../services/okxService';
import { useGameStore } from '../../store/gameStore';
import Assets from '../../assets.json';

interface PricePoint {
  worldX: number;
  worldY: number;
}

interface BettingBox {
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
  private axisLabels: Phaser.GameObjects.Text[] = [];
  private gridLabels: Phaser.GameObjects.Text[] = [];

  // --- Configuration ---
  // The screen width represents exactly 100 seconds (10 cols * 10 sec)
  private timeWindowSeconds: number = 100; 
  private pixelsPerSecond: number = 0; // Calculated in create()
  
  // Price Scale: Vertical pixels per dollar
  private pixelPerDollar: number = 200; 
  private gridPriceInterval: number = 0.5; // Every $0.50
  
  // --- State ---
  private initialPrice: number | null = null;
  private currentPrice: number = 0;
  
  // Head Physics
  private headX: number = 0;
  private headY: number = 0;
  private targetHeadY: number = 0;
  
  // Volatility / Jitter
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
    // 1. Setup Scales based on Screen Size
    this.cameras.main.setBackgroundColor('#1a0b2e'); // Deep Magenta/Purple
    this.pixelsPerSecond = this.scale.width / this.timeWindowSeconds;
    
    // 2. Camera FX (Bloom)
    // NOTE: User asked to remove glow from boxes, but global bloom might be okay for the neon grid/line.
    // We keep it for the chart line but ensure boxes don't get blown out.
    if (this.cameras.main.postFX) {
        this.cameras.main.postFX.addBloom(0xffffff, 1.0, 1.0, 1.2, 1.2);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();
    
    // 4. Generate Textures
    this.createTextures();

    // 5. Particles
    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 50,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00ffff, // Cyan/White core
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

    // 6. Head Price Label
    this.createHeadLabel();
    this.headPriceLabel.setVisible(false);

    // 7. Data Service
    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    // 8. Input (Betting)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    // Waiting Text
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

    // Handle Resize
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
      this.pixelsPerSecond = gameSize.width / this.timeWindowSeconds;
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
  }

  private createTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Flare texture
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);

    // Box Glow Texture (Larger soft glow)
    graphics.clear();
    // Create a radial gradient texture for the glow
    graphics.fillStyle(0xffff00, 1); // Yellow core
    graphics.fillCircle(64, 64, 64); // Base circle
    graphics.generateTexture('box_glow', 128, 128);
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

    // --- 1. Movement Logic ---
    this.headX += this.pixelsPerSecond * dt;

    // Y moves with price + jitter
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { 
        this.jitterOffset = (Math.random() - 0.5) * 10; 
        this.jitterTimer = 0;
    }

    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15);

    // --- 2. Camera Sync ---
    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    
    const targetScrollX = this.headX - (viewportW * 0.25);
    const targetScrollY = this.headY - (viewportH * 0.5);

    this.cameras.main.scrollX = targetScrollX;
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.2);

    // --- 3. History ---
    if (time - this.lastPointTime > 50) { 
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      const buffer = viewportW * 1.5;
      if (this.priceHistory.length > 0 && this.priceHistory[0].worldX < this.cameras.main.scrollX - buffer) {
         this.priceHistory.shift();
      }
    }

    // --- 4. Draw World ---
    this.drawGridAndAxis();
    this.drawChart();
    
    // --- 5. Visual Updates ---
    this.headEmitter.setPosition(this.headX, this.headY);
    this.checkCollisions();
  }

  private handleNewPrice(price: number) {
    if (!this.sys.isActive()) return;

    if (this.initialPrice === null) {
      this.initialPrice = price;
      this.children.getByName('statusText')?.destroy();
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

    // --- FIX: Use lineTo instead of Spline for stability ---
    // User complaint: "Why does the past line wiggle? It should be fixed."
    // Splines recalculate curves based on neighbors. Simple lines are fixed.
    
    this.chartGraphics.beginPath();

    let started = false;
    
    // Draw history
    for (const p of this.priceHistory) {
        // Optimization: Only draw visible points + small buffer
        if (p.worldX < scrollX - buffer) continue;
        if (p.worldX > scrollX + width + buffer) break;

        if (!started) {
            this.chartGraphics.moveTo(p.worldX, p.worldY);
            started = true;
        } else {
            this.chartGraphics.lineTo(p.worldX, p.worldY);
        }
    }
    
    // Draw to current head
    if (started) {
        this.chartGraphics.lineTo(this.headX, this.headY);
    } else {
        this.chartGraphics.moveTo(this.headX, this.headY);
    }

    // 1. Glow (Subtle White/Cyan)
    this.chartGraphics.lineStyle(16, 0xffffff, 0.05); 
    this.chartGraphics.strokePath();
    
    // 2. Core (Clean White)
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    this.chartGraphics.strokePath();
    
    // 3. Head Dot
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(this.headX, this.headY, 4);
    this.chartGraphics.lineStyle(2, 0xffffff, 0.5);
    this.chartGraphics.strokeCircle(this.headX, this.headY, 8);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    
    this.axisLabels.forEach(l => l.setVisible(false));
    this.gridLabels.forEach(l => l.setVisible(false));
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;

    const colWidth = width / 10;
    
    const gridStartTime = Math.floor(scrollX / colWidth) * colWidth;
    const gridEndTime = scrollX + width;

    let gridLabelIdx = 0;

    const minVisibleY = scrollY;
    const maxVisibleY = scrollY + height;
    
    const highPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    const lowPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    
    const startPrice = Math.floor(lowPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const endPrice = Math.ceil(highPrice / this.gridPriceInterval) * this.gridPriceInterval;
    
    let axisLabelIdx = 0;

    // Draw Horizontal Lines
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15);
    
    for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        const centerX = scrollX + (width * 0.5);
        
        this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15);
        this.gridGraphics.moveTo(centerX, y);
        this.gridGraphics.lineTo(scrollX + width, y);
        
        // Right-Axis Label
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

    // Draw Vertical Lines & Multipliers
    const startColIdx = Math.floor(gridStartTime / colWidth);
    const endColIdx = Math.ceil(gridEndTime / colWidth);
    const now = new Date();

    for (let c = startColIdx; c <= endColIdx; c++) {
        const x = c * colWidth;
        const screenX = x - scrollX;
        const normalizedScreenX = screenX / width;

        // Gradient Fade-in Logic
        let alpha = 0.15;
        let textFade = 0;

        if (normalizedScreenX >= 0.5) {
             const fadeProgress = (normalizedScreenX - 0.5) * 5; 
             const entryAlpha = Phaser.Math.Clamp(fadeProgress, 0, 1);
             alpha = 0.15 + (entryAlpha * 0.3);
             
             // Text fade: Need to be > 50% visible to show text clearly?
             // User Req: "If text is > 50% gone... disable betting"
             // Text fade calculation:
             textFade = Phaser.Math.Clamp((normalizedScreenX - 0.5) * 8, 0, 1);
        } else {
             alpha = 0.15;
             textFade = 0;
        }

        this.gridGraphics.lineStyle(1, 0xaa00ff, alpha);
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);

        // Time Labels
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

        // Multipliers (Only in Betting Zone)
        if (textFade > 0.01) {
            const cellCenterX = x + colWidth/2;
            
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;
                
                const seedX = Math.floor(cellCenterX);
                const seedY = Math.floor(cellCenterY);
                const random = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;
                
                let multi = 1.0 + (random * 4.0);
                
                let gl = this.gridLabels[gridLabelIdx];
                if (!gl) {
                    gl = this.add.text(0, 0, '', {
                        fontFamily: 'Orbitron', fontSize: '12px', color: '#ffccff'
                    }).setOrigin(0.5);
                    this.gridLabels.push(gl);
                }
                
                gl.setPosition(cellCenterX, cellCenterY);
                gl.setText(multi.toFixed(2) + 'X');
                
                // Text fades based on gradient
                gl.setAlpha(textFade); 
                gl.setVisible(true);
                gridLabelIdx++;
            }
        }
    }
    
    this.gridGraphics.strokePath();

    this.drawCurrentPriceBox(scrollY, height, width);
  }

  private drawCurrentPriceBox(scrollY: number, height: number, width: number) {
     const boxY = Phaser.Math.Clamp(this.headY, scrollY + 20, scrollY + height - 20);
     const boxX = this.cameras.main.scrollX + width; 

     this.gridGraphics.fillStyle(0x2a1b4e, 1); 
     this.gridGraphics.lineStyle(1, 0xbd00ff, 1); 
     
     const boxW = 80;
     const boxH = 30;
     this.gridGraphics.fillRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 6);
     this.gridGraphics.strokeRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 6);
     
     let priceLabel = this.children.getByName('currentPriceLabel') as Phaser.GameObjects.Text;
     if (!priceLabel) {
         priceLabel = this.add.text(0, 0, '', {
             fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
         }).setOrigin(1, 0.5).setName('currentPriceLabel').setDepth(20);
     }
     
     priceLabel.setPosition(boxX - 5, boxY);
     priceLabel.setText(this.currentPrice.toFixed(2));
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // 1. STRICT Betting Restriction: 
    // "If multiplier text in 6th column is > 50% gone... disable betting"
    // Our text fade starts at 0.5 and reaches 1.0 at ~0.625 (0.5 + 1/8)
    // So 50% fade is around 0.56 normalized width.
    const screenX = pointer.x;
    const width = this.scale.width;
    const normalizedClickX = screenX / width;

    // Threshold: 0.55 (55% of screen width)
    if (normalizedClickX < 0.55) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    const store = useGameStore.getState();
    if (store.balance < store.betAmount) {
        this.sound.play('sfx_error');
        return;
    }

    // 2. Snap to Grid
    const colWidth = width / 10;
    
    const colIdx = Math.floor(pointer.worldX / colWidth);
    const cellX = (colIdx * colWidth) + (colWidth/2);

    const priceY = -(pointer.worldY / this.pixelPerDollar); 
    const rawPrice = this.initialPrice! + priceY;
    
    const snappedBottomPrice = Math.floor(rawPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const cellCenterPrice = snappedBottomPrice + (this.gridPriceInterval / 2);
    
    const cellY = -(cellCenterPrice - this.initialPrice!) * this.pixelPerDollar;

    // 3. Get Multiplier
    const seedX = Math.floor(cellX);
    const seedY = Math.floor(cellY);
    const random = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;
    let multi = 1.0 + (random * 4.0);
    multi = Math.max(1.1, multi);

    // 4. Create Box
    store.updateBalance(-store.betAmount);
    this.sound.play('sfx_place', { volume: 0.5 });

    const container = this.add.container(cellX, cellY);
    
    const boxW = colWidth - 8; 
    const boxH = (this.gridPriceInterval * this.pixelPerDollar) - 8;
    
    // Proximity Glow (Hidden by default, updated in checkCollisions)
    const glow = this.add.image(0, 0, 'box_glow');
    glow.setDisplaySize(boxW * 1.5, boxH * 1.5); // Larger glow area
    glow.setAlpha(0); 
    glow.setTint(0xffd700); // Gold/Yellow glow

    // Box Graphics: Pale Yellow Solid (#fffacd)
    // Requirement: "Remove 70% white border... add rounded corners to box itself"
    const bg = this.add.graphics();
    bg.fillStyle(0xfffacd, 1); // Solid Pale Yellow
    bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8); // Rounded Corners
    // REMOVED lineStyle (70% white border) as requested

    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0); 
    
    // Text: Amount & Multiplier in BOLD BLACK
    const txtAmt = this.add.text(0, -8, `${store.betAmount}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const txtMulti = this.add.text(0, 8, `${multi.toFixed(2)}X`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([glow, bg, rect, txtAmt, txtMulti]);
    
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, bg, glow, textAmount: txtAmt, textMulti: txtMulti,
        betAmount: store.betAmount, multiplier: multi,
        hit: false, boxWidth: boxW, boxHeight: boxH
    });
  }

  private checkCollisions() {
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // --- Proximity Logic ---
        // "Why doesn't it glow yellow when close?"
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 400; // Increased range
        
        if (dist < proximityRange) {
            // Stronger glow as it gets closer
            const intensity = 1 - (dist / proximityRange); 
            // Max alpha 0.8 for visibility
            box.glow.setAlpha(intensity * 0.8);
        } else {
            box.glow.setAlpha(0);
        }

        // --- Collision Logic ---
        // Requirement: "Graph point touches box LEFT edge means win"
        // And "pass middle to win" complaint -> Implies we need strict left-edge trigger
        const boxLeftEdge = boxX - (box.boxWidth / 2);

        // If head has crossed the LEFT edge of the box
        if (this.headX >= boxLeftEdge) {
             const diffY = Math.abs(this.headY - boxY);
             // Hit window: Box Height / 2
             if (diffY < (box.boxHeight/2)) {
                 this.handleWin(box, i);
             } else {
                 this.handleLoss(box, i);
             }
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win');

    const winVal = box.betAmount * box.multiplier;
    const winText = this.add.text(box.container.x, box.container.y - (box.boxHeight/2) - 20, `+$${winVal.toFixed(2)}`, {
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
    
    const store = useGameStore.getState();
    store.updateBalance(winVal);
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
