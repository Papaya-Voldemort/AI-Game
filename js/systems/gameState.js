/**
 * Game State Management
 * Utility functions for managing game state
 * Expects global state and upgrades variables to exist
 */

function initGameState(config, upgradesData) {
    // Create new state from config
    const newState = { ...config.INITIAL_STATE };
    
    // Clone upgrades data
    const newUpgrades = upgradesData.map(u => ({ ...u }));
    
    return { state: newState, upgrades: newUpgrades };
}

function getPrestigeMult(gameState) {
    return 1 + (gameState.prestigeCurrency * CONFIG.PRESTIGE_MULT_PER_BYTE);
}

function resetGameState(gameState, gameUpgrades, isPrestige) {
    if (isPrestige) {
        const earned = Math.floor(gameState.level / 5);
        gameState.prestigeCurrency += earned;
        return earned;
    }

    gameState.money = 0;
    gameState.level = 1;
    gameState.coreHp = gameState.maxCoreHp;
    gameState.spawnRate = 1500;
    gameState.enemiesKilled = 0;
    gameState.spawnTimer = 0;
    gameState.gameOver = false;
    gameState.isPlaying = true;
    
    gameUpgrades.forEach(u => u.count = 0);
    
    return null;
}

function updateMaxHP(gameState, gameUpgrades) {
    const maxHpU = gameUpgrades.find(u => u.id === 'maxHp');
    gameState.maxCoreHp = maxHpU.getVal(maxHpU.count);
}
