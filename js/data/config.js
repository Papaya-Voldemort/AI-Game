/**
 * Game Configuration
 * Core game settings and constants
 */

const CONFIG = {
    // Initial game state
    INITIAL_STATE: {
        money: 0,
        level: 1,
        coreHp: 100,
        maxCoreHp: 100,
        prestigeCurrency: 0,
        gameOver: false,
        lastTime: 0,
        spawnTimer: 0,
        spawnRate: 1500,
        isPlaying: true,
        enemiesKilled: 0
    },
    
    // Game balance
    PRESTIGE_MULT_PER_BYTE: 0.25, // +25% Global Damage per Byte
    
    // Spawn settings
    MIN_SPAWN_RATE: 250,
    SPAWN_RATE_DECREASE_PER_LEVEL: 18,
    
    // Combat settings
    CRIT_DAMAGE_MULTIPLIER: 2.5,
    
    // UI settings
    CANVAS_CURSOR: 'crosshair',
    
    // Background
    STAR_COUNT: 60,
    
    // Timing
    AUTO_FIRE_MIN_RATE: 200,
    REGEN_TICK_RATE: 1000
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.INITIAL_STATE);
