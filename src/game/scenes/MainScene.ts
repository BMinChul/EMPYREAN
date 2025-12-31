import Phaser from 'phaser';
import { OKXService } from '../../services/okxService';
import { useGameStore } from '../../store/gameStore';

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

  private isConnected: boolean = false;
  private headX: number = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    // Setup Camera
    this.cameras.main.setBackgroundColor('#1a1a1a');
    
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
  }

  update(time: number, delta: number) {
    if (!this.initialPrice) return;

    // Scroll Camera
    // We want the "Head" to be at 80% of the screen width usually, or just scroll as time passes.
    // Let's make "Time" the driver.
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
    
    // Y Axis: Center screen is initialPrice. Up is higher price (smaller Y in Phaser)
    // y = centerY - (price - initialPrice) * scale
    const centerY = this.cameras.main.height / 2;
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
    this.chartGraphics.lineStyle(2, 0xffffff, 1);

    if (this.priceHistory.length < 2) return;

    this.chartGraphics.beginPath();
    
    // Draw all history points
    const first = this.priceHistory[0];
    this.chartGraphics.moveTo(first.worldX, first.worldY);

    for (let i = 1; i < this.priceHistory.length; i++) {
      const p = this.priceHistory[i];
      this.chartGraphics.lineTo(p.worldX, p.worldY);
    }
    
    this.chartGraphics.strokePath();

    // Draw a "Head" dot
    const last = this.priceHistory[this.priceHistory.length - 1];
    this.chartGraphics.fillStyle(0xffffff, 1);
    this.chartGraphics.fillCircle(last.worldX, last.worldY, 4);
  }

  private drawGrid(scrollX: number) {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x333333, 1);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
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

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // Check Balance
    const store = useGameStore.getState();
    if (store.balance < 1) {
      return;
    }

    // Deduct $1
    store.updateBalance(-1);

    // World Coordinates
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    // Can only place bets in the future (to the right of the head)
    if (worldX <= this.headX) {
      return;
    }

    // Calculate Price for this Y
    const centerY = this.cameras.main.height / 2;
    // worldY = centerY - (targetPrice - initial) * scale
    const targetPrice = this.initialPrice + (centerY - worldY) / this.pixelPerDollar;
    
    // Calculate Multiplier
    const priceDiff = Math.abs(targetPrice - this.lastPrice);
    
    // Example Multiplier Logic: 
    // Base 1.5x + 0.1x per $0.1 difference?
    // Let's say per dollar diff.
    let multiplier = 1.5 + (priceDiff * 2); 
    multiplier = Math.round(multiplier * 100) / 100;

    // Create Box Visuals
    const boxSize = 40;
    const container = this.add.container(worldX, worldY);
    
    const rect = this.add.rectangle(0, 0, boxSize, boxSize, 0xffff00, 0.3);
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
    
    // Effect
    const particles = this.add.particles(box.container.x, box.container.y, 'flare', {
      speed: 100,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      duration: 500,
      emitting: false
    });
    
    particles.explode(20);
    
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
    // Optional
  }
}
