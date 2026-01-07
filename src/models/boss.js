// ============================================
// ULTIMATE HYPER BOSS MODEL
// A massive, terrifying boss enemy
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { BOSS_CONFIG } from '../settings.js'

const SCALE = BOSS_CONFIG.SCALE

// Body part definitions - MASSIVE VERSION
export const BOSS_PARTS = {
  torso: { w: 0.7 * SCALE, h: 0.8 * SCALE, d: 0.45 * SCALE, offsetY: 0.9 * SCALE, pivot: 0 },
  head: { w: 0.5 * SCALE, h: 0.5 * SCALE, d: 0.5 * SCALE, offsetY: 1.55 * SCALE, pivot: 0 },
  leftArm: { w: 0.2 * SCALE, h: 0.6 * SCALE, d: 0.2 * SCALE, offsetX: -0.5 * SCALE, offsetY: 1.0 * SCALE, pivot: 0.3 * SCALE },
  rightArm: { w: 0.2 * SCALE, h: 0.6 * SCALE, d: 0.2 * SCALE, offsetX: 0.5 * SCALE, offsetY: 1.0 * SCALE, pivot: 0.3 * SCALE },
  leftLeg: { w: 0.25 * SCALE, h: 0.7 * SCALE, d: 0.25 * SCALE, offsetX: -0.2 * SCALE, offsetY: 0.35 * SCALE, pivot: 0.35 * SCALE },
  rightLeg: { w: 0.25 * SCALE, h: 0.7 * SCALE, d: 0.25 * SCALE, offsetX: 0.2 * SCALE, offsetY: 0.35 * SCALE, pivot: 0.35 * SCALE },
  // Giant tusks
  leftTusk: { w: 0.08 * SCALE, h: 0.25 * SCALE, d: 0.08 * SCALE, offsetX: -0.18 * SCALE, offsetY: 1.4 * SCALE, offsetZ: 0.25 * SCALE, pivot: 0 },
  rightTusk: { w: 0.08 * SCALE, h: 0.25 * SCALE, d: 0.08 * SCALE, offsetX: 0.18 * SCALE, offsetY: 1.4 * SCALE, offsetZ: 0.25 * SCALE, pivot: 0 },
  // Massive shoulder pads
  leftShoulder: { w: 0.35 * SCALE, h: 0.2 * SCALE, d: 0.3 * SCALE, offsetX: -0.55 * SCALE, offsetY: 1.25 * SCALE, pivot: 0 },
  rightShoulder: { w: 0.35 * SCALE, h: 0.2 * SCALE, d: 0.3 * SCALE, offsetX: 0.55 * SCALE, offsetY: 1.25 * SCALE, pivot: 0 },
  // Spiked belt
  belt: { w: 0.75 * SCALE, h: 0.15 * SCALE, d: 0.5 * SCALE, offsetY: 0.55 * SCALE, pivot: 0 },
  // Evil horned helmet
  helmet: { w: 0.55 * SCALE, h: 0.3 * SCALE, d: 0.55 * SCALE, offsetY: 1.85 * SCALE, pivot: 0 },
  leftHorn: { w: 0.1 * SCALE, h: 0.4 * SCALE, d: 0.1 * SCALE, offsetX: -0.25 * SCALE, offsetY: 2.1 * SCALE, offsetZ: -0.1 * SCALE, pivot: 0 },
  rightHorn: { w: 0.1 * SCALE, h: 0.4 * SCALE, d: 0.1 * SCALE, offsetX: 0.25 * SCALE, offsetY: 2.1 * SCALE, offsetZ: -0.1 * SCALE, pivot: 0 },
  // Giant war axe
  axeHandle: { w: 0.1 * SCALE, h: 0.9 * SCALE, d: 0.1 * SCALE, offsetX: 0.5 * SCALE, offsetY: 0.6 * SCALE, pivot: 0.45 * SCALE },
  axeBlade: { w: 0.1 * SCALE, h: 0.4 * SCALE, d: 0.5 * SCALE, offsetX: 0.5 * SCALE, offsetY: 0.25 * SCALE, offsetZ: 0.25 * SCALE, pivot: 0.45 * SCALE },
  // Glowing evil eyes
  leftEye: { w: 0.08 * SCALE, h: 0.06 * SCALE, d: 0.04 * SCALE, offsetX: -0.12 * SCALE, offsetY: 1.6 * SCALE, offsetZ: 0.24 * SCALE, pivot: 0 },
  rightEye: { w: 0.08 * SCALE, h: 0.06 * SCALE, d: 0.04 * SCALE, offsetX: 0.12 * SCALE, offsetY: 1.6 * SCALE, offsetZ: 0.24 * SCALE, pivot: 0 },
  // Chest skull emblem
  chestSkull: { w: 0.2 * SCALE, h: 0.2 * SCALE, d: 0.1 * SCALE, offsetY: 1.0 * SCALE, offsetZ: 0.23 * SCALE, pivot: 0 },
  // Shoulder spikes
  leftSpike1: { w: 0.06 * SCALE, h: 0.2 * SCALE, d: 0.06 * SCALE, offsetX: -0.6 * SCALE, offsetY: 1.4 * SCALE, pivot: 0 },
  leftSpike2: { w: 0.05 * SCALE, h: 0.15 * SCALE, d: 0.05 * SCALE, offsetX: -0.65 * SCALE, offsetY: 1.3 * SCALE, offsetZ: 0.1 * SCALE, pivot: 0 },
  rightSpike1: { w: 0.06 * SCALE, h: 0.2 * SCALE, d: 0.06 * SCALE, offsetX: 0.6 * SCALE, offsetY: 1.4 * SCALE, pivot: 0 },
  rightSpike2: { w: 0.05 * SCALE, h: 0.15 * SCALE, d: 0.05 * SCALE, offsetX: 0.65 * SCALE, offsetY: 1.3 * SCALE, offsetZ: 0.1 * SCALE, pivot: 0 }
}

// Part to color mapping
const PART_COLORS = {
  torso: 'skin',
  head: 'skin',
  leftArm: 'skin',
  rightArm: 'skin',
  leftLeg: 'skin',
  rightLeg: 'skin',
  leftTusk: 'bone',
  rightTusk: 'bone',
  leftShoulder: 'armor',
  rightShoulder: 'armor',
  belt: 'armor',
  helmet: 'metal',
  leftHorn: 'bone',
  rightHorn: 'bone',
  axeHandle: 'wood',
  axeBlade: 'metal',
  leftEye: 'eye',
  rightEye: 'eye',
  chestSkull: 'bone',
  leftSpike1: 'metal',
  leftSpike2: 'metal',
  rightSpike1: 'metal',
  rightSpike2: 'metal'
}

// Create materials for the boss - dark and menacing
export function createBossMaterials(scene) {
  const materials = {}
  const colors = BOSS_CONFIG.COLORS

  // Skin - dark blood red with glow
  materials.skin = new StandardMaterial('boss_skin', scene)
  materials.skin.diffuseColor = Color3.FromHexString(colors.SKIN)
  materials.skin.emissiveColor = Color3.FromHexString(colors.SKIN_GLOW).scale(0.3)
  materials.skin.specularColor = new Color3(0.3, 0.1, 0.1)

  // Bone - pale with slight glow
  materials.bone = new StandardMaterial('boss_bone', scene)
  materials.bone.diffuseColor = Color3.FromHexString('#D4C4A8')
  materials.bone.emissiveColor = new Color3(0.1, 0.08, 0.05)

  // Armor - dark brown with red tint
  materials.armor = new StandardMaterial('boss_armor', scene)
  materials.armor.diffuseColor = Color3.FromHexString(colors.ARMOR)
  materials.armor.emissiveColor = new Color3(0.1, 0.02, 0.02)
  materials.armor.specularColor = new Color3(0.2, 0.1, 0.1)

  // Metal - dark purple-black, very menacing
  materials.metal = new StandardMaterial('boss_metal', scene)
  materials.metal.diffuseColor = Color3.FromHexString(colors.METAL)
  materials.metal.emissiveColor = new Color3(0.1, 0.05, 0.15)
  materials.metal.specularColor = new Color3(0.5, 0.3, 0.5)

  // Wood - dark charred wood
  materials.wood = new StandardMaterial('boss_wood', scene)
  materials.wood.diffuseColor = Color3.FromHexString('#2A1A0A')
  materials.wood.specularColor = new Color3(0.1, 0.1, 0.1)

  // GLOWING RED EYES - the most terrifying part
  materials.eye = new StandardMaterial('boss_eye', scene)
  materials.eye.diffuseColor = Color3.FromHexString(colors.EYES)
  materials.eye.emissiveColor = Color3.FromHexString(colors.EYES)
  materials.eye.specularColor = new Color3(1, 0.5, 0.5)

  return materials
}

// Create base meshes for the boss
export function createBossBaseMeshes(scene, materials) {
  const meshes = {}

  for (const [partName, part] of Object.entries(BOSS_PARTS)) {
    const mesh = MeshBuilder.CreateBox(`boss_${partName}`, {
      width: part.w,
      height: part.h,
      depth: part.d
    }, scene)

    const colorType = PART_COLORS[partName]
    mesh.material = materials[colorType]
    mesh.isVisible = false
    mesh.alwaysSelectAsActiveMesh = true

    meshes[partName] = mesh
  }

  return meshes
}

// Calculate transformation matrix for boss body part
export function getBossPartMatrix(partName, worldX, worldZ, rotationY, walkAngle = 0) {
  const part = BOSS_PARTS[partName]
  const offsetX = part.offsetX || 0
  const offsetZ = part.offsetZ || 0
  const offsetY = part.offsetY || 0
  const pivot = part.pivot || 0

  // Calculate limb rotation - slower, heavier movement
  let limbRotation = 0
  if (partName === 'leftLeg') {
    limbRotation = Math.sin(walkAngle) * 0.2
  } else if (partName === 'rightLeg') {
    limbRotation = Math.sin(walkAngle + Math.PI) * 0.2
  } else if (partName === 'leftArm') {
    limbRotation = Math.sin(walkAngle + Math.PI) * 0.15
  } else if (partName === 'rightArm' || partName === 'axeHandle' || partName === 'axeBlade') {
    limbRotation = Math.sin(walkAngle) * 0.15
  }

  // Horns tilt slightly with walk
  if (partName === 'leftHorn' || partName === 'rightHorn') {
    limbRotation = Math.sin(walkAngle * 0.5) * 0.05
  }

  // Build transformation matrix
  const toPivot = Matrix.Translation(0, pivot, 0)
  const rotation = Matrix.RotationX(limbRotation)
  const fromPivot = Matrix.Translation(0, -pivot, 0)
  const partOffset = Matrix.Translation(offsetX, offsetY, offsetZ)
  const bodyRotation = Matrix.RotationY(rotationY)
  const worldPosition = Matrix.Translation(worldX, 0, worldZ)

  return toPivot
    .multiply(rotation)
    .multiply(fromPivot)
    .multiply(partOffset)
    .multiply(bodyRotation)
    .multiply(worldPosition)
}

// Get all boss part names
export function getBossPartNames() {
  return Object.keys(BOSS_PARTS)
}

// Create the boss aura effect mesh
export function createBossAura(scene) {
  const aura = MeshBuilder.CreateSphere('bossAura', {
    diameter: BOSS_CONFIG.AURA_RADIUS * 2,
    segments: 24
  }, scene)

  const auraMat = new StandardMaterial('bossAuraMat', scene)
  auraMat.diffuseColor = Color3.FromHexString('#FF0000')
  auraMat.emissiveColor = Color3.FromHexString('#FF0000').scale(0.3)
  auraMat.alpha = 0.15
  auraMat.backFaceCulling = false
  aura.material = auraMat

  aura.isVisible = false

  return aura
}

// Create ground crack effect under boss feet
export function createGroundCrack(scene, position) {
  const crack = MeshBuilder.CreateDisc('groundCrack', {
    radius: 3,
    tessellation: 12
  }, scene)

  crack.rotation.x = Math.PI / 2
  crack.position.set(position.x, 0.03, position.z)

  const crackMat = new StandardMaterial('crackMat', scene)
  crackMat.diffuseColor = new Color3(0.1, 0.05, 0)
  crackMat.emissiveColor = Color3.FromHexString('#FF4500').scale(0.5)
  crackMat.alpha = 0.6
  crack.material = crackMat

  return crack
}
