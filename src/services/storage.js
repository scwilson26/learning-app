/**
 * Storage service for persisting user data (cards, decks, claims)
 * Structured for future cloud sync - all data in one clean object
 */

const STORAGE_KEY = 'learning_app_data'

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
      rarity: 'common',  // Default, can be enhanced later
      claimed: false,
      claimedAt: null,
      generatedAt: now,
    }
  })

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
  Object.entries(deck.cardsByTier).forEach(([tier, cardIds]) => {
    if (cardIds && result[tier]) {
      result[tier].total = cardIds.length
      result[tier].claimed = cardIds.filter(id => data.cards[id]?.claimed).length
      result[tier].complete = result[tier].total > 0 && result[tier].claimed === result[tier].total
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
 * Pick a random wanderable deck
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

  // Pick a random deck, weighted slightly toward decks with more unclaimed cards
  // This makes exploration feel more rewarding
  const weighted = []
  candidates.forEach(deck => {
    // Add deck multiple times based on unclaimed count (1-3 times)
    const weight = Math.min(3, deck.unclaimedCount)
    for (let i = 0; i < weight; i++) {
      weighted.push(deck)
    }
  })

  const randomIndex = Math.floor(Math.random() * weighted.length)
  return weighted[randomIndex]
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
