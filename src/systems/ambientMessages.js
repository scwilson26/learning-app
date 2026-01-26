/**
 * REMEMBERER - Ambient Messages System (Phase 6)
 *
 * Cryptic messages triggered by user behavior.
 * These create atmosphere without being intrusive.
 *
 * Triggers:
 * - Idle for 30 sec
 * - Return after days away
 * - Milestone achievements (stars mastered, first wormhole)
 * - Star recovery (was fading, now healthy)
 */

import { getData, saveData } from '../services/storage'
import { getTopicState, STAR_STATES, getStatesSummary } from './starStates'

// ============================================================
// MESSAGE POOLS
// ============================================================

const MESSAGES = {
  // Idle messages (30+ seconds of no interaction)
  idle: [
    '...the void is patient',
    '...stillness',
    '...waiting',
    '...the stars watch',
  ],

  // Return after absence (1+ days away)
  returnShort: [  // 1-3 days
    '...you returned',
    '...the void remembers',
    '...welcome back',
  ],
  returnLong: [   // 7+ days
    '...you were missed',
    '...time passed here too',
    '...the void waited',
  ],

  // Milestones - first achievements
  firstStar: [
    '...a light in the dark',
    '...the first of many',
  ],
  firstMastery: [
    '...truly known',
    '...mastery achieved',
  ],
  firstWormhole: [
    '...they were connected all along',
    '...a bridge between worlds',
  ],

  // Milestones - counts
  stars5: [
    "...you're beginning to see",
    '...patterns emerge',
  ],
  stars10: [
    '...the void grows familiar',
    '...a constellation forms',
  ],
  stars25: [
    '...you understand more than most',
    '...knowledge accumulates',
  ],
  stars50: [
    '...you begin to see the shape of it',
    '...halfway to somewhere',
  ],
  stars100: [
    '...the void remembers what you hold onto',
    '...a hundred lights',
  ],

  // Recovery - star was fading, now healthy
  recovery: [
    '...restored',
    '...the light returns',
    '...remembered again',
  ],
}

// ============================================================
// STATE TRACKING
// ============================================================

/**
 * Get ambient message state from localStorage
 */
function getAmbientState() {
  const data = getData()
  return data.ambientMessages || {
    shownMessages: [],      // Message keys that have been shown (for one-time messages)
    lastActivity: null,     // Timestamp of last user activity
    lastVisit: null,        // Timestamp of last Void visit
    previousStates: {},     // topicId -> last known state (for recovery detection)
    milestonesShown: [],    // Milestone keys that have triggered
  }
}

/**
 * Save ambient message state
 */
function saveAmbientState(state) {
  const data = getData()
  data.ambientMessages = state
  saveData(data)
}

/**
 * Record user activity (resets idle timer)
 */
export function recordActivity() {
  const state = getAmbientState()
  state.lastActivity = Date.now()
  saveAmbientState(state)
}

/**
 * Record Void visit (for return-after-absence detection)
 */
export function recordVisit() {
  const state = getAmbientState()
  const now = Date.now()

  // Store the previous visit time before updating
  const previousVisit = state.lastVisit
  state.lastVisit = now
  state.lastActivity = now
  saveAmbientState(state)

  return previousVisit
}

// ============================================================
// TRIGGER DETECTION
// ============================================================

/**
 * Check for idle trigger (30+ seconds since last activity)
 * @returns {string|null} Message to show, or null
 */
export function checkIdleTrigger() {
  const state = getAmbientState()
  if (!state.lastActivity) return null

  const idleMs = Date.now() - state.lastActivity
  const idleSeconds = idleMs / 1000

  // Only trigger once per idle period (mark as shown, reset on activity)
  if (idleSeconds >= 30 && !state.idleTriggered) {
    state.idleTriggered = true
    saveAmbientState(state)
    return pickRandom(MESSAGES.idle)
  }

  return null
}

/**
 * Reset idle trigger (call when user interacts)
 */
export function resetIdleTrigger() {
  const state = getAmbientState()
  if (state.idleTriggered) {
    state.idleTriggered = false
    state.lastActivity = Date.now()
    saveAmbientState(state)
  }
}

/**
 * Check for return-after-absence trigger
 * @param {number|null} previousVisit - Timestamp of previous visit
 * @returns {string|null} Message to show, or null
 */
export function checkReturnTrigger(previousVisit) {
  if (!previousVisit) return null

  const now = Date.now()
  const daysAway = (now - previousVisit) / (1000 * 60 * 60 * 24)

  if (daysAway >= 7) {
    return pickRandom(MESSAGES.returnLong)
  } else if (daysAway >= 1) {
    return pickRandom(MESSAGES.returnShort)
  }

  return null
}

/**
 * Check for milestone triggers based on current progress
 * @param {Object} voidProgress - Current void progress
 * @returns {string|null} Message to show, or null
 */
export function checkMilestoneTrigger(voidProgress) {
  const state = getAmbientState()
  const unlockedTopics = voidProgress.unlockedTopics || []

  // Get mastered count
  const summary = getStatesSummary(unlockedTopics)
  const masteredCount = summary.mastered || 0
  const studiedCount = (summary.studied || 0) + masteredCount
  const totalProgress = studiedCount + (summary.learning || 0)

  // Check milestones in order of impressiveness (show highest applicable)
  const milestones = [
    { key: 'stars100', count: masteredCount, threshold: 100, messages: MESSAGES.stars100 },
    { key: 'stars50', count: masteredCount, threshold: 50, messages: MESSAGES.stars50 },
    { key: 'stars25', count: masteredCount, threshold: 25, messages: MESSAGES.stars25 },
    { key: 'stars10', count: totalProgress, threshold: 10, messages: MESSAGES.stars10 },
    { key: 'stars5', count: totalProgress, threshold: 5, messages: MESSAGES.stars5 },
  ]

  for (const milestone of milestones) {
    if (milestone.count >= milestone.threshold && !state.milestonesShown?.includes(milestone.key)) {
      // Mark as shown
      if (!state.milestonesShown) state.milestonesShown = []
      state.milestonesShown.push(milestone.key)
      saveAmbientState(state)
      return pickRandom(milestone.messages)
    }
  }

  // Check first-time achievements
  if (masteredCount >= 1 && !state.milestonesShown?.includes('firstMastery')) {
    if (!state.milestonesShown) state.milestonesShown = []
    state.milestonesShown.push('firstMastery')
    saveAmbientState(state)
    return pickRandom(MESSAGES.firstMastery)
  }

  if (totalProgress >= 1 && !state.milestonesShown?.includes('firstStar')) {
    if (!state.milestonesShown) state.milestonesShown = []
    state.milestonesShown.push('firstStar')
    saveAmbientState(state)
    return pickRandom(MESSAGES.firstStar)
  }

  return null
}

/**
 * Check for first wormhole trigger
 * @param {number} wormholeCount - Current visible wormhole count
 * @returns {string|null} Message to show, or null
 */
export function checkFirstWormholeTrigger(wormholeCount) {
  if (wormholeCount === 0) return null

  const state = getAmbientState()
  if (state.milestonesShown?.includes('firstWormhole')) return null

  // First wormhole!
  if (!state.milestonesShown) state.milestonesShown = []
  state.milestonesShown.push('firstWormhole')
  saveAmbientState(state)
  return pickRandom(MESSAGES.firstWormhole)
}

/**
 * Check for star recovery (was fading, now not fading)
 * @param {Array} allStars - All stars with current states
 * @returns {string|null} Message to show, or null
 */
export function checkRecoveryTrigger(allStars) {
  const state = getAmbientState()
  const previousStates = state.previousStates || {}
  let recoveryDetected = false

  // Check each star
  for (const star of allStars) {
    const previousState = previousStates[star.id]
    const currentState = star.state

    // Was fading, now not fading (and not undiscovered)
    if (previousState === STAR_STATES.fading &&
        currentState !== STAR_STATES.fading &&
        currentState !== STAR_STATES.undiscovered) {
      recoveryDetected = true
    }

    // Update stored state
    previousStates[star.id] = currentState
  }

  state.previousStates = previousStates
  saveAmbientState(state)

  if (recoveryDetected) {
    return pickRandom(MESSAGES.recovery)
  }

  return null
}

// ============================================================
// MAIN CHECK FUNCTION
// ============================================================

/**
 * Check all triggers and return the most important message to show
 * Priority: return > milestone > recovery > idle
 *
 * @param {Object} options
 * @param {Object} options.voidProgress - Current void progress
 * @param {Array} options.allStars - All stars with current states
 * @param {number} options.wormholeCount - Current visible wormhole count
 * @param {number|null} options.previousVisit - Timestamp of previous visit
 * @returns {Object|null} { message, type } or null
 */
export function checkAmbientTriggers({ voidProgress, allStars, wormholeCount, previousVisit }) {
  // Priority 1: Return after absence
  const returnMsg = checkReturnTrigger(previousVisit)
  if (returnMsg) return { message: returnMsg, type: 'return' }

  // Priority 2: Milestones
  const milestoneMsg = checkMilestoneTrigger(voidProgress)
  if (milestoneMsg) return { message: milestoneMsg, type: 'milestone' }

  // Priority 3: First wormhole
  const wormholeMsg = checkFirstWormholeTrigger(wormholeCount)
  if (wormholeMsg) return { message: wormholeMsg, type: 'wormhole' }

  // Priority 4: Recovery
  const recoveryMsg = checkRecoveryTrigger(allStars)
  if (recoveryMsg) return { message: recoveryMsg, type: 'recovery' }

  return null
}

// ============================================================
// HELPERS
// ============================================================

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ============================================================
// DEBUG
// ============================================================

export function debugAmbientState() {
  const state = getAmbientState()
  console.log('=== Ambient Messages Debug ===')
  console.log('Last activity:', state.lastActivity ? new Date(state.lastActivity).toISOString() : 'never')
  console.log('Last visit:', state.lastVisit ? new Date(state.lastVisit).toISOString() : 'never')
  console.log('Milestones shown:', state.milestonesShown || [])
  console.log('Idle triggered:', state.idleTriggered || false)
  console.log('Previous states tracked:', Object.keys(state.previousStates || {}).length)
  return state
}
