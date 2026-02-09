/**
 * Enemy Type Definitions
 * Defines different enemy variants and their properties
 */

const ENEMY_TYPES = {
    NORMAL: {
        type: 'normal',
        color: '#ff5050',
        sizeMultiplier: 1,
        hpMultiplier: 1,
        speedMultiplier: 1,
        bitsMultiplier: 1,
        minWave: 1
    },
    
    FAST: {
        type: 'fast',
        color: '#ffff00',
        sizeMultiplier: 0.7,
        hpMultiplier: 0.5,
        speedMultiplier: 2,
        bitsMultiplier: 1.5,
        minWave: 5,
        spawnChance: 0.1 // 10%
    },
    
    TANK: {
        type: 'tank',
        color: '#ff8800',
        sizeMultiplier: 1.3,
        hpMultiplier: 2.5,
        speedMultiplier: 0.6,
        bitsMultiplier: 2.5,
        minWave: 10,
        spawnChance: 0.1 // 10%
    },
    
    DASHER: {
        type: 'dasher',
        color: '#ffffff',
        sizeMultiplier: 0.9,
        hpMultiplier: 1.2,
        speedMultiplier: 1.1,
        bitsMultiplier: 2,
        minWave: 20,
        spawnChance: 0.1, // 10%
        dashCooldown: [2000, 3000], // Random between values
        dashDistance: 100
    },
    
    HEALER: {
        type: 'healer',
        color: '#00ff88',
        sizeMultiplier: 1,
        hpMultiplier: 0.7,
        speedMultiplier: 0.8,
        bitsMultiplier: 3,
        minWave: 30,
        spawnChance: 0.1, // 10%
        healCooldown: 1500,
        healAmount: 0.15, // 15% of max HP
        healRadius: 150
    },
    
    SHIFTER: {
        type: 'shifter',
        color: '#aa00ff',
        sizeMultiplier: 0.8,
        hpMultiplier: 0.8,
        speedMultiplier: 1.4,
        bitsMultiplier: 4,
        minWave: 45,
        spawnChance: 0.1, // 10%
        phaseSpeed: 500 // Opacity oscillation speed
    },
    
    JUGGERNAUT: {
        type: 'juggernaut',
        color: '#550000',
        sizeMultiplier: 1.6,
        hpMultiplier: 6.0,
        speedMultiplier: 0.4,
        bitsMultiplier: 8,
        minWave: 75,
        spawnChance: 0.1, // 10%
        armorPerLevel: 1.0
    },
    
    BANSHEE: {
        type: 'banshee',
        color: '#00ffff',
        sizeMultiplier: 0.7,
        hpMultiplier: 1.0,
        speedMultiplier: 1.8,
        bitsMultiplier: 5,
        minWave: 100,
        spawnChance: 0.1, // 10%
        waveAmplitude: 60,
        waveSpeed: 300
    },
    
    BOSS: {
        type: 'boss',
        color: '#aa00ff',
        sizeMultiplier: 2.8,
        hpMultiplier: 15,
        speedMultiplier: 0.25,
        bitsMultiplier: 50,
        spawnEveryNWaves: 10
    }
};

// Freeze to prevent modifications
Object.freeze(ENEMY_TYPES);
