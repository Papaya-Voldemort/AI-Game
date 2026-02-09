/**
 * Collision Detection Utilities
 */

/**
 * Check if a point is inside a circle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is inside circle
 */
function pointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) <= (radius * radius);
}

/**
 * Check if two circles are colliding
 * @param {number} x1 - First circle X
 * @param {number} y1 - First circle Y
 * @param {number} r1 - First circle radius
 * @param {number} x2 - Second circle X
 * @param {number} y2 - Second circle Y
 * @param {number} r2 - Second circle radius
 * @returns {boolean} True if circles are colliding
 */
function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (r1 + r2);
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Check if point is within expanded bounds of circle (for click detection)
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Base radius
 * @param {number} padding - Extra padding for easier clicking
 * @returns {boolean} True if point is within expanded bounds
 */
function pointInExpandedCircle(px, py, cx, cy, radius, padding = 30) {
    return px >= cx - radius - padding &&
           px <= cx + radius + padding &&
           py >= cy - radius - padding &&
           py <= cy + radius + padding;
}
