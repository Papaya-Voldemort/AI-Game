/**
 * Enemy - Base enemy class with enhanced animations
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
        
        // Animation properties
        this.bobOffset = Math.random() * 6.2832;
        this.bobSpeed = 0.003 + Math.random() * 0.002;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.trailTimer = 0;
        this.trail = []; // Trail positions for fast enemies
        this.spawnTime = 0;
        this.deathScale = 1;
        this.isDying = false;
        
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
            this.rotationSpeed = 0.005;
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
            this.bobSpeed = 0.005;
            this.rotationSpeed = 0.008;
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
            this.rotationSpeed = 0.015;
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
            this.rotationSpeed = 0.02;
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
            this.rotationSpeed = 0.003;
            this.bobSpeed = 0.001;
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
            this.rotationSpeed = 0.025;
            this.trailMaxLength = 8;
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
            this.rotationSpeed = 0.008;
            this.bobSpeed = 0.002;
            this.trailMaxLength = 12;
        }

        const ecoMult = upgrades.find(u => u.id === 'economy');
        this.bits = Math.max(1, Math.floor(this.bits * ecoMult.getVal(ecoMult.count)));
    }

    update(dt, height) {
        this.spawnTime += dt;
        
        // Spawn Scale In Animation
        if (this.scale < 1 && !this.isDying) {
            // Elastic spawn animation
            const progress = Math.min(1, this.spawnTime / 400);
            this.scale = 1 + Math.sin(progress * Math.PI) * 0.3 * (1 - progress);
            if (progress >= 1) this.scale = 1;
        }
        
        // Death animation
        if (this.isDying) {
            this.deathScale -= dt / 300;
            this.rotation += dt * 0.01;
            if (this.deathScale <= 0) {
                this.markedForDeletion = true;
            }
            return;
        }

        if (this.frozen > 0) this.frozen -= dt;

        // Update rotation
        this.rotation += this.rotationSpeed * dt;

        // Update bobbing
        const bobY = Math.sin(this.spawnTime * this.bobSpeed + this.bobOffset) * 3;

        // Behavior
        if (this.type === 'dasher' && !this.frozen) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.x -= 100; // Bigger Dash
                this.dashTimer = 2000 + Math.random() * 1000;
                // Dash trail effect
                for (let i = 0; i < 5; i++) {
                    this.trail.push({
                        x: this.x + i * 20,
                        y: this.y + bobY,
                        alpha: 1 - i * 0.15,
                        scale: 1 - i * 0.1
                    });
                }
                if (typeof ParticleEngine !== 'undefined') {
                    ParticleEngine.emit('dash', this.x + 50, this.y, { color: '#fff', count: 8 });
                } else if (typeof createParticles === 'function') {
                    createParticles(this.x + 50, this.y, '#fff', 8);
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
            // Sine wave movement (dt-based accumulator replaces Date.now())
            const time = this.spawnTime / 300 + this.timeOffset;
            this.y = this.startY + Math.sin(time) * 60;
            // Keep bounds
            if (this.y < 30) this.y = 30;
            if (this.y > height - 30) this.y = height - 30;
            
            // Add trail for banshee
            this.trailTimer += dt;
            if (this.trailTimer > 50) {
                this.trail.push({
                    x: this.x,
                    y: this.y,
                    alpha: 0.6,
                    scale: 1
                });
                if (this.trail.length > this.trailMaxLength) {
                    this.trail.shift();
                }
                this.trailTimer = 0;
            }
        }

        // Update trail positions and fade
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= dt / 400;
            this.trail[i].x -= this.speed * (dt / 16);
            if (this.trail[i].alpha <= 0) {
                this.trail.splice(i, 1);
            }
        }

        const currentSpeed = this.frozen > 0 ? 0 : this.speed;
        this.x -= currentSpeed * (dt / 16);
        
        // Apply bobbing to y position
        this.displayY = this.y + bobY;
        
        if (this.x < 60) {
            // Enemy reached the core - deal damage and award bits (as sacrifice)
            if (typeof takeDamage === 'function') {
                takeDamage(this.hp);
            }
            
            // Award bits even when enemy sacrifices itself to the core
            if (typeof state !== 'undefined' && typeof onEnemyKill === 'function') {
                // Only award partial bits when enemy reaches core (50% penalty)
                const sacrificeBits = Math.floor(this.bits * 0.5);
                state.money += sacrificeBits;
                if (typeof floaters !== 'undefined' && typeof FloatingText !== 'undefined') {
                    floaters.push(new FloatingText(this.x, this.y - 30, `+${sacrificeBits}`, '#ffaa00', 16));
                }
            }
            
            this.markedForDeletion = true;
            if (typeof createExplosion === 'function') {
                createExplosion(this.x, this.y, 25, '#ff0055'); // Bigger red explosion
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
        
        // OPTIMIZED: Simplified trail rendering for fast enemies
        if (this.trail.length > 0) {
            ctx.save();
            // Only render every other trail point for performance
            for (let i = 0; i < this.trail.length; i += 2) {
                const t = this.trail[i];
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.size * t.scale * 0.4, 0, 6.2832);
                ctx.fill();
            }
            ctx.restore();
        }
        
        // Main transform
        ctx.translate(this.x, this.displayY || this.y);
        
        // Death animation scale
        const currentScale = this.isDying ? this.deathScale : this.scale;
        ctx.scale(currentScale, currentScale);
        ctx.rotate(this.rotation);
        
        // Transparency for Shifters
        ctx.globalAlpha = this.alpha;

        // Hit Flash - simplified (GlowCache replaces shadowBlur)
        let glowR, glowCol;
        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
            glowR = 20;
            glowCol = '#ffffff';
            this.hitFlash--;
        } else {
            ctx.fillStyle = this.color;
            glowR = 12;
            glowCol = this.color;
        }

        // Glow pulse for boss - reduced intensity
        if (this.isBoss) {
            const pulse = 1 + Math.sin(this.spawnTime / 400) * 0.15;
            glowR = Math.round(25 * pulse);
        }
        
        // Draw pre-rendered glow texture behind enemy
        if (typeof GlowCache !== 'undefined') {
            const glow = GlowCache.get(glowCol, glowR);
            ctx.drawImage(glow, -glow.width / 2, -glow.height / 2);
        }
        
        // OPTIMIZED: Simplified enemy shapes for better performance
        ctx.beginPath();
        if (this.isBoss) {
            // Simplified boss shape - hexagon instead of star
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * 6.2832 + this.spawnTime / 1500;
                const r = this.size;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.4, 0, 6.2832);
            ctx.fill();
        } else if (this.type === 'armored') {
            // Simplified armored - just square with border
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.size/2 + 3, -this.size/2 + 3, this.size - 6, this.size - 6);
        } else if (this.type === 'healer') {
            // Simplified cross
            const s = this.size;
            ctx.rect(-s/3, -s, s/1.5, s*2);
            ctx.rect(-s, -s/3, s*2, s/1.5);
            ctx.fill();
        } else if (this.type === 'dasher') {
            // Simplified arrow
            ctx.moveTo(-this.size, -this.size/2);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(-this.size, this.size/2);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'shifter') {
            // Simplified diamond
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(0, this.size);
            ctx.lineTo(-this.size, 0);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'juggernaut') {
            // Heavy block - simplified
            ctx.fillStyle = '#331111';
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/4, -this.size/4, this.size/2, this.size/2);
        } else if (this.type === 'banshee') {
            // Simplified crescent
            ctx.beginPath();
            ctx.arc(0, 0, this.size, -Math.PI/2, Math.PI/2);
            ctx.arc(0, 0, this.size * 0.6, Math.PI/2, -Math.PI/2, true);
            ctx.closePath();
            ctx.fill();
        } else {
            // Basic enemy - simplified square
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.fill();
        }
        
        if (!this.isBoss) {
            ctx.fill();
        }
        
        ctx.restore();
        
        // HP Bar - simplified
        if (this.hp < this.maxHp && !this.isDying) {
            const pct = Math.max(0, this.hp / this.maxHp);
            const w = 32;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(this.x - w/2, (this.displayY || this.y) - this.size - 12, w, 4);
            ctx.fillStyle = pct < 0.3 ? '#ff0000' : '#00ffaa';
            ctx.fillRect(this.x - w/2, (this.displayY || this.y) - this.size - 12, w * pct, 4);
        }
    }
    
    // Start death animation
    startDeathAnimation() {
        this.isDying = true;
        this.deathScale = 1;
        this.rotationSpeed = 0.05;
    }
}
