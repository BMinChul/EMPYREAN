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
  basePrice: number; // Price level this box represents
  targetX: number; // World X position
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
  private pixelPerSecond: number = 100;
  private pixelPerDollar: number = 50; // High sensitivity for demo (1px = $0.02)
  private initialPrice: number | null = null;
  private lastPrice: number = 0;

  private headX: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Load Audio
    this.load.audio('sfx_win', Assets.audio.sfx.win.url);
    this.load.audio('sfx_place', Assets.audio.sfx.place_bet.url);
    this.load.audio('sfx_error', Assets.audio.sfx.error.url);
  }

  create() {
    // Setup Camera
    this.cameras.main.setBackgroundColor('#0f0518'); // Dark Purple/Black background
    
    // Post FX: Bloom
    // Note: Bloom requires Phaser 3.60+. If unavailable, it might need a custom shader or fallback.
    // Assuming 3.60+ based on package.json ^3.90.0
    if (this.cameras.main.postFX) {
        const bloom = this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.2, 1.5);
    }

    // Graphics
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // Data Service
    this.okxService = new OKXService((price) => this.handleNewPrice(price));
    this.okxService.connect();

    // Create textures
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('flare', 8, 8);

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.placeBet(pointer);
    });

    // Initial Grid
    this.drawGrid(0);
    
    // Status Text
    this.add.text(10, 10, 'Waiting for Price Data...', { 
      fontSize: '20px', 
      color: '#ffffff' 
    }).setScrollFactor(0).setName('statusText');

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

    // Scroll Camera
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;
    
    // Head moves right constantly
    this.headX = elapsedTime * this.pixelPerSecond;

    // Camera follows head, keeping it at 70% of screen
    this.cameras.main.scrollX = this.headX - this.cameras.main.width * 0.7;

    // Draw Grid (Infinite scrolling grid)
    this.drawGrid(this.cameras.main.scrollX);

    // Draw Chart
    this.drawChart();

    // Check Collisions
    this.checkCollisions();

    // Cleanup old boxes
    this.cleanupOffscreen();
  }

  private handleNewPrice(price: number) {
    // Safety checks for destroyed scene or invalid state
    if (!this.sys || !this.sys.isActive()) return;
    
    // Use scale manager as safer fallback for dimensions
    const height = this.scale ? this.scale.height : (this.cameras.main ? this.cameras.main.height : 600);
    
    // Extra safety: if we somehow don't have a valid height, skip
    if (!height) return;

    const now = Date.now();
    
    if (this.initialPrice === null) {
      this.initialPrice = price;
      this.startTime = now;
      this.children.getByName('statusText')?.destroy();
      useGameStore.getState().setCurrentPrice(price);
    }

    this.lastPrice = price;
    useGameStore.getState().setCurrentPrice(price);

    // Calculate World Coordinates
    const elapsedTime = (now - this.startTime) / 1000;
    const worldX = elapsedTime * this.pixelPerSecond;
    
    // Y Axis: Center screen is initialPrice
    const centerY = height / 2;
    const worldY = centerY - (price - this.initialPrice!) * this.pixelPerDollar;

    this.priceHistory.push({
      time: now,
      price: price,
      worldX: worldX,
      worldY: worldY
    });

    // Prune old history to save memory (keep last 1000 points)
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }
  }

  private drawChart() {
    this.chartGraphics.clear();
    // Glowing white line
    this.chartGraphics.lineStyle(3, 0xffffff, 1);

    if (this.priceHistory.length < 2) return;

    // Use Spline for smooth liquid look
    // Create points array for Spline
    const points: Phaser.Math.Vector2[] = [];
    
    // Optimization: Only draw points visible on screen + padding
    const scrollX = this.cameras.main.scrollX;
    const width = this.cameras.main.width;
    const buffer = 100;

    for (const p of this.priceHistory) {
      // Simple culling
      if (p.worldX > scrollX - buffer && p.worldX < scrollX + width + buffer) {
        points.push(new Phaser.Math.Vector2(p.worldX, p.worldY));
      }
    }
    
    if (points.length < 2) return;

    // Append the "head" current position interpolated if needed, 
    // but for now priceHistory updates fast enough. 
    // Actually, to make it super smooth "liquid", we might want to interpolate the very tip.
    // For now, CatmullRom with existing points is good.

    const curve = new Phaser.Curves.Spline(points);
    
    this.chartGraphics.beginPath();
    curve.draw(this.chartGraphics, 64); // 64 points per segment for smoothness
    this.chartGraphics.strokePath();

    // Draw a "Head" dot
    const last = points[points.length - 1];
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(last.x, last.y, 6);
    
    // Add a glow sprite at the head if desired, but PostFX bloom handles global glow
  }

  private drawGrid(scrollX: number) {
    this.gridGraphics.clear();
    // Cyberpunk Purple Grid
    this.gridGraphics.lineStyle(1, 0x440066, 0.5); // Dark Purple, 50% opacity

    const width = this.scale.width;
    const height = this.scale ? this.scale.height : 600;
    const gridSize = 100;

    // Calculate visible range
    const startX = Math.floor(scrollX / gridSize) * gridSize;
    const endX = startX + width + gridSize;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, height + this.cameras.main.scrollY);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.gridGraphics.moveTo(scrollX, y);
      this.gridGraphics.lineTo(scrollX + width, y);
    }
    
    this.gridGraphics.strokePath();
  }

  private showToast(message: string, color: string = '#ff0000') {
    const toast = this.add.text(this.scale.width / 2, this.scale.height - 100, message, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: color,
      padding: { x: 10, y: 5 }
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(100);

    this.tweens.add({
      targets: toast,
      y: toast.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  private showFloatingText(x: number, y: number, message: string, color: string = '#ffff00') {
    const text = this.add.text(x, y, message, {
      fontSize: '20px',
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
      ease: 'Back.out',
      onComplete: () => text.destroy()
    });
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // 1. Validation: Cannot place bet in the past
    // Allow a small buffer (e.g., 50px) to prevent accidental clicks right on the head failing
    if (worldX <= this.headX) {
      this.sound.play('sfx_error', { volume: 0.5 });
      this.showToast("Too late! Line already passed.", '#ff0000');
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

    // Calculate Price for this Y
    const height = this.scale ? this.scale.height : 600;
    const centerY = height / 2;
    const targetPrice = this.initialPrice + (centerY - worldY) / this.pixelPerDollar;
    
    // Calculate Multiplier
    const priceDiff = Math.abs(targetPrice - this.lastPrice);
    
    // Example Multiplier Logic: 
    let multiplier = 1.5 + (priceDiff * 2); 
    multiplier = Math.round(multiplier * 100) / 100;

    // Create Box Visuals
    const boxSize = 40;
    const container = this.add.container(worldX, worldY);
    
    const rect = this.add.rectangle(0, 0, boxSize, boxSize, 0xffff00, 0.2);
    rect.setStrokeStyle(2, 0xffff00);
    
    const text = this.add.text(0, 0, `x${multiplier}`, { 
      fontSize: '12px', 
      color: '#ffffff' 
    }).setOrigin(0.5);

    container.add([rect, text]);

    this.bettingBoxes.push({
      container,
      rect,
      text,
      basePrice: targetPrice,
      targetX: worldX,
      multiplier,
      hit: false
    });
    
    // Animate creation
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

    // We only care about the latest segment of the line
    const p1 = this.priceHistory[this.priceHistory.length - 2];
    const p2 = this.priceHistory[this.priceHistory.length - 1];

    const boxSize = 40;

    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
      const box = this.bettingBoxes[i];
      if (box.hit) continue;

      // Check for HIT
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

      // Check for MISS (Passed)
      if (box.container.x + boxSize/2 < this.headX) {
        this.handleLoss(box, i);
      }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    
    // Play sound
    this.sound.play('sfx_win', { volume: 0.8 });

    // Effect
    const particles = this.add.particles(box.container.x, box.container.y, 'flare', {
      speed: 150,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 600,
      emitting: false
    });
    
    particles.explode(30);
    
    this.tweens.add({
      targets: box.container,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        box.container.destroy();
      }
    });

    // Reward
    const store = useGameStore.getState();
    const reward = 1 * box.multiplier;
    store.updateBalance(reward);
    
    // Floating Text
    this.showFloatingText(box.container.x, box.container.y - 40, `+$${reward.toFixed(2)}`, '#00ff00');

    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    // Fade out
    this.tweens.add({
      targets: box.container,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        box.container.destroy();
      }
    });
    
    this.bettingBoxes.splice(index, 1);
  }

  private cleanupOffscreen() {
    // Optional: Remove boxes that are far off screen (left)
    // Already handled by handleLoss mostly, but can add extra safety here if needed
  }
}
