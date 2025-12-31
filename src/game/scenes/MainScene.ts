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
  text: Phaser.GameObjects.Text;
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
  private bettingBoxes: BettingBox[] = [];
  
  // Movement & Scale
  private speedX: number = 100; // Pixels per second horizontal (Time)
  private pixelPerDollar: number = 200; // Y sensitivity (Pixels per $1 change)
  
  private initialPrice: number | null = null;
  private currentPrice: number = 0;
  
  // Head Position
  private headX: number = 0;
  private headY: number = 0;
  private targetHeadY: number = 0;
  
  // Starting Anchors
  private startY: number = 0;
  
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
    // 1. Setup World & Camera
    this.cameras.main.setBackgroundColor('#050510');
    
    // Start in middle of screen vertically
    this.startY = this.scale.height / 2;
    this.headY = this.startY;
    this.targetHeadY = this.startY;
    this.headX = 100; // Start with some padding

    // Camera Setup
    this.cameras.main.setZoom(1);
    
    // 2. Post FX: Strong Neon Bloom
    if (this.cameras.main.postFX) {
        this.cameras.main.postFX.addBloom(0xffffff, 1.2, 1.2, 0.8, 1.1);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // 4. Textures
    this.createTextures();

    // 5. Particles
    // Blue/White Engine Trail
    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 50,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xaaccff,
      blendMode: 'ADD',
      lifespan: 300,
      frequency: 50
    });

    // Gold Win Explosion
    this.goldEmitter = this.add.particles(0, 0, 'flare', {
      speed: { min: 150, max: 400 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffd700,
      blendMode: 'ADD',
      lifespan: 800,
      emitting: false,
      quantity: 40
    });

    // 6. Data Service
    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    // 7. Input (Betting)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    // Waiting Text
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'WAITING FOR MARKET DATA...', { 
      fontFamily: 'Orbitron',
      fontSize: '24px', 
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
    
    // Flare texture
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('flare', 32, 32);
    
    // Hexagon Pulse
    graphics.clear();
    graphics.lineStyle(4, 0xffd700, 1);
    // Draw Hexagon
    const radius = 30;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i);
      points.push(new Phaser.Math.Vector2(32 + Math.cos(angle) * radius, 32 + Math.sin(angle) * radius));
    }
    graphics.strokePoints(points, true, true);
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

    const dt = delta / 1000; // Seconds

    // 1. Move Head X (Time)
    this.headX += this.speedX * dt;

    // 2. Move Head Y (Price) - Lerp for smooth "Liquid" feel
    // Use a Cubic ease for reactivity but smoothness
    const lerpT = 0.1; 
    this.headY = Phaser.Math.Linear(this.headY, this.targetHeadY, lerpT);

    // 3. Camera Tracking
    // Keep head at 70% of the screen width
    // scrollX = headX - (screenWidth * 0.7)
    const targetScrollX = this.headX - (this.scale.width * 0.7);
    this.cameras.main.scrollX = targetScrollX; // Hard lock X
    // We can also smooth Y slightly if we want the grid to move vertically, 
    // but typically arcade charts keep camera fixed Y or slow follow.
    // Let's do slow follow Y to keep line centered if it goes too far
    const targetScrollY = this.headY - (this.scale.height * 0.5);
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.05);

    // 4. Update History (Sampling)
    // Add point every 50ms or so to create the curve
    if (time - this.lastPointTime > 50) {
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      // Prune old points to save memory (keep last 2000px worth)
      if (this.priceHistory.length > 500) {
        // Remove points that are far off screen to the left
        const leftBound = this.cameras.main.scrollX - 200;
        if (this.priceHistory[0].worldX < leftBound) {
           this.priceHistory.shift();
        }
      }
    }

    // 5. Draw
    this.drawGrid();
    this.drawChart();
    
    // 6. Emitter
    this.headEmitter.setPosition(this.headX, this.headY);

    // 7. Collisions
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
    // Delta = Current - Initial
    // Y = StartY - (Delta * Sensitivity)
    // (Minus because Y goes UP as value decreases in 2D coords)
    const delta = price - this.initialPrice;
    this.targetHeadY = this.startY - (delta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    // Use points visible in camera + buffer
    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 100;

    // Construct curve points: History + Current Head
    const points: Phaser.Math.Vector2[] = [];
    
    // Optimization: Binary search or just simple loop since array is small (<500)
    for (const p of this.priceHistory) {
      if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
        points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
      }
    }
    // Add current head
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    const curve = new Phaser.Curves.Spline(points);

    // 1. Glow (Wide/Soft)
    this.chartGraphics.lineStyle(12, 0xffffff, 0.1); 
    curve.draw(this.chartGraphics, 64);
    
    // 2. Glow (Medium)
    this.chartGraphics.lineStyle(6, 0xffffff, 0.3);
    curve.draw(this.chartGraphics, 64);

    // 3. Core Line (White Neon)
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // Head Dot
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(this.headX, this.headY, 5);
  }

  private drawGrid() {
    this.gridGraphics.clear();
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Deep Purple Grid
    this.gridGraphics.lineStyle(1, 0x6c5ce7, 0.2);

    const gridSize = 100;

    // Vertical Lines (World X based)
    const startX = Math.floor(scrollX / gridSize) * gridSize;
    const endX = startX + width + gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      this.gridGraphics.moveTo(x, scrollY);
      this.gridGraphics.lineTo(x, scrollY + height);
    }

    // Horizontal Lines (World Y based)
    const startY = Math.floor(scrollY / gridSize) * gridSize;
    const endY = startY + height + gridSize;

    for (let y = startY; y <= endY; y += gridSize) {
      this.gridGraphics.moveTo(scrollX, y);
      this.gridGraphics.lineTo(scrollX + width, y);
    }

    this.gridGraphics.strokePath();
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Convert Screen input to World space
    // Since we control camera, pointer.worldX/Y are already correct
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Validation: Must place AHEAD of the head (Future X)
    if (worldX <= this.headX + 50) {
      this.sound.play('sfx_error', { volume: 0.5 });
      // Visual feedback
      const txt = this.add.text(worldX, worldY, "Aim Ahead!", {
        fontFamily: 'Inter', fontSize: '14px', color: '#ff4d4d'
      }).setOrigin(0.5);
      this.tweens.add({ targets: txt, y: worldY-30, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
      return;
    }

    // Check Balance
    const store = useGameStore.getState();
    const betAmount = store.betAmount;
    if (store.balance < betAmount) {
      this.sound.play('sfx_error');
      return;
    }

    // Deduct
    store.updateBalance(-betAmount);
    this.sound.play('sfx_place', { volume: 0.6 });

    // Calculate Multiplier
    // Logic: Further away (X) and further from center (Y) = Higher Multiplier
    const xDist = worldX - this.headX;
    const yDiff = Math.abs(worldY - this.headY);
    
    // Example: 
    // X=500px away -> +1.0x
    // Y=200px diff -> +1.0x
    let multiplier = 1.0 + (xDist / 500) + (yDiff / 200);
    multiplier = Math.max(1.1, Math.min(50, multiplier)); // Clamp

    // Create Box
    const boxW = 60;
    const boxH = 40;
    const container = this.add.container(worldX, worldY);
    
    // Neon Yellow Box
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0.6);
    rect.setStrokeStyle(2, 0xffd700);
    
    const text = this.add.text(0, 0, `${multiplier.toFixed(2)}x`, {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([rect, text]);
    container.setSize(boxW, boxH);

    // Pop in
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.out'
    });

    this.bettingBoxes.push({
      container,
      rect,
      text,
      betAmount,
      multiplier,
      hit: false,
      boxWidth: boxW,
      boxHeight: boxH
    });
  }

  private checkCollisions() {
    // Collision logic: Line Head vs Box
    // Since X only moves forward, we only check if HeadX >= BoxX - Width/2
    // If HeadX passes BoxX + Width/2, it's a miss.
    
    const headRect = new Phaser.Geom.Circle(this.headX, this.headY, 5);

    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
      const box = this.bettingBoxes[i];
      if (box.hit) continue;

      const boxX = box.container.x;
      const boxY = box.container.y;
      
      // Box Bounds (World)
      const boxBounds = new Phaser.Geom.Rectangle(
        boxX - box.boxWidth/2,
        boxY - box.boxHeight/2,
        box.boxWidth,
        box.boxHeight
      );

      // Check Intersection
      if (Phaser.Geom.Intersects.CircleToRectangle(headRect, boxBounds)) {
        this.handleWin(box, i);
        continue;
      }

      // Check Miss (Passed it)
      // If headX > boxX + width/2 + buffer
      if (this.headX > boxX + box.boxWidth/2 + 20) {
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

    // Hexagon Pulse
    const pulse = this.add.image(box.container.x, box.container.y, 'pulse_ring');
    pulse.setScale(0.5);
    pulse.setTint(0xffd700);
    this.tweens.add({
      targets: pulse,
      scale: 2.5,
      alpha: 0,
      duration: 600,
      onComplete: () => pulse.destroy()
    });

    // Reward
    const winAmount = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(winAmount);
    store.setLastWinAmount(winAmount);

    // Remove Box Visual
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
    // Turn Red and fade
    box.rect.setStrokeStyle(2, 0xff4d4d);
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
}
