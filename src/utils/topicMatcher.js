/**
 * Topic Matcher - finds Wikipedia Vital Articles mentions in text
 * Used for "rabbit hole" links that let users explore related topics
 */

import vitalArticles from '../data/vitalArticles.json'

// Build lookup structures once at module load
const topicSet = new Set()
const topicToCategory = new Map()
const normalizedToOriginal = new Map()

// Populate the lookup structures
Object.entries(vitalArticles).forEach(([category, topics]) => {
  topics.forEach(topic => {
    const normalized = normalizeTopic(topic)
    topicSet.add(normalized)
    topicToCategory.set(normalized, category)
    normalizedToOriginal.set(normalized, topic)
  })
})

/**
 * Normalize a topic name for matching
 * - Lowercase
 * - Remove common suffixes for plural handling
 */
function normalizeTopic(topic) {
  return topic.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a term from text for matching
 * Handles plurals and common variations
 */
function normalizeTermForMatching(term) {
  let normalized = term.toLowerCase().trim()

  // Handle common plural patterns
  if (normalized.endsWith('ies') && normalized.length > 4) {
    // e.g., "economies" -> "economy"
    const singular = normalized.slice(0, -3) + 'y'
    if (topicSet.has(singular)) return singular
  }
  if (normalized.endsWith('es') && normalized.length > 3) {
    // e.g., "gases" -> "gas", "churches" -> "church"
    const singular = normalized.slice(0, -2)
    if (topicSet.has(singular)) return singular
    // Also try just removing 's' for words like "houses"
    const singular2 = normalized.slice(0, -1)
    if (topicSet.has(singular2)) return singular2
  }
  if (normalized.endsWith('s') && normalized.length > 2) {
    // e.g., "aztecs" -> "aztec"
    const singular = normalized.slice(0, -1)
    if (topicSet.has(singular)) return singular
  }

  return normalized
}

/**
 * Check if a term matches a vital article
 * @param {string} term - The term to check
 * @returns {Object|null} - { original, category } if match, null otherwise
 */
export function matchTopic(term) {
  const normalized = normalizeTermForMatching(term)

  if (topicSet.has(normalized)) {
    return {
      original: normalizedToOriginal.get(normalized),
      category: topicToCategory.get(normalized)
    }
  }

  return null
}

/**
 * Find all topic matches in a piece of text
 * @param {string} text - The text to scan
 * @param {string} currentTopic - The current topic being viewed (to exclude)
 * @param {number} maxMatches - Maximum matches to return (default 10)
 * @returns {Array} - Array of { term, original, category, index }
 */
export function findTopicMatches(text, currentTopic = '', maxMatches = 10) {
  if (!text) return []

  const matches = []
  const foundTopics = new Set() // Avoid duplicate matches
  const currentNormalized = normalizeTopic(currentTopic)

  // First priority: Check bolded terms (most likely to be important)
  const boldPattern = /\*\*([^*]+)\*\*/g
  let match
  while ((match = boldPattern.exec(text)) !== null) {
    const term = match[1]
    const result = matchTopic(term)
    if (result && normalizeTermForMatching(term) !== currentNormalized && !foundTopics.has(result.original)) {
      foundTopics.add(result.original)
      matches.push({
        term,
        original: result.original,
        category: result.category
      })
    }
  }

  // Second priority: Multi-word phrases (2-4 words) that might be topics
  // This catches things like "Roman Empire", "World War II", etc.
  const words = text.replace(/\*\*/g, '').split(/\s+/)
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ')
        .replace(/[.,;:!?()[\]{}'"]/g, '') // Remove punctuation

      if (phrase.length < 4) continue // Skip very short phrases

      const result = matchTopic(phrase)
      if (result && normalizeTermForMatching(phrase) !== currentNormalized && !foundTopics.has(result.original)) {
        foundTopics.add(result.original)
        matches.push({
          term: phrase,
          original: result.original,
          category: result.category
        })
      }
    }
  }

  // Limit matches to avoid overwhelming the UI
  return matches.slice(0, maxMatches)
}

/**
 * Get all topics in a category
 * @param {string} category - The category name
 * @returns {Array} - Array of topic names
 */
export function getTopicsInCategory(category) {
  return vitalArticles[category] || []
}

/**
 * Get all category names
 * @returns {Array} - Array of category names
 */
export function getAllCategories() {
  return Object.keys(vitalArticles)
}
