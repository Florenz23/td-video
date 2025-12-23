// ============================================
// TOWER DEFENSE CHAOS - Main Entry Point
// ============================================

import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'

// Side-effect imports for Babylon.js tree-shaking
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import '@babylonjs/core/Culling/ray'

import {
  MAP_WIDTH,
  MAP_DEPTH,
  GROUND_DEPTH,
  TILE_SIZE,
  COLORS,
  HEMISPHERIC_INTENSITY,
  SUN_INTENSITY,
  SUN_POSITION
} from './settings.js'
import { setupCamera, updateCamera } from './camera.js'
import { getPathTiles } from './path.js'
import { getState, startWave, updateWaveTime, checkWaveComplete, reset } from './store.js'
import { initEnemyManager, updateEnemyManager, disposeEnemyManager, resetEnemyManager } from './managers/EnemyManager.js'
import { initTowerManager, updateTowerManager, disposeTowerManager, resetTowerManager } from './managers/TowerManager.js'
import { initProjectileManager, updateProjectileManager, disposeProjectileManager, resetProjectileManager } from './managers/ProjectileManager.js'
import { initEffectsManager, updateEffectsManager, disposeEffectsManager, resetEffectsManager } from './managers/EffectsManager.js'
import { initUIManager, updateUI, disposeUIManager, resetUIManager } from './managers/UIManager.js'
import { initMinimapManager, updateMinimapManager, disposeMinimapManager, resetMinimapManager } from './managers/MinimapManager.js'

let engine = null
let scene = null
let shadowGenerator = null
let cleanupCamera = null
let gameOverLogged = false

// Initialize the game
export function init(canvas, container, onBack) {
  // Create Babylon engine
  engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true
  })

  // Create scene
  scene = new Scene(engine)

  // Set sky color
  scene.clearColor = new Color4(
    COLORS.SKY.r,
    COLORS.SKY.g,
    COLORS.SKY.b,
    1
  )

  // Setup camera
  cleanupCamera = setupCamera(scene, canvas)

  // Setup lighting
  setupLighting()

  // Build environment
  createDioramaIsland()
  createPath()

  // Initialize managers
  initEnemyManager(scene)
  initTowerManager(scene, canvas)
  initProjectileManager(scene)
  initEffectsManager(scene)
  initUIManager(resetGame)
  initMinimapManager()

  // Keyboard controls for game flow
  const onGameKeyDown = (e) => {
    const state = getState()

    // SPACE to start wave (during BUILD phase)
    if (e.code === 'Space' && state.phase === 'BUILD') {
      console.log(`Starting Wave ${state.currentWave}...`)
      console.log(`Gold: ${state.gold} | Lives: ${state.lives}`)
      startWave()
    }

    // R to reset game (during GAME_OVER phase)
    if (e.code === 'KeyR' && state.phase === 'GAME_OVER') {
      console.log('Restarting game...')
      resetGame()
    }
  }
  window.addEventListener('keydown', onGameKeyDown)

  // Game loop
  let lastTime = performance.now()

  engine.runRenderLoop(() => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    lastTime = now

    // Update camera
    updateCamera(dt)

    // Update managers
    const state = getState()
    updateTowerManager(dt)

    if (state.phase === 'WAVE') {
      updateWaveTime(dt)
      updateEnemyManager(dt)
      updateProjectileManager(dt)

      // Check if wave is complete
      if (checkWaveComplete()) {
        const newState = getState()
        console.log(`Wave ${newState.currentWave - 1} complete!`)
        console.log(`Gold: ${newState.gold} | Lives: ${newState.lives}`)
        console.log('Press SPACE to start next wave')
      }
    }

    // Check for game over
    if (state.phase === 'GAME_OVER' && !gameOverLogged) {
      console.log('=== GAME OVER ===')
      console.log('Press R to restart')
      gameOverLogged = true
    }

    // Always update effects (ragdolls, particles continue after wave)
    updateEffectsManager(dt)

    // Update UI
    updateUI()
    updateMinimapManager()

    // Render
    scene.render()
  })

  // Handle resize
  const onResize = () => engine.resize()
  window.addEventListener('resize', onResize)

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onGameKeyDown)
    if (cleanupCamera) cleanupCamera()
    disposeEnemyManager()
    disposeTowerManager()
    disposeProjectileManager()
    disposeEffectsManager()
    disposeUIManager()
    disposeMinimapManager()
    engine.stopRenderLoop()
    scene.dispose()
    engine.dispose()
  }
}

function setupLighting() {
  // Hemispheric ambient light
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  hemi.intensity = HEMISPHERIC_INTENSITY
  hemi.groundColor = Color3.FromHexString('#445544')

  // Directional sun light
  const sun = new DirectionalLight(
    'sun',
    new Vector3(-SUN_POSITION.x, -SUN_POSITION.y, -SUN_POSITION.z).normalize(),
    scene
  )
  sun.position = new Vector3(SUN_POSITION.x, SUN_POSITION.y, SUN_POSITION.z)
  sun.intensity = SUN_INTENSITY
  sun.diffuse = Color3.FromHexString('#FFFEF0')

  // Shadow generator
  shadowGenerator = new ShadowGenerator(2048, sun)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.blurKernel = 32
}

function createDioramaIsland() {
  // ===== GRASS TOP =====
  const ground = MeshBuilder.CreateGround('ground', {
    width: MAP_WIDTH,
    height: MAP_DEPTH
  }, scene)

  const grassMat = new StandardMaterial('grassMat', scene)
  grassMat.diffuseColor = Color3.FromHexString(COLORS.GRASS)
  grassMat.specularColor = new Color3(0.1, 0.1, 0.1)
  ground.material = grassMat
  ground.receiveShadows = true

  // ===== EARTH SIDES (Floating island effect) =====
  const dirtColor = Color3.FromHexString(COLORS.DIRT)

  // Front side (positive Z)
  const frontSide = MeshBuilder.CreateBox('frontSide', {
    width: MAP_WIDTH,
    height: GROUND_DEPTH,
    depth: 0.5
  }, scene)
  frontSide.position = new Vector3(0, -GROUND_DEPTH / 2, MAP_DEPTH / 2 + 0.25)
  const frontMat = new StandardMaterial('frontMat', scene)
  frontMat.diffuseColor = dirtColor
  frontSide.material = frontMat

  // Back side (negative Z)
  const backSide = MeshBuilder.CreateBox('backSide', {
    width: MAP_WIDTH,
    height: GROUND_DEPTH,
    depth: 0.5
  }, scene)
  backSide.position = new Vector3(0, -GROUND_DEPTH / 2, -MAP_DEPTH / 2 - 0.25)
  const backMat = new StandardMaterial('backMat', scene)
  backMat.diffuseColor = dirtColor
  backSide.material = backMat

  // Left side (negative X)
  const leftSide = MeshBuilder.CreateBox('leftSide', {
    width: 0.5,
    height: GROUND_DEPTH,
    depth: MAP_DEPTH
  }, scene)
  leftSide.position = new Vector3(-MAP_WIDTH / 2 - 0.25, -GROUND_DEPTH / 2, 0)
  const leftMat = new StandardMaterial('leftMat', scene)
  leftMat.diffuseColor = dirtColor
  leftSide.material = leftMat

  // Right side (positive X)
  const rightSide = MeshBuilder.CreateBox('rightSide', {
    width: 0.5,
    height: GROUND_DEPTH,
    depth: MAP_DEPTH
  }, scene)
  rightSide.position = new Vector3(MAP_WIDTH / 2 + 0.25, -GROUND_DEPTH / 2, 0)
  const rightMat = new StandardMaterial('rightMat', scene)
  rightMat.diffuseColor = dirtColor
  rightSide.material = rightMat

  // Bottom cap
  const bottom = MeshBuilder.CreateGround('bottom', {
    width: MAP_WIDTH,
    height: MAP_DEPTH
  }, scene)
  bottom.position.y = -GROUND_DEPTH
  const bottomMat = new StandardMaterial('bottomMat', scene)
  bottomMat.diffuseColor = dirtColor.scale(0.7)
  bottom.material = bottomMat
}

function createPath() {
  const tiles = getPathTiles()
  const pathColor = Color3.FromHexString(COLORS.PATH)

  // Create merged mesh for all path tiles
  const tileBoxes = []

  for (const tile of tiles) {
    const box = MeshBuilder.CreateBox(`pathTile`, {
      width: TILE_SIZE,
      height: 0.05,
      depth: TILE_SIZE
    }, scene)
    box.position = new Vector3(
      tile.x + TILE_SIZE / 2,
      0.025, // Slightly above ground
      tile.z + TILE_SIZE / 2
    )
    tileBoxes.push(box)
  }

  // Create material for path
  const pathMat = new StandardMaterial('pathMat', scene)
  pathMat.diffuseColor = pathColor
  pathMat.specularColor = new Color3(0.05, 0.05, 0.05)

  // Merge all tiles into one mesh for performance
  if (tileBoxes.length > 0) {
    const mergedPath = Mesh.MergeMeshes(tileBoxes, true, true, undefined, false, true)
    if (mergedPath) {
      mergedPath.name = 'path'
      mergedPath.material = pathMat
      mergedPath.receiveShadows = true
    }
  }
}

// Reset game state
function resetGame() {
  // Reset store state
  reset()

  // Reset managers (clear meshes)
  resetTowerManager()
  resetEnemyManager()
  resetProjectileManager()
  resetEffectsManager()
  resetUIManager()
  resetMinimapManager()

  // Reset game over flag
  gameOverLogged = false

  console.log('Game reset! Press SPACE to start Wave 1')
}

// Export for external use
export function getScene() {
  return scene
}

export function getShadowGenerator() {
  return shadowGenerator
}

// Auto-initialize if canvas exists
const canvas = document.getElementById('game-canvas')
const container = document.getElementById('game-container')
if (canvas && container) {
  init(canvas, container, () => {})
}
