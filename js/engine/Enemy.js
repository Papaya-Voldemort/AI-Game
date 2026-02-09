/**
 * Enemy - Base enemy class
 * Depends on: state, upgrades, enemies arrays (from gameState)
 * Depends on: createParticles, createExplosion, takeDamage functions
 * Depends on: FloatingText, Shockwave classes
 * Depends on: canvas dimensions (width, height, spawnDistance)
 */

class Entity {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.markedForDeletion = false;
    }
}

class Enemy extends Entity {
    constructor(lvl, canvasHeight, spawnDist, upgradesArray, enemiesArray) {
        const height = canvasHeight;
        const spawnDistance = spawnDist;
        const upgrades = upgradesArray;
        const enemies = enemiesArray;
        
        super(spawnDistance + 40 + Math.random()*50, Math.random() * (height - 80) + 40, '');
        
        // Smoother scaling for late game (1.15 down from 1.18)
        const hpScale = Math.pow(1.15, lvl - 1); 
        this.maxHp = Math.floor(10 * hpScale);
        this.hp = this.maxHp;
        
        this.baseSpeed = Math.random() * 0.4 + 0.6 + (lvl * 0.015);
        this.speed = this.baseSpeed;
        this.size = 22;
        this.scale = 0; // Spawn animation
        this.hitFlash = 0; // Flash frame
        this.frozen = 0;
        
        // --- Enemy Types ---
        const rand = Math.random();
        this.type = 'basic';
        this.color = '#ff0055'; // Pink/Red
        this.bits = Math.floor(lvl * 1.5);
        this.armor = 0;
        this.alpha = 1; // Opacity for phantoms

        // Armored (Orange)
        if (rand < 0.15 && lvl >= 4) {
            this.type = 'armored';
            this.maxHp *= 2.5;
            this.hp = this.maxHp;
            this.speed *= 0.7;
            this.size = 28;
            this.color = '#ffaa00';
            this.bits *= 2;
            this.armor = lvl * 0.5;
        } 
        // Healer (Green)
        else if (rand < 0.25 && rand > 0.15 && lvl >= 7) {
            this.type = 'healer';
            this.maxHp *= 1.2;
            this.hp = this.maxHp;
            this.speed *= 0.9;
            this.color = '#00ffaa';
            this.size = 24;
            this.healTimer = 0;
            this.bits *= 3;
        }
        // Dasher (White)
        else if (rand < 0.35 && rand > 0.25 && lvl >= 10) {
            this.type = 'dasher';
            this.maxHp *= 0.6;
            this.hp = this.maxHp;
            this.speed *= 1.2;
            this.color = '#ffffff';
            this.size = 18;
            this.dashTimer = Math.random() * 2000;
            this.bits *= 2;
        }
        // Phase Shifter (Purple/Transparent) - Wave 45+
        else if (rand < 0.45 && rand > 0.35 && lvl >= 45) {
            this.type = 'shifter';
            this.maxHp *= 0.8;
            this.hp = this.maxHp;
            this.speed *= 1.4;
            this.color = '#aa00ff';
            this.size = 20;
            this.phaseTimer = 0;
            this.bits *= 4;
        }
        // Juggernaut (Big Dark Red) - Wave 75+
        else if (rand < 0.55 && rand > 0.45 && lvl >= 75) {
            this.type = 'juggernaut';
            this.maxHp *= 6.0;
            this.hp = this.maxHp;
            this.speed *= 0.4;
            this.color = '#550000';
            this.size = 40;
            this.armor = lvl * 1.0; // High armor
            this.bits *= 8;
        }
        // Banshee (Cyan Sine Wave) - Wave 100+
        else if (rand < 0.65 && rand > 0.55 && lvl >= 100) {
            this.type = 'banshee';
            this.maxHp *= 1.0;
            this.hp = this.maxHp;
            this.speed *= 1.8;
            this.color = '#00ffff';
            this.size = 18;
            this.startY = this.y;
            this.timeOffset = Math.random() * 100;
            this.bits *= 5;
        }

        // Boss Logic
        if (lvl % 10 === 0 && !enemies.some(e => e.isBoss)) {
            this.isBoss = true;
            this.maxHp *= 15;
            this.hp = this.maxHp;
            this.size = 70;
            this.speed = 0.25;
            this.color = '#aa00ff'; // Purple
            this.bits *= 50;
            this.type = 'boss';
        }

        const ecoMult = upgrades.find(u => u.id === 'economy');
        this.bits = Math.max(1, Math.floor(this.bits * ecoMult.getVal(ecoMult.count)));
    }

    update(dt, height) {
        // Spawn Scale In
        if (this.scale < 1) this.scale = Math.min(1, this.scale + dt/300);

        if (this.frozen > 0) this.frozen -= dt;

        // Behavior
        if (this.type === 'dasher' && !this.frozen) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.x -= 100; // Bigger Dash
                this.dashTimer = 2000 + Math.random() * 1000;
                if (typeof createParticles === 'function') {
                    createParticles(this.x + 50, this.y, '#fff', 5);
                }
            }
        }
        else if (this.type === 'healer') {
            this.healTimer = (this.healTimer || 0) + dt;
            if (this.healTimer > 1500) {
                this.healNearby();
                this.healTimer = 0;
            }
        }
        else if (this.type === 'shifter') {
            this.phaseTimer = (this.phaseTimer || 0) + dt;
            // Oscillate opacity
            this.alpha = 0.3 + 0.7 * Math.abs(Math.sin(this.phaseTimer / 500));
        }
        else if (this.type === 'banshee' && !this.frozen) {
            // Sine wave movement
            const time = Date.now() / 300 + this.timeOffset;
            this.y = this.startY + Math.sin(time) * 60;
            // Keep bounds
            if (this.y < 30) this.y = 30;
            if (this.y > height - 30) this.y = height - 30;
        }

        const currentSpeed = this.frozen > 0 ? 0 : this.speed;
        this.x -= currentSpeed * (dt / 16);
        
        if (this.x < 60) {
            if (typeof takeDamage === 'function') {
                takeDamage(this.hp);
            }
            this.markedForDeletion = true;
            if (typeof createExplosion === 'function') {
                createExplosion(this.x, this.y, 20, this.color);
            }
        }
    }

    healNearby() {
        // Visual Heal Pulse
        if (typeof Shockwave !== 'undefined' && typeof shockwaves !== 'undefined') {
            shockwaves.push(new Shockwave(this.x, this.y, '#00ffaa'));
        }
        
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e !== this && !e.markedForDeletion) {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < 180) {
                        e.hp = Math.min(e.maxHp, e.hp + (this.maxHp * 0.1));
                        if (typeof FloatingText !== 'undefined' && typeof floaters !== 'undefined') {
                            floaters.push(new FloatingText(e.x, e.y - 15, '+', '#00ffaa'));
                        }
                    }
                }
            });
        }
    }

    draw(ctx) {
        ctx.save();
        // Scale Animation
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Transparency for Shifters
        ctx.globalAlpha = this.alpha;

        // Hit Flash
        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
            this.hitFlash--;
        } else {
            ctx.fillStyle = this.color;
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        if (this.isBoss) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = i % 2 === 0 ? this.size : this.size * 0.6;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else if (this.type === 'armored') {
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.size/2 + 4, -this.size/2 + 4, this.size - 8, this.size - 8);
        } else if (this.type === 'healer') {
            const s = this.size;
            ctx.rect(-s/3, -s, s/1.5, s*2);
            ctx.rect(-s, -s/3, s*2, s/1.5);
        } else if (this.type === 'dasher') {
            ctx.moveTo(-this.size, -this.size/2);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(-this.size, this.size/2);
        } else if (this.type === 'shifter') {
            // Diamond shape
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(0, this.size);
            ctx.lineTo(-this.size, 0);
        } else if (this.type === 'juggernaut') {
            // Octagonish/Blocky
            const s = this.size;
            ctx.rect(-s/2, -s/2, s, s);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.strokeRect(-s/2, -s/2, s, s);
        } else if (this.type === 'banshee') {
            // Wave shape or crescent
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        } else {
            // Pulse Effect for basic enemies
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.05;
            ctx.scale(pulse, pulse);
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.translate(-this.x, -this.y); // Reset transform for static HP bar
            const pct = Math.max(0, this.hp / this.maxHp);
            const w = 36;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(this.x - w/2, this.y - this.size - 15, w, 5);
            ctx.fillStyle = pct < 0.3 ? '#ff0000' : '#00ffaa';
            ctx.fillRect(this.x - w/2, this.y - this.size - 15, w * pct, 5);
        }
        
        ctx.restore();
    }
}
