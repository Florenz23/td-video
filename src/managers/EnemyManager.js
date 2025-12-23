// ============================================
// ENEMY MANAGER - Spawning, movement, thin instances
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Matrix } from '@babylonjs/core/Maths/math.vector'

import {
  createOrcMaterials,
  createOrcBaseMeshes,
  getPartMatrix,
  getPartNames
} from '../models/orc.js'
import {
  getPositionOnPath,
  getHeadingOnPath,
  speedToProgressPerSecond,
  getTotalPathLength
} from '../path.js'
import {
  getState,
  spawnEnemy,
  updateEnemy,
  removeEnemy,
  enemyPassed
} from '../store.js'
import {
  MAX_ENEMIES,
  JITTER_AMPLITUDE,
  JITTER_FREQUENCY
} from '../settings.js'

let scene = null
let materials = null
let normalMeshes = null
let frostedMeshes = null
let healthBarBgBase = null
let healthBarFgBase = null
let healthBarBgInstances = []
let healthBarFgInstances = []

// Pre-allocated buffers for thin instances (16 floats per matrix)
const instanceBuffers = {
  normal: {},
  frosted: {}
}

export function initEnemyManager(sceneRef) {
  scene = sceneRef

  // Create materials for normal and frosted orcs
  materials = createOrcMaterials(scene)

  // Create base meshes for thin instancing
  normalMeshes = createOrcBaseMeshes(scene, materials, false)
  frostedMeshes = createOrcBaseMeshes(scene, materials, true)

  // Pre-allocate instance buffers
  const partNames = getPartNames()
  for (const partName of partNames) {
    instanceBuffers.normal[partName] = new Float32Array(MAX_ENEMIES * 16)
    instanceBuffers.frosted[partName] = new Float32Array(MAX_ENEMIES * 16)
  }

  // Create health bar meshes
  createHealthBarMeshes()
}

function createHealthBarMeshes() {
  // Health bar background (base mesh for cloning)
  healthBarBgBase = MeshBuilder.CreatePlane('healthBarBgBase', {
    width: 0.8,
    height: 0.1
  }, scene)
  const bgMat = new StandardMaterial('healthBarBgMat', scene)
  bgMat.diffuseColor = Color3.FromHexString('#333333')
  bgMat.emissiveColor = Color3.FromHexString('#222222')
  bgMat.disableLighting = true
  healthBarBgBase.material = bgMat
  healthBarBgBase.isVisible = false
  healthBarBgBase.billboardMode = 7 // Always face camera
  healthBarBgBase.renderingGroupId = 1

  // Health bar foreground (base mesh for cloning)
  healthBarFgBase = MeshBuilder.CreatePlane('healthBarFgBase', {
    width: 0.8,
    height: 0.08
  }, scene)
  const fgMat = new StandardMaterial('healthBarFgMat', scene)
  fgMat.diffuseColor = Color3.FromHexString('#00FF00')
  fgMat.emissiveColor = Color3.FromHexString('#00AA00')
  fgMat.disableLighting = true
  healthBarFgBase.material = fgMat
  healthBarFgBase.isVisible = false
  healthBarFgBase.billboardMode = 7
  healthBarFgBase.renderingGroupId = 2
}

function updateHealthBarInstances(bgData, fgData) {
  // Hide excess instances
  for (let i = bgData.length; i < healthBarBgInstances.length; i++) {
    healthBarBgInstances[i].isVisible = false
    healthBarFgInstances[i].isVisible = false
  }

  // Create or update instances
  for (let i = 0; i < bgData.length; i++) {
    // Create new instances if needed
    if (i >= healthBarBgInstances.length) {
      const bgInstance = healthBarBgBase.createInstance(`healthBarBg_${i}`)
      bgInstance.billboardMode = 7
      healthBarBgInstances.push(bgInstance)

      const fgInstance = healthBarFgBase.createInstance(`healthBarFg_${i}`)
      fgInstance.billboardMode = 7
      healthBarFgInstances.push(fgInstance)
    }

    const bg = healthBarBgInstances[i]
    const fg = healthBarFgInstances[i]

    // Hide background - we only show the green bar
    bg.isVisible = false

    // Update foreground position and scale (left-aligned)
    const scale = fgData[i].scale
    const barWidth = 0.8
    // Offset to keep left edge fixed: move center left as bar shrinks
    const offsetX = -(1 - scale) * (barWidth / 2)
    fg.position.set(bgData[i].x + offsetX, bgData[i].y, bgData[i].z)
    fg.scaling.x = scale
    fg.isVisible = true

    // Update color based on HP percent
    const fgMat = fg.material || healthBarFgBase.material
    if (scale > 0.5) {
      fgMat.diffuseColor = Color3.FromHexString('#00FF00')
      fgMat.emissiveColor = Color3.FromHexString('#00AA00')
    } else if (scale > 0.25) {
      fgMat.diffuseColor = Color3.FromHexString('#FFFF00')
      fgMat.emissiveColor = Color3.FromHexString('#AAAA00')
    } else {
      fgMat.diffuseColor = Color3.FromHexString('#FF0000')
      fgMat.emissiveColor = Color3.FromHexString('#AA0000')
    }
  }
}

export function updateEnemyManager(dt) {
  const state = getState()
  if (state.phase !== 'WAVE') return

  const now = Date.now()
  const time = now / 1000
  const partNames = getPartNames()

  // Track instance counts
  const normalCounts = {}
  const frostedCounts = {}
  for (const partName of partNames) {
    normalCounts[partName] = 0
    frostedCounts[partName] = 0
  }

  // Health bar instance data (only for damaged enemies)
  const healthBarBgData = []
  const healthBarFgData = []

  // Process each enemy
  for (const enemy of state.enemies) {
    // Check spawn timing
    if (!enemy.spawned && state.waveTime >= enemy.spawnDelay) {
      spawnEnemy(enemy.id)
      continue
    }

    if (!enemy.spawned) continue

    // Check if dying enemy should be removed
    if (enemy.dying) {
      if (now - enemy.deathTime > 500) {
        removeEnemy(enemy.id)
      }
      continue
    }

    // Calculate effective speed (apply frost slow)
    let effectiveSpeed = enemy.speed
    if (enemy.frostedUntil > now) {
      effectiveSpeed *= 0.5
    }

    // Update path progress
    const progressPerSecond = speedToProgressPerSecond(effectiveSpeed)
    const newProgress = enemy.pathProgress + progressPerSecond * dt

    // Check if reached end of path
    if (newProgress >= 1) {
      enemyPassed(enemy.id)
      continue
    }

    // Update enemy progress
    updateEnemy(enemy.id, { pathProgress: newProgress })

    // Get position on path
    const pathPos = getPositionOnPath(newProgress)
    const heading = getHeadingOnPath(newProgress)

    // Apply jitter for natural movement
    const jitterX = Math.sin(time * JITTER_FREQUENCY + enemy.jitterSeed) * JITTER_AMPLITUDE
    const jitterZ = Math.sin(time * JITTER_FREQUENCY * 1.3 + enemy.jitterSeed + 100) * JITTER_AMPLITUDE * 0.5

    // Rotate jitter by heading to stay perpendicular to path
    const perpX = jitterX * Math.cos(heading) - jitterZ * Math.sin(heading)
    const perpZ = jitterX * Math.sin(heading) + jitterZ * Math.cos(heading)

    const worldX = pathPos.x + perpX
    const worldZ = pathPos.z + perpZ

    // Calculate walk animation angle
    const walkAngle = time * effectiveSpeed * 4

    // Determine if frosted
    const isFrosted = enemy.frostedUntil > now
    const buffers = isFrosted ? instanceBuffers.frosted : instanceBuffers.normal
    const counts = isFrosted ? frostedCounts : normalCounts

    // Add instance matrices for each body part
    for (const partName of partNames) {
      const matrix = getPartMatrix(partName, worldX, worldZ, heading, walkAngle)
      const idx = counts[partName] * 16
      matrix.copyToArray(buffers[partName], idx)
      counts[partName]++
    }

    // Only add health bar if enemy has taken damage
    if (enemy.hp < enemy.maxHp) {
      const hpPercent = enemy.hp / enemy.maxHp
      const healthBarY = 2.0

      // Store position and HP data for health bars (rendered separately due to billboard issues with thin instances)
      healthBarBgData.push({ x: worldX, y: healthBarY, z: worldZ })
      healthBarFgData.push({ x: worldX, y: healthBarY, z: worldZ, scale: hpPercent })
    }
  }

  // Update thin instance buffers for orc parts
  for (const partName of partNames) {
    // Normal orcs
    if (normalCounts[partName] > 0) {
      normalMeshes[partName].isVisible = true
      normalMeshes[partName].thinInstanceSetBuffer('matrix', instanceBuffers.normal[partName], 16, false)
      normalMeshes[partName].thinInstanceCount = normalCounts[partName]
    } else {
      normalMeshes[partName].isVisible = false
      normalMeshes[partName].thinInstanceCount = 0
    }

    // Frosted orcs
    if (frostedCounts[partName] > 0) {
      frostedMeshes[partName].isVisible = true
      frostedMeshes[partName].thinInstanceSetBuffer('matrix', instanceBuffers.frosted[partName], 16, false)
      frostedMeshes[partName].thinInstanceCount = frostedCounts[partName]
    } else {
      frostedMeshes[partName].isVisible = false
      frostedMeshes[partName].thinInstanceCount = 0
    }
  }

  // Update health bars (only shown for damaged enemies)
  // Using standard instances with billboard mode (thin instances don't work well with billboards)
  updateHealthBarInstances(healthBarBgData, healthBarFgData)
}

// Get enemy position for targeting
export function getEnemyPosition(enemyId) {
  const state = getState()
  const enemy = state.enemies.find(e => e.id === enemyId)
  if (!enemy || !enemy.spawned || enemy.dying) return null

  const pathPos = getPositionOnPath(enemy.pathProgress)
  return {
    x: pathPos.x,
    y: 0.8, // Center of orc body
    z: pathPos.z
  }
}

// Get all active enemies for targeting
export function getActiveEnemies() {
  const state = getState()
  return state.enemies.filter(e => e.spawned && !e.dying).map(e => {
    const pathPos = getPositionOnPath(e.pathProgress)
    return {
      id: e.id,
      position: { x: pathPos.x, y: 0.8, z: pathPos.z },
      hp: e.hp,
      maxHp: e.maxHp,
      frosted: e.frostedUntil > Date.now()
    }
  })
}

export function resetEnemyManager() {
  // Hide all health bar instances
  for (const instance of healthBarBgInstances) {
    instance.isVisible = false
  }
  for (const instance of healthBarFgInstances) {
    instance.isVisible = false
  }

  // Reset thin instance counts
  const partNames = getPartNames()
  for (const partName of partNames) {
    if (normalMeshes && normalMeshes[partName]) {
      normalMeshes[partName].thinInstanceCount = 0
      normalMeshes[partName].isVisible = false
    }
    if (frostedMeshes && frostedMeshes[partName]) {
      frostedMeshes[partName].thinInstanceCount = 0
      frostedMeshes[partName].isVisible = false
    }
  }
}

export function disposeEnemyManager() {
  if (normalMeshes) {
    for (const mesh of Object.values(normalMeshes)) {
      mesh.dispose()
    }
  }
  if (frostedMeshes) {
    for (const mesh of Object.values(frostedMeshes)) {
      mesh.dispose()
    }
  }
  if (healthBarBgBase) healthBarBgBase.dispose()
  if (healthBarFgBase) healthBarFgBase.dispose()
  for (const instance of healthBarBgInstances) {
    instance.dispose()
  }
  for (const instance of healthBarFgInstances) {
    instance.dispose()
  }
  healthBarBgInstances = []
  healthBarFgInstances = []
}
