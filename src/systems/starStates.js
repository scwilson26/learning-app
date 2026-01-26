/**
 * REMEMBERER - Star State System
 *
 * Calculates the visual state of each star based on user progress and SRS data.
 * States determine star brightness, size, and animations in The Void.
 *
 * States (in priority order):
 * - fading: Has overdue flashcards (>7 days past due)
 * - mastered: All 4 core fragments + >80% retention + no critical overdue
 * - studied: Has flashcards in SRS (learned/mastered state)
 * - learning: Has captured 1+ fragments
 * - discovered: Topic has been opened/visited
 * - undiscovered: Never interacted with
 */

import { getData } from '../services/storage'

// ============================================================
// CONSTANTS
// ============================================================

export const STAR_STATES = {
  undiscovered: 'undiscovered',
  discovered: 'discovered',
  learning: 'learning',
  studied: 'studied',
  mastered: 'mastered',
  fading: 'fading',
}

// Thresholds
const MASTERY_RETENTION_THRESHOLD = 0.8  // 80% retention required
const CRITICAL_OVERDUE_DAYS = 7          // Days past due to trigger "fading"
const CORE_FRAGMENTS_REQUIRED = 4        // Must have all core fragments for mastery

// ============================================================
// HELPERS: Flashcard Queries
// ============================================================

/**
 * Get all flashcards for a specific topic
 * Follows: flashcard.sourceCardId → cards[sourceCardId].deckId === topicId
 *
 * @param {string} topicId - The topic ID
 * @returns {Array} Array of flashcard objects for this topic
 */
export function getFlashcardsForTopic(topicId) {
  const data = getData()
  const flashcards = data.flashcards || {}
  const cards = data.cards || {}

  return Object.values(flashcards).filter(fc => {
    if (fc.status === 'skipped') return false

    const sourceCardId = fc.sourceCardId || ''
    const cardData = cards[sourceCardId]

    // Check if the source card belongs to this topic
    if (cardData?.deckId === topicId) return true

    // Fallback: check if sourceCardId starts with topicId
    // (handles cards like "ancient_egypt-core-1")
    return sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
  })
}

/**
 * Get flashcards that are in the SRS system (learned or mastered)
 *
 * @param {string} topicId - The topic ID
 * @returns {Array} Flashcards in SRS for this topic
 */
export function getSRSFlashcardsForTopic(topicId) {
  return getFlashcardsForTopic(topicId).filter(fc =>
    fc.studyState === 'learned' || fc.studyState === 'mastered'
  )
}

// ============================================================
// HELPERS: Retention & Overdue Calculations
// ============================================================

/**
 * Calculate days overdue for a flashcard
 * @param {Object} flashcard - The flashcard object
 * @returns {number} Days overdue (negative if not yet due)
 */
function getDaysOverdue(flashcard) {
  if (!flashcard.nextReviewDate) return 0

  const now = Date.now()
  const dueDate = flashcard.nextReviewDate
  const diffMs = now - dueDate

  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if a topic has critically overdue cards (>7 days past due)
 *
 * @param {string} topicId - The topic ID
 * @returns {boolean} True if any flashcard is critically overdue
 */
export function hasOverdueCards(topicId) {
  const srsCards = getSRSFlashcardsForTopic(topicId)

  return srsCards.some(fc => getDaysOverdue(fc) > CRITICAL_OVERDUE_DAYS)
}

/**
 * Check if a topic has ANY overdue cards (for softer fading detection)
 *
 * @param {string} topicId - The topic ID
 * @returns {boolean} True if any flashcard is overdue
 */
export function hasAnyOverdueCards(topicId) {
  const srsCards = getSRSFlashcardsForTopic(topicId)

  return srsCards.some(fc => getDaysOverdue(fc) > 0)
}

/**
 * Calculate retention score for a topic (0-1)
 * Based on: cards on-time or mastered vs total cards in SRS
 *
 * @param {string} topicId - The topic ID
 * @returns {number} Retention score between 0 and 1
 */
export function getRetentionScore(topicId) {
  const srsCards = getSRSFlashcardsForTopic(topicId)

  if (srsCards.length === 0) return 0

  // Count cards that are "healthy" (not overdue or mastered)
  const healthyCards = srsCards.filter(fc => {
    // Mastered cards are always healthy
    if (fc.studyState === 'mastered') return true

    // Cards not yet due are healthy
    const daysOverdue = getDaysOverdue(fc)
    return daysOverdue <= 0
  })

  return healthyCards.length / srsCards.length
}

/**
 * Get detailed retention stats for a topic
 *
 * @param {string} topicId - The topic ID
 * @returns {Object} { total, healthy, overdue, mastered, retention }
 */
export function getRetentionStats(topicId) {
  const srsCards = getSRSFlashcardsForTopic(topicId)

  let healthy = 0
  let overdue = 0
  let mastered = 0

  srsCards.forEach(fc => {
    if (fc.studyState === 'mastered') {
      mastered++
      healthy++
    } else {
      const daysOverdue = getDaysOverdue(fc)
      if (daysOverdue <= 0) {
        healthy++
      } else {
        overdue++
      }
    }
  })

  return {
    total: srsCards.length,
    healthy,
    overdue,
    mastered,
    retention: srsCards.length > 0 ? healthy / srsCards.length : 0
  }
}

// ============================================================
// MAIN: Topic State Calculation
// ============================================================

/**
 * Get the current state of a topic/star
 *
 * Priority order (highest to lowest):
 * 1. fading - Has critically overdue flashcards
 * 2. mastered - All core fragments + >80% retention + no critical overdue
 * 3. studied - Has flashcards in SRS
 * 4. learning - Has captured 1+ fragments
 * 5. discovered - Topic has been opened
 * 6. undiscovered - Never interacted with
 *
 * @param {string} topicId - The topic ID
 * @returns {string} One of the STAR_STATES values
 */
export function getTopicState(topicId) {
  const data = getData()
  const voidProgress = data.voidProgress || {}
  const topicProgress = voidProgress.topicProgress?.[topicId]

  // Get flashcard data
  const srsCards = getSRSFlashcardsForTopic(topicId)
  const hasSRSCards = srsCards.length > 0

  // Check for fading (critically overdue) - highest priority
  if (hasSRSCards && hasOverdueCards(topicId)) {
    return STAR_STATES.fading
  }

  // Check for mastery
  if (hasSRSCards) {
    const capturedCount = topicProgress?.capturedCards?.length || 0
    const retention = getRetentionScore(topicId)

    // Mastery requires: all core fragments + high retention + no critical overdue
    if (capturedCount >= CORE_FRAGMENTS_REQUIRED && retention >= MASTERY_RETENTION_THRESHOLD) {
      return STAR_STATES.mastered
    }
  }

  // Check for studied (has flashcards in SRS)
  if (hasSRSCards) {
    return STAR_STATES.studied
  }

  // Check for learning (has captured fragments)
  const capturedCount = topicProgress?.capturedCards?.length || 0
  if (capturedCount > 0) {
    return STAR_STATES.learning
  }

  // Check for discovered (topic has been opened/visited)
  // Currently using exploredTopics array or firstVisited in topicProgress
  const isExplored = voidProgress.exploredTopics?.includes(topicId)
  const hasVisited = topicProgress?.firstVisited != null
  if (isExplored || hasVisited) {
    return STAR_STATES.discovered
  }

  // Default: undiscovered
  return STAR_STATES.undiscovered
}

/**
 * Get states for multiple topics at once (batch operation)
 * More efficient than calling getTopicState() in a loop
 *
 * @param {string[]} topicIds - Array of topic IDs
 * @returns {Object} { [topicId]: state }
 */
export function getTopicStates(topicIds) {
  const states = {}

  topicIds.forEach(id => {
    states[id] = getTopicState(id)
  })

  return states
}

/**
 * Get all topics in a specific state
 *
 * @param {string[]} topicIds - Array of topic IDs to check
 * @param {string} state - The state to filter by
 * @returns {string[]} Topic IDs in that state
 */
export function getTopicsInState(topicIds, state) {
  return topicIds.filter(id => getTopicState(id) === state)
}

// ============================================================
// STATS: Aggregated Information
// ============================================================

/**
 * Get summary stats across all provided topics
 *
 * @param {string[]} topicIds - Array of topic IDs
 * @returns {Object} { undiscovered, discovered, learning, studied, mastered, fading }
 */
export function getStatesSummary(topicIds) {
  const summary = {
    undiscovered: 0,
    discovered: 0,
    learning: 0,
    studied: 0,
    mastered: 0,
    fading: 0,
  }

  topicIds.forEach(id => {
    const state = getTopicState(id)
    summary[state]++
  })

  return summary
}

// ============================================================
// DEBUG: Console Testing Utility
// ============================================================

/**
 * Debug function to test star states in browser console
 * Usage: import { debugStarStates } from './systems/starStates'; debugStarStates()
 */
export function debugStarStates() {
  const data = getData()
  const voidProgress = data.voidProgress || {}
  const unlockedTopics = voidProgress.unlockedTopics || []

  console.log('=== Star States Debug ===')
  console.log(`Unlocked topics: ${unlockedTopics.length}`)

  if (unlockedTopics.length === 0) {
    console.log('No unlocked topics yet.')
    return
  }

  // Show state for each unlocked topic
  const states = {}
  unlockedTopics.forEach(topicId => {
    const state = getTopicState(topicId)
    const flashcards = getFlashcardsForTopic(topicId)
    const srsCards = getSRSFlashcardsForTopic(topicId)
    const retention = getRetentionScore(topicId)
    const captured = voidProgress.topicProgress?.[topicId]?.capturedCards?.length || 0

    states[topicId] = {
      state,
      captured,
      flashcards: flashcards.length,
      inSRS: srsCards.length,
      retention: Math.round(retention * 100) + '%'
    }
  })

  console.table(states)

  // Summary
  const summary = getStatesSummary(unlockedTopics)
  console.log('Summary:', summary)

  return states
}
