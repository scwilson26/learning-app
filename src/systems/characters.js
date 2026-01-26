/**
 * REMEMBERER - Character System (Phase 9)
 *
 * The Archivist: Appears when user masters all stars in a cluster.
 * Reveals lore about that knowledge domain.
 * One-time appearance per cluster.
 */

import { getData, saveData } from '../services/storage'
import { STAR_STATES } from './starStates'

// ============================================================
// ARCHIVIST MESSAGES
// ============================================================

const ARCHIVIST_MESSAGES = {
  // Cluster-specific lore
  people: {
    title: 'The Archivist speaks...',
    messages: [
      '...you have mapped those who shaped the world',
      '...their stories now live within you',
      '...the great ones never truly fade',
    ],
    lore: 'This region holds the echoes of those who changed everything. Their light was borrowed from the stars themselves.',
  },
  history: {
    title: 'The Archivist speaks...',
    messages: [
      '...the past is now part of you',
      '...you carry what others forgot',
      '...time bends around those who remember',
    ],
    lore: 'What happened before shapes what comes next. You now hold the thread that connects them.',
  },
  geography: {
    title: 'The Archivist speaks...',
    messages: [
      '...you have mapped the shape of the world',
      '...every place leaves its mark',
      '...the earth remembers those who know it',
    ],
    lore: 'The land speaks to those who listen. Its secrets are now yours to keep.',
  },
  science: {
    title: 'The Archivist speaks...',
    messages: [
      '...you understand how things work',
      '...the laws of nature bow to knowledge',
      '...truth reveals itself to the persistent',
    ],
    lore: 'The universe follows rules. You have learned to read them.',
  },
  biology: {
    title: 'The Archivist speaks...',
    messages: [
      '...life in all its forms is now known to you',
      '...the living and the gone are connected',
      '...you carry the code of existence',
    ],
    lore: 'From the smallest cell to the greatest beast, all life shares a language. You speak it now.',
  },
  technology: {
    title: 'The Archivist speaks...',
    messages: [
      '...you understand what we have built',
      '...tools extend the reach of thought',
      '...innovation leaves permanent marks',
    ],
    lore: 'Every invention is a captured dream. This region holds humanity\'s ambitions made real.',
  },
  arts: {
    title: 'The Archivist speaks...',
    messages: [
      '...beauty has many forms. you know them now.',
      '...creation is the highest act',
      '...art outlives its makers',
    ],
    lore: 'What we create reveals what we are. This region holds the soul of civilization.',
  },
  philosophy_religion: {
    title: 'The Archivist speaks...',
    messages: [
      '...the deepest questions have been asked',
      '...meaning is found by those who seek',
      '...the spirit and mind are one',
    ],
    lore: 'Why are we here? What should we do? These questions echo through this region. You now carry possible answers.',
  },
  society: {
    title: 'The Archivist speaks...',
    messages: [
      '...you understand how we organize ourselves',
      '...systems shape behavior',
      '...power flows through invisible channels',
    ],
    lore: 'How we live together defines what we become. This region maps the structures of human cooperation.',
  },
  everyday_life: {
    title: 'The Archivist speaks...',
    messages: [
      '...the ordinary holds extraordinary depth',
      '...daily life is where meaning lives',
      '...the familiar is worth knowing',
    ],
    lore: 'Grand events make headlines, but daily life makes us. This region holds what truly matters.',
  },
  mathematics: {
    title: 'The Archivist speaks...',
    messages: [
      '...you speak the language of the universe',
      '...patterns underlie everything',
      '...numbers never lie',
    ],
    lore: 'Before there were words, there were patterns. Mathematics is the first language, and now you speak it.',
  },
}

// Fallback for unknown clusters
const DEFAULT_ARCHIVIST = {
  title: 'The Archivist speaks...',
  messages: [
    '...this region is now mapped',
    '...you carry what they left behind',
    '...it will not fade easily',
  ],
  lore: 'Knowledge gained is never truly lost. It becomes part of you.',
}

// ============================================================
// STATE TRACKING
// ============================================================

/**
 * Get character state from localStorage
 */
function getCharacterState() {
  const data = getData()
  return data.characters || {
    archivistShown: [],  // Cluster names where Archivist has appeared
    lastArchivistCluster: null,
    archivistCount: 0,
  }
}

/**
 * Save character state
 */
function saveCharacterState(state) {
  const data = getData()
  data.characters = state
  saveData(data)
}

/**
 * Check if Archivist has been shown for a cluster
 */
export function hasArchivistShown(clusterName) {
  const state = getCharacterState()
  return state.archivistShown?.includes(clusterName)
}

/**
 * Mark Archivist as shown for a cluster
 */
function markArchivistShown(clusterName) {
  const state = getCharacterState()
  if (!state.archivistShown) state.archivistShown = []
  if (!state.archivistShown.includes(clusterName)) {
    state.archivistShown.push(clusterName)
    state.lastArchivistCluster = clusterName
    state.archivistCount = (state.archivistCount || 0) + 1
  }
  saveCharacterState(state)
}

// ============================================================
// CLUSTER MASTERY DETECTION
// ============================================================

/**
 * Check if a cluster is fully mastered
 * @param {string} clusterName - Name of the cluster
 * @param {Array} allStars - All stars with their states
 * @returns {boolean} True if all stars in cluster are mastered
 */
export function isClusterMastered(clusterName, allStars) {
  const clusterStars = allStars.filter(star => star.cluster === clusterName)

  if (clusterStars.length === 0) return false

  // ALL stars must be mastered
  return clusterStars.every(star => star.state === STAR_STATES.mastered)
}

/**
 * Get cluster mastery progress
 * @param {string} clusterName - Name of the cluster
 * @param {Array} allStars - All stars with their states
 * @returns {Object} { total, mastered, percentage }
 */
export function getClusterProgress(clusterName, allStars) {
  const clusterStars = allStars.filter(star => star.cluster === clusterName)
  const masteredStars = clusterStars.filter(star => star.state === STAR_STATES.mastered)

  return {
    total: clusterStars.length,
    mastered: masteredStars.length,
    percentage: clusterStars.length > 0
      ? Math.round((masteredStars.length / clusterStars.length) * 100)
      : 0
  }
}

/**
 * Check for newly mastered clusters that haven't shown the Archivist
 * @param {Array} allStars - All stars with their states
 * @param {Object} clusters - Cluster definitions from constellation data
 * @returns {Object|null} { cluster, archivist } or null
 */
export function checkArchivistTrigger(allStars, clusters) {
  if (!clusters) return null

  for (const clusterName of Object.keys(clusters)) {
    // Skip if already shown
    if (hasArchivistShown(clusterName)) continue

    // Check if cluster is fully mastered
    if (isClusterMastered(clusterName, allStars)) {
      // Mark as shown
      markArchivistShown(clusterName)

      // Get archivist message
      const archivist = ARCHIVIST_MESSAGES[clusterName] || DEFAULT_ARCHIVIST
      const message = archivist.messages[Math.floor(Math.random() * archivist.messages.length)]

      console.log(`[Characters] Archivist triggered for cluster: ${clusterName}`)

      return {
        cluster: clusterName,
        title: archivist.title,
        message,
        lore: archivist.lore,
      }
    }
  }

  return null
}

// ============================================================
// DEBUG
// ============================================================

export function debugCharacters() {
  const state = getCharacterState()
  console.log('=== Characters Debug ===')
  console.log('Archivist shown for:', state.archivistShown || [])
  console.log('Last cluster:', state.lastArchivistCluster)
  console.log('Total appearances:', state.archivistCount || 0)
  return state
}

/**
 * Reset Archivist for a cluster (for testing)
 */
export function resetArchivistForCluster(clusterName) {
  const state = getCharacterState()
  if (state.archivistShown) {
    state.archivistShown = state.archivistShown.filter(c => c !== clusterName)
    saveCharacterState(state)
    console.log(`[Characters] Reset Archivist for cluster: ${clusterName}`)
  }
}
