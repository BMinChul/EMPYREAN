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
  
  // --- Configuration ---
  private speedX: number = 150; // Horizontal speed (pixels/sec)
  private pixelPerDollar: number = 300; // Vertical sensitivity
  
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
  private pulseRingTexture: string = 'pulse_ring';
  
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
    this.cameras.main.setBackgroundColor('#050510');
    
    // Start vertically centered
    this.startY = this.scale.height / 2;
    this.headY = this.startY;
    this.targetHeadY = this.startY;
    
    // Start at far LEFT (0)
    this.headX = 0;

    // 2. Camera FX (Bloom)
    if (this.cameras.main.postFX) {
        // Color, Intensity, Blur, Strength
        this.cameras.main.postFX.addBloom(0xffffff, 1.0, 1.0, 0.9, 1.2);
    }

    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // 4. Generate Textures
    this.createTextures();

    // 5. Particles
    // Blue/White Engine Trail (Subtle)
    this.headEmitter = this.add.particles(0, 0, 'flare', {
      speed: 20,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xaaccff,
      blendMode: 'ADD',
      lifespan: 200,
      frequency: 40
    });

    // Gold Win Explosion (High Energy)
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

    // 6. Data Service
    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    // 7. Input (Betting)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    // Waiting Text
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add.text(centerX, centerY, 'CONNECTING TO OKX...', { 
      fontFamily: 'Orbitron', fontSize: '24px', color: '#6c5ce7', fontStyle: 'bold'
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

  private cleanup() {
    if (this.okxService) {
      this.okxService.disconnect();
    }
  }

  update(time: number, delta: number) {
    if (!this.sys.isActive()) return;
    if (!this.initialPrice) return;

    const dt = delta / 1000;

    // --- 1. Horizontal Movement (Time) ---
    this.headX += this.speedX * dt;

    // --- 2. Vertical Movement (Price + Volatility) ---
    // Add "Jitter" to simulate market noise/heartbeat
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { // Change jitter target every 100ms
        this.jitterOffset = (Math.random() - 0.5) * 15; // +/- 7.5px jitter
        this.jitterTimer = 0;
    }

    // Smooth Lerp towards (Target + Jitter)
    // Faster lerp (0.15) for high reactivity
    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15);

    // --- 3. Half-Screen Logic ---
    const halfScreen = this.scale.width / 2;
    
    if (this.headX > halfScreen) {
        // Phase 2: Head is pinned at center, world scrolls left
        // Camera ScrollX = HeadX - HalfScreen
        this.cameras.main.scrollX = this.headX - halfScreen;
    } else {
        // Phase 1: Head moves from Left to Center
        this.cameras.main.scrollX = 0;
    }

    // --- 4. History Recording ---
    // Record frequently for smooth cubic bezier curves
    if (time - this.lastPointTime > 30) {
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
      // Memory Management: Remove points far behind camera
      const leftBound = this.cameras.main.scrollX - 200;
      if (this.priceHistory.length > 0 && this.priceHistory[0].worldX < leftBound) {
         this.priceHistory.shift();
      }
    }

    // --- 5. Draw ---
    this.drawGrid();
    this.drawChart();
    
    // --- 6. Updates ---
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

    // Delta calculation
    const delta = price - this.initialPrice;
    // Y goes DOWN as Price goes UP
    this.targetHeadY = this.startY - (delta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    // Only draw what's visible
    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 150; // Draw slightly outside

    // Extract points for Spline
    const points: Phaser.Math.Vector2[] = [];
    
    for (const p of this.priceHistory) {
        // Very basic culling
        if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
            points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
        }
    }
    // Always add current head for connectivity
    points.push(new Phaser.Math.Vector2(this.headX, this.headY));

    if (points.length < 2) return;

    const curve = new Phaser.Curves.Spline(points);

    // 1. Outer Glow (Soft Bloom)
    this.chartGraphics.lineStyle(16, 0xffffff, 0.05);
    curve.draw(this.chartGraphics, 64);
    
    // 2. Inner Glow
    this.chartGraphics.lineStyle(6, 0xffffff, 0.2);
    curve.draw(this.chartGraphics, 64);

    // 3. Core Neon Line
    this.chartGraphics.lineStyle(3, 0xffffff, 1);
    curve.draw(this.chartGraphics, 64);
    
    // 4. Head Diamond
    this.chartGraphics.fillStyle(0xffffff, 1);
    // Draw rotated square (diamond)
    this.chartGraphics.fillPoints([
        { x: this.headX, y: this.headY - 6 },
        { x: this.headX + 6, y: this.headY },
        { x: this.headX, y: this.headY + 6 },
        { x: this.headX - 6, y: this.headY }
    ], true);
  }

  private drawGrid() {
    this.gridGraphics.clear();
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Visual Style: Dark Purple Grid
    this.gridGraphics.lineStyle(1, 0x6c5ce7, 0.15); // Low opacity purple

    const gridSize = 80;

    // Calculate grid offsets based on camera
    const startX = Math.floor(scrollX / gridSize) * gridSize;
    const endX = startX + width + gridSize;
    
    const startY = Math.floor(scrollY / gridSize) * gridSize;
    const endY = startY + height + gridSize;

    // Draw Vertical Lines
    for (let x = startX; x <= endX; x += gridSize) {
      this.gridGraphics.moveTo(x, scrollY);
      this.gridGraphics.lineTo(x, scrollY + height);
    }

    // Draw Horizontal Lines
    for (let y = startY; y <= endY; y += gridSize) {
      this.gridGraphics.moveTo(scrollX, y);
      this.gridGraphics.lineTo(scrollX + width, y);
    }
    
    this.gridGraphics.strokePath();
    
    // Central Divider (The "Present" Line)
    // It's always at screenWidth / 2 relative to camera
    // So WorldX = scrollX + screenWidth/2
    const centerX = scrollX + (this.scale.width / 2);
    
    this.gridGraphics.lineStyle(2, 0xffffff, 0.1);
    this.gridGraphics.beginPath();
    this.gridGraphics.moveTo(centerX, scrollY);
    this.gridGraphics.lineTo(centerX, scrollY + height);
    this.gridGraphics.strokePath();
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Rule: Must click on RIGHT SIDE of screen (The "Future")
    const halfScreen = this.scale.width / 2;
    if (pointer.x < halfScreen) {
        // Ignore clicks on the history side
        return;
    }

    // Get World Coordinates
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Balance Check
    const store = useGameStore.getState();
    const betAmount = store.betAmount;
    if (store.balance < betAmount) {
        this.sound.play('sfx_error');
        return;
    }

    // Deduct Balance
    store.updateBalance(-betAmount);
    this.sound.play('sfx_place', { volume: 0.5 });

    // Calculate Multiplier
    // Based on distance from HEAD (Risk) and distance from CENTER Y (Volatility Risk)
    const distX = worldX - this.headX;
    const distY = Math.abs(worldY - this.headY);
    
    // Base 1.1x + X_Risk + Y_Risk
    let multiplier = 1.1 + (distX / 600) + (distY / 250);
    multiplier = Math.max(1.1, Math.min(100.0, multiplier)); // Clamp

    // Create Visual Box
    const boxW = 80;
    const boxH = 40;
    
    const container = this.add.container(worldX, worldY);
    
    // Neon Yellow styling
    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0.7);
    rect.setStrokeStyle(2, 0xffd700);
    
    const text = this.add.text(0, 0, `${multiplier.toFixed(2)}x`, {
        fontFamily: 'Orbitron', fontSize: '14px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([rect, text]);
    container.setSize(boxW, boxH);
    
    // Animation: Pop in
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 400,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, text,
        betAmount, multiplier, hit: false,
        boxWidth: boxW, boxHeight: boxH
    });
  }

  private checkCollisions() {
    // Only check collision if head has reached/passed the box
    // Head Radius
    const headRadius = 8;
    const headCircle = new Phaser.Geom.Circle(this.headX, this.headY, headRadius);

    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // 1. Check Intersection
        const boxRect = new Phaser.Geom.Rectangle(boxX - box.boxWidth/2, boxY - box.boxHeight/2, box.boxWidth, box.boxHeight);
        
        if (Phaser.Geom.Intersects.CircleToRectangle(headCircle, boxRect)) {
            this.handleWin(box, i);
            continue;
        }

        // 2. Check "Miss" (Passed completely)
        // If HeadX > BoxX + BoxWidth/2 + Buffer
        if (this.headX > boxX + box.boxWidth/2 + 20) {
            this.handleLoss(box, i);
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win', { volume: 0.8 });

    // 1. Gold Explosion
    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(40);

    // 2. Pulse Ring
    const ring = this.add.image(box.container.x, box.container.y, 'pulse_ring');
    ring.setTint(0xffd700);
    ring.setScale(0.5);
    this.tweens.add({
        targets: ring,
        scale: 2.0,
        alpha: 0,
        duration: 600,
        onComplete: () => ring.destroy()
    });

    // 3. Update State
    const winAmount = box.betAmount * box.multiplier;
    const store = useGameStore.getState();
    store.updateBalance(winAmount);
    store.setLastWinAmount(winAmount);

    // 4. Remove Box
    this.tweens.add({
        targets: box.container,
        scale: 1.5,
        alpha: 0,
        duration: 150,
        onComplete: () => box.container.destroy()
    });

    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Visual Feedback: Turn Red, Fall down
    box.rect.setStrokeStyle(2, 0xff4d4d);
    box.text.setColor('#ff4d4d');

    this.tweens.add({
        targets: box.container,
        y: box.container.y + 50,
        alpha: 0,
        duration: 400,
        onComplete: () => box.container.destroy()
    });

    this.bettingBoxes.splice(index, 1);
  }
}
