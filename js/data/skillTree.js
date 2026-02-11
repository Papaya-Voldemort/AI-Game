/**
 * Skill Tree System - 36 Unique Nodes Across 4 Branches
 * 
 * Each node can have 3-5 tiers (upgrades)
 * Cost scaling: Tier 1=1, Tier 2=2, Tier 3=4, Tier 4=8, Tier 5=15 Bytes
 * 
 * Branches:
 * - COMBAT (Red): Damage and offense
 * - DEFENSE (Blue): HP and survival
 * - ECONOMY (Green): Currency and progression
 * - UTILITY (Purple): Special abilities and QoL
 */

const SKILL_TREE_BRANCHES = {
    COMBAT: {
        id: 'combat',
        name: 'Combat Protocol',
        color: '#ff4757',
        glowColor: 'rgba(255, 71, 87, 0.6)',
        icon: '⚔️',
        angle: -45
    },
    DEFENSE: {
        id: 'defense',
        name: 'Defense Matrix',
        color: '#3742fa',
        glowColor: 'rgba(55, 66, 250, 0.6)',
        icon: '🛡️',
        angle: -135
    },
    ECONOMY: {
        id: 'economy',
        name: 'Economic Engine',
        color: '#2ed573',
        glowColor: 'rgba(46, 213, 115, 0.6)',
        icon: '💰',
        angle: 135
    },
    UTILITY: {
        id: 'utility',
        name: 'Utility Systems',
        color: '#a55eea',
        glowColor: 'rgba(165, 94, 234, 0.6)',
        icon: '⚡',
        angle: 45
    }
};

function getTierCost(tier) {
    const costs = [1, 2, 4, 8, 15, 25, 40];
    return costs[Math.min(tier, costs.length - 1)];
}

function formatPct(val) {
    return val >= 10 ? Math.round(val) : val.toFixed(1);
}

// Improved coordinate system - 5 tiers of depth from center
// Tier 0: Center (0, 0)
// Tier 1: Distance 0.6 (branch starters)
// Tier 2: Distance 1.0 (first split)
// Tier 3: Distance 1.4 (second split)
// Tier 4: Distance 1.8 (third split)
// Tier 5: Distance 2.2 (capstones)

// COMBAT BRANCH - Top Right (9 nodes)
const COMBAT_NODES = [
    {
        id: 'combat_core',
        name: 'Combat Core',
        description: 'Unlocks the Combat branch. Increases all damage by 5% per tier.',
        icon: '⚔️',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 0.05,
        getDesc: (tier) => `+${formatPct(tier * 5)}% All Damage`,
        x: 0.5, y: -0.5,
        prerequisites: [],
        tier: 1
    },
    // Tier 2 - Split into 2 paths
    {
        id: 'pulse_strength',
        name: 'Pulse Amplifier',
        description: 'Increases click damage by 3 per tier.',
        icon: '🖱️',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 3,
        getDesc: (tier) => `+${tier * 3} Click Damage`,
        x: 0.8, y: -0.3,
        prerequisites: ['combat_core'],
        tier: 2
    },
    {
        id: 'turret_power',
        name: 'Auto-Turret',
        description: 'Increases auto-turret damage by 4 per tier.',
        icon: '🤖',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 4,
        getDesc: (tier) => `+${tier * 4} Turret Damage`,
        x: 0.8, y: -0.7,
        prerequisites: ['combat_core'],
        tier: 2
    },
    // Tier 3 - Continue paths
    {
        id: 'rapid_fire',
        name: 'Rapid Fire',
        description: 'Reduces auto-fire cooldown by 5% per tier.',
        icon: '🔫',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [2, 4, 6, 10, 18],
        getValue: (tier) => 1 - (tier * 0.05),
        getDesc: (tier) => `${formatPct(100 - tier * 5)}% Fire Rate`,
        x: 1.1, y: -0.2,
        prerequisites: ['pulse_strength'],
        tier: 3
    },
    {
        id: 'critical_focus',
        name: 'Critical Focus',
        description: 'Increases critical hit chance by 1% per tier.',
        icon: '🎯',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [2, 4, 6, 10, 18],
        getValue: (tier) => tier * 1,
        getDesc: (tier) => `+${tier}% Crit Chance`,
        x: 1.1, y: -0.5,
        prerequisites: ['pulse_strength', 'turret_power'],
        tier: 3
    },
    {
        id: 'multishot_expansion',
        name: 'Multishot',
        description: 'Increases multishot targets by 1 every 2 tiers.',
        icon: '📡',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [2, 4, 8, 14, 22],
        getValue: (tier) => Math.floor(tier / 2),
        getDesc: (tier) => `+${Math.floor(tier / 2)} Multishot`,
        x: 1.1, y: -0.8,
        prerequisites: ['turret_power'],
        tier: 3
    },
    // Tier 4 - Advanced nodes
    {
        id: 'armor_piercing',
        name: 'Armor Piercing',
        description: 'Ignore 5% of enemy armor per tier.',
        icon: '🔨',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.05,
        getDesc: (tier) => `+${formatPct(tier * 5)}% Armor Pierce`,
        x: 1.4, y: -0.3,
        prerequisites: ['rapid_fire'],
        tier: 4
    },
    {
        id: 'executioner',
        name: 'Executioner',
        description: 'Deal bonus damage to enemies below 25% HP. +6% per tier.',
        icon: '💀',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.06,
        getDesc: (tier) => `+${formatPct(tier * 6)}% Execute Damage`,
        x: 1.4, y: -0.6,
        prerequisites: ['critical_focus'],
        tier: 4
    },
    {
        id: 'splash_damage',
        name: 'Splash Damage',
        description: 'Deal 10% splash damage to nearby enemies per tier.',
        icon: '💥',
        branch: 'combat',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.10,
        getDesc: (tier) => `+${formatPct(tier * 10)}% Splash`,
        x: 1.4, y: -0.9,
        prerequisites: ['multishot_expansion'],
        tier: 4
    },
    // Tier 5 - Capstone
    {
        id: 'omega_strike',
        name: 'Omega Strike',
        description: 'CAPSTONE: Ultimate power. +12% damage, +8% crit damage per tier.',
        icon: '☠️',
        branch: 'combat',
        maxTier: 3,
        tierCosts: [10, 20, 35],
        getValue: (tier) => ({ dmg: tier * 0.12, critDmg: tier * 0.08 }),
        getDesc: (tier) => `+${formatPct(tier * 12)}% DMG, +${formatPct(tier * 8)}% Crit`,
        x: 1.8, y: -0.6,
        prerequisites: ['armor_piercing', 'executioner', 'splash_damage'],
        isCapstone: true,
        tier: 5
    }
];

// DEFENSE BRANCH - Top Left (9 nodes)
const DEFENSE_NODES = [
    {
        id: 'defense_core',
        name: 'Defense Core',
        description: 'Unlocks the Defense branch. Increases max HP by 15 per tier.',
        icon: '🛡️',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 15,
        getDesc: (tier) => `+${tier * 15} Max HP`,
        x: -0.5, y: -0.5,
        prerequisites: [],
        tier: 1
    },
    // Tier 2
    {
        id: 'nano_repair',
        name: 'Nano Repair',
        description: 'Regenerate 0.8 HP per second per tier.',
        icon: '🔧',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 0.8,
        getDesc: (tier) => `+${(tier * 0.8).toFixed(1)} HP/s`,
        x: -0.8, y: -0.3,
        prerequisites: ['defense_core'],
        tier: 2
    },
    {
        id: 'hardened_plating',
        name: 'Hardened Shell',
        description: 'Reduces incoming damage by 2% per tier.',
        icon: '🔲',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [2, 4, 6, 10, 18],
        getValue: (tier) => 1 - (tier * 0.02),
        getDesc: (tier) => `${formatPct(100 - tier * 2)}% Damage Taken`,
        x: -0.8, y: -0.7,
        prerequisites: ['defense_core'],
        tier: 2
    },
    // Tier 3
    {
        id: 'regeneration_boost',
        name: 'Regen Boost',
        description: 'Double HP regeneration when below 50% HP.',
        icon: '💚',
        branch: 'defense',
        maxTier: 3,
        tierCosts: [3, 6, 10],
        getValue: (tier) => tier * 2,
        getDesc: (tier) => `${tier}x Regen when low`,
        x: -1.1, y: -0.2,
        prerequisites: ['nano_repair'],
        tier: 3
    },
    {
        id: 'cryo_enhancement',
        name: 'Cryo Field',
        description: 'Increases freeze duration by 12% per tier.',
        icon: '❄️',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [2, 4, 7, 12, 20],
        getValue: (tier) => 1 + (tier * 0.12),
        getDesc: (tier) => `+${formatPct(tier * 12)}% Freeze`,
        x: -1.1, y: -0.5,
        prerequisites: ['nano_repair', 'hardened_plating'],
        tier: 3
    },
    {
        id: 'vampiric_core',
        name: 'Life Drain',
        description: 'Heal for 0.4% of damage dealt per tier.',
        icon: '🩸',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.004,
        getDesc: (tier) => `+${(tier * 0.4).toFixed(1)}% Lifesteal`,
        x: -1.1, y: -0.8,
        prerequisites: ['hardened_plating'],
        tier: 3
    },
    // Tier 4
    {
        id: 'emergency_shield',
        name: 'Death Prevention',
        description: 'Prevent death once per run, healing 20% HP per tier.',
        icon: '🚨',
        branch: 'defense',
        maxTier: 3,
        tierCosts: [5, 12, 22],
        getValue: (tier) => tier * 0.20,
        getDesc: (tier) => `Heal ${formatPct(tier * 20)}% on death`,
        x: -1.4, y: -0.3,
        prerequisites: ['regeneration_boost'],
        tier: 4
    },
    {
        id: 'adaptive_armor',
        name: 'Adaptive Armor',
        description: 'Every 8 seconds, gain a shield. -1s per tier.',
        icon: '🛡️',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => 9 - tier,
        getDesc: (tier) => `Shield every ${9 - tier}s`,
        x: -1.4, y: -0.6,
        prerequisites: ['cryo_enhancement'],
        tier: 4
    },
    {
        id: 'damage_reflect',
        name: 'Thorns',
        description: 'Reflect 3% damage back to attackers per tier.',
        icon: '⚡',
        branch: 'defense',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.03,
        getDesc: (tier) => `+${formatPct(tier * 3)}% Reflect`,
        x: -1.4, y: -0.9,
        prerequisites: ['vampiric_core'],
        tier: 4
    },
    // Tier 5
    {
        id: 'immortal_matrix',
        name: 'Immortal Matrix',
        description: 'CAPSTONE: +20% max HP, +15% damage reduction per tier.',
        icon: '👑',
        branch: 'defense',
        maxTier: 3,
        tierCosts: [10, 20, 35],
        getValue: (tier) => ({ hp: tier * 0.20, dr: tier * 0.15 }),
        getDesc: (tier) => `+${formatPct(tier * 20)}% HP, +${formatPct(tier * 15)}% DR`,
        x: -1.8, y: -0.6,
        prerequisites: ['emergency_shield', 'adaptive_armor', 'damage_reflect'],
        isCapstone: true,
        tier: 5
    }
];

// ECONOMY BRANCH - Bottom Left (9 nodes)
const ECONOMY_NODES = [
    {
        id: 'economy_core',
        name: 'Economy Core',
        description: 'Unlocks the Economy branch. +8 starting Bits per tier.',
        icon: '💰',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 8,
        getDesc: (tier) => `+${tier * 8} Starting Bits`,
        x: -0.5, y: 0.5,
        prerequisites: [],
        tier: 1
    },
    // Tier 2
    {
        id: 'bit_mining',
        name: 'Bit Mining',
        description: 'Increases Bit gain by 4% per tier.',
        icon: '⛏️',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => 1 + (tier * 0.04),
        getDesc: (tier) => `+${formatPct(tier * 4)}% Bits`,
        x: -0.8, y: 0.3,
        prerequisites: ['economy_core'],
        tier: 2
    },
    {
        id: 'credit_optimization',
        name: 'Credit Optimization',
        description: 'Increases Credit gain by 6% per tier.',
        icon: '💳',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [2, 4, 6, 10, 18],
        getValue: (tier) => 1 + (tier * 0.06),
        getDesc: (tier) => `+${formatPct(tier * 6)}% Credits`,
        x: -0.8, y: 0.7,
        prerequisites: ['economy_core'],
        tier: 2
    },
    // Tier 3
    {
        id: 'interest_gains',
        name: 'Interest',
        description: 'Gain bonus Bits equal to 4% of current Bits every 5 waves per tier.',
        icon: '📈',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [2, 4, 8, 14, 22],
        getValue: (tier) => tier * 0.04,
        getDesc: (tier) => `+${formatPct(tier * 4)}% Interest`,
        x: -1.1, y: 0.2,
        prerequisites: ['bit_mining'],
        tier: 3
    },
    {
        id: 'prestige_efficiency',
        name: 'Prestige Boost',
        description: 'Gain +12% more Bytes on prestige per tier.',
        icon: '⚡',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [2, 4, 7, 12, 20],
        getValue: (tier) => 1 + (tier * 0.12),
        getDesc: (tier) => `+${formatPct(tier * 12)}% Bytes`,
        x: -1.1, y: 0.5,
        prerequisites: ['bit_mining', 'credit_optimization'],
        tier: 3
    },
    {
        id: 'bounty_hunter',
        name: 'Bounty Hunter',
        description: 'Elite enemies drop 25% more currency per tier.',
        icon: '🎯',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [2, 4, 8, 14, 22],
        getValue: (tier) => 1 + (tier * 0.25),
        getDesc: (tier) => `+${formatPct(tier * 25)}% Elite Loot`,
        x: -1.1, y: 0.8,
        prerequisites: ['credit_optimization'],
        tier: 3
    },
    // Tier 4
    {
        id: 'rare_affinity',
        name: 'Rare Finder',
        description: '+0.15% Prism and +0.4% Shard drop chance per tier.',
        icon: '💎',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => ({ prism: tier * 0.15, shard: tier * 0.4 }),
        getDesc: (tier) => `+${(tier * 0.15).toFixed(2)}% Prism, +${(tier * 0.4).toFixed(1)}% Shard`,
        x: -1.4, y: 0.3,
        prerequisites: ['interest_gains'],
        tier: 4
    },
    {
        id: 'kill_bonus',
        name: 'Kill Streak',
        description: 'Gain 1 extra Bit per kill per tier.',
        icon: '🔥',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier,
        getDesc: (tier) => `+${tier} Bits/kill`,
        x: -1.4, y: 0.6,
        prerequisites: ['prestige_efficiency'],
        tier: 4
    },
    {
        id: 'upgrade_discount',
        name: 'Bulk Discount',
        description: 'Reduces upgrade costs by 3% per tier.',
        icon: '🏷️',
        branch: 'economy',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => 1 - (tier * 0.03),
        getDesc: (tier) => `${formatPct(100 - tier * 3)}% Upgrade Cost`,
        x: -1.4, y: 0.9,
        prerequisites: ['bounty_hunter'],
        tier: 4
    },
    // Tier 5
    {
        id: 'golden_empire',
        name: 'Golden Empire',
        description: 'CAPSTONE: +15% all currency, +5% elite spawn rate per tier.',
        icon: '👑',
        branch: 'economy',
        maxTier: 3,
        tierCosts: [10, 20, 35],
        getValue: (tier) => ({ currency: 1 + tier * 0.15, elite: 1 + tier * 0.05 }),
        getDesc: (tier) => `+${formatPct(tier * 15)}% Currency, +${formatPct(tier * 5)}% Elites`,
        x: -1.8, y: 0.6,
        prerequisites: ['rare_affinity', 'kill_bonus', 'upgrade_discount'],
        isCapstone: true,
        tier: 5
    }
];

// UTILITY BRANCH - Bottom Right (9 nodes)
const UTILITY_NODES = [
    {
        id: 'utility_core',
        name: 'Utility Core',
        description: 'Unlocks the Utility branch. +3% XP gain per tier.',
        icon: '⚡',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => 1 + (tier * 0.03),
        getDesc: (tier) => `+${formatPct(tier * 3)}% XP`,
        x: 0.5, y: 0.5,
        prerequisites: [],
        tier: 1
    },
    // Tier 2
    {
        id: 'magnetic_field',
        name: 'Magnetism',
        description: '+25% pickup range for rare currency per tier.',
        icon: '🧲',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => 1 + (tier * 0.25),
        getDesc: (tier) => `+${formatPct(tier * 25)}% Pickup`,
        x: 0.8, y: 0.3,
        prerequisites: ['utility_core'],
        tier: 2
    },
    {
        id: 'smart_targeting',
        name: 'Smart Target',
        description: 'Projectiles seek weak enemies. +6% accuracy per tier.',
        icon: '🎯',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [1, 2, 4, 8, 15],
        getValue: (tier) => tier * 0.06,
        getDesc: (tier) => `+${formatPct(tier * 6)}% Accuracy`,
        x: 0.8, y: 0.7,
        prerequisites: ['utility_core'],
        tier: 2
    },
    // Tier 3
    {
        id: 'double_tap',
        name: 'Double Tap',
        description: '4% chance to fire twice per tier.',
        icon: '🔫',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [2, 4, 7, 12, 20],
        getValue: (tier) => tier * 0.04,
        getDesc: (tier) => `${formatPct(tier * 4)}% Double Shot`,
        x: 1.1, y: 0.2,
        prerequisites: ['magnetic_field'],
        tier: 3
    },
    {
        id: 'piercing_shots',
        name: 'Piercing',
        description: 'Projectiles pierce through 1 additional enemy every 2 tiers.',
        icon: '➡️',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [2, 4, 8, 14, 22],
        getValue: (tier) => Math.floor(tier / 2),
        getDesc: (tier) => `+${Math.floor(tier / 2)} Pierce`,
        x: 1.1, y: 0.5,
        prerequisites: ['magnetic_field', 'smart_targeting'],
        tier: 3
    },
    {
        id: 'time_dilation',
        name: 'Time Dilation',
        description: 'Slows enemy spawn rate by 4% per tier.',
        icon: '⏱️',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => 1 + (tier * 0.04),
        getDesc: (tier) => `${formatPct(100 - tier * 4)}% Spawn Rate`,
        x: 1.1, y: 0.8,
        prerequisites: ['smart_targeting'],
        tier: 3
    },
    // Tier 4
    {
        id: 'explosive_rounds',
        name: 'Explosive',
        description: '6% chance for explosions dealing 40% splash damage per tier.',
        icon: '💥',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => tier * 0.06,
        getDesc: (tier) => `${formatPct(tier * 6)}% Explosion`,
        x: 1.4, y: 0.3,
        prerequisites: ['double_tap'],
        tier: 4
    },
    {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        description: 'Projectiles chain to 1 nearby enemy every 2 tiers.',
        icon: '⚡',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [3, 6, 10, 16, 25],
        getValue: (tier) => Math.floor(tier / 2),
        getDesc: (tier) => `+${Math.floor(tier / 2)} Chain`,
        x: 1.4, y: 0.6,
        prerequisites: ['piercing_shots'],
        tier: 4
    },
    {
        id: 'wildcards',
        name: 'Wildcards',
        description: 'Start with 1 free random upgrade every 2 tiers.',
        icon: '🎲',
        branch: 'utility',
        maxTier: 5,
        tierCosts: [4, 8, 14, 22, 32],
        getValue: (tier) => Math.floor((tier + 1) / 2),
        getDesc: (tier) => `+${Math.floor((tier + 1) / 2)} Free Upgrades`,
        x: 1.4, y: 0.9,
        prerequisites: ['time_dilation'],
        tier: 4
    },
    // Tier 5
    {
        id: 'quantum_stability',
        name: 'Quantum Core',
        description: 'CAPSTONE: -4% all costs, -3% all cooldowns per tier.',
        icon: '🔮',
        branch: 'utility',
        maxTier: 3,
        tierCosts: [10, 20, 35],
        getValue: (tier) => ({ cost: 1 - tier * 0.04, cd: 1 - tier * 0.03 }),
        getDesc: (tier) => `${formatPct(100 - tier * 4)}% Cost, ${formatPct(100 - tier * 3)}% CD`,
        x: 1.8, y: 0.6,
        prerequisites: ['explosive_rounds', 'chain_lightning', 'wildcards'],
        isCapstone: true,
        tier: 5
    }
];

const SKILL_TREE_NODES = [
    ...COMBAT_NODES,
    ...DEFENSE_NODES,
    ...ECONOMY_NODES,
    ...UTILITY_NODES
];

const CENTRAL_CORE = {
    id: 'central_core',
    name: 'Core Nexus',
    description: 'The heart of your power. Unlock to access all skill branches.',
    icon: '💠',
    branch: 'core',
    maxTier: 1,
    tierCosts: [0],
    tierEffects: [1],
    getValue: (tier) => tier,
    getDesc: (tier) => 'Unlock All Branches',
    x: 0, y: 0,
    prerequisites: [],
    isCentral: true
};

Object.freeze(SKILL_TREE_NODES);
Object.freeze(CENTRAL_CORE);
Object.freeze(SKILL_TREE_BRANCHES);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SKILL_TREE_BRANCHES,
        SKILL_TREE_NODES,
        CENTRAL_CORE,
        getTierCost
    };
}
