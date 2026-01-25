/**
 * REMEMBERER - Progression System
 *
 * Tracks player ranks and unlocks story fragments at milestones.
 * The mystery unfolds slowly. Don't explain too much.
 */

// ============================================================
// RANKS
// ============================================================

export const RANKS = [
  { stars: 0, name: 'Unknown', description: 'you drift in the void' },
  { stars: 5, name: 'Navigator', description: 'you begin to see patterns' },
  { stars: 25, name: 'Surveyor', description: 'the connections multiply' },
  { stars: 100, name: 'Cartographer', description: 'you map what others forgot' },
  { stars: 250, name: 'Pathfinder', description: 'wormholes reveal themselves' },
  { stars: 500, name: 'Explorer', description: 'the void knows your name' },
  { stars: 1000, name: 'Archivist', description: 'nothing is forgotten' },
]

/**
 * Get the player's current rank based on stars mapped
 * @param {number} starsRevealed - Number of stars the player has revealed
 * @returns {Object} { name, description, nextRank, starsToNext }
 */
export function getRank(starsRevealed) {
  let currentRank = RANKS[0]
  let nextRank = RANKS[1]

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (starsRevealed >= RANKS[i].stars) {
      currentRank = RANKS[i]
      nextRank = RANKS[i + 1] || null
      break
    }
  }

  return {
    ...currentRank,
    nextRank: nextRank?.name || null,
    starsToNext: nextRank ? nextRank.stars - starsRevealed : 0,
  }
}

// ============================================================
// STORY FRAGMENTS
// ============================================================

export const STORY_FRAGMENTS = [
  {
    id: 'first_hint',
    trigger: { type: 'stars', count: 50 },
    content: `> ...you're starting to see it, aren't you?`,
  },
  {
    id: 'log_001',
    trigger: { type: 'stars', count: 100 },
    title: 'LOG FRAGMENT 001',
    content: `...the patterns are everywhere. Mathematics in music.
Physics in philosophy. It's all one thing.
How did we forget?`,
  },
  {
    id: 'log_002',
    trigger: { type: 'stars', count: 150 },
    title: 'LOG FRAGMENT 002',
    content: `...I've been mapping for what feels like years.
The connections keep multiplying.
Every star leads to ten more.`,
  },
  {
    id: 'log_003',
    trigger: { type: 'stars', count: 200 },
    title: 'LOG FRAGMENT 003',
    content: `...the void isn't empty. It's hungry.
It wants us to forget. That's its purpose.
But why?`,
  },
  {
    id: 'wormhole_first',
    trigger: { type: 'wormholes', count: 1 },
    content: `> ...how did you not see this before?`,
  },
  {
    id: 'wormhole_five',
    trigger: { type: 'wormholes', count: 5 },
    title: 'LOG FRAGMENT 007',
    content: `...the wormholes aren't random.
Someone placed them here. Or something.
Each one feels... intentional.`,
  },
  {
    id: 'log_012',
    trigger: { type: 'stars', count: 250 },
    title: 'LOG FRAGMENT 012',
    content: `...I used to think the void was the enemy.
Now I'm not sure.
Maybe forgetting is just... rest.

But I can't stop. Not yet.
There's something at the center.
I can feel it.`,
  },
  {
    id: 'wormhole_ten',
    trigger: { type: 'wormholes', count: 10 },
    content: `> ...the pattern is emerging`,
  },
  {
    id: 'halfway',
    trigger: { type: 'stars', count: 500 },
    title: 'LOG FRAGMENT 023',
    content: `...whoever you are, reading this:
Don't trust the silence.
The void remembers everything we try to forget.

And it's patient.`,
  },
]

/**
 * Check if any story fragments should be shown
 * @param {Object} voidProgress - The player's void progress
 * @param {string[]} shownFragments - IDs of fragments already shown
 * @returns {Object|null} The fragment to show, or null
 */
export function checkForStoryFragment(voidProgress, shownFragments = []) {
  const starsRevealed = voidProgress.starsRevealed || 0
  const wormholesFound = voidProgress.unlockedWormholes?.length || 0

  for (const fragment of STORY_FRAGMENTS) {
    // Skip if already shown
    if (shownFragments.includes(fragment.id)) continue

    // Check trigger
    if (fragment.trigger.type === 'stars' && starsRevealed >= fragment.trigger.count) {
      return fragment
    }
    if (fragment.trigger.type === 'wormholes' && wormholesFound >= fragment.trigger.count) {
      return fragment
    }
  }

  return null
}

// ============================================================
// SYSTEM MESSAGES
// ============================================================

export const SYSTEM_MESSAGES = {
  calibrating: '...calibrating',
  signalDetected: '...signal detected',
  signalsDetected: (n) => `...${n} new signals detected`,
  fragmentCaptured: '...captured',
  anomalyDetected: '...anomaly detected',
  fragmentsFading: (n) => `${n} fragments fading`,
  connectionFound: '...connection found',
}

// ============================================================
// STATS
// ============================================================

/**
 * Get player statistics for display
 * @param {Object} voidProgress - The player's void progress
 * @returns {Object} Stats object
 */
export function getPlayerStats(voidProgress) {
  const starsRevealed = voidProgress.starsRevealed || 0
  const fragmentsCaptured = voidProgress.fragmentsCaptured || 0
  const wormholesFound = voidProgress.unlockedWormholes?.length || 0
  const topicsExplored = Object.keys(voidProgress.topicProgress || {}).length

  return {
    starsRevealed,
    fragmentsCaptured,
    wormholesFound,
    topicsExplored,
    rank: getRank(starsRevealed),
  }
}
