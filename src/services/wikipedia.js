/**
 * Wikipedia API service for fetching real topic names and structure
 * Uses Wikipedia's category system to get specific, recognizable topics
 */

import Anthropic from '@anthropic-ai/sdk'
import vitalArticles from '../data/vitalArticles.json'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
})

// Wikipedia category mappings for our topics
// Maps our deck IDs to Wikipedia category names
const WIKIPEDIA_CATEGORY_MAP = {
  // ============================================================================
  // LEGACY MAPPINGS (original hardcoded subcategories)
  // ============================================================================

  // History (legacy)
  'ancient': 'Ancient_history',
  'egypt': 'Ancient_Egypt',
  'rome': 'Ancient_Rome',
  'greece': 'Ancient_Greece',
  'persia': 'Achaemenid_Empire',
  'china-ancient': 'Ancient_China',
  'mesopotamia': 'Mesopotamia',
  'maya': 'Maya_civilization',
  'medieval': 'Middle_Ages',
  'renaissance': 'Renaissance',
  'modern': 'Modern_history',
  'world-wars': 'World_wars',
  'empires': 'Empires',
  'revolutions': 'Revolutions',
  'exploration': 'Age_of_Discovery',

  // People (legacy)
  'leaders-politicians': 'Political_leaders',
  'scientists-inventors': 'Scientists',
  'artists-writers': 'Artists',
  'musicians-performers': 'Musicians',
  'explorers-adventurers': 'Explorers',
  'philosophers-thinkers': 'Philosophers',
  'athletes': 'Athletes',

  // Science (legacy)
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'astronomy-space': 'Astronomy',
  'earth-science': 'Earth_sciences',
  'human-body': 'Human_anatomy',
  'animals': 'Animals',
  'plants': 'Plants',
  'genetics': 'Genetics',
  'medicine': 'Medicine',

  // Geography (legacy)
  'countries': 'Countries',
  'cities': 'Cities',
  'mountains-volcanoes': 'Mountains',
  'rivers-lakes': 'Rivers',
  'oceans-seas': 'Oceans',
  'islands': 'Islands',
  'landmarks-wonders': 'World_Heritage_Sites',

  // Arts (legacy)
  'architecture': 'Architecture',
  'literature': 'Literature',
  'music': 'Music',
  'visual-arts': 'Visual_arts',
  'film-tv': 'Film',
  'performing-arts': 'Performing_arts',

  // Philosophy & Religion (legacy)
  'world-religions': 'Religion',
  'mythology': 'Mythology',
  'ethics-morality': 'Ethics',
  'eastern-philosophy': 'Eastern_philosophy',
  'western-philosophy': 'Western_philosophy',

  // Technology (legacy)
  'computers-internet': 'Computing',
  'engineering': 'Engineering',
  'inventions': 'Inventions',
  'transportation': 'Transport',

  // Society (legacy)
  'politics-government': 'Politics',
  'economics-money': 'Economics',
  'law-justice': 'Law',
  'war-military': 'Military_history',

  // ============================================================================
  // SECTION-BASED MAPPINGS (from Level 2 Wikipedia sections)
  // These IDs are derived from Wikipedia category names (e.g., Ancient_history -> ancient-history)
  // ============================================================================

  // History sections
  'ancient-history': 'Ancient_history',
  'middle-ages': 'Middle_Ages',
  'early-modern-period': 'Early_modern_period',
  'modern-history': 'Modern_history',
  'contemporary-history': 'Contemporary_history',
  'history-of-europe': 'History_of_Europe',
  'history-of-asia': 'History_of_Asia',
  'history-of-africa': 'History_of_Africa',
  'history-of-the-americas': 'History_of_the_Americas',
  'history-of-the-middle-east': 'History_of_the_Middle_East',
  'history-of-oceania': 'History_of_Oceania',
  'world-war-i': 'World_War_I',
  'world-war-ii': 'World_War_II',
  'cold-war': 'Cold_War',
  'french-revolution': 'French_Revolution',
  'industrial-revolution': 'Industrial_Revolution',
  'age-of-discovery': 'Age_of_Discovery',
  'roman-empire': 'Roman_Empire',
  'british-empire': 'British_Empire',
  'mongol-empire': 'Mongol_Empire',
  'ottoman-empire': 'Ottoman_Empire',
  'ancient-egypt': 'Ancient_Egypt',
  'ancient-greece': 'Ancient_Greece',

  // Physical Sciences sections
  'classical-mechanics': 'Classical_mechanics',
  'quantum-mechanics': 'Quantum_mechanics',
  'thermodynamics': 'Thermodynamics',
  'electromagnetism': 'Electromagnetism',
  'optics': 'Optics',
  'relativity': 'Relativity',
  'chemical-elements': 'Chemical_elements',
  'organic-chemistry': 'Organic_chemistry',
  'inorganic-chemistry': 'Inorganic_chemistry',
  'biochemistry': 'Biochemistry',
  'chemical-reactions': 'Chemical_reactions',
  'planets': 'Planets',
  'stars': 'Stars',
  'galaxies': 'Galaxies',
  'black-holes': 'Black_holes',
  'space-exploration': 'Space_exploration',
  'cosmology': 'Cosmology',
  'geology': 'Geology',
  'meteorology': 'Meteorology',
  'oceanography': 'Oceanography',
  'volcanology': 'Volcanology',
  'earthquakes': 'Earthquakes',

  // Biology sections
  'human-anatomy': 'Human_anatomy',
  'human-brain': 'Human_brain',
  'circulatory-system': 'Circulatory_system',
  'digestive-system': 'Digestive_system',
  'immune-system': 'Immune_system',
  'mammals': 'Mammals',
  'birds': 'Birds',
  'reptiles': 'Reptiles',
  'fish': 'Fish',
  'insects': 'Insects',
  'dinosaurs': 'Dinosaurs',
  'trees': 'Trees',
  'flowers': 'Flowers',
  'rainforests': 'Rainforests',
  'ecosystems': 'Ecosystems',
  'diseases-and-disorders': 'Diseases_and_disorders',
  'vaccines': 'Vaccines',
  'drugs': 'Drugs',
  'surgery': 'Surgery',
  'mental-health': 'Mental_health',

  // Arts sections
  'painting': 'Painting',
  'sculpture': 'Sculpture',
  'photography': 'Photography',
  'art-movements': 'Art_movements',
  'famous-paintings': 'Famous_paintings',
  'classical-music': 'Classical_music',
  'rock-music': 'Rock_music',
  'jazz': 'Jazz',
  'hip-hop-music': 'Hip_hop_music',
  'musical-instruments': 'Musical_instruments',
  'novels': 'Novels',
  'poetry': 'Poetry',
  'drama': 'Drama',
  'literary-genres': 'Literary_genres',
  'nobel-prize-in-literature': 'Nobel_Prize_in_Literature',
  'film': 'Film',
  'theatre': 'Theatre',
  'dance': 'Dance',
  'opera': 'Opera',
  'animation': 'Animation',
  'architectural-styles': 'Architectural_styles',
  'famous-buildings': 'Famous_buildings',
  'ancient-architecture': 'Ancient_architecture',
  'modern-architecture': 'Modern_architecture',
  'bridges': 'Bridges',

  // Geography sections
  'countries-in-europe': 'Countries_in_Europe',
  'countries-in-asia': 'Countries_in_Asia',
  'countries-in-africa': 'Countries_in_Africa',
  'countries-in-north-america': 'Countries_in_North_America',
  'countries-in-south-america': 'Countries_in_South_America',
  'countries-in-oceania': 'Countries_in_Oceania',
  'mountains': 'Mountains',
  'rivers': 'Rivers',
  'lakes': 'Lakes',
  'deserts': 'Deserts',
  'forests': 'Forests',
  'volcanoes': 'Volcanoes',
  'oceans': 'Oceans',
  'seas': 'Seas',
  'coral-reefs': 'Coral_reefs',
  'archipelagos': 'Archipelagos',
  'capital-cities': 'Capital_cities',
  'world-heritage-sites': 'World_Heritage_Sites',
  'wonders-of-the-world': 'Wonders_of_the_World',
  'famous-landmarks': 'Famous_landmarks',
  'megacities': 'Megacities',

  // People sections
  'monarchs': 'Monarchs',
  'presidents': 'Presidents',
  'prime-ministers': 'Prime_ministers',
  'revolutionary-leaders': 'Revolutionary_leaders',
  'military-leaders': 'Military_leaders',
  'physicists': 'Physicists',
  'chemists': 'Chemists',
  'biologists': 'Biologists',
  'inventors': 'Inventors',
  'nobel-laureates': 'Nobel_laureates',
  'painters': 'Painters',
  'sculptors': 'Sculptors',
  'novelists': 'Novelists',
  'poets': 'Poets',
  'playwrights': 'Playwrights',
  'actors': 'Actors',
  'singers': 'Singers',
  'composers': 'Composers',
  'olympic-athletes': 'Olympic_athletes',
  'football-players': 'Football_players',
  'philosophers': 'Philosophers',
  'explorers': 'Explorers',
  'astronauts': 'Astronauts',
  'mathematicians': 'Mathematicians',
  'economists': 'Economists',

  // Technology sections
  'computer-hardware': 'Computer_hardware',
  'software': 'Software',
  'programming-languages': 'Programming_languages',
  'internet': 'Internet',
  'artificial-intelligence': 'Artificial_intelligence',
  'civil-engineering': 'Civil_engineering',
  'mechanical-engineering': 'Mechanical_engineering',
  'electrical-engineering': 'Electrical_engineering',
  'aerospace-engineering': 'Aerospace_engineering',
  'robotics': 'Robotics',
  'automobiles': 'Automobiles',
  'aircraft': 'Aircraft',
  'ships': 'Ships',
  'trains': 'Trains',
  'spacecraft': 'Spacecraft',
  '19th-century-inventions': '19th-century_inventions',
  '20th-century-inventions': '20th-century_inventions',
  '21st-century-inventions': '21st-century_inventions',
  'communication-technology': 'Communication_technology',
  'medical-technology': 'Medical_technology',

  // Philosophy & Religion sections
  'christianity': 'Christianity',
  'islam': 'Islam',
  'hinduism': 'Hinduism',
  'buddhism': 'Buddhism',
  'judaism': 'Judaism',
  'greek-mythology': 'Greek_mythology',
  'norse-mythology': 'Norse_mythology',
  'egyptian-mythology': 'Egyptian_mythology',
  'roman-mythology': 'Roman_mythology',
  'japanese-mythology': 'Japanese_mythology',
  'ancient-greek-philosophy': 'Ancient_Greek_philosophy',
  'enlightenment-philosophy': 'Enlightenment_philosophy',
  'existentialism': 'Existentialism',
  'political-philosophy': 'Political_philosophy',
  'ethics': 'Ethics',
  'confucianism': 'Confucianism',
  'taoism': 'Taoism',
  'zen': 'Zen',
  'indian-philosophy': 'Indian_philosophy',
  'yoga': 'Yoga',

  // Mathematics sections
  'arithmetic': 'Arithmetic',
  'algebra': 'Algebra',
  'geometry': 'Geometry',
  'trigonometry': 'Trigonometry',
  'calculus': 'Calculus',
  'number-theory': 'Number_theory',
  'statistics': 'Statistics',
  'probability-theory': 'Probability_theory',
  'linear-algebra': 'Linear_algebra',
  'topology': 'Topology',
  'millennium-prize-problems': 'Millennium_Prize_Problems',
  'mathematical-paradoxes': 'Mathematical_paradoxes',
  'unsolved-problems-in-mathematics': 'Unsolved_problems_in_mathematics',
  'mathematical-theorems': 'Mathematical_theorems',
  'ancient-greek-mathematicians': 'Ancient_Greek_mathematicians',
  'number-theorists': 'Number_theorists',
  'fields-medal-winners': 'Fields_Medal_winners',
  'women-mathematicians': 'Women_mathematicians',

  // Society sections
  'democracy': 'Democracy',
  'political-ideologies': 'Political_ideologies',
  'international-organizations': 'International_organizations',
  'elections': 'Elections',
  'constitutions': 'Constitutions',
  'macroeconomics': 'Macroeconomics',
  'microeconomics': 'Microeconomics',
  'stock-markets': 'Stock_markets',
  'economic-systems': 'Economic_systems',
  'currencies': 'Currencies',
  'criminal-law': 'Criminal_law',
  'human-rights': 'Human_rights',
  'international-law': 'International_law',
  'famous-trials': 'Famous_trials',
  'supreme-courts': 'Supreme_courts',
  'civil-rights-movements': 'Civil_rights_movements',
  'feminism': 'Feminism',
  'environmental-movement': 'Environmental_movement',
  'labor-movement': 'Labor_movement',
  'peace-movements': 'Peace_movements',

  // Everyday Life sections
  'cuisines': 'Cuisines',
  'cooking-techniques': 'Cooking_techniques',
  'beverages': 'Beverages',
  'desserts': 'Desserts',
  'fast-food': 'Fast_food',
  'football': 'Football',
  'basketball': 'Basketball',
  'olympic-sports': 'Olympic_sports',
  'board-games': 'Board_games',
  'video-games': 'Video_games',
  'christmas': 'Christmas',
  'new-year': 'New_Year',
  'halloween': 'Halloween',
  'cultural-festivals': 'Cultural_festivals',
  'wedding-traditions': 'Wedding_traditions',
  'gardening': 'Gardening',
  'collecting': 'Collecting',
  'crafts': 'Crafts',
  'outdoor-recreation': 'Outdoor_recreation',
}

// Additional mappings for dynamic topics (generated based on parent)
const TOPIC_TO_CATEGORY_PATTERNS = [
  // Pharaohs patterns
  { pattern: /pharaoh/i, category: 'Pharaohs' },
  { pattern: /pyramid/i, category: 'Egyptian_pyramids' },
  { pattern: /mummy|mummies/i, category: 'Egyptian_mummies' },
  { pattern: /hieroglyph/i, category: 'Egyptian_hieroglyphs' },

  // Roman patterns
  { pattern: /roman emperor/i, category: 'Roman_emperors' },
  { pattern: /gladiator/i, category: 'Gladiators' },
  { pattern: /roman.*god/i, category: 'Roman_gods' },

  // Greek patterns
  { pattern: /greek.*god/i, category: 'Greek_gods' },
  { pattern: /greek.*philosoph/i, category: 'Ancient_Greek_philosophers' },
  { pattern: /olympic/i, category: 'Ancient_Olympic_Games' },

  // Science patterns
  { pattern: /quantum/i, category: 'Quantum_mechanics' },
  { pattern: /element.*periodic/i, category: 'Chemical_elements' },
  { pattern: /planet/i, category: 'Planets' },
  { pattern: /star.*type/i, category: 'Star_types' },
  { pattern: /dinosaur/i, category: 'Dinosaurs' },

  // Art patterns
  { pattern: /renaissance.*artist/i, category: 'Renaissance_artists' },
  { pattern: /impression/i, category: 'Impressionist_painters' },
  { pattern: /baroque/i, category: 'Baroque_painters' },

  // War patterns
  { pattern: /world war (i|1|one)/i, category: 'World_War_I' },
  { pattern: /world war (ii|2|two)/i, category: 'World_War_II' },
  { pattern: /battle/i, category: 'Battles' },

  // General patterns
  { pattern: /inventor/i, category: 'Inventors' },
  { pattern: /composer/i, category: 'Composers' },
  { pattern: /author|writer/i, category: 'Writers' },
  { pattern: /painter/i, category: 'Painters' },
  { pattern: /sculptor/i, category: 'Sculptors' },
]

// Cache key prefix
const CACHE_PREFIX = 'wiki_cache_'
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Get cached Wikipedia data
 */
function getCachedWikipedia(key) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch (e) {
    return null
  }
}

/**
 * Cache Wikipedia data
 */
function setCachedWikipedia(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (e) {
    // Cache full, ignore
  }
}

/**
 * Map a deck name to the best vital articles category to search
 * Returns array of category keys to search (in order of priority)
 */
function mapDeckToVitalCategories(deckName, parentPath = null) {
  const name = deckName.toLowerCase()
  const path = (parentPath || '').toLowerCase()

  // Direct category mappings based on keywords
  if (/mathematician|math|algebra|geometry|calculus/i.test(name)) {
    return ['mathematics', 'people']
  }
  if (/physicist|physics|quantum|relativity/i.test(name)) {
    return ['physics', 'people']
  }
  if (/biolog|life|organism|species|animal|plant/i.test(name)) {
    return ['biology', 'people']
  }
  if (/chemist|chemistry|element|molecule/i.test(name)) {
    return ['physics', 'people'] // Chemistry is under physical sciences
  }
  if (/artist|painter|sculptor|art|painting/i.test(name)) {
    return ['arts', 'people']
  }
  if (/musician|composer|music|symphony|opera/i.test(name)) {
    return ['arts', 'people']
  }
  if (/writer|author|poet|novel|literature/i.test(name)) {
    return ['arts', 'people']
  }
  if (/philosopher|philosophy|ethics|logic/i.test(name)) {
    return ['philosophy', 'people']
  }
  if (/religion|religious|spiritual|god|deity/i.test(name)) {
    return ['philosophy', 'people']
  }
  if (/leader|politician|president|king|queen|emperor/i.test(name)) {
    return ['people', 'history']
  }
  if (/explorer|adventurer|navigator/i.test(name)) {
    return ['people', 'geography']
  }
  if (/inventor|invention|engineer/i.test(name)) {
    return ['technology', 'people']
  }
  if (/war|battle|military|army|navy/i.test(name)) {
    return ['history', 'people']
  }
  if (/country|nation|city|geography|continent/i.test(name)) {
    return ['geography']
  }
  if (/ancient|medieval|modern|century|era|period/i.test(name)) {
    return ['history']
  }
  if (/food|drink|sport|game|hobby/i.test(name)) {
    return ['everyday']
  }
  if (/computer|software|internet|technology/i.test(name)) {
    return ['technology']
  }
  if (/society|social|economic|political|law/i.test(name)) {
    return ['society']
  }

  // Check parent path for context
  if (/math/i.test(path)) return ['mathematics', 'people']
  if (/physics|science/i.test(path)) return ['physics', 'biology', 'people']
  if (/biology|health/i.test(path)) return ['biology', 'people']
  if (/art/i.test(path)) return ['arts', 'people']
  if (/history/i.test(path)) return ['history', 'people']
  if (/people/i.test(path)) return ['people']
  if (/geography/i.test(path)) return ['geography']
  if (/philosophy|religion/i.test(path)) return ['philosophy']
  if (/technology/i.test(path)) return ['technology']
  if (/society/i.test(path)) return ['society']
  if (/everyday/i.test(path)) return ['everyday']

  // Default: search all categories weighted toward people
  return ['people', 'history', 'arts', 'physics', 'biology']
}

/**
 * Get a pool of candidate articles from vital articles
 * Returns up to 200 articles from relevant categories
 */
function getCandidateArticles(deckName, parentPath = null) {
  const categories = mapDeckToVitalCategories(deckName, parentPath)
  const candidates = []

  for (const category of categories) {
    if (vitalArticles[category]) {
      candidates.push(...vitalArticles[category])
    }
  }

  // Shuffle for variety
  return candidates.sort(() => Math.random() - 0.5).slice(0, 200)
}

/**
 * Use AI to pick the most relevant articles from the vital pool
 * for a given deck topic
 */
async function pickRelevantArticlesFromPool(deckName, parentPath, candidates) {
  if (candidates.length === 0) return null

  const prompt = `From this list of Wikipedia article titles, pick 8-12 that are SPECIFIC examples of "${deckName}".

CANDIDATE ARTICLES:
${candidates.slice(0, 150).join('\n')}

RULES:
1. Pick ONLY articles that are directly related to "${deckName}"
2. For people categories (like "Mathematicians"), pick SPECIFIC PEOPLE
3. For concept categories (like "Theorems"), pick SPECIFIC THEOREMS
4. Prioritize famous/recognizable topics over obscure ones
5. Return the EXACT article titles as they appear in the list

${parentPath ? `CONTEXT: This is inside "${parentPath}"` : ''}

Return ONLY a JSON array of 8-12 article titles, no explanation:
["Title 1", "Title 2", ...]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const titles = JSON.parse(jsonText)

    // Validate that returned titles exist in our pool
    const validTitles = titles.filter(t => candidates.includes(t))

    if (validTitles.length < 3) {
      console.log(`[VitalPool] AI returned too few valid matches for "${deckName}"`)
      return null
    }

    return validTitles
  } catch (error) {
    console.error('[VitalPool] Error picking articles:', error)
    return null
  }
}

/**
 * Main function: Get sub-topics from the Vital Articles pool
 * Uses AI to pick relevant articles from the pre-scraped 10,000 article pool
 * Returns array of sub-deck objects or null if no good results
 */
export async function getWikipediaSubtopics(deckId, deckName, parentPath = null) {
  console.log(`[VitalPool] Getting subtopics for: ${deckName} (${deckId})`)

  // Get candidate articles from relevant categories
  const candidates = getCandidateArticles(deckName, parentPath)
  console.log(`[VitalPool] Found ${candidates.length} candidates from pool`)

  if (candidates.length === 0) {
    console.log(`[VitalPool] No candidates for: ${deckName}`)
    return null
  }

  // Use AI to pick the most relevant articles
  const selected = await pickRelevantArticlesFromPool(deckName, parentPath, candidates)

  if (!selected || selected.length < 3) {
    console.log(`[VitalPool] Could not find enough relevant articles for: ${deckName}`)
    return null
  }

  // Convert to sub-deck format
  const subDecks = selected.map(title => ({
    id: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50),
    name: title,
    source: 'vital-articles',
    isLeaf: true // Vital articles are leaf nodes - no further children
  }))

  console.log(`[VitalPool] Selected ${subDecks.length} articles for: ${deckName}`)
  return subDecks
}

/**
 * Check if we have a good Wikipedia mapping for a topic
 */
export function hasWikipediaMapping(deckId, deckName) {
  if (WIKIPEDIA_CATEGORY_MAP[deckId]) return true

  for (const { pattern } of TOPIC_TO_CATEGORY_PATTERNS) {
    if (pattern.test(deckName)) return true
  }

  return false
}
