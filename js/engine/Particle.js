/**
 * PARTICLE ENGINE v2.0 - Aggressively Optimized
 * 
 * Architecture:
 *   - Object pooling: zero GC pressure during gameplay
 *   - Pre-rendered glow textures: eliminates expensive ctx.shadowBlur
 *   - Batch rendering by composite operation: minimal state switches
 *   - Viewport culling: off-screen particles skip draw
 *   - Preset system: define new effects with a simple config object
 *   - Frame-time based: no Date.now() calls
 * 
 * Usage:
 *   ParticleEngine.init(poolSize)              -- call once at startup
 *   ParticleEngine.emit(presetName, x, y, opts)-- spawn particles from a preset
 *   ParticleEngine.spawn(x, y, color, type)    -- spawn a single particle (legacy compat)
 *   ParticleEngine.update(dt)                  -- call once per frame
 *   ParticleEngine.draw(ctx, viewW, viewH)     -- call once per frame
 *   ParticleEngine.clear()                     -- kill all particles
 * 
 * Custom presets:
 *   ParticleEngine.definePreset('myEffect', { ... })
 */

// ============================================================================
// GLOW TEXTURE CACHE  (replaces ctx.shadowBlur entirely)
// ============================================================================
const GlowCache = (() => {
    const _cache = {};
    const _canvas = typeof OffscreenCanvas !== 'undefined'
        ? (w, h) => new OffscreenCanvas(w, h)
        : (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

    /**
     * Get or create a cached radial glow texture.
     * @param {string} color  CSS color string
     * @param {number} radius Glow radius in px (will be quantized to 4px steps)
     * @returns {HTMLCanvasElement|OffscreenCanvas}
     */
    function get(color, radius) {
        // Quantize radius to reduce unique textures (4px steps)
        const qr = Math.max(4, (Math.round(radius / 4) * 4));
        const key = color + '|' + qr;
        if (_cache[key]) return _cache[key];

        const size = qr * 2;
        const c = _canvas(size, size);
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(qr, qr, 0, qr, qr, qr);
        grad.addColorStop(0, color);
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, 'transparent');
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        _cache[key] = c;
        return c;
    }

    function clear() {
        for (const k in _cache) delete _cache[k];
    }

    return { get, clear };
})();

// ============================================================================
// PARTICLE PRESETS  (easy to add new effects)
// ============================================================================

/**
 * A preset defines HOW particles behave and look.
 * All numeric ranges are [min, max] -- the engine picks a random value.
 * 
 * Fields:
 *   count        {number}         default particles per emit call
 *   speed        {[min,max]}      initial radial speed
 *   angle        {[min,max]}      radial angle range (radians). Default [0, TAU]
 *   life         {number}         starting life (0-1)
 *   decay        {[min,max]}      life decay per normalized frame
 *   size         {[min,max]}      starting radius
 *   shrink       {number}         size multiplier per frame (0.97 = shrink)
 *   gravity      {number}         vy acceleration per frame
 *   friction     {number}         velocity damping per frame
 *   composite    {'lighter'|'source-over'}
 *   glow         {number}         glow radius (0 = no glow). Replaces shadowBlur.
 *   glowColor    {string|null}    override glow color (defaults to particle color)
 *   shape        {'circle'|'rect'}
 *   hasCore      {boolean}        draw white inner circle (explosion style)
 *   coreRatio    {number}         inner core size ratio
 *   alphaBase    {number}         base alpha multiplier (default 1)
 *   flicker      {boolean}        oscillating alpha for embers
 *   spin         {boolean}        enable rotation (debris)
 *   spinSpeed    {[min,max]}      rotation speed range
 *   colorOverLife{Array|null}     array of {t, color} for color interpolation
 *   dirMode      {'radial'|'random'|'upward'} how initial velocity is set
 */

const PARTICLE_PRESETS = {};

// --- Built-in presets (matching original visual quality) ---

PARTICLE_PRESETS['explosion'] = {
    count: 14,
    speed: [2, 8],
    dirMode: 'radial',
    life: 1.0,
    decay: [0.015, 0.035],
    size: [2, 7],
    shrink: 0.97,
    gravity: 0.1,
    friction: 0.96,
    composite: 'lighter',
    glow: 16,
    glowColor: null,
    shape: 'circle',
    hasCore: true,
    coreRatio: 0.5,
    alphaBase: 1,
    flicker: false,
    spin: false
};

PARTICLE_PRESETS['spark'] = {
    count: 8,
    speed: [1, 5],
    dirMode: 'radial',
    life: 1.0,
    decay: [0.02, 0.05],
    size: [1, 4],
    shrink: 0.97,
    gravity: 0,
    friction: 0.95,
    composite: 'lighter',
    glow: 10,
    glowColor: null,
    shape: 'circle',
    hasCore: false,
    alphaBase: 1,
    flicker: false,
    spin: false
};

PARTICLE_PRESETS['trail'] = {
    count: 1,
    speed: [0, 0.25],
    dirMode: 'random',
    life: 0.8,
    decay: [0.03, 0.07],
    size: [0.5, 2.5],
    shrink: 0.97,
    gravity: -0.02,
    friction: 0.98,
    composite: 'lighter',
    glow: 0,
    glowColor: null,
    shape: 'circle',
    hasCore: false,
    alphaBase: 0.6,
    flicker: false,
    spin: false
};

PARTICLE_PRESETS['ember'] = {
    count: 4,
    speed: [0.5, 2.5],
    dirMode: 'upward',
    life: 1.0,
    decay: [0.005, 0.015],
    size: [1, 3],
    shrink: 0.99,
    gravity: -0.05,
    friction: 1,
    composite: 'lighter',
    glow: 8,
    glowColor: '#ffaa00',
    shape: 'circle',
    hasCore: false,
    alphaBase: 1,
    flicker: true,
    spin: false
};

PARTICLE_PRESETS['debris'] = {
    count: 6,
    speed: [1, 4],
    dirMode: 'radial',
    life: 1.0,
    decay: [0.01, 0.025],
    size: [2, 6],
    shrink: 0.97,
    gravity: 0.15,
    friction: 0.97,
    composite: 'source-over',
    glow: 0,
    glowColor: null,
    shape: 'rect',
    hasCore: false,
    alphaBase: 1,
    flicker: false,
    spin: true,
    spinSpeed: [-0.1, 0.1]
};

// Convenience presets for common game effects
PARTICLE_PRESETS['hit_spark'] = {
    count: 3,
    speed: [2, 6],
    dirMode: 'radial',
    life: 0.7,
    decay: [0.04, 0.08],
    size: [1, 3],
    shrink: 0.95,
    gravity: 0,
    friction: 0.92,
    composite: 'lighter',
    glow: 6,
    glowColor: null,
    shape: 'circle',
    hasCore: false,
    alphaBase: 1,
    flicker: false,
    spin: false
};

PARTICLE_PRESETS['armor_deflect'] = {
    count: 2,
    speed: [1, 3],
    dirMode: 'radial',
    life: 0.5,
    decay: [0.04, 0.06],
    size: [1, 2],
    shrink: 0.96,
    gravity: 0.05,
    friction: 0.94,
    composite: 'source-over',
    glow: 0,
    shape: 'circle',
    hasCore: false,
    alphaBase: 0.8,
    flicker: false,
    spin: false
};

PARTICLE_PRESETS['dash'] = {
    count: 8,
    speed: [1, 5],
    dirMode: 'radial',
    life: 0.8,
    decay: [0.03, 0.06],
    size: [1, 3],
    shrink: 0.96,
    gravity: 0,
    friction: 0.94,
    composite: 'lighter',
    glow: 8,
    glowColor: null,
    shape: 'circle',
    hasCore: false,
    alphaBase: 0.9,
    flicker: false,
    spin: false
};

// ============================================================================
// PARTICLE POOL  (zero-alloc particle management)
// ============================================================================

const ParticleEngine = (() => {
    // --- Pool storage (Structure of Arrays for cache-friendliness) ---
    const MAX_POOL = 512;
    let poolSize = MAX_POOL;

    // Position & velocity
    const px    = new Float32Array(MAX_POOL);
    const py    = new Float32Array(MAX_POOL);
    const vx    = new Float32Array(MAX_POOL);
    const vy    = new Float32Array(MAX_POOL);

    // Lifecycle
    const life  = new Float32Array(MAX_POOL);
    const decay = new Float32Array(MAX_POOL);
    const size  = new Float32Array(MAX_POOL);

    // Physics
    const gravity  = new Float32Array(MAX_POOL);
    const friction = new Float32Array(MAX_POOL);
    const shrink   = new Float32Array(MAX_POOL);

    // Rendering (stored as indices / flags)
    const alpha    = new Float32Array(MAX_POOL);  // base alpha multiplier
    const rotation = new Float32Array(MAX_POOL);
    const rotSpeed = new Float32Array(MAX_POOL);
    const flickOff = new Float32Array(MAX_POOL);  // flicker phase offset

    // Per-particle metadata (can't efficiently go in typed arrays)
    const meta = new Array(MAX_POOL);
    for (let i = 0; i < MAX_POOL; i++) {
        meta[i] = {
            active: false,
            color: '#fff',
            presetKey: '',
            // Cached preset reference for draw
            preset: null
        };
    }

    // Active count tracking
    let activeCount = 0;
    // Active indices list for iteration (avoids scanning entire pool)
    const activeList = new Uint16Array(MAX_POOL);

    // Frame time accumulator for trail throttling
    let _frameCount = 0;

    // -----------------------------------------------------------------------
    // INTERNAL HELPERS
    // -----------------------------------------------------------------------

    function randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Acquire a particle slot from the pool.
     * Returns index or -1 if pool is full.
     */
    function acquire() {
        // Linear scan for inactive slot - with activeCount hint
        // We keep a simple approach: scan from 0, relying on particles dying
        // frequently enough that slots near the front open up.
        for (let i = 0; i < poolSize; i++) {
            if (!meta[i].active) {
                meta[i].active = true;
                activeCount++;
                return i;
            }
        }
        return -1; // pool exhausted
    }

    function release(i) {
        meta[i].active = false;
        activeCount--;
    }

    // Rebuild the activeList before update/draw
    function rebuildActiveList() {
        let n = 0;
        for (let i = 0; i < poolSize; i++) {
            if (meta[i].active) {
                activeList[n++] = i;
            }
        }
        return n;
    }

    // -----------------------------------------------------------------------
    // PUBLIC API
    // -----------------------------------------------------------------------

    function init(customPoolSize) {
        poolSize = Math.min(customPoolSize || MAX_POOL, MAX_POOL);
        clear();
    }

    function clear() {
        for (let i = 0; i < poolSize; i++) {
            meta[i].active = false;
        }
        activeCount = 0;
        _frameCount = 0;
    }

    /**
     * Define or override a particle preset.
     * @param {string} name
     * @param {object} def  Preset definition object (see PARTICLE_PRESETS docs)
     */
    function definePreset(name, def) {
        PARTICLE_PRESETS[name] = def;
    }

    /**
     * Get a preset definition (for inspection / extension).
     */
    function getPreset(name) {
        return PARTICLE_PRESETS[name] || null;
    }

    /**
     * Emit particles using a named preset.
     * @param {string}  presetName
     * @param {number}  x
     * @param {number}  y
     * @param {object}  [opts]  Overrides: { color, count, speed, size, gravity }
     */
    function emit(presetName, x, y, opts) {
        const preset = PARTICLE_PRESETS[presetName];
        if (!preset) return;

        const count = (opts && opts.count !== undefined) ? opts.count : preset.count;
        const color = (opts && opts.color) || '#ffffff';

        for (let n = 0; n < count; n++) {
            const i = acquire();
            if (i < 0) return; // pool full

            px[i] = x;
            py[i] = y;

            // Velocity
            const spd = randRange(
                (opts && opts.speed) ? opts.speed[0] : preset.speed[0],
                (opts && opts.speed) ? opts.speed[1] : preset.speed[1]
            );

            const dir = preset.dirMode || 'radial';
            if (dir === 'radial') {
                const angleMin = (preset.angle) ? preset.angle[0] : 0;
                const angleMax = (preset.angle) ? preset.angle[1] : Math.PI * 2;
                const a = randRange(angleMin, angleMax);
                vx[i] = Math.cos(a) * spd;
                vy[i] = Math.sin(a) * spd;
            } else if (dir === 'upward') {
                vx[i] = (Math.random() - 0.5) * spd;
                vy[i] = -Math.random() * spd - 0.5;
            } else { // random
                vx[i] = (Math.random() - 0.5) * spd;
                vy[i] = (Math.random() - 0.5) * spd;
            }

            // Lifecycle
            life[i] = preset.life;
            decay[i] = Array.isArray(preset.decay)
                ? randRange(preset.decay[0], preset.decay[1])
                : preset.decay;
            size[i] = Array.isArray(preset.size)
                ? randRange(
                    (opts && opts.size) ? opts.size[0] : preset.size[0],
                    (opts && opts.size) ? opts.size[1] : preset.size[1]
                )
                : preset.size;

            // Physics
            gravity[i]  = (opts && opts.gravity !== undefined) ? opts.gravity : preset.gravity;
            friction[i] = preset.friction;
            shrink[i]   = preset.shrink;

            // Rendering
            alpha[i] = preset.alphaBase !== undefined ? preset.alphaBase : 1;

            if (preset.spin) {
                const sr = preset.spinSpeed || [-0.1, 0.1];
                rotation[i] = Math.random() * Math.PI * 2;
                rotSpeed[i] = randRange(sr[0], sr[1]);
            } else {
                rotation[i] = 0;
                rotSpeed[i] = 0;
            }

            flickOff[i] = preset.flicker ? Math.random() * Math.PI : -1;

            // Meta
            meta[i].color = color;
            meta[i].presetKey = presetName;
            meta[i].preset = preset;
        }
    }

    /**
     * Legacy-compatible single particle spawn.
     * Maps old `new Particle(x, y, color, type)` calls.
     */
    function spawn(x, y, color, type) {
        const presetName = PARTICLE_PRESETS[type] ? type : 'spark';
        emit(presetName, x, y, { color: color, count: 1 });
    }

    /**
     * Update all active particles.
     * @param {number} dt  Frame delta in ms
     */
    function update(dt) {
        _frameCount++;
        const dtNorm = dt / 16; // normalize to ~60fps baseline
        const count = rebuildActiveList();

        for (let n = 0; n < count; n++) {
            const i = activeList[n];

            // Physics
            px[i] += vx[i] * dtNorm;
            py[i] += vy[i] * dtNorm;

            if (gravity[i] !== 0) {
                vy[i] += gravity[i] * dtNorm;
            }

            const f = friction[i];
            if (f !== 1 && f !== 0) {
                vx[i] *= f;
                vy[i] *= f;
            }

            // Rotation
            if (rotSpeed[i] !== 0) {
                rotation[i] += rotSpeed[i] * dtNorm;
            }

            // Flicker phase advance
            if (flickOff[i] >= 0) {
                flickOff[i] += dt * 0.01;
            }

            // Lifecycle
            life[i] -= decay[i] * dtNorm;
            size[i] *= shrink[i];

            if (life[i] <= 0 || size[i] < 0.1) {
                release(i);
            }
        }
    }

    /**
     * Render all active particles with batch optimizations.
     * Particles are grouped by composite operation to minimize state switches.
     * Glow is rendered via pre-baked textures (no shadowBlur).
     * 
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} viewW  viewport width
     * @param {number} viewH  viewport height
     */
    function draw(ctx, viewW, viewH) {
        const count = rebuildActiveList();
        if (count === 0) return;

        // --- Sort active particles into buckets by composite mode ---
        // We use two passes: 'source-over' first, then 'lighter' on top.
        // This avoids per-particle composite switching.

        // Temp buckets (reused arrays to avoid alloc)
        const bucketOver = _bucketOver;
        const bucketLighter = _bucketLighter;
        let nOver = 0, nLighter = 0;

        for (let n = 0; n < count; n++) {
            const i = activeList[n];
            const p = meta[i].preset;

            // Viewport culling (generous margin for glow)
            const margin = (p.glow || 0) + size[i] + 8;
            if (px[i] < -margin || px[i] > viewW + margin ||
                py[i] < -margin || py[i] > viewH + margin) {
                continue;
            }

            if (p.composite === 'source-over') {
                bucketOver[nOver++] = i;
            } else {
                bucketLighter[nLighter++] = i;
            }
        }

        // --- Pass 1: source-over particles (debris, etc.) ---
        if (nOver > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            for (let n = 0; n < nOver; n++) {
                drawParticle(ctx, bucketOver[n]);
            }
            ctx.restore();
        }

        // --- Pass 2: lighter (additive) particles ---
        if (nLighter > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let n = 0; n < nLighter; n++) {
                drawParticle(ctx, bucketLighter[n]);
            }
            ctx.restore();
        }
    }

    // Reusable bucket arrays (avoid allocation each frame)
    const _bucketOver = new Uint16Array(MAX_POOL);
    const _bucketLighter = new Uint16Array(MAX_POOL);

    /**
     * Draw a single particle (called within a batch).
     * No ctx.save()/ctx.restore() per particle -- we manage state manually.
     */
    function drawParticle(ctx, i) {
        const p = meta[i].preset;
        const l = life[i];
        const s = size[i];
        const c = meta[i].color;

        // Alpha with optional flicker
        let a = l * alpha[i];
        if (flickOff[i] >= 0) {
            a *= (0.7 + Math.sin(flickOff[i]) * 0.3);
        }
        if (a <= 0.01) return;
        a = Math.min(1, a);

        // Glow texture (replaces shadowBlur - HUGE perf win)
        if (p.glow > 0) {
            const glowR = p.glow + s;
            const glowC = p.glowColor || c;
            const tex = GlowCache.get(glowC, glowR);
            ctx.globalAlpha = a * 0.5;
            ctx.drawImage(tex, px[i] - glowR, py[i] - glowR, glowR * 2, glowR * 2);
        }

        ctx.globalAlpha = a;
        ctx.fillStyle = c;

        if (p.shape === 'rect') {
            // Debris - need rotation
            ctx.save();
            ctx.translate(px[i], py[i]);
            ctx.rotate(rotation[i]);
            ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
            ctx.restore();
        } else {
            // Circle (most particles)
            ctx.beginPath();
            ctx.arc(px[i], py[i], s, 0, 6.2832); // TAU
            ctx.fill();

            // Inner bright core for explosions
            if (p.hasCore && s > 1) {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = a * 0.8;
                const cs = s * (p.coreRatio || 0.5);
                ctx.beginPath();
                ctx.arc(px[i], py[i], cs, 0, 6.2832);
                ctx.fill();
            }
        }
    }

    // -----------------------------------------------------------------------
    // CONVENIENCE EMITTERS (drop-in replacements for old API)
    // -----------------------------------------------------------------------

    /**
     * Drop-in replacement for old createParticles(x, y, color, count, type).
     */
    function createParticlesCompat(x, y, color, count, type) {
        const presetName = PARTICLE_PRESETS[type || 'spark'] ? (type || 'spark') : 'spark';
        emit(presetName, x, y, { color: color, count: count });
    }

    /**
     * Drop-in replacement for old createExplosion(x, y, radius, color).
     * Matches the original visual: core explosion particles + embers for large blasts.
     */
    function createExplosionCompat(x, y, radius, color) {
        const particleCount = Math.min(20, Math.max(8, Math.floor(radius * 0.7)));
        emit('explosion', x, y, { color: color, count: particleCount });

        // Embers for large explosions
        if (radius > 25) {
            const emberCount = Math.floor(radius / 4);
            emit('ember', x, y, { color: '#ffaa00', count: emberCount });
        }
    }

    // -----------------------------------------------------------------------
    // STATS (for debugging / profiling)
    // -----------------------------------------------------------------------

    function getStats() {
        return {
            active: activeCount,
            poolSize: poolSize,
            utilization: (activeCount / poolSize * 100).toFixed(1) + '%',
            frameCount: _frameCount
        };
    }

    function getFrameCount() {
        return _frameCount;
    }

    // -----------------------------------------------------------------------
    // EXPOSE API
    // -----------------------------------------------------------------------

    return {
        init,
        clear,
        definePreset,
        getPreset,
        emit,
        spawn,
        update,
        draw,
        getStats,
        getFrameCount,

        // Legacy compatibility
        createParticles: createParticlesCompat,
        createExplosion: createExplosionCompat
    };
})();

// ============================================================================
// GLOBAL COMPAT FUNCTIONS (so existing code calling createParticles / 
// createExplosion / new Particle keeps working without changes)
// ============================================================================

/**
 * Legacy Particle class wrapper.
 * Instead of allocating an object, it emits into the pool.
 * Returns a dummy object with markedForDeletion so filter() works.
 */
class Particle {
    constructor(x, y, color, type) {
        // Emit directly into the pool engine
        ParticleEngine.spawn(x, y, color, type || 'spark');
        // This object is intentionally a no-op shell -- the pool owns the particle.
        // We mark it for immediate deletion so callers doing particles.push(new Particle(...))
        // and then particles.filter(p => !p.markedForDeletion) won't accumulate garbage.
        this.markedForDeletion = true;
    }
    update() {}
    draw() {}
}

/**
 * Global createParticles -- drop-in replacement.
 */
function createParticles(x, y, color, count, type) {
    ParticleEngine.createParticles(x, y, color, count || 8, type || 'spark');
}

/**
 * Global createExplosion -- drop-in replacement.
 */
function createExplosion(x, y, radius, color) {
    ParticleEngine.createExplosion(x, y, radius, color);
}
