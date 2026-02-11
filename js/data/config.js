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
        credits: 0,
        prestigeCurrency: 0,
        prisms: 0, // Very rare currency
        shards: 0, // Rare currency
        lastRunWave: 0,
        lastRunCredits: 0,
        gameOver: false,
        lastTime: 0,
        spawnTimer: 0,
        spawnRate: 1500,
        isPlaying: true,
        isPaused: false,
        enemiesKilled: 0,
        equippedSkin: 'default' // Currently equipped skin ID
    },
    
    // Game balance
    PRESTIGE_MULT_PER_BYTE: 0.25, // +25% Global Damage per Byte
    
    // Rare currency drop rates (percentage) - REDUCED for rarity
    PRISM_DROP_CHANCE: 0.5, // 0.5% chance on elite kills, 3% on bosses
    SHARD_DROP_CHANCE: 2, // 2% chance on elite kills, 8% on bosses
    
    // Spawn settings
    MIN_SPAWN_RATE: 250,
    SPAWN_RATE_DECREASE_PER_LEVEL: 18,
    EARLY_GAME_GRACE_LEVELS: 8,
    ADAPTIVE_DIFFICULTY: {
        MAX_RATE_MULT: 1.3,
        MIN_RATE_MULT: 0.72,
        DANGER_HP_THRESHOLD: 0.4,
        DANGER_RATE_BOOST: 0.28,
        MOMENTUM_BONUS_PER_LEVEL: 0.02
    },
    
    // Combat settings
    CRIT_DAMAGE_MULTIPLIER: 2.5,
    
    // UI settings
    CANVAS_CURSOR: 'crosshair',
    
    // Background - OPTIMIZED: Reduced for better performance
    STAR_COUNT: 40,
    
    // Timing
    AUTO_FIRE_MIN_RATE: 200,
    REGEN_TICK_RATE: 1000,
    
    // Skill Tree Settings
    SKILL_TREE: {
        // Cost formula: tier 1-5 costs
        TIER_COSTS: [1, 2, 4, 8, 15],
        // Maximum number of nodes
        MAX_NODES: 32,
        // Branches
        BRANCHES: ['combat', 'defense', 'economy', 'utility']
    }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.INITIAL_STATE);
Object.freeze(CONFIG.SKILL_TREE);
Object.freeze(CONFIG.ADAPTIVE_DIFFICULTY);
