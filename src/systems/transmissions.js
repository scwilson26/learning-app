/**
 * REMEMBERER - Daily Transmissions System (Phase 7)
 *
 * One contextual message per day on entering The Void.
 * Analyzes current state and provides gentle guidance.
 *
 * Triggers (priority order):
 * - Multiple stars fading (urgent)
 * - Close to unlocking a wormhole (exciting)
 * - Unexplored cluster nearby (discovery)
 * - General/fallback (atmospheric)
 */

import { getData, saveData } from '../services/storage'
import { STAR_STATES } from './starStates'

// ============================================================
// TRANSMISSION POOLS
// ============================================================

const TRANSMISSIONS = {
  // Fading stars (3+)
  fadingMany: [
    '...signals fading in the dark',
    '...the void grows quieter',
    '...memories drift away',
  ],

  // Fading stars (1-2)
  fadingFew: [
    '...a light wavers',
    '...something dims at the edge',
    '...do not let it fade',
  ],

  // Close to wormhole (one endpoint mastered, other close)
  nearWormhole: [
    '...anomaly forming',
    '...a connection stirs',
    '...two lights reaching toward each other',
  ],

  // Unexplored cluster with activity nearby
  unexploredNearby: [
    '...signals detected in unknown region',
    '...something waits in the dark',
    '...unexplored territory ahead',
  ],

  // Good progress (mastered stars recently)
  momentum: [
    '...the constellation grows',
    '...you illuminate the void',
    '...progress echoes through the dark',
  ],

  // Long streak of activity
  dedication: [
    '...the void recognizes persistence',
    '...day by day, light by light',
    '...you return. the void remembers.',
  ],

  // First time in a while with no issues
  peaceful: [
    '...all is well in the void',
    '...the stars hold steady',
    '...quiet. for now.',
  ],

  // Generic fallbacks
  general: [
    '...the void awaits',
    '...what will you remember today?',
    '...the stars are patient',
    '...signals persist',
    '...the map expands',
  ],
}

// ============================================================
// STATE TRACKING
// ============================================================

/**
 * Get transmission state from localStorage
 */
function getTransmissionState() {
  const data = getData()
  return data.transmissions || {
    lastTransmissionDate: null,  // ISO date string (YYYY-MM-DD)
    lastTransmissionType: null,  // For variety tracking
    transmissionCount: 0,        // Total transmissions shown
    streak: 0,                   // Consecutive days visiting
    lastVisitDate: null,         // For streak calculation
  }
}

/**
 * Save transmission state
 */
function saveTransmissionState(state) {
  const data = getData()
  data.transmissions = state
  saveData(data)
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a transmission has been shown today
 */
export function hasShownTransmissionToday() {
  const state = getTransmissionState()
  return state.lastTransmissionDate === getTodayDate()
}

/**
 * Mark transmission as shown today
 */
function markTransmissionShown(type) {
  const state = getTransmissionState()
  const today = getTodayDate()

  // Update streak
  if (state.lastVisitDate) {
    const lastDate = new Date(state.lastVisitDate)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      state.streak = (state.streak || 0) + 1
    } else if (diffDays > 1) {
      state.streak = 1
    }
    // If diffDays === 0, streak stays the same (same day)
  } else {
    state.streak = 1
  }

  state.lastTransmissionDate = today
  state.lastTransmissionType = type
  state.transmissionCount = (state.transmissionCount || 0) + 1
  state.lastVisitDate = today

  saveTransmissionState(state)
}

// ============================================================
// ANALYSIS FUNCTIONS
// ============================================================

/**
 * Count fading stars
 */
function countFadingStars(allStars) {
  return allStars.filter(star => star.state === STAR_STATES.fading).length
}

/**
 * Count mastered stars
 */
function countMasteredStars(allStars) {
  return allStars.filter(star => star.state === STAR_STATES.mastered).length
}

/**
 * Check if close to unlocking a wormhole
 * (one endpoint mastered, other is studied or learning with good progress)
 */
function isNearWormhole(allStars, wormholes) {
  if (!wormholes || wormholes.length === 0) return false

  // Get all topic states as a map for quick lookup
  const stateMap = {}
  allStars.forEach(star => {
    stateMap[star.id] = star.state
  })

  // Check each potential wormhole
  for (const wormhole of wormholes) {
    const state1 = stateMap[wormhole.endpoints[0].topicId]
    const state2 = stateMap[wormhole.endpoints[1].topicId]

    // One mastered, other is studied (close to mastery)
    if (state1 === STAR_STATES.mastered && state2 === STAR_STATES.studied) return true
    if (state2 === STAR_STATES.mastered && state1 === STAR_STATES.studied) return true
  }

  return false
}

/**
 * Check if there's an unexplored cluster with activity nearby
 * (user has stars in one cluster, adjacent cluster is mostly unexplored)
 */
function hasUnexploredNearby(allStars, clusters) {
  if (!clusters) return false

  // Group stars by cluster
  const clusterStats = {}
  allStars.forEach(star => {
    if (!clusterStats[star.cluster]) {
      clusterStats[star.cluster] = { total: 0, explored: 0 }
    }
    clusterStats[star.cluster].total++
    if (star.state !== STAR_STATES.undiscovered) {
      clusterStats[star.cluster].explored++
    }
  })

  // Find clusters where user has activity
  const activeClusters = Object.entries(clusterStats)
    .filter(([_, stats]) => stats.explored >= 3)
    .map(([name]) => name)

  // Find clusters that are mostly unexplored
  const unexploredClusters = Object.entries(clusterStats)
    .filter(([_, stats]) => stats.explored < 2 && stats.total > 10)
    .map(([name]) => name)

  // If there's both active and unexplored clusters, there's opportunity
  return activeClusters.length > 0 && unexploredClusters.length > 0
}

/**
 * Check if user has momentum (mastered stars recently)
 */
function hasMomentum(allStars) {
  const masteredCount = countMasteredStars(allStars)
  return masteredCount >= 3
}

/**
 * Get current streak
 */
function getStreak() {
  const state = getTransmissionState()
  return state.streak || 0
}

// ============================================================
// MAIN TRANSMISSION SELECTION
// ============================================================

/**
 * Select and return today's transmission based on current state
 * Returns null if already shown today
 *
 * @param {Object} options
 * @param {Array} options.allStars - All stars with current states
 * @param {Array} options.allWormholes - All potential wormholes
 * @param {Object} options.clusters - Cluster definitions
 * @returns {Object|null} { message, type } or null if already shown
 */
export function getDailyTransmission({ allStars, allWormholes, clusters }) {
  // Already shown today
  if (hasShownTransmissionToday()) {
    return null
  }

  const state = getTransmissionState()
  const lastType = state.lastTransmissionType

  // Analyze current state
  const fadingCount = countFadingStars(allStars)
  const nearWormhole = isNearWormhole(allStars, allWormholes)
  const unexploredNearby = hasUnexploredNearby(allStars, clusters)
  const momentum = hasMomentum(allStars)
  const streak = getStreak()

  // Priority-based selection
  let type = 'general'
  let pool = TRANSMISSIONS.general

  // Priority 1: Multiple fading stars (urgent)
  if (fadingCount >= 3 && lastType !== 'fadingMany') {
    type = 'fadingMany'
    pool = TRANSMISSIONS.fadingMany
  }
  // Priority 2: Few fading stars
  else if (fadingCount >= 1 && lastType !== 'fadingFew') {
    type = 'fadingFew'
    pool = TRANSMISSIONS.fadingFew
  }
  // Priority 3: Near wormhole (exciting discovery)
  else if (nearWormhole && lastType !== 'nearWormhole') {
    type = 'nearWormhole'
    pool = TRANSMISSIONS.nearWormhole
  }
  // Priority 4: Unexplored territory
  else if (unexploredNearby && lastType !== 'unexploredNearby') {
    type = 'unexploredNearby'
    pool = TRANSMISSIONS.unexploredNearby
  }
  // Priority 5: Good streak (dedication)
  else if (streak >= 3 && lastType !== 'dedication') {
    type = 'dedication'
    pool = TRANSMISSIONS.dedication
  }
  // Priority 6: Momentum (progress)
  else if (momentum && lastType !== 'momentum') {
    type = 'momentum'
    pool = TRANSMISSIONS.momentum
  }
  // Priority 7: Everything is fine
  else if (fadingCount === 0 && lastType !== 'peaceful') {
    type = 'peaceful'
    pool = TRANSMISSIONS.peaceful
  }
  // Fallback: General
  else {
    type = 'general'
    pool = TRANSMISSIONS.general
  }

  // Pick random from pool
  const message = pool[Math.floor(Math.random() * pool.length)]

  // Mark as shown
  markTransmissionShown(type)

  console.log(`[Transmissions] Daily transmission (${type}): "${message}"`)

  return { message, type }
}

// ============================================================
// DEBUG
// ============================================================

export function debugTransmissions() {
  const state = getTransmissionState()
  console.log('=== Transmissions Debug ===')
  console.log('Last transmission date:', state.lastTransmissionDate)
  console.log('Last type:', state.lastTransmissionType)
  console.log('Total shown:', state.transmissionCount)
  console.log('Current streak:', state.streak)
  console.log('Today:', getTodayDate())
  console.log('Already shown today:', hasShownTransmissionToday())
  return state
}

/**
 * Reset transmission for today (for testing)
 */
export function resetTodayTransmission() {
  const state = getTransmissionState()
  state.lastTransmissionDate = null
  saveTransmissionState(state)
  console.log('[Transmissions] Reset - will show transmission on next Void entry')
}
