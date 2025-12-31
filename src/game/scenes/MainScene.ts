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
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Image; // Added Glow Sprite
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
  // The screen width represents exactly 40 seconds
  private timeWindowSeconds: number = 40; 
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
    if (this.cameras.main.postFX) {
        this.cameras.main.postFX.addBloom(0xffffff, 1.2, 1.2, 1.5, 1.5);
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

    // 6. Head Price Label (Hidden as per new req, but initialized)
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
    
    // Box Glow (Soft Rect)
    graphics.clear();
    graphics.fillStyle(0xfffacd, 1);
    graphics.fillRoundedRect(0, 0, 64, 32, 8);
    graphics.generateTexture('box_base', 64, 32); // Base shape if needed

    // Soft Outer Glow Texture
    graphics.clear();
    graphics.fillStyle(0xfffacd, 0.4);
    graphics.fillRoundedRect(0, 0, 80, 48, 16); // Larger, softer
    graphics.generateTexture('box_glow', 80, 48);
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
    // X moves constantly at calculated speed
    this.headX += this.pixelsPerSecond * dt;

    // Y moves with price + jitter
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { 
        this.jitterOffset = (Math.random() - 0.5) * 10; 
        this.jitterTimer = 0;
    }

    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15); // Smooth vertical follow

    // --- 2. Camera Sync (The "Anchor") ---
    // HEAD FIXED at: 
    // X = 50% Screen Width (Center)
    // Y = 50% Screen Height (Center)
    
    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    
    const targetScrollX = this.headX - (viewportW * 0.25);
    const targetScrollY = this.headY - (viewportH * 0.5);

    // X is hard-locked (scrolling is constant)
    this.cameras.main.scrollX = targetScrollX;
    
    // Y is smoothed for less jerky camera movement
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.2);

    // --- 3. History ---
    if (time - this.lastPointTime > 50) { // 20 updates per second
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      // Cleanup
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

    // Y = -(Price - Initial) * Scale
    const priceDelta = price - this.initialPrice;
    this.targetHeadY = -(priceDelta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 200;

    const points: Phaser.Math.Vector2[] = [];
    
    for (const p of this.priceHistory) {
        if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
            points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
        }
    }
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    const curve = new Phaser.Curves.Spline(points);

    // 1. Glow
    this.chartGraphics.lineStyle(16, 0x00ffff, 0.1); 
    curve.draw(this.chartGraphics, 64);
    
    // 2. Core
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // 3. Head Dot (Simple Glowing Dot)
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(this.headX, this.headY, 4);
    this.chartGraphics.lineStyle(2, 0x00ffff, 0.8);
    this.chartGraphics.strokeCircle(this.headX, this.headY, 8);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    
    // Reset labels
    this.axisLabels.forEach(l => l.setVisible(false));
    this.gridLabels.forEach(l => l.setVisible(false));
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;

    // --- 1. Vertical Grid Lines (Columns) ---
    // Requirement: Exactly 10 columns across screen width
    const colWidth = width / 10;
    
    // Align grid to World Space (Time)
    const gridStartTime = Math.floor(scrollX / colWidth) * colWidth;
    const gridEndTime = scrollX + width;

    let gridLabelIdx = 0;

    // --- 2. Horizontal Price Lines ---
    const minVisibleY = scrollY;
    const maxVisibleY = scrollY + height;
    
    const highPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    const lowPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    
    // Snap to $0.50
    const startPrice = Math.floor(lowPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const endPrice = Math.ceil(highPrice / this.gridPriceInterval) * this.gridPriceInterval;
    
    let axisLabelIdx = 0;

    // Draw Price Lines & Axis Labels
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15); // Neon Purple Grid
    
    for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        
        // Horizontal Line
        this.gridGraphics.moveTo(scrollX, y);
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
        label.setText(p.toFixed(1)); // 2,975.5
        label.setVisible(true);
        axisLabelIdx++;
    }

    // Draw Vertical Lines & Multipliers
    // COLUMNS 1-5 (Left 50%): No multipliers, clear space.
    // COLUMNS 6-10 (Right 50%): Multipliers + Grid lines with fade-in.
    
    // We iterate through all potential columns in view
    // Start from the first visible column index
    const startColIdx = Math.floor(gridStartTime / colWidth);
    const endColIdx = Math.ceil(gridEndTime / colWidth);

    for (let c = startColIdx; c <= endColIdx; c++) {
        const x = c * colWidth;
        // Determine screen position relative to camera view
        // 0 = Left Edge, width = Right Edge
        const screenX = x - scrollX;
        const normalizedScreenX = screenX / width; // 0.0 to 1.0

        // "Horizontal Gradient Fade-in" starting from 50% mark (0.5)
        // If < 0.5, alpha is 0. If > 0.5, alpha increases.
        let alpha = 0;
        if (normalizedScreenX > 0.5) {
            // Map 0.5->1.0 to 0.0->1.0
            alpha = (normalizedScreenX - 0.5) * 2;
            alpha = Phaser.Math.Clamp(alpha, 0, 0.4); // Max alpha 0.4
        } else {
            // Left side (Columns 1-5): Very faint lines or clear? 
            // Prompt says "Clear chart space". Let's keep it extremely subtle or hidden.
            alpha = 0.05; 
        }

        if (alpha <= 0.05 && normalizedScreenX > 0.5) continue; // Optimization

        this.gridGraphics.lineStyle(1, 0xaa00ff, alpha);
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);

        // --- Multiplier Logic ---
        // Only show multipliers in the right 50% (Columns 6-10)
        // normalizedScreenX > 0.5 check matches "Columns 6-10" roughly
        
        if (normalizedScreenX > 0.5) {
            // Center X of the cell
            const cellCenterX = x + colWidth/2;
            
            // Loop rows for this column
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                // Center Y of the cell
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;
                
                // Deterministic Multiplier
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
                
                // Text Alpha follows the gradient too
                gl.setAlpha(alpha + 0.3); 
                gl.setVisible(true);
                gridLabelIdx++;
            }
        }
    }
    
    this.gridGraphics.strokePath();

    // --- Draw Current Price Box on Right Axis ---
    this.drawCurrentPriceBox(scrollY, height, width);
  }

  private drawCurrentPriceBox(scrollY: number, height: number, width: number) {
     // Price Box moves with Head Y
     // We need to clamp it to the screen area
     const boxY = Phaser.Math.Clamp(this.headY, scrollY + 20, scrollY + height - 20);
     const boxX = this.cameras.main.scrollX + width; // Right edge

     // Update: Dark Magenta Background, No Glow
     this.gridGraphics.fillStyle(0x2a1b4e, 1); // Slightly lighter than bg
     this.gridGraphics.lineStyle(1, 0xff00ff, 0.5); // Thin purple border
     
     // Small tag on the right axis
     this.gridGraphics.fillRoundedRect(boxX - 60, boxY - 12, 60, 24, 4);
     this.gridGraphics.strokeRoundedRect(boxX - 60, boxY - 12, 60, 24, 4);
     
     let priceLabel = this.children.getByName('currentPriceLabel') as Phaser.GameObjects.Text;
     if (!priceLabel) {
         priceLabel = this.add.text(0, 0, '', {
             fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold'
         }).setOrigin(1, 0.5).setName('currentPriceLabel').setDepth(20);
     }
     
     priceLabel.setPosition(boxX - 5, boxY);
     priceLabel.setText(this.currentPrice.toFixed(1));
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // 1. Validate Click Zone (Must be right of Head)
    if (pointer.worldX <= this.headX) return;

    const store = useGameStore.getState();
    if (store.balance < store.betAmount) {
        this.sound.play('sfx_error');
        return;
    }

    // 2. Snap to Grid
    const width = this.scale.width;
    const colWidth = width / 10;
    
    // Snap X to center of cell
    const colIdx = Math.floor(pointer.worldX / colWidth);
    const cellX = (colIdx * colWidth) + (colWidth/2);

    // Snap Y to center of cell
    const priceY = -(pointer.worldY / this.pixelPerDollar); 
    const rawPrice = this.initialPrice! + priceY;
    
    // Snap to grid interval center
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
    
    // Yellow Box - Solid, No Glow, Rounded Corners
    const boxW = colWidth - 8; 
    const boxH = (this.gridPriceInterval * this.pixelPerDollar) - 8;
    
    // Proximity Glow Sprite (Behind everything in container)
    // Scale it to be slightly larger than box
    const glow = this.add.image(0, 0, 'box_glow');
    glow.setDisplaySize(boxW + 20, boxH + 20);
    glow.setAlpha(0); // Hidden by default
    glow.setTint(0xfffacd); // Pale Yellow tint

    // Use Graphics for rounded rect
    const bg = this.add.graphics();
    bg.fillStyle(0xfffacd, 1); // Pale Yellow
    bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);
    bg.lineStyle(2, 0xffffff, 0.7); // 70% opacity white border
    bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8);

    // Reference rect for physics (invisible)
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0); 
    
    // Text: Amount (Top), Multiplier (Bottom) - Black Text
    const txtAmt = this.add.text(0, -8, `${store.betAmount}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const txtMulti = this.add.text(0, 8, `${multi.toFixed(2)}X`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#000000'
    }).setOrigin(0.5);

    container.add([glow, bg, rect, txtAmt, txtMulti]);
    
    // Spawn Animation (Simple Pop)
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, glow, textAmount: txtAmt, textMulti: txtMulti,
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
        // Calculate distance from Head to Box Center
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 250; // Pixels
        
        if (dist < proximityRange) {
            // Closer = Higher Alpha
            const alpha = 1 - (dist / proximityRange);
            // Non-linear glow falloff
            box.glow.setAlpha(alpha * alpha * 0.8);
        } else {
            box.glow.setAlpha(0);
        }

        // --- Collision Logic ---
        // Check if Head passed the box center (X-axis)
        // AND is within strict vertical bounds (Head physically meets box)
        if (this.headX >= boxX) {
             const diffY = Math.abs(this.headY - boxY);
             // Hit window: Box Height / 2 + slight tolerance
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

    // Floating Win Text
    const winVal = box.betAmount * box.multiplier;
    const winText = this.add.text(box.container.x, box.container.y - 40, `+${winVal.toFixed(2)}`, {
        fontFamily: 'Orbitron', fontSize: '18px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5).setStroke('#000000', 3);

    this.tweens.add({
        targets: winText,
        y: winText.y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => winText.destroy()
    });

    // Pulse Ring
    const pulse = this.add.sprite(box.container.x, box.container.y, 'pulse_ring');
    pulse.setScale(0.5);
    this.tweens.add({
        targets: pulse, scale: 2.0, alpha: 0, duration: 600,
        onComplete: () => pulse.destroy()
    });

    // Particles
    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(40);
    
    // Update Store
    const store = useGameStore.getState();
    store.updateBalance(winVal);
    store.setLastWinAmount(winVal);

    // Clean remove box
    this.tweens.add({
        targets: box.container, scale: 1.1, alpha: 0, duration: 200,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Visual Fail
    box.rect.setFillStyle(0x333333);
    
    this.tweens.add({
        targets: box.container,
        y: box.container.y + 30,
        alpha: 0,
        duration: 400,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }
}
