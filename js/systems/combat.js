/**
 * Combat System
 * Handles damage calculation and enemy hits
 */

function getDamage(source, upgrades) {
    const prestigeMult = getPrestigeMult();
    let val = 0;
    let isCrit = false;

    if (source === 'click') {
        const u = upgrades.find(x => x.id === 'clickDmg');
        val = u.getVal(u.count);
    } else {
        const u = upgrades.find(x => x.id === 'autoDmg');
        val = u.getVal(u.count);
    }

    const critU = upgrades.find(x => x.id === 'critChance');
    const chance = critU.getVal(critU.count);
    if (Math.random() * 100 < chance) {
        val *= CONFIG.CRIT_DAMAGE_MULTIPLIER; 
        isCrit = true;
    }

    val *= prestigeMult;
    return { damage: val, isCrit };
}

function hitEnemy(enemy, damageInfo, floaters) {
    let { damage, isCrit } = damageInfo;
    
    // Apply armor reduction
    if (enemy.armor > 0) {
        damage = Math.max(1, damage - enemy.armor);
        if (damage === 1 && !isCrit) {
            createParticles(enemy.x, enemy.y, '#888', 2);
        }
    }

    enemy.hp -= damage;
    enemy.hitFlash = 3; // Flash white for 3 frames
    
    // Create damage number
    const txtColor = isCrit ? '#ff00ff' : '#fff';
    const txtSize = isCrit ? 26 : 18;
    const txt = isCrit ? 'CRIT!' : format(damage);
    floaters.push(new FloatingText(enemy.x, enemy.y - 25, txt, txtColor, txtSize));
    
    // Check if enemy died
    if (enemy.hp <= 0) {
        enemy.markedForDeletion = true;
        createExplosion(enemy.x, enemy.y, 10, enemy.color);
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
