/**
 * Particle - Visual effect particle
 */
class Particle {
    constructor(x, y, color, type = 'spark') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1; // Faster particles
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.size = Math.random() * 3 + 1;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.x += this.vx * (dt/16);
        this.y += this.vy * (dt/16);
        
        // Friction
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        this.size *= 0.95; // Shrink
        this.life -= this.decay;
        if (this.life <= 0 || this.size < 0.1) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'lighter'; // Glowy
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }
}
