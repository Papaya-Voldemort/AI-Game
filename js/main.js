/**
 * MAIN GAME ORCHESTRATOR
 * Coordinates all game systems and manages the main game loop
 * 
 * Dependencies (must be loaded first):
 * - js/data/config.js (CONFIG)
 * - js/data/upgrades.js (UPGRADES)
 * - js/data/enemyTypes.js
 * - js/engine/*.js (Enemy, Projectile, Particle, Star, FloatingText, Shockwave)
 * - js/systems/*.js (gameState, combat, spawner, upgradeSystem)
 * - js/utils/*.js (helpers, collision, particles)
 * - js/input.js
 */

// ============================================================================
// GLOBAL GAME STATE & ARRAYS
// ============================================================================

let state = null;
let upgrades = null;

// Game entity arrays
let enemies = [];
let projectiles = [];
let particles = [];
let floaters = [];
let stars = [];
let shockwaves = [];

// Canvas & rendering
let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let spawnDistance = 800;

// Game timers & animations
let autoFireTimer = 0;
let shakeAmount = 0;
let regenTimer = 0;
let coreRecoil = 0;
let coreAngle = 0;
let closestEnemy = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the entire game
 */
function initGame() {
    console.log('Initializing game...');
    
    // Setup canvas
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d', { alpha: false });
    canvas.style.cursor = CONFIG.CANVAS_CURSOR || 'crosshair';
    
    // Initialize game state
    const stateData = initGameState(CONFIG, UPGRADES);
    state = stateData.state;
    upgrades = stateData.upgrades;
    
    // Setup resize handling
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Initialize background stars
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push(new Star(width, height));
    }
    
    // Setup input handlers
    canvas.addEventListener('pointerdown', handleCanvasClick);
    
    // Setup UI event handlers
    setupUIHandlers();
    
    // Initial UI render
    updateUI();
    renderCards();
    
    // Start game loop
    console.log('Starting game loop...');
    requestAnimationFrame(gameLoop);
}

/**
 * Handle window resize
 */
function handleResize() {
    const container = document.getElementById('game-container');
    width = canvas.width = container.offsetWidth;
    height = canvas.height = container.offsetHeight;
    spawnDistance = Math.min(width, 1000);
}

/**
 * Setup UI event handlers
 */
function setupUIHandlers() {
    // Prestige button
    const prestigeBtn = document.getElementById('prestige-btn');
    if (prestigeBtn) {
        prestigeBtn.onclick = handlePrestige;
    }
    
    // Modal button (set dynamically in showModal)
}

// ============================================================================
// MAIN GAME LOOP
// ============================================================================

/**
 * Main game loop - runs every frame
 */
function gameLoop(timestamp) {
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;

    if (state.isPlaying) {
        update(dt);
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

/**
 * Update all game logic
 */
function update(dt) {
    if (state.gameOver) return;

    // Update background stars
    stars.forEach(s => s.update(dt, width, height));

    // Update spawner system
    updateSpawner(dt, state, enemies, height, spawnDistance, upgrades);

    // Track closest enemy for turret targeting
    updateClosestEnemy();

    // Handle auto-fire system
    updateAutoFire(dt);

    // Handle regeneration
    updateRegen(dt);

    // Update core animations
    updateCoreAnimations(dt);

    // Update all entities
    updateEntities(dt);

    // Cleanup deleted entities
    cleanupEntities();
}

/**
 * Find the closest enemy for targeting
 */
function updateClosestEnemy() {
    let minDist = Infinity;
    closestEnemy = null;
    
    enemies.forEach(e => {
        if (e.x < minDist && !e.markedForDeletion) {
            minDist = e.x;
            closestEnemy = e;
        }
    });
}

/**
 * Handle auto-fire turret system
 */
function updateAutoFire(dt) {
    const turretLvl = upgrades.find(u => u.id === 'autoDmg').count;
    if (turretLvl <= 0) return;

    const speedUpgrade = upgrades.find(u => u.id === 'autoSpeed');
    const fireRate = speedUpgrade.getVal(speedUpgrade.count);
    
    autoFireTimer -= dt;
    
    if (autoFireTimer <= 0 && enemies.length > 0) {
        const multiU = upgrades.find(u => u.id === 'multishot');
        const targetCount = multiU.getVal(multiU.count);

        // Sort enemies by distance (closest first)
        const sortedEnemies = [...enemies]
            .filter(e => !e.markedForDeletion)
            .sort((a, b) => a.x - b.x);
        
        let shot = false;
        for (let i = 0; i < Math.min(targetCount, sortedEnemies.length); i++) {
            projectiles.push(new Projectile(sortedEnemies[i], true, height, upgrades));
            shot = true;
        }

        if (shot) {
            autoFireTimer = fireRate;
            coreRecoil = 8;
            shakeScreen(2);
        }
    }
}

/**
 * Handle health regeneration
 */
function updateRegen(dt) {
    const regenU = upgrades.find(u => u.id === 'regen');
    const regenLvl = regenU.count;
    
    if (regenLvl > 0 && state.coreHp < state.maxCoreHp) {
        regenTimer += dt;
        if (regenTimer > CONFIG.REGEN_TICK_RATE) {
            const amount = regenU.getVal(regenLvl);
            state.coreHp = Math.min(state.maxCoreHp, state.coreHp + amount);
            updateHpBar();
            regenTimer = 0;
        }
    }
}

/**
 * Update core visual animations
 */
function updateCoreAnimations(dt) {
    if (coreRecoil > 0) {
        coreRecoil -= dt * 0.1;
    }
    coreAngle += dt * 0.001;
}

/**
 * Update all game entities
 */
function updateEntities(dt) {
    enemies.forEach(e => e.update(dt, height, enemies, floaters, shockwaves, takeDamage));
    projectiles.forEach(p => p.update(dt, enemies, particles, shockwaves, upgrades, floaters, onProjectileHit));
    particles.forEach(p => p.update(dt));
    floaters.forEach(f => f.update(dt));
    shockwaves.forEach(s => s.update(dt));
}

/**
 * Called when projectile hits an enemy
 */
function onProjectileHit(enemy, projectile) {
    const killed = onEnemyKill(enemy, state);
    if (killed) {
        handleLevelUp();
    }
}

/**
 * Handle level up events
 */
function handleLevelUp() {
    document.getElementById('level-display').innerText = state.level;
    
    if (state.level % 5 === 0) {
        showNotification(`⚠️ WAVE ${state.level} DETECTED ⚠️`);
    } else {
        showNotification(`WAVE ${state.level}`);
    }
    
    // Unlock prestige system at level 25
    if (state.level === 25) {
        const prestigeBtn = document.getElementById('prestige-btn');
        const prestigeDisplay = document.getElementById('prestige-currency-display');
        if (prestigeBtn) prestigeBtn.style.display = 'block';
        if (prestigeDisplay) prestigeDisplay.style.display = 'block';
        showNotification("REBOOT SYSTEM ONLINE");
    }
    
    updateUI();
}

/**
 * Remove entities marked for deletion
 */
function cleanupEntities() {
    enemies = enemies.filter(e => !e.markedForDeletion);
    projectiles = projectiles.filter(p => !p.markedForDeletion);
    particles = particles.filter(p => !p.markedForDeletion);
    floaters = floaters.filter(f => !f.markedForDeletion);
    shockwaves = shockwaves.filter(s => !s.markedForDeletion);
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the entire game scene
 */
function draw() {
    // Clear screen
    ctx.clearRect(0, 0, width, height);

    // Apply screen shake
    ctx.save();
    if (shakeAmount > 0) {
        const dx = (Math.random() - 0.5) * shakeAmount;
        const dy = (Math.random() - 0.5) * shakeAmount;
        ctx.translate(dx, dy);
        shakeAmount *= 0.9;
        if (shakeAmount < 0.5) shakeAmount = 0;
    }

    // Draw background stars
    stars.forEach(s => s.draw(ctx));

    // Draw the core (player turret)
    drawCore();

    // Draw spawn line indicator
    drawSpawnLine();

    // Draw all game entities (layered)
    shockwaves.forEach(s => s.draw(ctx));
    projectiles.forEach(p => p.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    floaters.forEach(f => f.draw(ctx));

    ctx.restore();
}

/**
 * Draw the player's core/turret
 */
function drawCore() {
    const coreX = 50 - Math.max(0, coreRecoil);
    const coreY = height / 2;
    
    // Outer shield ring
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 45, coreAngle, coreAngle + Math.PI * 1.5);
    ctx.stroke();
    
    // Inner rotating ring
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 35, -coreAngle * 2, -coreAngle * 2 + Math.PI);
    ctx.stroke();

    // Turret barrel (points at closest enemy)
    ctx.save();
    ctx.translate(coreX, coreY);
    let angle = 0;
    if (closestEnemy) {
        angle = Math.atan2(closestEnemy.y - coreY, closestEnemy.x - coreX);
    }
    ctx.rotate(angle);
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillRect(0, -4, 40 - coreRecoil, 8);
    ctx.restore();

    // Main core sphere
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner glow (pulsing)
    const time = Date.now() / 300;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(coreX, coreY, 15 + Math.sin(time) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

/**
 * Draw spawn line indicator
 */
function drawSpawnLine() {
    if (width > spawnDistance + 50) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.moveTo(spawnDistance + 40, 0);
        ctx.lineTo(spawnDistance + 40, height);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ============================================================================
// GAME LOGIC & EVENTS
// ============================================================================

/**
 * Handle damage to the core
 */
function takeDamage(amount) {
    state.coreHp -= amount;
    updateHpBar();
    shakeScreen(15);
    
    // Screen flash effect
    const container = document.getElementById('game-container');
    if (container) {
        container.style.boxShadow = 'inset 0 0 100px rgba(255,0,0,0.4)';
        setTimeout(() => container.style.boxShadow = 'none', 100);
    }

    if (state.coreHp <= 0) {
        gameOver();
    }
}

/**
 * Handle game over state
 */
function gameOver() {
    state.gameOver = true;
    state.isPlaying = false;
    
    showModal(
        'CRITICAL FAILURE',
        `Wave Reached: ${state.level}`,
        'REBOOT SYSTEM',
        () => resetRun(false)
    );
}

/**
 * Reset the game run
 */
function resetRun(isPrestige) {
    if (isPrestige) {
        const earned = Math.floor(state.level / 5);
        state.prestigeCurrency += earned;
        
        const display = document.getElementById('prestige-currency-display');
        if (display) {
            display.innerText = state.prestigeCurrency + " BYTES";
        }
        
        showNotification(`REBOOT COMPLETE. +${earned * 25}% SYS POWER.`);
    }

    // Reset state
    state.money = 0;
    state.level = 1;
    state.coreHp = state.maxCoreHp;
    state.spawnRate = 1500;
    state.enemiesKilled = 0;
    state.spawnTimer = 0;
    state.gameOver = false;
    state.isPlaying = true;
    
    // Clear all entities
    enemies = [];
    projectiles = [];
    particles = [];
    floaters = [];
    shockwaves = [];
    
    // Reset upgrades
    upgrades.forEach(u => u.count = 0);
    
    // Reset timers
    autoFireTimer = 0;
    regenTimer = 0;
    coreRecoil = 0;
    
    // Update UI
    updateUI();
    updateHpBar();
    renderCards();
    
    // Hide modal
    const modal = document.getElementById('modal-overlay');
    if (modal) {
        modal.style.display = 'none';
    }
    
    handleResize();
}

// ============================================================================
// UI MANAGEMENT
// ============================================================================

/**
 * Update all UI elements
 */
function updateUI() {
    updateMoney();
    updateHpBar();
    
    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) {
        levelDisplay.innerText = state.level;
    }
}

/**
 * Update money display
 */
function updateMoney() {
    const moneyDisplay = document.getElementById('money-display');
    if (moneyDisplay) {
        moneyDisplay.innerText = format(state.money);
    }
    renderCards();
}

/**
 * Update HP bar
 */
function updateHpBar() {
    const pct = Math.max(0, (state.coreHp / state.maxCoreHp) * 100);
    const bar = document.getElementById('core-hp-bar');
    if (bar) {
        bar.style.width = pct + '%';
    }
}

/**
 * Show notification message
 */
function showNotification(text) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;
    
    const el = document.createElement('div');
    el.className = 'notification';
    el.innerText = text;
    notificationArea.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

/**
 * Show modal dialog
 */
function showModal(title, msg, btnText, action) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-msg');
    const modalBtn = document.getElementById('modal-btn');
    
    if (!modalOverlay || !modalTitle || !modalMsg || !modalBtn) return;
    
    modalTitle.innerText = title;
    modalMsg.innerText = msg;
    modalBtn.innerText = btnText;
    modalBtn.onclick = action;
    modalOverlay.style.display = 'flex';
}

/**
 * Render upgrade cards
 */
function renderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;
    
    container.innerHTML = '';

    upgrades.forEach(u => {
        const currentCost = getUpgradeCost(u);
        const canAfford = canAffordUpgrade(u, state);
        const isMaxed = isUpgradeMaxed(u);

        const card = document.createElement('div');
        card.className = `card ${(!canAfford || isMaxed) ? 'disabled' : ''}`;
        
        const html = `
            <div class="lvl-badge">Lvl ${u.count}</div>
            <div class="card-icon">${u.icon}</div>
            <div class="card-details">
                <div class="card-title">${u.name}</div>
                <div class="card-stat">${u.desc(u.getVal(u.count), getPrestigeMult(state))}</div>
            </div>
            <div class="card-cost">${isMaxed ? 'MAX' : format(currentCost)}</div>
        `;
        
        card.innerHTML = html;

        if (canAfford && !isMaxed) {
            card.onpointerdown = (e) => {
                e.preventDefault();
                handleBuyUpgrade(u);
            };
        }

        container.appendChild(card);
    });
}

/**
 * Handle upgrade purchase
 */
function handleBuyUpgrade(upgrade) {
    const success = buyUpgrade(upgrade, state);
    if (success) {
        updateUI();
    }
}

// ============================================================================
// INPUT HANDLERS
// ============================================================================

/**
 * Handle canvas clicks
 */
function handleCanvasClick(e) {
    if (state.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;
    
    // Check for enemy hits (iterate backwards for proper layering)
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.markedForDeletion) continue;
        
        // Expanded hitbox for easier clicking
        const hitboxExpansion = 30;
        if (clickX >= enemy.x - enemy.size - hitboxExpansion && 
            clickX <= enemy.x + enemy.size + hitboxExpansion &&
            clickY >= enemy.y - enemy.size - hitboxExpansion &&
            clickY <= enemy.y + enemy.size + hitboxExpansion) {
            
            // Get damage and hit enemy
            const dmgInfo = getDamage('click', upgrades, state);
            const killed = hitEnemy(enemy, dmgInfo, floaters);
            
            if (killed) {
                const leveledUp = onEnemyKill(enemy, state);
                if (leveledUp) {
                    handleLevelUp();
                }
                updateMoney();
            }
            
            hit = true;
            coreRecoil = 5;
            break;
        }
    }

    if (!hit) {
        // Miss visual
        floaters.push(new FloatingText(clickX, clickY, 'miss', '#555', 12));
    }
}

/**
 * Handle prestige button click
 */
function handlePrestige() {
    const message = `INITIATE SYSTEM REBOOT?\n\n- Resets Current Run\n- +25% Power per 5 Waves Cleared`;
    if (confirm(message)) {
        resetRun(true);
    }
}

// ============================================================================
// START THE GAME
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
