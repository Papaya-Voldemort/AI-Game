/**
 * Input Handler
 * Manages user input for the game
 */

function initInput(canvas, handleClick) {
    canvas.addEventListener('pointerdown', handleClick);
}

function handleInputClick(e, canvas, state, enemies) {
    if (state.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;
    
    // Check for enemy hits (iterate backwards for proper layering)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.markedForDeletion) continue;
        
        // Use expanded hitbox for easier clicking
        if (pointInExpandedCircle(clickX, clickY, enemy.x, enemy.y, enemy.size, 30)) {
            const dmgInfo = getDamage('click', upgrades);
            const killed = hitEnemy(enemy, dmgInfo, floaters);
            
            if (killed) {
                const leveledUp = onEnemyKill(enemy, state);
                if (leveledUp) {
                    handleLevelUp(state);
                }
            }
            
            hit = true;
            if (typeof coreRecoil !== 'undefined') {
                coreRecoil = 5;
            }
            break; 
        }
    }

    if (!hit) {
        // Miss visual
        if (typeof floaters !== 'undefined' && typeof FloatingText !== 'undefined') {
            floaters.push(new FloatingText(clickX, clickY, 'miss', '#555', 12));
        }
    }
}
