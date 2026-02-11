/**
 * SKINS DATA - Skin definitions with unique themes and attack patterns
 * Each skin changes the core appearance, projectile visuals, and adds unique mechanics
 */

const SKINS = [
    {
        id: 'default',
        name: 'Neon Core',
        description: 'The classic cyan energy core. Balanced and reliable.',
        icon: '💠',
        rarity: 'common',
        unlocked: true,
        price: 0,
        priceType: 'free',
        colors: {
            primary: '#00ffff',
            secondary: '#0088ff',
            glow: '#00ffff',
            projectile: '#00ffff',
            trail: '#00ffff'
        },
        attackType: 'standard',
        attackConfig: {}
    },
    {
        id: 'crimson',
        name: 'Crimson Fury',
        description: 'Twin projectile attack. Fires two parallel shots for double the destruction.',
        icon: '🔥',
        rarity: 'rare',
        unlocked: false,
        price: 3,
        priceType: 'prisms',
        colors: {
            primary: '#ff3333',
            secondary: '#ff6666',
            glow: '#ff0000',
            projectile: '#ff4444',
            trail: '#ff6600'
        },
        attackType: 'twin',
        attackConfig: {
            spread: 15,
            damageMult: 0.85
        }
    },
    {
        id: 'void',
        name: 'Void Walker',
        description: 'Piercing dark matter. Projectiles pass through enemies, hitting multiple targets.',
        icon: '🌑',
        rarity: 'epic',
        unlocked: false,
        price: 2,
        secondaryPrice: 15,
        priceType: 'shards',
        colors: {
            primary: '#9933ff',
            secondary: '#6600cc',
            glow: '#aa00ff',
            projectile: '#cc44ff',
            trail: '#9933ff'
        },
        attackType: 'piercing',
        attackConfig: {
            pierceCount: 3,
            damageDecay: 0.7,
            speed: 18
        }
    },
    {
        id: 'plasma',
        name: 'Plasma Surge',
        description: 'Rapid fire energy bolts. Shoots faster with lower damage per shot.',
        icon: '⚡',
        rarity: 'rare',
        unlocked: false,
        price: 2,
        priceType: 'prisms',
        colors: {
            primary: '#ffff00',
            secondary: '#ffaa00',
            glow: '#ffff00',
            projectile: '#ffff44',
            trail: '#ffcc00'
        },
        attackType: 'rapid',
        attackConfig: {
            fireRateMult: 0.6,
            damageMult: 0.6,
            projectileCount: 1
        }
    },
    {
        id: 'quantum',
        name: 'Quantum Split',
        description: 'Splits into 3 smaller projectiles mid-flight for area coverage.',
        icon: '✨',
        rarity: 'epic',
        unlocked: false,
        price: 2,
        secondaryPrice: 12,
        priceType: 'shards',
        colors: {
            primary: '#00ff88',
            secondary: '#00cc66',
            glow: '#00ffaa',
            projectile: '#44ffaa',
            trail: '#66ffcc'
        },
        attackType: 'split',
        attackConfig: {
            splitDistance: 200,
            splitCount: 3,
            splitAngle: 30,
            damageMult: 0.5
        }
    },
    {
        id: 'omega',
        name: 'Omega Core',
        description: 'LEGENDARY: Massive charged shots that explode on impact.',
        icon: '☀️',
        rarity: 'legendary',
        unlocked: false,
        price: 10,
        priceType: 'shards',
        colors: {
            primary: '#ff00ff',
            secondary: '#ff44aa',
            glow: '#ff00ff',
            projectile: '#ff88ff',
            trail: '#ff66ff'
        },
        attackType: 'charged',
        attackConfig: {
            chargeTime: 800,
            damageMult: 2.5,
            blastRadius: 100,
            sizeMult: 2.5,
            speed: 15
        }
    },
    {
        id: 'cyber',
        name: 'Cyber Edge',
        description: 'Bouncing energy shurikens that bounce between enemies.',
        icon: '🎯',
        rarity: 'rare',
        unlocked: false,
        price: 4,
        priceType: 'prisms',
        colors: {
            primary: '#00ff00',
            secondary: '#00cc00',
            glow: '#44ff44',
            projectile: '#88ff88',
            trail: '#66ff66'
        },
        attackType: 'bounce',
        attackConfig: {
            bounceCount: 2,
            bounceRange: 250,
            damageMult: 0.75,
            speed: 20
        }
    },
    {
        id: 'nebula',
        name: 'Nebula Guardian',
        description: 'Orbits defensive satellites that shoot automatically.',
        icon: '🛡️',
        rarity: 'epic',
        unlocked: false,
        price: 3,
        secondaryPrice: 20,
        priceType: 'shards',
        colors: {
            primary: '#4488ff',
            secondary: '#2266dd',
            glow: '#66aaff',
            projectile: '#88bbff',
            trail: '#aaccff'
        },
        attackType: 'orbit',
        attackConfig: {
            satelliteCount: 2,
            orbitRadius: 60,
            orbitSpeed: 2,
            fireRate: 1200,
            damageMult: 0.5
        }
    }
];

// Skin rarity colors for UI
const SKIN_RARITY_COLORS = {
    common: '#aaaaaa',
    rare: '#4488ff',
    epic: '#aa44ff',
    legendary: '#ffaa00'
};

// Freeze rarity colors only (skins need to be modifiable for unlock system)
Object.freeze(SKIN_RARITY_COLORS);
