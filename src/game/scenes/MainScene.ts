import Phaser from 'phaser';
import { OKXService } from '../../services/okxService';
import { useGameStore } from '../../store/gameStore';
import Assets from '../../assets.json';

interface PricePoint {
  time: number;
  price: number;
  worldX: number;
  worldY: number;
}

interface BettingBox {
  container: Phaser.GameObjects.Container;
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  basePrice: number; // Price level this box represents (X-axis equivalent)
  targetY: number; // World Y position (Time)
  multiplier: number;
  hit: boolean;
}

export class MainScene extends Phaser.Scene {
  private okxService: OKXService;
  private priceHistory: PricePoint[] = [];
  private chartGraphics: Phaser.GameObjects.Graphics;
  private gridGraphics: Phaser.GameObjects.Graphics;
  private bettingBoxes: BettingBox[] = [];
  
  private startTime: number = 0;
  private pixelPerSecond: number = 60; // Vertical speed (climbing up)
  private pixelPerDollar: number = 200; // Sensitivity for X-axis (1px = $0.005) - Needs tuning for ETH
  private initialPrice: number | null = null;
  private lastPrice: number = 0;

  private headY: number = 0;
  private startY: number = 0;
  private centerX: number = 0;

  private headEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.audio('sfx_win', Assets.audio.sfx.win.url);
    this.load.audio('sfx_place', Assets.audio.sfx.place_bet.url);
    this.load.audio('sfx_error', Assets.audio.sfx.error.url);
  }

  create() {
    // 1. Setup Camera & World
    this.cameras.main.setBackgroundColor('#0f0518'); // Dark Purple/Black
    this.startY = this.scale.height; // Start at bottom
    this.headY = this.startY;
    this.centerX = this.scale.width / 2;

    // 2. Post FX: Bloom (Neon Glow)
    if (this.cameras.main.postFX) {
        // High intensity bloom for neon look
        this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.2, 2.0);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // 4. Create Textures
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8); // Larger particle for explosion
    graphics.generateTexture('flare', 16, 16);
    
    graphics.clear();
    graphics.fillStyle(0x00ffcc, 1); // Cyan/Greenish for head
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('head_particle', 8, 8);

    // 5. Head Particle System (Trail/Engine effect)
    this.headEmitter = this.add.particles(0, 0, 'head_particle', {
      speed: 20,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      frequency: 50,
      follow: null as any // Will update manually
    });

    // 6. Data Service
    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    // 7. Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    // 8. Initial Draw
    this.drawGrid(0);
    
    // Status Text
    this.add.text(this.centerX, this.scale.height / 2, 'Waiting for OKX Stream...', { 
      fontSize: '24px', 
      color: '#00ffcc',
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setName('statusText');

    // Cleanup
    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
  }

  private cleanup() {
    if (this.okxService) {
      this.okxService.disconnect();
    }
  }

  update(time: number, delta: number) {
    if (!this.sys.isActive()) return;
    if (!this.initialPrice) return;

    // --- Vertical Progression Logic ---
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;
    
    // Head moves UP (Y decreases)
    // Formula: StartY - (Time * Speed)
    this.headY = this.startY - (elapsedTime * this.pixelPerSecond);

    // Camera follows Head
    // We want Head to be at ~25% from Top (Screen Height * 0.25)
    // Camera ScrollY = HeadY - (ScreenHeight * 0.25)
    const targetScrollY = this.headY - (this.scale.height * 0.25);
    
    // Smooth camera lerp (optional, but raw is tighter for rhythm)
    this.cameras.main.scrollY = targetScrollY;

    // --- Updates ---
    this.drawGrid(this.cameras.main.scrollY);
    this.drawChart();
    this.checkCollisions();
    this.cleanupOffscreen();
  }

  private handleNewPrice(price: number) {
    if (!this.sys.isActive()) return;

    const now = Date.now();
    
    if (this.initialPrice === null) {
      this.initialPrice = price;
      this.startTime = now;
      this.children.getByName('statusText')?.destroy();
      
      // Add start marker
      this.add.text(this.centerX, this.startY + 20, 'START', { fontSize: '16px', color: '#aaaaaa' })
        .setOrigin(0.5);
    }

    this.lastPrice = price;
    useGameStore.getState().setCurrentPrice(price);

    // --- Calculate Coordinates ---
    // Y: Time-based (Upward/Negative)
    const elapsedTime = (now - this.startTime) / 1000;
    const worldY = this.startY - (elapsedTime * this.pixelPerSecond);
    
    // X: Price-based (Left/Right)
    // CenterX is anchor. Price diff * Sensitivity
    const worldX = this.centerX + ((price - this.initialPrice) * this.pixelPerDollar);

    this.priceHistory.push({
      time: now,
      price: price,
      worldX: worldX,
      worldY: worldY
    });

    // Prune history (keep 500 points for performance)
    if (this.priceHistory.length > 500) {
      this.priceHistory.shift();
    }
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    // 1. Prepare Points
    const points: Phaser.Math.Vector2[] = [];
    
    // Viewport Culling
    const scrollY = this.cameras.main.scrollY;
    const height = this.scale.height;
    const buffer = 200;

    // Only draw points within vertical view range
    // Remember Y is decreasing as we go newer
    // Visible Range: [scrollY, scrollY + height]
    
    for (const p of this.priceHistory) {
      if (p.worldY > scrollY - buffer && p.worldY < scrollY + height + buffer) {
        points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
      }
    }

    if (points.length < 2) return;

    // 2. Draw Neon Line (Spline)
    const curve = new Phaser.Curves.Spline(points);
    
    // Outer Glow (faked with thick semi-transparent line)
    this.chartGraphics.lineStyle(6, 0x00ffff, 0.3);
    curve.draw(this.chartGraphics, 64);
    
    // Core Bright Line
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    this.chartGraphics.strokePath();

    // 3. Head Visuals
    const last = points[points.length - 1];
    
    // Update Emitter position
    this.headEmitter.setPosition(last.x, last.y);
    
    // Draw Head Dot
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(last.x, last.y, 4);
  }

  private drawGrid(scrollY: number) {
    this.gridGraphics.clear();
    
    const width = this.scale.width;
    const height = this.scale.height;
    const gridSize = 100;
    
    // Color: Deep Purple/Cyber
    this.gridGraphics.lineStyle(1, 0x6600cc, 0.3); 

    // Calculate Grid Offsets
    // Vertical Lines (Static X)
    for (let x = 0; x <= width; x += gridSize) {
      // Just vertical lines across the visible world height
      this.gridGraphics.moveTo(x, scrollY);
      this.gridGraphics.lineTo(x, scrollY + height);
    }

    // Horizontal Lines (Scrolling Y)
    // Snap to grid
    const startY = Math.floor(scrollY / gridSize) * gridSize;
    const endY = startY + height + gridSize;

    for (let y = startY; y <= endY; y += gridSize) {
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(width, y);
    }
    
    this.gridGraphics.strokePath();
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Convert Screen to World
    // pointer.worldX/Y includes camera scroll automatically
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // 1. Validation: Must be ABOVE the head (Lower Y value)
    // Allow small buffer
    if (worldY >= this.headY) {
      this.sound.play('sfx_error', { volume: 0.5 });
      this.showToast("Too late! Line passed this height.", '#ff0000');
      return;
    }

    // Check Balance
    const store = useGameStore.getState();
    if (store.balance < 1) {
      this.sound.play('sfx_error', { volume: 0.5 });
      this.showToast("Insufficient Balance!", '#ff0000');
      return;
    }

    // Deduct $1
    store.updateBalance(-1);
    this.sound.play('sfx_place', { volume: 0.6 });

    // Calculate Base Price (X-axis inverse)
    // worldX = centerX + (diff * ppd)
    // diff = (worldX - centerX) / ppd
    // price = initial + diff
    const targetPriceDiff = (worldX - this.centerX) / this.pixelPerDollar;
    const targetPrice = (this.initialPrice || 0) + targetPriceDiff;
    
    // Calculate Multiplier based on Altitude (Distance from current head)
    const distance = Math.abs(this.headY - worldY); // Pixels
    const distanceMeters = distance / 100; // Arbitrary unit
    
    let multiplier = 1.0 + (distanceMeters * 0.5); 
    // Bonus for volatility (distance from center X)
    const volatilityBonus = Math.abs(worldX - this.centerX) / 200;
    multiplier += volatilityBonus;
    
    multiplier = Math.round(multiplier * 10) / 10;
    if (multiplier < 1.1) multiplier = 1.1;

    // Create Visuals
    const boxSize = 40;
    const container = this.add.container(worldX, worldY);
    
    // Neon Yellow Box
    const rect = this.add.rectangle(0, 0, boxSize, boxSize, 0xffff00, 0.1);
    rect.setStrokeStyle(2, 0xffff00);
    
    // Glow effect for box
    if (this.cameras.main.postFX) {
        // Simple trick: We can't apply FX to container easily in all versions, 
        // but the global camera bloom will pick up the bright yellow stroke.
    }

    const text = this.add.text(0, 0, `x${multiplier}`, { 
      fontSize: '14px', 
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([rect, text]);
    
    // Set Size for Tweens (Custom Engine Rule)
    container.setSize(boxSize, boxSize);

    this.bettingBoxes.push({
      container,
      rect,
      text,
      basePrice: targetPrice,
      targetY: worldY,
      multiplier,
      hit: false
    });
    
    // Animate pop in
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.out'
    });
  }

  private checkCollisions() {
    if (this.priceHistory.length < 2) return;

    const p1 = this.priceHistory[this.priceHistory.length - 2];
    const p2 = this.priceHistory[this.priceHistory.length - 1];
    const boxSize = 40;

    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
      const box = this.bettingBoxes[i];
      if (box.hit) continue;

      // Hit Logic: Line Segment intersects Box
      const bounds = new Phaser.Geom.Rectangle(
        box.container.x - boxSize/2, 
        box.container.y - boxSize/2, 
        boxSize, 
        boxSize
      );

      const line = new Phaser.Geom.Line(p1.worldX, p1.worldY, p2.worldX, p2.worldY);
      
      if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) {
        this.handleWin(box, i);
        continue;
      }

      // Miss Logic: Line passed the box vertically
      // Head Y is moving Up (Decreasing)
      // If HeadY < (BoxY - Size), we passed it
      if (this.headY < (box.container.y - boxSize)) {
        this.handleLoss(box, i);
      }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win', { volume: 0.8 });

    // Explosion
    const particles = this.add.particles(box.container.x, box.container.y, 'flare', {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 800,
      emitting: false,
      quantity: 20
    });
    particles.explode();

    // Visual Feedback
    this.tweens.add({
      targets: box.container,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => box.container.destroy()
    });

    // Reward
    const store = useGameStore.getState();
    const reward = 1 * box.multiplier;
    store.updateBalance(reward);
    
    this.showFloatingText(box.container.x, box.container.y - 40, `+$${reward.toFixed(2)}`, '#00ff00');
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Fade out red
    box.rect.setStrokeStyle(2, 0xff0000);
    
    this.tweens.add({
      targets: box.container,
      alpha: 0,
      scale: 0.5,
      duration: 400,
      onComplete: () => box.container.destroy()
    });
    
    this.bettingBoxes.splice(index, 1);
  }

  private showToast(message: string, color: string) {
    const yPos = this.scale.height * 0.8; // Near bottom
    const toast = this.add.text(this.centerX, yPos, message, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: color,
      padding: { x: 10, y: 5 }
    })
    .setOrigin(0.5)
    .setScrollFactor(0) // Stick to screen
    .setDepth(100);

    this.tweens.add({
      targets: toast,
      y: yPos - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  private showFloatingText(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 1200,
      ease: 'Back.out',
      onComplete: () => text.destroy()
    });
  }

  private cleanupOffscreen() {
    // Cleanup very old history points to save memory
    // (Handled in handleNewPrice mostly)
  }
}
