/**
 * SKIN SYSTEM - Manages skin selection, application, and unique attack mechanics
 * Depends on: SKINS array from skins.js
 */

class SkinSystem {
    constructor() {
        this.currentSkinId = 'default';
        // Clone skins array to allow modifications (unlocked status)
        this.skins = SKINS.map(skin => ({...skin}));
        this.equippedSkin = this.skins.find(s => s.id === 'default');
        this.orbitals = []; // For orbit attack type
        this.lastSatelliteFire = 0;
        this._orbitalTime = 0; // dt-based accumulator (ms)
    }

    /**
     * Get all available skins
     */
    getAllSkins() {
        return this.skins;
    }

    /**
     * Get currently equipped skin
     */
    getCurrentSkin() {
        return this.equippedSkin;
    }

    /**
     * Get skin by ID
     */
    getSkinById(id) {
        return this.skins.find(s => s.id === id);
    }

    /**
     * Equip a skin
     */
    equipSkin(skinId) {
        const skin = this.getSkinById(skinId);
        if (skin && skin.unlocked) {
            this.currentSkinId = skinId;
            this.equippedSkin = skin;
            return true;
        }
        return false;
    }

    /**
     * Unlock a skin
     */
    unlockSkin(skinId) {
        const skin = this.getSkinById(skinId);
        if (skin) {
            skin.unlocked = true;
            return true;
        }
        return false;
    }

    /**
     * Get colors for current skin
     */
    getCurrentColors() {
        return this.equippedSkin ? this.equippedSkin.colors : SKINS[0].colors;
    }

    /**
     * Create projectiles based on skin's attack type
     * Returns array of projectile configs
     */
    createProjectiles(target, isAuto, canvasHeight, upgrades) {
        const skin = this.equippedSkin;
        const configs = [];

        switch (skin.attackType) {
            case 'twin':
                // Create two parallel projectiles
                const spread = skin.attackConfig.spread;
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    yOffset: -spread,
                    damageMult: skin.attackConfig.damageMult,
                    colors: skin.colors
                });
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    yOffset: spread,
                    damageMult: skin.attackConfig.damageMult,
                    colors: skin.colors
                });
                break;

            case 'piercing':
                // Single piercing projectile
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    piercing: true,
                    pierceCount: skin.attackConfig.pierceCount,
                    damageDecay: skin.attackConfig.damageDecay,
                    speed: skin.attackConfig.speed,
                    colors: skin.colors
                });
                break;

            case 'rapid':
                // Standard projectile but with modified damage/fire rate handled elsewhere
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    damageMult: skin.attackConfig.damageMult,
                    colors: skin.colors
                });
                break;

            case 'split':
                // Projectile that will split after traveling certain distance
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    splitConfig: {
                        distance: skin.attackConfig.splitDistance,
                        count: skin.attackConfig.splitCount,
                        angle: skin.attackConfig.splitAngle,
                        damageMult: skin.attackConfig.damageMult
                    },
                    colors: skin.colors
                });
                break;

            case 'charged':
                // Large charged projectile
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    charged: true,
                    blastRadius: skin.attackConfig.blastRadius,
                    damageMult: skin.attackConfig.damageMult,
                    sizeMult: skin.attackConfig.sizeMult,
                    speed: skin.attackConfig.speed,
                    colors: skin.colors
                });
                break;

            case 'bounce':
                // Bouncing projectile
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    bouncing: true,
                    bounceCount: skin.attackConfig.bounceCount,
                    bounceRange: skin.attackConfig.bounceRange,
                    damageMult: skin.attackConfig.damageMult,
                    speed: skin.attackConfig.speed,
                    colors: skin.colors
                });
                break;

            case 'orbit':
                // For orbit type, satellites handle their own firing
                // Return empty, main projectile is standard
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    damageMult: skin.attackConfig.damageMult,
                    colors: skin.colors
                });
                break;

            case 'standard':
            default:
                // Standard single projectile
                configs.push({
                    target,
                    isAuto,
                    canvasHeight,
                    upgrades,
                    colors: skin.colors
                });
                break;
        }

        return configs;
    }

    /**
     * Get fire rate multiplier for current skin
     */
    getFireRateMultiplier() {
        if (this.equippedSkin.attackType === 'rapid') {
            return this.equippedSkin.attackConfig.fireRateMult;
        }
        return 1;
    }

    /**
     * Update orbital satellites (for orbit attack type)
     */
    updateOrbitals(dt, enemies, projectiles, coreX, coreY) {
        if (this.equippedSkin.attackType !== 'orbit') return;

        const config = this.equippedSkin.attackConfig;
        this._orbitalTime += dt;

        // Initialize orbitals if needed
        while (this.orbitals.length < config.satelliteCount) {
            this.orbitals.push({
                angle: (this.orbitals.length / config.satelliteCount) * 6.2832,
                lastFire: 0
            });
        }

        // Update orbital positions and firing
        this.orbitals.forEach((sat, index) => {
            // Update angle
            sat.angle += config.orbitSpeed * dt * 0.001;

            // Calculate position
            sat.x = coreX + Math.cos(sat.angle) * config.orbitRadius;
            sat.y = coreY + Math.sin(sat.angle) * config.orbitRadius;

            // Check if should fire (using dt accumulator instead of Date.now())
            if (this._orbitalTime - sat.lastFire > config.fireRate && enemies.length > 0) {
                // Find closest enemy to satellite
                let closest = null;
                let minDist = Infinity;
                enemies.forEach(e => {
                    const dist = Math.hypot(e.x - sat.x, e.y - sat.y);
                    if (dist < minDist && !e.markedForDeletion) {
                        minDist = dist;
                        closest = e;
                    }
                });

                if (closest) {
                    // Fire from satellite
                    const proj = new Projectile(closest, true, coreY * 2, upgrades);
                    proj.x = sat.x;
                    proj.y = sat.y;
                    proj.colors = this.equippedSkin.colors;
                    proj.damageMult = config.damageMult;
                    projectiles.push(proj);
                    sat.lastFire = this._orbitalTime;
                }
            }
        });
    }

    /**
     * Draw orbital satellites
     */
    drawOrbitals(ctx, coreX, coreY) {
        if (this.equippedSkin.attackType !== 'orbit') return;

        const colors = this.equippedSkin.colors;

        this.orbitals.forEach((sat, index) => {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Satellite glow (GlowCache replaces shadowBlur)
            const glowTex = GlowCache.get(colors.glow, 6 + 15);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(glowTex, sat.x - glowTex.width / 2, sat.y - glowTex.height / 2);
            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            ctx.arc(sat.x, sat.y, 6, 0, 6.2832);
            ctx.fill();

            // Satellite core (GlowCache replaces shadowBlur)
            const coreTex = GlowCache.get('#ffffff', 3 + 10);
            ctx.drawImage(coreTex, sat.x - coreTex.width / 2, sat.y - coreTex.height / 2);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sat.x, sat.y, 3, 0, 6.2832);
            ctx.fill();

            // Connection line to core (subtle)
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(coreX, coreY);
            ctx.lineTo(sat.x, sat.y);
            ctx.stroke();

            ctx.restore();
        });
    }

    /**
     * Get rarity color for UI
     */
    getRarityColor(rarity) {
        return SKIN_RARITY_COLORS[rarity] || SKIN_RARITY_COLORS.common;
    }

    /**
     * Get current skin's attack description for UI
     */
    getAttackDescription() {
        const skin = this.equippedSkin;
        const type = skin.attackType;
        
        const descriptions = {
            standard: 'Standard single shot projectile',
            twin: 'Fires two parallel projectiles',
            piercing: 'Projectiles pierce through enemies',
            rapid: 'Rapid fire with reduced damage per shot',
            split: 'Projectiles split into multiple shots',
            charged: 'Charged shots with explosive impact',
            bounce: 'Projectiles bounce between enemies',
            orbit: 'Orbiting satellites provide additional fire'
        };

        return descriptions[type] || descriptions.standard;
    }
}

// Create global skin system instance
let skinSystem = null;

function initSkinSystem() {
    skinSystem = new SkinSystem();
    return skinSystem;
}

function getSkinSystem() {
    if (!skinSystem) {
        skinSystem = new SkinSystem();
    }
    return skinSystem;
}
