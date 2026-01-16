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
    emoji: pickEmojiForTopic(child.title),
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
    emoji: pickEmojiForTopic(node.title),
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
export function getTreeCategories() {
  if (!vitalArticlesTree.children) return []

  return vitalArticlesTree.children.map(cat => ({
    id: cat.id,
    name: cat.title,
    title: cat.title,
    articleCount: cat.articleCount || 0,
    emoji: pickEmojiForTopic(cat.title),
  }))
}

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
    emoji: pickEmojiForTopic(currentNode.title),
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
      emoji: pickEmojiForTopic(currentNode.title),
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
      emoji: pickEmojiForTopic(currentNode.title),
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
 * @returns {Object} { path: [...ids], steps: [{id, name, emoji}...], destination: nodeInfo }
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

/**
 * Pick an appropriate emoji for a topic
 * @param {string} topic - The topic name
 * @returns {string} An emoji
 */
function pickEmojiForTopic(topic) {
  const lower = topic.toLowerCase()

  // People categories
  if (/scientist|inventor|physicist|chemist|biologist/.test(lower)) return '🔬'
  if (/mathematician|math/.test(lower)) return '🔢'
  if (/artist|painter|sculptor/.test(lower)) return '🎨'
  if (/musician|composer|music/.test(lower)) return '🎵'
  if (/writer|poet|author|novel/.test(lower)) return '✍️'
  if (/philosopher|philosophy/.test(lower)) return '🤔'
  if (/leader|president|king|queen|emperor|politician/.test(lower)) return '👑'
  if (/explorer|adventurer/.test(lower)) return '🧭'
  if (/athlete|sport/.test(lower)) return '🏆'
  if (/actor|entertainer|film/.test(lower)) return '🎬'

  // Science categories
  if (/physics|quantum|relativity|mechanics/.test(lower)) return '⚛️'
  if (/chemistry|chemical|element/.test(lower)) return '🧪'
  if (/biology|life|organism|animal|plant/.test(lower)) return '🧬'
  if (/astronomy|space|star|planet|galaxy/.test(lower)) return '🌌'
  if (/earth|geology|climate|weather/.test(lower)) return '🌍'
  if (/medicine|health|disease/.test(lower)) return '🏥'

  // History categories
  if (/ancient|classical|empire|civilization/.test(lower)) return '🏛️'
  if (/medieval|middle age/.test(lower)) return '🏰'
  if (/war|military|battle|conflict/.test(lower)) return '⚔️'
  if (/revolution|political/.test(lower)) return '✊'
  if (/modern|contemporary|20th|21st/.test(lower)) return '🕐'

  // Geography categories
  if (/country|nation/.test(lower)) return '🗺️'
  if (/city|capital/.test(lower)) return '🏙️'
  if (/mountain|volcano/.test(lower)) return '🏔️'
  if (/river|lake|water/.test(lower)) return '💧'
  if (/ocean|sea|marine/.test(lower)) return '🌊'
  if (/island|archipelago/.test(lower)) return '🏝️'

  // Arts categories
  if (/architecture|building|monument/.test(lower)) return '🏗️'
  if (/literature|book|written/.test(lower)) return '📚'
  if (/visual|painting|art/.test(lower)) return '🖼️'
  if (/dance|ballet|performance/.test(lower)) return '💃'
  if (/theater|drama|play/.test(lower)) return '🎭'

  // Technology categories
  if (/computer|software|internet/.test(lower)) return '💻'
  if (/engineering|machine/.test(lower)) return '⚙️'
  if (/transport|vehicle|aircraft/.test(lower)) return '🚀'
  if (/communication|media/.test(lower)) return '📡'

  // Society categories
  if (/economic|money|business/.test(lower)) return '💰'
  if (/law|legal|justice/.test(lower)) return '⚖️'
  if (/language|linguistic/.test(lower)) return '🗣️'
  if (/education|university/.test(lower)) return '🎓'
  if (/religion|spiritual|faith/.test(lower)) return '🙏'

  // Everyday categories
  if (/food|cuisine|cooking/.test(lower)) return '🍽️'
  if (/game|play|recreation/.test(lower)) return '🎮'
  if (/holiday|festival|celebration/.test(lower)) return '🎉'

  // Top-level fallbacks
  if (lower === 'people') return '👥'
  if (lower === 'biology') return '🧬'
  if (lower === 'geography') return '🌍'
  if (lower === 'physics') return '⚛️'
  if (lower === 'society') return '🏛️'
  if (lower === 'technology') return '💻'
  if (lower === 'arts') return '🎨'
  if (lower === 'history') return '📜'
  if (lower === 'everyday') return '🏠'
  if (lower === 'philosophy') return '🤔'
  if (lower === 'mathematics') return '🔢'

  // Default
  return '📖'
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
 * Check if a deck's cards have been generated and cached
 * @param {string} deckId - The deck ID to check
 * @returns {boolean} True if deck has cached cards
 */
export function hasDeckCards(deckId) {
  const data = getData()
  return !!data.decks[deckId]?.cardIds?.length
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
      title: card.title,
      content: card.content || null,
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
export function saveDeckCards(deckId, deckName, cards, tier = 'core') {
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
  }

  // Save individual cards with tier info
  cards.forEach((card, index) => {
    data.cards[card.id] = {
      id: card.id,
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
 */
export function saveStreamedCard(deckId, deckName, card, tier) {
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

  // Add card ID to deck if not already there
  if (!data.decks[deckId].cardIds.includes(card.id)) {
    data.decks[deckId].cardIds.push(card.id)
  }

  // Add to cardsByTier if not already there
  if (!data.decks[deckId].cardsByTier) {
    data.decks[deckId].cardsByTier = { core: [], deep_dive_1: [], deep_dive_2: [] }
  }
  if (!data.decks[deckId].cardsByTier[tier].includes(card.id)) {
    data.decks[deckId].cardsByTier[tier].push(card.id)
  }

  // Save the card (preserve claimed status if already exists)
  const existingCard = data.cards[card.id]
  data.cards[card.id] = {
    id: card.id,
    deckId: deckId,
    title: card.title,
    content: card.content || null,
    tier: tier,
    tierIndex: card.tierIndex,
    number: card.number,
    rarity: 'common',
    claimed: existingCard?.claimed || false,  // Preserve claimed status!
    claimedAt: existingCard?.claimedAt || null,
    generatedAt: now,
  }

  saveData(data)
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

  if (data.cards[cardId]) {
    data.cards[cardId].claimed = true
    data.cards[cardId].claimedAt = new Date().toISOString()
    saveData(data)
    console.log(`[claimCard] ✅ Claimed card ${cardId}`)
  } else {
    // Card doesn't exist yet in localStorage - this can happen during streaming
    // Create a minimal entry so the claim is persisted
    console.warn(`[claimCard] ⚠️ Card ${cardId} not in localStorage yet, creating stub entry`)
    data.cards[cardId] = {
      id: cardId,
      claimed: true,
      claimedAt: new Date().toISOString(),
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

/**
 * Claim all ancestor category nodes in a path
 * @param {Array} path - Array of node IDs from root to current
 * @param {Function} getNodeInfo - Function to get node title by ID
 * @returns {number} Number of newly claimed nodes
 */
export function claimAncestorCategories(path, getNodeInfo) {
  let newlyClaimed = 0

  // Claim each node in the path (except possibly the last one if it's an article)
  for (const nodeId of path) {
    const nodeInfo = getNodeInfo(nodeId)
    if (nodeInfo && claimCategoryNode(nodeId, nodeInfo.title)) {
      newlyClaimed++
      console.log(`[claimAncestorCategories] Auto-claimed category: ${nodeInfo.title}`)
    }
  }

  return newlyClaimed
}

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
      title: card.title,
      content: card.content || null,
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
    deep_dive_1: { claimed: 0, total: 0, complete: false },
    deep_dive_2: { claimed: 0, total: 0, complete: false },
  }

  if (!deck?.cardsByTier) {
    return result
  }

  // Count claimed cards per tier
  // Each tier has exactly 5 cards - only complete when all 5 are claimed
  Object.entries(deck.cardsByTier).forEach(([tier, cardIds]) => {
    if (cardIds && result[tier]) {
      result[tier].total = cardIds.length
      result[tier].claimed = cardIds.filter(id => data.cards[id]?.claimed).length
      // Tier is only complete when all 5 cards exist AND all 5 are claimed
      result[tier].complete = result[tier].total === 5 && result[tier].claimed === 5
    }
  })

  return result
}

/**
 * Check if a tier is accessible (prior tier must be complete)
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier to check access for
 * @returns {boolean} True if tier is accessible
 */
export function canAccessTier(deckId, tier) {
  if (tier === 'core') return true

  const completion = getDeckTierCompletion(deckId)

  if (tier === 'deep_dive_1') {
    return completion.core.complete
  }

  if (tier === 'deep_dive_2') {
    return completion.core.complete && completion.deep_dive_1.complete
  }

  return false
}

/**
 * Check if a tier has been generated for a deck
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier to check
 * @returns {boolean} True if tier has been generated
 */
export function hasTierCards(deckId, tier) {
  const data = getData()
  const deck = data.decks[deckId]
  return !!(deck?.cardsByTier?.[tier]?.length > 0)
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
 * Check if a tier is unlocked for a deck
 * @param {string} deckId - The deck ID
 * @param {string} tier - The tier to check
 * @returns {boolean} True if tier is unlocked
 */
export function isTierUnlocked(deckId, tier) {
  if (tier === 'core') return true

  const data = getData()
  const deck = data.decks[deckId]
  return deck?.unlockedTiers?.includes(tier) || false
}

/**
 * Get the overall completion state of a deck
 * @param {string} deckId - The deck ID
 * @returns {string} Completion state: 'none' | 'core_complete' | 'deep_dive_1_complete' | 'fully_mastered'
 */
export function getDeckCompletionState(deckId) {
  const completion = getDeckTierCompletion(deckId)

  if (completion.deep_dive_2.complete) {
    return 'fully_mastered'
  }
  if (completion.deep_dive_1.complete) {
    return 'deep_dive_1_complete'
  }
  if (completion.core.complete) {
    return 'core_complete'
  }
  return 'none'
}

/**
 * Get total claimed card count
 * @returns {number} Number of claimed cards
 */
export function getClaimedCount() {
  const data = getData()
  return Object.values(data.cards).filter(c => c.claimed).length
}

/**
 * Set user archetype (from personality quiz)
 * @param {string} archetype - The archetype ID
 */
export function setUserArchetype(archetype) {
  const data = getData()
  data.userProfile.archetype = archetype
  if (!data.userProfile.createdAt) {
    data.userProfile.createdAt = new Date().toISOString()
  }
  saveData(data)
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
 * Check if a deck's children have been generated
 * @param {string} deckId - The deck ID
 * @returns {boolean} True if children have been generated (even if empty/leaf)
 */
export function hasDeckChildren(deckId) {
  const data = getData()
  return data.dynamicDecks[deckId]?.childrenGenerated === true
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
          emoji: child.emoji,
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

/**
 * Export data for cloud sync (returns the full object)
 * @returns {Object} The complete data object
 */
export function exportForSync() {
  return getData()
}

/**
 * Get count of explored decks (decks with generated cards)
 * Used to determine if we should generate new paths or use existing ones
 * @returns {number} Count of explored decks
 */
export function getExploredDecksCount() {
  const data = getData()
  return Object.keys(data.decks).length
}

/**
 * Get all decks that have cards with at least one unclaimed card
 * Used for the Wander feature to find interesting destinations
 * @param {string} currentDeckId - The current deck ID to exclude
 * @param {number} minDepth - Minimum depth (default 2)
 * @param {number} maxDepth - Maximum depth (default 6)
 * @returns {Array} Array of wanderable deck objects with unclaimed card info
 */
export function getWanderableDecks(currentDeckId = null, minDepth = 2, maxDepth = 6) {
  const data = getData()
  const wanderable = []

  // Check regular decks (from data.decks) - these have generated cards
  Object.entries(data.decks).forEach(([deckId, deck]) => {
    // Skip current deck
    if (deckId === currentDeckId) return

    // Get the deck's depth from dynamicDecks or estimate from parentPath
    const dynamicDeck = data.dynamicDecks?.[deckId]
    let depth = dynamicDeck?.depth || 2

    // If no depth info, try to estimate from parentPath
    if (!dynamicDeck?.depth && dynamicDeck?.parentPath) {
      depth = dynamicDeck.parentPath.split(' > ').length + 1
    }

    // Check depth constraints
    if (depth < minDepth || depth > maxDepth) return

    // IMPORTANT: Only wander to article pages, not category pages
    // Check multiple sources to determine if this is an article:
    // 1. dynamicDeck has wikiTitle or isLeaf
    // 2. Tree node has wikiTitle or is a leaf (no children)
    const treeNode = getTreeNode(deckId)
    const isArticle =
      dynamicDeck?.wikiTitle ||
      dynamicDeck?.isLeaf ||
      treeNode?.wikiTitle ||
      (treeNode && (!treeNode.children || treeNode.children.length === 0))
    if (!isArticle) return

    // Check if deck has cards
    if (!deck.cardIds?.length) return

    // Count unclaimed cards
    const unclaimedCards = deck.cardIds.filter(cardId => {
      const card = data.cards[cardId]
      return card && !card.claimed
    })

    // Must have at least one unclaimed card
    if (unclaimedCards.length === 0) return

    // Get the first unclaimed card
    const firstUnclaimedId = unclaimedCards[0]
    const firstUnclaimedCard = data.cards[firstUnclaimedId]

    wanderable.push({
      deckId,
      deckName: deck.name || dynamicDeck?.name || deckId,
      depth,
      unclaimedCount: unclaimedCards.length,
      totalCards: deck.cardIds.length,
      firstUnclaimedCardId: firstUnclaimedId,
      firstUnclaimedCardTitle: firstUnclaimedCard?.title,
      parentPath: dynamicDeck?.parentPath || null,
      gradient: dynamicDeck?.gradient,
      borderColor: dynamicDeck?.borderColor,
      emoji: dynamicDeck?.emoji,
    })
  })

  return wanderable
}

/**
 * Pick a random wanderable deck with interest-based scoring
 * @param {string} currentDeckId - The current deck ID to exclude
 * @returns {Object|null} A random wanderable deck or null if none available
 */
export function pickRandomWanderDeck(currentDeckId = null) {
  // First try with preferred depth (3-5 levels - not too shallow, not too deep)
  let candidates = getWanderableDecks(currentDeckId, 3, 5)

  // Fallback: relax depth constraints (2-7 levels)
  if (candidates.length === 0) {
    candidates = getWanderableDecks(currentDeckId, 2, 7)
  }

  // Still nothing? Try any depth
  if (candidates.length === 0) {
    candidates = getWanderableDecks(currentDeckId, 1, 10)
  }

  if (candidates.length === 0) {
    return null
  }

  // Score each candidate for interestingness
  const scored = candidates.map(deck => ({
    ...deck,
    interestScore: scoreTopicInterestForWander({
      id: deck.deckId,
      title: deck.deckName,
      wikiTitle: deck.wikiTitle
    })
  }))

  // Sort by interest score (highest first)
  scored.sort((a, b) => b.interestScore - a.interestScore)

  // Pick randomly from top 5 (or all if fewer) to add variety
  const topCandidates = scored.slice(0, Math.min(5, scored.length))
  const randomIndex = Math.floor(Math.random() * topCandidates.length)
  return topCandidates[randomIndex]
}

/**
 * Import data from cloud sync
 * @param {Object} cloudData - Data from cloud
 * @param {string} strategy - Merge strategy: 'replace' | 'merge'
 */
export function importFromSync(cloudData, strategy = 'replace') {
  if (strategy === 'replace') {
    saveData(cloudData)
  } else if (strategy === 'merge') {
    const localData = getData()

    // Merge cards - keep newer versions
    Object.entries(cloudData.cards || {}).forEach(([id, cloudCard]) => {
      const localCard = localData.cards[id]
      if (!localCard || new Date(cloudCard.generatedAt) > new Date(localCard.generatedAt)) {
        localData.cards[id] = cloudCard
      }
      // If local is claimed but cloud isn't, keep claimed status
      if (localCard?.claimed && !cloudCard.claimed) {
        localData.cards[id].claimed = true
        localData.cards[id].claimedAt = localCard.claimedAt
      }
    })

    // Merge decks
    Object.entries(cloudData.decks || {}).forEach(([id, cloudDeck]) => {
      const localDeck = localData.decks[id]
      if (!localDeck || new Date(cloudDeck.generatedAt) > new Date(localDeck.generatedAt)) {
        localData.decks[id] = cloudDeck
      }
    })

    // Keep user profile from whichever is newer
    if (cloudData.userProfile?.createdAt &&
        (!localData.userProfile?.createdAt ||
         new Date(cloudData.userProfile.createdAt) < new Date(localData.userProfile.createdAt))) {
      localData.userProfile = cloudData.userProfile
    }

    saveData(localData)
  }
}
