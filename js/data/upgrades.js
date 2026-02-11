/**
 * Upgrade Definitions
 * All available upgrades and their properties
 */

const UPGRADES = [
    {
        id: 'clickDmg',
        name: 'Pulse Cannon',
        icon: '🖱️',
        baseCost: 15,
        costMult: 1.5,
        count: 0,
        getVal: (n) => 1 + (n * 4),
        desc: (v, prestigeMult = 1) => `Dmg: ${format(v * prestigeMult)}`
    },
    {
        id: 'autoDmg',
        name: 'Auto-Turret',
        icon: '💠',
        baseCost: 20,
        costMult: 1.35,
        count: 0,
        getVal: (n) => n === 0 ? 0 : 8 + (n * 5),
        desc: (v, prestigeMult = 1) => `Dmg: ${format(v * prestigeMult)}`
    },
    {
        id: 'autoSpeed',
        name: 'Cyclic Rate',
        icon: '⚡',
        baseCost: 100,
        costMult: 1.8,
        count: 0,
        max: 25,
        getVal: (n) => Math.max(200, 2000 - (n * 72)),
        desc: (v) => `RPM: ${(60000/v).toFixed(0)}`
    },
    {
        id: 'multishot',
        name: 'Split-Fire',
        icon: '📶',
        baseCost: 600,
        costMult: 2.5,
        count: 0,
        max: 8,
        getVal: (n) => 1 + n,
        desc: (v) => `Targets: ${v}`
    },
    {
        id: 'explosive',
        name: 'Nova Round',
        icon: '💥',
        baseCost: 1200,
        costMult: 2.2,
        count: 0,
        max: 15,
        getVal: (n) => n * 30,
        desc: (v) => `Radius: ${v}px`
    },
    {
        id: 'critChance',
        name: 'Crit Logic',
        icon: '🎯',
        baseCost: 500,
        costMult: 1.6,
        count: 0,
        max: 50,
        getVal: (n) => n * 2,
        desc: (v) => `Crit: ${v}%`
    },
    {
        id: 'economy',
        name: 'Data Mining',
        icon: '💎',
        baseCost: 250,
        costMult: 1.45,
        count: 0,
        getVal: (n) => 1 + (n * 0.25),
        desc: (v) => `+${((v-1)*100).toFixed(0)}%`
    },
    {
        id: 'freeze',
        name: 'Cryo Field',
        icon: '❄️',
        baseCost: 800,
        costMult: 1.7,
        count: 0,
        max: 20,
        getVal: (n) => n * 5,
        desc: (v) => `Slow: ${v}%`
    },
    {
        id: 'regen',
        name: 'Nano-Repair',
        icon: '🔧',
        baseCost: 400,
        costMult: 1.55,
        count: 0,
        getVal: (n) => n * 2,
        desc: (v) => `+${v} HP/s`
    },
    {
        id: 'maxHp',
        name: 'Core Shield',
        icon: '🛡️',
        baseCost: 200,
        costMult: 1.4,
        count: 0,
        getVal: (n) => 100 + (n * 50),
        desc: (v) => `Max HP: ${v}`
    }
];
