// ============================================
// ORC MODEL - Voxel body construction
// ============================================

import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { COLORS } from '../settings.js'

// Body part definitions with dimensions and offsets
export const ORC_PARTS = {
  torso: { w: 0.55, h: 0.6, d: 0.35, offsetY: 0.8, pivot: 0 },
  head: { w: 0.4, h: 0.4, d: 0.4, offsetY: 1.35, pivot: 0 },
  leftArm: { w: 0.15, h: 0.4, d: 0.15, offsetX: -0.38, offsetY: 0.9, pivot: 0.2 },
  rightArm: { w: 0.15, h: 0.4, d: 0.15, offsetX: 0.38, offsetY: 0.9, pivot: 0.2 },
  leftLeg: { w: 0.18, h: 0.5, d: 0.18, offsetX: -0.14, offsetY: 0.25, pivot: 0.25 },
  rightLeg: { w: 0.18, h: 0.5, d: 0.18, offsetX: 0.14, offsetY: 0.25, pivot: 0.25 },
  leftTusk: { w: 0.05, h: 0.12, d: 0.05, offsetX: -0.12, offsetY: 1.25, offsetZ: 0.18, pivot: 0 },
  rightTusk: { w: 0.05, h: 0.12, d: 0.05, offsetX: 0.12, offsetY: 1.25, offsetZ: 0.18, pivot: 0 },
  leftShoulder: { w: 0.22, h: 0.12, d: 0.18, offsetX: -0.4, offsetY: 1.05, pivot: 0 },
  rightShoulder: { w: 0.22, h: 0.12, d: 0.18, offsetX: 0.4, offsetY: 1.05, pivot: 0 },
  belt: { w: 0.6, h: 0.1, d: 0.38, offsetY: 0.55, pivot: 0 },
  helmet: { w: 0.44, h: 0.2, d: 0.44, offsetY: 1.55, pivot: 0 },
  axeHandle: { w: 0.06, h: 0.5, d: 0.06, offsetX: 0.38, offsetY: 0.55, pivot: 0.35 },
  axeBlade: { w: 0.06, h: 0.2, d: 0.25, offsetX: 0.38, offsetY: 0.35, offsetZ: 0.15, pivot: 0.35 }
}

// Part to color mapping
const PART_COLORS = {
  torso: 'skin',
  head: 'skin',
  leftArm: 'limb',
  rightArm: 'limb',
  leftLeg: 'limb',
  rightLeg: 'limb',
  leftTusk: 'tusk',
  rightTusk: 'tusk',
  leftShoulder: 'armor',
  rightShoulder: 'armor',
  belt: 'armor',
  helmet: 'metal',
  axeHandle: 'wood',
  axeBlade: 'metal'
}

// Material specularity
const SPECULARITY = {
  skin: 0.15,
  limb: 0.15,
  tusk: 0.3,
  armor: 0.2,
  metal: 0.5,
  wood: 0.1
}

// Create materials for normal and frosted orcs
export function createOrcMaterials(scene) {
  const materials = {
    normal: {},
    frosted: {}
  }

  // Normal colors
  const normalColors = {
    skin: Color3.FromHexString(COLORS.ORC_SKIN),
    limb: Color3.FromHexString(COLORS.ORC_LIMB),
    tusk: Color3.FromHexString(COLORS.ORC_TUSK),
    armor: Color3.FromHexString(COLORS.ORC_ARMOR),
    metal: Color3.FromHexString(COLORS.ORC_METAL),
    wood: Color3.FromHexString(COLORS.ORC_WOOD)
  }

  // Frosted colors
  const frostedColors = {
    skin: Color3.FromHexString(COLORS.ORC_SKIN_FROST),
    limb: Color3.FromHexString(COLORS.ORC_LIMB_FROST),
    tusk: Color3.FromHexString('#9AC4D4'),
    armor: Color3.FromHexString('#5A7A9A'),
    metal: Color3.FromHexString('#8090A0'),
    wood: Color3.FromHexString('#4A6473')
  }

  for (const type of ['skin', 'limb', 'tusk', 'armor', 'metal', 'wood']) {
    // Normal material
    const normalMat = new StandardMaterial(`orc_${type}_normal`, scene)
    normalMat.diffuseColor = normalColors[type]
    normalMat.specularColor = new Color3(SPECULARITY[type], SPECULARITY[type], SPECULARITY[type])
    materials.normal[type] = normalMat

    // Frosted material
    const frostedMat = new StandardMaterial(`orc_${type}_frosted`, scene)
    frostedMat.diffuseColor = frostedColors[type]
    frostedMat.emissiveColor = frostedColors[type].scale(0.15)
    frostedMat.specularColor = new Color3(SPECULARITY[type], SPECULARITY[type], SPECULARITY[type])
    materials.frosted[type] = frostedMat
  }

  return materials
}

// Create base meshes for each body part (used as source for thin instances)
export function createOrcBaseMeshes(scene, materials, frosted = false) {
  const meshes = {}
  const matSet = frosted ? materials.frosted : materials.normal

  for (const [partName, part] of Object.entries(ORC_PARTS)) {
    const mesh = MeshBuilder.CreateBox(`orc_${partName}${frosted ? '_frost' : ''}`, {
      width: part.w,
      height: part.h,
      depth: part.d
    }, scene)

    const colorType = PART_COLORS[partName]
    mesh.material = matSet[colorType]
    mesh.isVisible = false // Base mesh is invisible, only instances are shown
    mesh.alwaysSelectAsActiveMesh = true // Required for thin instances

    meshes[partName] = mesh
  }

  return meshes
}

// Calculate transformation matrix for a body part
export function getPartMatrix(partName, worldX, worldZ, rotationY, walkAngle = 0) {
  const part = ORC_PARTS[partName]
  const offsetX = part.offsetX || 0
  const offsetZ = part.offsetZ || 0
  const offsetY = part.offsetY || 0
  const pivot = part.pivot || 0

  // Calculate limb rotation based on walk cycle
  let limbRotation = 0
  if (partName === 'leftLeg') {
    limbRotation = Math.sin(walkAngle) * 0.3
  } else if (partName === 'rightLeg') {
    limbRotation = Math.sin(walkAngle + Math.PI) * 0.3
  } else if (partName === 'leftArm') {
    limbRotation = Math.sin(walkAngle + Math.PI) * 0.25
  } else if (partName === 'rightArm' || partName === 'axeHandle' || partName === 'axeBlade') {
    limbRotation = Math.sin(walkAngle) * 0.25
  }

  // Build transformation matrix
  // 1. Translate to pivot point
  const toPivot = Matrix.Translation(0, pivot, 0)

  // 2. Apply limb rotation (around X axis for swing)
  const rotation = Matrix.RotationX(limbRotation)

  // 3. Translate back from pivot
  const fromPivot = Matrix.Translation(0, -pivot, 0)

  // 4. Apply part offset
  const partOffset = Matrix.Translation(offsetX, offsetY, offsetZ)

  // 5. Apply body rotation (around Y axis for facing direction)
  const bodyRotation = Matrix.RotationY(rotationY)

  // 6. Apply world position
  const worldPosition = Matrix.Translation(worldX, 0, worldZ)

  // Combine: world * bodyRot * offset * fromPivot * limbRot * toPivot
  return toPivot
    .multiply(rotation)
    .multiply(fromPivot)
    .multiply(partOffset)
    .multiply(bodyRotation)
    .multiply(worldPosition)
}

// Get all part names for iteration
export function getPartNames() {
  return Object.keys(ORC_PARTS)
}
