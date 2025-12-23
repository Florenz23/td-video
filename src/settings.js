// ============================================
// TOWER DEFENSE CHAOS - GAME SETTINGS
// ============================================

// Map dimensions
export const MAP_WIDTH = 80
export const MAP_DEPTH = 48
export const TILE_SIZE = 1
export const GROUND_DEPTH = 4 // Floating island thickness

// Path waypoints (snake pattern)
export const PATH_WAYPOINTS = [
  { x: -36, z: 16 },
  { x: -12, z: 16 },
  { x: -12, z: -16 },
  { x: 12, z: -16 },
  { x: 12, z: 16 },
  { x: 36, z: 16 }
]
export const PATH_WIDTH = 4

// Camera settings
export const CAMERA_ALPHA = 0 // Horizontal angle (radians)
export const CAMERA_BETA = Math.PI / 4 // 45 degrees vertical
export const CAMERA_RADIUS = 50 // Default distance
export const CAMERA_ZOOM_MIN = 20
export const CAMERA_ZOOM_MAX = 80
export const CAMERA_ZOOM_SPEED = 5
export const CAMERA_PAN_SPEED = 25

// Colors
export const COLORS = {
  // Environment
  SKY: { r: 0.53, g: 0.81, b: 0.92 },
  GRASS: '#5CB85C',
  DIRT: '#8B6B4A',
  PATH: '#8B7355',

  // Orc
  ORC_SKIN: '#7CB342',
  ORC_LIMB: '#689F38',
  ORC_TUSK: '#E8D4B8',
  ORC_ARMOR: '#8B5A2B',
  ORC_METAL: '#708090',
  ORC_WOOD: '#6B4423',

  // Frosted orc
  ORC_SKIN_FROST: '#5A8AAA',
  ORC_LIMB_FROST: '#4A7899',

  // Towers
  TOWER_ARROW_BASE: '#78909C',
  TOWER_ARROW_WOOD: '#A1887F',
  TOWER_FLAME_BASE: '#6D4C41',
  TOWER_FLAME_ORB: '#FF7043',
  TOWER_FROST_BASE: '#B3E5FC',
  TOWER_FROST_CRYSTAL: '#4FC3F7',
  TOWER_LIGHTNING_BASE: '#5C6BC0',
  TOWER_LIGHTNING_BODY: '#7C4DFF',
  TOWER_LIGHTNING_ORB: '#B388FF',

  // Ghost preview
  GHOST_ARROW: '#00FF88',
  GHOST_FLAME: '#FF8800',
  GHOST_FROST: '#66CCFF',
  GHOST_LIGHTNING: '#8844FF',
  GHOST_INVALID: '#FF0000',

  // Effects
  FIRE: '#FF7043',
  ICE: '#4FC3F7',
  LIGHTNING: '#7C4DFF',
  GOLD: '#FFD700',

  // Fog
  FOG: '#808880'
}

// Tower stats
export const TOWER_SCALE = 1.3
export const TOWERS = {
  arrow: {
    cost: 50,
    range: 6,
    fireRate: 2.0,
    damage: 33,
    projectileSpeed: 20,
    critChance: 0.15,
    critMultiplier: 2
  },
  flame: {
    cost: 100,
    range: 30,
    fireRate: 0.3,
    damage: 17,
    aoeRadius: 2.5,
    projectileSpeed: 10,
    gravity: 9.8
  },
  frost: {
    cost: 120,
    range: 5,
    fireRate: 0.8,
    damage: 10,
    projectileSpeed: 15,
    aoeRadius: 2.0,
    slowMultiplier: 0.5,
    slowDuration: 2.5
  },
  lightning: {
    cost: 150,
    range: 7,
    fireRate: 1.0,
    damage: 33,
    chainCount: 4,
    chainRange: 3
  }
}

// Enemy stats
export const BASE_HP = 500
export const BASE_SPEED = 2.0
export const ENEMY_HP_SCALE = 1.2 // Per wave multiplier
export const ENEMY_SPEED_SCALE = 1.05 // Per wave multiplier
export const JITTER_AMPLITUDE = 0.25
export const JITTER_FREQUENCY = 2.0

// Wave settings
export const BASE_ENEMY_COUNT = 200
export const ENEMY_INCREMENT_PER_WAVE = 100
export const SPAWN_DELAY = 0.5 // Seconds between spawns

// Economy
export const STARTING_GOLD = 3000
export const GOLD_PER_KILL = 10
export const STARTING_LIVES = 20

// Physics
export const GRAVITY = -20
export const FLAME_GRAVITY = 9.8
export const KNOCKBACK_FORCE = 2.0

// Entity pools
export const MAX_ENEMIES = 500
export const MAX_PROJECTILES = 100
export const MAX_PARTICLES = 200
export const MAX_RAGDOLLS = 20
export const MAX_TRAIL_PARTICLES = 300
export const MAX_MUZZLE_FLASHES = 15
export const MAX_DEATH_LIGHTS = 5

// Effect durations (ms)
export const VOXEL_SHATTER_LIFETIME = 800
export const GOLD_POPUP_LIFETIME = 1000
export const RAGDOLL_LIFETIME = 2000
export const TRAIL_PARTICLE_LIFETIME = 150
export const MUZZLE_FLASH_LIFETIME = 80
export const DEATH_LIGHT_LIFETIME = 120
export const CRIT_FLASH_LIFETIME = 250
export const FROST_EXPLOSION_LIFETIME = 400
export const SCORCH_MARK_LIFETIME = 800

// Lighting
export const HEMISPHERIC_INTENSITY = 0.35
export const SUN_INTENSITY = 1.0
export const SUN_POSITION = { x: 20, y: 40, z: 20 }

// Post-processing
export const FOG_DENSITY = 0.0018
export const BLOOM_THRESHOLD = 0.7
export const BLOOM_WEIGHT = 0.3
export const SSAO_RADIUS = 1.5
export const SSAO_SAMPLES = 16

// Decorations
export const TREE_COUNT = 80
export const TREE_SCALE = 2.0
export const FLOWER_COUNT = 60
export const ROCK_FORMATION_POSITIONS = [
  { x: -30, z: -10 },
  { x: 30, z: -10 },
  { x: -25, z: 5 },
  { x: 25, z: 5 },
  { x: 0, z: -20 },
  { x: -35, z: -18 },
  { x: 35, z: -18 }
]
