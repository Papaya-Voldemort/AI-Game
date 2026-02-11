/**
 * Permanent Upgrades (purchased with Credits)
 * These persist between runs and augment credit gains and other long-term stats.
 */

const PERM_UPGRADES = [
    {
        id: 'creditsMult',
        name: 'Credit Multiplier',
        icon: '✳️',
        baseCost: 25,
        costMult: 1.6,
        count: 0,
        max: 50,
        getVal: (n) => 0.05 * n, // each level adds +5% credits
        desc: (v) => `+${Math.round(v * 100)}% credits`
    },
    {
        id: 'creditsFlat',
        name: 'Credit Cache',
        icon: '🪙',
        baseCost: 40,
        costMult: 1.7,
        count: 0,
        max: 30,
        getVal: (n) => n, // +1 credit per level
        desc: (v) => `+${v} credits/run`
    },
    {
        id: 'startBits',
        name: 'Seed Funds',
        icon: '🌱',
        baseCost: 30,
        costMult: 1.6,
        count: 0,
        max: 25,
        getVal: (n) => 10 * n, // +10 bits per level at run start
        desc: (v) => `+${v} Bits at run start`
    },
    {
        id: 'autoDmgPerm',
        name: 'Drone Array',
        icon: '🤖',
        baseCost: 60,
        costMult: 1.6,
        count: 0,
        max: 30,
        getVal: (n) => 0.02 * n, // +2% turret dmg per level
        desc: (v) => `+${Math.round(v*100)}% turret dmg`
    },
    {
        id: 'clickBonus',
        name: 'Overclock Click',
        icon: '🖱️',
        baseCost: 45,
        costMult: 1.65,
        count: 0,
        max: 40,
        getVal: (n) => n, // +1 click dmg per level
        desc: (v) => `+${v} click dmg`
    },
    {
        id: 'critChancePerm',
        name: 'Sharpshooter Protocol',
        icon: '🎯',
        baseCost: 80,
        costMult: 1.6,
        count: 0,
        max: 50,
        getVal: (n) => 0.25 * n, // +0.25% crit chance per level
        desc: (v) => `+${v.toFixed(2)}% crit chance`
    }
];

// Freeze so they are treated as read-only template values
Object.freeze(PERM_UPGRADES);
