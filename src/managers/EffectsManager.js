// ============================================
// EFFECTS MANAGER - Particles, explosions, ragdolls, popups
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PointLight } from '@babylonjs/core/Lights/pointLight'

import {
  getState,
  spawnRagdoll,
  updateRagdolls,
  removeRagdoll,
  spawnParticles,
  updateParticles,
  spawnGoldPopup,
  updateGoldPopups
} from '../store.js'
import {
  COLORS,
  VOXEL_SHATTER_LIFETIME,
  GOLD_POPUP_LIFETIME,
  RAGDOLL_LIFETIME,
  MUZZLE_FLASH_LIFETIME,
  DEATH_LIGHT_LIFETIME,
  FROST_EXPLOSION_LIFETIME,
  SCORCH_MARK_LIFETIME,
  CRIT_FLASH_LIFETIME,
  KNOCKBACK_FORCE,
  GRAVITY,
  BOSS_CONFIG
} from '../settings.js'

let scene = null

// Mesh pools for reuse
const voxelPool = []
const muzzleFlashPool = []
const deathLightPool = []
const scorchMarkPool = []
const explosionPool = []
const goldPopupPool = []

// Active effects tracking
let activeVoxels = []
let activeMuzzleFlashes = []
let activeDeathLights = []
let activeScorchMarks = []
let activeExplosions = []
let activeGoldPopups = []
let activeRagdolls = []

// Materials (reused)
let greenVoxelMat = null
let orangeFlashMat = null
let goldFlashMat = null
let frostExplosionMat = null
let fireExplosionMat = null
let smokeExplosionMat = null
let scorchMat = null
let goldTextMat = null

export function initEffectsManager(sceneRef) {
  scene = sceneRef
  createMaterials()
}

function createMaterials() {
  // Green voxel for orc shatter
  greenVoxelMat = new StandardMaterial('greenVoxelMat', scene)
  greenVoxelMat.diffuseColor = Color3.FromHexString(COLORS.ORC_SKIN)
  greenVoxelMat.emissiveColor = Color3.FromHexString(COLORS.ORC_SKIN).scale(0.2)

  // Orange flash for muzzle/death
  orangeFlashMat = new StandardMaterial('orangeFlashMat', scene)
  orangeFlashMat.diffuseColor = new Color3(1, 0.5, 0)
  orangeFlashMat.emissiveColor = new Color3(1, 0.6, 0.2)
  orangeFlashMat.alpha = 0.9

  // Golden flash for crits
  goldFlashMat = new StandardMaterial('goldFlashMat', scene)
  goldFlashMat.diffuseColor = Color3.FromHexString(COLORS.GOLD)
  goldFlashMat.emissiveColor = Color3.FromHexString(COLORS.GOLD)
  goldFlashMat.alpha = 0.8

  // Frost explosion material
  frostExplosionMat = new StandardMaterial('frostExplosionMat', scene)
  frostExplosionMat.diffuseColor = Color3.FromHexString(COLORS.ICE)
  frostExplosionMat.emissiveColor = Color3.FromHexString(COLORS.ICE).scale(0.5)
  frostExplosionMat.alpha = 0.6

  // Fire explosion material
  fireExplosionMat = new StandardMaterial('fireExplosionMat', scene)
  fireExplosionMat.diffuseColor = Color3.FromHexString(COLORS.FIRE)
  fireExplosionMat.emissiveColor = Color3.FromHexString(COLORS.FIRE)
  fireExplosionMat.alpha = 0.8

  // Smoke material
  smokeExplosionMat = new StandardMaterial('smokeExplosionMat', scene)
  smokeExplosionMat.diffuseColor = new Color3(0.3, 0.3, 0.3)
  smokeExplosionMat.alpha = 0.5

  // Scorch mark material
  scorchMat = new StandardMaterial('scorchMat', scene)
  scorchMat.diffuseColor = new Color3(0.1, 0.1, 0.1)
  scorchMat.alpha = 0.4

  // Gold text material
  goldTextMat = new StandardMaterial('goldTextMat', scene)
  goldTextMat.diffuseColor = Color3.FromHexString(COLORS.GOLD)
  goldTextMat.emissiveColor = Color3.FromHexString(COLORS.GOLD)
}

// ============================================
// VOXEL SHATTER - 12 green cubes bursting
// ============================================

export function spawnVoxelShatter(position, heading = 0) {
  const now = Date.now()
  const cubeCount = 12

  for (let i = 0; i < cubeCount; i++) {
    // Get or create voxel
    let voxel = voxelPool.pop()
    if (!voxel) {
      voxel = MeshBuilder.CreateBox('voxel', { size: 0.15 }, scene)
      voxel.material = greenVoxelMat
    }

    // Random offset from center
    const offsetX = (Math.random() - 0.5) * 0.8
    const offsetY = Math.random() * 0.8 + 0.3
    const offsetZ = (Math.random() - 0.5) * 0.8

    voxel.position.set(
      position.x + offsetX,
      position.y + offsetY,
      position.z + offsetZ
    )

    // Random velocity (burst outward)
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 4
    const upSpeed = 2 + Math.random() * 4

    voxel.isVisible = true

    activeVoxels.push({
      mesh: voxel,
      spawnTime: now,
      velocity: {
        x: Math.cos(angle) * speed,
        y: upSpeed,
        z: Math.sin(angle) * speed
      },
      rotationSpeed: {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10
      }
    })
  }
}

// ============================================
// RAGDOLL - Full orc tumbling with knockback
// ============================================

export function spawnOrcRagdoll(position, heading, knockbackDir = null) {
  const now = Date.now()

  // Create ragdoll parent mesh
  const ragdoll = MeshBuilder.CreateBox('ragdoll', {
    width: 0.6,
    height: 1.2,
    depth: 0.4
  }, scene)

  const ragdollMat = new StandardMaterial('ragdollMat', scene)
  ragdollMat.diffuseColor = Color3.FromHexString(COLORS.ORC_SKIN)
  ragdoll.material = ragdollMat

  ragdoll.position.set(position.x, position.y + 0.6, position.z)
  ragdoll.rotation.y = heading

  // Calculate knockback velocity
  let vx = 0, vz = 0
  if (knockbackDir) {
    vx = knockbackDir.x * KNOCKBACK_FORCE
    vz = knockbackDir.z * KNOCKBACK_FORCE
  } else {
    // Random tumble direction
    const angle = Math.random() * Math.PI * 2
    vx = Math.cos(angle) * KNOCKBACK_FORCE * 0.5
    vz = Math.sin(angle) * KNOCKBACK_FORCE * 0.5
  }

  activeRagdolls.push({
    mesh: ragdoll,
    spawnTime: now,
    velocity: {
      x: vx,
      y: 3 + Math.random() * 2,
      z: vz
    },
    rotationSpeed: {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 8
    },
    grounded: false
  })
}

// ============================================
// MUZZLE FLASH - Orange flash at tower fire point
// ============================================

export function spawnMuzzleFlash(position, towerType) {
  const now = Date.now()

  let flash = muzzleFlashPool.pop()
  if (!flash) {
    flash = MeshBuilder.CreateSphere('muzzleFlash', { diameter: 0.4, segments: 8 }, scene)
    flash.material = orangeFlashMat
  }

  flash.position.set(position.x, position.y, position.z)
  flash.scaling.setAll(1)
  flash.isVisible = true

  // Vary color by tower type
  if (towerType === 'frost') {
    flash.material = frostExplosionMat
  } else if (towerType === 'lightning') {
    const lightningFlashMat = new StandardMaterial('lightningFlashMat', scene)
    lightningFlashMat.diffuseColor = Color3.FromHexString(COLORS.LIGHTNING)
    lightningFlashMat.emissiveColor = Color3.FromHexString(COLORS.LIGHTNING)
    lightningFlashMat.alpha = 0.9
    flash.material = lightningFlashMat
  } else {
    flash.material = orangeFlashMat
  }

  activeMuzzleFlashes.push({
    mesh: flash,
    spawnTime: now
  })
}

// ============================================
// DEATH LIGHT - Orange glow on enemy death
// ============================================

export function spawnDeathLight(position) {
  const now = Date.now()

  // Create point light for glow effect
  const light = new PointLight('deathLight', new Vector3(position.x, position.y + 0.5, position.z), scene)
  light.diffuse = new Color3(1, 0.5, 0.2)
  light.specular = new Color3(1, 0.6, 0.3)
  light.intensity = 2
  light.range = 5

  // Also create visual flash sphere
  let flash = deathLightPool.pop()
  if (!flash) {
    flash = MeshBuilder.CreateSphere('deathFlash', { diameter: 0.8, segments: 8 }, scene)
    flash.material = orangeFlashMat
  }

  flash.position.set(position.x, position.y + 0.5, position.z)
  flash.isVisible = true

  activeDeathLights.push({
    light,
    mesh: flash,
    spawnTime: now
  })
}

// ============================================
// CRITICAL HIT FLASH - Golden flash
// ============================================

export function spawnCritFlash(position) {
  const now = Date.now()

  const flash = MeshBuilder.CreateSphere('critFlash', { diameter: 1.2, segments: 8 }, scene)
  flash.material = goldFlashMat
  flash.position.set(position.x, position.y, position.z)

  activeExplosions.push({
    mesh: flash,
    spawnTime: now,
    lifetime: CRIT_FLASH_LIFETIME,
    type: 'crit',
    maxScale: 1.5
  })
}

// ============================================
// FROST EXPLOSION - Cyan expanding sphere
// ============================================

export function spawnFrostExplosion(position, radius) {
  const now = Date.now()

  const sphere = MeshBuilder.CreateSphere('frostExplosion', { diameter: 0.5, segments: 12 }, scene)
  sphere.material = frostExplosionMat
  sphere.position.set(position.x, position.y + 0.3, position.z)

  activeExplosions.push({
    mesh: sphere,
    spawnTime: now,
    lifetime: FROST_EXPLOSION_LIFETIME,
    type: 'frost',
    maxScale: radius * 2
  })
}

// ============================================
// FIRE EXPLOSION - Fire particles, smoke, shockwave
// ============================================

export function spawnFireExplosion(position, radius) {
  const now = Date.now()

  // Main fire burst
  const fireSphere = MeshBuilder.CreateSphere('fireExplosion', { diameter: 0.5, segments: 12 }, scene)
  fireSphere.material = fireExplosionMat
  fireSphere.position.set(position.x, position.y + 0.3, position.z)

  activeExplosions.push({
    mesh: fireSphere,
    spawnTime: now,
    lifetime: 300,
    type: 'fire',
    maxScale: radius * 1.5
  })

  // Smoke ring
  const smokeRing = MeshBuilder.CreateTorus('smokeRing', {
    diameter: radius,
    thickness: 0.3,
    tessellation: 24
  }, scene)
  smokeRing.material = smokeExplosionMat
  smokeRing.position.set(position.x, position.y + 0.1, position.z)
  smokeRing.rotation.x = Math.PI / 2

  activeExplosions.push({
    mesh: smokeRing,
    spawnTime: now,
    lifetime: 500,
    type: 'smoke',
    maxScale: 2.0
  })

  // Spawn debris particles
  for (let i = 0; i < 8; i++) {
    const debris = MeshBuilder.CreateBox('debris', { size: 0.1 }, scene)
    debris.material = smokeExplosionMat
    debris.position.set(
      position.x + (Math.random() - 0.5) * 0.5,
      position.y + 0.5,
      position.z + (Math.random() - 0.5) * 0.5
    )

    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 3

    activeVoxels.push({
      mesh: debris,
      spawnTime: now,
      velocity: {
        x: Math.cos(angle) * speed,
        y: 3 + Math.random() * 3,
        z: Math.sin(angle) * speed
      },
      rotationSpeed: {
        x: (Math.random() - 0.5) * 15,
        y: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 15
      },
      isDebris: true
    })
  }

  // Scorch mark
  spawnScorchMark(position, radius)
}

// ============================================
// LIGHTNING IMPACT - Flash and particles
// ============================================

export function spawnLightningImpact(position) {
  const now = Date.now()

  // Bright flash
  const flash = MeshBuilder.CreateSphere('lightningImpact', { diameter: 0.6, segments: 8 }, scene)
  const lightningMat = new StandardMaterial('lightningImpactMat', scene)
  lightningMat.diffuseColor = Color3.FromHexString(COLORS.LIGHTNING)
  lightningMat.emissiveColor = new Color3(0.8, 0.6, 1)
  lightningMat.alpha = 0.9
  flash.material = lightningMat
  flash.position.set(position.x, position.y, position.z)

  activeExplosions.push({
    mesh: flash,
    spawnTime: now,
    lifetime: 150,
    type: 'lightning',
    maxScale: 1.5
  })

  // Electric spark particles
  for (let i = 0; i < 4; i++) {
    const spark = MeshBuilder.CreateBox('spark', { size: 0.08 }, scene)
    spark.material = lightningMat
    spark.position.set(position.x, position.y, position.z)

    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 3

    activeVoxels.push({
      mesh: spark,
      spawnTime: now,
      velocity: {
        x: Math.cos(angle) * speed,
        y: 1 + Math.random() * 2,
        z: Math.sin(angle) * speed
      },
      rotationSpeed: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20
      },
      isDebris: true,
      shortLife: true
    })
  }
}

// ============================================
// SCORCH MARK - Decal on ground
// ============================================

export function spawnScorchMark(position, radius) {
  const now = Date.now()

  let mark = scorchMarkPool.pop()
  if (!mark) {
    mark = MeshBuilder.CreateDisc('scorchMark', { radius: 1, tessellation: 16 }, scene)
    mark.material = scorchMat
    mark.rotation.x = Math.PI / 2
  }

  mark.position.set(position.x, 0.02, position.z)
  mark.scaling.setAll(radius)
  mark.isVisible = true

  activeScorchMarks.push({
    mesh: mark,
    spawnTime: now
  })
}

// ============================================
// GOLD POPUP - Floating "+10" text
// ============================================

export function spawnGoldPopupEffect(position, amount) {
  const now = Date.now()

  // Create simple box as placeholder for text
  // (Real text would use DynamicTexture or GUI)
  const popup = MeshBuilder.CreatePlane('goldPopup', { width: 0.8, height: 0.4 }, scene)
  popup.billboardMode = 7 // Always face camera

  const popupMat = new StandardMaterial('popupMat', scene)
  popupMat.diffuseColor = Color3.FromHexString(COLORS.GOLD)
  popupMat.emissiveColor = Color3.FromHexString(COLORS.GOLD)
  popupMat.alpha = 1
  popup.material = popupMat

  popup.position.set(position.x, position.y + 1.5, position.z)

  activeGoldPopups.push({
    mesh: popup,
    spawnTime: now,
    amount,
    startY: position.y + 1.5
  })
}

// ============================================
// UPDATE - Process all active effects
// ============================================

export function updateEffectsManager(dt) {
  const now = Date.now()

  // Update voxel shatter physics
  updateVoxels(dt, now)

  // Update ragdolls
  updateRagdollsPhysics(dt, now)

  // Update muzzle flashes
  updateMuzzleFlashes(now)

  // Update death lights
  updateDeathLightsEffect(now)

  // Update explosions
  updateExplosions(now)

  // Update scorch marks
  updateScorchMarksEffect(now)

  // Update gold popups
  updateGoldPopupsEffect(dt, now)
}

function updateVoxels(dt, now) {
  const toRemove = []

  for (const voxel of activeVoxels) {
    const age = now - voxel.spawnTime
    const lifetime = voxel.shortLife ? 200 : VOXEL_SHATTER_LIFETIME

    if (age > lifetime) {
      toRemove.push(voxel)
      continue
    }

    // Apply gravity
    voxel.velocity.y += GRAVITY * dt

    // Update position
    voxel.mesh.position.x += voxel.velocity.x * dt
    voxel.mesh.position.y += voxel.velocity.y * dt
    voxel.mesh.position.z += voxel.velocity.z * dt

    // Update rotation
    voxel.mesh.rotation.x += voxel.rotationSpeed.x * dt
    voxel.mesh.rotation.y += voxel.rotationSpeed.y * dt
    voxel.mesh.rotation.z += voxel.rotationSpeed.z * dt

    // Bounce off ground
    if (voxel.mesh.position.y < 0.1) {
      voxel.mesh.position.y = 0.1
      voxel.velocity.y *= -0.3
      voxel.velocity.x *= 0.7
      voxel.velocity.z *= 0.7
    }

    // Fade out
    const fadeStart = lifetime * 0.6
    if (age > fadeStart) {
      const alpha = 1 - (age - fadeStart) / (lifetime - fadeStart)
      voxel.mesh.visibility = alpha
    }
  }

  // Remove expired voxels
  for (const voxel of toRemove) {
    voxel.mesh.isVisible = false
    voxel.mesh.visibility = 1
    if (!voxel.isDebris) {
      voxelPool.push(voxel.mesh)
    } else {
      voxel.mesh.dispose()
    }
    activeVoxels = activeVoxels.filter(v => v !== voxel)
  }
}

function updateRagdollsPhysics(dt, now) {
  const toRemove = []

  for (const ragdoll of activeRagdolls) {
    const age = now - ragdoll.spawnTime

    if (age > RAGDOLL_LIFETIME) {
      toRemove.push(ragdoll)
      continue
    }

    if (!ragdoll.grounded) {
      // Apply gravity
      ragdoll.velocity.y += GRAVITY * dt

      // Update position
      ragdoll.mesh.position.x += ragdoll.velocity.x * dt
      ragdoll.mesh.position.y += ragdoll.velocity.y * dt
      ragdoll.mesh.position.z += ragdoll.velocity.z * dt

      // Check ground collision
      if (ragdoll.mesh.position.y < 0.3) {
        ragdoll.mesh.position.y = 0.3
        ragdoll.grounded = true
        ragdoll.velocity = { x: 0, y: 0, z: 0 }
        ragdoll.rotationSpeed.x *= 0.1
        ragdoll.rotationSpeed.z *= 0.1
      }
    }

    // Always apply rotation (slower when grounded)
    ragdoll.mesh.rotation.x += ragdoll.rotationSpeed.x * dt
    ragdoll.mesh.rotation.y += ragdoll.rotationSpeed.y * dt
    ragdoll.mesh.rotation.z += ragdoll.rotationSpeed.z * dt

    // Fade out in last 500ms
    if (age > RAGDOLL_LIFETIME - 500) {
      const alpha = (RAGDOLL_LIFETIME - age) / 500
      ragdoll.mesh.visibility = alpha
    }
  }

  // Remove expired ragdolls
  for (const ragdoll of toRemove) {
    ragdoll.mesh.dispose()
    activeRagdolls = activeRagdolls.filter(r => r !== ragdoll)
  }
}

function updateMuzzleFlashes(now) {
  const toRemove = []

  for (const flash of activeMuzzleFlashes) {
    const age = now - flash.spawnTime

    if (age > MUZZLE_FLASH_LIFETIME) {
      toRemove.push(flash)
      continue
    }

    // Quick scale up then down
    const progress = age / MUZZLE_FLASH_LIFETIME
    const scale = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7
    flash.mesh.scaling.setAll(scale * 1.5)
    flash.mesh.visibility = 1 - progress
  }

  for (const flash of toRemove) {
    flash.mesh.isVisible = false
    flash.mesh.visibility = 1
    muzzleFlashPool.push(flash.mesh)
    activeMuzzleFlashes = activeMuzzleFlashes.filter(f => f !== flash)
  }
}

function updateDeathLightsEffect(now) {
  const toRemove = []

  for (const deathLight of activeDeathLights) {
    const age = now - deathLight.spawnTime

    if (age > DEATH_LIGHT_LIFETIME) {
      toRemove.push(deathLight)
      continue
    }

    // Fade out
    const progress = age / DEATH_LIGHT_LIFETIME
    const intensity = 2 * (1 - progress)
    deathLight.light.intensity = intensity
    deathLight.mesh.visibility = 1 - progress
    deathLight.mesh.scaling.setAll(1 + progress * 0.5)
  }

  for (const deathLight of toRemove) {
    deathLight.light.dispose()
    deathLight.mesh.isVisible = false
    deathLight.mesh.visibility = 1
    deathLightPool.push(deathLight.mesh)
    activeDeathLights = activeDeathLights.filter(d => d !== deathLight)
  }
}

function updateExplosions(now) {
  const toRemove = []

  for (const explosion of activeExplosions) {
    const age = now - explosion.spawnTime

    if (age > explosion.lifetime) {
      toRemove.push(explosion)
      continue
    }

    const progress = age / explosion.lifetime

    // Expand and fade
    const scale = explosion.maxScale * progress
    explosion.mesh.scaling.setAll(scale)
    explosion.mesh.visibility = 1 - progress
  }

  for (const explosion of toRemove) {
    explosion.mesh.dispose()
    activeExplosions = activeExplosions.filter(e => e !== explosion)
  }
}

function updateScorchMarksEffect(now) {
  const toRemove = []

  for (const mark of activeScorchMarks) {
    const age = now - mark.spawnTime

    if (age > SCORCH_MARK_LIFETIME) {
      toRemove.push(mark)
      continue
    }

    // Fade out in last half
    if (age > SCORCH_MARK_LIFETIME / 2) {
      const fadeProgress = (age - SCORCH_MARK_LIFETIME / 2) / (SCORCH_MARK_LIFETIME / 2)
      mark.mesh.visibility = 1 - fadeProgress
    }
  }

  for (const mark of toRemove) {
    mark.mesh.isVisible = false
    mark.mesh.visibility = 1
    scorchMarkPool.push(mark.mesh)
    activeScorchMarks = activeScorchMarks.filter(m => m !== mark)
  }
}

function updateGoldPopupsEffect(dt, now) {
  const toRemove = []

  for (const popup of activeGoldPopups) {
    const age = now - popup.spawnTime
    // Boss gold popup lasts longer
    const lifetime = popup.isBoss ? GOLD_POPUP_LIFETIME * 2 : GOLD_POPUP_LIFETIME

    if (age > lifetime) {
      toRemove.push(popup)
      continue
    }

    const progress = age / lifetime

    // Float upward (boss popup rises more)
    const riseAmount = popup.isBoss ? 4 : 1.5
    popup.mesh.position.y = popup.startY + progress * riseAmount

    // Fade out
    popup.mesh.visibility = 1 - progress

    // Scale up slightly (boss popup grows more)
    const scaleAmount = popup.isBoss ? 0.8 : 0.3
    popup.mesh.scaling.setAll(1 + progress * scaleAmount)
  }

  for (const popup of toRemove) {
    popup.mesh.dispose()
    activeGoldPopups = activeGoldPopups.filter(p => p !== popup)
  }
}

// ============================================
// COMBINED DEATH EFFECT
// ============================================

export function triggerDeathEffect(position, heading, knockbackDir = null, showGold = true, wasBoss = false) {
  if (wasBoss) {
    // MASSIVE BOSS DEATH EXPLOSION
    triggerBossDeathEffect(position, heading)
    return
  }

  // Spawn voxel shatter
  spawnVoxelShatter(position, heading)

  // Spawn ragdoll
  spawnOrcRagdoll(position, heading, knockbackDir)

  // Spawn death light flash
  spawnDeathLight(position)

  // Spawn gold popup
  if (showGold) {
    spawnGoldPopupEffect(position, 10)
  }
}

// ============================================
// BOSS DEATH - ULTIMATE EXPLOSION
// ============================================

export function triggerBossDeathEffect(position, heading) {
  const now = Date.now()

  console.log('%c THE BOSS HAS BEEN SLAIN!', 'color: gold; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px black;')

  // MASSIVE fire explosion
  for (let i = 0; i < 5; i++) {
    const offset = {
      x: position.x + (Math.random() - 0.5) * 8,
      y: position.y + Math.random() * 4,
      z: position.z + (Math.random() - 0.5) * 8
    }
    setTimeout(() => spawnFireExplosion(offset, BOSS_CONFIG.DEATH_EXPLOSION_RADIUS * 0.4), i * 100)
  }

  // Main explosion sphere - giant
  const mainExplosion = MeshBuilder.CreateSphere('bossDeathExplosion', {
    diameter: 2,
    segments: 16
  }, scene)

  const explosionMat = new StandardMaterial('bossExplosionMat', scene)
  explosionMat.diffuseColor = Color3.FromHexString('#FF4500')
  explosionMat.emissiveColor = Color3.FromHexString('#FF6600')
  explosionMat.alpha = 0.9
  mainExplosion.material = explosionMat
  mainExplosion.position.set(position.x, position.y + 3, position.z)

  activeExplosions.push({
    mesh: mainExplosion,
    spawnTime: now,
    lifetime: 1500,
    type: 'bossExplosion',
    maxScale: BOSS_CONFIG.DEATH_EXPLOSION_RADIUS * 2
  })

  // Shockwave ring
  const shockwave = MeshBuilder.CreateTorus('bossShockwave', {
    diameter: 4,
    thickness: 1,
    tessellation: 32
  }, scene)

  const shockwaveMat = new StandardMaterial('bossShockwaveMat', scene)
  shockwaveMat.diffuseColor = Color3.FromHexString('#FF0000')
  shockwaveMat.emissiveColor = Color3.FromHexString('#FF4500')
  shockwaveMat.alpha = 0.7
  shockwave.material = shockwaveMat
  shockwave.position.set(position.x, 0.5, position.z)
  shockwave.rotation.x = Math.PI / 2

  activeExplosions.push({
    mesh: shockwave,
    spawnTime: now,
    lifetime: 1200,
    type: 'bossShockwave',
    maxScale: BOSS_CONFIG.DEATH_EXPLOSION_RADIUS * 3
  })

  // TONS of debris/voxels flying everywhere
  for (let i = 0; i < 60; i++) {
    const voxel = MeshBuilder.CreateBox(`bossDebris_${i}`, {
      size: 0.2 + Math.random() * 0.4
    }, scene)

    // Random red/orange/dark colors
    const debrisMat = new StandardMaterial(`bossDebrisMat_${i}`, scene)
    const colorChoice = Math.random()
    if (colorChoice < 0.33) {
      debrisMat.diffuseColor = Color3.FromHexString(BOSS_CONFIG.COLORS.SKIN)
      debrisMat.emissiveColor = Color3.FromHexString(BOSS_CONFIG.COLORS.SKIN_GLOW).scale(0.3)
    } else if (colorChoice < 0.66) {
      debrisMat.diffuseColor = Color3.FromHexString(BOSS_CONFIG.COLORS.ARMOR)
    } else {
      debrisMat.diffuseColor = Color3.FromHexString(BOSS_CONFIG.COLORS.METAL)
      debrisMat.emissiveColor = new Color3(0.1, 0.05, 0.15)
    }
    voxel.material = debrisMat

    voxel.position.set(
      position.x + (Math.random() - 0.5) * 4,
      position.y + Math.random() * 6,
      position.z + (Math.random() - 0.5) * 4
    )

    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 15

    activeVoxels.push({
      mesh: voxel,
      spawnTime: now,
      velocity: {
        x: Math.cos(angle) * speed,
        y: 8 + Math.random() * 12,
        z: Math.sin(angle) * speed
      },
      rotationSpeed: {
        x: (Math.random() - 0.5) * 15,
        y: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 15
      },
      isDebris: true
    })
  }

  // Multiple death lights for dramatic effect
  for (let i = 0; i < 8; i++) {
    const offset = {
      x: position.x + (Math.random() - 0.5) * 6,
      y: position.y + Math.random() * 4,
      z: position.z + (Math.random() - 0.5) * 6
    }
    setTimeout(() => spawnDeathLight(offset), i * 50)
  }

  // Giant scorch mark
  spawnScorchMark(position, BOSS_CONFIG.DEATH_EXPLOSION_RADIUS)

  // Massive gold popup
  spawnBossGoldPopup(position, BOSS_CONFIG.DEATH_GOLD_REWARD)
}

// Giant gold popup for boss kill
function spawnBossGoldPopup(position, amount) {
  const now = Date.now()

  const popup = MeshBuilder.CreatePlane('bossGoldPopup', { width: 3, height: 1.5 }, scene)
  popup.billboardMode = 7

  const popupMat = new StandardMaterial('bossPopupMat', scene)
  popupMat.diffuseColor = Color3.FromHexString(COLORS.GOLD)
  popupMat.emissiveColor = Color3.FromHexString(COLORS.GOLD)
  popupMat.alpha = 1
  popup.material = popupMat

  popup.position.set(position.x, position.y + 8, position.z)

  activeGoldPopups.push({
    mesh: popup,
    spawnTime: now,
    amount,
    startY: position.y + 8,
    isBoss: true
  })
}

// ============================================
// RESET & DISPOSE
// ============================================

export function resetEffectsManager() {
  // Dispose active effects
  for (const voxel of activeVoxels) {
    voxel.mesh.dispose()
  }
  for (const ragdoll of activeRagdolls) {
    ragdoll.mesh.dispose()
  }
  for (const flash of activeMuzzleFlashes) {
    flash.mesh.dispose()
  }
  for (const deathLight of activeDeathLights) {
    deathLight.light.dispose()
    deathLight.mesh.dispose()
  }
  for (const explosion of activeExplosions) {
    explosion.mesh.dispose()
  }
  for (const mark of activeScorchMarks) {
    mark.mesh.dispose()
  }
  for (const popup of activeGoldPopups) {
    popup.mesh.dispose()
  }

  // Clear arrays (keep pools for reuse)
  activeVoxels = []
  activeRagdolls = []
  activeMuzzleFlashes = []
  activeDeathLights = []
  activeExplosions = []
  activeScorchMarks = []
  activeGoldPopups = []
}

export function disposeEffectsManager() {
  // Dispose active effects
  for (const voxel of activeVoxels) {
    voxel.mesh.dispose()
  }
  for (const ragdoll of activeRagdolls) {
    ragdoll.mesh.dispose()
  }
  for (const flash of activeMuzzleFlashes) {
    flash.mesh.dispose()
  }
  for (const deathLight of activeDeathLights) {
    deathLight.light.dispose()
    deathLight.mesh.dispose()
  }
  for (const explosion of activeExplosions) {
    explosion.mesh.dispose()
  }
  for (const mark of activeScorchMarks) {
    mark.mesh.dispose()
  }
  for (const popup of activeGoldPopups) {
    popup.mesh.dispose()
  }

  // Dispose pools
  for (const mesh of voxelPool) {
    mesh.dispose()
  }
  for (const mesh of muzzleFlashPool) {
    mesh.dispose()
  }
  for (const mesh of deathLightPool) {
    mesh.dispose()
  }
  for (const mesh of scorchMarkPool) {
    mesh.dispose()
  }

  // Clear arrays
  activeVoxels = []
  activeRagdolls = []
  activeMuzzleFlashes = []
  activeDeathLights = []
  activeExplosions = []
  activeScorchMarks = []
  activeGoldPopups = []
  voxelPool.length = 0
  muzzleFlashPool.length = 0
  deathLightPool.length = 0
  scorchMarkPool.length = 0
}
