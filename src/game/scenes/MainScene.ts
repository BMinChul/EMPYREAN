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
        const alpha = 0.08 - (i * 0.005);
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

    this.chartGraphics.beginPath();

    let started = false;
    
    // Draw history
    for (const p of this.priceHistory) {
        if (p.worldX < scrollX - buffer) continue;
        if (p.worldX > scrollX + width + buffer) break;

        if (!started) {
            this.chartGraphics.moveTo(p.worldX, p.worldY);
            started = true;
        } else {
            this.chartGraphics.lineTo(p.worldX, p.worldY);
        }
    }
    
    // Draw to current head
    if (started) {
        this.chartGraphics.lineTo(this.headX, this.headY);
    } else {
        this.chartGraphics.moveTo(this.headX, this.headY);
    }
    
    // Core - THICKER (40px) Light Purple
    this.chartGraphics.lineStyle(40, 0xE0B0FF, 1); 
    this.chartGraphics.strokePath();
  }

  // --- Dynamic Multiplier Calculation ---
  // Based on Gemini Analysis: 
  // Center: Time ↑ -> Multiplier ↑ (Hard to stay still)
  // Edge: Time ↑ -> Multiplier ↓ (Easier to reach over time)
  private calculateDynamicMultiplier(rowPrice: number, colIndex: number): number {
      const distance = Math.abs(rowPrice - this.currentPrice);
      
      // Standardize distance relative to typical volatility
      // $10 diff is considered "Far"
      const distFactor = Math.min(distance / 10.0, 1.0); 

      // Time Factor (0 to 5) for right side columns
      // colIndex passed here is relative to screen (0-9), we care about betting zone (5-9)
      const timeSteps = Math.max(0, colIndex - 5); 

      // Base Multiplier based on Difficulty (Distance)
      // Close: ~2.0x, Far: ~8.0x
      let baseMult = 2.0 + (distFactor * 6.0); 

      // Apply Time/Volatility Logic
      if (distFactor < 0.2) {
          // CENTER ZONE: Increase over time
          // "Probability of staying perfectly still decreases over time"
          baseMult = baseMult * (1 + (timeSteps * 0.15));
      } else if (distFactor > 0.6) {
          // EDGE ZONE: Decrease over time
          // "Probability of reaching far edge increases with more time"
          baseMult = baseMult * (1 - (timeSteps * 0.08));
      } else {
          // MIDDLE ZONE: Slight increase or stable
          baseMult = baseMult * (1 + (timeSteps * 0.05));
      }

      // Clamp values
      return parseFloat(Math.max(1.05, Math.min(99.99, baseMult)).toFixed(2));
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
                
                // --- NEW DYNAMIC LOGIC ---
                // Calculate based on row price and column index
                const rowPrice = p;
                const dynamicMulti = this.calculateDynamicMultiplier(rowPrice, colIndexOnScreen);
                
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

     // Background: Darker, matching grid theme, slightly transparent
     this.gridGraphics.fillStyle(0x1a0b2e, 0.9); 
     // Border: Matching grid/chart accent
     this.gridGraphics.lineStyle(2, 0xE0B0FF, 1); 
     
     // Larger Size: 120x45
     const boxW = 120;
     const boxH = 45;
     
     // Draw Box
     this.gridGraphics.fillRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     this.gridGraphics.strokeRoundedRect(boxX - boxW, boxY - boxH/2, boxW, boxH, 8);
     
     let priceLabel = this.children.getByName('currentPriceLabel') as Phaser.GameObjects.Text;
     if (!priceLabel) {
         priceLabel = this.add.text(0, 0, '', {
             fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
         }).setOrigin(1, 0.5).setName('currentPriceLabel').setDepth(20);
     }
     
     priceLabel.setPosition(boxX - 10, boxY);
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
    
    // Scale glow slightly larger than box
    const glowScaleX = (boxW + 80) / 160;
    const glowScaleY = (boxH + 80) / 160;
    glow.setScale(glowScaleX, glowScaleY);

    const rect = this.add.rectangle(0, 0, boxW, boxH, 0x000000, 0); 
    
    // Text: Added '

  private checkCollisions() {
    for (let i = this.bettingBoxes.length - 1; i >= 0; i--) {
        const box = this.bettingBoxes[i];
        if (box.hit) continue;

        const boxX = box.container.x;
        const boxY = box.container.y;
        
        // --- Proximity Logic (Spread Glow) ---
        // Only glow when head is near
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 250; 
        
        if (dist < proximityRange) {
             // Calculate intensity: 0 (at 250px) to 1 (at 0px)
             const intensity = 1 - (dist / proximityRange);
             
             // Smooth fade in using square ease for natural light falloff
             const targetAlpha = intensity * intensity * 0.8; // Max alpha 0.8
             
             // Smoothly interpolate current alpha to target
             // Note: Since this runs every update, simple lerp is fine
             // box.glow is a Game Object, we can set alpha directly
             box.glow.setAlpha(targetAlpha);
        } else {
             box.glow.setAlpha(0);
        }

        // --- Collision Logic ---
        const boxLeftEdge = boxX - (box.boxWidth / 2);

        if (this.headX >= boxLeftEdge) {
             const diffY = Math.abs(this.headY - boxY);
             if (diffY < (box.boxHeight/2)) {
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
 prefix
    const txtAmt = this.add.text(0, -8, `${store.betAmount}`, {
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
        const dist = Phaser.Math.Distance.Between(this.headX, this.headY, boxX, boxY);
        const proximityRange = 250; // Distance to start glowing
        
        if (dist < proximityRange) {
             // Calculate intensity based on distance (0 to 1)
             // Closer = Stronger Glow
             const intensity = Phaser.Math.Clamp(1 - (dist / proximityRange), 0, 1);
             
             // Non-linear ease for better visual (Square it)
             const alpha = intensity * intensity;
             
             box.glow.setAlpha(alpha);
        } else {
             box.glow.setAlpha(0);
        }

        // --- Collision Logic ---
        const boxLeftEdge = boxX - (box.boxWidth / 2);

        if (this.headX >= boxLeftEdge) {
             const diffY = Math.abs(this.headY - boxY);
             if (diffY < (box.boxHeight/2)) {
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
