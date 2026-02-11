/**
 * Projectile - Player's projectile/bullet
 * Depends on: upgrades array, enemies array, particles array, shockwaves array
 * Depends on: getDamage, hitEnemy, createExplosion, createParticles functions
 * Depends on: Particle, Shockwave classes
 * Depends on: canvas height and width
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
        this.elapsed = 0;
        this.hasTargetDied = false;
        this.screenWidth = typeof width !== 'undefined' ? width : 1200;
        
        const bombU = upgrades.find(u => u.id === 'explosive');
        this.blastRadius = bombU.getVal(bombU.count);
        
        // Skin-related properties
        this.colors = null; // Will be set from skin
        this.damageMult = 1; // Damage multiplier from skin
        
        // Piercing properties
        this.piercing = false;
        this.pierceCount = 0;
        this.piercedEnemies = [];
        this.damageDecay = 1;
        
        // Bouncing properties
        this.bouncing = false;
        this.bounceCount = 0;
        this.bouncesLeft = 0;
        this.bounceRange = 200;
        
        // Splitting properties
        this.splitConfig = null;
        this.hasSplit = false;
        this.distanceTraveled = 0;
        this.startX = 40;
        
        // Charged properties
        this.charged = false;
        
        // Spawn slightly offset from core center for realism
        this.y += (Math.random() - 0.5) * 8;
        this.startY = this.y;
        
        // Calculate initial velocity toward target
        this.calculateVelocity();
    }
    
    calculateVelocity() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }
    }

    update(dt, enemies, width) {
        // Accumulate elapsed time for animations
        this.elapsed += dt;
        // Update screen width reference
        if (width) this.screenWidth = width;
        
        // Track distance for splitting projectiles
        this.distanceTraveled = Math.hypot(this.x - this.startX, this.y - this.startY);
        
        // Check for splitting
        if (this.splitConfig && !this.hasSplit && this.distanceTraveled >= this.splitConfig.distance) {
            this.split(enemies);
            return;
        }
        
        // Check if target died - switch to ballistic mode
        if (!this.hasTargetDied && this.target && this.target.markedForDeletion) {
            this.hasTargetDied = true;
        }
        
        // Handle piercing projectiles differently
        if (this.piercing) {
            this.updatePiercing(dt, enemies);
            return;
        }
        
        // Handle bouncing projectiles differently
        if (this.bouncing && this.bouncesLeft > 0) {
            this.updateBouncing(dt, enemies);
            return;
        }
        
        // If we still have a valid target, update velocity to track it
        if (!this.hasTargetDied && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < this.speed * (dt/10)) {
                this.hit(this.target);
                return;
            } else {
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        } else {
            // Ballistic mode - check for collisions with any enemy
            if (enemies && enemies.length > 0) {
                for (let enemy of enemies) {
                    if (enemy.markedForDeletion || enemy.isDying) continue;
                    
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - enemy.size/2 - this.y;
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist < enemy.size + this.size) {
                        this.hit(enemy);
                        return;
                    }
                }
            }
            
            // Remove if off screen
            if (this.x > this.screenWidth + 50 || 
                this.y < -50 || 
                this.y > (typeof height !== 'undefined' ? height : 600) + 50) {
                this.markedForDeletion = true;
                return;
            }
        }
        
        // Move projectile
        this.x += this.vx * (dt/16);
        this.y += this.vy * (dt/16);
        
        // Trail - frame-based throttle (every 3rd frame, deterministic)
        if (typeof ParticleEngine !== 'undefined' && ParticleEngine.getFrameCount() % 3 === 0) {
            const trailColor = this.colors ? this.colors.trail : (this.blastRadius > 0 ? '#ffaa00' : '#00ffff');
            ParticleEngine.emit('trail', this.x, this.y, { color: trailColor, count: 1 });
        }
    }
    
    updatePiercing(dt, enemies) {
        // Move projectile
        this.x += this.vx * (dt/16);
        this.y += this.vy * (dt/16);
        
        // Check collisions with all enemies
        if (enemies && enemies.length > 0) {
            for (let enemy of enemies) {
                if (enemy.markedForDeletion || enemy.isDying) continue;
                if (this.piercedEnemies.includes(enemy)) continue; // Don't hit same enemy twice
                
                const dx = enemy.x - this.x;
                const dy = enemy.y - enemy.size/2 - this.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < enemy.size + this.size) {
                    this.piercedEnemies.push(enemy);
                    // Apply damage with decay
                    const decayFactor = Math.pow(this.damageDecay, this.piercedEnemies.length - 1);
                    this.hitWithMultiplier(enemy, decayFactor);
                    
                    // Check if we've pierced enough enemies
                    if (this.piercedEnemies.length >= this.pierceCount) {
                        this.markedForDeletion = true;
                        return;
                    }
                }
            }
        }
        
        // Trail - frame-based throttle
        if (typeof ParticleEngine !== 'undefined' && ParticleEngine.getFrameCount() % 3 === 0) {
            const trailColor = this.colors ? this.colors.trail : '#9933ff';
            ParticleEngine.emit('trail', this.x, this.y, { color: trailColor, count: 1 });
        }
        
        // Remove if off screen
        if (this.x > this.screenWidth + 50 || 
            this.y < -50 || 
            this.y > (typeof height !== 'undefined' ? height : 600) + 50) {
            this.markedForDeletion = true;
        }
    }
    
    updateBouncing(dt, enemies) {
        // Move projectile
        this.x += this.vx * (dt/16);
        this.y += this.vy * (dt/16);
        
        // Check collision with enemies
        let hitEnemy = null;
        if (enemies && enemies.length > 0) {
            for (let enemy of enemies) {
                if (enemy.markedForDeletion || enemy.isDying) continue;
                
                const dx = enemy.x - this.x;
                const dy = enemy.y - enemy.size/2 - this.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < enemy.size + this.size) {
                    hitEnemy = enemy;
                    break;
                }
            }
        }
        
        if (hitEnemy) {
            // Apply damage
            this.hitWithMultiplier(hitEnemy, this.damageMult);
            
            // Find next target to bounce to
            if (this.bouncesLeft > 0) {
                let nextTarget = null;
                let minDist = Infinity;
                
                enemies.forEach(e => {
                    if (e === hitEnemy || e.markedForDeletion || e.isDying) return;
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (dist < this.bounceRange && dist < minDist) {
                        minDist = dist;
                        nextTarget = e;
                    }
                });
                
                if (nextTarget) {
                    this.bouncesLeft--;
                    this.target = nextTarget;
                    this.calculateVelocity();
                    
                    // Create bounce effect
                    if (typeof createExplosion === 'function') {
                        createExplosion(this.x, this.y, 15, this.colors ? this.colors.glow : '#00ff00');
                    }
                } else {
                    this.markedForDeletion = true;
                }
            } else {
                this.markedForDeletion = true;
            }
            return;
        }
        
        // Trail - frame-based throttle
        if (typeof ParticleEngine !== 'undefined' && ParticleEngine.getFrameCount() % 3 === 0) {
            const trailColor = this.colors ? this.colors.trail : '#00ff00';
            ParticleEngine.emit('trail', this.x, this.y, { color: trailColor, count: 1 });
        }
        
        // Remove if off screen
        if (this.x > this.screenWidth + 50 || 
            this.y < -50 || 
            this.y > (typeof height !== 'undefined' ? height : 600) + 50) {
            this.markedForDeletion = true;
        }
    }
    
    split(enemies) {
        if (!this.splitConfig || this.hasSplit) return;
        
        this.hasSplit = true;
        this.markedForDeletion = true;
        
        // Create split projectiles
        const count = this.splitConfig.count || 3;
        const angleSpread = (this.splitConfig.angle || 30) * (Math.PI / 180);
        const baseAngle = Math.atan2(this.vy, this.vx);
        
        for (let i = 0; i < count; i++) {
            const angleOffset = (i - (count - 1) / 2) * (angleSpread / (count - 1 || 1));
            const newAngle = baseAngle + angleOffset;
            
            // Find nearest enemy as target for split projectile
            let nearest = null;
            let minDist = Infinity;
            if (enemies && enemies.length > 0) {
                enemies.forEach(e => {
                    if (e.markedForDeletion || e.isDying) return;
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = e;
                    }
                });
            }
            
            // Create split projectile
            const proj = new Projectile(nearest || this.target, this.isAuto, this.y * 2, upgrades);
            proj.x = this.x;
            proj.y = this.y;
            proj.speed = this.speed;
            proj.vx = Math.cos(newAngle) * this.speed;
            proj.vy = Math.sin(newAngle) * this.speed;
            proj.damageMult = this.splitConfig.damageMult || 0.5;
            proj.colors = this.colors;
            proj.hasTargetDied = !nearest;
            
            if (typeof projectiles !== 'undefined') {
                projectiles.push(proj);
            }
        }
        
        // Create split effect
        if (typeof createExplosion === 'function') {
            createExplosion(this.x, this.y, 25, this.colors ? this.colors.glow : '#00ff88');
        }
    }
    
    hit(enemy) {
        this.hitWithMultiplier(enemy, this.damageMult);
    }
    
    hitWithMultiplier(enemy, multiplier) {
        if (typeof getDamage === 'function' && typeof hitEnemy === 'function') {
            const resolvedUpgrades = typeof upgrades !== 'undefined' ? upgrades : null;
            const resolvedState = typeof state !== 'undefined' ? state : null;
            const resolvedFloaters = typeof floaters !== 'undefined' ? floaters : [];
            const dmgInfo = getDamage(this.isAuto ? 'auto' : 'click', resolvedUpgrades, resolvedState);
            
            // Apply damage multiplier
            if (multiplier !== 1) {
                dmgInfo.damage = Math.floor(dmgInfo.damage * multiplier);
            }
            
            const killed = hitEnemy(enemy, dmgInfo, resolvedFloaters);
            
            // FIX: Award bits when projectile kills enemy
            if (killed && typeof onEnemyKill === 'function') {
                const leveledUp = onEnemyKill(enemy, resolvedState);
                if (leveledUp && typeof handleLevelUp === 'function') {
                    handleLevelUp();
                }
                // Update UI to show new money
                if (typeof updateMoney === 'function') {
                    updateMoney();
                }
            }
        }
        
        // Only delete if not piercing or bouncing
        if (!this.piercing && this.bouncesLeft <= 0) {
            this.markedForDeletion = true;
        }

        if (this.blastRadius > 0) {
            if (typeof createExplosion === 'function') {
                createExplosion(this.x, this.y, this.blastRadius, '#ffaa00');
            }
            if (typeof Shockwave !== 'undefined' && typeof shockwaves !== 'undefined') {
                shockwaves.push(new Shockwave(this.x, this.y, '#ffaa00'));
            }
            // FIX: Also award bits for AOE kills
            if (typeof enemies !== 'undefined' && typeof hitEnemy === 'function' && typeof getDamage === 'function') {
                const resolvedUpgrades = typeof upgrades !== 'undefined' ? upgrades : null;
                const resolvedState = typeof state !== 'undefined' ? state : null;
                const resolvedFloaters = typeof floaters !== 'undefined' ? floaters : [];
                const dmgInfo = getDamage(this.isAuto ? 'auto' : 'click', resolvedUpgrades, resolvedState);
                enemies.forEach(e => {
                    if (e === enemy || e.markedForDeletion || e.isDying) return;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < this.blastRadius + e.size) {
                        const aoeDmg = { damage: dmgInfo.damage * 0.5, isCrit: false };
                        const killed = hitEnemy(e, aoeDmg, resolvedFloaters);
                        if (killed && typeof onEnemyKill === 'function') {
                            onEnemyKill(e, resolvedState);
                        }
                    }
                });
                // Update UI once after all AOE damage
                if (typeof updateMoney === 'function') {
                    updateMoney();
                }
            }
        }
    }

    draw(ctx) {
        const age = this.elapsed;
        const isExplosive = this.blastRadius > 0 || this.charged;
        
        // Use skin colors if available, otherwise use defaults
        let baseColor, glowColor, trailColor;
        if (this.colors) {
            baseColor = this.colors.projectile;
            glowColor = this.colors.glow;
            trailColor = this.colors.trail;
        } else if (isExplosive) {
            baseColor = '#ffaa00';
            glowColor = '#ffaa00';
            trailColor = '#ffaa00';
        } else {
            baseColor = '#00ffff';
            glowColor = '#00ffff';
            trailColor = '#00ffff';
        }
        
        const isBallistic = this.hasTargetDied;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Enhanced motion trail
        const trailLength = isBallistic ? 15 : 10;
        for (let i = 0; i < trailLength; i++) {
            const alpha = 1 - (i / trailLength);
            const tx = this.x - this.vx * (i * 0.6) * (16 / 22);
            const ty = this.y - this.vy * (i * 0.6) * (16 / 22);
            const tSize = this.size * (1 - i * 0.06);
            
            ctx.fillStyle = trailColor || baseColor;
            ctx.globalAlpha = alpha * (isBallistic ? 0.4 : 0.5);
            ctx.beginPath();
            ctx.arc(tx, ty, tSize, 0, 6.2832);
            ctx.fill();
        }
        
        // Main projectile body
        ctx.globalAlpha = 1;
        
        // Ballistic mode: add warning aura (GlowCache replaces shadowBlur)
        if (isBallistic) {
            const bGlow = GlowCache.get('#ff0044', 25);
            ctx.drawImage(bGlow, this.x - bGlow.width / 2, this.y - bGlow.height / 2);
            
            ctx.fillStyle = '#ff0044';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, 6.2832);
            ctx.fill();
            
            const bGlow2 = GlowCache.get('#ff66aa', 20);
            ctx.drawImage(bGlow2, this.x - bGlow2.width / 2, this.y - bGlow2.height / 2);
            
            ctx.fillStyle = '#ff66aa';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.4, 0, 6.2832);
            ctx.fill();
        }
        
        // Special effects for different projectile types
        if (this.piercing) {
            // Piercing projectile has an elongated shape
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            
            const pGlow = GlowCache.get(glowColor, 20);
            ctx.drawImage(pGlow, -pGlow.width / 2, -pGlow.height / 2);
            
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(this.size * 2, 0);
            ctx.lineTo(-this.size, -this.size);
            ctx.lineTo(-this.size * 0.5, 0);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else if (this.bouncing) {
            // Bouncing projectile has a spiky appearance
            const bnGlow = GlowCache.get(glowColor, 20);
            ctx.drawImage(bnGlow, this.x - bnGlow.width / 2, this.y - bnGlow.height / 2);
            
            ctx.fillStyle = baseColor;
            const spikes = 6;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * 6.2832;
                const r = i % 2 === 0 ? this.size * 1.8 : this.size * 0.8;
                const x = this.x + Math.cos(angle) * r;
                const y = this.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // Standard projectile
            const sGlow = GlowCache.get(glowColor, isBallistic ? 30 : 20);
            ctx.drawImage(sGlow, this.x - sGlow.width / 2, this.y - sGlow.height / 2);
            
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.2, 0, 6.2832);
            ctx.fill();
        }
        
        // Bright white center (GlowCache replaces shadowBlur)
        const wGlow = GlowCache.get('#ffffff', 15);
        ctx.drawImage(wGlow, this.x - wGlow.width / 2, this.y - wGlow.height / 2);
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, 6.2832);
        ctx.fill();
        
        // Explosive/Charged projectile extra ring
        if (isExplosive) {
            const eGlow = GlowCache.get(glowColor, 10);
            ctx.drawImage(eGlow, this.x - eGlow.width / 2, this.y - eGlow.height / 2);
            
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = this.charged ? 3 : 2;
            ctx.beginPath();
            const pulse = this.charged ? Math.sin(age / 40) * 3 : Math.sin(age / 60) * 2;
            ctx.arc(this.x, this.y, this.size * 2.5 + pulse, 0, 6.2832);
            ctx.stroke();
            
            if (this.charged) {
                // Extra outer ring for charged projectiles
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 4 + pulse * 0.5, 0, 6.2832);
                ctx.stroke();
            }
        }
        
        // Piercing projectile energy trail
        if (this.piercing) {
            const ptGlow = GlowCache.get(glowColor, 15);
            ctx.drawImage(ptGlow, this.x - ptGlow.width / 2, this.y - ptGlow.height / 2);
            
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.stroke();
        }
        
        // Bouncing projectile bounce counter indicator
        if (this.bouncing && this.bouncesLeft > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.bouncesLeft.toString(), this.x, this.y - this.size * 2.5);
        }
        
        // Ballistic mode indicator - energy spikes
        if (isBallistic) {
            const bsGlow = GlowCache.get('#ff0044', 10);
            
            ctx.strokeStyle = '#ff0044';
            ctx.lineWidth = 2;
            
            const spikeCount = 4;
            for (let i = 0; i < spikeCount; i++) {
                const angle = (i / spikeCount) * 6.2832 + age / 200;
                const innerR = this.size * 2;
                const outerR = this.size * 3.5;
                
                const midX = this.x + Math.cos(angle) * ((innerR + outerR) / 2);
                const midY = this.y + Math.sin(angle) * ((innerR + outerR) / 2);
                ctx.drawImage(bsGlow, midX - bsGlow.width / 2, midY - bsGlow.height / 2);
                
                ctx.beginPath();
                ctx.moveTo(
                    this.x + Math.cos(angle) * innerR,
                    this.y + Math.sin(angle) * innerR
                );
                ctx.lineTo(
                    this.x + Math.cos(angle) * outerR,
                    this.y + Math.sin(angle) * outerR
                );
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}
