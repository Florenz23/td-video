// ============================================
// INPUT HANDLING - Tower placement helpers
// ============================================

import { TILE_SIZE, MAP_WIDTH, MAP_DEPTH } from './settings.js'

// Snap world position to grid center
export function snapToGrid(worldX, worldZ) {
  return {
    x: Math.floor(worldX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2,
    z: Math.floor(worldZ / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
  }
}

// Check if position is within map bounds
export function isWithinBounds(x, z) {
  const halfW = MAP_WIDTH / 2 - 1
  const halfD = MAP_DEPTH / 2 - 1
  return Math.abs(x) <= halfW && Math.abs(z) <= halfD
}

// Get tile key for occupied tracking
export function getTileKey(x, z) {
  return `${Math.floor(x)},${Math.floor(z)}`
}
