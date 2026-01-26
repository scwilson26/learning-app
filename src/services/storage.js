/**
 * Storage service for persisting user data (cards, decks, claims)
 * Structured for future cloud sync - all data in one clean object
 */

import constellationData from '../data/constellation.json'

// For backwards compatibility during transition, extract what we need
const vitalArticlesTree = {
  id: 'root',
  title: 'All Knowledge',
  children: Object.entries(constellationData.clusters).map(([id, cluster]) => ({
    id,
    title: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    ...cluster,
    children: Object.entries(constellationData.topics)
      .filter(([_, topic]) => topic.cluster === id)
      .map(([topicId, topic]) => ({
        id: topicId,
        title: topic.name,
        isLeaf: true,
        wikiTitle: topic.name,
        ...topic
      }))
  }))
}
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
  'deep_dive': '2',
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
 * @param {string} tier - The tier ('core', 'deep_dive')
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
 * @param {string} tier - The tier ('core', 'deep_dive')
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
// Keys match cluster IDs from constellation.json
const CATEGORY_STYLES = {
  people: { gradient: 'from-orange-500 to-amber-600', borderColor: 'border-orange-300' },
  history: { gradient: 'from-amber-600 to-yellow-700', borderColor: 'border-amber-300' },
  geography: { gradient: 'from-yellow-500 to-orange-500', borderColor: 'border-yellow-300' },
  science: { gradient: 'from-blue-500 to-indigo-600', borderColor: 'border-blue-300' },
  biology: { gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300' },
  technology: { gradient: 'from-gray-500 to-slate-600', borderColor: 'border-gray-300' },
  arts: { gradient: 'from-purple-500 to-violet-600', borderColor: 'border-purple-300' },
  philosophy_religion: { gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300' },
  society: { gradient: 'from-red-500 to-rose-600', borderColor: 'border-red-300' },
  everyday_life: { gradient: 'from-yellow-400 to-amber-500', borderColor: 'border-yellow-300' },
  mathematics: { gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300' },
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

  // Category bonuses (from constellation cluster prefix)
  if (id.startsWith('people')) score += 3           // People are inherently interesting
  if (id.startsWith('history')) score += 2          // Historical events/eras
  if (id.startsWith('arts')) score += 1             // Arts & culture
  if (id.startsWith('technology')) score += 1       // Tech topics
  if (id.startsWith('biology')) score += 1          // Life sciences
  if (id.startsWith('science')) score += 1          // Physical sciences
  if (id.startsWith('society')) score += 1          // Society topics

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
 * Completely random selection - no scoring or weighting
 * @param {number} minDepth - Minimum depth to reach before stopping (default 3)
 * @param {number} maxDepth - Maximum depth to reach (default 5)
 * @returns {Object} { path: [...ids], steps: [{id, name}...], destination: nodeInfo }
 */
export function getRandomTreePath(minDepth = 3, maxDepth = 5) {
  // Try up to 10 times to get a valid path (some paths may hit categories without articles)
  for (let i = 0; i < 10; i++) {
    const result = generateSingleRandomPath(minDepth, maxDepth)
    if (result) {
      const { interestScore, ...path } = result
      return path
    }
  }
  return null
}

// Default data structure
const DEFAULT_DATA = {
  userProfile: {
    archetype: null,  // Will be set by personality quiz: 'lorekeeper', 'pattern-seeker', etc.
    userId: null,     // For future cloud sync
    createdAt: null,
  },
  // The Void - character and progression
  character: null,  // 'chronicler' | 'naturalist' | 'architect' | 'philosopher' | 'wanderer'
  voidProgress: {
    unlockedTopics: [],      // Topic IDs the user can see/explore
    exploredTopics: [],      // Topic IDs the user has entered
    topicProgress: {},       // topicId -> { claimedCards, cardIds, firstVisited }
    unlockedWormholes: [],   // Wormhole IDs discovered
    starsRevealed: 0,        // Total stars revealed (for ranks)
    fragmentsCaptured: 0,    // Total fragments captured
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

// ============================================================
// THE VOID - Character & Progression
// ============================================================

/**
 * Get the user's selected character origin
 * @returns {string|null} Character origin ID or null if not selected
 */
export function getCharacter() {
  const data = getData()
  return data.character || null
}

/**
 * Set the user's character origin and initialize starting topics
 * @param {string} originId - The character origin ID
 * @param {string[]} startingTopics - Array of topic IDs to unlock
 */
export function setCharacter(originId, startingTopics) {
  const data = getData()
  data.character = originId

  // Initialize void progress if needed
  if (!data.voidProgress) {
    data.voidProgress = {
      unlockedTopics: [],
      exploredTopics: [],
      topicProgress: {},
      unlockedWormholes: [],
      starsRevealed: 0,
      fragmentsCaptured: 0,
    }
  }

  // Set starting topics as unlocked
  data.voidProgress.unlockedTopics = [...new Set([
    ...data.voidProgress.unlockedTopics,
    ...startingTopics
  ])]
  data.voidProgress.starsRevealed = data.voidProgress.unlockedTopics.length

  // Set created timestamp if not already set
  if (!data.userProfile.createdAt) {
    data.userProfile.createdAt = new Date().toISOString()
  }

  saveData(data)
  console.log(`[Void] Character set: ${originId}, unlocked ${startingTopics.length} starting stars`)
}

/**
 * Get void progress data
 * @returns {Object} The void progress object
 */
export function getVoidProgress() {
  const data = getData()
  return data.voidProgress || {
    unlockedTopics: [],
    exploredTopics: [],
    topicProgress: {},
    unlockedWormholes: [],
    starsRevealed: 0,
    fragmentsCaptured: 0,
  }
}

/**
 * Check if a topic is unlocked
 * @param {string} topicId - The topic ID to check
 * @returns {boolean} Whether the topic is unlocked
 */
export function isTopicUnlocked(topicId) {
  const progress = getVoidProgress()
  return progress.unlockedTopics.includes(topicId)
}

/**
 * Unlock a topic (reveal a new star)
 * @param {string} topicId - The topic ID to unlock
 * @returns {boolean} Whether the topic was newly unlocked
 */
export function unlockTopic(topicId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }

  if (!data.voidProgress.unlockedTopics.includes(topicId)) {
    data.voidProgress.unlockedTopics.push(topicId)
    data.voidProgress.starsRevealed = data.voidProgress.unlockedTopics.length
    saveData(data)
    console.log(`[Void] Star revealed: ${topicId}`)
    return true
  }
  return false
}

/**
 * Mark a topic as discovered (user opened/viewed it)
 * This is Phase 4: Browse ↔ Void Sync
 * When user opens a topic in Browse, it becomes "discovered" in The Void
 *
 * @param {string} topicId - The topic ID that was opened
 * @returns {boolean} Whether the topic was newly discovered
 */
export function markTopicDiscovered(topicId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }

  // Add to exploredTopics if not already there
  if (!data.voidProgress.exploredTopics) {
    data.voidProgress.exploredTopics = []
  }

  if (!data.voidProgress.exploredTopics.includes(topicId)) {
    data.voidProgress.exploredTopics.push(topicId)

    // Also initialize topicProgress with firstVisited if not exists
    if (!data.voidProgress.topicProgress[topicId]) {
      data.voidProgress.topicProgress[topicId] = {
        capturedCards: [],
        firstVisited: new Date().toISOString(),
      }
    } else if (!data.voidProgress.topicProgress[topicId].firstVisited) {
      data.voidProgress.topicProgress[topicId].firstVisited = new Date().toISOString()
    }

    saveData(data)
    console.log(`[Void] Topic discovered: ${topicId}`)
    return true
  }
  return false
}

// ============================================================
// PHASE 5: FADING NOTIFICATIONS
// ============================================================

/**
 * Get list of topics that have already shown fading notification
 * @returns {string[]} Array of topic IDs
 */
export function getFadingNotifiedTopics() {
  const data = getData()
  return data.voidProgress?.fadingNotified || []
}

/**
 * Mark a topic as having shown its fading notification
 * Prevents repeated "something dims" messages for the same topic
 * @param {string} topicId - The topic ID
 */
export function markFadingNotified(topicId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }
  if (!data.voidProgress.fadingNotified) {
    data.voidProgress.fadingNotified = []
  }

  if (!data.voidProgress.fadingNotified.includes(topicId)) {
    data.voidProgress.fadingNotified.push(topicId)
    saveData(data)
    return true
  }
  return false
}

/**
 * Clear fading notification for a topic (when it's no longer fading)
 * This allows the notification to show again if it fades again later
 * @param {string} topicId - The topic ID
 */
export function clearFadingNotified(topicId) {
  const data = getData()
  if (data.voidProgress?.fadingNotified) {
    const index = data.voidProgress.fadingNotified.indexOf(topicId)
    if (index > -1) {
      data.voidProgress.fadingNotified.splice(index, 1)
      saveData(data)
    }
  }
}

/**
 * Get the last time user saw the void (for "return after absence" detection)
 * @returns {number|null} Timestamp or null
 */
export function getLastVoidVisit() {
  const data = getData()
  return data.voidProgress?.lastVisit || null
}

/**
 * Record that user is visiting the void now
 */
export function recordVoidVisit() {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }
  data.voidProgress.lastVisit = Date.now()
  saveData(data)
}

/**
 * Record a captured fragment and check for unlocks
 * @param {string} topicId - The topic where the fragment was captured
 * @param {string} cardId - The card/fragment ID
 * @returns {Object} { newCount, newlyUnlockedTopics, wormholesTriggered }
 */
export function recordFragmentCapture(topicId, cardId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }

  // Initialize topic progress if needed
  if (!data.voidProgress.topicProgress[topicId]) {
    data.voidProgress.topicProgress[topicId] = {
      capturedCards: [],
      firstVisited: new Date().toISOString(),
    }
  }

  const topicProgress = data.voidProgress.topicProgress[topicId]

  // Add card if not already captured
  if (!topicProgress.capturedCards.includes(cardId)) {
    topicProgress.capturedCards.push(cardId)
    data.voidProgress.fragmentsCaptured = (data.voidProgress.fragmentsCaptured || 0) + 1
  }

  const newCount = topicProgress.capturedCards.length
  saveData(data)

  const result = {
    newCount,
    newlyUnlockedTopics: [],
    wormholesTriggered: false,
  }

  // At 2 fragments: reveal nearby stars (siblings in same cluster)
  if (newCount === 2) {
    const topic = constellationData.topics[topicId]
    if (topic) {
      const siblings = Object.entries(constellationData.topics)
        .filter(([id, t]) => t.cluster === topic.cluster && id !== topicId)
        .map(([id]) => id)

      // Unlock up to 3 random siblings
      const shuffled = siblings.sort(() => Math.random() - 0.5)
      const toUnlock = shuffled.slice(0, 3)

      toUnlock.forEach(siblingId => {
        if (unlockTopic(siblingId)) {
          result.newlyUnlockedTopics.push(siblingId)
        }
      })
    }
  }

  // At 4 fragments: trigger wormhole check
  if (newCount === 4) {
    result.wormholesTriggered = true
  }

  console.log(`[Void] Fragment captured in ${topicId}: ${newCount} total`, result)
  return result
}

/**
 * Get the number of captured fragments for a topic
 * @param {string} topicId - The topic ID
 * @returns {number} Number of captured fragments
 */
export function getTopicFragmentCount(topicId) {
  const progress = getVoidProgress()
  return progress.topicProgress[topicId]?.capturedCards?.length || 0
}

/**
 * Save a discovered wormhole
 * @param {string} wormholeId - The wormhole ID (e.g., "ancient_egypt|mathematics")
 */
export function saveDiscoveredWormhole(wormholeId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }

  if (!data.voidProgress.unlockedWormholes) {
    data.voidProgress.unlockedWormholes = []
  }

  if (!data.voidProgress.unlockedWormholes.includes(wormholeId)) {
    data.voidProgress.unlockedWormholes.push(wormholeId)
    saveData(data)
    console.log(`[Void] Wormhole discovered: ${wormholeId}`)
    return true
  }
  return false
}

/**
 * Get all discovered wormhole IDs
 * @returns {string[]} Array of wormhole IDs
 */
export function getDiscoveredWormholes() {
  const progress = getVoidProgress()
  return progress.unlockedWormholes || []
}

/**
 * Get shown story fragment IDs
 * @returns {string[]} Array of fragment IDs that have been shown
 */
export function getShownFragments() {
  const progress = getVoidProgress()
  return progress.shownFragments || []
}

/**
 * Mark a story fragment as shown
 * @param {string} fragmentId - The fragment ID
 */
export function markFragmentShown(fragmentId) {
  const data = getData()
  if (!data.voidProgress) {
    data.voidProgress = getVoidProgress()
  }

  if (!data.voidProgress.shownFragments) {
    data.voidProgress.shownFragments = []
  }

  if (!data.voidProgress.shownFragments.includes(fragmentId)) {
    data.voidProgress.shownFragments.push(fragmentId)
    saveData(data)
    console.log(`[Void] Story fragment shown: ${fragmentId}`)
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
 * @param {string} tier - Optional tier: 'core' | 'deep_dive'
 */
export function saveDeckCards(deckId, deckName, cards, tier = 'core', expectedTotalCards = null) {
  const data = getData()
  const now = new Date().toISOString()

  // Get existing deck or create new one
  const existingDeck = data.decks[deckId] || {
    id: deckId,
    name: deckName,
    cardIds: [],
    cardsByTier: { core: [], deep_dive: [] },
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
      number: card.number || (tier === 'core' ? index + 1 : index + 5),  // Global card number (core: 1-4, deep_dive: 5-7)
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
 * @param {string} tier - The tier ('core', 'deep_dive')
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
      cardsByTier: { core: [], deep_dive: [] },
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
    data.decks[deckId].cardsByTier = { core: [], deep_dive: [] }
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
          const expectedTotal = deckData?.expectedTotalCards || 8
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
      cardsByTier: { core: [], deep_dive: [] },
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
 * @param {string} tier - The tier: 'core' | 'deep_dive'
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
 * Get unlocked tiers for a deck
 * @param {string} deckId - The deck ID
 * @returns {Array} Array of unlocked tier names (e.g., ['core', 'deep_dive'])
 */
export function getUnlockedTiers(deckId) {
  const data = getData()
  const deck = data.decks[deckId]
  return deck?.unlockedTiers || ['core']
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
// FLASHCARD STORAGE (Two-Phase Study System)
// ============================================================================

// Leitner box configuration
const LEITNER_BOXES = {
  1: { baseInterval: 1, label: "Daily", color: "#ef4444" },        // red
  2: { baseInterval: 3, label: "Every 3 days", color: "#f97316" }, // orange
  3: { baseInterval: 7, label: "Weekly", color: "#eab308" },       // yellow
  4: { baseInterval: 14, label: "Biweekly", color: "#22c55e" },    // green
  5: { baseInterval: 30, label: "Monthly", color: "#3b82f6" },     // blue
  6: { baseInterval: 90, label: "Mastered", color: "#8b5cf6" },    // purple
};

// Acquisition settings
const ACQUISITION_CONFIG = {
  batchSize: 5,                    // new cards per batch
  correctStreakToGraduate: 3,      // correct in a row to pass
  maxCombinedBatchSize: 15,        // cap to prevent overwhelm
  stuckThreshold: 6,               // attempts before card is "stuck"
};

// SM-2 ease factor settings
const EASE_CONFIG = {
  initial: 2.5,                    // starting ease
  minimum: 1.3,                    // floor (prevents interval from shrinking too much)
  maximum: 2.5,                    // ceiling
  correctBonus: 0.1,               // added on correct
  incorrectPenalty: 0.2,           // subtracted on incorrect
};

// Export configs for UI use
export { LEITNER_BOXES, ACQUISITION_CONFIG, EASE_CONFIG };

// ============================================================================
// LEITNER + SM-2 HYBRID ALGORITHM FUNCTIONS
// ============================================================================

/**
 * Calculate actual interval using box base + ease factor
 * @param {number} box - Leitner box number (1-6)
 * @param {number} easeFactor - SM-2 style ease factor
 * @returns {number} Interval in days
 */
export function calculateInterval(box, easeFactor) {
  const baseInterval = LEITNER_BOXES[box]?.baseInterval || 1;
  return Math.round(baseInterval * easeFactor);
}

/**
 * Update ease factor based on performance (SM-2 style)
 * @param {number} currentEase - Current ease factor
 * @param {boolean} wasCorrect - Whether answer was correct
 * @returns {number} Updated ease factor
 */
export function updateEaseFactor(currentEase, wasCorrect) {
  if (wasCorrect) {
    return Math.min(currentEase + EASE_CONFIG.correctBonus, EASE_CONFIG.maximum);
  } else {
    return Math.max(currentEase - EASE_CONFIG.incorrectPenalty, EASE_CONFIG.minimum);
  }
}

/**
 * Calculate next review date
 * @param {number} box - Leitner box number
 * @param {number} easeFactor - SM-2 style ease factor
 * @returns {number} Timestamp when card is due
 */
export function getNextReviewDate(box, easeFactor) {
  const intervalDays = calculateInterval(box, easeFactor);
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  nextDate.setHours(0, 0, 0, 0); // normalize to start of day
  return nextDate.getTime();
}

/**
 * Get tomorrow at midnight (for graduation)
 * @returns {number} Timestamp for tomorrow 00:00:00
 */
export function getTomorrowMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Check if card is due for review
 * @param {Object} card - Flashcard object
 * @returns {boolean} True if due
 */
export function isCardDue(card) {
  if (!card.nextReviewDate) return false;
  return Date.now() >= card.nextReviewDate;
}

/**
 * Get days overdue (negative if not yet due)
 * @param {Object} card - Flashcard object
 * @returns {number} Days overdue
 */
export function getDaysOverdue(card) {
  if (!card.nextReviewDate) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - card.nextReviewDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// FLASHCARD GETTERS
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
 * Save multiple flashcards (used during generation)
 * Initializes new cards with the two-phase study model
 * @param {Array} flashcards - Array of flashcard objects
 */
export function saveFlashcards(flashcards) {
  const data = getData()
  if (!data.flashcards) data.flashcards = {}

  flashcards.forEach(fc => {
    // Initialize with new two-phase model if not already set
    data.flashcards[fc.id] = {
      ...fc,
      // Two-phase study model fields
      studyState: fc.studyState || 'new',
      acquisitionCorrectStreak: fc.acquisitionCorrectStreak || 0,
      acquisitionTotalAttempts: fc.acquisitionTotalAttempts || 0,
      acquisitionLastSeen: fc.acquisitionLastSeen || null,
      leitnerBox: fc.leitnerBox || 0,
      easeFactor: fc.easeFactor || EASE_CONFIG.initial,
      nextReviewDate: fc.nextReviewDate || null,
      lastReviewDate: fc.lastReviewDate || null,
      reviewHistory: fc.reviewHistory || [],
      totalReviews: fc.totalReviews || 0,
      correctStreak: fc.correctStreak || 0,
      masteredAt: fc.masteredAt || null,
      createdAt: fc.createdAt || Date.now()
    }
  })

  saveData(data)
  console.log(`[saveFlashcards] Saved ${flashcards.length} flashcards with two-phase model`)
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
// TWO-PHASE STUDY SYSTEM (Acquisition + Retention)
// ============================================================================

/**
 * Helper: Filter flashcards by study deck
 */
function filterByStudyDeck(flashcards, data) {
  const studyDeck = data.studyDeck || []
  if (studyDeck.length === 0) return []

  return flashcards.filter(fc => {
    const sourceCardId = fc.sourceCardId || ''
    const cardData = data.cards?.[sourceCardId]
    if (cardData?.deckId && studyDeck.includes(cardData.deckId)) return true
    return studyDeck.some(topicId =>
      sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
    )
  })
}

/**
 * Helper: Filter flashcards by specific topic
 */
function filterByTopic(flashcards, topicId, data) {
  return flashcards.filter(fc => {
    const sourceCardId = fc.sourceCardId || ''
    const cardData = data.cards?.[sourceCardId]
    if (cardData?.deckId === topicId) return true
    return sourceCardId === topicId || sourceCardId.startsWith(topicId + '-')
  })
}

/**
 * Get NEW cards ready for acquisition (studyState === "new")
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {Array} Array of flashcard objects ready for learning
 */
export function getNewCards(topicId = null) {
  const data = getData()
  const allNew = Object.values(data.flashcards || {})
    .filter(fc => fc.studyState === 'new' && fc.status !== 'skipped')

  if (topicId) {
    return filterByTopic(allNew, topicId, data)
  }
  return filterByStudyDeck(allNew, data)
}

/**
 * Get cards currently in acquisition (studyState === "acquiring")
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {Array} Array of flashcard objects in acquisition
 */
export function getAcquiringCards(topicId = null) {
  const data = getData()
  const studyDeck = getStudyDeck()

  const allAcquiring = Object.values(data.flashcards || {})
    .filter(fc => fc.studyState === 'acquiring' && fc.status !== 'skipped')

  if (topicId) {
    return filterByTopic(allAcquiring, topicId, data)
  }

  // Filter by study deck
  if (studyDeck.length === 0) return []
  return allAcquiring.filter(fc => {
    const sourceCard = data.cards?.[fc.sourceCardId]
    return sourceCard && studyDeck.includes(sourceCard.deckId)
  })
}

/**
 * Get count of new cards ready for learning
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {number}
 */
export function getNewCardCount(topicId = null) {
  return getNewCards(topicId).length
}

/**
 * Get count of all cards available for learning (new + acquiring)
 * This is what should show on the "Learn New" button
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {number}
 */
export function getLearningAvailableCount(topicId = null) {
  const data = getData()
  const studyDeck = getStudyDeck()

  const allLearning = Object.values(data.flashcards || {})
    .filter(fc =>
      (fc.studyState === 'new' || fc.studyState === 'acquiring') &&
      fc.status !== 'skipped'
    )

  if (topicId) {
    return filterByTopic(allLearning, topicId, data).length
  }

  // Filter by study deck
  if (studyDeck.length === 0) return 0
  return allLearning.filter(fc => {
    const sourceCard = data.cards?.[fc.sourceCardId]
    return sourceCard && studyDeck.includes(sourceCard.deckId)
  }).length
}

/**
 * Get cards due for review (studyState === "learned" or "mastered", nextReviewDate <= now)
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {Array} Sorted by: most overdue first, then lower box number
 */
export function getDueCards(topicId = null) {
  const data = getData()
  const now = Date.now()

  const allDue = Object.values(data.flashcards || {})
    .filter(fc =>
      (fc.studyState === 'learned' || fc.studyState === 'mastered') &&
      fc.nextReviewDate &&
      fc.nextReviewDate <= now &&
      fc.status !== 'skipped'
    )
    .sort((a, b) => {
      // Most overdue first
      const overdueA = getDaysOverdue(a)
      const overdueB = getDaysOverdue(b)
      if (overdueA !== overdueB) return overdueB - overdueA
      // Then lower box first
      return (a.leitnerBox || 1) - (b.leitnerBox || 1)
    })

  if (topicId) {
    return filterByTopic(allDue, topicId, data)
  }
  return filterByStudyDeck(allDue, data)
}

/**
 * Get count of due cards
 * @param {string} topicId - Optional: filter by specific topic
 * @returns {number}
 */
export function getDueCardCount(topicId = null) {
  return getDueCards(topicId).length
}

/**
 * Get count of overdue cards (due before today)
 * @returns {number}
 */
export function getOverdueCardCount() {
  return getDueCards().filter(card => getDaysOverdue(card) > 0).length
}

/**
 * Get card counts by Leitner box (for progress display)
 * @returns {Object} { box1: n, box2: n, ..., box6: n, mastered: n, new: n, acquiring: n }
 */
export function getCardsByBox() {
  const data = getData()
  const studyDeck = data.studyDeck || []

  const counts = {
    box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0,
    mastered: 0, new: 0, acquiring: 0, total: 0
  }

  Object.values(data.flashcards || {}).forEach(fc => {
    // Filter by study deck
    const sourceCardId = fc.sourceCardId || ''
    const cardData = data.cards?.[sourceCardId]
    const inStudyDeck = studyDeck.length === 0 ||
      (cardData?.deckId && studyDeck.includes(cardData.deckId)) ||
      studyDeck.some(topicId => sourceCardId === topicId || sourceCardId.startsWith(topicId + '-'))

    if (!inStudyDeck || fc.status === 'skipped') return

    counts.total++

    if (fc.studyState === 'new') {
      counts.new++
    } else if (fc.studyState === 'acquiring') {
      counts.acquiring++
    } else if (fc.studyState === 'mastered') {
      counts.mastered++
      counts.box6++ // Mastered cards are in box 6
    } else if (fc.studyState === 'learned' && fc.leitnerBox) {
      const boxKey = `box${fc.leitnerBox}`
      if (counts[boxKey] !== undefined) {
        counts[boxKey]++
      }
    }
  })

  return counts
}

/**
 * Get next review time for learned/mastered cards
 * @returns {Date|null} Next review timestamp or null if no cards in SRS
 */
export function getNextReviewTime() {
  const data = getData()
  const studyDeck = data.studyDeck || []

  const inSRS = Object.values(data.flashcards || {})
    .filter(fc => {
      if (fc.studyState !== 'learned' && fc.studyState !== 'mastered') return false
      if (!fc.nextReviewDate) return false
      // Filter by study deck
      const sourceCardId = fc.sourceCardId || ''
      const cardData = data.cards?.[sourceCardId]
      return studyDeck.length === 0 ||
        (cardData?.deckId && studyDeck.includes(cardData.deckId)) ||
        studyDeck.some(topicId => sourceCardId === topicId || sourceCardId.startsWith(topicId + '-'))
    })
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate)

  return inSRS.length > 0 ? new Date(inSRS[0].nextReviewDate) : null
}

// ============================================================================
// ACQUISITION PHASE FUNCTIONS
// ============================================================================

/**
 * Start acquisition for a card (move from "new" to "acquiring")
 * @param {string} flashcardId - The flashcard ID
 */
export function startAcquisition(flashcardId) {
  const data = getData()
  if (data.flashcards && data.flashcards[flashcardId]) {
    data.flashcards[flashcardId] = {
      ...data.flashcards[flashcardId],
      studyState: 'acquiring',
      acquisitionCorrectStreak: 0,
      acquisitionTotalAttempts: 0,
      acquisitionLastSeen: Date.now()
    }
    saveData(data)
  }
}

/**
 * Record an acquisition attempt (Got it / Missed)
 * @param {string} flashcardId - The flashcard ID
 * @param {boolean} wasCorrect - Whether the user got it right
 * @returns {Object} { graduated: boolean, correctStreak: number, totalAttempts: number }
 */
export function recordAcquisitionAttempt(flashcardId, wasCorrect) {
  const data = getData()
  if (!data.flashcards || !data.flashcards[flashcardId]) {
    return { graduated: false, correctStreak: 0, totalAttempts: 0 }
  }

  const card = data.flashcards[flashcardId]
  let correctStreak = card.acquisitionCorrectStreak || 0
  let totalAttempts = (card.acquisitionTotalAttempts || 0) + 1

  if (wasCorrect) {
    correctStreak++
  } else {
    correctStreak = 0 // Reset on miss
  }

  // Check if graduated (3 correct in a row)
  const graduated = correctStreak >= ACQUISITION_CONFIG.correctStreakToGraduate

  if (graduated) {
    // Graduate to Leitner Box 1
    data.flashcards[flashcardId] = {
      ...card,
      studyState: 'learned',
      acquisitionCorrectStreak: correctStreak,
      acquisitionTotalAttempts: totalAttempts,
      acquisitionLastSeen: Date.now(),
      leitnerBox: 1,
      easeFactor: EASE_CONFIG.initial,
      nextReviewDate: getTomorrowMidnight(),
      lastReviewDate: null,
      reviewHistory: [],
      totalReviews: 0,
      correctStreak: 0,
      graduatedAt: Date.now()
    }
    console.log(`[recordAcquisitionAttempt] Card ${flashcardId} graduated to Box 1`)
  } else {
    data.flashcards[flashcardId] = {
      ...card,
      studyState: 'acquiring',
      acquisitionCorrectStreak: correctStreak,
      acquisitionTotalAttempts: totalAttempts,
      acquisitionLastSeen: Date.now()
    }
  }

  saveData(data)
  return { graduated, correctStreak, totalAttempts }
}

/**
 * Check if a card is "stuck" (took many attempts)
 * @param {Object} card - Flashcard object
 * @returns {boolean}
 */
export function isCardStuck(card) {
  return (card.acquisitionTotalAttempts || 0) > ACQUISITION_CONFIG.stuckThreshold
}

// ============================================================================
// RETENTION PHASE FUNCTIONS (Leitner + SM-2)
// ============================================================================

/**
 * Record a review attempt (Got it / Missed)
 * @param {string} flashcardId - The flashcard ID
 * @param {boolean} wasCorrect - Whether the user got it right
 * @returns {Object} { newBox: number, newInterval: number, easeFactor: number, mastered: boolean }
 */
export function recordReviewAttempt(flashcardId, wasCorrect) {
  const data = getData()
  if (!data.flashcards || !data.flashcards[flashcardId]) {
    return { newBox: 1, newInterval: 1, easeFactor: EASE_CONFIG.initial, mastered: false }
  }

  const card = data.flashcards[flashcardId]
  const currentBox = card.leitnerBox || 1
  const currentEase = card.easeFactor || EASE_CONFIG.initial
  let correctStreak = card.correctStreak || 0

  let newBox, newEase
  if (wasCorrect) {
    newBox = Math.min(currentBox + 1, 6)
    newEase = updateEaseFactor(currentEase, true)
    correctStreak++
  } else {
    newBox = 1 // Back to box 1 on miss (harsh but effective)
    newEase = updateEaseFactor(currentEase, false)
    correctStreak = 0
  }

  const newInterval = calculateInterval(newBox, newEase)
  const nextReviewDate = getNextReviewDate(newBox, newEase)

  // Check for mastery (box 6 with 3+ correct streak)
  const mastered = newBox === 6 && correctStreak >= 3

  // Add to review history
  const reviewEntry = {
    date: Date.now(),
    box: currentBox,
    wasCorrect,
    interval: newInterval
  }

  data.flashcards[flashcardId] = {
    ...card,
    studyState: mastered ? 'mastered' : 'learned',
    leitnerBox: newBox,
    easeFactor: newEase,
    nextReviewDate,
    lastReviewDate: Date.now(),
    reviewHistory: [...(card.reviewHistory || []), reviewEntry],
    totalReviews: (card.totalReviews || 0) + 1,
    correctStreak,
    masteredAt: mastered ? Date.now() : card.masteredAt
  }

  saveData(data)

  console.log(`[recordReviewAttempt] Card ${flashcardId}: Box ${currentBox} → ${newBox}, interval ${newInterval} days${mastered ? ' (MASTERED!)' : ''}`)

  return { newBox, newInterval, easeFactor: newEase, mastered }
}

// ============================================================================
// MIGRATION & COMPATIBILITY
// ============================================================================

/**
 * Migrate existing flashcards to new two-phase model
 * All existing cards become studyState: "new" (clean slate)
 */
export function migrateFlashcardsToNewModel() {
  const data = getData()
  if (!data.flashcards) return { migrated: 0 }

  let migrated = 0
  Object.keys(data.flashcards).forEach(id => {
    const fc = data.flashcards[id]
    // Only migrate if doesn't have studyState yet
    if (!fc.studyState) {
      data.flashcards[id] = {
        ...fc,
        studyState: 'new',
        acquisitionCorrectStreak: 0,
        acquisitionTotalAttempts: 0,
        acquisitionLastSeen: null,
        leitnerBox: 0,
        easeFactor: EASE_CONFIG.initial,
        nextReviewDate: null,
        lastReviewDate: null,
        reviewHistory: [],
        totalReviews: 0,
        correctStreak: 0,
        masteredAt: null,
        createdAt: fc.createdAt || Date.now()
      }
      migrated++
    }
  })

  if (migrated > 0) {
    saveData(data)
    console.log(`[migrateFlashcardsToNewModel] Migrated ${migrated} flashcards to new model`)
  }

  return { migrated }
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

  // Run migration on imported cards
  migrateFlashcardsToNewModel()
}

// Legacy function names for compatibility (will be removed later)
export function getLearningCards() { return getNewCards() }
export function getLearningCardCount() { return getNewCardCount() }
export function getReviewDueCards() { return getDueCards() }
export function getReviewDueCount() { return getDueCardCount() }
export function getNextLearnedReviewTime() { return getNextReviewTime() }
export function graduateFlashcard(id) { /* no-op, use recordAcquisitionAttempt */ }
export function graduateFlashcards(ids) { /* no-op */ }
export function updateLearningState(id, updates) {
  const data = getData()
  if (data.flashcards && data.flashcards[id]) {
    data.flashcards[id] = { ...data.flashcards[id], ...updates }
    saveData(data)
  }
}
export function startLearningCard(id) { startAcquisition(id) }
export function getStudyDeckLearningCards() { return getNewCards() }
export function getStudyDeckReviewDueCards() { return getDueCards() }

// ============================================================================
// STUDY STATS & STREAKS
// ============================================================================

/**
 * Get today's date as YYYY-MM-DD string (for streak tracking)
 */
function getTodayString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

/**
 * Get study stats (streaks, totals)
 * @returns {Object} Study statistics
 */
export function getStudyStats() {
  const data = getData()
  return data.studyStats || {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalCardsLearned: 0,
    totalReviews: 0,
    totalStudyDays: 0
  }
}

/**
 * Record study activity for today (updates streak)
 * Call this when user completes at least 1 card (learn or review)
 * @param {string} activityType - 'learn' or 'review'
 * @param {number} count - Number of cards completed
 */
export function recordStudyActivity(activityType, count = 1) {
  const data = getData()
  if (!data.studyStats) {
    data.studyStats = {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      totalCardsLearned: 0,
      totalReviews: 0,
      totalStudyDays: 0
    }
  }

  const today = getTodayString()
  const stats = data.studyStats

  // Update totals
  if (activityType === 'learn') {
    stats.totalCardsLearned = (stats.totalCardsLearned || 0) + count
  } else if (activityType === 'review') {
    stats.totalReviews = (stats.totalReviews || 0) + count
  }

  // Update streak
  if (stats.lastStudyDate !== today) {
    // Check if yesterday was studied (streak continues)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = yesterday.toISOString().split('T')[0]

    if (stats.lastStudyDate === yesterdayString) {
      // Streak continues
      stats.currentStreak = (stats.currentStreak || 0) + 1
    } else if (stats.lastStudyDate === null || stats.lastStudyDate < yesterdayString) {
      // Streak broken or first day
      stats.currentStreak = 1
    }
    // else: already studied today, don't increment

    stats.lastStudyDate = today
    stats.totalStudyDays = (stats.totalStudyDays || 0) + 1

    // Update longest streak
    if (stats.currentStreak > (stats.longestStreak || 0)) {
      stats.longestStreak = stats.currentStreak
    }
  }

  saveData(data)
  console.log(`[recordStudyActivity] ${activityType} +${count}, streak: ${stats.currentStreak}`)

  return stats
}

/**
 * Check and update streak (call on app load to handle missed days)
 * @returns {Object} Updated study stats
 */
export function checkAndUpdateStreak() {
  const data = getData()
  if (!data.studyStats) return getStudyStats()

  const stats = data.studyStats

  // If last study was before yesterday, streak is broken
  if (stats.lastStudyDate) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = yesterday.toISOString().split('T')[0]

    if (stats.lastStudyDate < yesterdayString) {
      stats.currentStreak = 0
      saveData(data)
      console.log(`[checkAndUpdateStreak] Streak broken (last study: ${stats.lastStudyDate})`)
    }
  }

  return stats
}

/**
 * Reset study stats (for testing)
 */
export function resetStudyStats() {
  const data = getData()
  data.studyStats = {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalCardsLearned: 0,
    totalReviews: 0,
    totalStudyDays: 0
  }
  saveData(data)
}

// ============================================================================
// SESSION STATE (for resume capability)
// ============================================================================

/**
 * Save acquisition session state (for resume if user leaves)
 * @param {Object} sessionState - { cardsInRotation: [...ids], progress: {...} }
 */
export function saveAcquisitionSession(sessionState) {
  const data = getData()
  data.acquisitionSession = {
    ...sessionState,
    savedAt: Date.now()
  }
  saveData(data)
}

/**
 * Load saved acquisition session
 * @returns {Object|null} Saved session or null
 */
export function loadAcquisitionSession() {
  const data = getData()
  return data.acquisitionSession || null
}

/**
 * Clear acquisition session (after completion)
 */
export function clearAcquisitionSession() {
  const data = getData()
  delete data.acquisitionSession
  saveData(data)
}

/**
 * Save review session state (for resume if user leaves)
 * @param {Object} sessionState - { remainingCardIds: [...ids], progress: {...} }
 */
export function saveReviewSession(sessionState) {
  const data = getData()
  data.reviewSession = {
    ...sessionState,
    savedAt: Date.now()
  }
  saveData(data)
}

/**
 * Load saved review session
 * @returns {Object|null} Saved session or null
 */
export function loadReviewSession() {
  const data = getData()
  return data.reviewSession || null
}

/**
 * Clear review session (after completion)
 */
export function clearReviewSession() {
  const data = getData()
  delete data.reviewSession
  saveData(data)
}

// ============================================================================
// SM-2 SPACED REPETITION ALGORITHM (Legacy - kept for reference)
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

    // Check for preview card (stored separately with ID `${deckId}-preview`)
    const previewId = `${deckId}-preview`
    const previewCard = data.cards[previewId]
    const hasPreview = !!previewCard
    const previewClaimed = previewCard?.claimed || false

    // Count claimed cards (tier cards + preview)
    const tierClaimedCount = deck.cardIds.filter(id => data.cards[id]?.claimed).length
    const claimedCount = tierClaimedCount + (previewClaimed ? 1 : 0)

    // Use expectedTotalCards if available (from outline), otherwise fallback to 8 (1 preview + 4 core + 3 deep_dive)
    const expectedTotal = deck.expectedTotalCards || 8
    // Current generated count (tier cards + preview if exists)
    const generatedCount = deck.cardIds.length + (hasPreview ? 1 : 0)

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

      // Get topic name - prefer stored name, fallback to tree node name
      const treeNode = nodeIndex.get(deckId)
      const topicName = (deck.name && deck.name !== deckId) ? deck.name : (treeNode?.name || treeNode?.title || deckId)

      inProgress.push({
        id: deckId,
        name: topicName,
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
        expectedTotal: deckData?.expectedTotalCards || 8,
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
