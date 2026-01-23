/**
 * Storage service for persisting user data (cards, decks, claims)
 * Structured for future cloud sync - all data in one clean object
 */

import vitalArticlesTree from '../data/vitalArticlesTree.json'
import Fuse from 'fuse.js'

const STORAGE_KEY = 'learning_app_data'

// ============================================================================
// VITAL ARTICLES TREE NAVIGATION
// ============================================================================

// Build a flat index of all nodes for O(1) lookup instead of O(n) tree traversal
const nodeIndex = new Map()

function buildNodeIndex(node) {
  nodeIndex.set(node.id, node)
  if (node.children) {
    for (const child of node.children) {
      buildNodeIndex(child)
    }
  }
}

// Build index on module load
buildNodeIndex(vitalArticlesTree)
console.log(`[storage] Built node index with ${nodeIndex.size} entries`)

// ============================================================================
// SEARCH INDEX (Fuse.js for fuzzy search)
// ============================================================================

// Build a flat searchable array with path information
const searchIndex = []

function buildSearchIndex(node, path = []) {
  // Skip the root node itself, and implementation detail nodes
  if (node.id !== 'root' && !node.isImplementationDetail) {
    searchIndex.push({
      id: node.id,
      title: node.title,
      path: path.map(p => p.title),
      pathIds: path.map(p => p.id),
      isLeaf: !node.children || node.children.length === 0
    })
  }

  // Recursively index children
  if (node.children) {
    for (const child of node.children) {
      // For implementation detail nodes, don't add them to path
      if (child.isImplementationDetail) {
        // Pass through the current path (skip the impl detail)
        if (child.children) {
          for (const grandchild of child.children) {
            buildSearchIndex(grandchild, [...path, node.id !== 'root' ? node : null].filter(Boolean))
          }
        }
      } else {
        buildSearchIndex(child, [...path, node.id !== 'root' ? node : null].filter(Boolean))
      }
    }
  }
}

// Build search index on module load
buildSearchIndex(vitalArticlesTree)
console.log(`[storage] Built search index with ${searchIndex.length} searchable topics`)

// Create Fuse instance for fuzzy searching
const fuse = new Fuse(searchIndex, {
  keys: ['title'],
  threshold: 0.3, // Lower = stricter matching (0.3 allows some typos)
  includeScore: true,
  minMatchCharLength: 2
})

/**
 * Search topics using fuzzy matching
 * @param {string} query - Search query
 * @param {number} limit - Max results to return (default 10)
 * @returns {Array} Array of search results with { id, title, path, pathIds, score }
 */
export function searchTopics(query, limit = 10) {
  if (!query || query.length < 2) return []

  const results = fuse.search(query, { limit })
  return results.map(r => ({
    ...r.item,
    score: r.score
  }))
}

/**
 * Get the total number of searchable topics
 * @returns {number}
 */
export function getSearchableTopicCount() {
  return searchIndex.length
}

// ============================================================================
// CARD ID SYSTEM
// Format: [CODE]-[TIER]-[YYMMDD]-[SEQ]
// Example: ANC-1-250116-0042
// ============================================================================

// Root category codes (12)
const ROOT_CATEGORY_CODES = {
  'arts': 'ART',
  'biology': 'BIO',
  'health': 'HLT',
  'everyday': 'EVD',
  'geography': 'GEO',
  'history': 'HIS',
  'mathematics': 'MAT',
  'people': 'PPL',
  'philosophy': 'PHI',
  'physics': 'PHY',
  'society': 'SOC',
  'technology': 'TEC',
}

// Subcategory codes (82)
const SUBCATEGORY_CODES = {
  // Arts (8)
  'architecture': 'ARC',
  'literature': 'LIT',
  'music': 'MUS',
  'visual-arts': 'VIS',
  'film-tv': 'FLM',
  'performing-arts': 'PRF',
  'photography': 'PHO',
  'fashion-design': 'FAS',

  // Biology (6)
  'animals': 'ANM',
  'plants': 'PLT',
  'ecology': 'ECO',
  'genetics': 'GEN',
  'microbes': 'MIC',
  'marine-life': 'MAR',

  // Health (5)
  'human-body': 'BOD',
  'medicine': 'MED',
  'nutrition': 'NUT',
  'mental-health': 'MNT',
  'fitness': 'FIT',

  // Everyday (7)
  'food-drink': 'FOD',
  'sports-games': 'SPT',
  'hobbies': 'HOB',
  'holidays': 'HOL',
  'fashion-clothing': 'CLO',
  'home-living': 'HOM',
  'travel-transport': 'TRV',

  // Geography (8)
  'countries': 'CTY',
  'cities': 'CIT',
  'mountains-volcanoes': 'MTN',
  'rivers-lakes': 'RIV',
  'oceans-seas': 'OCN',
  'islands': 'ISL',
  'deserts-forests': 'DST',
  'landmarks-wonders': 'LMK',

  // History (8 + 7 ancient children = 15)
  'ancient': 'ANC',
  'medieval': 'MDV',
  'renaissance': 'REN',
  'modern': 'MOD',
  'world-wars': 'WAR',
  'empires': 'EMP',
  'revolutions': 'REV',
  'exploration': 'EXP',
  'egypt': 'EGY',
  'rome': 'ROM',
  'greece': 'GRC',
  'persia': 'PRS',
  'china-ancient': 'CHN',
  'mesopotamia': 'MSP',
  'maya': 'MAY',

  // Mathematics (6)
  'numbers-arithmetic': 'NUM',
  'algebra': 'ALG',
  'geometry': 'GMY',
  'statistics-probability': 'STA',
  'famous-problems': 'PRB',
  'mathematicians': 'MTH',

  // People (8)
  'leaders-politicians': 'LDR',
  'scientists-inventors': 'SCI',
  'artists-writers': 'AWT',
  'musicians-performers': 'MSC',
  'explorers-adventurers': 'ADV',
  'philosophers-thinkers': 'THK',
  'athletes': 'ATH',
  'villains-outlaws': 'VLN',

  // Philosophy (7)
  'world-religions': 'REL',
  'mythology': 'MYT',
  'ethics-morality': 'ETH',
  'logic-reasoning': 'LOG',
  'eastern-philosophy': 'EST',
  'western-philosophy': 'WST',
  'spirituality-mysticism': 'SPR',

  // Physical Sciences (6)
  'physics': 'PHS',
  'chemistry': 'CHM',
  'astronomy-space': 'AST',
  'earth-science': 'ERT',
  'energy-forces': 'NRG',
  'elements-materials': 'ELM',

  // Society (8)
  'politics-government': 'POL',
  'economics-money': 'ECN',
  'law-justice': 'LAW',
  'education': 'EDU',
  'media-communication': 'MDA',
  'social-movements': 'MVT',
  'war-military': 'MIL',
  'culture-customs': 'CUL',

  // Technology (8)
  'computers-internet': 'CMP',
  'engineering': 'ENG',
  'inventions': 'INV',
  'transportation': 'TRN',
  'weapons-defense': 'WPN',
  'communication-tech': 'COM',
  'energy-power': 'PWR',
  'future-tech-ai': 'AIR',
}

// Tier number mapping
const TIER_NUMBERS = {
  'preview': '0',
  'core': '1',
  'deep_dive_1': '2',
  'deep_dive_2': '3',
}

/**
 * Get the 3-letter code for a deck ID
 * @param {string} deckId - The deck ID (e.g., 'ancient', 'history', 'egypt')
 * @returns {string} The 3-letter code (e.g., 'ANC', 'HIS', 'EGY')
 */
function getDeckCode(deckId) {
  // Check root categories first
  if (ROOT_CATEGORY_CODES[deckId]) {
    return ROOT_CATEGORY_CODES[deckId]
  }
  // Check subcategories
  if (SUBCATEGORY_CODES[deckId]) {
    return SUBCATEGORY_CODES[deckId]
  }
  // For dynamic/deep decks, generate a code from the ID
  // Take first 3 consonants or first 3 chars
  const cleaned = deckId.replace(/-/g, '').toUpperCase()
  const consonants = cleaned.replace(/[AEIOU]/g, '')
  if (consonants.length >= 3) {
    return consonants.substring(0, 3)
  }
  return cleaned.substring(0, 3).padEnd(3, 'X')
}

/**
 * Get current date as YYMMDD string
 * @returns {string} Date string like '250116'
 */
function getDateCode() {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

/**
 * Get and increment the sequence counter for a given deck+tier+date combination
 * @param {string} deckCode - The 3-letter deck code
 * @param {string} tier - The tier ('core', 'deep_dive_1', 'deep_dive_2')
 * @param {string} dateCode - The date code (YYMMDD)
 * @returns {string} The 4-digit sequence number (e.g., '0042')
 */
function getNextSequenceNumber(deckCode, tier, dateCode) {
  const data = getData()

  // Initialize sequence counters if needed
  if (!data.cardSequences) {
    data.cardSequences = {}
  }

  // Key format: CODE-TIER-DATE
  const tierNum = TIER_NUMBERS[tier] || '1'
  const key = `${deckCode}-${tierNum}-${dateCode}`

  // Get current counter and increment
  const current = data.cardSequences[key] || 0
  const next = current + 1
  data.cardSequences[key] = next

  saveData(data)

  return String(next).padStart(4, '0')
}

/**
 * Generate a unique card ID
 * Format: [CODE]-[TIER]-[YYMMDD]-[SEQ]
 * Example: ANC-1-250116-0042
 *
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier ('core', 'deep_dive_1', 'deep_dive_2')
 * @returns {string} The unique card ID
 */
export function generateCardId(deckId, tier = 'core') {
  const deckCode = getDeckCode(deckId)
  const tierNum = TIER_NUMBERS[tier] || '1'
  const dateCode = getDateCode()
  const seqNum = getNextSequenceNumber(deckCode, tier, dateCode)

  return `${deckCode}-${tierNum}-${dateCode}-${seqNum}`
}

/**
 * Find a node in the vital articles tree by ID (O(1) lookup)
 * @param {Object} _node - Unused, kept for API compatibility
 * @param {string} targetId - The ID to find
 * @returns {Object|null} The found node or null
 */
function findNodeById(_node, targetId) {
  return nodeIndex.get(targetId) || null
}

/**
 * Get children of a deck from the vital articles tree
 * Skips implementation detail nodes (alphabetical splits)
 * @param {string} deckId - The deck ID to get children for
 * @returns {Array|null} Array of child objects, null if not found, empty if leaf
 */
export function getTreeChildren(deckId) {
  const node = findNodeById(vitalArticlesTree, deckId)

  if (!node) {
    return null
  }

  if (!node.children || node.children.length === 0) {
    return []
  }

  // Flatten out implementation details - show their children directly
  const children = []
  for (const child of node.children) {
    if (child.isImplementationDetail && child.children) {
      // Skip this level, add its children instead
      children.push(...child.children)
    } else {
      children.push(child)
    }
  }

  return children.map(child => ({
    id: child.id,  // Use actual tree ID, NOT slugified
    name: child.title,
    title: child.title,
    isLeaf: child.isLeaf || false,
    wikiTitle: child.wikiTitle || null,
    articleCount: child.articleCount || 0,
  }))
}

/**
 * Check if a deck exists in the vital articles tree
 * @param {string} deckId - The deck ID to check
 * @returns {boolean} True if deck exists in tree
 */
export function isTreeDeck(deckId) {
  return findNodeById(vitalArticlesTree, deckId) !== null
}

/**
 * Count all descendant nodes under a given node
 * @param {string} nodeId - The node ID to count descendants for
 * @returns {number} Total count of all descendants
 */
export function countDescendants(nodeId) {
  const node = findNodeById(vitalArticlesTree, nodeId)
  if (!node) return 0

  let count = 0
  const countRecursive = (n) => {
    if (!n.children || n.children.length === 0) {
      return 1 // Leaf node counts as 1
    }
    let total = 0
    for (const child of n.children) {
      if (!child.isImplementationDetail) {
        total += 1 // Count this child
      }
      total += countRecursive(child)
    }
    return total
  }

  // Don't count the node itself, just its descendants
  if (node.children) {
    for (const child of node.children) {
      if (!child.isImplementationDetail) {
        count += 1
      }
      count += countRecursive(child)
    }
  }

  return count
}

/**
 * Count claimed descendants under a given node
 * @param {string} nodeId - The node ID to count claimed descendants for
 * @returns {number} Count of claimed descendants
 */
export function countClaimedDescendants(nodeId) {
  const node = findNodeById(vitalArticlesTree, nodeId)
  if (!node) return 0

  const data = getData()
  let count = 0

  const countRecursive = (n) => {
    // Check if this node is claimed
    if (data.cards[n.id]?.claimed) {
      count++
    }

    // Recurse into children
    if (n.children) {
      for (const child of n.children) {
        countRecursive(child)
      }
    }
  }

  // Count descendants (not the node itself)
  if (node.children) {
    for (const child of node.children) {
      countRecursive(child)
    }
  }

  return count
}

// Category gradients for tree nodes (matches CATEGORIES in Canvas.jsx)
const CATEGORY_STYLES = {
  arts: { gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300' },
  biology: { gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300' },
  everyday: { gradient: 'from-orange-500 to-amber-600', borderColor: 'border-orange-300' },
  geography: { gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300' },
  history: { gradient: 'from-amber-600 to-yellow-700', borderColor: 'border-amber-300' },
  mathematics: { gradient: 'from-violet-500 to-purple-600', borderColor: 'border-violet-300' },
  people: { gradient: 'from-rose-500 to-pink-600', borderColor: 'border-rose-300' },
  philosophy: { gradient: 'from-indigo-500 to-blue-600', borderColor: 'border-indigo-300' },
  physics: { gradient: 'from-blue-500 to-indigo-600', borderColor: 'border-blue-300' },
  society: { gradient: 'from-slate-500 to-gray-600', borderColor: 'border-slate-300' },
  technology: { gradient: 'from-gray-600 to-slate-700', borderColor: 'border-gray-300' },
}

/**
 * Get a node from the vital articles tree by ID
 * @param {string} deckId - The deck ID to get
 * @returns {Object|null} The node with deck-like properties, or null
 */
export function getTreeNode(deckId) {
  const node = findNodeById(vitalArticlesTree, deckId)
  if (!node) return null

  // Extract category from ID (e.g., "people-people-a-c-writers" -> "people")
  const categoryId = deckId.split('-')[0]
  const categoryStyle = CATEGORY_STYLES[categoryId] || { gradient: 'from-gray-500 to-gray-700', borderColor: 'border-gray-300' }

  // Compute level based on ID depth (rough estimate based on dashes)
  // This is approximate - tree nodes don't have explicit depth
  const dashCount = (deckId.match(/-/g) || []).length
  const level = Math.min(dashCount + 1, 5) // Cap at level 5

  return {
    id: node.id,
    name: node.title,
    title: node.title,
    isLeaf: node.isLeaf || false,
    wikiTitle: node.wikiTitle || null,
    articleCount: node.articleCount || 0,
    source: 'vital-tree',
    gradient: categoryStyle.gradient,
    borderColor: categoryStyle.borderColor,
    level: level,
  }
}

/**
 * Get all top-level categories from the vital articles tree
 * @returns {Array} Array of category objects
 */

/**
 * Score a topic for "interestingness" based on heuristics
 * Used by Wander to prefer more engaging topics
 * @param {Object} node - Tree node with id, title, etc.
 * @returns {number} Interest score (higher = more interesting)
 */
function scoreTopicInterestForWander(node) {
  let score = 0
  const id = node.id?.toLowerCase() || ''
  const title = node.title?.toLowerCase() || ''

  // Category bonuses (from the tree id prefix)
  if (id.startsWith('people-')) score += 3           // People are inherently interesting
  if (id.startsWith('history-')) score += 2          // Historical events/eras
  if (id.startsWith('arts-')) score += 1             // Arts & culture
  if (id.startsWith('technology-')) score += 1      // Tech topics
  if (id.startsWith('biology-')) score += 1          // Life sciences

  // Title-based bonuses
  if (title.includes('war') || title.includes('battle')) score += 2
  if (title.includes('revolution')) score += 2
  if (title.includes('discovery')) score += 2
  if (title.includes('invention')) score += 2
  if (title.includes('ancient') || title.includes('medieval')) score += 1

  // Penalties for boring/administrative topics
  if (title.startsWith('list of')) score -= 5
  if (title.startsWith('index of')) score -= 5
  if (title.startsWith('outline of')) score -= 3
  if (title.includes('by country')) score -= 2
  if (title.includes('by year')) score -= 2
  if (title.includes('demographics')) score -= 2
  if (title.includes('administrative')) score -= 2

  // Bonus for being a Wikipedia vital article (has wikiTitle)
  if (node.wikiTitle) score += 1

  return score
}

/**
 * Generate a single random path through the tree (internal helper)
 */
function generateSingleRandomPath(minDepth, maxDepth) {
  const path = []
  const steps = []

  const categories = vitalArticlesTree.children
  if (!categories || categories.length === 0) return null

  let currentNode = categories[Math.floor(Math.random() * categories.length)]
  path.push(currentNode.id)
  steps.push({
    id: currentNode.id,
    name: currentNode.title,
  })

  const targetDepth = minDepth + Math.floor(Math.random() * (maxDepth - minDepth + 1))
  let depth = 1

  // An article node MUST have wikiTitle - that's the definitive marker
  // Nodes without wikiTitle are category/container nodes, even if they have no children loaded
  const isArticleNode = (node) => {
    return !!node.wikiTitle
  }

  // A category node is one that has children and no wikiTitle
  const isCategoryNode = (node) => {
    if (node.wikiTitle) return false // Articles are not categories
    if (node.children && node.children.length > 0) return true
    // If articleCount > 0 but no wikiTitle, it's a category that hasn't loaded children
    if (node.articleCount && node.articleCount > 0 && !node.wikiTitle) return true
    return false
  }

  while (depth < targetDepth && currentNode.children && currentNode.children.length > 0) {
    let candidates = currentNode.children

    if (depth < minDepth) {
      const nonArticles = candidates.filter(c => !isArticleNode(c))
      if (nonArticles.length > 0) {
        candidates = nonArticles
      }
    }

    currentNode = candidates[Math.floor(Math.random() * candidates.length)]
    path.push(currentNode.id)
    steps.push({
      id: currentNode.id,
      name: currentNode.title,
    })
    depth++

    if (isArticleNode(currentNode)) break
  }

  // CRITICAL: Verify we landed on an actual article, not a category
  // If we ended up at a category node, reject this path
  if (!isArticleNode(currentNode)) {
    // This path ended at a category, not an article - reject it
    return null
  }

  const categoryId = path[0]
  const categoryStyle = CATEGORY_STYLES[categoryId] || { gradient: 'from-gray-500 to-gray-700', borderColor: 'border-gray-300' }

  return {
    path,
    steps,
    destination: {
      id: currentNode.id,
      name: currentNode.title,
      title: currentNode.title,
      isLeaf: currentNode.isLeaf || !currentNode.children || currentNode.children.length === 0,
      wikiTitle: currentNode.wikiTitle || null,
      articleCount: currentNode.articleCount || 0,
      gradient: categoryStyle.gradient,
      borderColor: categoryStyle.borderColor,
      source: currentNode.wikiTitle ? 'vital-articles' : null,
    },
    interestScore: scoreTopicInterestForWander(currentNode)
  }
}

/**
 * Generate a random path through the vital articles tree
 * Picks from multiple candidates and chooses the most interesting one
 * @param {number} minDepth - Minimum depth to reach before stopping (default 3)
 * @param {number} maxDepth - Maximum depth to reach (default 5)
 * @returns {Object} { path: [...ids], steps: [{id, name}...], destination: nodeInfo }
 */
export function getRandomTreePath(minDepth = 3, maxDepth = 5) {
  // Generate 20 random candidates
  const candidates = []
  for (let i = 0; i < 20; i++) {
    const candidate = generateSingleRandomPath(minDepth, maxDepth)
    if (candidate) {
      candidates.push(candidate)
    }
  }

  if (candidates.length === 0) return null

  // Sort by interest score (highest first)
  candidates.sort((a, b) => b.interestScore - a.interestScore)

  // Pick randomly from top 5 to add some variety
  const topCandidates = candidates.slice(0, Math.min(5, candidates.length))
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]

  // Remove the interestScore from the returned object (internal detail)
  const { interestScore, ...result } = selected
  return result
}

// Default data structure
const DEFAULT_DATA = {
  userProfile: {
    archetype: null,  // Will be set by personality quiz: 'lorekeeper', 'pattern-seeker', etc.
    userId: null,     // For future cloud sync
    createdAt: null,
  },
  cards: {},  // cardId -> card data (title, content, claimed status, etc.)
  decks: {},  // deckId -> deck metadata (generated card IDs, timestamps)
  dynamicDecks: {},  // deckId -> dynamically generated deck data (for level 3+ decks)
  flashcards: {},  // flashcardId -> flashcard data for spaced repetition
  flashcardMeta: {  // metadata for flashcard generation tracking
    lastGeneratedAt: null,
    generatedFromCards: [],  // sourceCardIds that have already been processed
  },
  meta: {
    version: 1,
    lastUpdated: null,
  }
}

/**
 * Get the full data object from localStorage
 * @returns {Object} The complete user data object
 */
export function getData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { ...DEFAULT_DATA }
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return { ...DEFAULT_DATA }
  }
}

/**
 * Save the full data object to localStorage
 * @param {Object} data - The complete data object to save
 */
export function saveData(data) {
  try {
    data.meta.lastUpdated = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

/**
 * Get cached cards for a deck
 * @param {string} deckId - The deck ID
 * @returns {Array|null} Array of card objects or null if not cached
 */
export function getDeckCards(deckId) {
  const data = getData()
  const deck = data.decks[deckId]

  if (!deck?.cardIds?.length) {
    return null
  }

  // Reconstruct cards from stored data
  return deck.cardIds.map(cardId => {
    const card = data.cards[cardId]
    return card ? {
      id: card.id,
      cardId: card.cardId || null,  // Unique display ID
      title: card.title,
      content: card.content || null,
      outline: card.outline || null,  // Outline skeleton for placeholder
      concept: card.concept || null,  // Brief concept summary
    } : null
  }).filter(Boolean)
}

/**
 * Save generated cards for a deck (with tier support)
 * @param {string} deckId - The deck ID
 * @param {string} deckName - The deck name (for metadata)
 * @param {Array} cards - Array of card objects with id, title, and optionally tier
 * @param {string} tier - Optional tier: 'core' | 'deep_dive_1' | 'deep_dive_2'
 */
export function saveDeckCards(deckId, deckName, cards, tier = 'core', expectedTotalCards = null) {
  const data = getData()
  const now = new Date().toISOString()

  // Get existing deck or create new one
  const existingDeck = data.decks[deckId] || {
    id: deckId,
    name: deckName,
    cardIds: [],
    cardsByTier: { core: [], deep_dive_1: [], deep_dive_2: [] },
    unlockedTiers: ['core'], // Core is always unlocked
    generatedAt: now,
  }

  // Update deck metadata
  data.decks[deckId] = {
    ...existingDeck,
    name: deckName,
    cardIds: [...existingDeck.cardIds, ...cards.map(c => c.id)],
    cardsByTier: {
      ...existingDeck.cardsByTier,
      [tier]: cards.map(c => c.id),
    },
    generatedAt: now,
    // Store expected total if provided (from outline), or keep existing
    ...(expectedTotalCards ? { expectedTotalCards } : {}),
  }

  // Save individual cards with tier info
  cards.forEach((card, index) => {
    // Generate unique card ID
    const cardId = generateCardId(deckId, tier)

    data.cards[card.id] = {
      id: card.id,
      cardId: cardId,  // Unique display ID (e.g., ANC-1-250116-0042)
      deckId: deckId,
      title: card.title,
      content: null,  // Content generated on flip
      tier: tier,
      tierIndex: index,  // Position within tier (0-4)
      number: card.number || (tier === 'core' ? index + 1 : tier === 'deep_dive_1' ? index + 6 : index + 11),  // Global card number 1-15
      rarity: 'common',  // Default, can be enhanced later
      claimed: false,
      claimedAt: null,
      generatedAt: now,
    }
  })

  saveData(data)
}

/**
 * Save a single card during streaming generation
 * Creates the card entry and adds it to the deck's cardsByTier
 * @param {string} deckId - The deck ID
 * @param {string} deckName - The deck name
 * @param {Object} card - The card object
 * @param {string} tier - The tier ('core', 'deep_dive_1', 'deep_dive_2')
 * @param {number} expectedTotalCards - Optional expected total cards from outline
 */
export function saveStreamedCard(deckId, deckName, card, tier, expectedTotalCards = null) {
  const data = getData()
  const now = new Date().toISOString()

  // Ensure deck exists
  if (!data.decks[deckId]) {
    data.decks[deckId] = {
      id: deckId,
      name: deckName,
      cardIds: [],
      cardsByTier: { core: [], deep_dive_1: [], deep_dive_2: [] },
      unlockedTiers: ['core'],
      generatedAt: now,
    }
  }

  // Store expected total if provided (from outline)
  if (expectedTotalCards && !data.decks[deckId].expectedTotalCards) {
    data.decks[deckId].expectedTotalCards = expectedTotalCards
  }

  // Add card ID to deck if not already there
  if (!data.decks[deckId].cardIds.includes(card.id)) {
    data.decks[deckId].cardIds.push(card.id)
  }

  // Add to cardsByTier if not already there
  if (!data.decks[deckId].cardsByTier) {
    data.decks[deckId].cardsByTier = { core: [], deep_dive: [], deep_dive_1: [], deep_dive_2: [] }
  }
  // Ensure the tier array exists (for backwards compatibility)
  if (!data.decks[deckId].cardsByTier[tier]) {
    data.decks[deckId].cardsByTier[tier] = []
  }
  if (!data.decks[deckId].cardsByTier[tier].includes(card.id)) {
    data.decks[deckId].cardsByTier[tier].push(card.id)
  }

  // Save the card (preserve claimed status and cardId if already exists)
  const existingCard = data.cards[card.id]
  // Generate unique card ID only if this is a new card
  const cardId = existingCard?.cardId || generateCardId(deckId, tier)

  data.cards[card.id] = {
    id: card.id,
    cardId: cardId,  // Unique display ID (e.g., ANC-1-250116-0042)
    deckId: deckId,
    title: card.title,
    content: card.content || null,
    outline: card.outline || null,  // Outline skeleton for placeholder display
    concept: card.concept || null,  // Brief concept summary
    tier: tier,
    tierIndex: card.tierIndex,
    number: card.number,
    rarity: 'common',
    claimed: existingCard?.claimed || false,  // Preserve claimed status!
    claimedAt: existingCard?.claimedAt || null,
    generatedAt: now,
  }

  saveData(data)

  // Return the cardId so caller can use it
  return cardId
}

/**
 * Save generated content for a card
 * @param {string} cardId - The card ID
 * @param {string} content - The generated content
 */
export function saveCardContent(cardId, content) {
  const data = getData()

  if (data.cards[cardId]) {
    data.cards[cardId].content = content
    data.cards[cardId].contentGeneratedAt = new Date().toISOString()
    saveData(data)
  }
}

/**
 * Get content for a card (if already generated)
 * @param {string} cardId - The card ID
 * @returns {string|null} The content or null if not generated
 */
export function getCardContent(cardId) {
  const data = getData()
  return data.cards[cardId]?.content || null
}

/**
 * Claim a card
 * @param {string} cardId - The card ID to claim
 */
export function claimCard(cardId) {
  const data = getData()
  const now = new Date().toISOString()

  if (data.cards[cardId]) {
    data.cards[cardId].claimed = true
    data.cards[cardId].claimedAt = now

    // Update deck's lastInteracted timestamp
    const deckId = data.cards[cardId].deckId
    if (deckId && data.decks[deckId]) {
      data.decks[deckId].lastInteracted = now
    }

    saveData(data)
    console.log(`[claimCard] ✅ Claimed card ${cardId}`)
  } else {
    // Card doesn't exist yet in localStorage - this can happen during streaming
    // Create a minimal entry so the claim is persisted
    console.warn(`[claimCard] ⚠️ Card ${cardId} not in localStorage yet, creating stub entry`)
    data.cards[cardId] = {
      id: cardId,
      claimed: true,
      claimedAt: now,
    }
    saveData(data)
  }
}

/**
 * Get all claimed card IDs
 * @returns {Set<string>} Set of claimed card IDs
 */
export function getClaimedCardIds() {
  const data = getData()
  const claimed = new Set()

  Object.values(data.cards).forEach(card => {
    if (card.claimed) {
      claimed.add(card.id)
    }
  })

  return claimed
}

/**
 * Get all claimed cards grouped by root category
 * @returns {Object} { categoryId: [card1, card2, ...], ... }
 */
export function getClaimedCardsByCategory() {
  const data = getData()
  const byCategory = {}

  Object.values(data.cards).forEach(card => {
    if (card.claimed && card.deckId) {
      // Find the root category from the deckId or path
      // The deckId often contains the category path
      const rootCategory = findRootCategory(card.deckId)
      if (rootCategory) {
        if (!byCategory[rootCategory]) {
          byCategory[rootCategory] = []
        }
        // Get the deck name from tree or storage
        const treeNode = nodeIndex.get(card.deckId)
        const deckData = data.decks[card.deckId]
        const deckName = treeNode?.title || deckData?.name || card.deckId

        byCategory[rootCategory].push({
          ...card,
          deckName
        })
      }
    }
  })

  return byCategory
}

/**
 * Get all claimed cards grouped by root category, then by deck
 * @returns {Object} { categoryId: { deckId: { name, cards: [...], expectedTotal, claimedCount }, ... }, ... }
 */
export function getClaimedCardsByCategoryAndDeck() {
  const data = getData()
  const byCategory = {}

  Object.values(data.cards).forEach(card => {
    if (card.claimed && card.deckId) {
      const rootCategory = findRootCategory(card.deckId)
      if (rootCategory) {
        if (!byCategory[rootCategory]) {
          byCategory[rootCategory] = {}
        }
        if (!byCategory[rootCategory][card.deckId]) {
          // Get the deck name and expected total from tree or storage
          const treeNode = nodeIndex.get(card.deckId)
          const deckData = data.decks[card.deckId]
          const deckName = treeNode?.title || deckData?.name || card.deckId
          const expectedTotal = deckData?.expectedTotalCards || 15
          byCategory[rootCategory][card.deckId] = {
            id: card.deckId,
            name: deckName,
            cards: [],
            expectedTotal,
            lastInteracted: deckData?.lastInteracted || null
          }
        }
        byCategory[rootCategory][card.deckId].cards.push(card)
      }
    }
  })

  // Add claimedCount to each deck
  Object.values(byCategory).forEach(decks => {
    Object.values(decks).forEach(deck => {
      deck.claimedCount = deck.cards.length
    })
  })

  return byCategory
}

/**
 * Find the root category for a deck ID
 * @param {string} deckId - The deck ID
 * @returns {string|null} The root category ID or null
 */
export function findRootCategory(deckId) {
  // Check if it's a direct category
  const categories = ['arts', 'biology', 'health', 'everyday', 'geography', 'history', 'mathematics', 'people', 'philosophy', 'physics', 'society', 'technology']

  if (categories.includes(deckId)) {
    return deckId
  }

  // Try to extract from the ID prefix (e.g., "technology-media-..." -> "technology")
  // This is fast and reliable since all IDs follow this pattern
  const prefix = deckId?.split('-')[0]
  if (prefix && categories.includes(prefix)) {
    return prefix
  }

  // Fallback: Try to find from the tree by walking up
  const node = nodeIndex.get(deckId)
  if (node) {
    // Walk up to find the root category
    let current = node
    while (current) {
      if (categories.includes(current.id)) {
        return current.id
      }
      // Find parent by checking all nodes
      let foundParent = null
      for (const [id, n] of nodeIndex.entries()) {
        if (n.children && n.children.some(c => c.id === current.id)) {
          foundParent = n
          break
        }
      }
      current = foundParent
    }
  }

  return null
}

/**
 * Claim a category node (creates it if needed, auto-claims on visit)
 * Category cards are different from article cards - they're just waypoints
 * @param {string} nodeId - The node ID to claim
 * @param {string} title - The node title
 * @returns {boolean} True if newly claimed, false if already claimed
 */
export function claimCategoryNode(nodeId, title) {
  const data = getData()

  // Check if already claimed
  if (data.cards[nodeId]?.claimed) {
    return false
  }

  // Create or update the category card
  data.cards[nodeId] = {
    id: nodeId,
    title: title,
    type: 'category', // Mark as category card (not article)
    claimed: true,
    claimedAt: new Date().toISOString()
  }

  saveData(data)
  return true
}

// ============================================================================
// PREVIEW CARDS (Cover cards shown before committing to a topic)
// ============================================================================

/**
 * Save a preview card for a topic
 * @param {string} deckId - The deck/topic ID
 * @param {string} title - The topic title
 * @param {string} preview - The preview text (2-3 sentences)
 */
export function savePreviewCard(deckId, title, preview) {
  const data = getData()
  const previewId = `${deckId}-preview`

  // Generate cardId for preview (tier 0)
  const cardId = generateCardId(deckId, 'preview')

  data.cards[previewId] = {
    id: previewId,
    deckId: deckId,
    cardId: cardId,
    title: title,
    content: preview,
    type: 'preview',
    generatedAt: new Date().toISOString(),
    claimed: false,
    claimedAt: null
  }

  saveData(data)
  console.log(`[savePreviewCard] Saved preview for ${title} (${cardId})`)
  return previewId
}

/**
 * Get preview card for a topic
 * @param {string} deckId - The deck/topic ID
 * @returns {Object|null} The preview card or null if not generated
 */
export function getPreviewCard(deckId) {
  const data = getData()
  const previewId = `${deckId}-preview`
  return data.cards[previewId] || null
}

/**
 * Claim a preview card
 * @param {string} deckId - The deck/topic ID
 */
export function claimPreviewCard(deckId) {
  const data = getData()
  const previewId = `${deckId}-preview`

  if (data.cards[previewId]) {
    data.cards[previewId].claimed = true
    data.cards[previewId].claimedAt = new Date().toISOString()
    saveData(data)
    console.log(`[claimPreviewCard] Claimed preview for deck ${deckId}`)
  }
}

/**
 * Update a deck's lastInteracted timestamp
 * @param {string} deckId - The deck/topic ID
 */
export function updateDeckLastInteracted(deckId) {
  const data = getData()

  // Ensure deck exists
  if (!data.decks[deckId]) {
    data.decks[deckId] = {
      id: deckId,
      name: deckId,
      cardIds: [],
      cardsByTier: { core: [], deep_dive_1: [], deep_dive_2: [] },
      unlockedTiers: ['core'],
      generatedAt: new Date().toISOString(),
    }
  }

  data.decks[deckId].lastInteracted = new Date().toISOString()
  saveData(data)
}

/**
 * Check if preview card exists for a topic
 * @param {string} deckId - The deck/topic ID
 * @returns {boolean}
 */
export function hasPreviewCard(deckId) {
  const data = getData()
  const previewId = `${deckId}-preview`
  return !!data.cards[previewId]?.content
}

// ============================================================================
// TIER CARDS
// ============================================================================

/**
 * Get cards for a specific tier in a deck
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier: 'core' | 'deep_dive_1' | 'deep_dive_2'
 * @returns {Array|null} Array of card objects or null if tier not generated
 */
export function getTierCards(deckId, tier) {
  const data = getData()
  const deck = data.decks[deckId]

  if (!deck?.cardsByTier?.[tier]?.length) {
    return null
  }

  return deck.cardsByTier[tier].map(cardId => {
    const card = data.cards[cardId]
    return card ? {
      id: card.id,
      cardId: card.cardId || null,  // Unique display ID
      title: card.title,
      content: card.content || null,
      outline: card.outline || null,  // Outline skeleton for placeholder
      concept: card.concept || null,  // Brief concept summary
      tier: card.tier,
      tierIndex: card.tierIndex,
    } : null
  }).filter(Boolean)
}

/**
 * Get tier completion status for a deck
 * @param {string} deckId - The deck ID
 * @returns {Object} Completion stats per tier
 */
export function getDeckTierCompletion(deckId) {
  const data = getData()
  const deck = data.decks[deckId]

  const result = {
    core: { claimed: 0, total: 0, complete: false },
    deep_dive: { claimed: 0, total: 0, complete: false },
    deep_dive_1: { claimed: 0, total: 0, complete: false },
    deep_dive_2: { claimed: 0, total: 0, complete: false },
  }

  if (!deck?.cardsByTier) {
    return result
  }

  // Count claimed cards per tier
  Object.entries(deck.cardsByTier).forEach(([tier, cardIds]) => {
    if (cardIds && result[tier]) {
      result[tier].total = cardIds.length
      result[tier].claimed = cardIds.filter(id => data.cards[id]?.claimed).length
      // Tier is complete when all cards are claimed (and there's at least one card)
      result[tier].complete = result[tier].total > 0 && result[tier].claimed === result[tier].total
    }
  })

  return result
}

/**
 * Unlock a tier for a deck (mark as available)
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier to unlock
 */
export function unlockTier(deckId, tier) {
  const data = getData()
  const deck = data.decks[deckId]

  if (deck) {
    if (!deck.unlockedTiers) {
      deck.unlockedTiers = ['core']
    }
    if (!deck.unlockedTiers.includes(tier)) {
      deck.unlockedTiers.push(tier)
    }
    saveData(data)
  }
}

/**
 * Get user archetype
 * @returns {string|null} The archetype or null if not set
 */
export function getUserArchetype() {
  const data = getData()
  return data.userProfile.archetype
}

/**
 * Get cached children for a deck
 * @param {string} deckId - The deck ID
 * @returns {Array|null} Array of child deck objects, null if not generated, empty array if leaf
 */
export function getDeckChildren(deckId) {
  const data = getData()
  const deck = data.dynamicDecks[deckId]

  if (!deck?.childrenGenerated) {
    return null // Not generated yet
  }

  return deck.children || [] // Empty array means it's a leaf
}

/**
 * Save generated children for a deck
 * @param {string} deckId - The parent deck ID
 * @param {string} deckName - The parent deck name
 * @param {Array|null} children - Array of child deck objects, or null/empty for leaf
 * @param {string} parentPath - The path to this deck (for context)
 * @param {number} depth - The depth level of this deck
 * @param {string} gradient - Gradient class for styling
 * @param {string} borderColor - Border color class for styling
 */
export function saveDeckChildren(deckId, deckName, children, parentPath, depth, gradient, borderColor) {
  const data = getData()
  const now = new Date().toISOString()

  // Ensure dynamicDecks exists (for older data structures)
  if (!data.dynamicDecks) {
    data.dynamicDecks = {}
  }

  // Save the parent deck's children info
  data.dynamicDecks[deckId] = {
    ...data.dynamicDecks[deckId],
    id: deckId,
    name: deckName,
    childrenGenerated: true,
    children: children || [],
    isLeaf: !children || children.length === 0,
    parentPath: parentPath,
    depth: depth,
    generatedAt: now,
  }

  // Also save each child deck's basic info for lookup
  if (children && children.length > 0) {
    children.forEach(child => {
      const childId = child.id
      if (!data.dynamicDecks[childId]) {
        data.dynamicDecks[childId] = {
          id: childId,
          name: child.name,
          gradient: gradient,
          borderColor: borderColor,
          parentId: deckId,
          parentPath: parentPath ? `${parentPath} > ${deckName}` : deckName,
          depth: depth + 1,
          childrenGenerated: false,
          children: null,
          createdAt: now,
        }
      }
    })
  }

  saveData(data)
}

/**
 * Get a dynamic deck's data
 * @param {string} deckId - The deck ID
 * @returns {Object|null} The deck data or null if not found
 */
export function getDynamicDeck(deckId) {
  const data = getData()
  return data.dynamicDecks?.[deckId] || null
}

/**
 * Clear all data (for testing/reset)
 */
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY)
}

// ============================================================================
// FLASHCARD STORAGE (Spaced Repetition)
// ============================================================================

/**
 * Get all flashcards
 * @returns {Object} flashcardId -> flashcard data
 */
export function getAllFlashcards() {
  const data = getData()
  return data.flashcards || {}
}

/**
 * Get flashcards that are due for review
 * @returns {Array} Array of flashcard objects due now or earlier, sorted by date
 */
export function getDueFlashcards() {
  const data = getData()
  const now = new Date()

  return Object.values(data.flashcards || {})
    .filter(fc => fc.status === 'active' && new Date(fc.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
}

/**
 * Get count of active flashcards
 * @returns {number}
 */
export function getFlashcardCount() {
  const data = getData()
  return Object.values(data.flashcards || {}).filter(fc => fc.status === 'active').length
}

/**
 * Get count of due flashcards
 * @returns {number}
 */
export function getDueFlashcardCount() {
  return getDueFlashcards().length
}

/**
 * Get next review time (for "All caught up" state)
 * @returns {Date|null} Next review timestamp or null if no flashcards
 */
export function getNextReviewTime() {
  const data = getData()
  const activeCards = Object.values(data.flashcards || {})
    .filter(fc => fc.status === 'active')
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))

  return activeCards.length > 0 ? new Date(activeCards[0].nextReview) : null
}

/**
 * Save multiple flashcards (used during generation)
 * @param {Array} flashcards - Array of flashcard objects
 */
export function saveFlashcards(flashcards) {
  const data = getData()
  if (!data.flashcards) data.flashcards = {}

  flashcards.forEach(fc => {
    data.flashcards[fc.id] = fc
  })

  saveData(data)
  console.log(`[saveFlashcards] Saved ${flashcards.length} flashcards`)
}

/**
 * Update a flashcard after review (SM-2 algorithm)
 * @param {string} flashcardId - The flashcard ID
 * @param {Object} updates - Fields to update (interval, easeFactor, repetitions, nextReview)
 */
export function updateFlashcard(flashcardId, updates) {
  const data = getData()

  if (data.flashcards && data.flashcards[flashcardId]) {
    data.flashcards[flashcardId] = {
      ...data.flashcards[flashcardId],
      ...updates,
      lastReviewedAt: new Date().toISOString()
    }
    saveData(data)
  }
}

/**
 * Mark a flashcard as skipped (removes from review rotation)
 * @param {string} flashcardId - The flashcard ID
 */
export function skipFlashcard(flashcardId) {
  updateFlashcard(flashcardId, { status: 'skipped' })
  console.log(`[skipFlashcard] Marked ${flashcardId} as skipped`)
}

/**
 * Mark a source card as having flashcards generated
 * @param {string} sourceCardId - The source card ID
 */
export function markCardAsFlashcardGenerated(sourceCardId) {
  const data = getData()
  if (!data.flashcardMeta) {
    data.flashcardMeta = { lastGeneratedAt: null, generatedFromCards: [] }
  }
  if (!data.flashcardMeta.generatedFromCards.includes(sourceCardId)) {
    data.flashcardMeta.generatedFromCards.push(sourceCardId)
    data.flashcardMeta.lastGeneratedAt = new Date().toISOString()
  }
  saveData(data)
}

/**
 * Get all claimed cards that have content and need flashcard generation
 * @returns {Array} Array of card objects ready for flashcard generation
 */
export function getCardsNeedingFlashcards() {
  const data = getData()
  const generatedFrom = data.flashcardMeta?.generatedFromCards || []

  return Object.values(data.cards)
    .filter(card =>
      card.claimed &&
      card.content &&
      !generatedFrom.includes(card.id)
    )
}

/**
 * Get all flashcards as array (for sync)
 * @returns {Array} Array of flashcard objects
 */
export function getAllFlashcardsArray() {
  const data = getData()
  return Object.values(data.flashcards || {})
}

// ============================================================================
// TWO-MODE STUDY SYSTEM (Learn New + Review)
// ============================================================================

/**
 * Get flashcards for Learn New mode (status = new or learning)
 * These are cards that haven't been graduated yet
 * @returns {Array} Array of flashcard objects ready for learning
 */
export function getLearningCards() {
  const data = getData()
  return Object.values(data.flashcards || {})
    .filter(fc => fc.status === 'new' || fc.status === 'learning')
}

/**
 * Get count of learning cards
 * @returns {number}
 */
export function getLearningCardCount() {
  return getLearningCards().length
}

/**
 * Get flashcards due for Review mode (status = learned, nextReview <= now)
 * @returns {Array} Array of flashcard objects due for review
 */
export function getReviewDueCards() {
  const data = getData()
  const now = new Date()
  return Object.values(data.flashcards || {})
    .filter(fc => fc.status === 'learned' && new Date(fc.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
}

/**
 * Get count of review due cards
 * @returns {number}
 */
export function getReviewDueCount() {
  return getReviewDueCards().length
}

/**
 * Get next review time for learned cards
 * @returns {Date|null} Next review timestamp or null if no learned cards
 */
export function getNextLearnedReviewTime() {
  const data = getData()
  const learnedCards = Object.values(data.flashcards || {})
    .filter(fc => fc.status === 'learned')
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))

  return learnedCards.length > 0 ? new Date(learnedCards[0].nextReview) : null
}

/**
 * Graduate a flashcard from learning to learned
 * Sets initial SM-2 values for spaced repetition
 * @param {string} flashcardId - The flashcard ID
 */
export function graduateFlashcard(flashcardId) {
  const data = getData()
  if (data.flashcards && data.flashcards[flashcardId]) {
    const now = new Date()
    now.setDate(now.getDate() + 1) // First review tomorrow

    data.flashcards[flashcardId] = {
      ...data.flashcards[flashcardId],
      status: 'learned',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: now.toISOString(),
      graduatedAt: new Date().toISOString()
    }
    saveData(data)
    console.log(`[graduateFlashcard] Graduated ${flashcardId}`)
  }
}

/**
 * Graduate multiple flashcards at once
 * @param {Array} flashcardIds - Array of flashcard IDs to graduate
 */
export function graduateFlashcards(flashcardIds) {
  flashcardIds.forEach(id => graduateFlashcard(id))
}

/**
 * Update learning state for a card (batch position, again count)
 * @param {string} flashcardId - The flashcard ID
 * @param {Object} updates - { status?, batchPosition?, againCount? }
 */
export function updateLearningState(flashcardId, updates) {
  const data = getData()
  if (data.flashcards && data.flashcards[flashcardId]) {
    data.flashcards[flashcardId] = {
      ...data.flashcards[flashcardId],
      ...updates
    }
    saveData(data)
  }
}

/**
 * Mark a card as currently being learned (in a session)
 * @param {string} flashcardId - The flashcard ID
 */
export function startLearningCard(flashcardId) {
  updateLearningState(flashcardId, {
    status: 'learning',
    againCount: 0
  })
}

/**
 * Get learning cards filtered by study deck
 * @returns {Array} Learning cards from topics in the study deck
 */
export function getStudyDeckLearningCards() {
  const data = getData()
  const studyDeck = data.studyDeck || []
  if (studyDeck.length === 0) return []

  return getLearningCards().filter(fc => {
    const sourceCardId = fc.sourceCardId || ''
    const cardData = data.cards?.[sourceCardId]
    if (cardData?.deckId && studyDeck.includes(cardData.deckId)) return true
    // Fallback: check if sourceCardId starts with any topic
    return studyDeck.some(topicId =>
      sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
    )
  })
}

/**
 * Get review due cards filtered by study deck
 * @returns {Array} Review due cards from topics in the study deck
 */
export function getStudyDeckReviewDueCards() {
  const data = getData()
  const studyDeck = data.studyDeck || []
  if (studyDeck.length === 0) return []

  return getReviewDueCards().filter(fc => {
    const sourceCardId = fc.sourceCardId || ''
    const cardData = data.cards?.[sourceCardId]
    if (cardData?.deckId && studyDeck.includes(cardData.deckId)) return true
    return studyDeck.some(topicId =>
      sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
    )
  })
}

/**
 * Import flashcards from remote (merge with local)
 * Used during sync to update local storage with remote data
 * @param {Array} remoteFlashcards - Array of flashcard objects from Supabase
 */
export function importFlashcardsFromRemote(remoteFlashcards) {
  if (!remoteFlashcards || remoteFlashcards.length === 0) return

  const data = getData()
  if (!data.flashcards) data.flashcards = {}

  for (const fc of remoteFlashcards) {
    // Overwrite or add the flashcard
    data.flashcards[fc.id] = fc

    // Also mark the source card as having flashcards generated
    if (fc.sourceCardId && !data.flashcardMeta?.generatedFromCards?.includes(fc.sourceCardId)) {
      if (!data.flashcardMeta) {
        data.flashcardMeta = { lastGeneratedAt: null, generatedFromCards: [] }
      }
      data.flashcardMeta.generatedFromCards.push(fc.sourceCardId)
    }
  }

  saveData(data)
  console.log(`[importFlashcardsFromRemote] Imported ${remoteFlashcards.length} flashcards`)
}

// ============================================================================
// SM-2 SPACED REPETITION ALGORITHM
// ============================================================================

/**
 * Calculate next review parameters using SM-2 algorithm
 * @param {number} quality - Rating 0-3 (0=Again, 1=Hard, 2=Good, 3=Easy)
 * @param {number} repetitions - Current repetition count
 * @param {number} easeFactor - Current ease factor (default 2.5)
 * @param {number} interval - Current interval in days
 * @returns {Object} { nextReview: ISO string, interval: number, easeFactor: number, repetitions: number }
 */
export function calculateSM2(quality, repetitions, easeFactor, interval) {
  let newEF = easeFactor
  let newInterval = interval
  let newReps = repetitions

  if (quality === 0) {
    // Again - reset to beginning
    newReps = 0
    newInterval = 1
    // Reduce ease factor (minimum 1.3)
    newEF = Math.max(1.3, easeFactor - 0.2)
  } else if (quality === 1) {
    // Hard - don't increase repetitions, small interval increase
    newInterval = Math.max(1, Math.round(interval * 1.2))
    newEF = Math.max(1.3, easeFactor - 0.15)
  } else if (quality === 2) {
    // Good - standard progression
    newReps = repetitions + 1
    if (newReps === 1) {
      newInterval = 1
    } else if (newReps === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * easeFactor)
    }
    // Slight EF adjustment
    newEF = easeFactor + (0.1 - (3 - quality) * 0.08)
    newEF = Math.max(1.3, newEF)
  } else if (quality === 3) {
    // Easy - accelerated progression
    newReps = repetitions + 1
    if (newReps === 1) {
      newInterval = 4
    } else if (newReps === 2) {
      newInterval = 10
    } else {
      newInterval = Math.round(interval * easeFactor * 1.3)
    }
    // Increase ease factor
    newEF = easeFactor + 0.15
  }

  // Calculate next review date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    nextReview: nextReview.toISOString(),
    interval: newInterval,
    easeFactor: newEF,
    repetitions: newReps
  }
}

/**
 * Format time until next review for display
 * @param {Date|string} nextReview - Next review timestamp
 * @returns {string} Human-readable time (e.g., "3 hours", "2 days")
 */
export function formatTimeUntilReview(nextReview) {
  const reviewDate = nextReview instanceof Date ? nextReview : new Date(nextReview)
  const now = new Date()
  const diff = reviewDate - now

  if (diff <= 0) return 'now'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  const minutes = Math.floor(diff / (1000 * 60))
  return minutes <= 1 ? '1 minute' : `${minutes} minutes`
}

/**
 * Get all in-progress decks (some cards claimed but not all)
 * @returns {Array} Array of in-progress deck objects sorted by last interaction
 */
export function getInProgressDecks() {
  const data = getData()
  const inProgress = []

  Object.entries(data.decks).forEach(([deckId, deck]) => {
    // Skip decks without cards
    if (!deck.cardIds?.length) return

    // Count claimed cards
    const claimedCount = deck.cardIds.filter(id => data.cards[id]?.claimed).length
    // Use expectedTotalCards if available (from outline), otherwise fallback to 15
    const expectedTotal = deck.expectedTotalCards || 15
    // Current generated count (for progress calculation)
    const generatedCount = deck.cardIds.length

    // In-progress: some claimed but not all expected
    if (claimedCount > 0 && claimedCount < expectedTotal) {
      // Get the most recent claimedAt if no lastInteracted on deck
      let lastInteracted = deck.lastInteracted
      if (!lastInteracted) {
        const claimedDates = deck.cardIds
          .map(id => data.cards[id]?.claimedAt)
          .filter(Boolean)
        if (claimedDates.length > 0) {
          lastInteracted = new Date(Math.max(...claimedDates.map(d => new Date(d).getTime()))).toISOString()
        }
      }

      // Find the root category for theming
      const rootCategory = findRootCategory(deckId)

      inProgress.push({
        id: deckId,
        name: deck.name,
        claimedCount,
        totalCount: expectedTotal,
        generatedCount,
        progressPercent: Math.round((claimedCount / expectedTotal) * 100),
        lastInteracted,
        rootCategoryId: rootCategory,
      })
    }
  })

  // Sort by most recently interacted (newest first)
  inProgress.sort((a, b) => {
    if (!a.lastInteracted) return 1
    if (!b.lastInteracted) return -1
    return new Date(b.lastInteracted) - new Date(a.lastInteracted)
  })

  return inProgress
}

// ============================================================================
// STUDY DECK MANAGEMENT
// ============================================================================

/**
 * Get the list of topic IDs in the user's study deck
 * @returns {Array<string>} Array of topic/deck IDs
 */
export function getStudyDeck() {
  const data = getData()
  const deck = data.studyDeck || []
  console.log('[getStudyDeck] Current study deck:', deck)
  return deck
}

/**
 * Add a topic to the study deck
 * @param {string} topicId - The topic/deck ID to add
 */
export function addToStudyDeck(topicId) {
  console.log(`[addToStudyDeck] Called with topicId: ${topicId}`)
  const data = getData()
  if (!data.studyDeck) data.studyDeck = []

  if (!data.studyDeck.includes(topicId)) {
    data.studyDeck.push(topicId)
    saveData(data)
    console.log(`[addToStudyDeck] Added ${topicId} to study deck. New deck:`, data.studyDeck)
  } else {
    console.log(`[addToStudyDeck] ${topicId} already in study deck`)
  }
}

/**
 * Remove a topic from the study deck
 * @param {string} topicId - The topic/deck ID to remove
 */
export function removeFromStudyDeck(topicId) {
  const data = getData()
  if (!data.studyDeck) return

  data.studyDeck = data.studyDeck.filter(id => id !== topicId)
  saveData(data)
  console.log(`[removeFromStudyDeck] Removed ${topicId} from study deck`)
}

/**
 * Check if a topic is in the study deck
 * @param {string} topicId - The topic/deck ID to check
 * @returns {boolean}
 */
export function isInStudyDeck(topicId) {
  const data = getData()
  return (data.studyDeck || []).includes(topicId)
}

/**
 * Get all flashcards for topics in the study deck
 * @returns {Array} Array of flashcard objects from all study deck topics
 */
export function getStudyDeckFlashcards() {
  const data = getData()
  const studyDeck = data.studyDeck || []

  if (studyDeck.length === 0) return []

  // Get all non-skipped flashcards that belong to topics in the study deck
  return Object.values(data.flashcards || {})
    .filter(fc => {
      // Include new, learning, learned, and legacy 'active' - exclude skipped
      if (fc.status === 'skipped') return false

      const sourceCardId = fc.sourceCardId || ''

      // Method 1: Look up the card's deckId in localStorage
      const cardData = data.cards?.[sourceCardId]
      if (cardData?.deckId && studyDeck.includes(cardData.deckId)) return true

      // Method 2: Check if sourceCardId starts with any topic in study deck (for older format)
      const matchesTopic = studyDeck.some(topicId =>
        sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
      )
      if (matchesTopic) return true

      return false
    })
}

/**
 * Get flashcard count for a specific topic
 * @param {string} topicId - The topic/deck ID
 * @returns {number} Number of active flashcards for this topic
 */
export function getFlashcardCountForTopic(topicId) {
  const data = getData()
  return Object.values(data.flashcards || {})
    .filter(fc => {
      // Count all non-skipped cards (new, learning, learned, or legacy 'active')
      if (fc.status === 'skipped') return false

      const sourceCardId = fc.sourceCardId || ''

      // Method 1: Look up the card's deckId in localStorage
      const cardData = data.cards?.[sourceCardId]
      if (cardData?.deckId === topicId) return true

      // Method 2: Check if sourceCardId starts with the topicId (for older format)
      if (sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')) return true

      return false
    }).length
}

/**
 * Get all topics that have claimed cards (available for study deck)
 * Groups by category, includes flashcard counts
 * Uses same pattern as getClaimedCardsByCategoryAndDeck - iterates through cards, not decks
 * @returns {Object} { categoryId: [{ id, name, claimedCount, flashcardCount }, ...], ... }
 */
export function getAvailableStudyTopics() {
  const data = getData()
  const byCategory = {}

  // Iterate through cards (same pattern as getClaimedCardsByCategoryAndDeck)
  Object.values(data.cards || {}).forEach(card => {
    if (!card.claimed || !card.deckId) return

    const deckId = card.deckId
    const rootCategory = findRootCategory(deckId)
    if (!rootCategory) return

    if (!byCategory[rootCategory]) {
      byCategory[rootCategory] = {}
    }

    if (!byCategory[rootCategory][deckId]) {
      // Get deck info
      const treeNode = nodeIndex.get(deckId)
      const deckData = data.decks?.[deckId]
      const deckName = treeNode?.title || deckData?.name || deckId

      // Get flashcard count for this topic (use the proper function)
      const flashcardCount = getFlashcardCountForTopic(deckId)

      byCategory[rootCategory][deckId] = {
        id: deckId,
        name: deckName,
        claimedCount: 0,
        expectedTotal: deckData?.expectedTotalCards || 15,
        flashcardCount,
        lastInteracted: deckData?.lastInteracted || null,
        inStudyDeck: (data.studyDeck || []).includes(deckId)
      }
    }

    byCategory[rootCategory][deckId].claimedCount++
  })

  // Convert nested objects to arrays for easier rendering
  const result = {}
  Object.entries(byCategory).forEach(([categoryId, decks]) => {
    result[categoryId] = Object.values(decks).sort((a, b) => {
      if (!a.lastInteracted && !b.lastInteracted) return a.name.localeCompare(b.name)
      if (!a.lastInteracted) return 1
      if (!b.lastInteracted) return -1
      return new Date(b.lastInteracted) - new Date(a.lastInteracted)
    })
  })

  return result
}

/**
 * Auto-migrate existing flashcards to study deck system
 * Adds all topics that have flashcards to the study deck
 */
export function migrateToStudyDeck() {
  const data = getData()

  // Skip if already migrated
  if (data.studyDeckMigrated) return

  // Find all unique topic IDs that have flashcards
  const topicsWithFlashcards = new Set()
  Object.values(data.flashcards || {}).forEach(fc => {
    if (fc.sourceCardId && fc.status === 'active') {
      const topicId = fc.sourceCardId.replace(/-card-\d+$/, '')
      topicsWithFlashcards.add(topicId)
    }
  })

  // Add them all to study deck
  if (!data.studyDeck) data.studyDeck = []
  topicsWithFlashcards.forEach(topicId => {
    if (!data.studyDeck.includes(topicId)) {
      data.studyDeck.push(topicId)
    }
  })

  data.studyDeckMigrated = true
  saveData(data)
  console.log(`[migrateToStudyDeck] Migrated ${topicsWithFlashcards.size} topics to study deck`)
}
