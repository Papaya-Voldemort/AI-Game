/**
 * render.js
 * 
 * Handles all rendering logic for the Neon Core Defense game.
 * This module contains the main draw function that renders the entire game scene
 * including background, core, entities, and effects.
 */

/**
 * Main draw function that renders the entire game scene
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} gameState - Current game state object containing:
 *   @param {number} gameState.shakeAmount - Current screen shake intensity
 *   @param {Array} gameState.stars - Array of background star objects
 *   @param {number} gameState.coreRecoil - Current recoil distance for the core
 *   @param {number} gameState.coreAngle - Current rotation angle for shield rings
 *   @param {Object|null} gameState.closestEnemy - Closest enemy to the core (for turret aiming)
 *   @param {number} gameState.spawnDistance - Distance from left where enemies spawn
 *   @param {Array} gameState.shockwaves - Array of shockwave effect objects
 *   @param {Array} gameState.projectiles - Array of projectile objects
 *   @param {Array} gameState.enemies - Array of enemy objects
 *   @param {Array} gameState.particles - Array of particle objects
 *   @param {Array} gameState.floaters - Array of floating text objects (damage numbers, etc.)
 * @returns {number} Updated shake amount after decay
 */
function draw(ctx, width, height, gameState) {
    // Clear the entire canvas
    ctx.clearRect(0, 0, width, height);

    // Save context state before applying screen shake
    ctx.save();

    // Apply screen shake effect
    let newShakeAmount = gameState.shakeAmount;
    if (newShakeAmount > 0) {
        // Random shake offset in both X and Y directions
        const dx = (Math.random() - 0.5) * newShakeAmount;
        const dy = (Math.random() - 0.5) * newShakeAmount;
        ctx.translate(dx, dy);
        
        // Decay shake amount over time
        newShakeAmount *= 0.9;
        if (newShakeAmount < 0.5) {
            newShakeAmount = 0;
        }
    }

    // ===== BACKGROUND LAYER =====
    // Draw parallax background stars
    gameState.stars.forEach(star => star.draw(ctx));

    // ===== CORE DRAWING =====
    // Core position with recoil effect (pushes left when firing)
    const coreX = 50 - Math.max(0, gameState.coreRecoil);
    const coreY = height / 2;

    // Draw outer shield ring (partial arc, rotates)
    ctx.strokeStyle = `rgba(0, 255, 255, 0.3)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 45, gameState.coreAngle, gameState.coreAngle + Math.PI * 1.5);
    ctx.stroke();

    // Draw inner rotating ring (opposite rotation direction)
    ctx.strokeStyle = `rgba(0, 255, 255, 0.6)`;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 35, -gameState.coreAngle * 2, -gameState.coreAngle * 2 + Math.PI);
    ctx.stroke();

    // Draw turret barrel that aims at the closest enemy
    ctx.save();
    ctx.translate(coreX, coreY);
    let angle = 0;
    if (gameState.closestEnemy) {
        // Calculate angle to closest enemy
        angle = Math.atan2(
            gameState.closestEnemy.y - coreY,
            gameState.closestEnemy.x - coreX
        );
    }
    ctx.rotate(angle);
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    // Barrel retracts when recoiling
    ctx.fillRect(0, -4, 40 - gameState.coreRecoil, 8);
    ctx.restore();

    // Draw main core sphere (outer shell)
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 25, 0, Math.PI * 2);
    ctx.fill();

    // Draw inner glowing core with pulsing effect
    const time = Date.now() / 300;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 15 + Math.sin(time) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ===== SPAWN LINE =====
    // Draw vertical dashed line showing where enemies spawn
    if (width > gameState.spawnDistance + 50) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.moveTo(gameState.spawnDistance + 40, 0);
        ctx.lineTo(gameState.spawnDistance + 40, height);
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid lines
    }

    // ===== ENTITIES LAYER =====
    // Draw all game entities in proper z-order (back to front)
    
    // 1. Shockwaves (background effects)
    gameState.shockwaves.forEach(shockwave => shockwave.draw(ctx));
    
    // 2. Projectiles (player bullets)
    gameState.projectiles.forEach(projectile => projectile.draw(ctx));
    
    // 3. Enemies (main threats)
    gameState.enemies.forEach(enemy => enemy.draw(ctx));
    
    // 4. Particles (explosion debris, etc.)
    gameState.particles.forEach(particle => particle.draw(ctx));
    
    // 5. Floaters (damage numbers, text) - drawn on top
    gameState.floaters.forEach(floater => floater.draw(ctx));

    // Restore context to remove screen shake transform
    ctx.restore();

    // Return updated shake amount for the game state
    return newShakeAmount;
}
