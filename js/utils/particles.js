/**
 * Particle System Utilities
 * Functions for creating visual effects
 */

/**
 * Create particle burst at a location
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} color - Particle color
 * @param {number} count - Number of particles
 */
function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

/**
 * Create explosion effect
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} count - Number of particles
 * @param {string} color - Particle color
 */
function createExplosion(x, y, count = 20, color = '#ff5050') {
    createParticles(x, y, color, count);
    shockwaves.push(new Shockwave(x, y, color));
}

/**
 * Shake the screen
 * @param {number} amount - Shake intensity
 */
function shakeScreen(amount = 3) {
    shakeAmount = amount;
}
