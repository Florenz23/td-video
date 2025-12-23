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
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'

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
  SUN_POSITION,
  FOG_DENSITY,
  BLOOM_THRESHOLD,
  BLOOM_WEIGHT,
  TREE_COUNT,
  TREE_SCALE,
  FLOWER_COUNT,
  ROCK_FORMATION_POSITIONS
} from './settings.js'
import { setupCamera, updateCamera } from './camera.js'
import { getPathTiles, isOnPath } from './path.js'
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

  // Setup post-processing
  setupPostProcessing()

  // Setup fog
  setupFog()

  // Build environment
  createDioramaIsland()
  createPath()

  // Add decorations
  createDecorations()

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

function setupPostProcessing() {
  const camera = scene.activeCamera

  // Default rendering pipeline (FXAA, Bloom, Image processing)
  const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, scene, [camera])

  // FXAA anti-aliasing
  pipeline.fxaaEnabled = true

  // Bloom
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = BLOOM_THRESHOLD
  pipeline.bloomWeight = BLOOM_WEIGHT
  pipeline.bloomKernel = 64
  pipeline.bloomScale = 0.5

  // Image processing
  pipeline.imageProcessingEnabled = true
  pipeline.imageProcessing.contrast = 1.1
  pipeline.imageProcessing.exposure = 0.92
  pipeline.imageProcessing.toneMappingEnabled = true
}

function setupFog() {
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogDensity = FOG_DENSITY
  scene.fogColor = Color3.FromHexString(COLORS.FOG)
}

function createDecorations() {
  createTrees()
  createRockFormations()
  createFlowers()
}

// Seeded random for consistent decoration placement
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function createTrees() {
  const treeBaseMat = new StandardMaterial('treeBaseMat', scene)
  treeBaseMat.diffuseColor = Color3.FromHexString('#4A3728')

  const treeFoliageMat = new StandardMaterial('treeFoliageMat', scene)
  treeFoliageMat.diffuseColor = Color3.FromHexString('#2D5A27')

  const trees = []

  for (let i = 0; i < TREE_COUNT; i++) {
    // Seeded random position
    const seed = i * 12345
    const rx = seededRandom(seed) * 2 - 1
    const rz = seededRandom(seed + 1) * 2 - 1

    const x = rx * (MAP_WIDTH / 2 - 4)
    const z = rz * (MAP_DEPTH / 2 - 4)

    // Skip if on path
    if (isOnPath(x, z, 3)) continue

    // Create tree trunk
    const trunk = MeshBuilder.CreateCylinder(`trunk_${i}`, {
      height: 1.5 * TREE_SCALE,
      diameterTop: 0.3 * TREE_SCALE,
      diameterBottom: 0.5 * TREE_SCALE
    }, scene)
    trunk.position = new Vector3(x, 0.75 * TREE_SCALE, z)
    trunk.material = treeBaseMat

    // Create 3 cone layers for foliage
    const coneHeights = [1.8, 2.5, 3.2]
    const coneSizes = [2.0, 1.5, 1.0]

    for (let j = 0; j < 3; j++) {
      const cone = MeshBuilder.CreateCylinder(`foliage_${i}_${j}`, {
        height: 1.2 * TREE_SCALE,
        diameterTop: 0,
        diameterBottom: coneSizes[j] * TREE_SCALE
      }, scene)
      cone.position = new Vector3(x, coneHeights[j] * TREE_SCALE, z)
      cone.material = treeFoliageMat
      trees.push(cone)
    }

    trees.push(trunk)
    shadowGenerator.addShadowCaster(trunk)
  }

  // Merge all tree parts for performance
  if (trees.length > 0) {
    const mergedTrees = Mesh.MergeMeshes(trees, true, true, undefined, false, true)
    if (mergedTrees) {
      mergedTrees.name = 'trees'
      mergedTrees.receiveShadows = true
    }
  }
}

function createRockFormations() {
  const rockMat = new StandardMaterial('rockMat', scene)
  rockMat.diffuseColor = Color3.FromHexString('#6B6B6B')
  rockMat.specularColor = new Color3(0.1, 0.1, 0.1)

  const rocks = []

  for (let i = 0; i < ROCK_FORMATION_POSITIONS.length; i++) {
    const pos = ROCK_FORMATION_POSITIONS[i]

    // Skip if on path
    if (isOnPath(pos.x, pos.z, 3)) continue

    // Create cluster of rocks
    const numRocks = 3 + Math.floor(seededRandom(i * 999) * 3)

    for (let j = 0; j < numRocks; j++) {
      const offsetX = (seededRandom(i * 100 + j) - 0.5) * 3
      const offsetZ = (seededRandom(i * 100 + j + 50) - 0.5) * 3
      const scale = 0.5 + seededRandom(i * 100 + j + 100) * 1.5

      const rock = MeshBuilder.CreatePolyhedron(`rock_${i}_${j}`, {
        type: 1, // Octahedron
        size: scale
      }, scene)
      rock.position = new Vector3(pos.x + offsetX, scale * 0.5, pos.z + offsetZ)
      rock.rotation = new Vector3(
        seededRandom(i * 100 + j + 150) * Math.PI,
        seededRandom(i * 100 + j + 200) * Math.PI,
        seededRandom(i * 100 + j + 250) * Math.PI * 0.3
      )
      rock.scaling = new Vector3(1, 0.6, 1) // Flatten slightly
      rock.material = rockMat
      rocks.push(rock)
      shadowGenerator.addShadowCaster(rock)
    }
  }

  // Merge rocks
  if (rocks.length > 0) {
    const mergedRocks = Mesh.MergeMeshes(rocks, true, true, undefined, false, true)
    if (mergedRocks) {
      mergedRocks.name = 'rocks'
      mergedRocks.receiveShadows = true
    }
  }
}

function createFlowers() {
  const flowerColors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#FF8ED4', '#A8E6CF']

  const flowers = []

  for (let i = 0; i < FLOWER_COUNT; i++) {
    const seed = i * 7777
    const rx = seededRandom(seed) * 2 - 1
    const rz = seededRandom(seed + 1) * 2 - 1

    const x = rx * (MAP_WIDTH / 2 - 2)
    const z = rz * (MAP_DEPTH / 2 - 2)

    // Skip if on path
    if (isOnPath(x, z, 2)) continue

    // Flower stem
    const stem = MeshBuilder.CreateCylinder(`stem_${i}`, {
      height: 0.3,
      diameter: 0.05
    }, scene)
    stem.position = new Vector3(x, 0.15, z)

    const stemMat = new StandardMaterial(`stemMat_${i}`, scene)
    stemMat.diffuseColor = Color3.FromHexString('#228B22')
    stem.material = stemMat

    // Flower head with emissive glow
    const head = MeshBuilder.CreateSphere(`flower_${i}`, {
      diameter: 0.2,
      segments: 8
    }, scene)
    head.position = new Vector3(x, 0.35, z)

    const colorIndex = Math.floor(seededRandom(seed + 2) * flowerColors.length)
    const flowerMat = new StandardMaterial(`flowerMat_${i}`, scene)
    flowerMat.diffuseColor = Color3.FromHexString(flowerColors[colorIndex])
    flowerMat.emissiveColor = Color3.FromHexString(flowerColors[colorIndex]).scale(0.3)
    head.material = flowerMat

    flowers.push(stem, head)
  }

  // Merge flowers
  if (flowers.length > 0) {
    const mergedFlowers = Mesh.MergeMeshes(flowers, true, true, undefined, false, true)
    if (mergedFlowers) {
      mergedFlowers.name = 'flowers'
      mergedFlowers.receiveShadows = true
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
