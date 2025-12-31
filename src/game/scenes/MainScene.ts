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
  private axisGraphics: Phaser.GameObjects.Graphics;
  private bettingBoxes: BettingBox[] = [];
  private gridLabels: Phaser.GameObjects.Text[] = [];
  private axisLabels: Phaser.GameObjects.Text[] = [];
  private headPriceLabel: Phaser.GameObjects.Container;
  private headPriceText: Phaser.GameObjects.Text;
  
  // --- Configuration ---
  private speedX: number = 200; // Horizontal speed
  private pixelPerDollar: number = 200; // Zoom level (Pixels per $1 price change)
  private gridPriceInterval: number = 0.5; // Draw a line every $0.50 change
  
  // --- State ---
  private initialPrice: number | null = null;
  private currentPrice: number = 0;
  
  // --- Head Physics ---
  private headX: number = 0;
  private headY: number = 0;
  private targetHeadY: number = 0;
  private startY: number = 0;
  
  // Volatility / Jitter
  private jitterOffset: number = 0;
  private jitterTimer: number = 0;

  // --- Visuals ---
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
    // 1. Setup World
    this.cameras.main.setBackgroundColor('#1a0b2e'); // Deep magenta/purple
    
    // Start vertically centered
    this.startY = 0; // World Center is 0,0 for easier math
    this.headY = 0;
    this.targetHeadY = 0;
    this.headX = 0;

    // 2. Camera FX (Bloom)
    if (this.cameras.main.postFX) {
        // Color, Intensity, Blur, Strength
        this.cameras.main.postFX.addBloom(0xffffff, 0.8, 0.8, 1.1, 1.2);
    }

    // 3. Graphics Layers (Order Matters)
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();
    this.axisGraphics = this.add.graphics();
    this.axisGraphics.setScrollFactor(0); // Axis UI stays fixed on screen overlay? No, needs to scroll Y but stick X. We'll handle manually.

    // 4. Generate Textures
    this.createTextures();

    // 5. Particles
    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 20,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xaaccff,
      blendMode: 'ADD',
      lifespan: 200,
      frequency: 40
    });

    this.goldEmitter = this.add.particles(0, 0, 'flare', {
      speed: { min: 200, max: 500 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffd700,
      blendMode: 'ADD',
      lifespan: 1000,
      emitting: false,
      quantity: 50,
      gravityY: 200
    });

    // 6. Head Label (Floating Tag)
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
    this.add.text(centerX, centerY, 'CONNECTING TO OKX...', { 
      fontFamily: 'Orbitron', fontSize: '24px', color: '#ffd700', fontStyle: 'bold'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setName('statusText');

    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
  }

  private createTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Flare texture
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);
    
    // Hexagon Pulse
    graphics.clear();
    graphics.lineStyle(4, 0xffd700, 1);
    const radius = 40;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 7; i++) {
      const angle = Phaser.Math.DegToRad(60 * i);
      points.push(new Phaser.Math.Vector2(42 + Math.cos(angle) * radius, 42 + Math.sin(angle) * radius));
    }
    graphics.strokePoints(points);
    graphics.generateTexture('pulse_ring', 84, 84);
  }

  private createHeadLabel() {
    this.headPriceLabel = this.add.container(0, 0);
    
    const bg = this.add.rectangle(45, 0, 80, 24, 0xffffff, 1);
    this.headPriceText = this.add.text(45, 0, '$0000.0', {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: '#000000',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    this.headPriceLabel.add([bg, this.headPriceText]);
    this.headPriceLabel.setDepth(100); // Always on top
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

    // --- 1. Horizontal Movement ---
    this.headX += this.speedX * dt;

    // --- 2. Vertical Movement (Price + Volatility) ---
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.08) { 
        this.jitterOffset = (Math.random() - 0.5) * 20; 
        this.jitterTimer = 0;
    }

    // Smooth Lerp
    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15);

    // --- 3. Camera Sync (The "Euphoria" Lock) ---
    // Rule: Head is ALWAYS at center screen width (after initial run-up)
    // Rule: Head is ALWAYS at center screen height (Vertical Lock)
    const halfWidth = this.scale.width / 2;
    const halfHeight = this.scale.height / 2;
    
    // Horizontal Lock
    if (this.headX > halfWidth) {
        this.cameras.main.scrollX = this.headX - halfWidth;
    } else {
        this.cameras.main.scrollX = 0;
    }

    // Vertical Lock: Camera Y = Head Y - Half Screen Height
    // This keeps the head perfectly centered vertically
    this.cameras.main.scrollY = this.headY - halfHeight;

    // --- 4. History ---
    if (time - this.lastPointTime > 30) {
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      const leftBound = this.cameras.main.scrollX - 200;
      if (this.priceHistory.length > 0 && this.priceHistory[0].worldX < leftBound) {
         this.priceHistory.shift();
      }
    }

    // --- 5. Draw ---
    this.drawGridAndAxis();
    this.drawChart();
    
    // --- 6. Updates ---
    this.headEmitter.setPosition(this.headX, this.headY);
    
    // Update Head Label
    this.headPriceLabel.setPosition(this.headX, this.headY);
    this.headPriceText.setText(`$${this.currentPrice.toFixed(1)}`);
    
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

    // Calculate Target Y
    // Y = (InitialPrice - CurrentPrice) * Scale
    // If price goes UP, Y goes UP (negative) visually on canvas? 
    // Usually Y=0 is top. 
    // Let's say Y goes DOWN (negative) as Price goes UP (positive).
    const priceDelta = price - this.initialPrice;
    this.targetHeadY = -(priceDelta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 150;

    const points: Phaser.Math.Vector2[] = [];
    
    for (const p of this.priceHistory) {
        if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
            points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
        }
    }
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    const curve = new Phaser.Curves.Spline(points);

    // Glows
    this.chartGraphics.lineStyle(16, 0xffffff, 0.08);
    curve.draw(this.chartGraphics, 64);
    
    this.chartGraphics.lineStyle(4, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // Head Diamond
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
    this.axisGraphics.clear();
    
    // Clear old labels
    this.gridLabels.forEach(l => l.setVisible(false));
    this.axisLabels.forEach(l => l.setVisible(false));
    
    let labelIdx = 0;
    let axisLabelIdx = 0;

    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;

    // --- 1. Calculate Visible Price Range ---
    // HeadY corresponds to CurrentPrice.
    // Screen Top (scrollY) -> corresponds to High Price
    // Screen Bottom (scrollY + height) -> corresponds to Low Price
    // Y = -(Price - Init) * Scale
    // Price = Init - (Y / Scale)
    
    const maxVisibleY = scrollY + height;
    const minVisibleY = scrollY;
    
    // We want grid lines at nice intervals (e.g. $0.50)
    // Find the first "nice" price within view
    const minPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    const maxPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    
    const startPrice = Math.floor(minPrice / this.gridPriceInterval) * this.gridPriceInterval;
    
    // Draw Horizontal Lines (Price Levels)
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.1); // Faint Purple
    
    for (let p = startPrice; p <= maxPrice; p += this.gridPriceInterval) {
        // Convert Price back to Y
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        
        // Draw Line
        this.gridGraphics.moveTo(scrollX, y);
        this.gridGraphics.lineTo(scrollX + width, y);
        
        // Axis Label (Far Right)
        const labelText = p.toFixed(2); // "2975.50"
        let label = this.axisLabels[axisLabelIdx];
        if (!label) {
            label = this.add.text(0, 0, labelText, {
                fontFamily: 'Orbitron', fontSize: '10px', color: '#ff00ff'
            }).setScrollFactor(0).setOrigin(1, 0.5); // Fixed to screen
            this.axisLabels.push(label);
        }
        
        // Position fixed to screen right, but Y relative to camera
        // Since label is scrollFactor(0), we must manually calculate screenY
        const screenY = y - scrollY;
        label.setPosition(width - 10, screenY);
        label.setText(labelText);
        label.setVisible(true);
        axisLabelIdx++;
    }

    // Draw Vertical Lines (Time)
    // Space them out by 100px
    const gridSpacingX = 100;
    const startGridX = Math.floor(scrollX / gridSpacingX) * gridSpacingX;
    
    for (let x = startGridX; x < scrollX + width; x += gridSpacingX) {
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);
        
        // --- Multipliers in Grid Cells (Right Side Only) ---
        // Only show multipliers in the "Future" zone (Right of Head)
        if (x > this.headX) {
            // Check vertical cells
             for (let p = startPrice; p <= maxPrice; p += this.gridPriceInterval) {
                 const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                 
                 // Calculate Multiplier for this cell
                 const distX = x - this.headX;
                 const distY = Math.abs(y - this.headY);
                 
                 // Simple Formula
                 let multi = 1.0 + (distX/500) + (distY/300);
                 if (multi > 10) multi = 10;
                 
                 let gl = this.gridLabels[labelIdx];
                 if (!gl) {
                     gl = this.add.text(0, 0, '', {
                         fontFamily: 'monospace', fontSize: '10px', color: '#aa00ff', alpha: 0.5
                     }).setOrigin(0.5);
                     this.gridLabels.push(gl);
                 }
                 gl.setPosition(x + gridSpacingX/2, y - (this.gridPriceInterval * this.pixelPerDollar)/2);
                 gl.setText(`${multi.toFixed(2)}x`);
                 gl.setVisible(true);
                 labelIdx++;
             }
        }
    }
    
    this.gridGraphics.strokePath();
    
    // Draw Center Divider Line (Visual Reference)
    const centerX = scrollX + (width / 2);
    this.gridGraphics.lineStyle(2, 0xffffff, 0.1);
    this.gridGraphics.beginPath();
    this.gridGraphics.moveTo(centerX, scrollY);
    this.gridGraphics.lineTo(centerX, scrollY + height);
    this.gridGraphics.strokePath();
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Valid Zone: Right of center line
    const centerX = this.cameras.main.scrollX + (this.scale.width / 2);
    if (pointer.worldX < centerX) return;

    // Get World Coords (already correct in pointer)
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Balance Check
    const store = useGameStore.getState();
    if (store.balance < store.betAmount) {
        this.sound.play('sfx_error');
        return;
    }
    store.updateBalance(-store.betAmount);
    this.sound.play('sfx_place', { volume: 0.5 });

    // Snap to Grid (Optional, makes it look cleaner)
    // No, free placement is usually more fun in these arcades.

    // Calculate Multiplier
    const distX = worldX - this.headX;
    const distY = Math.abs(worldY - this.headY);
    let multiplier = 1.1 + (distX / 500) + (distY / 300);
    multiplier = Math.max(1.1, Math.min(100.0, multiplier));

    // Create "Yellow Box" UI
    const boxW = 80;
    const boxH = 50;
    const container = this.add.container(worldX, worldY);
    
    // 1. Box Background (Black with Yellow Border)
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0.8);
    rect.setStrokeStyle(2, 0xffd700);
    
    // 2. Bet Amount Text (Large, Black on Yellow? Or Yellow on Black?)
    // Image 2 usually shows Yellow background or Yellow Border.
    // Let's do Yellow Border, Yellow Text.
    const textAmount = this.add.text(0, -8, `$${store.betAmount}`, {
        fontFamily: 'Orbitron', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // 3. Multiplier Text (Small, below)
    const textMulti = this.add.text(0, 12, `${multiplier.toFixed(2)}x`, {
        fontFamily: 'Orbitron', fontSize: '12px', color: '#ffd700'
    }).setOrigin(0.5);

    container.add([rect, textAmount, textMulti]);
    
    // Pop In
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, textAmount, textMulti,
        betAmount: store.betAmount,
        multiplier,
        hit: false,
        boxWidth: boxW, boxHeight: boxH
    });
  }

  private checkCollisions() {
    const headRadius = 10; // Slightly larger for forgiveness
    
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // Simple distance check first
        const dx = this.headX - boxX;
        
        // Hit Logic: Head must pass through the box
        // Bounding Box Collision
        if (this.headX > boxX - box.boxWidth/2 && this.headX < boxX + box.boxWidth/2) {
            if (Math.abs(this.headY - boxY) < box.boxHeight/2) {
                this.handleWin(box, i);
                continue;
            }
        }

        // Miss Logic: Passed X completely
        if (this.headX > boxX + box.boxWidth/2 + 20) {
            this.handleLoss(box, i);
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win');

    // Win Effects
    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(40);
    
    // Store Update
    const winVal = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(winVal);
    store.setLastWinAmount(winVal);

    // Remove Visual
    this.tweens.add({
        targets: box.container,
        scale: 1.5,
        alpha: 0,
        duration: 200,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Loss Effects: Red, Drop
    box.rect.setStrokeStyle(2, 0xff0000);
    box.textMulti.setColor('#ff0000');
    
    this.tweens.add({
        targets: box.container,
        y: box.container.y + 100,
        alpha: 0,
        duration: 500,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }
}
