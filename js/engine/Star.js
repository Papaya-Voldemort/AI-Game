/**
 * Star - Background parallax star
 */
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.z = Math.random() * 3 + 0.5; // Depth for parallax
        this.size = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.3;
    }

    update(dt) {
        this.x -= (this.z * 0.5) * (dt/16); // Parallax speed
        if (this.x < 0) this.reset();
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}
