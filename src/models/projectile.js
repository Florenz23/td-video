// ============================================
// PROJECTILE MODELS - Arrow, Fireball, Frost Shard
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'

// Create Arrow projectile
export function createArrowProjectile(scene) {
  const parent = new Mesh('arrow', scene)

  // Shaft - brown cylinder
  const shaft = MeshBuilder.CreateCylinder('shaft', {
    height: 0.8,
    diameter: 0.05,
    tessellation: 6
  }, scene)
  shaft.rotation.x = Math.PI / 2 // Point forward
  shaft.parent = parent

  const shaftMat = new StandardMaterial('shaftMat', scene)
  shaftMat.diffuseColor = Color3.FromHexString('#8B5A2B')
  shaft.material = shaftMat

  // Tip - metallic cone
  const tip = MeshBuilder.CreateCylinder('tip', {
    height: 0.15,
    diameterTop: 0,
    diameterBottom: 0.08,
    tessellation: 6
  }, scene)
  tip.rotation.x = Math.PI / 2
  tip.position.z = 0.475
  tip.parent = parent

  const tipMat = new StandardMaterial('tipMat', scene)
  tipMat.diffuseColor = Color3.FromHexString('#888888')
  tipMat.specularColor = new Color3(0.5, 0.5, 0.5)
  tip.material = tipMat

  // Fletching - 3 red feathers
  const fletchMat = new StandardMaterial('fletchMat', scene)
  fletchMat.diffuseColor = Color3.FromHexString('#FF4444')

  for (let i = 0; i < 3; i++) {
    const fletch = MeshBuilder.CreateBox('fletch', {
      width: 0.02,
      height: 0.15,
      depth: 0.08
    }, scene)
    fletch.rotation.y = (i * Math.PI * 2) / 3
    fletch.position.z = -0.35
    fletch.parent = parent
    fletch.material = fletchMat
  }

  return parent
}

// Create Fireball projectile
export function createFireballProjectile(scene) {
  const fireball = MeshBuilder.CreateSphere('fireball', {
    diameter: 0.5,
    segments: 12
  }, scene)

  const mat = new StandardMaterial('fireballMat', scene)
  mat.diffuseColor = Color3.FromHexString('#FF4400')
  mat.emissiveColor = Color3.FromHexString('#FF6600')
  mat.specularColor = Color3.FromHexString('#FFFF00')
  fireball.material = mat

  return fireball
}

// Create Frost Shard projectile
export function createFrostShardProjectile(scene) {
  const parent = new Mesh('frostShard', scene)

  // Main crystal - cone
  const crystal = MeshBuilder.CreateCylinder('crystal', {
    height: 0.5,
    diameterTop: 0,
    diameterBottom: 0.15,
    tessellation: 6
  }, scene)
  crystal.rotation.x = Math.PI / 2
  crystal.parent = parent

  const crystalMat = new StandardMaterial('crystalMat', scene)
  crystalMat.diffuseColor = Color3.FromHexString('#AADDFF')
  crystalMat.emissiveColor = Color3.FromHexString('#66AAFF').scale(0.3)
  crystalMat.specularColor = new Color3(0.8, 0.8, 0.8)
  crystalMat.alpha = 0.85
  crystal.material = crystalMat

  // Trailing smaller crystal
  const trail = MeshBuilder.CreateCylinder('trail', {
    height: 0.2,
    diameterTop: 0,
    diameterBottom: 0.08,
    tessellation: 6
  }, scene)
  trail.rotation.x = Math.PI / 2
  trail.position.z = -0.3
  trail.parent = parent
  trail.material = crystalMat

  return parent
}

// Factory function
export function createProjectile(scene, type) {
  switch (type) {
    case 'arrow':
      return createArrowProjectile(scene)
    case 'flame':
      return createFireballProjectile(scene)
    case 'frost':
      return createFrostShardProjectile(scene)
    default:
      return createArrowProjectile(scene)
  }
}
