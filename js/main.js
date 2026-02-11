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
let nebula = null;
let collectibles = []; // Rare currency drops

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

// UI throttling to prevent aggressive updates
let lastCardRenderTime = 0;
const CARD_RENDER_THROTTLE = 250; // Only render cards every 250ms max
let pendingCardRender = false;

// UI & screen state
let ui = {};
let pendingCredits = 0;
let currentUpgradeOfferIds = [];

const CORE_UPGRADE_IDS = ['clickDmg', 'autoDmg', 'autoSpeed', 'maxHp'];

let adaptiveState = {
    paceBonus: 1,
    pressure: 0
};

const AudioEngine = {
    enabled: false,
    initialized: false,
    ctx: null,
    ambientGain: null,
    combatGain: null,
    ambianceOsc: null,
    pulseLfo: null,
    pulseGain: null,

    init() {
        if (this.initialized) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('WebAudio not supported in this browser');
            return;
        }

        this.ctx = new AudioContextClass();

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0;
        this.ambientGain.connect(this.ctx.destination);

        this.combatGain = this.ctx.createGain();
        this.combatGain.gain.value = 0;
        this.combatGain.connect(this.ctx.destination);

        this.ambianceOsc = this.ctx.createOscillator();
        this.ambianceOsc.type = 'triangle';
        this.ambianceOsc.frequency.value = 58;

        this.pulseLfo = this.ctx.createOscillator();
        this.pulseLfo.type = 'sine';
        this.pulseLfo.frequency.value = 0.22;

        this.pulseGain = this.ctx.createGain();
        this.pulseGain.gain.value = 7;

        this.pulseLfo.connect(this.pulseGain);
        this.pulseGain.connect(this.ambianceOsc.frequency);
        this.ambianceOsc.connect(this.ambientGain);

        this.ambianceOsc.start();
        this.pulseLfo.start();

        this.initialized = true;
    },

    setEnabled(value) {
        this.init();
        if (!this.initialized) {
            this.enabled = false;
            return false;
        }

        this.enabled = value;
        if (this.enabled && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        this.ambientGain.gain.cancelScheduledValues(now);
        this.combatGain.gain.cancelScheduledValues(now);
        this.ambientGain.gain.linearRampToValueAtTime(this.enabled ? 0.05 : 0, now + 0.25);
        this.combatGain.gain.linearRampToValueAtTime(0, now + 0.12);
        return this.enabled;
    },

    updateIntensity() {
        if (!this.initialized || !this.enabled || !state || !state.isPlaying || state.isPaused) return;

        const now = this.ctx.currentTime;
        const hpRatio = state.maxCoreHp > 0 ? state.coreHp / state.maxCoreHp : 1;
        const danger = Math.max(0, 1 - hpRatio);
        const enemyPressure = Math.min(1, enemies.length / 24);
        const levelPressure = Math.min(1, state.level / 60);
        const intensity = Math.min(1, 0.18 + enemyPressure * 0.5 + levelPressure * 0.4 + danger * 0.7);

        this.ambientGain.gain.cancelScheduledValues(now);
        this.combatGain.gain.cancelScheduledValues(now);
        this.ambientGain.gain.linearRampToValueAtTime(0.04 + (1 - danger) * 0.03, now + 0.4);
        this.combatGain.gain.linearRampToValueAtTime(0.01 + intensity * 0.09, now + 0.12);
    },

    stopCombatLayer() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        this.combatGain.gain.cancelScheduledValues(now);
        this.combatGain.gain.linearRampToValueAtTime(0, now + 0.18);
    },

    beep(freq, durationMs, gain, type = 'sine') {
        if (!this.initialized || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const beepGain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;

        const now = this.ctx.currentTime;
        beepGain.gain.value = 0;
        beepGain.gain.linearRampToValueAtTime(gain, now + 0.01);
        beepGain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

        osc.connect(beepGain);
        beepGain.connect(this.combatGain);

        osc.start(now);
        osc.stop(now + durationMs / 1000 + 0.02);
    },

    shot() {
        this.beep(440 + Math.random() * 120, 90, 0.32, 'square');
    },

    hit() {
        this.beep(180 + Math.random() * 80, 120, 0.28, 'triangle');
    },

    kill() {
        this.beep(620 + Math.random() * 90, 130, 0.35, 'sawtooth');
    },

    damage() {
        this.beep(95, 180, 0.4, 'square');
    },

    wave(level) {
        const steps = [420, 560, 700];
        steps.forEach((freq, i) => {
            setTimeout(() => this.beep(freq + level * 1.5, 150, 0.24, 'triangle'), i * 90);
        });
    }
};

function toggleAudio() {
    const nextValue = !AudioEngine.enabled;
    const isEnabled = AudioEngine.setEnabled(nextValue);
    updateAudioToggleUI();
    showNotification(isEnabled ? 'Audio Reactor Online' : 'Audio Reactor Offline');
}

function updateAudioToggleUI() {
    if (!ui.audioToggleBtn) return;
    ui.audioToggleBtn.classList.toggle('is-on', AudioEngine.enabled);
    ui.audioToggleBtn.innerText = AudioEngine.enabled ? '🔊' : '🔇';
}

function updateAdaptiveDifficulty() {
    const settings = CONFIG.ADAPTIVE_DIFFICULTY;
    const hpRatio = state.maxCoreHp > 0 ? state.coreHp / state.maxCoreHp : 1;
    const dangerRateBoost = hpRatio < settings.DANGER_HP_THRESHOLD ? settings.DANGER_RATE_BOOST : 0;
    const underLevelGrace = Math.max(0, CONFIG.EARLY_GAME_GRACE_LEVELS - state.level) * 0.05;
    const momentum = Math.min(0.35, Math.max(0, state.level - 10) * settings.MOMENTUM_BONUS_PER_LEVEL);

    adaptiveState.pressure = Math.max(0, Math.min(1, (enemies.length / 20) + (1 - hpRatio) * 0.55));

    const desiredPace = 1 + underLevelGrace + dangerRateBoost - momentum;
    adaptiveState.paceBonus += (desiredPace - adaptiveState.paceBonus) * 0.08;
    adaptiveState.paceBonus = Math.max(settings.MIN_RATE_MULT, Math.min(settings.MAX_RATE_MULT, adaptiveState.paceBonus));
}

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

    // Initialize skin system
    initSkinSystem();

    // Initialize skill tree system
    initSkillTreeSystem();

    // Initialize permanent upgrades (clone template)
    permUpgrades = PERM_UPGRADES.map(p => ({ ...p }));

    // Ensure perm-upgrades container shows initial placeholders (6 slots)
    const permContainer = document.getElementById('permanent-upgrades');
    if (permContainer) {
        // Prepare empty slots for consistent layout
        permContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'placeholder-card perm-card';
            slot.innerHTML = `<div style="opacity:0.35">Locked</div>`;
            permContainer.appendChild(slot);
        }
    }

    cacheUI();
    setupScreenHandlers();

    // Load persistent save (perm upgrades, credits, prestige) before offering anything
    // This also handles skin unlocks and equipped skin
    loadPersistent();
    
    // Now try to equip skin after loading (which resets unlocks)
    if (state.equippedSkin) {
        const equipped = getSkinSystem().equipSkin(state.equippedSkin);
        if (!equipped) {
            // Skin is locked, fallback to default
            state.equippedSkin = 'default';
            getSkinSystem().equipSkin('default');
        }
    }

    // Autosave on page unload/visibility change
    window.addEventListener('beforeunload', savePersistent);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') savePersistent(); });

    setUpgradeOffer();
    
    // Setup resize handling
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Initialize particle engine (object pool)
    ParticleEngine.init(512);
    
    // Initialize background stars
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push(new Star(width, height));
    }
    
    // Initialize nebula background
    nebula = new Nebula(width, height);
    
    // Setup input handlers
    canvas.addEventListener('pointerdown', handleCanvasClick);
    
    // Setup UI event handlers
    setupUIHandlers();
    updateAudioToggleUI();
    
    // Initial UI render
    updateUI();
    updateManagementUI();
    renderCards();

    // Start at management screen
    showManagementScreen({ fromRun: false });

    state.lastTime = performance.now();
    
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
    
    // Update nebula size
    if (nebula) {
        nebula.width = width;
        nebula.height = height;
    }
}

function cacheUI() {
    ui = {
        gameplayScreen: document.getElementById('gameplay-screen'),
        managementScreen: document.getElementById('management-screen'),
        pauseOverlay: document.getElementById('pause-overlay'),
        pauseBtn: document.getElementById('pause-btn'),
        audioToggleBtn: document.getElementById('audio-toggle-btn'),
        resumeBtn: document.getElementById('resume-btn'),
        toManagementBtn: document.getElementById('to-management-btn'),
        restartBtn: document.getElementById('restart-btn'),
        startRunBtn: document.getElementById('start-run-btn'),
        creditsValue: document.getElementById('credits-value'),
        prestigeValue: document.getElementById('prestige-value'),
        lastWaveValue: document.getElementById('last-wave-value'),
        lastCreditsValue: document.getElementById('last-credits-value'),
        coinBurstLayer: document.getElementById('coin-burst-layer')
    };
}

function setupScreenHandlers() {
    if (ui.pauseOverlay) {
        ui.pauseOverlay.addEventListener('click', (event) => {
            if (event.target === ui.pauseOverlay) {
                resumeGame();
            }
        });
    }
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

    if (ui.pauseBtn) {
        ui.pauseBtn.onclick = togglePause;
    }

    if (ui.audioToggleBtn) {
        ui.audioToggleBtn.onclick = toggleAudio;
    }

    if (ui.resumeBtn) {
        ui.resumeBtn.onclick = resumeGame;
    }

    if (ui.toManagementBtn) {
        ui.toManagementBtn.onclick = abandonRunToManagement;
    }

    if (ui.restartBtn) {
        ui.restartBtn.onclick = () => startRun(true);
    }

    if (ui.startRunBtn) {
        ui.startRunBtn.onclick = () => startRun(false);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (isGameplayActive()) {
                togglePause();
            }
        }
    });
    
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

    if (state.isPlaying && !state.isPaused) {
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

    // Update nebula background
    if (nebula) {
        nebula.update(dt);
    }

    // Adaptive pacing: ease early game and flex difficulty based on pressure
    updateAdaptiveDifficulty();

    // Update spawner system
    updateSpawner(dt, state, enemies, height, spawnDistance, upgrades, adaptiveState.paceBonus);

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

    // Dynamic soundtrack reacts to pressure and danger
    AudioEngine.updateIntensity();
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
 * Handle auto-fire turret system - with skin support
 */
function updateAutoFire(dt) {
    const turretLvl = upgrades.find(u => u.id === 'autoDmg').count;
    if (turretLvl <= 0) return;

    const speedUpgrade = upgrades.find(u => u.id === 'autoSpeed');
    let fireRate = speedUpgrade.getVal(speedUpgrade.count);
    
    // Apply skin fire rate multiplier
    if (typeof getSkinSystem === 'function') {
        fireRate *= getSkinSystem().getFireRateMultiplier();
    }
    
    // Apply skill tree fire rate multiplier
    const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
    if (skillEffects && skillEffects.fireRateMult) {
        fireRate *= skillEffects.fireRateMult;
    }
    
    autoFireTimer -= dt;
    
    if (autoFireTimer <= 0 && enemies.length > 0) {
        const multiU = upgrades.find(u => u.id === 'multishot');
        const targetCount = multiU.getVal(multiU.count);

        // Sort enemies by distance (closest first)
        const sortedEnemies = [...enemies]
            .filter(e => !e.markedForDeletion)
            .sort((a, b) => a.x - b.x);
        
        let shot = false;
        const skinSys = typeof getSkinSystem === 'function' ? getSkinSystem() : null;
        
        for (let i = 0; i < Math.min(targetCount, sortedEnemies.length); i++) {
            if (skinSys) {
                // Use skin system to create projectiles with special attack patterns
                const projConfigs = skinSys.createProjectiles(sortedEnemies[i], true, height, upgrades);
                projConfigs.forEach(config => {
                    const proj = new Projectile(config.target, config.isAuto, config.canvasHeight, config.upgrades);
                    // Apply skin-specific properties
                    if (config.yOffset) proj.y += config.yOffset;
                    if (config.damageMult) proj.damageMult = config.damageMult;
                    if (config.colors) proj.colors = config.colors;
                    if (config.speed) proj.speed = config.speed;
                    if (config.piercing) {
                        proj.piercing = true;
                        proj.pierceCount = config.pierceCount;
                        proj.piercedEnemies = [];
                        proj.damageDecay = config.damageDecay;
                    }
                    if (config.charged) {
                        proj.charged = true;
                        proj.blastRadius = config.blastRadius;
                        proj.size *= config.sizeMult || 1;
                    }
                    if (config.bouncing) {
                        proj.bouncing = true;
                        proj.bounceCount = config.bounceCount;
                        proj.bounceRange = config.bounceRange;
                        proj.bouncesLeft = config.bounceCount;
                    }
                    if (config.splitConfig) {
                        proj.splitConfig = config.splitConfig;
                        proj.hasSplit = false;
                    }
                    projectiles.push(proj);
                });
            } else {
                // Standard projectile
                projectiles.push(new Projectile(sortedEnemies[i], true, height, upgrades));
            }
            shot = true;
        }

        if (shot) {
            autoFireTimer = fireRate;
            coreRecoil = 8;
            shakeScreen(2);
            AudioEngine.shot();
        }
    }
}

/**
 * Handle health regeneration
 */
function updateRegen(dt) {
    const regenU = upgrades.find(u => u.id === 'regen');
    const regenLvl = regenU.count;
    
    if (state.coreHp < state.maxCoreHp) {
        regenTimer += dt;
        if (regenTimer > CONFIG.REGEN_TICK_RATE) {
            const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
            let totalRegen = 0.5; // Base regeneration: 0.5 HP/s
            
            // Add upgrade regen
            if (regenLvl > 0) {
                totalRegen += regenU.getVal(regenLvl);
            }
            
            // Add skill tree regen
            if (skillEffects && skillEffects.hpRegen > 0) {
                totalRegen += skillEffects.hpRegen;
            }
            
            // Apply regeneration boost when below 50% HP
            if (skillEffects && skillEffects.regenMultiplier > 1 && state.coreHp / state.maxCoreHp < 0.5) {
                totalRegen *= skillEffects.regenMultiplier;
            }
            
            state.coreHp = Math.min(state.maxCoreHp, state.coreHp + totalRegen);
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
    projectiles.forEach(p => p.update(dt, enemies, width));
    ParticleEngine.update(dt);
    floaters.forEach(f => f.update(dt));
    shockwaves.forEach(s => s.update(dt));
    
    // Update collectibles (rare currency)
    if (typeof Collectible !== 'undefined') {
        const skinSys = getSkinSystem();
        skinSys.updateOrbitals(dt, enemies, projectiles, 50, height / 2);
        updateCollectibles(dt, collectibles, 50, height / 2, state);
    }
}

/**
 * Called when projectile hits an enemy
 */
function onProjectileHit(enemy, projectile) {
    AudioEngine.hit();
    const killed = onEnemyKill(enemy, state);
    if (killed) {
        AudioEngine.kill();
        handleLevelUp();
    }
}

/**
 * Handle level up events
 */
function handleLevelUp() {
    document.getElementById('level-display').innerText = state.level;
    AudioEngine.wave(state.level);
    
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
 * Remove entities marked for deletion (zero-allocation swap-and-pop)
 * Instead of .filter() which creates a new array every frame,
 * this removes dead items in-place by swapping with the last live item.
 */
function _compact(arr) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
        if (!arr[read].markedForDeletion) {
            if (write !== read) arr[write] = arr[read];
            write++;
        }
    }
    arr.length = write;
}

function cleanupEntities() {
    _compact(enemies);
    _compact(projectiles);
    // Particles are managed by ParticleEngine pool -- drain any legacy dummy objects
    if (particles.length > 0) particles.length = 0;
    _compact(floaters);
    _compact(shockwaves);
    _compact(collectibles);
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render the entire game scene
 */
function draw() {
    // Clear screen with slight fade for trail effect
    ctx.fillStyle = 'rgba(5, 5, 10, 0.3)';
    ctx.fillRect(0, 0, width, height);
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

    // Draw nebula background (behind everything)
    if (nebula) {
        nebula.draw(ctx);
    }

    // Draw background stars
    stars.forEach(s => s.draw(ctx));

    // Draw spawn line indicator
    drawSpawnLine();

    // Draw grid effect for depth
    drawBackgroundGrid();

    // Draw all game entities in proper z-order
    // 1. Shockwaves (background effects)
    shockwaves.forEach(s => s.draw(ctx));
    
    // 2. Projectiles
    projectiles.forEach(p => p.draw(ctx));
    
    // 3. Particles (behind enemies for depth) - optimized engine
    ParticleEngine.draw(ctx, width, height);
    
    // 4. Enemies
    enemies.forEach(e => e.draw(ctx));
    
    // 5. Collectibles (rare currency)
    if (typeof drawCollectibles === 'function') {
        drawCollectibles(ctx, collectibles);
    }
    
    // 6. The core (player turret)
    drawCore();
    
    // 7. Orbital satellites (if skin has them)
    if (typeof getSkinSystem === 'function') {
        getSkinSystem().drawOrbitals(ctx, 50, height / 2);
    }
    
    // 8. Floaters (on top)
    floaters.forEach(f => f.draw(ctx));

    ctx.restore();
}

/**
 * Draw subtle background grid for depth perception
 */
function drawBackgroundGrid() {
    const gridSize = 120;
    const offset = (state.lastTime / 60) % gridSize;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    
    // Vertical lines only (cleaner look)
    for (let x = 0; x < width + gridSize; x += gridSize) {
        const parallaxX = x - offset;
        ctx.beginPath();
        ctx.moveTo(parallaxX, 0);
        ctx.lineTo(parallaxX, height);
        ctx.stroke();
    }
    
    ctx.restore();
}

/**
 * Draw the player's core/turret - IMPROVED DESIGN with Skin Support
 * Uses GlowCache pre-rendered textures instead of ctx.shadowBlur
 */
function drawCore() {
    const coreX = 50 - Math.max(0, coreRecoil);
    const coreY = height / 2;
    const time = state.lastTime / 1000;
    const hpPercent = state.coreHp / state.maxCoreHp;
    
    // Get skin colors if available
    let skinColors = null;
    if (typeof getSkinSystem === 'function') {
        skinColors = getSkinSystem().getCurrentColors();
    }
    
    // Color based on health - smoother transitions
    // Override with skin colors if healthy (> 30% HP)
    let coreColor, glowColor, secondaryColor;
    if (skinColors && hpPercent > 0.3) {
        coreColor = skinColors.primary;
        glowColor = skinColors.glow;
        secondaryColor = skinColors.secondary;
    } else if (hpPercent > 0.6) {
        coreColor = '#00ffff';
        glowColor = '#00ffff';
        secondaryColor = '#0088ff';
    } else if (hpPercent > 0.3) {
        coreColor = '#ffaa00';
        glowColor = '#ff8800';
        secondaryColor = '#ff6600';
    } else {
        coreColor = '#ff0055';
        glowColor = '#ff0044';
        secondaryColor = '#ff0022';
    }
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Outer pulsing aura - optimized
    const auraPulse = Math.sin(time * 2) * 0.15 + 0.85;
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.08 * auraPulse;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 65 + Math.sin(time * 3) * 5, 0, 6.2832);
    ctx.fill();
    
    // Secondary aura ring
    ctx.globalAlpha = 0.12 * auraPulse;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 55, 0, 6.2832);
    ctx.fill();
    
    // Rotating shield rings - optimized
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 2;
    
    // Outer shield ring
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 48, coreAngle, coreAngle + Math.PI * 1.7);
    ctx.stroke();
    
    // Middle shield ring (opposite rotation)
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 38, -coreAngle * 1.5 + Math.PI, -coreAngle * 1.5 + 6.2832);
    ctx.stroke();
    
    // Inner rotating hexagon pattern
    ctx.globalAlpha = 0.4;
    ctx.save();
    ctx.translate(coreX, coreY);
    ctx.rotate(coreAngle * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 6.2832;
        const r = 30;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    
    // Turret barrel - improved design (GlowCache replaces shadowBlur)
    ctx.save();
    ctx.translate(coreX, coreY);
    let aimAngle = 0;
    if (closestEnemy) {
        aimAngle = Math.atan2(closestEnemy.y - coreY, closestEnemy.x - coreX);
    }
    ctx.rotate(aimAngle);
    
    // Barrel glow (pre-rendered texture)
    const barrelGlow = GlowCache.get(coreColor, 20);
    ctx.drawImage(barrelGlow, 20 - barrelGlow.width / 2, -barrelGlow.height / 2);
    
    // Main barrel
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(5, -5, 45 - coreRecoil, 10);
    
    // Barrel detail lines
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, -2, 35 - coreRecoil, 4);
    
    // Barrel tip glow (pre-rendered texture)
    ctx.globalAlpha = 1;
    const tipGlow = GlowCache.get('#ffffff', 15);
    const tipX = 51 - coreRecoil;
    ctx.drawImage(tipGlow, tipX - tipGlow.width / 2, -tipGlow.height / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(48 - coreRecoil, -3, 6, 6);
    
    ctx.restore();
    
    // Main core body - layered design (GlowCache replaces shadowBlur)
    const coreGlow = GlowCache.get(glowColor, 35);
    ctx.drawImage(coreGlow, coreX - coreGlow.width / 2, coreY - coreGlow.height / 2);
    
    // Outer core ring
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 26, 0, 6.2832);
    ctx.stroke();
    
    // Core background
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 24, 0, 6.2832);
    ctx.fill();
    
    // Inner energy ring
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 18, -coreAngle * 2, -coreAngle * 2 + Math.PI * 1.5);
    ctx.stroke();
    
    // Pulsing inner core (GlowCache replaces shadowBlur)
    const pulseSize = 12 + Math.sin(time * 4) * 3;
    const innerGlow = GlowCache.get(coreColor, 25);
    ctx.drawImage(innerGlow, coreX - innerGlow.width / 2, coreY - innerGlow.height / 2);
    ctx.fillStyle = coreColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(coreX, coreY, pulseSize, 0, 6.2832);
    ctx.fill();
    
    // Bright center core (GlowCache replaces shadowBlur)
    const centerGlow = GlowCache.get('#ffffff', 20);
    ctx.drawImage(centerGlow, coreX - centerGlow.width / 2, coreY - centerGlow.height / 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 7, 0, 6.2832);
    ctx.fill();
    
    // Energy particles around core (minimal, GlowCache replaces shadowBlur)
    ctx.fillStyle = coreColor;
    const orbGlow = GlowCache.get(coreColor, 10);
    for (let i = 0; i < 4; i++) {
        const angle = time * 2 + (i / 4) * 6.2832;
        const r = 32 + Math.sin(time * 3 + i) * 3;
        const px = coreX + Math.cos(angle) * r;
        const py = coreY + Math.sin(angle) * r;
        ctx.globalAlpha = 0.6 + Math.sin(time * 4 + i) * 0.3;
        ctx.drawImage(orbGlow, px - orbGlow.width / 2, py - orbGlow.height / 2);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, 6.2832);
        ctx.fill();
    }
    
    // Low health warning - optimized (GlowCache replaces shadowBlur)
    if (hpPercent <= 0.3) {
        const warningPulse = Math.sin(time * 6) * 0.4 + 0.6;
        const warnGlow = GlowCache.get('#ff0000', 25);
        ctx.drawImage(warnGlow, coreX - warnGlow.width / 2, coreY - warnGlow.height / 2);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.globalAlpha = warningPulse * 0.7;
        ctx.beginPath();
        ctx.arc(coreX, coreY, 40 + warningPulse * 8, 0, 6.2832);
        ctx.stroke();
        
        // Secondary warning ring
        ctx.globalAlpha = warningPulse * 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coreX, coreY, 48 + warningPulse * 5, 0, 6.2832);
        ctx.stroke();
    }
    
    ctx.restore();
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
    const oldHp = state.coreHp;
    state.coreHp -= amount;
    updateHpBar();
    
    // Enhanced screen shake based on damage severity
    const shakeIntensity = Math.min(25, 10 + amount * 0.5);
    shakeScreen(shakeIntensity);
    
    // Enhanced screen flash effect with fade out
    const container = document.getElementById('game-container');
    if (container) {
        const flashIntensity = Math.min(0.8, 0.3 + amount * 0.02);
        container.style.boxShadow = `inset 0 0 150px rgba(255,0,0,${flashIntensity})`;
        container.style.transition = 'box-shadow 0.3s ease-out';
        setTimeout(() => {
            container.style.boxShadow = 'none';
        }, 150);
    }
    
    // Create damage particles at core position
    if (typeof createExplosion === 'function') {
        const coreY = height / 2;
        createExplosion(50, coreY, 20, '#ff0055');
    }
    
    // Show floating damage text
    if (typeof FloatingText !== 'undefined' && typeof floaters !== 'undefined') {
        const coreY = height / 2;
        floaters.push(new FloatingText(80, coreY, `-${Math.floor(amount)}`, '#ff0055', 24));
    }
    
    // Core recoil effect
    coreRecoil = Math.min(20, 8 + amount * 0.3);
    AudioEngine.damage();

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
    state.isPaused = false;

    state.lastRunWave = state.level;
    state.lastRunCredits = calculateRunCredits();
    pendingCredits = state.lastRunCredits;
    
    showManagementScreen({ fromRun: true });
}

/**
 * Reset the game run
 */
function resetRun(isPrestige) {
    if (isPrestige) {
        // Calculate prestige gain with skill tree bonuses
        const earned = typeof calculatePrestigeGain === 'function' 
            ? calculatePrestigeGain(state) 
            : Math.floor(state.level / 5);
        state.prestigeCurrency += earned;
        
        const display = document.getElementById('prestige-currency-display');
        if (display) {
            display.innerText = state.prestigeCurrency + " BYTES";
        }
        
        showNotification(`REBOOT COMPLETE. +${earned} BYTES EARNED.`);
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
    state.isPaused = false;
    
    // Clear all entities
    enemies = [];
    projectiles = [];
    particles = [];
    ParticleEngine.clear();
    floaters = [];
    shockwaves = [];
    
    // Reset upgrades
    upgrades.forEach(u => u.count = 0);

    setUpgradeOffer();
    
    // Reset timers
    autoFireTimer = 0;
    regenTimer = 0;
    coreRecoil = 0;
    adaptiveState.paceBonus = 1;
    adaptiveState.pressure = 0;
    
    // Reset card render flag
    isInitialCardRender = true;
    lastCardRenderTime = 0;
    pendingCardRender = false;
    
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

function isGameplayActive() {
    return ui.gameplayScreen && ui.gameplayScreen.classList.contains('is-active');
}

function setActiveScreen(screen) {
    if (ui.gameplayScreen) {
        ui.gameplayScreen.classList.toggle('is-active', screen === 'gameplay');
    }
    if (ui.managementScreen) {
        ui.managementScreen.classList.toggle('is-active', screen === 'management');
    }
}

function showGameplayScreen() {
    if (ui.pauseOverlay) {
        ui.pauseOverlay.classList.remove('is-visible');
        ui.pauseOverlay.setAttribute('aria-hidden', 'true');
    }
    setActiveScreen('gameplay');
}

function showManagementScreen({ fromRun }) {
    state.isPlaying = false;
    state.isPaused = false;
    if (ui.pauseOverlay) {
        ui.pauseOverlay.classList.remove('is-visible');
        ui.pauseOverlay.setAttribute('aria-hidden', 'true');
    }
    setActiveScreen('management');
    updateManagementUI();
    AudioEngine.stopCombatLayer();

    if (fromRun && pendingCredits > 0) {
        const creditsToCollect = pendingCredits;
        pendingCredits = 0;
        requestAnimationFrame(() => triggerCoinCollection(creditsToCollect));
    }
}

function startRun(isRestart) {
    resetRun(false);
    pendingCredits = 0;

    // Apply permanent starting bits if any
    const startU = permUpgrades.find(u => u.id === 'startBits');
    if (startU && startU.count > 0) {
        const bonus = startU.getVal(startU.count);
        state.money += bonus;
        showNotification(`+${bonus} Bits (seed funds)`);
    }

    // Apply skill tree effects
    const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
    if (skillEffects) {
        // Starting Bits from skill tree
        if (skillEffects.startingBits > 0) {
            state.money += skillEffects.startingBits;
            showNotification(`+${skillEffects.startingBits} Bits (skill tree)`);
        }
        
        // Apply wildcards (free random upgrades)
        if (skillEffects.wildcardUpgrades > 0) {
            for (let i = 0; i < skillEffects.wildcardUpgrades; i++) {
                // Pick a random upgrade and give it 1 level
                const randomUpgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
                if (randomUpgrade) {
                    randomUpgrade.count++;
                    showNotification(`Wildcard: ${randomUpgrade.name} +1`);
                }
            }
        }
    }

    if (isRestart) {
        showNotification('RUN RESTARTED');
    }
    showNotification('Adaptive Threat Analysis Active');
    state.isPlaying = true;
    state.isPaused = false;
    state.gameOver = false;
    state.lastTime = performance.now();
    
    // Reset card render flag for new run
    isInitialCardRender = true;
    
    showGameplayScreen();
    handleResize();
    updateUI();
}

function pauseGame() {
    if (!state.isPlaying || state.gameOver || state.isPaused) return;
    state.isPaused = true;
    AudioEngine.stopCombatLayer();
    if (ui.pauseOverlay) {
        ui.pauseOverlay.classList.add('is-visible');
        ui.pauseOverlay.setAttribute('aria-hidden', 'false');
    }
}

function resumeGame() {
    if (!state.isPaused) return;
    state.isPaused = false;
    state.lastTime = performance.now();
    if (ui.pauseOverlay) {
        ui.pauseOverlay.classList.remove('is-visible');
        ui.pauseOverlay.setAttribute('aria-hidden', 'true');
    }
}

function togglePause() {
    if (state.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function abandonRunToManagement() {
    state.isPlaying = false;
    state.isPaused = false;
    state.gameOver = true;
    state.lastRunWave = state.level;
    state.lastRunCredits = 0;
    pendingCredits = 0;
    showManagementScreen({ fromRun: false });
}

function updateManagementUI() {
    if (ui.creditsValue) {
        ui.creditsValue.innerText = format(state.credits);
    }
    if (ui.prestigeValue) {
        ui.prestigeValue.innerText = format(state.prestigeCurrency);
    }
    if (ui.lastWaveValue) {
        ui.lastWaveValue.innerText = state.lastRunWave;
    }
    if (ui.lastCreditsValue) {
        ui.lastCreditsValue.innerText = format(state.lastRunCredits);
    }

    // Update permanent upgrades visual
    renderPermanentUpgrades();
    
    // Update rare currency display
    updateRareCurrencyUI();
    
    // Update skins display
    renderSkinsUI();
    
    // Update skill tree points display
    updateSkillTreePointsUI();
}

/**
 * Update skill tree points spent display
 */
function updateSkillTreePointsUI() {
    const pointsDisplay = document.getElementById('skill-tree-points');
    if (pointsDisplay && typeof getTotalSpentBytes === 'function') {
        const spent = getTotalSpentBytes();
        pointsDisplay.textContent = `${spent} Spent`;
    }
}

/**
 * Update rare currency UI display
 */
function updateRareCurrencyUI() {
    const prismsValue = document.getElementById('prisms-value');
    const shardsValue = document.getElementById('shards-value');
    
    if (prismsValue) {
        prismsValue.innerText = state.prisms || 0;
    }
    if (shardsValue) {
        shardsValue.innerText = state.shards || 0;
    }
}

/**
 * Try to buy a skin
 */
function tryBuySkin(skin) {
    const skinSys = getSkinSystem();
    
    // Check if already unlocked
    if (skin.unlocked) {
        skinSys.equipSkin(skin.id);
        state.equippedSkin = skin.id;
        savePersistent();
        renderSkinsUI();
        showNotification(`Equipped: ${skin.name}`);
        return;
    }
    
    // Check if can afford
    let canAfford = false;
    let currencyName = '';
    
    if (skin.priceType === 'free') {
        canAfford = true;
        currencyName = 'FREE';
    } else if (skin.priceType === 'prisms') {
        canAfford = (state.prisms || 0) >= skin.price;
        currencyName = 'PRISMS';
    } else if (skin.priceType === 'shards') {
        // Epic skins need both shards and prisms
        const hasShards = (state.shards || 0) >= skin.price;
        const hasPrisms = skin.secondaryPrice ? (state.prisms || 0) >= skin.secondaryPrice : true;
        canAfford = hasShards && hasPrisms;
        currencyName = skin.secondaryPrice ? 'SHARDS + PRISMS' : 'SHARDS';
    } else if (skin.priceType === 'credits') {
        canAfford = state.credits >= skin.price;
        currencyName = 'CR';
    } else if (skin.priceType === 'bytes') {
        canAfford = state.prestigeCurrency >= skin.price;
        currencyName = 'BYTES';
    }
    
    if (canAfford) {
        // Deduct currency
        if (skin.priceType === 'prisms') {
            state.prisms = (state.prisms || 0) - skin.price;
        } else if (skin.priceType === 'shards') {
            state.shards = (state.shards || 0) - skin.price;
            if (skin.secondaryPrice) {
                state.prisms = (state.prisms || 0) - skin.secondaryPrice;
            }
        } else if (skin.priceType === 'credits') {
            state.credits -= skin.price;
        } else if (skin.priceType === 'bytes') {
            state.prestigeCurrency -= skin.price;
        }
        
        // Unlock and equip
        skinSys.unlockSkin(skin.id);
        skinSys.equipSkin(skin.id);
        state.equippedSkin = skin.id;
        savePersistent();
        renderSkinsUI();
        updateManagementUI();
        showNotification(`Unlocked: ${skin.name}`);
    } else {
        // Show message that skin costs currency
        showNotification(`Need: ${skin.price} ${currencyName}`);
    }
}

/**
 * Render skins UI in management screen
 */
function renderSkinsUI() {
    const container = document.getElementById('core-skins');
    const currentSkinName = document.getElementById('current-skin-name');
    const skinDetailName = document.getElementById('skin-detail-name');
    const skinDetailDesc = document.getElementById('skin-detail-desc');
    const skinAttackType = document.getElementById('skin-attack-type');
    const skinPreview = document.getElementById('skin-preview');
    
    if (!container || typeof getSkinSystem !== 'function') return;
    
    const skinSys = getSkinSystem();
    const currentSkin = skinSys.getCurrentSkin();
    const allSkins = skinSys.getAllSkins();
    
    // Update current skin indicator
    if (currentSkinName) {
        currentSkinName.innerText = currentSkin.name;
        currentSkinName.style.color = skinSys.getRarityColor(currentSkin.rarity);
    }
    
    // Update skin details
    if (skinDetailName) {
        skinDetailName.innerText = currentSkin.name;
        skinDetailName.style.color = skinSys.getRarityColor(currentSkin.rarity);
    }
    if (skinDetailDesc) {
        skinDetailDesc.innerText = currentSkin.description;
    }
    if (skinAttackType) {
        skinAttackType.innerText = skinSys.getAttackDescription();
    }
    if (skinPreview) {
        skinPreview.style.background = `radial-gradient(circle at 30% 30%, ${currentSkin.colors.primary}, transparent 70%)`;
        skinPreview.style.boxShadow = `0 0 40px ${currentSkin.colors.glow}80`;
        skinPreview.innerText = currentSkin.icon;
    }
    
    // Render skin cards
    container.innerHTML = '';
    allSkins.forEach((skin, index) => {
        const isEquipped = skin.id === currentSkin.id;
        const isUnlocked = skin.unlocked;
        
        const card = document.createElement('div');
        card.className = `skin-card rarity-${skin.rarity} ${isEquipped ? 'equipped' : ''} ${isUnlocked ? '' : 'locked'}`;
        card.style.animationDelay = `${index * 60}ms`;
        
        let priceDisplay;
        let currencyLabel;
        if (skin.priceType === 'shards' && skin.secondaryPrice) {
            currencyLabel = `${skin.price} SHARDS + ${skin.secondaryPrice} PRISMS`;
        } else if (skin.priceType === 'shards') {
            currencyLabel = `${skin.price} SHARDS`;
        } else if (skin.priceType === 'prisms') {
            currencyLabel = `${skin.price} PRISMS`;
        } else {
            currencyLabel = `${skin.price} ${skin.priceType.toUpperCase()}`;
        }
        
        if (!isUnlocked) {
            if (skin.price === 0 || skin.priceType === 'free') {
                priceDisplay = '<div class="skin-price">CLICK TO UNLOCK</div>';
            } else {
                priceDisplay = `<div class="skin-price locked-price">${currencyLabel}</div>`;
            }
        } else if (skin.price === 0 || skin.priceType === 'free') {
            priceDisplay = '<div class="skin-price">FREE</div>';
        } else {
            priceDisplay = `<div class="skin-price paid">${currencyLabel}</div>`;
        }
        
        card.innerHTML = `
            <div class="skin-icon">${skin.icon}</div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-rarity rarity-${skin.rarity}">${skin.rarity}</div>
            ${priceDisplay}
        `;
        
        if (isUnlocked) {
            card.onclick = () => {
                skinSys.equipSkin(skin.id);
                state.equippedSkin = skin.id;
                savePersistent();
                renderSkinsUI();
                showNotification(`Equipped: ${skin.name}`);
            };
        } else {
            // Locked skin - add buy button if it has a price
            card.onclick = () => {
                tryBuySkin(skin);
            };
        }
        
        container.appendChild(card);
    });
}

function setUpgradeOffer() {
    if (!upgrades || upgrades.length === 0) {
        currentUpgradeOfferIds = [];
        return;
    }

    // Ensure deterministic ordering for core ids (only first 4 core upgrades)
    const coreIds = CORE_UPGRADE_IDS.filter(id => upgrades.some(u => u.id === id)).slice(0, 4);
    const wildcardCandidates = upgrades.filter(u => !coreIds.includes(u.id));
    const wildcard = wildcardCandidates.length > 0
        ? wildcardCandidates[Math.floor(Math.random() * wildcardCandidates.length)]
        : null;

    currentUpgradeOfferIds = [...coreIds, wildcard ? wildcard.id : null].filter(Boolean);
}

function getOfferUpgrades() {
    if (!currentUpgradeOfferIds.length) {
        return upgrades;
    }

    const upgradeMap = new Map(upgrades.map(u => [u.id, u]));
    return currentUpgradeOfferIds.map(id => upgradeMap.get(id)).filter(Boolean);
}

// -----------------------------
// Permanent upgrades handling
// -----------------------------
let permUpgrades = [];

function renderPermanentUpgrades() {
    const container = document.getElementById('permanent-upgrades');
    if (!container) return;
    container.innerHTML = '';

    // Limit to 6 primary permanent upgrades (layout requirement)
    const list = permUpgrades.slice(0, 6);

    list.forEach((u, index) => {
        const cost = Math.floor(u.baseCost * Math.pow(u.costMult, u.count));
        const canBuy = state.credits >= cost && (!u.max || u.count < u.max);

        const card = document.createElement('div');
        card.className = `perm-card ${canBuy ? '' : 'disabled'}`;
        card.style.animationDelay = `${index * 60}ms`;
        card.style.animation = 'cardFadeInUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        card.style.opacity = '0';
        card.innerHTML = `
            <div class="perm-top">
                <div class="perm-icon">${u.icon}</div>
                <div class="perm-level">Lvl ${u.count}</div>
            </div>
            <div class="perm-body">
                <div class="perm-name">${u.name}</div>
                <div class="perm-desc">${u.desc(u.getVal(u.count))}</div>
            </div>
            <div class="perm-footer">
                <div class="perm-cost">${format(cost)} cr</div>
                <button class="perm-buy" ${canBuy ? '' : 'disabled'}>${canBuy ? 'BUY' : 'LOCK'}</button>
            </div>
        `;

        const buyBtn = card.querySelector('.perm-buy');
        if (canBuy && buyBtn) {
            buyBtn.onclick = () => {
                buyPermanentUpgrade(u);
                renderPermanentUpgrades();
                updateManagementUI();
            };
        }

        container.appendChild(card);
    });
}

function buyPermanentUpgrade(upgrade) {
    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.count));
    if (state.credits >= cost) {
        state.credits -= cost;
        upgrade.count++;
        showNotification(`PURCHASED: ${upgrade.name}`);
        savePersistent();
    }
}

function getPermanentCreditsMultiplier() {
    const multU = permUpgrades.find(u => u.id === 'creditsMult');
    let mult = 1 + (multU ? multU.getVal(multU.count) : 0);
    return mult;
}

// -----------------------------
// Save / Load persistent data
// -----------------------------
function savePersistent() {
    try {
        // Get unlocked skins
        const unlockedSkins = [];
        if (typeof getSkinSystem === 'function') {
            getSkinSystem().getAllSkins().forEach(s => {
                if (s.unlocked) unlockedSkins.push(s.id);
            });
        }
        
        const data = {
            credits: state.credits,
            prestigeCurrency: state.prestigeCurrency,
            prisms: state.prisms || 0,
            shards: state.shards || 0,
            equippedSkin: state.equippedSkin || 'default',
            unlockedSkins: unlockedSkins,
            perm: permUpgrades.map(u => ({ id: u.id, count: u.count })),
            skillTree: typeof getSkillTreeSaveData === 'function' ? getSkillTreeSaveData() : []
        };
        localStorage.setItem('neon_core_save_v2', JSON.stringify(data));
        
        // Also save to old key for backwards compatibility
        const oldData = {
            credits: state.credits,
            prestigeCurrency: state.prestigeCurrency,
            perm: permUpgrades.map(u => ({ id: u.id, count: u.count }))
        };
        localStorage.setItem('neon_core_save_v1', JSON.stringify(oldData));
    } catch (e) {
        console.warn('Save failed', e);
    }
}

function loadPersistent() {
    try {
        // Try to load v2 save first (with skins and rare currency)
        let raw = localStorage.getItem('neon_core_save_v2');
        let isV2 = true;
        
        // Fall back to v1 if v2 doesn't exist
        if (!raw) {
            raw = localStorage.getItem('neon_core_save_v1');
            isV2 = false;
        }
        
        if (!raw) return;
        const data = JSON.parse(raw);
        
        // Load basic data
        if (typeof data.credits === 'number') state.credits = data.credits;
        if (typeof data.prestigeCurrency === 'number') state.prestigeCurrency = data.prestigeCurrency;
        if (Array.isArray(data.perm)) {
            data.perm.forEach(p => {
                const match = permUpgrades.find(u => u.id === p.id);
                if (match && typeof p.count === 'number') match.count = p.count;
            });
        }
        
        // Load v2 specific data
        if (isV2) {
            if (typeof data.prisms === 'number') state.prisms = data.prisms;
            if (typeof data.shards === 'number') state.shards = data.shards;
            
            // Reset skin unlocks - only keep default skin unlocked
            // This ensures users pay the new prices for premium skins
            if (typeof getSkinSystem === 'function') {
                // Only default skin remains unlocked
                getSkinSystem().unlockSkin('default');
            }
            // Always ensure default-unlocked skins from SKINS array are unlocked
            if (typeof getSkinSystem === 'function') {
                SKINS.forEach(skin => {
                    if (skin.unlocked) {
                        getSkinSystem().unlockSkin(skin.id);
                    }
                });
            }
            
            // Try to equip saved skin, fallback to default if locked
            if (typeof data.equippedSkin === 'string') {
                if (typeof getSkinSystem === 'function') {
                    const equipped = getSkinSystem().equipSkin(data.equippedSkin);
                    if (equipped) {
                        state.equippedSkin = data.equippedSkin;
                    } else {
                        // Skin is locked, default to default skin
                        state.equippedSkin = 'default';
                        getSkinSystem().equipSkin('default');
                    }
                }
            }
            
            // Load skill tree data
            if (Array.isArray(data.skillTree) && typeof loadSkillTreeSaveData === 'function') {
                loadSkillTreeSaveData(data.skillTree);
            }
        }
        
        showNotification('Save loaded');
    } catch (e) {
        console.warn('Load failed', e);
    }
}




function calculateRunCredits() {
    const perWave = Math.floor(Math.random() * 5) + 3;
    const base = perWave * Math.max(0, state.level);
    const flat = (permUpgrades.find(u => u.id === 'creditsFlat') || { getVal: () => 0 }).getVal((permUpgrades.find(u => u.id === 'creditsFlat') || { count:0 }).count);
    const mult = getPermanentCreditsMultiplier();
    const rewardBoost = (permUpgrades.find(u => u.id === 'rewardBoost') || { getVal: () => 0 }).getVal((permUpgrades.find(u => u.id === 'rewardBoost') || { count:0 }).count);
    
    // Apply skill tree credit multiplier
    let skillMult = 1;
    const skillEffects = typeof getSkillTreeEffects === 'function' ? getSkillTreeEffects() : null;
    if (skillEffects && skillEffects.creditGainMult) {
        skillMult = skillEffects.creditGainMult;
    }
    
    // rewardBoost is legacy - if present apply as an additive percent
    return Math.floor((base + flat) * (mult + rewardBoost) * skillMult);
}

function triggerCoinCollection(totalCredits) {
    if (!ui.coinBurstLayer || !ui.creditsValue || !ui.managementScreen) return;
    const creditsDisplayRect = ui.creditsValue.getBoundingClientRect();
    const containerRect = ui.managementScreen.getBoundingClientRect();
    const targetX = creditsDisplayRect.left - containerRect.left + creditsDisplayRect.width / 2;
    const targetY = creditsDisplayRect.top - containerRect.top + creditsDisplayRect.height / 2;

    const coinCount = Math.min(24, Math.max(8, Math.floor(totalCredits / 10)));
    const baseValue = Math.floor(totalCredits / coinCount);
    let remainder = totalCredits - baseValue * coinCount;

    for (let i = 0; i < coinCount; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin';
        const startX = Math.random() * containerRect.width * 0.8 + containerRect.width * 0.1;
        const startY = Math.random() * containerRect.height * 0.5 + containerRect.height * 0.25;
        coin.style.left = `${startX}px`;
        coin.style.top = `${startY}px`;
        ui.coinBurstLayer.appendChild(coin);

        const coinValue = baseValue + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;

        const duration = 700 + Math.random() * 400;
        coin.animate([
            { transform: 'scale(1)', opacity: 1, left: `${startX}px`, top: `${startY}px` },
            { transform: 'scale(0.6)', opacity: 0.9, left: `${targetX}px`, top: `${targetY}px` },
            { transform: 'scale(0.2)', opacity: 0, left: `${targetX}px`, top: `${targetY}px` }
        ], {
            duration,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards'
        }).onfinish = () => {
            coin.remove();
            state.credits += coinValue;
            updateManagementUI();
        };
    }
}

/**
 * Update all UI elements
 */
function updateUI() {
    updateMoney();
    updateHpBar();
    updateManagementUI();
    
    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) {
        levelDisplay.innerText = state.level;
    }
}

/**
 * Update money display - OPTIMIZED with throttling
 */
function updateMoney() {
    const moneyDisplay = document.getElementById('money-display');
    if (moneyDisplay) {
        moneyDisplay.innerText = format(state.money);
    }
    
    // Throttle card rendering to prevent aggressive UI updates
    const now = performance.now();
    if (now - lastCardRenderTime >= CARD_RENDER_THROTTLE) {
        lastCardRenderTime = now;
        pendingCardRender = false;
        renderCards();
    } else if (!pendingCardRender) {
        // Schedule a render for later if one isn't already pending
        pendingCardRender = true;
        setTimeout(() => {
            if (pendingCardRender) {
                lastCardRenderTime = performance.now();
                pendingCardRender = false;
                renderCards();
            }
        }, CARD_RENDER_THROTTLE - (now - lastCardRenderTime));
    }
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
 * Render upgrade cards - OPTIMIZED: Skip animations on re-renders
 */
let isInitialCardRender = true;
function renderCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;
    
    container.innerHTML = '';

    // Show only the current run's offered upgrades (if set); falls back to all for safety
    const list = getOfferUpgrades();

    list.forEach((u, index) => {
        const currentCost = getUpgradeCost(u);
        const canAfford = canAffordUpgrade(u, state);
        const isMaxed = isUpgradeMaxed(u);

        const card = document.createElement('div');
        card.className = `card ${(!canAfford || isMaxed) ? 'disabled' : ''}`;
        
        // Only animate on initial render, not on updates
        if (isInitialCardRender) {
            card.style.animationDelay = `${index * 60}ms`;
            card.style.animation = 'cardFadeInUp 0.3s ease-out forwards';
            card.style.opacity = '0';
        } else {
            card.style.opacity = '1';
        }
        
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
                // re-render offers after buy
                renderCards();
            };
        }

        container.appendChild(card);
    });
    
    // Mark initial render as complete after first call
    isInitialCardRender = false;
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
    if (state.gameOver || state.isPaused || !state.isPlaying) return;
    
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
            AudioEngine.shot();
            if (killed) {
                AudioEngine.kill();
            } else {
                AudioEngine.hit();
            }
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

// ============================================================================
// DEBUG COMMANDS
// ============================================================================

/**
 * Set the game level directly (debug command)
 * @param {number} lvl - The level to set (1-999)
 * @param {boolean} clearEnemies - Whether to clear existing enemies (default: true)
 */
function setLevel(lvl, clearEnemies = true) {
    if (typeof state === 'undefined' || !state) {
        console.error('Game not initialized yet');
        return;
    }
    
    if (typeof lvl !== 'number' || lvl < 1 || lvl > 999) {
        console.error('Level must be a number between 1 and 999');
        return;
    }
    
    // Update level
    const oldLevel = state.level;
    state.level = Math.floor(lvl);
    
    // Clear enemies if requested
    if (clearEnemies && typeof enemies !== 'undefined') {
        enemies.length = 0;
    }
    
    // Reset spawn timer to prevent immediate spawn
    state.spawnTimer = state.spawnRate || 1500;
    
    // Update UI if function exists
    if (typeof updateUI === 'function') {
        updateUI();
    }
    
    console.log(`Level set from ${oldLevel} to ${state.level}`);
    
    // Special message for level 100
    if (state.level === 100) {
        console.log('%c⚠️ EPIC BOSS WARNING: OMNICRON APPROACHES!', 'color: #ff00aa; font-size: 16px; font-weight: bold;');
        console.log('%cThe epic boss will spawn next. Prepare for battle!', 'color: #00ffff;');
    }
    
    return state.level;
}

// Expose to global scope for browser console access
if (typeof window !== 'undefined') {
    window.setLevel = setLevel;
}
