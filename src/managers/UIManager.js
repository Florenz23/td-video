// ============================================
// UI MANAGER - HUD elements and interactions
// ============================================

import { getState, selectTowerType, startWave, reset } from '../store.js'
import { TOWERS } from '../settings.js'

// DOM elements
let goldValue = null
let livesValue = null
let waveNumber = null
let phaseIndicator = null
let actionBtn = null
let centerButton = null
let towerButtons = null
let gameOverOverlay = null
let gameOverStats = null
let restartBtn = null

// Callbacks
let onResetGame = null

export function initUIManager(resetCallback) {
  onResetGame = resetCallback

  // Get DOM elements
  goldValue = document.getElementById('gold-value')
  livesValue = document.getElementById('lives-value')
  waveNumber = document.getElementById('wave-number')
  phaseIndicator = document.getElementById('phase-indicator')
  actionBtn = document.getElementById('action-btn')
  centerButton = document.getElementById('center-button')
  towerButtons = document.querySelectorAll('.tower-btn')
  gameOverOverlay = document.getElementById('game-over-overlay')
  gameOverStats = document.getElementById('game-over-stats')
  restartBtn = gameOverOverlay.querySelector('#action-btn')

  // Setup event listeners
  setupTowerButtons()
  setupActionButton()
  setupRestartButton()

  // Initial update
  updateUI()
}

function setupTowerButtons() {
  towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const towerType = btn.dataset.tower
      const state = getState()

      // Only allow selection during BUILD phase
      if (state.phase !== 'BUILD') return

      // Check if affordable
      if (state.gold < TOWERS[towerType].cost) return

      selectTowerType(towerType)
      updateTowerSelection()
    })
  })
}

function setupActionButton() {
  actionBtn.addEventListener('click', () => {
    const state = getState()
    if (state.phase === 'BUILD') {
      startWave()
    }
  })
}

function setupRestartButton() {
  restartBtn.addEventListener('click', () => {
    if (onResetGame) {
      onResetGame()
    }
    gameOverOverlay.classList.add('hidden')
  })
}

export function updateUI() {
  const state = getState()

  // Update resources
  goldValue.textContent = state.gold
  livesValue.textContent = state.lives

  // Update wave number
  waveNumber.textContent = `Wave ${state.currentWave}`

  // Update phase indicator
  updatePhaseIndicator(state.phase)

  // Update action button
  updateActionButton(state.phase)

  // Update tower buttons affordability
  updateTowerAffordability(state.gold)

  // Update tower selection
  updateTowerSelection()

  // Show/hide game over overlay
  if (state.phase === 'GAME_OVER') {
    showGameOver(state.currentWave)
  }
}

function updatePhaseIndicator(phase) {
  phaseIndicator.className = ''

  switch (phase) {
    case 'BUILD':
      phaseIndicator.textContent = 'Build Phase'
      phaseIndicator.classList.add('build')
      break
    case 'WAVE':
      phaseIndicator.textContent = 'Wave Active'
      phaseIndicator.classList.add('wave')
      break
    case 'GAME_OVER':
      phaseIndicator.textContent = 'Game Over'
      phaseIndicator.classList.add('game-over')
      break
  }
}

function updateActionButton(phase) {
  if (phase === 'BUILD') {
    actionBtn.textContent = 'Start Wave'
    actionBtn.classList.remove('hidden', 'restart')
    centerButton.style.display = 'block'
  } else if (phase === 'WAVE') {
    centerButton.style.display = 'none'
  } else if (phase === 'GAME_OVER') {
    centerButton.style.display = 'none'
  }
}

function updateTowerAffordability(gold) {
  towerButtons.forEach(btn => {
    const towerType = btn.dataset.tower
    const cost = TOWERS[towerType].cost

    if (gold < cost) {
      btn.classList.add('disabled')
    } else {
      btn.classList.remove('disabled')
    }
  })
}

function updateTowerSelection() {
  const state = getState()

  towerButtons.forEach(btn => {
    const towerType = btn.dataset.tower

    if (towerType === state.selectedTowerType) {
      btn.classList.add('selected')
    } else {
      btn.classList.remove('selected')
    }
  })
}

function showGameOver(wave) {
  gameOverStats.textContent = `You reached Wave ${wave}`
  gameOverOverlay.classList.remove('hidden')
}

export function hideGameOver() {
  gameOverOverlay.classList.add('hidden')
}

export function disposeUIManager() {
  // Remove event listeners would go here if needed
}

export function resetUIManager() {
  hideGameOver()
  updateUI()
}
