/**
 * REMEMBERER - Wormhole Detection System
 * 
 * Wormholes connect topics from DIFFERENT clusters that share 2+ concepts.
 * When a user claims 4 cards in a topic, its wormholes are revealed.
 */

// ============================================================
// CORE DETECTION
// ============================================================

/**
 * Detect all wormholes in the constellation
 * @param {Object} topics - The topics object from constellation data
 * @param {number} minShared - Minimum shared concepts (default 2)
 * @returns {Array} Array of wormhole objects
 */
function detectAllWormholes(topics, minShared = 2) {
  const wormholes = [];
  const topicIds = Object.keys(topics);
  
  for (let i = 0; i < topicIds.length; i++) {
    for (let j = i + 1; j < topicIds.length; j++) {
      const id1 = topicIds[i];
      const id2 = topicIds[j];
      const t1 = topics[id1];
      const t2 = topics[id2];
      
      // Skip same cluster — not a wormhole
      if (t1.cluster === t2.cluster) continue;
      
      // Find shared concepts
      const shared = t1.concepts.filter(c => t2.concepts.includes(c));
      
      if (shared.length >= minShared) {
        wormholes.push({
          id: [id1, id2].sort().join('|'),
          endpoints: [
            { topicId: id1, name: t1.name, cluster: t1.cluster, x: t1.x, y: t1.y },
            { topicId: id2, name: t2.name, cluster: t2.cluster, x: t2.x, y: t2.y }
          ],
          sharedConcepts: shared,
          strength: shared.length,
          name: generateWormholeName(t1, t2, shared)
        });
      }
    }
  }
  
  wormholes.sort((a, b) => b.strength - a.strength);
  return wormholes;
}

/**
 * Get wormholes connected to a specific topic
 */
function getWormholesForTopic(topicId, allWormholes) {
  return allWormholes
    .filter(w => w.endpoints.some(e => e.topicId === topicId))
    .map(w => {
      // Put the requested topic first
      const from = w.endpoints.find(e => e.topicId === topicId);
      const to = w.endpoints.find(e => e.topicId !== topicId);
      return { ...w, from, to };
    });
}


// ============================================================
// NAMING
// ============================================================

const SPECIAL_NAMES = {
  'ancient_egypt|mathematics': 'The Mathematics of the Pyramids',
  'ancient_egypt|astronomy': 'Measuring the Heavens',
  'ancient_egypt|architecture': 'Monuments to Eternity',
  'ancient_greece|democracy': 'The Birthplace of Democracy',
  'ancient_greece|philosophy': 'The Athenian School',
  'ancient_rome|christianity': 'How a Cult Conquered an Empire',
  'ancient_rome|engineering': 'Roads That Built an Empire',
  'albert_einstein|relativity': 'Bending Space and Time',
  'charles_darwin|evolution': 'The Origin of Species',
  'isaac_newton|gravity': 'The Falling Apple',
  'world_war_ii|nuclear_power': 'The Manhattan Project',
  'industrial_revolution|steam_engine': 'The Age of Machines',
  'renaissance|printing_press': 'The Gutenberg Revolution',
  'music|mathematics': 'The Hidden Harmonies',
  'quantum_mechanics|philosophy': 'The Observer Problem',
  'evolution|dna': 'Darwin Meets DNA',
};

const CONCEPT_TEMPLATES = {
  war: 'Echoes of Battle',
  conquest: 'The Path of Conquerors',
  revolution: 'Seeds of Change',
  power: 'The Weight of Power',
  religion: 'Paths to the Divine',
  philosophy: 'Deeper Meanings',
  science: 'The Scientific Thread',
  mathematics: 'The Numbers Behind',
  art: 'The Creative Bridge',
  trade: 'Routes of Exchange',
  empire: 'Imperial Echoes',
  culture: 'Cultural Crossroads',
  death: 'Mortality and Meaning',
  life: 'The Living Connection',
  beauty: 'Forms of Beauty',
  freedom: 'The Cry for Freedom',
  nature: 'Laws of Nature',
  transformation: 'The Great Change',
  ancient: 'Echoes of Antiquity',
  legacy: 'What Remains',
  genius: 'Minds Alike',
  invention: 'Sparks of Innovation',
};

function generateWormholeName(topic1, topic2, sharedConcepts) {
  // Check for special hand-crafted names
  const key = [topic1.name.toLowerCase().replace(/ /g, '_'), 
               topic2.name.toLowerCase().replace(/ /g, '_')].sort().join('|');
  
  // Try variations
  for (const [specialKey, name] of Object.entries(SPECIAL_NAMES)) {
    if (key.includes(specialKey.split('|')[0]) && key.includes(specialKey.split('|')[1])) {
      return name;
    }
  }
  
  // Use concept-based template
  const priority = ['transformation', 'revolution', 'war', 'conquest', 'death', 
                    'freedom', 'beauty', 'philosophy', 'religion', 'science',
                    'mathematics', 'art', 'power', 'empire', 'trade', 'culture',
                    'nature', 'life', 'ancient', 'legacy', 'genius', 'invention'];
  
  for (const concept of priority) {
    if (sharedConcepts.includes(concept) && CONCEPT_TEMPLATES[concept]) {
      return CONCEPT_TEMPLATES[concept];
    }
  }
  
  // Fallback: use first shared concept
  const c = sharedConcepts[0];
  return `The ${c.charAt(0).toUpperCase() + c.slice(1)} Connection`;
}


// ============================================================
// USER PROGRESS
// ============================================================

const CARDS_TO_UNLOCK = 4;

/**
 * Check if a wormhole is unlocked for a user
 */
function isWormholeUnlocked(wormhole, userProgress) {
  // Already explicitly unlocked
  if (userProgress.unlockedWormholes?.includes(wormhole.id)) {
    return true;
  }
  
  // Check card count at either endpoint
  for (const endpoint of wormhole.endpoints) {
    const cards = userProgress.topicProgress?.[endpoint.topicId]?.claimedCards || 0;
    if (cards >= CARDS_TO_UNLOCK) return true;
  }
  
  return false;
}

/**
 * Check for newly unlocked wormholes when a card is claimed
 * @returns {Array} Newly unlocked wormholes (for animation trigger)
 */
function checkNewWormholes(topicId, newCardCount, allWormholes, userProgress) {
  // Only trigger on the threshold
  if (newCardCount !== CARDS_TO_UNLOCK) return [];
  
  const connected = getWormholesForTopic(topicId, allWormholes);
  return connected.filter(w => !userProgress.unlockedWormholes?.includes(w.id));
}

/**
 * Get all currently visible wormholes for a user
 */
function getVisibleWormholes(allWormholes, userProgress) {
  return allWormholes.filter(w => isWormholeUnlocked(w, userProgress));
}


// ============================================================
// POSITIONING
// ============================================================

/**
 * Calculate portal position at the edge of a cluster
 */
function getWormholePortalPosition(wormhole, fromTopicId, clusters) {
  const from = wormhole.endpoints.find(e => e.topicId === fromTopicId);
  const to = wormhole.endpoints.find(e => e.topicId !== fromTopicId);
  
  const fromCluster = clusters[from.cluster];
  const toCluster = clusters[to.cluster];
  
  // Angle toward destination cluster
  const angle = Math.atan2(toCluster.y - fromCluster.y, toCluster.x - fromCluster.x);
  
  // Place at cluster edge + offset
  return {
    x: fromCluster.x + Math.cos(angle) * (fromCluster.radius + 30),
    y: fromCluster.y + Math.sin(angle) * (fromCluster.radius + 30),
    angle: angle
  };
}


// ============================================================
// MAIN INIT
// ============================================================

/**
 * Initialize wormhole system with constellation data
 * Call once at app startup
 */
function initWormholes(constellationData) {
  const { topics, clusters } = constellationData;
  const all = detectAllWormholes(topics);
  
  console.log(`[Wormholes] Found ${all.length} cross-cluster connections`);
  
  return {
    all,
    forTopic: (id) => getWormholesForTopic(id, all),
    visible: (progress) => getVisibleWormholes(all, progress),
    checkNew: (topicId, cards, progress) => checkNewWormholes(topicId, cards, all, progress),
    isUnlocked: (w, progress) => isWormholeUnlocked(w, progress),
    portalPosition: (w, fromId) => getWormholePortalPosition(w, fromId, clusters),
    
    stats: () => ({
      total: all.length,
      strong: all.filter(w => w.strength >= 4).length,
      medium: all.filter(w => w.strength === 3).length,
      weak: all.filter(w => w.strength === 2).length,
    })
  };
}


// ============================================================
// EXPORTS
// ============================================================

export {
  detectAllWormholes,
  getWormholesForTopic,
  generateWormholeName,
  isWormholeUnlocked,
  checkNewWormholes,
  getVisibleWormholes,
  getWormholePortalPosition,
  initWormholes
}
