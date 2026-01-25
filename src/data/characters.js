/**
 * Character Origins for The Void
 *
 * Each origin determines the player's starting 5 stars.
 * These are the first topics they can explore.
 */

export const CHARACTER_ORIGINS = {
  chronicler: {
    id: 'chronicler',
    name: 'Chronicler',
    prompt: 'the past',
    description: 'drawn to echoes of what came before',
    startingTopics: [
      'ancient_egypt',
      'ancient_rome',
      'world_war_ii',
      'renaissance',
      'industrial_revolution'
    ]
  },
  naturalist: {
    id: 'naturalist',
    name: 'Naturalist',
    prompt: 'living things',
    description: 'drawn to the pulse of life',
    startingTopics: [
      'evolution',
      'human_body',
      'dna',
      'cell',
      'natural_selection'
    ]
  },
  architect: {
    id: 'architect',
    name: 'Architect',
    prompt: 'how things work',
    description: 'drawn to structure and systems',
    startingTopics: [
      'physics',
      'mathematics',
      'engineering',
      'computer',
      'electricity'
    ]
  },
  philosopher: {
    id: 'philosopher',
    name: 'Philosopher',
    prompt: 'what it all means',
    description: 'drawn to deeper questions',
    startingTopics: [
      'philosophy',
      'consciousness',
      'ethics',
      'religion',
      'logic'
    ]
  },
  wanderer: {
    id: 'wanderer',
    name: 'Wanderer',
    prompt: "you're not sure",
    description: 'drawn to... something',
    startingTopics: null  // Random 5 topics
  }
}

/**
 * Get random starting topics for Wanderer origin
 */
export function getRandomStartingTopics(allTopicIds, count = 5) {
  const shuffled = [...allTopicIds].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Get starting topics for a character origin
 */
export function getStartingTopics(originId, allTopicIds) {
  const origin = CHARACTER_ORIGINS[originId]
  if (!origin) return []

  if (origin.startingTopics === null) {
    return getRandomStartingTopics(allTopicIds)
  }

  return origin.startingTopics
}
