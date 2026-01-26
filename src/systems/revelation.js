/**
 * REMEMBERER - Revelation System (Phase 10)
 *
 * Layer 2: The Reveal - "This is your mind"
 * Layer 3: The Deep Mystery - "What happened to it?"
 *
 * Triggers:
 * - Layer 2 reveal around day 3-5 of use, or first star fade
 * - Layer 3 hints scattered rarely for long-term players
 * - Center glow hints at 500/750/900/1000 mastered stars
 */

import { getData, saveData } from '../services/storage'
import { STAR_STATES } from './starStates'

// ============================================================
// REVELATION MESSAGES
// ============================================================

// Layer 2: The Reveal - "This is your mind"
const LAYER_2_MESSAGES = {
  // Triggered by first star fading
  firstFade: [
    '...the void doesn\'t take. you let go.',
    '...what fades was never truly held',
  ],
  // Triggered after extended play (day 3-5)
  realization: [
    '...did you think this was somewhere else?',
    '...the stars are not out there',
    '...you have always been here',
  ],
}

// Layer 3: Deeper mystery hints (rare, scattered)
const LAYER_3_MESSAGES = [
  '...you are not the first',
  '...the void was not always empty',
  '...something remembers what you forget',
  '...others mapped these stars before',
  '...the echoes are not yours alone',
]

// Center glow messages (at star milestones)
const CENTER_MESSAGES = {
  500: '...something stirs at the center',
  750: '...it pulses. slowly.',
  900: '...it sees you',
  1000: null, // Leave unresolved forever
}

// ============================================================
// STATE TRACKING
// ============================================================

/**
 * Get revelation state from localStorage
 */
function getRevelationState() {
  const data = getData()
  return data.revelation || {
    layer2Shown: false,        // Has Layer 2 reveal been shown?
    layer2Type: null,          // 'firstFade' or 'realization'
    layer2Date: null,          // When Layer 2 was shown
    layer3Count: 0,            // How many Layer 3 hints shown
    layer3LastDate: null,      // When last Layer 3 was shown
    layer3Messages: [],        // Which Layer 3 messages have been shown
    centerMilestonesShown: [], // Which center milestones triggered
    firstVoidDate: null,       // First time entering The Void
    fadeExperienced: false,    // Has user experienced a star fading?
    visitDays: [],             // Array of unique visit dates (YYYY-MM-DD)
  }
}

/**
 * Save revelation state
 */
function saveRevelationState(state) {
  const data = getData()
  data.revelation = state
  saveData(data)
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Record a visit day for day counting
 */
function recordVisitDay() {
  const state = getRevelationState()
  const today = getTodayDate()

  if (!state.firstVoidDate) {
    state.firstVoidDate = today
  }

  if (!state.visitDays) {
    state.visitDays = []
  }

  if (!state.visitDays.includes(today)) {
    state.visitDays.push(today)
  }

  saveRevelationState(state)
  return state
}

/**
 * Get number of unique days the user has visited The Void
 */
function getVisitDayCount() {
  const state = getRevelationState()
  return state.visitDays?.length || 1
}

// ============================================================
// LAYER 2 REVEAL
// ============================================================

/**
 * Check if Layer 2 reveal should trigger
 * @param {Object} options
 * @param {boolean} options.hasFadingStars - Are there currently fading stars?
 * @param {boolean} options.isFirstFade - Is this the first time seeing fading stars?
 * @returns {Object|null} { message, type } or null
 */
export function checkLayer2Reveal({ hasFadingStars, isFirstFade }) {
  const state = getRevelationState()

  // Already shown Layer 2
  if (state.layer2Shown) return null

  // Record visit day
  recordVisitDay()
  const dayCount = getVisitDayCount()

  // Trigger 1: First star fading (most impactful moment)
  if (isFirstFade && hasFadingStars) {
    const messages = LAYER_2_MESSAGES.firstFade
    const message = messages[Math.floor(Math.random() * messages.length)]

    // Mark as shown
    state.layer2Shown = true
    state.layer2Type = 'firstFade'
    state.layer2Date = getTodayDate()
    state.fadeExperienced = true
    saveRevelationState(state)

    console.log(`[Revelation] Layer 2 triggered (firstFade): "${message}"`)
    return { message, type: 'layer2_firstFade' }
  }

  // Trigger 2: Extended play (day 3-5)
  if (dayCount >= 3 && dayCount <= 7) {
    // 30% chance per visit during this window
    if (Math.random() < 0.3) {
      const messages = LAYER_2_MESSAGES.realization
      const message = messages[Math.floor(Math.random() * messages.length)]

      state.layer2Shown = true
      state.layer2Type = 'realization'
      state.layer2Date = getTodayDate()
      saveRevelationState(state)

      console.log(`[Revelation] Layer 2 triggered (realization, day ${dayCount}): "${message}"`)
      return { message, type: 'layer2_realization' }
    }
  }

  // Track if user has seen fading (for future first-fade triggers)
  if (hasFadingStars && !state.fadeExperienced) {
    state.fadeExperienced = true
    saveRevelationState(state)
  }

  return null
}

/**
 * Mark that the user has experienced fading stars
 * Called when fading notification shows
 */
export function markFadeExperienced() {
  const state = getRevelationState()
  if (!state.fadeExperienced) {
    state.fadeExperienced = true
    saveRevelationState(state)
  }
}

/**
 * Check if this is the first time seeing fading stars
 */
export function isFirstFade() {
  const state = getRevelationState()
  return !state.fadeExperienced
}

// ============================================================
// LAYER 3 HINTS
// ============================================================

/**
 * Check if a Layer 3 hint should trigger
 * These are rare and mysterious
 * @returns {string|null} message or null
 */
export function checkLayer3Hint() {
  const state = getRevelationState()

  // Must have seen Layer 2 first
  if (!state.layer2Shown) return null

  // Minimum 2 days since Layer 2
  if (state.layer2Date) {
    const layer2Date = new Date(state.layer2Date)
    const today = new Date(getTodayDate())
    const daysSinceLayer2 = Math.floor((today - layer2Date) / (1000 * 60 * 60 * 24))
    if (daysSinceLayer2 < 2) return null
  }

  // Minimum 3 days between Layer 3 hints
  if (state.layer3LastDate) {
    const lastDate = new Date(state.layer3LastDate)
    const today = new Date(getTodayDate())
    const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
    if (daysSinceLast < 3) return null
  }

  // All Layer 3 messages shown? Reset pool
  const shownMessages = state.layer3Messages || []
  const availableMessages = LAYER_3_MESSAGES.filter(m => !shownMessages.includes(m))

  if (availableMessages.length === 0) {
    // All messages shown - don't repeat, they've seen them all
    return null
  }

  // 10% chance per visit (these should be rare)
  if (Math.random() > 0.1) return null

  // Pick a random unshown message
  const message = availableMessages[Math.floor(Math.random() * availableMessages.length)]

  // Update state
  state.layer3Count = (state.layer3Count || 0) + 1
  state.layer3LastDate = getTodayDate()
  if (!state.layer3Messages) state.layer3Messages = []
  state.layer3Messages.push(message)
  saveRevelationState(state)

  console.log(`[Revelation] Layer 3 hint (${state.layer3Count}): "${message}"`)
  return message
}

// ============================================================
// CENTER GLOW (The Deeper Mystery)
// ============================================================

/**
 * Check center glow milestone and return appropriate data
 * @param {number} masteredCount - Number of mastered stars
 * @returns {Object|null} { milestone, message, intensity } or null
 */
export function checkCenterGlow(masteredCount) {
  const state = getRevelationState()
  const shownMilestones = state.centerMilestonesShown || []

  // Determine current milestone level
  let currentMilestone = null
  let intensity = 0

  if (masteredCount >= 1000) {
    currentMilestone = 1000
    intensity = 1.0
  } else if (masteredCount >= 900) {
    currentMilestone = 900
    intensity = 0.8
  } else if (masteredCount >= 750) {
    currentMilestone = 750
    intensity = 0.6
  } else if (masteredCount >= 500) {
    currentMilestone = 500
    intensity = 0.4
  }

  if (!currentMilestone) return null

  // Check if this milestone message should trigger (one-time)
  const message = CENTER_MESSAGES[currentMilestone]
  const shouldShowMessage = message && !shownMilestones.includes(currentMilestone)

  if (shouldShowMessage) {
    // Mark milestone as shown
    if (!state.centerMilestonesShown) state.centerMilestonesShown = []
    state.centerMilestonesShown.push(currentMilestone)
    saveRevelationState(state)
    console.log(`[Revelation] Center milestone ${currentMilestone}: "${message}"`)
  }

  return {
    milestone: currentMilestone,
    message: shouldShowMessage ? message : null,
    intensity,
    // Visual properties based on milestone
    pulseRate: currentMilestone >= 900 ? 'fast' : currentMilestone >= 750 ? 'medium' : 'slow',
  }
}

/**
 * Get center glow state without triggering milestone messages
 * For continuous rendering
 * @param {number} masteredCount
 * @returns {Object|null}
 */
export function getCenterGlowState(masteredCount) {
  if (masteredCount < 500) return null

  let intensity = 0
  let pulseRate = 'slow'

  if (masteredCount >= 1000) {
    intensity = 1.0
    pulseRate = 'intense'
  } else if (masteredCount >= 900) {
    intensity = 0.8
    pulseRate = 'fast'
  } else if (masteredCount >= 750) {
    intensity = 0.6
    pulseRate = 'medium'
  } else if (masteredCount >= 500) {
    intensity = 0.4
    pulseRate = 'slow'
  }

  return { intensity, pulseRate }
}

// ============================================================
// DEBUG
// ============================================================

export function debugRevelation() {
  const state = getRevelationState()
  console.log('=== Revelation Debug ===')
  console.log('Layer 2 shown:', state.layer2Shown)
  console.log('Layer 2 type:', state.layer2Type)
  console.log('Layer 2 date:', state.layer2Date)
  console.log('Layer 3 count:', state.layer3Count)
  console.log('Layer 3 messages shown:', state.layer3Messages)
  console.log('Center milestones shown:', state.centerMilestonesShown)
  console.log('First Void date:', state.firstVoidDate)
  console.log('Visit days:', state.visitDays?.length || 0)
  console.log('Fade experienced:', state.fadeExperienced)
  return state
}

/**
 * Reset Layer 2 for testing
 */
export function resetLayer2() {
  const state = getRevelationState()
  state.layer2Shown = false
  state.layer2Type = null
  state.layer2Date = null
  saveRevelationState(state)
  console.log('[Revelation] Reset Layer 2')
}

/**
 * Reset all revelation state for testing
 */
export function resetRevelation() {
  saveRevelationState({
    layer2Shown: false,
    layer2Type: null,
    layer2Date: null,
    layer3Count: 0,
    layer3LastDate: null,
    layer3Messages: [],
    centerMilestonesShown: [],
    firstVoidDate: null,
    fadeExperienced: false,
    visitDays: [],
  })
  console.log('[Revelation] Reset all revelation state')
}
