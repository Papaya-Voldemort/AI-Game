/**
 * Star - Enhanced background parallax star with twinkling
 */
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.z = Math.random() * 3 + 0.5; // Depth for parallax
        this.size = Math.random() * 2 + 0.5;
        this.baseAlpha = Math.random() * 0.6 + 0.2;
        this.alpha = this.baseAlpha;
        this.twinkleSpeed = Math.random() * 0.003 + 0.001;
        this.twinkleOffset = Math.random() * 6.2832;
        this.color = this.getRandomColor();
    }
    
    getRandomColor() {
        const colors = [
            '255, 255, 255', // White
            '200, 220, 255', // Blue-white
            '255, 240, 200', // Yellow-white
            '255, 200, 200', // Reddish
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(dt, width, height) {
        // Parallax movement
        this.x -= (this.z * 0.8) * (dt/16);
        
        // Twinkle effect
        this.twinkleOffset += this.twinkleSpeed * dt;
        this.alpha = this.baseAlpha + Math.sin(this.twinkleOffset) * 0.2;
        this.alpha = Math.max(0.1, Math.min(1, this.alpha));
        
        // Wrap around screen
        if (this.x < -10) {
            this.x = width + 10;
            this.y = Math.random() * height;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Draw star glow for larger stars
        if (this.size > 1.5) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, 6.2832);
            ctx.fill();
        }
        
        // Draw main star
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 6.2832);
        ctx.fill();
        
        // Cross sparkle for bright stars
        if (this.alpha > 0.7 && this.size > 1.2) {
            ctx.strokeStyle = `rgba(${this.color}, ${this.alpha * 0.5})`;
            ctx.lineWidth = 0.5;
            const sparkleSize = this.size * 3;
            ctx.beginPath();
            ctx.moveTo(this.x - sparkleSize, this.y);
            ctx.lineTo(this.x + sparkleSize, this.y);
            ctx.moveTo(this.x, this.y - sparkleSize);
            ctx.lineTo(this.x, this.y + sparkleSize);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

/**
 * Nebula - Background nebula clouds
 */
class Nebula {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.patches = [];
        
        // Create nebula patches
        for (let i = 0; i < 3; i++) {
            this.patches.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: 200 + Math.random() * 300,
                color: this.getRandomNebulaColor(),
                alpha: 0.03 + Math.random() * 0.03,
                drift: (Math.random() - 0.5) * 0.1
            });
        }
    }
    
    getRandomNebulaColor() {
        const colors = [
            '100, 50, 150',   // Purple
            '50, 100, 150',   // Blue
            '150, 50, 100',   // Pink
            '50, 150, 150',   // Cyan
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(dt) {
        this.patches.forEach(patch => {
            patch.x += patch.drift * dt;
            if (patch.x > this.width + patch.radius) {
                patch.x = -patch.radius;
            } else if (patch.x < -patch.radius) {
                patch.x = this.width + patch.radius;
            }
        });
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        this.patches.forEach(patch => {
            const gradient = ctx.createRadialGradient(
                patch.x, patch.y, 0,
                patch.x, patch.y, patch.radius
            );
            gradient.addColorStop(0, `rgba(${patch.color}, ${patch.alpha})`);
            gradient.addColorStop(0.5, `rgba(${patch.color}, ${patch.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(patch.x, patch.y, patch.radius, 0, 6.2832);
            ctx.fill();
        });
        
        ctx.restore();
    }
}
