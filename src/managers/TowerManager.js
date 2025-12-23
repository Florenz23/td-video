// ============================================
// TOWER MANAGER - Placement, animations, targeting
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'

import { createTower, createInvalidGhostMaterial } from '../models/tower.js'
import { getState, addTower, setGhostPosition, selectTowerType } from '../store.js'
import { isOnPath } from '../path.js'
import { MAP_WIDTH, MAP_DEPTH, TILE_SIZE, TOWER_SCALE, COLORS } from '../settings.js'

let scene = null
let canvas = null
let gridOverlay = null
let ghostTower = null
let ghostTowerType = null
let invalidMaterial = null
let towerMeshes = {} // towerId -> mesh
let occupiedTiles = new Set()

export function initTowerManager(sceneRef, canvasRef) {
  scene = sceneRef
  canvas = canvasRef

  // Create grid overlay (hidden by default)
  createGridOverlay()

  // Create invalid placement material
  invalidMaterial = createInvalidGhostMaterial(scene)

  // Setup input handlers
  setupInputHandlers()
}

function createGridOverlay() {
  const lines = []
  const halfW = MAP_WIDTH / 2
  const halfD = MAP_DEPTH / 2

  // Vertical lines (along Z)
  for (let x = -halfW; x <= halfW; x += TILE_SIZE) {
    lines.push([
      new Vector3(x, 0.02, -halfD),
      new Vector3(x, 0.02, halfD)
    ])
  }

  // Horizontal lines (along X)
  for (let z = -halfD; z <= halfD; z += TILE_SIZE) {
    lines.push([
      new Vector3(-halfW, 0.02, z),
      new Vector3(halfW, 0.02, z)
    ])
  }

  gridOverlay = MeshBuilder.CreateLineSystem('grid', { lines }, scene)
  gridOverlay.color = new Color3(0.3, 0.3, 0.3)
  gridOverlay.alpha = 0.3
  gridOverlay.isVisible = false
}

function setupInputHandlers() {
  // Keyboard handlers for tower selection
  window.addEventListener('keydown', onKeyDown)

  // Mouse handlers for placement
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerdown', onPointerDown)
}

function onKeyDown(e) {
  const state = getState()
  if (state.phase !== 'BUILD') return

  // Tower selection with 1-4 keys
  if (e.key === '1') selectTowerType('arrow')
  else if (e.key === '2') selectTowerType('flame')
  else if (e.key === '3') selectTowerType('frost')
  else if (e.key === '4') selectTowerType('lightning')
  else if (e.key === 'Escape') {
    // Cancel placement
    setGhostPosition(null)
    updateGhostTower()
  }
}

function onPointerMove(e) {
  const state = getState()
  if (state.phase !== 'BUILD') return

  // Get world position from screen coordinates
  const pickResult = scene.pick(e.offsetX, e.offsetY)
  if (pickResult.hit && pickResult.pickedPoint) {
    const worldPos = pickResult.pickedPoint

    // Snap to grid
    const snappedX = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
    const snappedZ = Math.floor(worldPos.z / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2

    // Check bounds
    const halfW = MAP_WIDTH / 2
    const halfD = MAP_DEPTH / 2
    if (Math.abs(snappedX) <= halfW && Math.abs(snappedZ) <= halfD) {
      setGhostPosition({ x: snappedX, y: 0, z: snappedZ })
    } else {
      setGhostPosition(null)
    }
  } else {
    setGhostPosition(null)
  }

  updateGhostTower()
}

function onPointerDown(e) {
  const state = getState()
  if (state.phase !== 'BUILD') return
  if (!state.ghostPosition) return
  if (e.button !== 0) return // Left click only

  const pos = state.ghostPosition

  // Validate placement
  if (!isValidPlacement(pos.x, pos.z)) return

  // Try to add tower
  const success = addTower(pos, state.selectedTowerType)
  if (success) {
    // Mark tile as occupied
    const key = `${Math.floor(pos.x)},${Math.floor(pos.z)}`
    occupiedTiles.add(key)

    // Create tower mesh (get fresh state after addTower)
    const newState = getState()
    createTowerMesh(newState.towers[newState.towers.length - 1])
  }
}

function isValidPlacement(x, z) {
  // Check if on path
  if (isOnPath(x, z, 0.5)) return false

  // Check if already occupied
  const key = `${Math.floor(x)},${Math.floor(z)}`
  if (occupiedTiles.has(key)) return false

  // Check bounds
  const halfW = MAP_WIDTH / 2 - 1
  const halfD = MAP_DEPTH / 2 - 1
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return false

  return true
}

function updateGhostTower() {
  const state = getState()

  // Show/hide grid overlay
  gridOverlay.isVisible = state.ghostPosition !== null && state.phase === 'BUILD'

  // Remove old ghost if type changed or no position
  if (ghostTower && (ghostTowerType !== state.selectedTowerType || !state.ghostPosition)) {
    ghostTower.dispose()
    ghostTower = null
    ghostTowerType = null
  }

  // Create/update ghost tower
  if (state.ghostPosition && state.phase === 'BUILD') {
    const pos = state.ghostPosition
    const isValid = isValidPlacement(pos.x, pos.z)

    if (!ghostTower || ghostTowerType !== state.selectedTowerType) {
      // Create new ghost tower
      ghostTower = createTower(scene, state.selectedTowerType, pos, true)
      ghostTowerType = state.selectedTowerType
    } else {
      // Update position
      ghostTower.position.x = pos.x
      ghostTower.position.z = pos.z
    }

    // Update material based on validity
    if (!isValid) {
      setGhostMaterials(ghostTower, invalidMaterial)
    } else {
      // Reset to normal ghost color - recreate if needed
      if (ghostTower._invalidMaterial) {
        ghostTower.dispose()
        ghostTower = createTower(scene, state.selectedTowerType, pos, true)
        ghostTower._invalidMaterial = false
      }
    }

    if (!isValid) {
      ghostTower._invalidMaterial = true
    }
  }
}

function setGhostMaterials(tower, material) {
  tower.getChildMeshes().forEach(mesh => {
    mesh.material = material
  })
}

function createTowerMesh(towerData) {
  const mesh = createTower(scene, towerData.type, towerData.position, false)
  towerMeshes[towerData.id] = mesh
}

export function updateTowerManager(dt) {
  const state = getState()
  const time = Date.now() / 1000

  // Update tower animations
  for (const tower of state.towers) {
    const mesh = towerMeshes[tower.id]
    if (!mesh) continue

    if (tower.type === 'flame' && mesh.lavaOrb) {
      // Lava orb pulsing
      const pulse = 1 + Math.sin(time * 2) * 0.1
      const wobble = Math.sin(time * 4) * 0.04
      mesh.lavaOrb.scaling.set(pulse + wobble, pulse - wobble * 0.5, pulse + wobble)

      // Emissive pulse
      const intensity = 0.8 + Math.sin(time * 3) * 0.2
      if (mesh.lavaOrb.material) {
        mesh.lavaOrb.material.emissiveColor = Color3.FromHexString('#FF5722').scale(intensity)
      }
    }

    if (tower.type === 'lightning' && mesh.energyOrb) {
      // Energy orb flickering
      const pulse = 1 + Math.sin(time * 4) * 0.15
      mesh.energyOrb.scaling.setAll(pulse)

      // Flicker effect
      const flicker = 0.7 + Math.sin(time * 8) * 0.2 + Math.sin(time * 13) * 0.1
      if (mesh.energyOrb.material) {
        mesh.energyOrb.material.emissiveColor = new Color3(0.49 * flicker, 0.3 * flicker, flicker)
      }
    }

    if (tower.type === 'frost' && mesh.crystal) {
      // Crystal bobbing
      const bob = Math.sin(time * 2) * 0.03
      mesh.crystal.position.y = 2.2 * TOWER_SCALE + bob

      // Glow pulse
      const glow = 0.7 + Math.sin(time * 2.5) * 0.3
      if (mesh.crystal.material) {
        mesh.crystal.material.emissiveColor = new Color3(0.16 * glow, 0.71 * glow, 0.96 * glow)
      }
    }
  }

  // Update ghost tower if active
  updateGhostTower()
}

// Get tower mesh for external use (e.g., projectile spawning)
export function getTowerMesh(towerId) {
  return towerMeshes[towerId]
}

// Get fire point position for a tower
export function getTowerFirePoint(towerId) {
  const state = getState()
  const tower = state.towers.find(t => t.id === towerId)
  const mesh = towerMeshes[towerId]
  if (!tower || !mesh) return null

  return {
    x: tower.position.x,
    y: mesh.firePointY || 2.5 * TOWER_SCALE,
    z: tower.position.z
  }
}

export function resetTowerManager() {
  // Dispose all tower meshes
  for (const mesh of Object.values(towerMeshes)) {
    mesh.dispose()
  }
  towerMeshes = {}
  occupiedTiles.clear()

  // Clear ghost tower
  if (ghostTower) {
    ghostTower.dispose()
    ghostTower = null
    ghostTowerType = null
  }
}

export function disposeTowerManager() {
  window.removeEventListener('keydown', onKeyDown)
  canvas.removeEventListener('pointermove', onPointerMove)
  canvas.removeEventListener('pointerdown', onPointerDown)

  if (gridOverlay) gridOverlay.dispose()
  if (ghostTower) ghostTower.dispose()
  for (const mesh of Object.values(towerMeshes)) {
    mesh.dispose()
  }
  towerMeshes = {}
  occupiedTiles.clear()
}
