// ============================================
// TOWER MODELS - All 4 tower types
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TOWER_SCALE, COLORS } from '../settings.js'

// Create Arrow Tower mesh
export function createArrowTower(scene, position, isGhost = false) {
  const s = TOWER_SCALE
  const parent = new Mesh('arrowTower', scene)
  parent.position = new Vector3(position.x, 0, position.z)

  // Base - stone cylinder
  const base = MeshBuilder.CreateCylinder('base', {
    height: 0.8 * s,
    diameterTop: 0.6 * s,
    diameterBottom: 0.8 * s,
    tessellation: 8
  }, scene)
  base.position.y = 0.4 * s
  base.parent = parent

  // Body - stone cylinder
  const body = MeshBuilder.CreateCylinder('body', {
    height: 1.5 * s,
    diameterTop: 0.4 * s,
    diameterBottom: 0.5 * s,
    tessellation: 8
  }, scene)
  body.position.y = 1.55 * s
  body.parent = parent

  // Turret - wood cylinder
  const turret = MeshBuilder.CreateCylinder('turret', {
    height: 0.3 * s,
    diameterTop: 0.45 * s,
    diameterBottom: 0.5 * s,
    tessellation: 8
  }, scene)
  turret.position.y = 2.45 * s
  turret.parent = parent

  // Roof - cone
  const roof = MeshBuilder.CreateCylinder('roof', {
    height: 0.5 * s,
    diameterTop: 0.05 * s,
    diameterBottom: 0.55 * s,
    tessellation: 8
  }, scene)
  roof.position.y = 2.85 * s
  roof.parent = parent

  // Materials
  if (isGhost) {
    const ghostMat = createGhostMaterial(scene, COLORS.GHOST_ARROW)
    base.material = ghostMat
    body.material = ghostMat
    turret.material = ghostMat
    roof.material = ghostMat
  } else {
    const stoneMat = new StandardMaterial('stoneMat', scene)
    stoneMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_ARROW_BASE)
    stoneMat.specularColor = new Color3(0.2, 0.2, 0.2)
    base.material = stoneMat
    body.material = stoneMat

    const woodMat = new StandardMaterial('woodMat', scene)
    woodMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_ARROW_WOOD)
    woodMat.specularColor = new Color3(0.1, 0.1, 0.1)
    turret.material = woodMat
    roof.material = woodMat
  }

  parent.firePointY = 2.5 * s
  return parent
}

// Create Flame Tower mesh
export function createFlameTower(scene, position, isGhost = false) {
  const s = TOWER_SCALE
  const parent = new Mesh('flameTower', scene)
  parent.position = new Vector3(position.x, 0, position.z)

  // Base - brown cylinder
  const base = MeshBuilder.CreateCylinder('base', {
    height: 2.5 * s,
    diameterTop: 2.0 * s,
    diameterBottom: 2.5 * s,
    tessellation: 12
  }, scene)
  base.position.y = 1.25 * s
  base.parent = parent

  // Lava orb - glowing sphere
  const orb = MeshBuilder.CreateSphere('lavaOrb', {
    diameter: 1.6 * s,
    segments: 16
  }, scene)
  orb.position.y = 3.0 * s
  orb.parent = parent

  // Materials
  if (isGhost) {
    const ghostMat = createGhostMaterial(scene, COLORS.GHOST_FLAME)
    base.material = ghostMat
    orb.material = ghostMat
  } else {
    const baseMat = new StandardMaterial('baseMat', scene)
    baseMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_FLAME_BASE)
    baseMat.specularColor = new Color3(0.1, 0.1, 0.1)
    base.material = baseMat

    const orbMat = new StandardMaterial('orbMat', scene)
    orbMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_FLAME_ORB)
    orbMat.emissiveColor = Color3.FromHexString('#FF5722')
    orbMat.specularColor = new Color3(0.5, 0.3, 0.1)
    orbMat.alpha = 0.9
    orb.material = orbMat
  }

  parent.firePointY = 3.2 * s
  parent.lavaOrb = orb
  return parent
}

// Create Frost Tower mesh
export function createFrostTower(scene, position, isGhost = false) {
  const s = TOWER_SCALE
  const parent = new Mesh('frostTower', scene)
  parent.position = new Vector3(position.x, 0, position.z)

  // Base - ice blue cylinder
  const base = MeshBuilder.CreateCylinder('base', {
    height: 0.6 * s,
    diameterTop: 0.9 * s,
    diameterBottom: 1.0 * s,
    tessellation: 8
  }, scene)
  base.position.y = 0.3 * s
  base.parent = parent

  // Pillar - crystal cylinder
  const pillar = MeshBuilder.CreateCylinder('pillar', {
    height: 1.2 * s,
    diameterTop: 0.3 * s,
    diameterBottom: 0.5 * s,
    tessellation: 6
  }, scene)
  pillar.position.y = 1.2 * s
  pillar.parent = parent

  // Crystal top - cone
  const crystal = MeshBuilder.CreateCylinder('crystal', {
    height: 0.8 * s,
    diameterTop: 0.05 * s,
    diameterBottom: 0.35 * s,
    tessellation: 6
  }, scene)
  crystal.position.y = 2.2 * s
  crystal.parent = parent

  // Materials
  if (isGhost) {
    const ghostMat = createGhostMaterial(scene, COLORS.GHOST_FROST)
    base.material = ghostMat
    pillar.material = ghostMat
    crystal.material = ghostMat
  } else {
    const baseMat = new StandardMaterial('baseMat', scene)
    baseMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_FROST_BASE)
    baseMat.specularColor = new Color3(0.3, 0.3, 0.3)
    base.material = baseMat

    const crystalMat = new StandardMaterial('crystalMat', scene)
    crystalMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_FROST_CRYSTAL)
    crystalMat.emissiveColor = Color3.FromHexString(COLORS.TOWER_FROST_CRYSTAL).scale(0.3)
    crystalMat.specularColor = new Color3(0.6, 0.6, 0.8)
    crystalMat.alpha = 0.85
    pillar.material = crystalMat
    crystal.material = crystalMat
  }

  parent.firePointY = 2.2 * s
  parent.crystal = crystal
  return parent
}

// Create Lightning Tower mesh
export function createLightningTower(scene, position, isGhost = false) {
  const s = TOWER_SCALE
  const parent = new Mesh('lightningTower', scene)
  parent.position = new Vector3(position.x, 0, position.z)

  // Base - indigo cylinder
  const base = MeshBuilder.CreateCylinder('base', {
    height: 0.5 * s,
    diameterTop: 0.8 * s,
    diameterBottom: 0.9 * s,
    tessellation: 8
  }, scene)
  base.position.y = 0.25 * s
  base.parent = parent

  // Body - purple cylinder
  const body = MeshBuilder.CreateCylinder('body', {
    height: 1.4 * s,
    diameterTop: 0.35 * s,
    diameterBottom: 0.5 * s,
    tessellation: 8
  }, scene)
  body.position.y = 1.2 * s
  body.parent = parent

  // Coil rings - 3 torus
  const ringPositions = [0.8 * s, 1.2 * s, 1.6 * s]
  const rings = []
  for (let i = 0; i < 3; i++) {
    const ring = MeshBuilder.CreateTorus(`ring${i}`, {
      diameter: 0.5 * s,
      thickness: 0.06 * s,
      tessellation: 16
    }, scene)
    ring.position.y = ringPositions[i]
    ring.parent = parent
    rings.push(ring)
  }

  // Energy orb - sphere at top
  const orb = MeshBuilder.CreateSphere('energyOrb', {
    diameter: 0.35 * s,
    segments: 12
  }, scene)
  orb.position.y = 2.1 * s
  orb.parent = parent

  // Materials
  if (isGhost) {
    const ghostMat = createGhostMaterial(scene, COLORS.GHOST_LIGHTNING)
    base.material = ghostMat
    body.material = ghostMat
    rings.forEach(r => r.material = ghostMat)
    orb.material = ghostMat
  } else {
    const baseMat = new StandardMaterial('baseMat', scene)
    baseMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_LIGHTNING_BASE)
    baseMat.specularColor = new Color3(0.2, 0.2, 0.3)
    base.material = baseMat

    const bodyMat = new StandardMaterial('bodyMat', scene)
    bodyMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_LIGHTNING_BODY)
    bodyMat.emissiveColor = Color3.FromHexString('#651FFF').scale(0.3)
    bodyMat.specularColor = new Color3(0.4, 0.3, 0.6)
    body.material = bodyMat

    const metalMat = new StandardMaterial('metalMat', scene)
    metalMat.diffuseColor = Color3.FromHexString('#9E9E9E')
    metalMat.specularColor = new Color3(0.6, 0.6, 0.6)
    rings.forEach(r => r.material = metalMat)

    const orbMat = new StandardMaterial('orbMat', scene)
    orbMat.diffuseColor = Color3.FromHexString(COLORS.TOWER_LIGHTNING_ORB)
    orbMat.emissiveColor = Color3.FromHexString(COLORS.TOWER_LIGHTNING_BODY).scale(0.5)
    orbMat.specularColor = new Color3(0.6, 0.4, 0.8)
    orb.material = orbMat
  }

  parent.firePointY = 2.1 * s
  parent.energyOrb = orb
  return parent
}

// Create ghost material for placement preview
function createGhostMaterial(scene, colorHex) {
  const mat = new StandardMaterial('ghostMat', scene)
  mat.diffuseColor = Color3.FromHexString(colorHex)
  mat.emissiveColor = Color3.FromHexString(colorHex).scale(0.3)
  mat.alpha = 0.6
  mat.specularColor = new Color3(0, 0, 0)
  return mat
}

// Create invalid placement ghost material
export function createInvalidGhostMaterial(scene) {
  const mat = new StandardMaterial('invalidGhostMat', scene)
  mat.diffuseColor = Color3.FromHexString(COLORS.GHOST_INVALID)
  mat.emissiveColor = Color3.FromHexString(COLORS.GHOST_INVALID).scale(0.3)
  mat.alpha = 0.4
  mat.specularColor = new Color3(0, 0, 0)
  return mat
}

// Factory function to create tower by type
export function createTower(scene, type, position, isGhost = false) {
  switch (type) {
    case 'arrow':
      return createArrowTower(scene, position, isGhost)
    case 'flame':
      return createFlameTower(scene, position, isGhost)
    case 'frost':
      return createFrostTower(scene, position, isGhost)
    case 'lightning':
      return createLightningTower(scene, position, isGhost)
    default:
      return createArrowTower(scene, position, isGhost)
  }
}
