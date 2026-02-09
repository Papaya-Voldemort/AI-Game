/**
 * FloatingText - Damage numbers and text effects
 */
class FloatingText {
    constructor(x, y, text, color, size = 18) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0;
        this.vy = -3; // Initial pop up speed
        this.scale = 0;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.y += this.vy * (dt/16);
        this.vy *= 0.95; // Gravityish friction
        
        if (this.scale < 1) this.scale += 0.2; // Pop in
        
        this.life -= 0.02 * (dt/16);
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = Math.max(0, this.life);
        
        ctx.fillStyle = this.color;
        ctx.font = `900 ${this.size}px 'Arial', sans-serif`;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.text, 0, 0);
        
        // Stroke for readability
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, 0, 0);
        
        ctx.restore();
    }
}
