/**
 * Enemy Spawner System
 * Handles enemy wave spawning logic
 */

function updateSpawner(dt, state, enemies, canvasHeight, spawnDistance, upgrades) {
    state.spawnTimer -= dt;
    
    if (state.spawnTimer <= 0) {
        // Create new enemy
        const enemy = new Enemy(state.level, canvasHeight, spawnDistance, upgrades, enemies);
        enemies.push(enemy);
        
        // Calculate next spawn time
        const rate = Math.max(
            CONFIG.MIN_SPAWN_RATE, 
            state.spawnRate - (state.level * CONFIG.SPAWN_RATE_DECREASE_PER_LEVEL)
        );
        state.spawnTimer = rate;
    }
}

function onEnemyKill(enemy, state) {
    state.money += enemy.bits;
    state.enemiesKilled++;
    
    // Check for level up (every 8 kills)
    if (state.enemiesKilled % 8 === 0) {
        state.level++;
        return true; // Level up occurred
    }
    
    return false; // No level up
}
