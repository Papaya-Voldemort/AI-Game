/**
 * Collectible - Rare currency drops that appear in-game
 * Includes collection animation and visual effects
 */

class Collectible extends Entity {
    constructor(x, y, type = 'prism') {
        super(x, y, '#ffdd00');
        this.type = type;
        this.size = 12;
        this.elapsed = 0; // dt-based accumulator replaces Date.now()
        this.lifespan = 15000; // 15 seconds before disappearing
        this.collected = false;
        this.collectionProgress = 0;
        
        // Movement
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        
        // Visual properties
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.pulsePhase = Math.random() * 6.2832;
        
        // Type-specific properties
        switch(type) {
            case 'prism': // Very rare currency
                this.color = '#ffdd00';
                this.glowColor = '#ffaa00';
                this.value = 1;
                this.rarity = 'legendary';
                break;
            case 'shard': // Rare currency
                this.color = '#aa66ff';
                this.glowColor = '#8844ff';
                this.value = 1;
                this.rarity = 'epic';
                break;
            default:
                this.color = '#ffdd00';
                this.glowColor = '#ffaa00';
                this.value = 1;
                this.rarity = 'legendary';
        }
    }

    update(dt, coreX, coreY) {
        this.elapsed += dt;
        
        // Check if expired
        if (this.elapsed > this.lifespan && !this.collected) {
            this.markedForDeletion = true;
            return;
        }

        if (this.collected) {
            // Move toward core with acceleration
            this.collectionProgress += dt * 0.003;
            
            const dx = coreX - this.x;
            const dy = coreY - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 30 || this.collectionProgress > 1) {
                this.markedForDeletion = true;
                return true; // Signal that it was collected
            }
            
            // Accelerate toward core
            const speed = 5 + this.collectionProgress * 15;
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
            
            this.x += this.vx * (dt / 16);
            this.y += this.vy * (dt / 16);
            
            // Spin faster when collected
            this.rotation += this.rotationSpeed * 3;
        } else {
            // Float around slowly
            this.x += this.vx * (dt / 16);
            this.y += this.vy * (dt / 16);
            
            // Gentle rotation
            this.rotation += this.rotationSpeed;
            
            // Bounce off screen edges
            if (this.x < 50 || this.x > width - 50) this.vx *= -1;
            if (this.y < 50 || this.y > height - 50) this.vy *= -1;
            
            // Check collision with core for auto-collection
            const distToCore = Math.hypot(this.x - coreX, this.y - coreY);
            if (distToCore < 80) {
                this.collect();
            }
        }
        
        return false;
    }

    collect() {
        if (!this.collected) {
            this.collected = true;
            return true;
        }
        return false;
    }

    draw(ctx) {
        const time = this.elapsed / 1000;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Pulsing effect
        const pulse = Math.sin(time * 3 + this.pulsePhase) * 0.2 + 1;
        const scale = this.collected ? (1 - this.collectionProgress * 0.5) : pulse;
        ctx.scale(scale, scale);
        
        // Outer glow (GlowCache replaces shadowBlur)
        const glowIntensity = this.collected ? (1 - this.collectionProgress) : 1;
        if (typeof GlowCache !== 'undefined') {
            const glow = GlowCache.get(this.glowColor, Math.round(20 * glowIntensity));
            ctx.drawImage(glow, -glow.width / 2, -glow.height / 2);
        }
        
        // Draw based on type
        if (this.type === 'prism') {
            this.drawPrism(ctx, glowIntensity);
        } else if (this.type === 'shard') {
            this.drawShard(ctx, glowIntensity);
        }
        
        ctx.restore();
    }

    drawPrism(ctx, glowIntensity) {
        // Outer rotating ring
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 * glowIntensity;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * 6.2832 + this.elapsed / 500;
            const r = this.size * 1.5;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Main diamond shape
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.9 * glowIntensity;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 0.7, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        
        // Inner highlight
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8 * glowIntensity;
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.5);
        ctx.lineTo(this.size * 0.3, 0);
        ctx.lineTo(0, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, 0);
        ctx.closePath();
        ctx.fill();
        
        // Sparkle effect
        if (!this.collected) {
            const sparkleTime = this.elapsed / 200;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * 6.2832 + sparkleTime;
                const dist = this.size * 2 + Math.sin(sparkleTime * 2 + i) * 3;
                const sx = Math.cos(angle) * dist;
                const sy = Math.sin(angle) * dist;
                
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = (0.5 + Math.sin(sparkleTime * 3 + i) * 0.5) * glowIntensity;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, 6.2832);
                ctx.fill();
            }
        }
    }

    drawShard(ctx, glowIntensity) {
        // Crystal shard shape
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8 * glowIntensity;
        
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 0.5, -this.size * 0.3);
        ctx.lineTo(this.size * 0.3, this.size);
        ctx.lineTo(-this.size * 0.3, this.size);
        ctx.lineTo(-this.size * 0.5, -this.size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Inner glow
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.4 * glowIntensity;
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.7);
        ctx.lineTo(this.size * 0.25, -this.size * 0.2);
        ctx.lineTo(0, this.size * 0.5);
        ctx.lineTo(-this.size * 0.25, -this.size * 0.2);
        ctx.closePath();
        ctx.fill();
        
        // Rotating energy ring
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5 * glowIntensity;
        ctx.beginPath();
        const ringTime = this.elapsed / 300;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * 6.2832 + ringTime;
            const r = this.size * 1.8;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
}

/**
 * Create collection animation effect
 */
function createCollectionAnimation(x, y, type, container) {
    // Create floating text
    if (typeof floaters !== 'undefined' && typeof FloatingText !== 'undefined') {
        const label = type === 'prism' ? '✦ PRISM' : '◆ SHARD';
        const color = type === 'prism' ? '#ffdd00' : '#aa66ff';
        floaters.push(new FloatingText(x, y - 30, label, color, 20));
    }
    
    // Create particle burst
    if (typeof createExplosion === 'function') {
        const color = type === 'prism' ? '#ffdd00' : '#aa66ff';
        createExplosion(x, y, 40, color);
    }
    
    // Create shockwave
    if (typeof Shockwave !== 'undefined' && typeof shockwaves !== 'undefined') {
        const color = type === 'prism' ? '#ffaa00' : '#8844ff';
        shockwaves.push(new Shockwave(x, y, color));
    }
}

/**
 * Update all collectibles
 */
function updateCollectibles(dt, collectibles, coreX, coreY, state) {
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const coll = collectibles[i];
        const wasCollected = coll.update(dt, coreX, coreY);
        
        if (wasCollected) {
            // Add to player's rare currency
            if (coll.type === 'prism') {
                state.prisms = (state.prisms || 0) + coll.value;
            } else if (coll.type === 'shard') {
                state.shards = (state.shards || 0) + coll.value;
            }
            
            // Create collection effect
            createCollectionAnimation(coll.x, coll.y, coll.type);
            
            // Update UI
            if (typeof updateRareCurrencyUI === 'function') {
                updateRareCurrencyUI();
            }
        }
        
        if (coll.markedForDeletion) {
            collectibles.splice(i, 1);
        }
    }
}

/**
 * Draw all collectibles
 */
function drawCollectibles(ctx, collectibles) {
    collectibles.forEach(coll => coll.draw(ctx));
}

/**
 * Spawn a collectible at location with rarity based chance
 */
function spawnCollectible(x, y, forceType = null) {
    if (!forceType) {
        // Random chance: 2% for prism, 5% for shard
        const roll = Math.random();
        if (roll < 0.02) {
            forceType = 'prism';
        } else if (roll < 0.07) {
            forceType = 'shard';
        } else {
            return null; // No drop
        }
    }
    
    return new Collectible(x, y, forceType);
}

/**
 * Get drop chance text for UI
 */
function getCollectibleDropInfo() {
    return {
        prism: { chance: 2, color: '#ffdd00', name: 'Prism' },
        shard: { chance: 5, color: '#aa66ff', name: 'Shard' }
    };
}
