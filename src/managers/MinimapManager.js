// ============================================
// MINIMAP MANAGER - Canvas minimap with click-to-pan
// ============================================

import { getState } from '../store.js'
import { getWaypoints, getPositionOnPath } from '../path.js'
import { getCameraTarget, setCameraTarget, getCameraRadius } from '../camera.js'
import { MAP_WIDTH, MAP_DEPTH, COLORS } from '../settings.js'

let canvas = null
let ctx = null

// Scale factors
const PADDING = 10
let scaleX = 1
let scaleY = 1
let offsetX = 0
let offsetY = 0

export function initMinimapManager() {
  canvas = document.getElementById('minimap')
  if (!canvas) return

  ctx = canvas.getContext('2d')

  // Calculate scale to fit map in canvas (portrait minimap matching game view)
  const availableWidth = canvas.width - PADDING * 2
  const availableHeight = canvas.height - PADDING * 2

  // Portrait minimap: Map Z → minimap X, Map X → minimap Y
  scaleX = availableWidth / MAP_DEPTH   // Z maps to minimap width
  scaleY = availableHeight / MAP_WIDTH  // X maps to minimap height
  offsetX = canvas.width / 2
  offsetY = canvas.height / 2

  // Setup click handler for panning
  canvas.addEventListener('click', onMinimapClick)
}

function worldToMinimap(worldX, worldZ) {
  // Portrait: Z → minimap X, X → minimap Y
  return {
    x: offsetX + worldZ * scaleX,
    y: offsetY + worldX * scaleY
  }
}

function minimapToWorld(minimapX, minimapY) {
  return {
    x: (minimapY - offsetY) / scaleY,
    z: (minimapX - offsetX) / scaleX
  }
}

function onMinimapClick(e) {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const worldPos = minimapToWorld(x, y)

  // Clamp to map bounds
  const halfW = MAP_WIDTH / 2
  const halfD = MAP_DEPTH / 2
  worldPos.x = Math.max(-halfW, Math.min(halfW, worldPos.x))
  worldPos.z = Math.max(-halfD, Math.min(halfD, worldPos.z))

  setCameraTarget(worldPos.x, worldPos.z)
}

export function updateMinimapManager() {
  if (!ctx) return

  const state = getState()

  // Clear canvas
  ctx.fillStyle = '#1a2a1a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw map bounds
  drawMapBounds()

  // Draw path
  drawPath()

  // Draw towers
  drawTowers(state.towers)

  // Draw enemies
  drawEnemies(state.enemies)

  // Draw camera viewport
  drawCameraViewport()
}

function drawMapBounds() {
  const topLeft = worldToMinimap(-MAP_WIDTH / 2, MAP_DEPTH / 2)
  const bottomRight = worldToMinimap(MAP_WIDTH / 2, -MAP_DEPTH / 2)

  ctx.strokeStyle = '#3a4a3a'
  ctx.lineWidth = 1
  ctx.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y
  )
}

function drawPath() {
  const waypoints = getWaypoints()
  if (waypoints.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = COLORS.PATH
  ctx.lineWidth = 4

  const start = worldToMinimap(waypoints[0].x, waypoints[0].z)
  ctx.moveTo(start.x, start.y)

  for (let i = 1; i < waypoints.length; i++) {
    const point = worldToMinimap(waypoints[i].x, waypoints[i].z)
    ctx.lineTo(point.x, point.y)
  }

  ctx.stroke()

  // Draw start marker (green)
  const startPos = worldToMinimap(waypoints[0].x, waypoints[0].z)
  ctx.fillStyle = '#4CAF50'
  ctx.beginPath()
  ctx.arc(startPos.x, startPos.y, 4, 0, Math.PI * 2)
  ctx.fill()

  // Draw end marker (red)
  const endPos = worldToMinimap(waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].z)
  ctx.fillStyle = '#F44336'
  ctx.beginPath()
  ctx.arc(endPos.x, endPos.y, 4, 0, Math.PI * 2)
  ctx.fill()
}

function drawTowers(towers) {
  const towerColors = {
    arrow: '#78909C',
    flame: '#FF7043',
    frost: '#4FC3F7',
    lightning: '#7C4DFF'
  }

  for (const tower of towers) {
    const pos = worldToMinimap(tower.position.x, tower.position.z)
    const color = towerColors[tower.type] || '#FFFFFF'

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
    ctx.fill()

    // White outline
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawEnemies(enemies) {
  ctx.fillStyle = '#FF4444'

  for (const enemy of enemies) {
    if (!enemy.spawned || enemy.dying) continue

    const pathPos = getPositionOnPath(enemy.pathProgress)
    const pos = worldToMinimap(pathPos.x, pathPos.z)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCameraViewport() {
  const target = getCameraTarget()
  const radius = getCameraRadius()

  // Approximate viewport size based on camera radius
  const viewWidth = radius * 1.5
  const viewHeight = radius * 0.9

  // Get all four corners and find bounding box
  const p1 = worldToMinimap(target.x - viewWidth / 2, target.z - viewHeight / 2)
  const p2 = worldToMinimap(target.x + viewWidth / 2, target.z + viewHeight / 2)

  const minX = Math.min(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxX = Math.max(p1.x, p2.x)
  const maxY = Math.max(p1.y, p2.y)

  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1.5
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
}

export function disposeMinimapManager() {
  if (canvas) {
    canvas.removeEventListener('click', onMinimapClick)
  }
}

export function resetMinimapManager() {
  // Nothing to reset, will redraw on next update
}
