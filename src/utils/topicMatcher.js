/**
 * Topic Matcher - finds Wikipedia Vital Articles mentions in text
 * Used for "rabbit hole" links that let users explore related topics
 */

import vitalArticles from '../data/vitalArticles.json'

// Build lookup structures once at module load
const topicSet = new Set()
const topicToCategory = new Map()
const normalizedToOriginal = new Map()

// Prefix index: maps partial names to full topics
// e.g., "snow white" → { original: "Snow White and the Seven Dwarfs (1937 film)", category: "arts" }
const prefixToTopic = new Map()

// Populate the lookup structures
Object.entries(vitalArticles).forEach(([category, topics]) => {
  topics.forEach(topic => {
    const normalized = normalizeTopic(topic)
    topicSet.add(normalized)
    topicToCategory.set(normalized, category)
    normalizedToOriginal.set(normalized, topic)

    // Build prefix index for multi-word topics
    // Extract meaningful prefixes from topics like "Snow White and the Seven Dwarfs (1937 film)"
    const prefixes = extractPrefixes(topic)
    prefixes.forEach(prefix => {
      const normalizedPrefix = prefix.toLowerCase().trim()
      // Only add if prefix is different from full title and not already mapped
      if (normalizedPrefix !== normalized && !prefixToTopic.has(normalizedPrefix)) {
        prefixToTopic.set(normalizedPrefix, { original: topic, category })
      }
    })
  })
})

/**
 * Extract meaningful prefixes from a topic title
 * "Snow White and the Seven Dwarfs (1937 film)" → ["Snow White"]
 * "World War II" → [] (no prefix, it's short enough)
 */
function extractPrefixes(topic) {
  const prefixes = []

  // Remove parenthetical suffixes first: "Something (year)" → "Something"
  const withoutParens = topic.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (withoutParens !== topic && withoutParens.length >= 6) {
    prefixes.push(withoutParens)
  }

  // Split on " and " for titles like "Snow White and the Seven Dwarfs"
  const andParts = withoutParens.split(/\s+and\s+/i)
  if (andParts.length > 1 && andParts[0].length >= 6) {
    prefixes.push(andParts[0])
  }

  // Split on ": " for titles like "Star Wars: A New Hope"
  const colonParts = withoutParens.split(/:\s*/)
  if (colonParts.length > 1 && colonParts[0].length >= 4) {
    prefixes.push(colonParts[0])
  }

  return prefixes
}

console.log(`[topicMatcher] Built indexes: ${topicSet.size} topics, ${prefixToTopic.size} prefix mappings`)

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
    const singular = normalized.slice(0, -3) + 'y'
    if (topicSet.has(singular)) return singular
  }
  if (normalized.endsWith('es') && normalized.length > 3) {
    const singular = normalized.slice(0, -2)
    if (topicSet.has(singular)) return singular
    const singular2 = normalized.slice(0, -1)
    if (topicSet.has(singular2)) return singular2
  }
  if (normalized.endsWith('s') && normalized.length > 2) {
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

  // Exact match (highest priority)
  if (topicSet.has(normalized)) {
    return {
      original: normalizedToOriginal.get(normalized),
      category: topicToCategory.get(normalized)
    }
  }

  // Prefix match: "Snow White" → "Snow White and the Seven Dwarfs (1937 film)"
  if (prefixToTopic.has(normalized)) {
    return prefixToTopic.get(normalized)
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
