// ============================================
// ZUSTAND-STYLE STATE MANAGEMENT (No React)
// ============================================

import {
  STARTING_GOLD,
  STARTING_LIVES,
  BASE_ENEMY_COUNT,
  ENEMY_INCREMENT_PER_WAVE,
  BASE_HP,
  BASE_SPEED,
  ENEMY_HP_SCALE,
  ENEMY_SPEED_SCALE,
  SPAWN_DELAY,
  GOLD_PER_KILL,
  TOWERS,
  MAX_RAGDOLLS,
  MAX_PARTICLES,
  BOSS_CONFIG
} from './settings.js'

// Initial state
const createInitialState = () => ({
  phase: 'BUILD', // 'BUILD' | 'WAVE' | 'GAME_OVER'
  currentWave: 1,
  gold: STARTING_GOLD,
  lives: STARTING_LIVES,
  waveTime: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  ragdolls: [],
  particles: [],
  goldPopups: [],
  selectedTowerType: 'arrow',
  ghostPosition: null
})

// Store implementation
let state = createInitialState()
const listeners = new Set()

// Subscribe to state changes
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Get current state (read-only)
export function getState() {
  return state
}

// Internal: notify all listeners
function notify() {
  listeners.forEach(listener => listener(state))
}

// Internal: update state
function setState(updates) {
  state = { ...state, ...updates }
  notify()
}

// ============================================
// ACTIONS
// ============================================

let nextTowerId = 1
let nextEnemyId = 1
let nextProjectileId = 1
let nextRagdollId = 1
let nextParticleId = 1
let nextGoldPopupId = 1

// Tower actions
export function selectTowerType(type) {
  setState({ selectedTowerType: type })
}

export function setGhostPosition(position) {
  setState({ ghostPosition: position })
}

export function addTower(position, type) {
  const cost = TOWERS[type].cost
  if (state.gold < cost) return false

  const tower = {
    id: nextTowerId++,
    type,
    position: { ...position },
    lastFireTime: -Math.random() * 1000 // Staggered start
  }

  setState({
    gold: state.gold - cost,
    towers: [...state.towers, tower]
  })
  return true
}

export function updateTowerLastFireTime(towerId, time) {
  setState({
    towers: state.towers.map(t =>
      t.id === towerId ? { ...t, lastFireTime: time } : t
    )
  })
}

// Wave actions
export function startWave() {
  if (state.phase !== 'BUILD') return

  const wave = state.currentWave
  const enemyCount = BASE_ENEMY_COUNT + (wave - 1) * ENEMY_INCREMENT_PER_WAVE
  const hp = BASE_HP * Math.pow(ENEMY_HP_SCALE, wave - 1)
  const speed = BASE_SPEED * Math.pow(ENEMY_SPEED_SCALE, wave - 1)

  const enemies = []

  // Check if this is a BOSS WAVE
  const isBossWave = wave % BOSS_CONFIG.SPAWN_WAVE_INTERVAL === 0
  const bossNumber = Math.floor(wave / BOSS_CONFIG.SPAWN_WAVE_INTERVAL)

  if (isBossWave) {
    // SPAWN THE ULTIMATE HYPER BOSS
    const bossHp = BOSS_CONFIG.BASE_HP * Math.pow(BOSS_CONFIG.HP_SCALE_PER_SPAWN, bossNumber - 1)
    console.log(`%c BOSS WAVE ${wave}! THE ULTIMATE HYPER BOSS APPROACHES!`, 'color: red; font-size: 20px; font-weight: bold;')
    console.log(`%c Boss HP: ${bossHp.toLocaleString()}`, 'color: orange; font-size: 14px;')

    enemies.push({
      id: nextEnemyId++,
      spawnDelay: 0, // Boss spawns immediately
      spawned: false,
      pathProgress: 0,
      hp: bossHp,
      maxHp: bossHp,
      speed: BOSS_CONFIG.SPEED,
      dying: false,
      deathTime: 0,
      jitterSeed: Math.random() * 1000,
      frostedUntil: 0,
      // BOSS SPECIFIC PROPERTIES
      isBoss: true,
      bossNumber,
      lastMinionSpawn: 0,
      lastRegenTick: 0
    })
  }

  // Regular enemies (fewer on boss waves)
  const regularCount = isBossWave ? Math.floor(enemyCount * 0.5) : enemyCount
  const startDelay = isBossWave ? 2 : 0 // Delay regular spawns on boss wave

  for (let i = 0; i < regularCount; i++) {
    enemies.push({
      id: nextEnemyId++,
      spawnDelay: startDelay + i * SPAWN_DELAY,
      spawned: false,
      pathProgress: 0,
      hp,
      maxHp: hp,
      speed,
      dying: false,
      deathTime: 0,
      jitterSeed: Math.random() * 1000,
      frostedUntil: 0,
      isBoss: false
    })
  }

  setState({
    phase: 'WAVE',
    waveTime: 0,
    enemies,
    ghostPosition: null
  })
}

export function updateWaveTime(dt) {
  setState({ waveTime: state.waveTime + dt })
}

export function spawnEnemy(id) {
  setState({
    enemies: state.enemies.map(e =>
      e.id === id ? { ...e, spawned: true } : e
    )
  })
}

export function updateEnemy(id, updates) {
  setState({
    enemies: state.enemies.map(e =>
      e.id === id ? { ...e, ...updates } : e
    )
  })
}

export function damageEnemy(id, damage) {
  const enemy = state.enemies.find(e => e.id === id)
  if (!enemy || enemy.dying) return { killed: false }

  const newHp = enemy.hp - damage
  if (newHp <= 0) {
    // Boss gives massive gold reward!
    const goldReward = enemy.isBoss ? BOSS_CONFIG.DEATH_GOLD_REWARD : GOLD_PER_KILL

    if (enemy.isBoss) {
      console.log(`%c BOSS DEFEATED! +${goldReward} GOLD!`, 'color: gold; font-size: 24px; font-weight: bold;')
    }

    setState({
      enemies: state.enemies.map(e =>
        e.id === id ? { ...e, hp: 0, dying: true, deathTime: Date.now() } : e
      ),
      gold: state.gold + goldReward
    })
    return { killed: true, gold: goldReward, wasBoss: enemy.isBoss }
  }

  setState({
    enemies: state.enemies.map(e =>
      e.id === id ? { ...e, hp: newHp } : e
    )
  })
  return { killed: false }
}

export function applyFrost(id, duration) {
  const enemy = state.enemies.find(e => e.id === id)
  // Boss is IMMUNE to slow!
  if (enemy && enemy.isBoss && BOSS_CONFIG.IMMUNE_TO_SLOW) {
    return // No effect on boss
  }

  const until = Date.now() + duration * 1000
  setState({
    enemies: state.enemies.map(e =>
      e.id === id ? { ...e, frostedUntil: Math.max(e.frostedUntil, until) } : e
    )
  })
}

export function removeEnemy(id) {
  setState({
    enemies: state.enemies.filter(e => e.id !== id)
  })
}

// Boss regeneration - heals boss over time
export function updateBossRegen(dt) {
  const now = Date.now()
  const bosses = state.enemies.filter(e => e.isBoss && e.spawned && !e.dying)

  for (const boss of bosses) {
    // Regenerate HP
    const regenAmount = BOSS_CONFIG.REGEN_PER_SECOND * dt
    const newHp = Math.min(boss.hp + regenAmount, boss.maxHp)

    if (newHp !== boss.hp) {
      setState({
        enemies: state.enemies.map(e =>
          e.id === boss.id ? { ...e, hp: newHp, lastRegenTick: now } : e
        )
      })
    }
  }
}

// Boss spawns minions periodically
export function updateBossMinionSpawn(waveTime, baseHp, baseSpeed) {
  if (!BOSS_CONFIG.SPAWN_MINIONS) return

  const bosses = state.enemies.filter(e => e.isBoss && e.spawned && !e.dying)

  for (const boss of bosses) {
    // Check if it's time to spawn minions
    const timeSinceLastSpawn = waveTime - boss.lastMinionSpawn
    if (timeSinceLastSpawn >= BOSS_CONFIG.MINION_SPAWN_INTERVAL) {
      // Spawn minions near the boss
      const newMinions = []
      for (let i = 0; i < BOSS_CONFIG.MINIONS_PER_SPAWN; i++) {
        newMinions.push({
          id: nextEnemyId++,
          spawnDelay: 0,
          spawned: true,
          pathProgress: Math.max(0, boss.pathProgress - 0.02 - (i * 0.01)),
          hp: baseHp * 0.5, // Minions are weaker
          maxHp: baseHp * 0.5,
          speed: baseSpeed * 1.2, // But faster
          dying: false,
          deathTime: 0,
          jitterSeed: Math.random() * 1000,
          frostedUntil: 0,
          isBoss: false,
          isMinion: true // Spawned by boss
        })
      }

      setState({
        enemies: [
          ...state.enemies.map(e =>
            e.id === boss.id ? { ...e, lastMinionSpawn: waveTime } : e
          ),
          ...newMinions
        ]
      })
    }
  }
}

export function enemyPassed(id) {
  const enemy = state.enemies.find(e => e.id === id)
  // Boss passing = instant game over (or takes ALL lives)
  const livesLost = enemy && enemy.isBoss ? state.lives : 1

  if (enemy && enemy.isBoss) {
    console.log('%c THE BOSS HAS BREACHED YOUR DEFENSES! GAME OVER!', 'color: red; font-size: 20px; font-weight: bold;')
  }

  const newLives = state.lives - livesLost
  removeEnemy(id)

  if (newLives <= 0) {
    setState({
      lives: 0,
      phase: 'GAME_OVER'
    })
  } else {
    setState({ lives: newLives })
  }
}

export function checkWaveComplete() {
  const allSpawned = state.enemies.every(e => e.spawned)
  const noneActive = state.enemies.filter(e => !e.dying).length === 0

  if (allSpawned && noneActive && state.phase === 'WAVE') {
    setState({
      phase: 'BUILD',
      currentWave: state.currentWave + 1
    })
    return true
  }
  return false
}

// Projectile actions
export function addProjectile(projectile) {
  setState({
    projectiles: [...state.projectiles, { ...projectile, id: nextProjectileId++ }]
  })
}

export function updateProjectile(id, updates) {
  setState({
    projectiles: state.projectiles.map(p =>
      p.id === id ? { ...p, ...updates } : p
    )
  })
}

export function removeProjectile(id) {
  setState({
    projectiles: state.projectiles.filter(p => p.id !== id)
  })
}

// Effects actions
export function spawnRagdoll(ragdoll) {
  let ragdolls = [...state.ragdolls, { ...ragdoll, id: nextRagdollId++ }]
  if (ragdolls.length > MAX_RAGDOLLS) {
    ragdolls = ragdolls.slice(-MAX_RAGDOLLS)
  }
  setState({ ragdolls })
}

export function updateRagdolls(updater) {
  setState({ ragdolls: updater(state.ragdolls) })
}

export function removeRagdoll(id) {
  setState({
    ragdolls: state.ragdolls.filter(r => r.id !== id)
  })
}

export function spawnParticles(particles) {
  let allParticles = [
    ...state.particles,
    ...particles.map(p => ({ ...p, id: nextParticleId++ }))
  ]
  if (allParticles.length > MAX_PARTICLES) {
    allParticles = allParticles.slice(-MAX_PARTICLES)
  }
  setState({ particles: allParticles })
}

export function updateParticles(updater) {
  setState({ particles: updater(state.particles) })
}

export function spawnGoldPopup(popup) {
  setState({
    goldPopups: [...state.goldPopups, { ...popup, id: nextGoldPopupId++ }]
  })
}

export function updateGoldPopups(updater) {
  setState({ goldPopups: updater(state.goldPopups) })
}

// Spawn boss instantly (for testing)
let nextEnemyIdForBoss = 10000 // Separate ID range for spawned bosses
export function spawnBossInstantly() {
  const bossHp = BOSS_CONFIG.BASE_HP
  console.log(`%c BOSS SUMMONED! HP: ${bossHp.toLocaleString()}`, 'color: red; font-size: 20px; font-weight: bold;')

  const boss = {
    id: nextEnemyIdForBoss++,
    spawnDelay: 0,
    spawned: true, // Spawn immediately
    pathProgress: 0,
    hp: bossHp,
    maxHp: bossHp,
    speed: BOSS_CONFIG.SPEED,
    dying: false,
    deathTime: 0,
    jitterSeed: Math.random() * 1000,
    frostedUntil: 0,
    isBoss: true,
    bossNumber: 1,
    lastMinionSpawn: 0,
    lastRegenTick: 0
  }

  // If not in wave phase, start a wave first
  if (state.phase !== 'WAVE') {
    setState({
      phase: 'WAVE',
      waveTime: 0,
      enemies: [boss],
      ghostPosition: null
    })
  } else {
    // Add boss to existing enemies
    setState({
      enemies: [...state.enemies, boss]
    })
  }
}

// Game reset
export function reset() {
  nextTowerId = 1
  nextEnemyId = 1
  nextProjectileId = 1
  nextRagdollId = 1
  nextParticleId = 1
  nextGoldPopupId = 1
  state = createInitialState()
  notify()
}
