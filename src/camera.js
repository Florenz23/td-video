// ============================================
// CAMERA SYSTEM - ArcRotate with WASD + Zoom
// ============================================

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import {
  MAP_WIDTH,
  MAP_DEPTH,
  CAMERA_ALPHA,
  CAMERA_BETA,
  CAMERA_RADIUS,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_SPEED,
  CAMERA_PAN_SPEED
} from './settings.js'

let camera = null
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
}

export function setupCamera(scene, canvas) {
  camera = new ArcRotateCamera(
    'camera',
    CAMERA_ALPHA,
    CAMERA_BETA,
    CAMERA_RADIUS,
    Vector3.Zero(),
    scene
  )

  // Disable all default inputs
  camera.inputs.clear()

  // Lock angles (isometric-style view)
  camera.lowerBetaLimit = CAMERA_BETA
  camera.upperBetaLimit = CAMERA_BETA
  camera.lowerAlphaLimit = CAMERA_ALPHA
  camera.upperAlphaLimit = CAMERA_ALPHA

  // Setup keyboard listeners
  const onKeyDown = (e) => {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) {
      keys[key] = true
      e.preventDefault()
    }
  }

  const onKeyUp = (e) => {
    const key = e.key.toLowerCase()
    if (keys.hasOwnProperty(key)) {
      keys[key] = false
      e.preventDefault()
    }
  }

  // Zoom with mouse wheel
  const onWheel = (e) => {
    camera.radius -= Math.sign(e.deltaY) * CAMERA_ZOOM_SPEED
    camera.radius = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, camera.radius))
    e.preventDefault()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.removeEventListener('wheel', onWheel)
  }
}

export function updateCamera(dt) {
  if (!camera) return

  // Calculate movement direction based on camera angle
  const alpha = camera.alpha
  const forward = { x: -Math.cos(alpha), z: -Math.sin(alpha) }
  const right = { x: Math.sin(alpha), z: -Math.cos(alpha) }

  let moveX = 0
  let moveZ = 0

  if (keys.w) {
    moveX += forward.x
    moveZ += forward.z
  }
  if (keys.s) {
    moveX -= forward.x
    moveZ -= forward.z
  }
  if (keys.a) {
    moveX -= right.x
    moveZ -= right.z
  }
  if (keys.d) {
    moveX += right.x
    moveZ += right.z
  }

  // Normalize diagonal movement
  const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
  if (length > 0) {
    moveX /= length
    moveZ /= length
  }

  // Apply movement
  const speed = CAMERA_PAN_SPEED * dt
  camera.target.x += moveX * speed
  camera.target.z += moveZ * speed

  // Clamp to map bounds
  const halfW = MAP_WIDTH / 2
  const halfD = MAP_DEPTH / 2
  camera.target.x = Math.max(-halfW, Math.min(halfW, camera.target.x))
  camera.target.z = Math.max(-halfD, Math.min(halfD, camera.target.z))
}

export function getCamera() {
  return camera
}

export function getCameraTarget() {
  return camera ? { x: camera.target.x, z: camera.target.z } : { x: 0, z: 0 }
}

export function setCameraTarget(x, z) {
  if (camera) {
    camera.target.x = x
    camera.target.z = z
  }
}

export function getCameraRadius() {
  return camera ? camera.radius : CAMERA_RADIUS
}
