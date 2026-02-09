/**
 * Upgrade System
 * Handles purchasing and applying upgrades
 */

function buyUpgrade(upgrade, state) {
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
    
    if (state.money >= cost) {
        state.money -= cost;
        upgrade.count++;
        
        // Update max HP if Core Shield was upgraded
        if (upgrade.id === 'maxHp') {
            const newMax = upgrade.getVal(upgrade.count);
            state.maxCoreHp = newMax;
        }
        
        return true;
    }
    
    return false;
}

function canAffordUpgrade(upgrade, state) {
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
    return state.money >= cost;
}

function isUpgradeMaxed(upgrade) {
    return upgrade.max && upgrade.count >= upgrade.max;
}

function getUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
}
