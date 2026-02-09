/**
 * Game State Management
 * Centralizes all game state and provides access methods
 */

let state = null;
let upgrades = [];

function initGameState(config, upgradesData) {
    // Clone the initial state from config
    state = { ...config.INITIAL_STATE };
    
    // Clone upgrades data
    upgrades = upgradesData.map(u => ({ ...u }));
    
    return { state, upgrades };
}

function getState() {
    return state;
}

function getUpgrades() {
    return upgrades;
}

function getPrestigeMult() {
    return 1 + (state.prestigeCurrency * CONFIG.PRESTIGE_MULT_PER_BYTE);
}

function resetGameState(isPrestige) {
    if (isPrestige) {
        const earned = Math.floor(state.level / 5);
        state.prestigeCurrency += earned;
        return earned;
    }

    state.money = 0;
    state.level = 1;
    state.coreHp = state.maxCoreHp;
    state.spawnRate = 1500;
    state.enemiesKilled = 0;
    state.spawnTimer = 0;
    state.gameOver = false;
    state.isPlaying = true;
    
    upgrades.forEach(u => u.count = 0);
    
    return null;
}

function updateMaxHP() {
    const maxHpU = upgrades.find(u => u.id === 'maxHp');
    state.maxCoreHp = maxHpU.getVal(maxHpU.count);
}
