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
  rect: Phaser.GameObjects.Rectangle; // Hitbox
  bg: Phaser.GameObjects.Graphics; // Visual Background
  glow: Phaser.GameObjects.Image; // Proximity Glow
  textAmount: Phaser.GameObjects.Text;
  textMulti: Phaser.GameObjects.Text;
  betAmount: number;
  multiplier: number;
  hit: boolean;
  boxWidth: number;
  boxHeight: number;
  basePrice: number; // To recalculate multiplier dynamically if needed (though bets usually lock multiplier)
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
  // The screen width represents exactly 100 seconds (10 cols * 10 sec)
  private timeWindowSeconds: number = 100; 
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
    // REMOVED Global Camera Bloom to prevent washing out the UI/Boxes
    // We will apply bloom only to specific "Neon" elements (Chart, Grid)
    
    // 3. Graphics Layers
    this.gridGraphics = this.add.graphics();
    this.chartGraphics = this.add.graphics();

    // Apply Bloom specifically to the neon elements
    if (this.chartGraphics.postFX) {
        this.chartGraphics.postFX.addBloom(0xffffff, 1.0, 1.0, 1.2, 1.2);
    }
    if (this.gridGraphics.postFX) {
        // Subtle bloom for grid
        this.gridGraphics.postFX.addBloom(0xffffff, 0.5, 0.5, 1.0, 1.0);
    }
    
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

    // Box Glow Rect Texture (Soft Spread Effect)
    // 10 layers of decreasing opacity to create a "Spread" effect
    graphics.clear();
    for (let i = 0; i < 10; i++) {
        const alpha = 0.2 - (i * 0.015); // Stronger alpha (starts at 0.2)
        graphics.fillStyle(0xfffacd, alpha); // Light yellow spread
        const size = 64 + (i * 10); // Increasing size
        const offset = (160 - size) / 2; // Center in 160x160 texture
        graphics.fillRoundedRect(offset, offset, size, size, 20);
    }
    graphics.generateTexture('box_glow_rect', 160, 160);
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
    this.headX += this.pixelsPerSecond * dt;

    // Y moves with price + jitter
    this.jitterTimer += dt;
    if (this.jitterTimer > 0.1) { 
        this.jitterOffset = (Math.random() - 0.5) * 10; 
        this.jitterTimer = 0;
    }

    const finalTargetY = this.targetHeadY + this.jitterOffset;
    this.headY = Phaser.Math.Linear(this.headY, finalTargetY, 0.15);

    // --- 2. Camera Sync ---
    const viewportW = this.scale.width;
    const viewportH = this.scale.height;
    
    const targetScrollX = this.headX - (viewportW * 0.25);
    const targetScrollY = this.headY - (viewportH * 0.5);

    this.cameras.main.scrollX = targetScrollX;
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.2);

    // --- 3. History ---
    if (time - this.lastPointTime > 50) { 
      this.priceHistory.push({ worldX: this.headX, worldY: this.headY });
      this.lastPointTime = time;
      
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

    const priceDelta = price - this.initialPrice;
    this.targetHeadY = -(priceDelta * this.pixelPerDollar);
  }

  private drawChart() {
    this.chartGraphics.clear();
    
    if (this.priceHistory.length < 2) return;

    const scrollX = this.cameras.main.scrollX;
    const width = this.scale.width;
    const buffer = 200;
    
    // Collect points first to avoid duplicate culling logic
    const points: {x: number, y: number}[] = [];
    
    for (const p of this.priceHistory) {
        if (p.worldX < scrollX - buffer) continue;
        if (p.worldX > scrollX + width + buffer) break;
        points.push({ x: p.worldX, y: p.worldY });
    }
    // Add current head
    points.push({ x: this.headX, y: this.headY });

    if (points.length < 2) return;

    // Helper to draw path
    const drawPath = () => {
        this.chartGraphics.beginPath();
        this.chartGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.chartGraphics.lineTo(points[i].x, points[i].y);
        }
        this.chartGraphics.strokePath();
    };

    // Layer 1: Bottom - Thick Dark Purple (Stroke/Outline effect)
    this.chartGraphics.lineStyle(10, 0x4B0082, 1); // Dark Indigo/Purple
    drawPath();

    // Layer 2: Top - Bright Light Purple
    this.chartGraphics.lineStyle(5, 0xE0B0FF, 1); 
    drawPath();
  }

  // --- Dynamic Multiplier Calculation ---
  // Verified Logic: M(x, t) = (1 / P(x, t)) * (1 - House Edge)
  // Confirmed by "Math Double Check":
  // 1. Center (x=0): t increases -> P decreases (spreads out) -> Multiplier (1/P) increases.
  // 2. Edge (x>>0): t increases -> P increases (reaches edge) -> Multiplier (1/P) decreases.
  private calculateDynamicMultiplier(targetPrice: number, colIndex: number): number {
      // 1. Time (t): Represents volatility accumulation over columns.
      // Columns 5-9 represent t=1 to t=5.
      const t = Math.max(1.0, (colIndex - 5) + 1.0);

      // 2. Distance (x): Price deviation from current price.
      const x = Math.abs(targetPrice - this.currentPrice);

      // 3. Constants
      // sigma: Volatility parameter (Standard Deviation per unit time)
      const sigma = 0.7;     
      const houseEdge = 0.05; // 5% House Advantage
      const calibrationScale = 0.08; // Adjusts unitless PDF density to game odds range

      // 4. Calculate Probability P(x, t) using Normal Distribution PDF
      // Formula: P(x,t) = (1 / (σ * √(2πt))) * exp( -x² / (2σ²t) )
      const pdfTerm1 = 1 / (sigma * Math.sqrt(2 * Math.PI * t));
      const pdfTerm2 = Math.exp(-(x * x) / (2 * sigma * sigma * t));
      
      // The Probability Density at this point
      const probability = pdfTerm1 * pdfTerm2;

      // 5. Calculate Multiplier (Inverse Probability with House Edge)
      // M = (1 / P) * (1 - HouseEdge)
      // Added calibrationScale to map mathematical density to realistic gambling odds (2x-10x)
      const rawInverse = 1 / Math.max(probability, 0.0001); // Prevent division by zero
      const multiplier = rawInverse * calibrationScale * (1 - houseEdge);

      // 6. Constraints for Game Balance
      // Clamp between 1.05x and 99.99x
      return parseFloat(Math.max(1.05, Math.min(99.99, multiplier)).toFixed(2));
  }

  // --- Helper: Calculate Text Fade (Visibility) ---
  // Returns alpha 0.0 to 1.0 based on screen position (0.0 to 1.0)
  // Used for both visual rendering and betting restrictions
  private getTextFade(normalizedScreenX: number): number {
      // Betting Zone starts at 50% (0.5)
      // Fade transition: 0.5 (0%) -> 0.6 (80%) -> 0.625 (100%)
      // Smoother gradient: (x - 0.5) * 6
      // 0.50 -> 0.0
      // 0.55 -> 0.3
      // 0.57 -> 0.42 (Threshold for betting)
      // 0.66 -> 1.0
      
      if (normalizedScreenX < 0.5) return 0;
      return Phaser.Math.Clamp((normalizedScreenX - 0.5) * 6, 0, 1);
  }

  private drawGridAndAxis() {
    this.gridGraphics.clear();
    
    // Reset label usage indices (Object Pooling strategy)
    let axisLabelIdx = 0;
    let gridLabelIdx = 0;
    
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;
    const width = this.scale.width;
    const height = this.scale.height;

    const colWidth = width / 10;
    
    const gridStartTime = Math.floor(scrollX / colWidth) * colWidth;
    const gridEndTime = scrollX + width;

    const minVisibleY = scrollY;
    const maxVisibleY = scrollY + height;
    
    const highPrice = this.initialPrice! - (minVisibleY / this.pixelPerDollar);
    const lowPrice = this.initialPrice! - (maxVisibleY / this.pixelPerDollar);
    
    const startPrice = Math.floor(lowPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const endPrice = Math.ceil(highPrice / this.gridPriceInterval) * this.gridPriceInterval;
    
    // Draw Horizontal Lines & Axis
    this.gridGraphics.lineStyle(1, 0xaa00ff, 0.15);
    
    for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
        const y = -(p - this.initialPrice!) * this.pixelPerDollar;
        const centerX = scrollX + (width * 0.5);
        
        this.gridGraphics.moveTo(centerX, y);
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
        label.setText(p.toFixed(1));
        label.setVisible(true);
        axisLabelIdx++;
    }

    // Draw Vertical Lines & Multipliers
    const startColIdx = Math.floor(gridStartTime / colWidth);
    const endColIdx = Math.ceil(gridEndTime / colWidth);
    const now = new Date();

    for (let c = startColIdx; c <= endColIdx; c++) {
        const x = c * colWidth;
        const screenX = x - scrollX;
        const normalizedScreenX = screenX / width;
        const colIndexOnScreen = Math.floor(normalizedScreenX * 10); // 0-9

        // Gradient Fade-in Logic using Helper
        const textFade = this.getTextFade(normalizedScreenX);
        const alpha = 0.15 + (textFade * 0.3); // Base 0.15, max 0.45

        this.gridGraphics.lineStyle(1, 0xaa00ff, alpha);
        this.gridGraphics.moveTo(x, scrollY);
        this.gridGraphics.lineTo(x, scrollY + height);

        // Time Labels
        const distFromHead = x - this.headX;
        const secondsDiff = distFromHead / this.pixelsPerSecond;
        const gridTime = new Date(now.getTime() + (secondsDiff * 1000));
        
        const timeString = gridTime.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York', hour12: false,
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        let timeLabel = this.gridLabels[gridLabelIdx];
        if (!timeLabel) {
            timeLabel = this.add.text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '10px', color: '#888888'
            }).setOrigin(0.5, 1);
            this.gridLabels.push(timeLabel);
        }
        timeLabel.setPosition(x, scrollY + height - 5);
        timeLabel.setText(timeString);
        timeLabel.setVisible(true);
        gridLabelIdx++;

        // Multipliers (Only in Betting Zone)
        // DYNAMIC UPDATE: Recalculate based on current price
        if (textFade > 0.01) {
            const cellCenterX = x + colWidth/2;
            
            for (let p = startPrice; p <= endPrice; p += this.gridPriceInterval) {
                const y = -(p - this.initialPrice!) * this.pixelPerDollar;
                const cellCenterY = y - (this.gridPriceInterval * this.pixelPerDollar) / 2;
                
                // --- CORRECTED LOGIC ---
                // Sync Rule: Use 'const cellCenterPrice = p + (this.gridPriceInterval / 2)'
                // This ensures the multiplier shown matches the bet logic perfectly
                const cellCenterPrice = p + (this.gridPriceInterval / 2);
                const dynamicMulti = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);
                
                let gl = this.gridLabels[gridLabelIdx];
                if (!gl) {
                    gl = this.add.text(0, 0, '', {
                        fontFamily: 'Orbitron', fontSize: '12px', color: '#ffccff'
                    }).setOrigin(0.5);
                    this.gridLabels.push(gl);
                }
                
                gl.setPosition(cellCenterX, cellCenterY);
                gl.setText(dynamicMulti.toFixed(2) + 'x');
                
                // Color Code based on Multiplier value?
                // For now keep uniform color but fade
                gl.setAlpha(textFade); 
                gl.setVisible(true);
                gridLabelIdx++;
            }
        }
    }
    
    this.gridGraphics.strokePath();

    // Hide unused labels
    for (let i = axisLabelIdx; i < this.axisLabels.length; i++) this.axisLabels[i].setVisible(false);
    for (let i = gridLabelIdx; i < this.gridLabels.length; i++) this.gridLabels[i].setVisible(false);

    this.drawCurrentPriceBox(scrollY, height, width);
  }

  private drawCurrentPriceBox(scrollY: number, height: number, width: number) {
     const boxY = Phaser.Math.Clamp(this.headY, scrollY + 40, scrollY + height - 40);
     const boxX = this.cameras.main.scrollX + width; 

     // Background: Light Purple (#9F88FF), 70% opacity
     this.gridGraphics.fillStyle(0x9F88FF, 0.7); 
     // Border: Matching grid/chart accent
     this.gridGraphics.lineStyle(2, 0xE0B0FF, 1); 
     
     // Tighter Size: 80x45
     const boxW = 80;
     const boxH = 45;
     
     // Draw Box
     this.gridGraphics.fillRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     this.gridGraphics.strokeRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     
     let priceLabel = this.children.getByName('currentPriceLabel') as Phaser.GameObjects.Text;
     if (!priceLabel) {
         priceLabel = this.add.text(0, 0, '', {
             fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
         }).setOrigin(0.5, 0.5).setName('currentPriceLabel').setDepth(20);
     }
     
     priceLabel.setPosition(boxX - boxW / 2, boxY);
     priceLabel.setText(this.currentPrice.toFixed(2));
  }

  private placeBet(pointer: Phaser.Input.Pointer) {
    if (!this.initialPrice) return;

    // 1. Restriction Check based on Visibility (Text Fade)
    const screenX = pointer.x;
    const width = this.scale.width;
    const normalizedClickX = screenX / width;

    // Get Visibility Factor at this column
    const visibility = this.getTextFade(normalizedClickX);
    
    // STRICT CONDITION: If text is less than 40% visible (0.4), Disallow Bet
    if (visibility < 0.4) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    const store = useGameStore.getState();
    if (store.balance < store.betAmount) {
        this.sound.play('sfx_error');
        return;
    }

    // 2. Snap to Grid
    const colWidth = width / 10;
    const colIdx = Math.floor(pointer.worldX / colWidth);
    const cellX = (colIdx * colWidth) + (colWidth/2);
    const colIndexOnScreen = Math.floor(normalizedClickX * 10);

    const priceY = -(pointer.worldY / this.pixelPerDollar); 
    const rawPrice = this.initialPrice! + priceY;
    
    const snappedBottomPrice = Math.floor(rawPrice / this.gridPriceInterval) * this.gridPriceInterval;
    const cellCenterPrice = snappedBottomPrice + (this.gridPriceInterval / 2);
    
    const cellY = -(cellCenterPrice - this.initialPrice!) * this.pixelPerDollar;

    // Prevent duplicate betting in the same spot
    const existingBet = this.bettingBoxes.find(b => 
      Math.abs(b.container.x - cellX) < 5 && 
      Math.abs(b.container.y - cellY) < 5
    );
    if (existingBet) {
        this.sound.play('sfx_error', { volume: 0.2 });
        return;
    }

    // 3. Get Multiplier (Lock it in at time of bet)
    const multi = this.calculateDynamicMultiplier(cellCenterPrice, colIndexOnScreen);

    // 4. Create Box
    store.updateBalance(-store.betAmount);
    this.sound.play('sfx_place', { volume: 0.5 });

    const container = this.add.container(cellX, cellY);
    
    const boxW = colWidth - 8; 
    const boxH = (this.gridPriceInterval * this.pixelPerDollar) - 8;
    
    // Box Graphics: Pale Yellow Solid (#fffacd) - NO INTERNAL GLOW
    const bg = this.add.graphics();
    bg.fillStyle(0xfffacd, 1); // Solid Pale Yellow
    // White Stroke with 70% opacity (0.7)
    bg.lineStyle(2, 0xffffff, 0.7); 
    bg.fillRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8); // Rounded Corners
    bg.strokeRoundedRect(-boxW/2, -boxH/2, boxW, boxH, 8); // Stroke
    
    // External Spread Glow (Initially Invisible)
    // Uses 'box_glow_rect' texture created in createTextures
    const glow = this.add.image(0, 0, 'box_glow_rect');
    glow.setTint(0xfffacd); // Pale Yellow Glow
    glow.setAlpha(0); // Invisible by default
    
    // Scale glow significantly smaller for subtle "just behind" effect
    const glowScaleX = (boxW + 80) / 160;
    const glowScaleY = (boxH + 80) / 160;
    glow.setScale(glowScaleX, glowScaleY);

    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0); 
    
    // Text: Added '$' prefix
    const txtAmt = this.add.text(0, -8, `$${store.betAmount}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const txtMulti = this.add.text(0, 8, `${multi.toFixed(2)}X`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([glow, bg, rect, txtAmt, txtMulti]); // Add glow first (bottom layer)
    
    container.setScale(0);
    this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200,
        ease: 'Back.out'
    });

    this.bettingBoxes.push({
        container, rect, bg, glow: glow, 
        textAmount: txtAmt, textMulti: txtMulti,
        betAmount: store.betAmount, multiplier: multi,
        hit: false, boxWidth: boxW, boxHeight: boxH, basePrice: cellCenterPrice
    });
  }

  private checkCollisions() {
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // --- Proximity Logic (Spread Glow) ---
        // Only glow when head is near
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 180; // Reduced to 100px
        
        if (dist < proximityRange) {
             // Calculate intensity: 0 (at 100px) to 1 (at 0px)
             const intensity = 1 - (dist / proximityRange);
             
             // Linear fade in for brighter/earlier visibility (removed square)
             const targetAlpha = intensity * 1.0;
             
             // Smoothly interpolate current alpha to target
             // Note: Since this runs every update, simple lerp is fine
             // box.glow is a Game Object, we can set alpha directly
             box.glow.setAlpha(targetAlpha);
        } else {
             box.glow.setAlpha(0);
        }

        // --- Collision Logic ---
        const halfW = box.boxWidth / 2;
        const halfH = box.boxHeight / 2;
        
        // 1. Win Condition: Head enters box area
        if (this.headX >= (boxX - halfW) && this.headX <= (boxX + halfW)) {
            if (Math.abs(this.headY - boxY) <= halfH) {
                this.handleWin(box, i);
                continue; 
            }
        }

        // 2. Loss Condition: Head passes Right Edge completely
        if (this.headX > (boxX + halfW)) {
             this.handleLoss(box, i);
        }
    }
  }

  private handleWin(box: BettingBox, index: number) {
    box.hit = true;
    this.sound.play('sfx_win');

    const winVal = box.betAmount * box.multiplier;
    const winText = this.add.text(box.container.x, box.container.y - (box.boxHeight/2) - 20, `+$${winVal.toFixed(2)}`, {
        fontFamily: 'Orbitron', fontSize: '20px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5).setStroke('#000000', 4);

    this.tweens.add({
        targets: winText,
        y: winText.y - 60,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => winText.destroy()
    });

    // Pulse effect
    const pulse = this.add.sprite(box.container.x, box.container.y, 'flare');
    pulse.setScale(2);
    pulse.setTint(0xffd700);
    this.tweens.add({
        targets: pulse, scale: 8.0, alpha: 0, duration: 400,
        onComplete: () => pulse.destroy()
    });

    this.goldEmitter.setPosition(box.container.x, box.container.y);
    this.goldEmitter.explode(30);
    
    const store = useGameStore.getState();
    store.updateBalance(winVal);
    store.setLastWinAmount(winVal);

    this.tweens.add({
        targets: box.container, scale: 1.2, alpha: 0, duration: 300,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }

  private handleLoss(box: BettingBox, index: number) {
    box.bg.clear();
    box.bg.fillStyle(0x555555, 1);
    box.bg.fillRoundedRect(-box.boxWidth/2, -box.boxHeight/2, box.boxWidth, box.boxHeight, 8);
    
    this.tweens.add({
        targets: box.container,
        y: box.container.y + 50,
        alpha: 0,
        duration: 500,
        onComplete: () => box.container.destroy()
    });
    this.bettingBoxes.splice(index, 1);
  }
}
