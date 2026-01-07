// ============================================
// ENEMY MANAGER - Spawning, movement, thin instances
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { PointLight } from '@babylonjs/core/Lights/pointLight'

import {
  createOrcMaterials,
  createOrcBaseMeshes,
  getPartMatrix,
  getPartNames
} from '../models/orc.js'
import {
  createBossMaterials,
  createBossBaseMeshes,
  getBossPartMatrix,
  getBossPartNames,
  createBossAura,
  BOSS_PARTS
} from '../models/boss.js'
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
  enemyPassed,
  updateBossRegen,
  updateBossMinionSpawn
} from '../store.js'
import {
  MAX_ENEMIES,
  JITTER_AMPLITUDE,
  JITTER_FREQUENCY,
  BOSS_CONFIG,
  BASE_HP,
  BASE_SPEED,
  ENEMY_HP_SCALE,
  ENEMY_SPEED_SCALE
} from '../settings.js'

let scene = null
let materials = null
let normalMeshes = null
let frostedMeshes = null
let healthBarBgBase = null
let healthBarFgBase = null
let healthBarBgInstances = []
let healthBarFgInstances = []

// BOSS specific meshes and effects
let bossMaterials = null
let bossMeshes = null
let bossAura = null
let bossLight = null
let bossGroundCracks = []
let lastBossPosition = null

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

  // Initialize BOSS meshes and effects
  initBoss()
}

function initBoss() {
  // Create boss materials - dark and menacing
  bossMaterials = createBossMaterials(scene)

  // Create boss meshes (not using thin instances - direct mesh manipulation for the single boss)
  bossMeshes = {}
  const bossPartNames = getBossPartNames()

  for (const partName of bossPartNames) {
    const part = BOSS_PARTS[partName]
    const mesh = MeshBuilder.CreateBox(`boss_${partName}`, {
      width: part.w,
      height: part.h,
      depth: part.d
    }, scene)

    // Determine material based on part
    let matType = 'skin'
    if (partName.includes('Tusk') || partName.includes('Horn') || partName === 'chestSkull') matType = 'bone'
    else if (partName.includes('Shoulder') || partName === 'belt') matType = 'armor'
    else if (partName.includes('helmet') || partName.includes('Spike') || partName === 'axeBlade') matType = 'metal'
    else if (partName === 'axeHandle') matType = 'wood'
    else if (partName.includes('Eye')) matType = 'eye'

    mesh.material = bossMaterials[matType]
    mesh.isVisible = false

    bossMeshes[partName] = mesh
  }

  // Create boss aura (pulsing red sphere)
  bossAura = createBossAura(scene)

  // Create boss point light (red glow)
  bossLight = new PointLight('bossLight', new Vector3(0, 3, 0), scene)
  bossLight.diffuse = Color3.FromHexString('#FF4500')
  bossLight.specular = Color3.FromHexString('#FF0000')
  bossLight.intensity = 0
  bossLight.range = 15
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

  // Track if boss is active
  let bossActive = false
  let bossWorldPos = null

  // Boss abilities - regeneration and minion spawning
  updateBossRegen(dt)
  const wave = state.currentWave
  const baseHp = BASE_HP * Math.pow(ENEMY_HP_SCALE, wave - 1)
  const baseSpeed = BASE_SPEED * Math.pow(ENEMY_SPEED_SCALE, wave - 1)
  updateBossMinionSpawn(state.waveTime, baseHp, baseSpeed)

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
      if (now - enemy.deathTime > (enemy.isBoss ? 2000 : 500)) {
        removeEnemy(enemy.id)
      }
      continue
    }

    // Calculate effective speed (apply frost slow - boss is immune)
    let effectiveSpeed = enemy.speed
    if (enemy.frostedUntil > now && !enemy.isBoss) {
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

    // Apply jitter for natural movement (boss has very subtle jitter)
    const jitterMult = enemy.isBoss ? 0.2 : 1.0
    const jitterX = Math.sin(time * JITTER_FREQUENCY + enemy.jitterSeed) * JITTER_AMPLITUDE * jitterMult
    const jitterZ = Math.sin(time * JITTER_FREQUENCY * 1.3 + enemy.jitterSeed + 100) * JITTER_AMPLITUDE * 0.5 * jitterMult

    // Rotate jitter by heading to stay perpendicular to path
    const perpX = jitterX * Math.cos(heading) - jitterZ * Math.sin(heading)
    const perpZ = jitterX * Math.sin(heading) + jitterZ * Math.cos(heading)

    const worldX = pathPos.x + perpX
    const worldZ = pathPos.z + perpZ

    // Calculate walk animation angle
    const walkAngle = time * effectiveSpeed * (enemy.isBoss ? 2 : 4)

    // BOSS RENDERING - special handling
    if (enemy.isBoss) {
      bossActive = true
      bossWorldPos = { x: worldX, z: worldZ }
      renderBoss(worldX, worldZ, heading, walkAngle, time)

      // Boss health bar is much higher
      if (enemy.hp < enemy.maxHp) {
        const hpPercent = enemy.hp / enemy.maxHp
        const healthBarY = 9.0 // Much higher for boss
        healthBarBgData.push({ x: worldX, y: healthBarY, z: worldZ, isBoss: true })
        healthBarFgData.push({ x: worldX, y: healthBarY, z: worldZ, scale: hpPercent, isBoss: true })
      }
      continue // Skip normal orc rendering for boss
    }

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

  // Hide boss meshes if no boss is active
  if (!bossActive) {
    hideBoss()
  }

  // Update health bars (only shown for damaged enemies)
  // Using standard instances with billboard mode (thin instances don't work well with billboards)
  updateHealthBarInstances(healthBarBgData, healthBarFgData)
}

// Render the ULTIMATE HYPER BOSS
function renderBoss(worldX, worldZ, heading, walkAngle, time) {
  const bossPartNames = getBossPartNames()

  for (const partName of bossPartNames) {
    const mesh = bossMeshes[partName]
    if (!mesh) continue

    const matrix = getBossPartMatrix(partName, worldX, worldZ, heading, walkAngle)

    // Extract position and rotation from matrix
    const pos = new Vector3()
    const rot = new Vector3()
    const scale = new Vector3()
    matrix.decompose(scale, undefined, pos)

    mesh.position.copyFrom(pos)
    mesh.rotationQuaternion = null
    mesh.rotation.y = heading

    // Apply limb animations directly
    if (partName === 'leftLeg') {
      mesh.rotation.x = Math.sin(walkAngle) * 0.2
    } else if (partName === 'rightLeg') {
      mesh.rotation.x = Math.sin(walkAngle + Math.PI) * 0.2
    } else if (partName === 'leftArm') {
      mesh.rotation.x = Math.sin(walkAngle + Math.PI) * 0.15
    } else if (partName === 'rightArm' || partName === 'axeHandle' || partName === 'axeBlade') {
      mesh.rotation.x = Math.sin(walkAngle) * 0.15
    }

    // Pulsing glow for eyes
    if (partName.includes('Eye')) {
      const pulse = 0.7 + Math.sin(time * 8) * 0.3
      mesh.material.emissiveColor = Color3.FromHexString('#FF0000').scale(pulse)
    }

    mesh.isVisible = true
  }

  // Update boss aura - pulsing red sphere
  if (bossAura) {
    bossAura.position.set(worldX, BOSS_CONFIG.SCALE * 0.8, worldZ)
    bossAura.isVisible = true

    // Pulsing scale
    const auraPulse = 1 + Math.sin(time * 3) * 0.15
    bossAura.scaling.setAll(auraPulse)

    // Pulsing alpha
    bossAura.material.alpha = 0.1 + Math.sin(time * 4) * 0.05
  }

  // Update boss light
  if (bossLight) {
    bossLight.position.set(worldX, BOSS_CONFIG.SCALE * 1.2, worldZ)
    bossLight.intensity = 1.5 + Math.sin(time * 5) * 0.5
  }

  lastBossPosition = { x: worldX, z: worldZ }
}

// Hide boss meshes when not active
function hideBoss() {
  if (bossMeshes) {
    for (const mesh of Object.values(bossMeshes)) {
      if (mesh) mesh.isVisible = false
    }
  }
  if (bossAura) bossAura.isVisible = false
  if (bossLight) bossLight.intensity = 0
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
    // Boss is much taller - target center of mass
    const targetY = e.isBoss ? BOSS_CONFIG.SCALE * 0.8 : 0.8
    return {
      id: e.id,
      position: { x: pathPos.x, y: targetY, z: pathPos.z },
      hp: e.hp,
      maxHp: e.maxHp,
      frosted: e.frostedUntil > Date.now(),
      isBoss: e.isBoss || false
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

  // Hide boss
  hideBoss()
  lastBossPosition = null
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

  // Dispose boss resources
  if (bossMeshes) {
    for (const mesh of Object.values(bossMeshes)) {
      if (mesh) mesh.dispose()
    }
    bossMeshes = null
  }
  if (bossAura) {
    bossAura.dispose()
    bossAura = null
  }
  if (bossLight) {
    bossLight.dispose()
    bossLight = null
  }
  for (const crack of bossGroundCracks) {
    crack.dispose()
  }
  bossGroundCracks = []
  bossMaterials = null
}
