/**
 * Shockwave - Visual effect for explosions
 */
class Shockwave {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.maxRadius = 50;
        this.alpha = 1;
        this.life = 0.5; // seconds
        this.markedForDeletion = false;
    }

    update(dt) {
        this.radius += 100 * (dt/1000); // Expand speed
        this.life -= dt/1000;
        this.alpha = Math.max(0, this.life / 0.5);
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
    }
}
