/**
 * Enemy Spawner System
 * Handles enemy wave spawning logic
 */

function updateSpawner(dt, state, enemies, canvasHeight, spawnDistance, upgrades, paceMultiplier = 1) {
    state.spawnTimer -= dt;
    
    if (state.spawnTimer <= 0) {
        // Create new enemy
        const enemy = new Enemy(state.level, canvasHeight, spawnDistance, upgrades, enemies);
        enemies.push(enemy);
        
        // Calculate next spawn time
        const baseRate = Math.max(
            CONFIG.MIN_SPAWN_RATE,
            state.spawnRate - (state.level * CONFIG.SPAWN_RATE_DECREASE_PER_LEVEL)
        );
        const adjustedRate = Math.max(CONFIG.MIN_SPAWN_RATE, baseRate * paceMultiplier);
        state.spawnTimer = adjustedRate;
    }
}

function onEnemyKill(enemy, state) {
    state.money += enemy.bits;
    state.enemiesKilled++;
    
    // Chance to drop rare currency
    // Higher chance for elite/boss enemies, every 25th enemy has increased chance
    const isElite = enemy.type === 'elite' || enemy.type === 'boss' || state.enemiesKilled % 25 === 0;
    const isBoss = enemy.type === 'boss' || (state.enemiesKilled % 100 === 0 && state.enemiesKilled > 0);
    
    // Roll for currency drop - REDUCED RATES (much rarer now)
    const roll = Math.random() * 100;
    let dropType = null;
    
    if (isBoss) {
        // Bosses have 3% chance for prism, 5% for shard
        if (roll < 3) dropType = 'prism';
        else if (roll < 8) dropType = 'shard';
    } else if (isElite) {
        // Elites have 0.5% chance for prism, 2% for shard
        if (roll < 0.5) dropType = 'prism';
        else if (roll < 2.5) dropType = 'shard';
    } else {
        // Regular enemies have 0.1% chance for prism, 0.5% for shard
        if (roll < 0.1) dropType = 'prism';
        else if (roll < 0.6) dropType = 'shard';
    }
    
    // Spawn collectible if drop occurred
    if (dropType && typeof spawnCollectible === 'function' && typeof collectibles !== 'undefined') {
        const collectible = spawnCollectible(enemy.x, enemy.y, dropType);
        if (collectible) {
            collectibles.push(collectible);
        }
    }
    
    // Check for level up (every 8 kills)
    if (state.enemiesKilled % 8 === 0) {
        state.level++;
        return true; // Level up occurred
    }
    
    return false; // No level up
}
