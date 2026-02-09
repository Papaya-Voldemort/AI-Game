# Neon Core Defense 🎮

A futuristic tower defense game where you protect your core from waves of invading enemies. Click to shoot, upgrade your weapons, and survive as long as you can!

## 🎯 Features

- **Progressive Difficulty**: Enemies get stronger with each wave
- **Diverse Enemy Types**: 8+ unique enemy types with special abilities
- **Upgrade System**: 10 different upgrades to enhance your defenses
- **Prestige System**: Reset and gain permanent power bonuses
- **Boss Battles**: Face powerful bosses every 10 waves
- **Responsive Design**: Optimized for both desktop and mobile play

## 🎮 How to Play

1. **Open `index.html`** in a modern web browser
2. **Click on enemies** to shoot them with your pulse cannon
3. **Earn currency** by defeating enemies
4. **Buy upgrades** from the bottom panel to increase your power
5. **Survive waves** and unlock the prestige system at wave 25

### Controls
- **Mouse/Touch**: Click/tap on enemies to shoot
- **Upgrade Panel**: Click upgrade cards to purchase

## 🛠️ Project Structure

```
AI-Game/
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Core styles
│   ├── mobile.css         # Mobile-specific styles
│   └── desktop.css        # Desktop-specific styles
├── js/
│   ├── data/              # Game data and configuration
│   │   ├── config.js      # Game settings
│   │   ├── upgrades.js    # Upgrade definitions
│   │   └── enemyTypes.js  # Enemy type data
│   ├── engine/            # Core game classes
│   │   ├── Enemy.js       # Enemy entity class
│   │   ├── Projectile.js  # Projectile class
│   │   ├── Particle.js    # Visual particle effects
│   │   ├── Star.js        # Background stars
│   │   ├── FloatingText.js # Damage numbers
│   │   └── Shockwave.js   # Explosion effects
│   ├── systems/           # Game systems
│   │   ├── gameState.js   # State management
│   │   ├── combat.js      # Combat logic
│   │   ├── spawner.js     # Enemy spawning
│   │   └── upgradeSystem.js # Upgrade handling
│   ├── utils/             # Utility functions
│   │   ├── helpers.js     # Helper functions
│   │   ├── collision.js   # Collision detection
│   │   └── particles.js   # Particle utilities
│   ├── main.js            # Main game loop
│   ├── render.js          # Rendering system
│   └── input.js           # Input handling
└── docs/
    ├── README.md          # This file
    └── PLAN.md            # Development roadmap
```

## 🎨 Game Elements

### Upgrades
- **Pulse Cannon**: Increase click damage
- **Auto-Turret**: Automatic damage over time
- **Cyclic Rate**: Increase turret fire rate
- **Split-Fire**: Target multiple enemies at once
- **Nova Round**: Add explosive splash damage
- **Crit Logic**: Chance for critical hits
- **Data Mining**: Increase currency earned
- **Cryo Field**: Slow enemies
- **Nano-Repair**: Regenerate core health
- **Core Shield**: Increase maximum health

### Enemy Types
1. **Basic** (Red): Standard enemy
2. **Fast** (Yellow): Quick but fragile
3. **Tank** (Orange): Slow with high HP and armor
4. **Dasher** (White): Dashes forward periodically
5. **Healer** (Green): Heals nearby enemies
6. **Shifter** (Purple): Phases in and out
7. **Juggernaut** (Dark Red): Massive HP and armor
8. **Banshee** (Cyan): Fast with sine wave movement
9. **Boss** (Purple Star): Appears every 10 waves

## 🚀 Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools required - pure vanilla JavaScript!

### Running Locally
Simply open `index.html` in your browser. No server required!

### Making Changes
1. Edit files in their respective directories
2. Refresh your browser to see changes
3. Check browser console for any errors

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Performance

The game is optimized for:
- 60 FPS gameplay
- Smooth animations
- Efficient particle systems
- Canvas-based rendering

## 🔧 Customization

### Adjusting Difficulty
Edit `js/data/config.js`:
- Modify spawn rates
- Change damage multipliers
- Adjust enemy scaling

### Adding New Enemies
1. Define enemy type in `js/data/enemyTypes.js`
2. Add rendering logic in `js/engine/Enemy.js`
3. Implement special behavior if needed

### Creating New Upgrades
1. Add upgrade definition to `js/data/upgrades.js`
2. Implement upgrade logic in appropriate system file

## 📄 License

This project is open source. Feel free to use, modify, and distribute!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🎮 Credits

Created with ❤️ for the love of incremental tower defense games!

---

**Have fun defending your core!** 🛡️✨
