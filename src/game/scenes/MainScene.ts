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
  private speedX: number = 300; // Faster horizontal scroll for "Arcade" feel
  private pixelPerDollar: number = 100; // 100px = $1 change
  private gridPriceInterval: number = 1.0; // Grid line every $1
  
  // --- State ---
  private initialPrice: number | null = null;
  private currentPrice: number = 0;
  
  // --- Head Physics ---
  private headX: number = 0;
  private headY: number = 0;
  private targetHeadY: number = 0;
  
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
    this.cameras.main.setBackgroundColor('#0d0221'); // Deep "Euphoria" Purple/Black
    
    // Start centered
    this.headY = 0;
    this.targetHeadY = 0;
    this.headX = 0;

    // 2. Camera FX (Bloom)
    if (this.cameras.main.postFX) {
        // High Intensity Bloom for Neon look
        this.cameras.main.postFX.addBloom(0xffffff, 1.2, 1.2, 1.5, 1.5);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();
    this.axisGraphics = this.add.graphics();
    // Axis graphics draws screen-relative, so we handle it manually in update

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

    // 6. Head Label
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
  }

  private createTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Flare texture
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);
    
    // Hexagon Pulse
    graphics.clear();
    graphics.lineStyle(6, 0xffd700, 1); // Thicker line
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
    
    // Neon tag style
    const bg = this.add.rectangle(60, 0, 100, 28, 0xffffff, 0.9);
    bg.setStrokeStyle(2, 0x00ffff);
    
    this.headPriceText = this.add.text(60, 0, '$0,000.0', {
        fontFamily: 'Orbitron',
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    this.headPriceLabel.add([bg, this.headPriceText]);
    this.headPriceLabel.setDepth(100);
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
    // High Frequency Jitter for "Alive" feel
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { 
        this.jitterOffset = (Math.random() - 0.5) * 15; // +/- 7.5px jitter
        this.jitterTimer = 0;
    }

    // Cubic Bezier / Elastic Smoothing
    // We use a simple Lerp here but with a very responsive factor
    const finalTargetY = this.targetHeadY + this.jitterOffset;
    
    // Use a slightly stronger lerp for responsiveness, but smooth enough
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.1);

    // --- 3. Camera Sync ("Euphoria" Viewport) ---
    // HEAD FIXED at: X = 25% Screen, Y = 50% Screen
    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    
    // Camera Scroll X = HeadX - (ViewportW * 0.25)
    // This places HeadX at 25% from the left edge
    const targetScrollX = this.headX - (viewportW * 0.25);
    
    // Camera Scroll Y = HeadY - (ViewportH * 0.5)
    // This places HeadY at 50% height (Center)
    const targetScrollY = this.headY - (viewportH * 0.5);

    // Smooth Camera Follow
    this.cameras.main.scrollX = targetScrollX; // Hard lock X for constant speed
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.2); // Smooth Y

    // --- 4. History ---
    // Record more frequently for smoother curves
    if (time - this.lastPointTime > 20) {
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      // Cleanup old points (far left of camera)
      const buffer = 1000;
      if (this.priceHistory.length > 0 && this.priceHistory[0].worldX < this.cameras.main.scrollX - buffer) {
         this.priceHistory.shift();
      }
    }

    // --- 5. Draw ---
    this.drawGridAndAxis();
    this.drawChart();
    
    // --- 6. Visual Updates ---
    this.headEmitter.setPosition(this.headX, this.headY);
    
    // Label follows head strictly
    this.headPriceLabel.setPosition(this.headX, this.headY);
    this.headPriceText.setText(this.formatCurrency(this.currentPrice));
    
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
    // Y goes Negative as Price goes Positive (Up = Up on screen usually means lower Y in 2D, but we want Up = Up visually)
    // In Phaser: Y=0 top, Y+ down. 
    // We want Higher Price = Higher Screen Position (Lower Y value).
    const priceDelta = price - this.initialPrice;
    this.targetHeadY = -(priceDelta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    // We only draw visible segment + buffer
    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 200;

    const points: Phaser.Math.Vector2[] = [];
    
    for (const p of this.priceHistory) {
        if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
            points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
        }
    }
    // Add current head
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    const curve = new Phaser.Curves.Spline(points);

    // 1. Outer Bloom / Glow
    this.chartGraphics.lineStyle(20, 0x00ffff, 0.1); 
    curve.draw(this.chartGraphics, 64);
    
    this.chartGraphics.lineStyle(10, 0xffffff, 0.2);
    curve.draw(this.chartGraphics, 64);
    
    // 2. Core Line (Neon White)
    this.chartGraphics.lineStyle(4, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // 3. Head Diamond
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillPoints([
        { x: this.headX, y: this.headY - 8 },
        { x: this.headX + 8, y: this.headY },
        { x: this.headX, y: this.headY + 8 },
        { x: this.headX - 8, y: this.headY }
    ], true);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    this.axisGraphics.clear();
    
    // Hide all labels first
    this.gridLabels.forEach(l => l.setVisible(false));
    this.axisLabels.forEach(l => l.setVisible(false));
    
    let labelIdx = 0;
    let axisLabelIdx = 0;

    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;

    // --- Visible Price Range ---
    // Y = -(Price - Init) * Scale  =>  Price = Init - (Y / Scale)
    const minVisibleY = scrollY;
    const maxVisibleY = scrollY + height;
    
    const highPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    const lowPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    
    // Snap to grid interval
    const startPrice = Math.floor(lowPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const endPrice = Math.ceil(highPrice / this.gridPriceInterval) * this.gridPriceInterval;

    // --- Horizontal Lines (Price) ---
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15); // Neon Purple
    
    for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        
        // Draw across screen
        this.gridGraphics.moveTo(scrollX, y);
        this.gridGraphics.lineTo(scrollX + width, y);
        
        // Axis Label (Fixed to Right Edge of Screen)
        const labelText = p.toFixed(2);
        let label = this.axisLabels[axisLabelIdx];
        if (!label) {
            label = this.add.text(0, 0, labelText, {
                fontFamily: 'monospace', fontSize: '12px', color: '#ff00ff', align: 'right'
            }).setScrollFactor(0).setOrigin(1, 0.5);
            this.axisLabels.push(label);
        }
        
        // Calculate screen-relative Y
        const screenY = y - scrollY;
        
        // Only show if reasonably within screen
        if (screenY > 20 && screenY < height - 20) {
            label.setPosition(width - 10, screenY);
            label.setText(labelText);
            label.setVisible(true);
            axisLabelIdx++;
        }
    }

    // --- Vertical Lines (Time) ---
    const gridSpacingX = 150;
    const startGridX = Math.floor(scrollX / gridSpacingX) * gridSpacingX;
    const endGridX = scrollX + width;
    
    for (let x = startGridX; x < endGridX; x += gridSpacingX) {
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);
        
        // --- Betting Multipliers ---
        // Only show in the "Future" (Right of Head)
        // Head is at ~25% screen. Future is X > HeadX.
        if (x > this.headX) {
             // Calculate multipliers for each price intersection
             for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                 const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                 
                 // Skip if off screen
                 if (y < scrollY || y > scrollY + height) continue;

                 // Calculate Multiplier
                 const distX = x - this.headX;
                 const distY = Math.abs(y - this.headY);
                 
                 // Formula: distance based
                 let multi = 1.0 + (distX/600) + (distY/400);
                 if (multi > 10) multi = 10;
                 
                 let gl = this.gridLabels[labelIdx];
                 if (!gl) {
                     gl = this.add.text(0, 0, '', {
                         fontFamily: 'Orbitron', fontSize: '10px', color: '#ffffff', alpha: 0.3
                     }).setOrigin(0.5);
                     this.gridLabels.push(gl);
                 }
                 
                 // Center in grid cell
                 gl.setPosition(x + gridSpacingX/2, y - (this.gridPriceInterval * this.pixelPerDollar)/2);
                 gl.setText(`${multi.toFixed(2)}x`);
                 gl.setVisible(true);
                 labelIdx++;
             }
        }
    }
    
    this.gridGraphics.strokePath();
    
    // Divider Line at Head X (Visual separation of Past/Future)
    this.gridGraphics.lineStyle(2, 0xffffff, 0.3);
    this.gridGraphics.beginPath();
    this.gridGraphics.moveTo(this.headX, scrollY);
    this.gridGraphics.lineTo(this.headX, scrollY + height);
    this.gridGraphics.strokePath();
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Valid Zone: "Future" -> Right of Head
    // Head is at 25% screen. So anything > 25% screen width is valid? 
    // Let's enforce a small buffer so they don't bet ON the head.
    if (pointer.worldX <= this.headX + 50) return;

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

    // Calculate Multiplier
    const distX = worldX - this.headX;
    const distY = Math.abs(worldY - this.headY);
    let multiplier = 1.1 + (distX / 600) + (distY / 400);
    multiplier = Math.max(1.1, Math.min(100.0, multiplier));

    // Create Yellow Betting Box
    const boxW = 80;
    const boxH = 40;
    const container = this.add.container(worldX, worldY);
    
    // Yellow Box Style
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0xffd700, 0.9);
    rect.setStrokeStyle(2, 0xffffff);
    
    // Amount (Black on Yellow)
    const textAmount = this.add.text(0, -6, `$${store.betAmount}`, {
        fontFamily: 'Orbitron', fontSize: '16px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Multiplier (Black on Yellow)
    const textMulti = this.add.text(0, 10, `${multiplier.toFixed(2)}x`, {
        fontFamily: 'Orbitron', fontSize: '10px', color: '#000000'
    }).setOrigin(0.5);

    container.add([rect, textAmount, textMulti]);
    
    // Animation: Scale Up
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 400,
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
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // Box width check
        if (this.headX >= boxX - box.boxWidth/2 && this.headX <= boxX + box.boxWidth/2) {
             // Height check
             if (Math.abs(this.headY - boxY) < box.boxHeight/2) {
                 this.handleWin(box, i);
                 continue;
             }
        }

        // Miss check (passed box)
        if (this.headX > boxX + box.boxWidth/2 + 20) {
            this.handleLoss(box, i);
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win');

    // Effect: Pulse Ring
    const pulse = this.add.sprite(box.container.x, box.container.y, 'pulse_ring');
    pulse.setScale(0.5);
    pulse.setAlpha(1);
    this.tweens.add({
        targets: pulse,
        scale: 2.0,
        alpha: 0,
        duration: 600,
        onComplete: () => pulse.destroy()
    });

    // Effect: Particles
    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(50);
    
    // Data Update
    const winVal = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(winVal);
    store.setLastWinAmount(winVal);

    // Remove Box
    this.tweens.add({
        targets: box.container,
        scale: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Turn Red/Grey
    box.rect.setFillStyle(0x333333);
    box.rect.setStrokeStyle(2, 0xff0000);
    box.textAmount.setColor('#ff0000');
    
    this.tweens.add({
        targets: box.container,
        y: box.container.y + 50,
        alpha: 0,
        duration: 500,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }
  
  private formatCurrency(val: number): string {
      return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}
