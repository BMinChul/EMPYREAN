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
  basePrice: number;
  targetY: number;
  multiplier: number;
  betAmount: number; // Store the bet amount for this specific box
  hit: boolean;
}

export class MainScene extends Phaser.Scene {
  private okxService: OKXService;
  private priceHistory: PricePoint[] = [];
  private chartGraphics: Phaser.GameObjects.Graphics;
  private gridGraphics: Phaser.GameObjects.Graphics;
  private bettingBoxes: BettingBox[] = [];
  
  private startTime: number = 0;
  private pixelPerSecond: number = 80; // Faster vertical climb for excitement
  private pixelPerDollar: number = 250; // Sensitivity
  private initialPrice: number | null = null;
  private lastPrice: number = 0;

  // Head Position
  private headY: number = 0;
  private headX: number = 0;
  private targetHeadX: number = 0;
  
  private startY: number = 0;
  private centerX: number = 0;

  private headEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private goldEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

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
    this.cameras.main.setBackgroundColor('#050510'); // Dark Deep Space
    this.startY = this.scale.height;
    this.headY = this.startY;
    this.centerX = this.scale.width / 2;
    this.headX = this.centerX;
    this.targetHeadX = this.centerX;

    // 2. Post FX: Strong Neon Bloom
    if (this.cameras.main.postFX) {
        // Intensity, Blur Strength, Threshold
        this.cameras.main.postFX.addBloom(0xffffff, 1.5, 1.5, 0.9, 1.2);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // 4. Create Textures
    this.createTextures();

    // 5. Particle Systems
    // Trail (White/Blue Engine)
    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 100,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xaaccff,
      blendMode: 'ADD',
      lifespan: 400,
      frequency: 20,
      follow: null as any
    });

    // Win Explosion (Gold)
    this.goldEmitter = this.add.particles(0, 0, 'flare', {
      speed: { min: 100, max: 350 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffd700, // Gold
      blendMode: 'ADD',
      lifespan: 1000,
      emitting: false,
      quantity: 30
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
    
    // Waiting Text
    this.add.text(this.centerX, this.scale.height / 2, 'CONNECTING TO OKX...', { 
      fontFamily: 'Inter',
      fontSize: '20px', 
      color: '#6c5ce7',
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setName('statusText');

    this.events.on('shutdown', () => this.cleanup());
    this.events.on('destroy', () => this.cleanup());
  }

  private createTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Soft Flare
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);
    
    // Hexagon Pulse
    graphics.clear();
    graphics.lineStyle(4, 0xffd700, 1);
    graphics.strokeCircle(32, 32, 30);
    graphics.generateTexture('pulse_ring', 64, 64);
  }

  private cleanup() {
    if (this.okxService) {
      this.okxService.disconnect();
    }
  }

  update(time: number, delta: number) {
    if (!this.sys.isActive()) return;
    if (!this.initialPrice) return;

    // --- Vertical Progression ---
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;
    
    // Head moves UP constantly
    this.headY = this.startY - (elapsedTime * this.pixelPerSecond);

    // --- Horizontal Smoothing (Liquid Feel) ---
    // Lerp headX towards targetHeadX for smooth movement
    const lerpFactor = 0.1; // Adjust for smoothness vs responsiveness
    this.headX = Phaser.Math.Linear(this.headX, this.targetHeadX, lerpFactor);

    // --- Camera Tracking ---
    // Keep head at 30% from top
    const targetScrollY = this.headY - (this.scale.height * 0.3);
    // Smooth camera catch-up
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.1);

    // --- Drawing ---
    this.drawGrid(this.cameras.main.scrollY);
    this.drawChart();
    
    // Update Emitter
    this.headEmitter.setPosition(this.headX, this.headY);

    this.checkCollisions();
  }

  private handleNewPrice(price: number) {
    if (!this.sys.isActive()) return;

    const now = Date.now();
    
    if (this.initialPrice === null) {
      this.initialPrice = price;
      this.startTime = now;
      this.children.getByName('statusText')?.destroy();
      
      // Start Line
      this.add.rectangle(this.centerX, this.startY, this.scale.width, 2, 0xffffff, 0.1);
    }

    this.lastPrice = price;
    useGameStore.getState().setCurrentPrice(price);

    // Calculate Target X
    // CenterX is anchor.
    const diff = price - this.initialPrice;
    this.targetHeadX = this.centerX + (diff * this.pixelPerDollar);

    // Add to history (Use targetX for history to ensure line goes to actual data points eventually)
    // But for the *current* head, we lerp in update()
    
    // Correction: For history, we should record the price point exactly
    // The visual line will be a spline through these exact points
    const elapsedTime = (now - this.startTime) / 1000;
    const worldY = this.startY - (elapsedTime * this.pixelPerSecond);
    
    this.priceHistory.push({
      time: now,
      price: price,
      worldX: this.targetHeadX,
      worldY: worldY
    });

    if (this.priceHistory.length > 300) {
      this.priceHistory.shift();
    }
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    // 1. Prepare Points
    // We add the current lerped head position as the LAST point for smoothness
    const points: Phaser.Math.Vector2[] = [];
    
    const scrollY = this.cameras.main.scrollY;
    const height = this.scale.height;
    const buffer = 100;

    // Filter points for visibility
    for (const p of this.priceHistory) {
      if (p.worldY > scrollY - buffer && p.worldY < scrollY + height + buffer) {
        points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
      }
    }

    // Add current live head
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    // 2. Draw Spline (Liquid Line)
    const curve = new Phaser.Curves.Spline(points);
    
    // Glow Layer (Purple/Blue)
    this.chartGraphics.lineStyle(12, 0x6c5ce7, 0.2); // Soft wide glow
    curve.draw(this.chartGraphics, 64);
    
    this.chartGraphics.lineStyle(6, 0x6c5ce7, 0.4); // Medium glow
    curve.draw(this.chartGraphics, 64);

    // Core White Line
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // 3. Head Dot
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(this.headX, this.headY, 5);
  }

  private drawGrid(scrollY: number) {
    this.gridGraphics.clear();
    
    const width = this.scale.width;
    const height = this.scale.height;
    const gridSize = 100;
    
    // Glowing Purple Grid
    this.gridGraphics.lineStyle(1, 0x6c5ce7, 0.15); 

    // Vertical Lines (Static X)
    for (let x = 0; x <= width; x += gridSize) {
      this.gridGraphics.moveTo(x, scrollY);
      this.gridGraphics.lineTo(x, scrollY + height);
    }

    // Horizontal Lines (Scrolling Y)
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

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Validation: Must be ABOVE the head (Future)
    // Y decreases as we go up. So WorldY must be < HeadY (with buffer)
    if (worldY >= this.headY - 50) {
      this.sound.play('sfx_error', { volume: 0.5 });
      this.showFloatingText(worldX, worldY, "Too Close!", '#ff4d4d');
      return;
    }

    // Check Balance
    const store = useGameStore.getState();
    const betAmount = store.betAmount; // Use selected amount
    
    if (store.balance < betAmount) {
      this.sound.play('sfx_error', { volume: 0.5 });
      // React UI handles visual feedback usually, but we can add sound
      return;
    }

    // Deduct Balance
    store.updateBalance(-betAmount);
    this.sound.play('sfx_place', { volume: 0.6 });

    // Calculate Multiplier
    // Based on Vertical Distance (Time Risk) + Horizontal Deviation (Price Risk)
    const yDist = Math.abs(this.headY - worldY);
    const xDist = Math.abs(worldX - this.centerX);
    
    // Formula: Base 1.0 + (Y * 0.005) + (X * 0.002)
    // E.g. 500px up = +2.5x
    let multiplier = 1.0 + (yDist / 300) + (xDist / 500);
    multiplier = Math.max(1.1, Math.min(100, multiplier)); // Clamp
    
    // Visual Box
    const boxSize = 50;
    const container = this.add.container(worldX, worldY);
    
    // Neon Yellow Box
    const rect = this.add.rectangle(0, 0, boxSize, boxSize, 0x000000, 0.5);
    rect.setStrokeStyle(2, 0xffd700);
    
    // Text: 2.50X
    const multStr = multiplier.toFixed(2) + 'X';
    const text = this.add.text(0, 0, multStr, { 
      fontFamily: 'Orbitron',
      fontSize: '12px', 
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([rect, text]);
    container.setSize(boxSize, boxSize);

    // Animate In
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: 'Back.out'
    });

    this.bettingBoxes.push({
      container,
      rect,
      text,
      basePrice: 0, // Not used for hit logic anymore
      targetY: worldY,
      multiplier,
      betAmount,
      hit: false
    });
  }

  private checkCollisions() {
    if (this.priceHistory.length < 2) return;

    // Use current Head Position for collision
    const headRect = new Phaser.Geom.Circle(this.headX, this.headY, 10);
    const boxSize = 50;

    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
      const box = this.bettingBoxes[i];
      if (box.hit) continue;

      // Box Bounds
      const boxBounds = new Phaser.Geom.Rectangle(
        box.container.x - boxSize/2, 
        box.container.y - boxSize/2, 
        boxSize, 
        boxSize
      );

      // 1. WIN Condition: Head hits Box
      if (Phaser.Geom.Intersects.CircleToRectangle(headRect, boxBounds)) {
        this.handleWin(box, i);
        continue;
      }

      // 2. LOSS Condition: Head passes Box vertically
      // HeadY is decreasing. If HeadY < BoxY - Size, we passed it.
      if (this.headY < (box.container.y - boxSize)) {
        this.handleLoss(box, i);
      }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win', { volume: 0.8 });

    // Gold Explosion
    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(30);

    // Pulse Ring Effect
    const ring = this.add.image(box.container.x, box.container.y, 'pulse_ring');
    ring.setScale(0.5);
    this.tweens.add({
      targets: ring,
      scale: 2,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy()
    });

    // Calculate Reward
    const reward = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(reward);
    store.setLastWinAmount(reward); // Trigger React Notification

    // Remove Box
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
    // Fade out Red
    box.rect.setStrokeStyle(2, 0xff4d4d); // Red
    box.text.setColor('#ff4d4d');

    this.tweens.add({
      targets: box.container,
      alpha: 0,
      scale: 0.8,
      duration: 300,
      onComplete: () => box.container.destroy()
    });

    this.bettingBoxes.splice(index, 1);
  }

  private showFloatingText(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, {
      fontFamily: 'Inter',
      fontSize: '16px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }
}
