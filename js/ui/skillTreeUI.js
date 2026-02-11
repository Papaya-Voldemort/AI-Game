/**
 * Skill Tree UI
 * Full-screen radial tree renderer with interactive nodes
 */

let skillTreeContainer = null;
let skillTreeCanvas = null;
let selectedNodeId = null;
let skillTreeAnimationId = null;
let nodeElements = {};
let connectionElements = [];
let particleElements = [];

/**
 * Create and show the skill tree modal
 */
function openSkillTree() {
    // Close if already open
    if (skillTreeContainer) {
        closeSkillTree();
        return;
    }
    
    // Create container
    skillTreeContainer = document.createElement('div');
    skillTreeContainer.id = 'skill-tree-overlay';
    skillTreeContainer.className = 'skill-tree-overlay';
    
    // Create content
    skillTreeContainer.innerHTML = `
        <div class="skill-tree-header">
            <h2>⚡ SKILL TREE</h2>
            <div class="skill-tree-currency">
                <span class="bytes-display">${state?.prestigeCurrency || 0} BYTES</span>
            </div>
            <button class="close-skill-tree" onclick="closeSkillTree()">✕</button>
        </div>
        <div class="skill-tree-container">
            <div class="skill-tree-canvas" id="skill-tree-canvas"></div>
            <div class="skill-tree-detail" id="skill-tree-detail">
                <div class="detail-placeholder">
                    Select a node to view details
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(skillTreeContainer);
    
    // Render the tree
    renderSkillTree();
    
    // Start particle animation
    startParticleAnimation();
    
    // Update currency display
    updateSkillTreeCurrency();
    
    console.log('Skill tree opened');
}

/**
 * Close the skill tree modal
 */
function closeSkillTree() {
    if (skillTreeAnimationId) {
        cancelAnimationFrame(skillTreeAnimationId);
        skillTreeAnimationId = null;
    }
    
    if (skillTreeContainer) {
        skillTreeContainer.remove();
        skillTreeContainer = null;
    }
    
    nodeElements = {};
    connectionElements = [];
    particleElements = [];
    selectedNodeId = null;
    
    console.log('Skill tree closed');
}

/**
 * Render the entire skill tree
 */
function renderSkillTree() {
    const canvas = document.getElementById('skill-tree-canvas');
    if (!canvas) return;
    
    canvas.innerHTML = '';
    nodeElements = {};
    connectionElements = [];
    
    // Get container dimensions
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Determine scale and a responsive base radius to space nodes consistently
    const minDim = Math.min(rect.width, rect.height);
    const scale = Math.max(minDim / 1400, 0.45); // base UI scale
    // Base radius controls node spread; make proportional to container size so nodes don't cluster
    const baseRadius = Math.max(minDim * 0.28, 180);
    
    // Render background elements
    renderBackground(canvas, centerX, centerY, scale, baseRadius);
    
    // Render connections first (so they appear behind nodes)
    renderConnections(canvas, centerX, centerY, scale, baseRadius);
    
    // Render branch backgrounds
    renderBranchBackgrounds(canvas, centerX, centerY, scale, baseRadius);
    
    // Compute initial pixel positions for each node so we can resolve overlaps
    const nodePositions = new Map();
    const pushNode = (n) => nodePositions.set(n.id, {x: centerX + (n.x || 0) * baseRadius, y: centerY + (n.y || 0) * baseRadius});
    pushNode(CENTRAL_CORE);
    SKILL_TREE_NODES.forEach(pushNode);
    
    // Simple overlap resolution: iterate a few times and nudge nodes apart
    const minSeparation = Math.max(80, baseRadius * 0.09);
    for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < SKILL_TREE_NODES.length; i++) {
            for (let j = i + 1; j < SKILL_TREE_NODES.length; j++) {
                const a = nodePositions.get(SKILL_TREE_NODES[i].id);
                const b = nodePositions.get(SKILL_TREE_NODES[j].id);
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                if (d < minSeparation) {
                    const overlap = (minSeparation - d) / 2;
                    const nx = dx / d;
                    const ny = dy / d;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                }
            }
        }
    }
    
    // Render nodes using the resolved positions
    renderNode(canvas, CENTRAL_CORE, centerX, centerY, scale, baseRadius, nodePositions.get(CENTRAL_CORE.id));
    SKILL_TREE_NODES.forEach(node => {
        renderNode(canvas, node, centerX, centerY, scale, baseRadius, nodePositions.get(node.id));
    });
    
    // Render particles
    renderParticles(canvas);
}

/**
 * Render background elements
 */
function renderBackground(container, centerX, centerY, scale, baseRadius) {
    // Add subtle grid lines; grid spacing scales with either visual scale or baseRadius
    const gridSize = Math.max(100 * scale, baseRadius / 4);
    const gridCount = 10;
    
    for (let i = -gridCount; i <= gridCount; i++) {
        // Horizontal lines
        const hLine = document.createElement('div');
        hLine.className = 'skill-grid-line';
        hLine.style.cssText = `
            position: absolute;
            left: ${centerX - gridCount * gridSize}px;
            top: ${centerY + i * gridSize}px;
            width: ${gridCount * 2 * gridSize}px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
        `;
        container.appendChild(hLine);
        
        // Vertical lines
        const vLine = document.createElement('div');
        vLine.className = 'skill-grid-line';
        vLine.style.cssText = `
            position: absolute;
            left: ${centerX + i * gridSize}px;
            top: ${centerY - gridCount * gridSize}px;
            width: 1px;
            height: ${gridCount * 2 * gridSize}px;
            background: linear-gradient(180deg, transparent, rgba(255,255,255,0.03), transparent);
        `;
        container.appendChild(vLine);
    }
}

/**
 * Render branch background glows
 */
function renderBranchBackgrounds(container, centerX, centerY, scale, baseRadius) {
    const branches = [
        { x: 0.8, y: -0.8, color: '255, 71, 87', name: 'combat' },
        { x: -0.8, y: -0.8, color: '55, 66, 250', name: 'defense' },
        { x: -0.8, y: 0.8, color: '46, 213, 115', name: 'economy' },
        { x: 0.8, y: 0.8, color: '165, 94, 234', name: 'utility' }
    ];
    
    branches.forEach(branch => {
        const glow = document.createElement('div');
        glow.className = `branch-glow branch-${branch.name}`;
        glow.style.cssText = `
            position: absolute;
            left: ${centerX + branch.x * baseRadius * 0.55}px;
            top: ${centerY + branch.y * baseRadius * 0.55}px;
            width: ${baseRadius * 1.2}px;
            height: ${baseRadius * 1.2}px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(${branch.color}, 0.08) 0%, transparent 70%);
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;
        container.appendChild(glow);
    });
}

/**
 * Render connection lines between nodes
 */
function renderConnections(container, centerX, centerY, scale, baseRadius) {
    const state = getSkillTreeState();
    
    SKILL_TREE_NODES.forEach(node => {
        if (node.prerequisites.length === 0) return;
        
        node.prerequisites.forEach(prereqId => {
            const prereq = SKILL_TREE_NODES.find(n => n.id === prereqId) || CENTRAL_CORE;
            if (!prereq) return;
            
            const x1 = centerX + prereq.x * baseRadius;
            const y1 = centerY + prereq.y * baseRadius;
            const x2 = centerX + node.x * baseRadius;
            const y2 = centerY + node.y * baseRadius;
            
            const isUnlocked = state[node.id]?.unlocked;
            const prereqTier = state[prereqId]?.tier || 0;
            const isActive = prereqTier > 0;
            
            const line = document.createElement('div');
            line.className = `skill-connection ${isUnlocked ? 'unlocked' : ''} ${isActive ? 'active' : ''}`;
            
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            
            line.style.cssText = `
                position: absolute;
                left: ${x1}px;
                top: ${y1}px;
                width: ${length}px;
                height: 3px;
                transform-origin: 0 50%;
                transform: rotate(${angle}deg);
            `;
            
            container.appendChild(line);
            connectionElements.push(line);
        });
    });
}

/**
 * Render a single node
 */
function renderNode(container, node, centerX, centerY, scale, baseRadius, overridePos) {
    const state = getSkillTreeState();
    const nodeState = state[node.id];
    
    if (!nodeState) return;
    
    const x = overridePos ? overridePos.x : centerX + node.x * baseRadius;
    const y = overridePos ? overridePos.y : centerY + node.y * baseRadius;
    
    const isUnlocked = nodeState.unlocked;
    const isPurchased = nodeState.tier > 0;
    const isMaxed = nodeState.tier >= node.maxTier;
    const isSelected = selectedNodeId === node.id;
    
    // Determine node state class
    let stateClass = 'locked';
    if (isMaxed) stateClass = 'maxed';
    else if (isPurchased) stateClass = 'purchased';
    else if (isUnlocked) stateClass = 'available';
    
    const nodeEl = document.createElement('div');
    nodeEl.className = `skill-node ${stateClass} ${isSelected ? 'selected' : ''} ${node.isCapstone ? 'capstone' : ''} ${node.isCentral ? 'central' : ''}`;
    nodeEl.dataset.nodeId = node.id;
    
    // Get branch color
    const branch = SKILL_TREE_BRANCHES[node.branch.toUpperCase()];
    const color = branch?.color || '#fff';
    
    nodeEl.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -50%);
        --branch-color: ${color};
    `;    
    // Node content
    nodeEl.innerHTML = `
        <div class="node-glow"></div>
        <div class="node-content">
            <div class="node-icon">${node.icon}</div>
            ${isPurchased ? `<div class="node-tier">${nodeState.tier}</div>` : ''}
        </div>
        ${isUnlocked && !isMaxed ? `<div class="node-cost">${node.tierCosts[nodeState.tier]}⚡</div>` : ''}
    `;
    
    // Click handler
    nodeEl.onclick = () => selectNode(node.id);
    
    container.appendChild(nodeEl);
    nodeElements[node.id] = nodeEl;
}

/**
 * Select a node and show its details
 */
function selectNode(nodeId) {
    selectedNodeId = nodeId;
    
    // Update visual selection
    Object.values(nodeElements).forEach(el => el.classList.remove('selected'));
    if (nodeElements[nodeId]) {
        nodeElements[nodeId].classList.add('selected');
    }
    
    // Show details
    showNodeDetails(nodeId);
}

/**
 * Show detailed info for a node
 */
function showNodeDetails(nodeId) {
    const detailPanel = document.getElementById('skill-tree-detail');
    if (!detailPanel) return;
    
    const node = SKILL_TREE_NODES.find(n => n.id === nodeId) || CENTRAL_CORE;
    const state = getSkillTreeState();
    const nodeState = state[nodeId];
    
    if (!node || !nodeState) return;
    
    const canBuy = canPurchaseNode(nodeId, state?.prestigeCurrency || 0);
    const branch = SKILL_TREE_BRANCHES[node.branch.toUpperCase()];
    
    let actionButton = '';
    if (nodeState.tier >= node.maxTier) {
        actionButton = '<button class="detail-btn maxed" disabled>MAXED</button>';
    } else if (canBuy.canBuy) {
        actionButton = `<button class="detail-btn buy" onclick="buySelectedNode()">BUY (${canBuy.cost} BYTES)</button>`;
    } else {
        actionButton = `<button class="detail-btn locked" disabled>${canBuy.reason}</button>`;
    }
    
    // Build tier progress
    let tierProgress = '';
    for (let i = 1; i <= node.maxTier; i++) {
        const filled = i <= nodeState.tier;
        tierProgress += `<div class="tier-dot ${filled ? 'filled' : ''}"></div>`;
    }
    
    detailPanel.innerHTML = `
        <div class="detail-header" style="--branch-color: ${branch?.color || '#fff'}">
            <div class="detail-icon">${node.icon}</div>
            <div class="detail-title">
                <h3>${node.name}</h3>
                <div class="detail-branch">${branch?.name || 'Core'}</div>
            </div>
        </div>
        <div class="detail-description">
            ${node.description}
        </div>
        <div class="detail-current">
            <div class="detail-label">Current:</div>
            <div class="detail-value">${node.getDesc(nodeState.tier)}</div>
        </div>
        ${nodeState.tier < node.maxTier ? `
        <div class="detail-next">
            <div class="detail-label">Next Tier:</div>
            <div class="detail-value">${node.getDesc(nodeState.tier + 1)}</div>
        </div>
        ` : ''}
        <div class="detail-tiers">
            <div class="detail-label">Progress:</div>
            <div class="tier-dots">${tierProgress}</div>
        </div>
        <div class="detail-action">
            ${actionButton}
        </div>
    `;
}

/**
 * Buy the currently selected node
 */
function buySelectedNode() {
    if (!selectedNodeId || !state) return;
    
    const cost = purchaseNode(selectedNodeId, state);
    
    if (cost !== null) {
        // Success - update UI
        showNotification(`Purchased skill upgrade!`);
        updateSkillTreeCurrency();
        renderSkillTree();
        selectNode(selectedNodeId);
        
        // Create particle burst effect at node position
        const nodeEl = nodeElements[selectedNodeId];
        if (nodeEl) {
            createNodeBurst(nodeEl);
        }
        
        // Save game
        if (typeof savePersistent === 'function') {
            savePersistent();
        }
    }
}

/**
 * Update the currency display in the skill tree
 */
function updateSkillTreeCurrency() {
    const display = skillTreeContainer?.querySelector('.bytes-display');
    if (display && state) {
        display.textContent = `${state.prestigeCurrency} BYTES`;
    }
}

/**
 * Render ambient particles
 */
function renderParticles(container) {
    // Clear existing particles
    particleElements.forEach(p => p.remove());
    particleElements = [];
    
    // Create some ambient particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'skill-particle';
        
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 2 + Math.random() * 2;
        
        particle.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: ${y}%;
            width: ${2 + Math.random() * 3}px;
            height: ${2 + Math.random() * 3}px;
            background: rgba(255, 255, 255, ${0.2 + Math.random() * 0.3});
            border-radius: 50%;
            animation: particleFloat ${duration}s ease-in-out ${delay}s infinite;
            pointer-events: none;
        `;
        
        container.appendChild(particle);
        particleElements.push(particle);
    }
}

/**
 * Start particle animation loop
 */
function startParticleAnimation() {
    function animate() {
        if (!skillTreeContainer) return;
        
        // Randomly spawn new particles at purchased nodes
        const state = getSkillTreeState();
        Object.entries(nodeElements).forEach(([nodeId, el]) => {
            if (state[nodeId]?.tier > 0 && Math.random() < 0.02) {
                spawnNodeParticle(el);
            }
        });
        
        skillTreeAnimationId = requestAnimationFrame(animate);
    }
    
    animate();
}

/**
 * Spawn a particle at a node
 */
function spawnNodeParticle(nodeEl) {
    const particle = document.createElement('div');
    particle.className = 'node-particle';
    
    const rect = nodeEl.getBoundingClientRect();
    const containerRect = skillTreeContainer.querySelector('.skill-tree-canvas').getBoundingClientRect();
    
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    
    particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: var(--branch-color, #fff);
        border-radius: 50%;
        pointer-events: none;
        animation: nodeParticleFloat 1.5s ease-out forwards;
    `;
    
    const canvas = skillTreeContainer.querySelector('.skill-tree-canvas');
    canvas.appendChild(particle);
    
    setTimeout(() => particle.remove(), 1500);
}

/**
 * Create burst effect when purchasing
 */
function createNodeBurst(nodeEl) {
    const rect = nodeEl.getBoundingClientRect();
    const containerRect = skillTreeContainer.querySelector('.skill-tree-canvas').getBoundingClientRect();
    
    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;
    
    const canvas = skillTreeContainer.querySelector('.skill-tree-canvas');
    
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        
        const particle = document.createElement('div');
        particle.className = 'burst-particle';
        
        particle.style.cssText = `
            position: absolute;
            left: ${centerX}px;
            top: ${centerY}px;
            width: 6px;
            height: 6px;
            background: #fff;
            border-radius: 50%;
            pointer-events: none;
            --angle: ${angle}rad;
            --distance: ${distance}px;
            animation: burstParticle 0.8s ease-out forwards;
        `;
        
        canvas.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openSkillTree,
        closeSkillTree,
        buySelectedNode
    };
}
