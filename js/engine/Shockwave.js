/**
 * Shockwave & Ripple - Optimized with object pooling
 * No Date.now() calls -- uses elapsed time accumulator instead.
 */

// ============================================================================
// SHOCKWAVE POOL
// ============================================================================

const ShockwavePool = (() => {
    const MAX = 32;
    const pool = [];

    // Pre-allocate
    for (let i = 0; i < MAX; i++) {
        pool.push({
            active: false,
            x: 0, y: 0,
            color: '#fff',
            intensity: 1,
            radius: 5,
            maxRadius: 50,
            alpha: 1,
            life: 0.6,
            maxLife: 0.6,
            elapsed: 0,
            rings: 3,
            markedForDeletion: false
        });
    }

    function acquire() {
        for (let i = 0; i < MAX; i++) {
            if (!pool[i].active) return pool[i];
        }
        return null;
    }

    function release(sw) {
        sw.active = false;
        sw.markedForDeletion = true;
    }

    return { pool, acquire, release, MAX };
})();

class Shockwave {
    constructor(x, y, color, intensity) {
        // Try to get from pool
        const slot = ShockwavePool.acquire();
        if (slot) {
            slot.active = true;
            slot.x = x;
            slot.y = y;
            slot.color = color;
            slot.intensity = intensity || 1;
            slot.radius = 5;
            slot.maxRadius = 50 * (intensity || 1);
            slot.alpha = 1;
            slot.life = 0.6 * (intensity || 1);
            slot.maxLife = slot.life;
            slot.elapsed = 0;
            slot.rings = 2 + Math.floor(intensity || 1);
            slot.markedForDeletion = false;
            // Store reference to pool slot
            this._slot = slot;
        } else {
            // Fallback: create inline (rare)
            this._slot = null;
        }
        
        this.x = x;
        this.y = y;
        this.color = color;
        this.intensity = intensity || 1;
        this.radius = 5;
        this.maxRadius = 50 * this.intensity;
        this.alpha = 1;
        this.life = 0.6 * this.intensity;
        this.maxLife = this.life;
        this.elapsed = 0;
        this.rings = 2 + Math.floor(this.intensity);
        this.markedForDeletion = false;
    }

    update(dt) {
        this.elapsed += dt;
        const ageSec = this.elapsed / 1000;
        
        // Expand speed slows down over time
        const expandSpeed = 150 * (1 - ageSec / this.maxLife);
        this.radius += Math.max(20, expandSpeed) * (dt / 1000);
        
        this.life -= dt / 1000;
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        if (this.life <= 0) {
            this.markedForDeletion = true;
            if (this._slot) {
                ShockwavePool.release(this._slot);
            }
        }
    }

    draw(ctx) {
        if (this.alpha <= 0.01) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Draw expanding rings (no shadowBlur)
        for (let i = 0; i < this.rings; i++) {
            const ringOffset = i * 15;
            const ringRadius = this.radius - ringOffset;
            
            if (ringRadius > 0) {
                const ringAlpha = this.alpha * (1 - i * 0.3);
                const ringWidth = 4 - i;
                
                ctx.lineWidth = Math.max(1, ringWidth);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = Math.max(0, ringAlpha);
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius, 0, 6.2832);
                ctx.stroke();
            }
        }
        
        // Inner fill glow via pre-rendered texture (replaces createRadialGradient per frame)
        const glowR = this.radius * 0.5;
        if (glowR > 2) {
            const tex = GlowCache.get(this.color, glowR);
            ctx.globalAlpha = this.alpha * 0.3;
            ctx.drawImage(tex, this.x - glowR, this.y - glowR, glowR * 2, glowR * 2);
        }
        
        ctx.restore();
    }
}

/**
 * Ripple - Smaller, faster shockwave for bullet impacts (optimized)
 */
class Ripple {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 2;
        this.alpha = 0.8;
        this.life = 0.3;
        this.markedForDeletion = false;
    }
    
    update(dt) {
        this.radius += 80 * (dt / 1000);
        this.life -= dt / 1000;
        this.alpha = Math.max(0, this.life / 0.3);
        
        if (this.life <= 0) this.markedForDeletion = true;
    }
    
    draw(ctx) {
        if (this.alpha <= 0.01) return;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = this.alpha;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 6.2832);
        ctx.stroke();
        
        ctx.restore();
    }
}
