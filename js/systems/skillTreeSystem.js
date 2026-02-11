/**
 * Skill Tree System
 * Manages skill tree state, purchases, prerequisite checking, and effect calculation
 */

// Global skill tree state
let skillTreeState = null;

/**
 * Initialize the skill tree system
 * Call this during game initialization
 */
function initSkillTreeSystem() {
    // Create initial state with all nodes at tier 0
    skillTreeState = {};
    
    // Initialize all nodes at tier 0
    SKILL_TREE_NODES.forEach(node => {
        skillTreeState[node.id] = {
            id: node.id,
            tier: 0,
            unlocked: node.prerequisites.length === 0 // Core nodes are unlocked
        };
    });
    
    // Central core is always unlocked and at tier 1
    skillTreeState['central_core'] = {
        id: 'central_core',
        tier: 1,
        unlocked: true
    };
    
    console.log('Skill tree system initialized with', SKILL_TREE_NODES.length, 'nodes');
    return skillTreeState;
}

/**
 * Get the current state of the skill tree
 */
function getSkillTreeState() {
    if (!skillTreeState) {
        initSkillTreeSystem();
    }
    return skillTreeState;
}

/**
 * Get a specific node's current tier
 */
function getNodeTier(nodeId) {
    const state = getSkillTreeState();
    return state[nodeId]?.tier || 0;
}

/**
 * Check if prerequisites are met for a node
 */
function checkPrerequisites(nodeId) {
    const node = SKILL_TREE_NODES.find(n => n.id === nodeId);
    if (!node) return false;
    
    const state = getSkillTreeState();
    
    // Check all prerequisites
    return node.prerequisites.every(prereqId => {
        const prereq = state[prereqId];
        // Prerequisite is met if it's unlocked and at least tier 1
        return prereq && prereq.unlocked && prereq.tier > 0;
    });
}

/**
 * Check if a node can be purchased
 */
function canPurchaseNode(nodeId, prestigeCurrency) {
    const node = SKILL_TREE_NODES.find(n => n.id === nodeId);
    const state = getSkillTreeState();
    const nodeState = state[nodeId];
    
    if (!node || !nodeState) return { canBuy: false, reason: 'Node not found' };
    if (nodeState.tier >= node.maxTier) return { canBuy: false, reason: 'Max tier reached' };
    
    // Check prerequisites
    if (!checkPrerequisites(nodeId)) {
        return { canBuy: false, reason: 'Prerequisites not met' };
    }
    
    // Check cost
    const nextTier = nodeState.tier + 1;
    const cost = node.tierCosts[nextTier - 1];
    
    if (prestigeCurrency < cost) {
        return { canBuy: false, reason: `Need ${cost} Bytes` };
    }
    
    return { canBuy: true, cost, nextTier };
}

/**
 * Purchase a node tier
 * Returns the cost if successful, null if failed
 */
function purchaseNode(nodeId, gameState) {
    const check = canPurchaseNode(nodeId, gameState.prestigeCurrency);
    
    if (!check.canBuy) {
        console.log('Cannot purchase:', check.reason);
        return null;
    }
    
    const state = getSkillTreeState();
    const nodeState = state[nodeId];
    
    // Deduct currency
    gameState.prestigeCurrency -= check.cost;
    
    // Increase tier
    nodeState.tier = check.nextTier;
    nodeState.unlocked = true;
    
    // Unlock connected nodes that now have prerequisites met
    unlockConnectedNodes();
    
    console.log(`Purchased ${nodeId} tier ${check.nextTier} for ${check.cost} Bytes`);
    return check.cost;
}

/**
 * Unlock nodes whose prerequisites are now met
 */
function unlockConnectedNodes() {
    const state = getSkillTreeState();
    
    SKILL_TREE_NODES.forEach(node => {
        if (!state[node.id].unlocked && checkPrerequisites(node.id)) {
            state[node.id].unlocked = true;
            console.log('Unlocked node:', node.id);
        }
    });
}

/**
 * Get all effects from purchased nodes
 * This aggregates all skill tree bonuses
 */
function getSkillTreeEffects() {
    const state = getSkillTreeState();
    const effects = {
        // Combat
        allDamageMult: 1,
        clickDamage: 0,
        turretDamage: 0,
        critChance: 0,
        fireRateMult: 1,
        multishotBonus: 0,
        executeDamage: 0,
        omegaDamage: 0,
        omegaCritDamage: 0,
        
        // Defense
        maxHPBonus: 0,
        hpRegen: 0,
        regenMultiplier: 1,
        damageReduction: 1, // Multiplier (0.9 = 10% reduction)
        freezeDurationMult: 1,
        emergencyHeal: 0,
        lifesteal: 0,
        shieldCooldown: 10,
        immortalHP: 0,
        immortalDR: 0,
        
        // Economy
        startingBits: 0,
        bitGainMult: 1,
        creditGainMult: 1,
        compoundInterest: 0,
        prestigeGainMult: 1,
        prismDropBonus: 0,
        shardDropBonus: 0,
        eliteRewardMult: 1,
        goldenCurrencyMult: 1,
        eliteSpawnMult: 1,
        
        // Utility
        xpGainMult: 1,
        pickupRangeMult: 1,
        accuracy: 0,
        doubleTapChance: 0,
        explosionChance: 0,
        spawnRateMult: 1,
        wildcardUpgrades: 0,
        quantumCostMult: 1,
        quantumCDMult: 1
    };
    
    // Apply all node effects
    SKILL_TREE_NODES.forEach(node => {
        const nodeState = state[node.id];
        if (!nodeState || nodeState.tier === 0) return;
        
        const tier = nodeState.tier;
        const value = node.getValue(tier);
        
        switch (node.id) {
            // Combat
            case 'combat_core':
                effects.allDamageMult += value;
                break;
            case 'pulse_strength':
                effects.clickDamage += value;
                break;
            case 'turret_power':
                effects.turretDamage += value;
                break;
            case 'critical_focus':
                effects.critChance += value;
                break;
            case 'rapid_fire':
                effects.fireRateMult *= value;
                break;
            case 'multishot_expansion':
                effects.multishotBonus += (tier > 1 ? 1 : 0);
                break;
            case 'executioner':
                effects.executeDamage += value;
                break;
            case 'omega_strike':
                effects.omegaDamage += value.dmg;
                effects.omegaCritDamage += value.critDmg;
                effects.allDamageMult += value.dmg;
                break;
                
            // Defense
            case 'defense_core':
                effects.maxHPBonus += value;
                break;
            case 'nano_repair':
                effects.hpRegen += value;
                break;
            case 'regeneration_boost':
                effects.regenMultiplier *= value;
                break;
            case 'hardened_plating':
                effects.damageReduction *= value;
                break;
            case 'cryo_enhancement':
                effects.freezeDurationMult *= value;
                break;
            case 'emergency_shield':
                effects.emergencyHeal += value;
                break;
            case 'vampiric_core':
                effects.lifesteal += value;
                break;
            case 'adaptive_armor':
                effects.shieldCooldown = value;
                break;
            case 'immortal_matrix':
                effects.immortalHP += value.hp;
                effects.immortalDR += value.dr;
                effects.maxHPBonus += value.hp * 100; // Convert percentage to flat
                effects.damageReduction *= (1 - value.dr);
                break;
                
            // Economy
            case 'economy_core':
                effects.startingBits += value;
                break;
            case 'bit_mining':
                effects.bitGainMult *= value;
                break;
            case 'credit_optimization':
                effects.creditGainMult *= value;
                break;
            case 'compound_interest':
                effects.compoundInterest += value;
                break;
            case 'prestige_efficiency':
                effects.prestigeGainMult *= value;
                break;
            case 'rare_affinity':
                effects.prismDropBonus += value.prism;
                effects.shardDropBonus += value.shard;
                break;
            case 'bounty_hunter':
                effects.eliteRewardMult *= value;
                break;
            case 'golden_empire':
                effects.goldenCurrencyMult *= value.currency;
                effects.eliteSpawnMult *= value.elite;
                effects.bitGainMult *= value.currency;
                effects.creditGainMult *= value.currency;
                break;
                
            // Utility
            case 'utility_core':
                effects.xpGainMult *= value;
                break;
            case 'magnetic_field':
                effects.pickupRangeMult *= value;
                break;
            case 'smart_targeting':
                effects.accuracy += value;
                break;
            case 'double_tap':
                effects.doubleTapChance += value;
                break;
            case 'explosive_rounds':
                effects.explosionChance += value;
                break;
            case 'time_dilation':
                effects.spawnRateMult *= value;
                break;
            case 'wildcards':
                effects.wildcardUpgrades += value;
                break;
            case 'quantum_stability':
                effects.quantumCostMult *= value.cost;
                effects.quantumCDMult *= value.cd;
                break;
        }
    });
    
    return effects;
}

/**
 * Get total Bytes spent in skill tree
 */
function getTotalSpentBytes() {
    const state = getSkillTreeState();
    let total = 0;
    
    SKILL_TREE_NODES.forEach(node => {
        const nodeState = state[node.id];
        if (nodeState && nodeState.tier > 0) {
            // Sum up costs for each tier purchased
            for (let i = 0; i < nodeState.tier; i++) {
                total += node.tierCosts[i];
            }
        }
    });
    
    return total;
}

/**
 * Get skill tree save data
 */
function getSkillTreeSaveData() {
    const state = getSkillTreeState();
    return Object.values(state).map(node => ({
        id: node.id,
        tier: node.tier,
        unlocked: node.unlocked
    }));
}

/**
 * Load skill tree from save data
 */
function loadSkillTreeSaveData(data) {
    if (!data || !Array.isArray(data)) {
        console.log('No skill tree save data to load');
        return;
    }
    
    // Initialize fresh state
    initSkillTreeSystem();
    
    const state = getSkillTreeState();
    
    // Load saved data
    data.forEach(saved => {
        if (state[saved.id]) {
            state[saved.id].tier = saved.tier || 0;
            state[saved.id].unlocked = saved.unlocked || false;
        }
    });
    
    // Re-check and unlock any nodes that should be unlocked
    unlockConnectedNodes();
    
    console.log('Skill tree loaded:', data.length, 'nodes');
}

/**
 * Reset the skill tree (for testing or full reset)
 */
function resetSkillTree() {
    initSkillTreeSystem();
    console.log('Skill tree reset');
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSkillTreeSystem,
        getSkillTreeState,
        getNodeTier,
        checkPrerequisites,
        canPurchaseNode,
        purchaseNode,
        getSkillTreeEffects,
        getTotalSpentBytes,
        getSkillTreeSaveData,
        loadSkillTreeSaveData,
        resetSkillTree
    };
}
