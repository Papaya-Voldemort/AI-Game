/**
 * FloatingText - Enhanced damage numbers and text effects
 */
class FloatingText {
    constructor(x, y, text, color, size = 18) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.baseSize = size;
        this.life = 1.0;
        this.vy = -4; // Initial pop up speed
        this.vx = (Math.random() - 0.5) * 2; // Slight horizontal drift
        this.scale = 0;
        this.maxScale = 1.2; // Overshoot for bounce
        this.elapsed = 0; // dt-based accumulator replaces Date.now()
        this.markedForDeletion = false;
        this.wobble = Math.random() * 6.2832;
        this.isCrit = text === 'CRIT!' || size > 20;
    }

    update(dt) {
        this.elapsed += dt;
        
        // Position update
        this.y += this.vy * (dt/16);
        this.x += this.vx * (dt/16);
        this.vy *= 0.96; // Air resistance
        this.vx *= 0.98;
        
        // Wobble effect
        this.wobble += dt * 0.01;
        this.x += Math.sin(this.wobble) * 0.5;
        
        // Pop in animation with overshoot
        if (this.scale < this.maxScale) {
            this.scale += 0.15 * (dt/16);
            if (this.scale > 1) {
                // Bounce back
                this.scale = 1 + (this.scale - 1) * 0.8;
            }
        }
        
        // Size pulse for crits
        if (this.isCrit) {
            this.size = this.baseSize + Math.sin(this.elapsed * 0.02) * 3;
        }
        
        // Fade out
        this.life -= 0.015 * (dt/16);
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = Math.max(0, this.life);
        
        // Glow effect for crits (GlowCache replaces shadowBlur)
        if (this.isCrit && typeof GlowCache !== 'undefined') {
            const glow = GlowCache.get(this.color, 15);
            ctx.drawImage(glow, -glow.width / 2, -glow.height / 2);
        }
        
        ctx.fillStyle = this.color;
        ctx.font = `900 ${this.size}px 'Space Grotesk', 'Arial', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text with offset for depth
        ctx.fillText(this.text, 0, 0);
        
        // Stroke for readability
        if (!this.isCrit) {
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 2;
            ctx.strokeText(this.text, 0, 0);
        }
        
        // Crit additional effects
        if (this.isCrit) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, this.life * 0.5);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.text, 0, 0);
        }
        
        ctx.restore();
    }
}

/**
 * Floating Icon - For powerup pickups and special events
 */
class FloatingIcon {
    constructor(x, y, icon, color) {
        this.x = x;
        this.y = y;
        this.icon = icon;
        this.color = color;
        this.life = 1.0;
        this.vy = -2;
        this.scale = 0;
        this.rotation = 0;
        this.markedForDeletion = false;
    }
    
    update(dt) {
        this.y += this.vy * (dt/16);
        this.vy *= 0.97;
        
        if (this.scale < 1) {
            this.scale += 0.1 * (dt/16);
        }
        
        this.rotation += 0.05 * (dt/16);
        this.life -= 0.01 * (dt/16);
        
        if (this.life <= 0) this.markedForDeletion = true;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = Math.max(0, this.life);
        
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, 0, 0);
        
        ctx.restore();
    }
}
