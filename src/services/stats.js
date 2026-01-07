/**
 * Stats tracking service
 * Tracks user activity for achievements and engagement
 */

const STATS_KEY = 'userStats';

/**
 * Get default stats object
 */
function getDefaultStats() {
  return {
    // Lifetime counters
    totalArticlesRead: 0,
    totalHyperlinksClicked: 0,
    totalSurpriseMeClicks: 0,
    totalQuickCardsViewed: 0,

    // Depth tracking
    longestChainEver: 0,
    currentChainDepth: 0,
    totalChainsCompleted: 0,

    // Session tracking
    topicsThisSession: [],
    chainsThisSession: [],

    // Streak tracking
    lastActiveDate: null,
    currentStreak: 0,
    longestStreak: 0,
    daysActive: [],

    // Timestamps
    firstUseDate: null,
    lastUseDate: null,
  };
}

/**
 * Load stats from localStorage
 */
export function loadStats() {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return { ...getDefaultStats(), ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
  return getDefaultStats();
}

/**
 * Save stats to localStorage
 */
function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving stats:', e);
  }
}

/**
 * Get today's date as a string (YYYY-MM-DD)
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Update streak based on activity
 */
function updateStreak(stats) {
  const today = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  if (stats.lastActiveDate === today) {
    // Already active today, no change
    return stats;
  }

  if (stats.lastActiveDate === yesterdayString) {
    // Consecutive day - extend streak
    stats.currentStreak += 1;
  } else if (stats.lastActiveDate !== today) {
    // Streak broken - reset to 1
    stats.currentStreak = 1;
  }

  // Update longest streak
  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  // Track active days
  if (!stats.daysActive.includes(today)) {
    stats.daysActive.push(today);
  }

  stats.lastActiveDate = today;

  return stats;
}

/**
 * Record that an article was read
 */
export function recordArticleRead(topic, isDeepDive = false) {
  const stats = loadStats();

  // Set first use date if not set
  if (!stats.firstUseDate) {
    stats.firstUseDate = new Date().toISOString();
  }
  stats.lastUseDate = new Date().toISOString();

  // Update streak
  updateStreak(stats);

  // Increment total
  stats.totalArticlesRead += 1;

  // Track topic in session
  if (!stats.topicsThisSession.includes(topic)) {
    stats.topicsThisSession.push(topic);
  }

  // Track chain depth
  if (isDeepDive) {
    stats.currentChainDepth += 1;
    if (stats.currentChainDepth > stats.longestChainEver) {
      stats.longestChainEver = stats.currentChainDepth;
    }
  } else {
    // New chain started (Surprise Me or new search)
    if (stats.currentChainDepth > 0) {
      stats.chainsThisSession.push(stats.currentChainDepth);
      stats.totalChainsCompleted += 1;
    }
    stats.currentChainDepth = 1;
  }

  saveStats(stats);
  return stats;
}

/**
 * Record a hyperlink click
 */
export function recordHyperlinkClick() {
  const stats = loadStats();
  stats.totalHyperlinksClicked += 1;
  saveStats(stats);
  return stats;
}

/**
 * Record a Surprise Me click
 */
export function recordSurpriseMeClick() {
  const stats = loadStats();
  stats.totalSurpriseMeClicks += 1;
  saveStats(stats);
  return stats;
}

/**
 * Record a Quick Card view
 */
export function recordQuickCardView() {
  const stats = loadStats();
  stats.totalQuickCardsViewed += 1;
  saveStats(stats);
  return stats;
}

/**
 * Reset session stats (call when going back to home)
 */
export function resetSession() {
  const stats = loadStats();

  // Bank the current chain if any
  if (stats.currentChainDepth > 0) {
    stats.chainsThisSession.push(stats.currentChainDepth);
    stats.totalChainsCompleted += 1;
  }

  // Reset session data
  stats.topicsThisSession = [];
  stats.chainsThisSession = [];
  stats.currentChainDepth = 0;

  saveStats(stats);
  return stats;
}

/**
 * Get a summary for display
 */
export function getStatsSummary() {
  const stats = loadStats();
  return {
    totalArticles: stats.totalArticlesRead,
    currentStreak: stats.currentStreak,
    longestChain: stats.longestChainEver,
    hyperlinksClicked: stats.totalHyperlinksClicked,
  };
}

// ============ Journey Management ============

const JOURNEYS_KEY = 'savedJourneys';
const MAX_JOURNEYS = 5;

/**
 * Load saved journeys from localStorage
 */
export function loadJourneys() {
  try {
    const saved = localStorage.getItem(JOURNEYS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading journeys:', e);
  }
  return [];
}

/**
 * Save journeys to localStorage
 */
function saveJourneys(journeys) {
  try {
    localStorage.setItem(JOURNEYS_KEY, JSON.stringify(journeys));
  } catch (e) {
    console.error('Error saving journeys:', e);
  }
}

/**
 * Save the current journey
 * @param {Array} breadcrumbs - The breadcrumb data for the journey
 * @param {number} currentIndex - The current position in the journey
 * @returns {string} The journey ID
 */
export function saveJourney(breadcrumbs, currentIndex) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  const journeys = loadJourneys();
  const firstTopic = breadcrumbs[0]?.topic || 'Unknown';
  const now = new Date().toISOString();

  // Check if we already have a journey with the same first topic
  // If so, update it instead of creating a new one
  const existingIndex = journeys.findIndex(j => j.firstTopic === firstTopic);

  const journey = {
    id: existingIndex >= 0 ? journeys[existingIndex].id : `journey_${Date.now()}`,
    firstTopic,
    depth: breadcrumbs.length,
    breadcrumbs,
    currentIndex,
    startedAt: existingIndex >= 0 ? journeys[existingIndex].startedAt : now,
    lastVisitedAt: now,
  };

  if (existingIndex >= 0) {
    // Update existing journey
    journeys[existingIndex] = journey;
  } else {
    // Add new journey at the beginning
    journeys.unshift(journey);
  }

  // Keep only the most recent MAX_JOURNEYS
  const trimmedJourneys = journeys.slice(0, MAX_JOURNEYS);

  saveJourneys(trimmedJourneys);
  return journey.id;
}

/**
 * Get a journey by ID
 * @param {string} journeyId - The journey ID
 * @returns {Object|null} The journey data or null
 */
export function getJourney(journeyId) {
  const journeys = loadJourneys();
  return journeys.find(j => j.id === journeyId) || null;
}

/**
 * Delete a journey by ID
 * @param {string} journeyId - The journey ID to delete
 */
export function deleteJourney(journeyId) {
  const journeys = loadJourneys();
  const filtered = journeys.filter(j => j.id !== journeyId);
  saveJourneys(filtered);
}

/**
 * Update journey's lastVisitedAt when resuming
 * @param {string} journeyId - The journey ID
 */
export function touchJourney(journeyId) {
  const journeys = loadJourneys();
  const journey = journeys.find(j => j.id === journeyId);
  if (journey) {
    journey.lastVisitedAt = new Date().toISOString();
    // Move to front of list
    const filtered = journeys.filter(j => j.id !== journeyId);
    filtered.unshift(journey);
    saveJourneys(filtered);
  }
}
