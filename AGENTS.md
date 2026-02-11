# AGENTS.md - Neon Core Defense

## Project Overview
A vanilla JavaScript browser game (tower defense/clicker hybrid) using HTML5 Canvas.
No build tools, no frameworks, no package managers.

## Build Commands

### Create Single-File Distribution
```bash
python scripts/inline_assets.py index.html -o dist/single.html
```

### Serve Locally (any static server)
```bash
python -m http.server 8000
# or
npx serve .
```

## Code Style Guidelines

### JavaScript
- **ES6+ features**: Use `const`/`let`, arrow functions, template literals, classes
- **No semicolons**: Omit except when required (e.g., before `(` or `[`)
- **Quotes**: Single quotes for strings, double quotes in HTML attributes
- **Indentation**: 4 spaces
- **Line length**: ~100 chars soft limit
- **Naming**:
  - `camelCase` for variables, functions, methods
  - `PascalCase` for classes
  - `UPPER_SNAKE_CASE` for constants (CONFIG, UPGRADES)
- **Comments**: JSDoc-style for public APIs, inline for complex logic
- **Classes**: Extend `Entity` base class for game objects
- **State management**: Global state objects passed between systems

### File Organization
```
js/
  main.js              # Game loop, initialization, UI handlers
  engine/              # Game entity classes
    Enemy.js, Projectile.js, Particle.js, etc.
  systems/             # Game logic systems
    gameState.js, combat.js, spawner.js, etc.
  ui/                  # UI rendering
    skillTreeUI.js
  data/                # Static data/config
    config.js, upgrades.js, enemyTypes.js, etc.
  utils/               # Helper functions
    helpers.js, collision.js, particles.js
```

### HTML/CSS
- Load order matters: data → utils → engine → systems → main
- CSS uses CSS variables in `:root` for theming
- Mobile-first responsive design (main.css, mobile.css, desktop.css)

### Performance Patterns
- Use `requestAnimationFrame` for game loop
- Object pooling for particles (see ParticleEngine)
- In-place array filtering (`_compact` function) instead of `.filter()`
- Pre-rendered glow textures (GlowCache) instead of shadowBlur
- Throttle UI updates (CARD_RENDER_THROTTLE)

### Error Handling
- Check global availability with `typeof fn === 'function'` for optional deps
- Use early returns for guard clauses
- Console warnings for non-critical failures

### Game Logic Patterns
- Enemies use `markedForDeletion` flag for cleanup
- State mutations happen in update functions, rendering in draw functions
- Systems receive arrays by reference and modify in place

## Testing
No test framework configured. Test manually by:
1. Opening index.html in browser
2. Playing through a few waves
3. Testing all upgrade paths
4. Verifying mobile layout in dev tools

## Dependencies
- None! Pure vanilla JS
- Optional: BeautifulSoup for the inline_assets.py script

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ required
- Touch and mouse input supported
