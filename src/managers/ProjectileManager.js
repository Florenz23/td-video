// ============================================
// PROJECTILE MANAGER - Targeting, firing, physics, damage
// ============================================

import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'

import { createProjectile } from '../models/projectile.js'
import { getActiveEnemies } from './EnemyManager.js'
import { getTowerFirePoint } from './TowerManager.js'
import {
  getState,
  updateTowerLastFireTime,
  damageEnemy,
  applyFrost,
  addProjectile,
  removeProjectile
} from '../store.js'
import {
  TOWERS,
  GRAVITY,
  FLAME_GRAVITY,
  MAX_PROJECTILES
} from '../settings.js'
import { getPositionOnPath, getHeadingOnPath } from '../path.js'
import {
  triggerDeathEffect,
  spawnMuzzleFlash,
  spawnCritFlash,
  spawnFrostExplosion,
  spawnFireExplosion,
  spawnLightningImpact
} from './EffectsManager.js'

let scene = null
let projectileMeshes = {} // projectileId -> mesh

export function initProjectileManager(sceneRef) {
  scene = sceneRef
}

export function updateProjectileManager(dt) {
  const state = getState()
  if (state.phase !== 'WAVE') return

  const now = Date.now()

  // Process tower firing
  for (const tower of state.towers) {
    processTowerFiring(tower, now)
  }

  // Update projectiles
  updateProjectiles(dt, now)
}

function processTowerFiring(tower, now) {
  const config = TOWERS[tower.type]
  const cooldown = 1000 / config.fireRate

  // Check cooldown
  if (now - tower.lastFireTime < cooldown) return

  // Lightning handles differently (instant chain, no projectile)
  if (tower.type === 'lightning') {
    fireLightning(tower, now)
    return
  }

  // Find target
  const target = findTarget(tower.position, config.range)
  if (!target) return

  // Fire projectile
  fireProjectile(tower, target, now)
  updateTowerLastFireTime(tower.id, now)
}

function findTarget(towerPos, range) {
  const enemies = getActiveEnemies()
  let nearest = null
  let nearestDist = Infinity

  for (const enemy of enemies) {
    const dx = enemy.position.x - towerPos.x
    const dz = enemy.position.z - towerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist <= range && dist < nearestDist) {
      nearest = enemy
      nearestDist = dist
    }
  }

  return nearest
}

function fireProjectile(tower, target, now) {
  const firePoint = getTowerFirePoint(tower.id)
  if (!firePoint) return

  const config = TOWERS[tower.type]

  // Calculate initial velocity
  let velocity
  if (tower.type === 'flame') {
    // Ballistic arc
    velocity = calculateBallisticVelocity(firePoint, target.position, config.gravity)
  } else {
    // Homing - direction toward target
    const dx = target.position.x - firePoint.x
    const dy = target.position.y - firePoint.y
    const dz = target.position.z - firePoint.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    velocity = {
      x: (dx / dist) * config.projectileSpeed,
      y: (dy / dist) * config.projectileSpeed,
      z: (dz / dist) * config.projectileSpeed
    }
  }

  // Create projectile data
  const projectile = {
    type: tower.type,
    towerId: tower.id,
    targetId: target.id,
    position: { ...firePoint },
    velocity,
    spawnTime: now,
    damage: config.damage,
    aoeRadius: config.aoeRadius || 0,
    critChance: config.critChance || 0,
    critMultiplier: config.critMultiplier || 1
  }

  addProjectile(projectile)

  // Create mesh
  const state = getState()
  const newProjectile = state.projectiles[state.projectiles.length - 1]
  createProjectileMesh(newProjectile)

  // Spawn muzzle flash
  spawnMuzzleFlash(firePoint, tower.type)
}

function calculateBallisticVelocity(start, target, gravity) {
  const dx = target.x - start.x
  const dy = target.y - start.y
  const dz = target.z - start.z
  const horizontalDist = Math.sqrt(dx * dx + dz * dz)

  // Calculate flight time based on arc
  const baseFallTime = Math.sqrt(2 * Math.max(start.y, 1) / gravity)
  const flightTime = baseFallTime * 1.5

  // Calculate velocities
  const vx = dx / flightTime
  const vz = dz / flightTime
  const vy = (dy + 0.5 * gravity * flightTime * flightTime) / flightTime

  return { x: vx, y: vy, z: vz }
}

function createProjectileMesh(projectile) {
  const mesh = createProjectile(scene, projectile.type)
  mesh.position = new Vector3(
    projectile.position.x,
    projectile.position.y,
    projectile.position.z
  )
  projectileMeshes[projectile.id] = mesh
}

function updateProjectiles(dt, now) {
  const state = getState()
  const toRemove = []

  for (const projectile of state.projectiles) {
    const mesh = projectileMeshes[projectile.id]
    if (!mesh) continue

    // Grace period before collision detection
    const age = now - projectile.spawnTime
    const gracePeriod = 100

    if (projectile.type === 'flame') {
      // Ballistic movement
      projectile.velocity.y -= FLAME_GRAVITY * dt
      projectile.position.x += projectile.velocity.x * dt
      projectile.position.y += projectile.velocity.y * dt
      projectile.position.z += projectile.velocity.z * dt

      // Check ground collision
      if (projectile.position.y <= 0.1) {
        // Explode at ground
        handleFlameExplosion(projectile)
        toRemove.push(projectile.id)
        continue
      }
    } else {
      // Homing movement (arrow, frost)
      const target = getActiveEnemies().find(e => e.id === projectile.targetId)

      if (target) {
        // Re-aim toward target
        const dx = target.position.x - projectile.position.x
        const dy = target.position.y - projectile.position.y
        const dz = target.position.z - projectile.position.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist > 0.1) {
          const speed = TOWERS[projectile.type].projectileSpeed
          projectile.velocity.x = (dx / dist) * speed
          projectile.velocity.y = (dy / dist) * speed
          projectile.velocity.z = (dz / dist) * speed
        }
      }

      // Move
      projectile.position.x += projectile.velocity.x * dt
      projectile.position.y += projectile.velocity.y * dt
      projectile.position.z += projectile.velocity.z * dt
    }

    // Update mesh position
    mesh.position.set(
      projectile.position.x,
      projectile.position.y,
      projectile.position.z
    )

    // Update mesh rotation to face velocity direction
    if (projectile.velocity) {
      const speed = Math.sqrt(
        projectile.velocity.x ** 2 +
        projectile.velocity.y ** 2 +
        projectile.velocity.z ** 2
      )
      if (speed > 0.1) {
        mesh.rotation.y = Math.atan2(projectile.velocity.x, projectile.velocity.z)
        mesh.rotation.x = -Math.asin(projectile.velocity.y / speed)
      }
    }

    // Collision detection after grace period
    if (age >= gracePeriod) {
      const hitRadius = projectile.type === 'arrow' ? 0.6 : 0.8
      const hit = checkCollision(projectile, hitRadius)

      if (hit) {
        handleHit(projectile, hit)
        toRemove.push(projectile.id)
      }
    }

    // Remove if too old or out of bounds
    if (age > 5000 || projectile.position.y < -5 ||
        Math.abs(projectile.position.x) > 50 ||
        Math.abs(projectile.position.z) > 50) {
      toRemove.push(projectile.id)
    }
  }

  // Remove projectiles
  for (const id of toRemove) {
    if (projectileMeshes[id]) {
      projectileMeshes[id].dispose()
      delete projectileMeshes[id]
    }
    removeProjectile(id)
  }
}

function checkCollision(projectile, hitRadius) {
  const enemies = getActiveEnemies()

  for (const enemy of enemies) {
    const dx = projectile.position.x - enemy.position.x
    const dy = projectile.position.y - enemy.position.y
    const dz = projectile.position.z - enemy.position.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < hitRadius) {
      return enemy
    }
  }

  return null
}

function handleHit(projectile, target) {
  // Calculate damage
  let damage = projectile.damage
  let isCrit = false

  // Critical hit for arrows
  if (projectile.critChance > 0 && Math.random() < projectile.critChance) {
    damage *= projectile.critMultiplier
    isCrit = true
  }

  if (projectile.aoeRadius > 0) {
    // AOE damage
    handleAOEDamage(projectile, target.position)
  } else {
    // Single target damage
    const result = damageEnemy(target.id, damage)

    // Apply frost slow
    if (projectile.type === 'frost') {
      applyFrost(target.id, TOWERS.frost.slowDuration)
      spawnFrostExplosion(target.position, TOWERS.frost.aoeRadius)
    }

    // Trigger death effect if killed
    if (result.killed) {
      // Calculate knockback direction from projectile
      const knockbackDir = {
        x: projectile.velocity.x,
        z: projectile.velocity.z
      }
      const len = Math.sqrt(knockbackDir.x ** 2 + knockbackDir.z ** 2)
      if (len > 0) {
        knockbackDir.x /= len
        knockbackDir.z /= len
      }

      triggerDeathEffect(target.position, 0, knockbackDir, true)
    }

    // Crit flash
    if (isCrit) {
      spawnCritFlash(target.position)
    }
  }
}

function handleFlameExplosion(projectile) {
  const radius = projectile.aoeRadius || TOWERS.flame.aoeRadius
  spawnFireExplosion(projectile.position, radius)
  handleAOEDamage(projectile, projectile.position)
}

function handleAOEDamage(projectile, center) {
  const enemies = getActiveEnemies()
  const radius = projectile.aoeRadius || TOWERS[projectile.type].aoeRadius

  for (const enemy of enemies) {
    const dx = center.x - enemy.position.x
    const dz = center.z - enemy.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist <= radius) {
      const result = damageEnemy(enemy.id, projectile.damage)

      // Frost AOE also slows
      if (projectile.type === 'frost') {
        applyFrost(enemy.id, TOWERS.frost.slowDuration)
      }

      // Trigger death effect if killed
      if (result.killed) {
        // Knockback direction from explosion center
        const knockbackDir = { x: -dx, z: -dz }
        const len = Math.sqrt(knockbackDir.x ** 2 + knockbackDir.z ** 2)
        if (len > 0) {
          knockbackDir.x /= len
          knockbackDir.z /= len
        }
        triggerDeathEffect(enemy.position, 0, knockbackDir, true)
      }
    }
  }
}

// Lightning - instant chain damage, no projectile
function fireLightning(tower, now) {
  const config = TOWERS.lightning
  const target = findTarget(tower.position, config.range)
  if (!target) return

  updateTowerLastFireTime(tower.id, now)

  // Build chain of targets
  const hitTargets = [target]
  let currentPos = target.position

  for (let i = 0; i < config.chainCount; i++) {
    const enemies = getActiveEnemies()
    let nearest = null
    let nearestDist = Infinity

    for (const enemy of enemies) {
      // Skip already hit
      if (hitTargets.find(t => t.id === enemy.id)) continue

      const dx = currentPos.x - enemy.position.x
      const dz = currentPos.z - enemy.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= config.chainRange && dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    }

    if (!nearest) break
    hitTargets.push(nearest)
    currentPos = nearest.position
  }

  // Apply damage to all targets
  for (const target of hitTargets) {
    const result = damageEnemy(target.id, config.damage)

    // Trigger lightning impact effect
    spawnLightningImpact(target.position)

    // Trigger death effect if killed
    if (result.killed) {
      triggerDeathEffect(target.position, 0, null, true)
    }
  }

  // Create lightning visual (temporary line)
  createLightningVisual(tower, hitTargets)

  // Muzzle flash at tower
  const firePoint = getTowerFirePoint(tower.id)
  if (firePoint) {
    spawnMuzzleFlash(firePoint, 'lightning')
  }
}

function createLightningVisual(tower, targets) {
  const firePoint = getTowerFirePoint(tower.id)
  if (!firePoint) return

  // Build path points
  const points = [new Vector3(firePoint.x, firePoint.y, firePoint.z)]

  for (const target of targets) {
    points.push(new Vector3(target.position.x, target.position.y, target.position.z))
  }

  // Create line mesh
  const lightning = MeshBuilder.CreateLines('lightning', {
    points,
    updatable: false
  }, scene)
  lightning.color = new Color3(0.7, 0.5, 1)

  // Create glow tube for each segment
  const tubes = []
  for (let i = 0; i < points.length - 1; i++) {
    const path = createJaggedPath(points[i], points[i + 1])
    const tube = MeshBuilder.CreateTube('lightningTube', {
      path,
      radius: 0.08,
      tessellation: 6,
      cap: 0
    }, scene)

    const tubeMat = new StandardMaterial('tubeMat', scene)
    tubeMat.emissiveColor = new Color3(0.8, 0.6, 1)
    tubeMat.diffuseColor = new Color3(1, 1, 1)
    tubeMat.alpha = 0.8
    tube.material = tubeMat
    tubes.push(tube)
  }

  // Remove after short duration
  setTimeout(() => {
    lightning.dispose()
    tubes.forEach(t => t.dispose())
  }, 150)
}

function createJaggedPath(start, end) {
  const points = []
  const segments = 8
  const jitterAmount = 0.3

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const baseX = start.x + (end.x - start.x) * t
    const baseY = start.y + (end.y - start.y) * t
    const baseZ = start.z + (end.z - start.z) * t

    // Add jitter (less at endpoints)
    const jitter = Math.sin(t * Math.PI) * jitterAmount
    const jx = (Math.random() - 0.5) * jitter
    const jy = (Math.random() - 0.5) * jitter
    const jz = (Math.random() - 0.5) * jitter

    points.push(new Vector3(baseX + jx, baseY + jy, baseZ + jz))
  }

  return points
}

export function resetProjectileManager() {
  // Dispose all projectile meshes
  for (const mesh of Object.values(projectileMeshes)) {
    mesh.dispose()
  }
  projectileMeshes = {}
}

export function disposeProjectileManager() {
  for (const mesh of Object.values(projectileMeshes)) {
    mesh.dispose()
  }
  projectileMeshes = {}
}
