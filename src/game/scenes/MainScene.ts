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
  
  // Containers for UI elements that live in World Space but act like UI
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
  // Need to be sensitive enough to show movements
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
    this.cameras.main.setBackgroundColor('#0d0221'); // Deep "Euphoria" Purple/Black
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

    // 6. Head Price Label
    this.createHeadLabel();

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
    
    // Hexagon Pulse
    graphics.clear();
    graphics.lineStyle(6, 0xffd700, 1);
    const radius = 50;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 7; i++) {
      const angle = Phaser.Math.DegToRad(60 * i);
      points.push(new Phaser.Math.Vector2(52 + Math.cos(angle) * radius, 52 + Math.sin(angle) * radius));
    }
    graphics.strokePoints(points);
    graphics.generateTexture('pulse_ring', 104, 104);
  }

  private createHeadLabel() {
    this.headPriceLabel = this.add.container(0, 0);
    this.headPriceLabel.setDepth(100);

    // Neon tag style
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
    // X = 25% Screen Width
    // Y = 50% Screen Height
    
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
    
    // Head Label: Aligned with Head vertically, but stuck to right axis?
    // Requirement: "Current Price Tag: A small label attached to the Head"
    // AND "perfectly aligned with the right-side scale"
    // Let's attach it to the Head but maybe offset it to the right? 
    // Actually, usually "Attached to Head" means following the head tip.
    this.headPriceLabel.setPosition(this.headX + 45, this.headY);
    this.headPriceText.setText('$' + this.currentPrice.toFixed(1));

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
    // Higher Price = Lower Y (Up on screen)
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
    
    // 3. Head Diamond
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillPoints([
        { x: this.headX, y: this.headY - 6 },
        { x: this.headX + 6, y: this.headY },
        { x: this.headX, y: this.headY + 6 },
        { x: this.headX - 6, y: this.headY }
    ], true);
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
    // Betting Zone = Right 75% of screen
    // Total Columns = 8
    // Zone Width = 0.75 * Width
    // Column Width = Zone Width / 8
    const zoneWidth = width * 0.75;
    const colWidth = zoneWidth / 8;
    
    // Start drawing from HeadX
    // We want lines relative to headX, but fixed in time?
    // "Scrolling: The chart and grid scroll left"
    // This implies grid lines are fixed in World X.
    // Let's create a grid fixed to world coordinates (Time).
    
    const gridStartTime = Math.floor(scrollX / colWidth) * colWidth;
    const gridEndTime = scrollX + width;

    let gridLabelIdx = 0;

    // --- 2. Horizontal Price Lines ---
    // Calculate visible price range
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
        
        // Right-Axis Label (Dynamic, Scrolls vertically with camera)
        // Position: Fixed X (Right of Screen), World Y
        // Since we are drawing in World Space, we put it at scrollX + width - padding
        const labelX = scrollX + width - 10;
        
        let label = this.axisLabels[axisLabelIdx];
        if (!label) {
            label = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '11px', color: '#ff00ff', align: 'right'
            }).setOrigin(1, 0.5);
            this.axisLabels.push(label);
        }
        
        label.setPosition(labelX, y);
        label.setText('$' + p.toFixed(1)); // $2,975.5
        label.setVisible(true);
        axisLabelIdx++;
    }

    // Draw Time/Column Lines
    for (let x = gridStartTime; x <= gridEndTime; x += colWidth) {
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);

        // --- Multiplier Logic ---
        // Columns 1-4: No Multiplier
        // Columns 5-8: Multiplier
        // Determine column index relative to Head?
        // "Head Position: The price line "Head" is pinned at 25% from the left."
        // "Grid Structure: The right-side Betting Zone consists of exactly 8 horizontal segments"
        
        // Distance from Head
        const distFromHead = x - this.headX;
        
        // If x is behind head, ignore
        if (distFromHead < -10) continue; // Allow small buffer

        // Convert distance to Column Index (0 to 7)
        // Col 0 starts at HeadX
        const colIndex = Math.floor(distFromHead / colWidth);
        
        // Only show multipliers for Cols 4, 5, 6, 7 (Index 4-7)
        if (colIndex >= 4 && colIndex < 8) {
            // Calculate transparency gradient (Col 4 faint -> Col 7 strong)
            const alpha = 0.2 + ((colIndex - 4) * 0.2); // 0.2, 0.4, 0.6, 0.8
            
            // Draw multipliers in cells for this column
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                // Cell center Y is between this line and previous line?
                // Let's put it ON the line intersection for simplicity or center of cell?
                // Request says "inside the cells". Let's center it.
                
                const cellCenterX = x + colWidth/2;
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;

                // Calculate Multiplier Value based on distance
                // Farther X = Higher Multiplier
                // Farther Y from Head = Higher Multiplier
                const distY = Math.abs(cellCenterY - this.headY);
                let multi = 1.0 + (colIndex * 0.5) + (distY / 200);
                
                let gl = this.gridLabels[gridLabelIdx];
                if (!gl) {
                    gl = this.add.text(0, 0, '', {
                        fontFamily: 'Orbitron', fontSize: '12px', color: '#ffccff'
                    }).setOrigin(0.5);
                    this.gridLabels.push(gl);
                }
                
                gl.setPosition(cellCenterX, cellCenterY);
                gl.setText(multi.toFixed(2) + 'X');
                gl.setAlpha(alpha);
                gl.setVisible(true);
                gridLabelIdx++;
            }
        }
    }
    
    this.gridGraphics.strokePath();

    // Divider Line at Head
    this.gridGraphics.lineStyle(2, 0xffffff, 0.5);
    this.gridGraphics.beginPath();
    this.gridGraphics.moveTo(this.headX, scrollY);
    this.gridGraphics.lineTo(this.headX, scrollY + height);
    this.gridGraphics.strokePath();
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
    // We want the box to be "Fixed to that specific grid cell's coordinates"
    // Calculate which cell we clicked
    const width = this.scale.width;
    const zoneWidth = width * 0.75;
    const colWidth = zoneWidth / 8;
    
    // X Snap
    // Col Index relative to Head
    const distHead = pointer.worldX - this.headX;
    const colIdx = Math.floor(distHead / colWidth);
    const cellX = this.headX + (colIdx * colWidth) + (colWidth/2); // Center of cell

    // Y Snap (Price Line)
    // Find closest price line
    const relY = pointer.worldY; // World Y
    // Convert to price
    const priceAtCursor = this.initialPrice! - (relY / this.pixelPerDollar);
    // Snap price to 0.5
    const snappedPrice = Math.round(priceAtCursor / this.gridPriceInterval) * this.gridPriceInterval;
    // Convert back to World Y
    const cellY = -(snappedPrice - this.initialPrice!) * this.pixelPerDollar;

    // 3. Calculate Multiplier at this exact spot (Fixed at creation time)
    const distY = Math.abs(cellY - this.headY);
    let multi = 1.0 + (colIdx * 0.5) + (distY / 200);
    multi = Math.max(1.1, multi);

    // 4. Create Box
    store.updateBalance(-store.betAmount);
    this.sound.play('sfx_place', { volume: 0.5 });

    const container = this.add.container(cellX, cellY);
    
    // Yellow Box
    const boxW = 80;
    const boxH = 30;
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0xffd700, 1);
    rect.setStrokeStyle(2, 0xffffff);
    
    // Text: Amount (Top), Multiplier (Bottom)
    const txtAmt = this.add.text(0, -6, `$${store.betAmount}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const txtMulti = this.add.text(0, 6, `${multi.toFixed(2)}X`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#000000'
    }).setOrigin(0.5);

    container.add([rect, txtAmt, txtMulti]);
    
    // Spawn Animation
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, textAmount: txtAmt, textMulti: txtMulti,
        betAmount: store.betAmount, multiplier: multi,
        hit: false, boxWidth: boxW, boxHeight: boxH
    });
  }

  private checkCollisions() {
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        // Collision Logic:
        // Head reaches the X of the box
        // Tolerance on Y
        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // Check if Head passed the box center
        if (this.headX >= boxX) {
             // Check Height
             const diffY = Math.abs(this.headY - boxY);
             // Hit window: Box Height / 2 + Line Thickness buffer
             if (diffY < (box.boxHeight/2 + 10)) {
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
    const winVal = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(winVal);
    store.setLastWinAmount(winVal);

    // Destroy
    this.tweens.add({
        targets: box.container, scale: 1.5, alpha: 0, duration: 300,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Visual Fail
    box.rect.setFillStyle(0x333333);
    box.rect.setStrokeStyle(1, 0xff0000);
    
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
