/**
 * Topic Matcher - finds constellation topic mentions in text
 * Used for "rabbit hole" links that let users explore related topics
 */

import constellationData from '../data/constellation.json'

// Build lookup structures once at module load
const topicSet = new Set()
const topicToCluster = new Map()
const normalizedToOriginal = new Map()
const normalizedToId = new Map()

// Prefix index: maps partial names to full topics
const prefixToTopic = new Map()

// Populate the lookup structures from constellation data
Object.entries(constellationData.topics).forEach(([topicId, topic]) => {
  const normalized = normalizeTopic(topic.name)
  topicSet.add(normalized)
  topicToCluster.set(normalized, topic.cluster)
  normalizedToOriginal.set(normalized, topic.name)
  normalizedToId.set(normalized, topicId)

  // Build prefix index for multi-word topics
  const prefixes = extractPrefixes(topic.name)
  prefixes.forEach(prefix => {
    const normalizedPrefix = prefix.toLowerCase().trim()
    if (normalizedPrefix !== normalized && !prefixToTopic.has(normalizedPrefix)) {
      prefixToTopic.set(normalizedPrefix, {
        original: topic.name,
        cluster: topic.cluster,
        topicId
      })
    }
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
 * Check if a term matches a constellation topic
 * @param {string} term - The term to check
 * @returns {Object|null} - { original, cluster, topicId } if match, null otherwise
 */
export function matchTopic(term) {
  const normalized = normalizeTermForMatching(term)

  // Exact match (highest priority)
  if (topicSet.has(normalized)) {
    return {
      original: normalizedToOriginal.get(normalized),
      cluster: topicToCluster.get(normalized),
      topicId: normalizedToId.get(normalized)
    }
  }

  // Prefix match: "Snow White" → "Snow White and the Seven Dwarfs"
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
 * @returns {Array} - Array of { term, original, cluster, topicId }
 */
export function findTopicMatches(text, currentTopic = '', maxMatches = 10) {
  if (!text) return []

  const matches = []
  const foundTopics = new Set()
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
        cluster: result.cluster,
        topicId: result.topicId
      })
    }
  }

  // Second priority: Multi-word phrases (2-4 words) that might be topics
  const words = text.replace(/\*\*/g, '').split(/\s+/)
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ')
        .replace(/[.,;:!?()[\]{}'"]/g, '')

      if (phrase.length < 4) continue

      const result = matchTopic(phrase)
      if (result && normalizeTermForMatching(phrase) !== currentNormalized && !foundTopics.has(result.original)) {
        foundTopics.add(result.original)
        matches.push({
          term: phrase,
          original: result.original,
          cluster: result.cluster,
          topicId: result.topicId
        })
      }
    }
  }

  return matches.slice(0, maxMatches)
}

/**
 * Get all topics in a cluster
 * @param {string} cluster - The cluster name
 * @returns {Array} - Array of { topicId, name, ... }
 */
export function getTopicsInCluster(cluster) {
  return Object.entries(constellationData.topics)
    .filter(([_, topic]) => topic.cluster === cluster)
    .map(([id, topic]) => ({ topicId: id, ...topic }))
}

/**
 * Get all cluster names
 * @returns {Array} - Array of cluster names
 */
export function getAllClusters() {
  return Object.keys(constellationData.clusters)
}

// Backwards compatibility aliases
export const getTopicsInCategory = getTopicsInCluster
export const getAllCategories = getAllClusters
