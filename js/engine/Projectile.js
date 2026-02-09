/**
 * Projectile - Player's projectile/bullet
 * Depends on: upgrades array, enemies array, particles array, shockwaves array
 * Depends on: getDamage, hitEnemy, createExplosion, createParticles functions
 * Depends on: Particle, Shockwave classes
 * Depends on: canvas height
 */

class Projectile extends Entity {
    constructor(target, isAuto, canvasHeight, upgradesArray) {
        const height = canvasHeight;
        const upgrades = upgradesArray;
        
        super(40, height / 2, '#00ffff');
        this.target = target;
        this.speed = 22; 
        this.size = 5;
        this.isAuto = isAuto;
        
        const bombU = upgrades.find(u => u.id === 'explosive');
        this.blastRadius = bombU.getVal(bombU.count);
        
        // Spawn slightly offset from core center for realism
        this.y += (Math.random() - 0.5) * 8; 
    }

    update(dt) {
        if (this.target.markedForDeletion) {
            this.markedForDeletion = true;
            // Create a small poof if target dies mid-flight
            if (typeof createParticles === 'function') {
                createParticles(this.x, this.y, '#00ffff', 2);
            }
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < this.speed * (dt/10)) {
            this.hit();
        } else {
            this.x += (dx / dist) * this.speed * (dt/16);
            this.y += (dy / dist) * this.speed * (dt/16);
        }
        
        // Trail
        if (typeof Particle !== 'undefined' && typeof particles !== 'undefined') {
            particles.push(new Particle(this.x, this.y, this.blastRadius > 0 ? '#ffaa00' : '#00ffff'));
        }
    }
    
    hit() {
        if (typeof getDamage === 'function' && typeof hitEnemy === 'function') {
            const dmgInfo = getDamage(this.isAuto ? 'auto' : 'click');
            hitEnemy(this.target, dmgInfo);
        }
        this.markedForDeletion = true;

        if (this.blastRadius > 0) {
            if (typeof createExplosion === 'function') {
                createExplosion(this.x, this.y, this.blastRadius, '#ffaa00');
            }
            if (typeof Shockwave !== 'undefined' && typeof shockwaves !== 'undefined') {
                shockwaves.push(new Shockwave(this.x, this.y, '#ffaa00'));
            }
            if (typeof enemies !== 'undefined' && typeof hitEnemy === 'function' && typeof getDamage === 'function') {
                const dmgInfo = getDamage(this.isAuto ? 'auto' : 'click');
                enemies.forEach(e => {
                    if (e === this.target || e.markedForDeletion) return;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < this.blastRadius + e.size) {
                        const aoeDmg = { damage: dmgInfo.damage * 0.5, isCrit: false };
                        hitEnemy(e, aoeDmg);
                    }
                });
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.blastRadius > 0 ? '#ffaa00' : '#00ffff';
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
