/**
 * Combat System
 * Handles damage calculation and enemy hits
 */

function getDamage(source, upgrades, gameState) {
    const resolvedUpgrades = upgrades || (typeof window !== 'undefined' ? window.upgrades : null);
    const resolvedState = gameState || (typeof window !== 'undefined' ? window.state : null);
    if (!resolvedUpgrades) {
        return { damage: 0, isCrit: false };
    }
    const prestigeMult = getPrestigeMult(resolvedState);
    let val = 0;
    let isCrit = false;

    if (source === 'click') {
        const u = resolvedUpgrades.find(x => x.id === 'clickDmg');
        val = u.getVal(u.count);
    } else {
        const u = resolvedUpgrades.find(x => x.id === 'autoDmg');
        val = u.getVal(u.count);
    }

    // Apply permanent upgrades influence (if available)
    const perms = (typeof permUpgrades !== 'undefined') ? permUpgrades : [];

    // Add permanent click bonus (flat)
    if (source === 'click') {
        const clickPerm = perms.find(p => p.id === 'clickBonus');
        if (clickPerm) {
            val += clickPerm.getVal(clickPerm.count);
        }
    }

    // Apply permanent turret multiplier
    if (source === 'auto') {
        const autoPerm = perms.find(p => p.id === 'autoDmgPerm');
        if (autoPerm) {
            val *= (1 + autoPerm.getVal(autoPerm.count));
        }
    }

    // Crit calculation (includes permanent critChancePerm and skill tree)
    const critU = resolvedUpgrades.find(x => x.id === 'critChance');
    let chance = critU.getVal(critU.count);
    const critPerm = perms.find(p => p.id === 'critChancePerm');
    if (critPerm) {
        chance += critPerm.getVal(critPerm.count);
    }
    
    // Add skill tree crit chance
    const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
    if (skillEffects && skillEffects.critChance > 0) {
        chance += skillEffects.critChance;
    }

    if (Math.random() * 100 < chance) {
        val *= CONFIG.CRIT_DAMAGE_MULTIPLIER; 
        isCrit = true;
    }

    val *= prestigeMult;
    
    // Apply skill tree damage multipliers
    if (skillEffects) {
        // All damage multiplier
        if (skillEffects.allDamageMult && skillEffects.allDamageMult !== 1) {
            val *= skillEffects.allDamageMult;
        }
        
        // Click damage bonus
        if (source === 'click' && skillEffects.clickDamage > 0) {
            val += skillEffects.clickDamage;
        }
        
        // Turret damage bonus
        if (source === 'auto' && skillEffects.turretDamage > 0) {
            val += skillEffects.turretDamage;
        }
        
        // Crit damage multiplier from omega strike
        if (isCrit && skillEffects.omegaCritDamage > 0) {
            val *= (1 + skillEffects.omegaCritDamage);
        }
        
        // Double tap chance (for auto attacks)
        if (source === 'auto' && skillEffects.doubleTapChance > 0) {
            // This will be handled by the auto-fire system
        }
    }
    
    return { damage: val, isCrit };
}

function hitEnemy(enemy, damageInfo, floaters) {
    let { damage, isCrit } = damageInfo;
    
    // Epic boss shield check - 50% damage reduction when shield is active
    if (enemy.type === 'epic_boss' && enemy.shieldActive) {
        damage = Math.floor(damage * 0.5);
        // Shield hit visual
        if (typeof createParticles === 'function') {
            createParticles(enemy.x, enemy.y, '#00ffff', 3);
        }
        // Show "SHIELDED" text occasionally
        if (Math.random() < 0.3) {
            floaters.push(new FloatingText(enemy.x, enemy.y - 40, 'SHIELDED!', '#00ffff', 14));
        }
    }
    
    // Apply armor reduction
    if (enemy.armor > 0) {
        damage = Math.max(1, damage - enemy.armor);
        if (damage === 1 && !isCrit) {
            createParticles(enemy.x, enemy.y, '#888', 2);
        }
    }

    enemy.hp -= damage;
    enemy.hitFlash = 3; // Flash white for 3 frames
    
    // Apply skill tree lifesteal
    const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
    if (skillEffects && skillEffects.lifesteal > 0) {
        const healAmount = damage * skillEffects.lifesteal;
        if (typeof window !== 'undefined' && window.state && window.state.coreHp < window.state.maxCoreHp) {
            window.state.coreHp = Math.min(window.state.maxCoreHp, window.state.coreHp + healAmount);
            // Update HP bar if function exists
            if (typeof updateHpBar === 'function') {
                updateHpBar();
            }
        }
    }
    
    // Create damage number
    const txtColor = isCrit ? '#ff00ff' : '#fff';
    const txtSize = isCrit ? 26 : 18;
    const txt = isCrit ? 'CRIT!' : format(damage);
    floaters.push(new FloatingText(enemy.x, enemy.y - 25, txt, txtColor, txtSize));
    
    // Check if enemy died
    if (enemy.hp <= 0 && !enemy.isDying) {
        enemy.startDeathAnimation();
        createExplosion(enemy.x, enemy.y, 15, enemy.color);
        return true; // Enemy killed
    }
    
    return false; // Enemy still alive
}

function applyFreezeEffect(enemy, upgrades) {
    const freezeU = upgrades.find(u => u.id === 'freeze');
    const freezePct = freezeU.getVal(freezeU.count);
    
    if (freezePct > 0) {
        enemy.frozen = 1000; // 1 second freeze
        enemy.speed = enemy.baseSpeed * (1 - freezePct / 100);
    }
}
