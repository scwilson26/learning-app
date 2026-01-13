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
 * Find Wikipedia category for a topic
 */
function findWikipediaCategory(deckId, deckName) {
  // Check direct mapping first
  if (WIKIPEDIA_CATEGORY_MAP[deckId]) {
    return WIKIPEDIA_CATEGORY_MAP[deckId]
  }

  // Check pattern matching
  for (const { pattern, category } of TOPIC_TO_CATEGORY_PATTERNS) {
    if (pattern.test(deckName)) {
      return category
    }
  }

  // Try to construct a reasonable category name from the deck name
  // Convert "Ancient Egypt" to "Ancient_Egypt"
  const categoryGuess = deckName
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')

  return categoryGuess
}

/**
 * Fetch category members from Wikipedia API
 */
async function fetchCategoryMembers(categoryName, limit = 30) {
  const cacheKey = `cat_${categoryName}`
  const cached = getCachedWikipedia(cacheKey)
  if (cached) {
    console.log(`[Wikipedia] Using cached category: ${categoryName}`)
    return cached
  }

  const url = `https://en.wikipedia.org/w/api.php?` +
    `action=query&` +
    `list=categorymembers&` +
    `cmtitle=Category:${encodeURIComponent(categoryName)}&` +
    `cmtype=subcat|page&` +
    `cmlimit=${limit}&` +
    `format=json&` +
    `origin=*`

  try {
    console.log(`[Wikipedia] Fetching category: ${categoryName}`)
    const response = await fetch(url)
    const data = await response.json()

    if (data.query?.categorymembers) {
      const members = data.query.categorymembers
      setCachedWikipedia(cacheKey, members)
      return members
    }
    return null
  } catch (error) {
    console.error('[Wikipedia] API error:', error)
    return null
  }
}

/**
 * Search Wikipedia for topics related to a query
 */
async function searchWikipedia(query, limit = 10) {
  const cacheKey = `search_${query.replace(/\s+/g, '_')}`
  const cached = getCachedWikipedia(cacheKey)
  if (cached) {
    return cached
  }

  const url = `https://en.wikipedia.org/w/api.php?` +
    `action=opensearch&` +
    `search=${encodeURIComponent(query)}&` +
    `limit=${limit}&` +
    `format=json&` +
    `origin=*`

  try {
    const response = await fetch(url)
    const data = await response.json()

    // OpenSearch returns [query, titles, descriptions, urls]
    if (data && data[1]) {
      const results = data[1].map((title, i) => ({
        title,
        description: data[2]?.[i] || '',
        url: data[3]?.[i] || ''
      }))
      setCachedWikipedia(cacheKey, results)
      return results
    }
    return null
  } catch (error) {
    console.error('[Wikipedia] Search error:', error)
    return null
  }
}

/**
 * Filter and clean Wikipedia results for use as sub-decks
 */
function filterWikipediaResults(members, parentName) {
  if (!members || members.length === 0) return []

  const parentLower = parentName.toLowerCase()

  return members
    .filter(member => {
      const title = member.title || ''
      const titleLower = title.toLowerCase()

      // Skip categories (we want articles/specific topics)
      if (title.startsWith('Category:')) return false

      // Skip disambiguation pages
      if (title.includes('(disambiguation)')) return false

      // Skip list pages
      if (title.startsWith('List of')) return false

      // Skip pages that are just the parent topic
      if (titleLower === parentLower) return false

      // Skip very short titles (likely acronyms or not useful)
      if (title.length < 3) return false

      // Skip pages with "in X" patterns (like "Economy in Egypt")
      if (/\sin\s/i.test(title)) return false

      // Skip pages ending with "of X" where X is the parent
      if (new RegExp(`of\\s+${parentName}$`, 'i').test(title)) return false

      return true
    })
    .slice(0, 10) // Limit to 10 results
}

/**
 * Convert Wikipedia results to sub-deck format
 */
function convertToSubDecks(wikiResults) {
  return wikiResults.map(result => {
    const title = result.title.replace('Category:', '')
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)

    // Pick an appropriate emoji based on the title
    const emoji = pickEmojiForTopic(title)

    return {
      id,
      name: title,
      emoji,
      source: 'wikipedia'
    }
  })
}

/**
 * Pick an emoji based on topic keywords
 */
function pickEmojiForTopic(title) {
  const titleLower = title.toLowerCase()

  // People
  if (/pharaoh|king|queen|emperor|empress|ruler/i.test(titleLower)) return '👑'
  if (/president|prime minister|leader/i.test(titleLower)) return '🏛️'
  if (/scientist|physicist|chemist/i.test(titleLower)) return '🔬'
  if (/artist|painter|sculptor/i.test(titleLower)) return '🎨'
  if (/composer|musician/i.test(titleLower)) return '🎵'
  if (/philosopher/i.test(titleLower)) return '💭'
  if (/explorer|adventurer/i.test(titleLower)) return '🧭'
  if (/inventor/i.test(titleLower)) return '💡'
  if (/writer|author|poet/i.test(titleLower)) return '✍️'
  if (/general|warrior|soldier/i.test(titleLower)) return '⚔️'

  // Places
  if (/pyramid|tomb|temple/i.test(titleLower)) return '🏛️'
  if (/mountain|volcano/i.test(titleLower)) return '🏔️'
  if (/river|lake/i.test(titleLower)) return '🏞️'
  if (/ocean|sea/i.test(titleLower)) return '🌊'
  if (/island/i.test(titleLower)) return '🏝️'
  if (/city|capital/i.test(titleLower)) return '🌆'
  if (/palace|castle/i.test(titleLower)) return '🏰'

  // Events
  if (/battle|war|siege/i.test(titleLower)) return '⚔️'
  if (/revolution/i.test(titleLower)) return '✊'
  if (/discovery|invention/i.test(titleLower)) return '💡'
  if (/treaty|agreement/i.test(titleLower)) return '📜'

  // Science
  if (/element|atom/i.test(titleLower)) return '⚛️'
  if (/planet|star|galaxy/i.test(titleLower)) return '🌟'
  if (/dinosaur/i.test(titleLower)) return '🦖'
  if (/animal|creature/i.test(titleLower)) return '🦁'
  if (/plant|flower|tree/i.test(titleLower)) return '🌿'
  if (/disease|virus|bacteria/i.test(titleLower)) return '🦠'

  // Art/Culture
  if (/book|novel|poem/i.test(titleLower)) return '📚'
  if (/film|movie/i.test(titleLower)) return '🎬'
  if (/painting|artwork/i.test(titleLower)) return '🖼️'
  if (/sculpture|statue/i.test(titleLower)) return '🗿'
  if (/music|symphony|opera/i.test(titleLower)) return '🎵'

  // Default based on first letter (for variety)
  const firstChar = title.charAt(0).toUpperCase()
  const defaultEmojis = {
    'A': '📄', 'B': '📑', 'C': '📋', 'D': '📃', 'E': '📝',
    'F': '📖', 'G': '📓', 'H': '📔', 'I': '📕', 'J': '📗',
    'K': '📘', 'L': '📙', 'M': '📚', 'N': '📖', 'O': '📝',
    'P': '📄', 'Q': '📑', 'R': '📋', 'S': '📃', 'T': '📝',
    'U': '📖', 'V': '📓', 'W': '📔', 'X': '📕', 'Y': '📗', 'Z': '📘'
  }

  return defaultEmojis[firstChar] || '📄'
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
    emoji: pickEmojiForTopic(title),
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

/**
 * Clear Wikipedia cache
 */
export function clearWikipediaCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
  keys.forEach(k => localStorage.removeItem(k))
  console.log(`[Wikipedia] Cleared ${keys.length} cached items`)
}

// ============================================================================
// LEVEL 2 SECTION MAPPINGS (CURATED)
// Maps Level 1 categories to organized sections of Wikipedia categories
// These ensure users reach the "crowd pleaser" topics in the 10,000 Vital Articles
// ============================================================================

/**
 * Curated section mappings for Level 1 categories
 * Each section contains Wikipedia category names that lead to interesting topics
 */
const LEVEL_2_SECTIONS = {
  // HISTORY
  history: {
    sections: [
      {
        name: 'By Time Period',
        emoji: '📅',
        categories: [
          { wiki: 'Ancient_history', name: 'Ancient World', emoji: '🏛️' },
          { wiki: 'Middle_Ages', name: 'Medieval Era', emoji: '⚔️' },
          { wiki: 'Renaissance', name: 'Renaissance', emoji: '🎨' },
          { wiki: 'Early_modern_period', name: 'Early Modern', emoji: '🚢' },
          { wiki: 'Modern_history', name: 'Modern History', emoji: '🏭' },
          { wiki: 'Contemporary_history', name: 'Contemporary', emoji: '📱' },
        ]
      },
      {
        name: 'By Region',
        emoji: '🌍',
        categories: [
          { wiki: 'History_of_Europe', name: 'European History', emoji: '🏰' },
          { wiki: 'History_of_Asia', name: 'Asian History', emoji: '🏯' },
          { wiki: 'History_of_Africa', name: 'African History', emoji: '🌍' },
          { wiki: 'History_of_the_Americas', name: 'Americas History', emoji: '🗽' },
          { wiki: 'History_of_the_Middle_East', name: 'Middle East History', emoji: '🕌' },
          { wiki: 'History_of_Oceania', name: 'Oceania History', emoji: '🏝️' },
        ]
      },
      {
        name: 'Major Events',
        emoji: '💥',
        categories: [
          { wiki: 'World_War_I', name: 'World War I', emoji: '💣' },
          { wiki: 'World_War_II', name: 'World War II', emoji: '✈️' },
          { wiki: 'Cold_War', name: 'Cold War', emoji: '🧊' },
          { wiki: 'French_Revolution', name: 'French Revolution', emoji: '🇫🇷' },
          { wiki: 'Industrial_Revolution', name: 'Industrial Revolution', emoji: '⚙️' },
          { wiki: 'Age_of_Discovery', name: 'Age of Exploration', emoji: '🧭' },
        ]
      },
      {
        name: 'Empires & Civilizations',
        emoji: '👑',
        categories: [
          { wiki: 'Roman_Empire', name: 'Roman Empire', emoji: '🏛️' },
          { wiki: 'British_Empire', name: 'British Empire', emoji: '🇬🇧' },
          { wiki: 'Mongol_Empire', name: 'Mongol Empire', emoji: '🐎' },
          { wiki: 'Ottoman_Empire', name: 'Ottoman Empire', emoji: '🌙' },
          { wiki: 'Ancient_Egypt', name: 'Ancient Egypt', emoji: '🏺' },
          { wiki: 'Ancient_Greece', name: 'Ancient Greece', emoji: '🏺' },
        ]
      },
    ]
  },

  // PHYSICAL SCIENCES
  physics: {
    sections: [
      {
        name: 'Physics',
        emoji: '⚛️',
        categories: [
          { wiki: 'Classical_mechanics', name: 'Classical Mechanics', emoji: '⚙️' },
          { wiki: 'Quantum_mechanics', name: 'Quantum Mechanics', emoji: '⚛️' },
          { wiki: 'Thermodynamics', name: 'Thermodynamics', emoji: '🌡️' },
          { wiki: 'Electromagnetism', name: 'Electromagnetism', emoji: '⚡' },
          { wiki: 'Optics', name: 'Optics & Light', emoji: '💡' },
          { wiki: 'Relativity', name: 'Relativity', emoji: '🌌' },
        ]
      },
      {
        name: 'Chemistry',
        emoji: '🧪',
        categories: [
          { wiki: 'Chemical_elements', name: 'Chemical Elements', emoji: '⚛️' },
          { wiki: 'Organic_chemistry', name: 'Organic Chemistry', emoji: '🧬' },
          { wiki: 'Inorganic_chemistry', name: 'Inorganic Chemistry', emoji: '💎' },
          { wiki: 'Biochemistry', name: 'Biochemistry', emoji: '🧫' },
          { wiki: 'Chemical_reactions', name: 'Chemical Reactions', emoji: '💥' },
        ]
      },
      {
        name: 'Astronomy & Space',
        emoji: '🔭',
        categories: [
          { wiki: 'Planets', name: 'Planets', emoji: '🪐' },
          { wiki: 'Stars', name: 'Stars', emoji: '⭐' },
          { wiki: 'Galaxies', name: 'Galaxies', emoji: '🌌' },
          { wiki: 'Black_holes', name: 'Black Holes', emoji: '🕳️' },
          { wiki: 'Space_exploration', name: 'Space Exploration', emoji: '🚀' },
          { wiki: 'Cosmology', name: 'Cosmology', emoji: '🌌' },
        ]
      },
      {
        name: 'Earth Sciences',
        emoji: '🌋',
        categories: [
          { wiki: 'Geology', name: 'Geology', emoji: '🪨' },
          { wiki: 'Meteorology', name: 'Weather & Climate', emoji: '🌦️' },
          { wiki: 'Oceanography', name: 'Oceanography', emoji: '🌊' },
          { wiki: 'Volcanology', name: 'Volcanoes', emoji: '🌋' },
          { wiki: 'Earthquakes', name: 'Earthquakes', emoji: '🌍' },
        ]
      },
    ]
  },

  // BIOLOGY & HEALTH
  biology: {
    sections: [
      {
        name: 'Human Body',
        emoji: '🫀',
        categories: [
          { wiki: 'Human_anatomy', name: 'Human Anatomy', emoji: '🫀' },
          { wiki: 'Human_brain', name: 'The Brain', emoji: '🧠' },
          { wiki: 'Circulatory_system', name: 'Circulatory System', emoji: '❤️' },
          { wiki: 'Digestive_system', name: 'Digestive System', emoji: '🫃' },
          { wiki: 'Immune_system', name: 'Immune System', emoji: '🛡️' },
        ]
      },
      {
        name: 'Animals',
        emoji: '🦁',
        categories: [
          { wiki: 'Mammals', name: 'Mammals', emoji: '🦁' },
          { wiki: 'Birds', name: 'Birds', emoji: '🦅' },
          { wiki: 'Reptiles', name: 'Reptiles', emoji: '🦎' },
          { wiki: 'Fish', name: 'Fish', emoji: '🐟' },
          { wiki: 'Insects', name: 'Insects', emoji: '🐛' },
          { wiki: 'Dinosaurs', name: 'Dinosaurs', emoji: '🦖' },
        ]
      },
      {
        name: 'Plants & Ecosystems',
        emoji: '🌿',
        categories: [
          { wiki: 'Plants', name: 'Plants', emoji: '🌿' },
          { wiki: 'Trees', name: 'Trees', emoji: '🌳' },
          { wiki: 'Flowers', name: 'Flowers', emoji: '🌸' },
          { wiki: 'Rainforests', name: 'Rainforests', emoji: '🌴' },
          { wiki: 'Ecosystems', name: 'Ecosystems', emoji: '🌍' },
        ]
      },
      {
        name: 'Medicine & Health',
        emoji: '💊',
        categories: [
          { wiki: 'Diseases_and_disorders', name: 'Diseases', emoji: '🦠' },
          { wiki: 'Vaccines', name: 'Vaccines', emoji: '💉' },
          { wiki: 'Drugs', name: 'Medications', emoji: '💊' },
          { wiki: 'Surgery', name: 'Surgery', emoji: '🏥' },
          { wiki: 'Mental_health', name: 'Mental Health', emoji: '🧠' },
        ]
      },
    ]
  },

  // ARTS
  arts: {
    sections: [
      {
        name: 'Visual Arts',
        emoji: '🎨',
        categories: [
          { wiki: 'Painting', name: 'Painting', emoji: '🖼️' },
          { wiki: 'Sculpture', name: 'Sculpture', emoji: '🗿' },
          { wiki: 'Photography', name: 'Photography', emoji: '📷' },
          { wiki: 'Art_movements', name: 'Art Movements', emoji: '🎨' },
          { wiki: 'Famous_paintings', name: 'Famous Paintings', emoji: '🖼️' },
        ]
      },
      {
        name: 'Music',
        emoji: '🎵',
        categories: [
          { wiki: 'Classical_music', name: 'Classical Music', emoji: '🎻' },
          { wiki: 'Rock_music', name: 'Rock Music', emoji: '🎸' },
          { wiki: 'Jazz', name: 'Jazz', emoji: '🎷' },
          { wiki: 'Hip_hop_music', name: 'Hip Hop', emoji: '🎤' },
          { wiki: 'Musical_instruments', name: 'Instruments', emoji: '🎹' },
        ]
      },
      {
        name: 'Literature',
        emoji: '📚',
        categories: [
          { wiki: 'Novels', name: 'Novels', emoji: '📖' },
          { wiki: 'Poetry', name: 'Poetry', emoji: '📜' },
          { wiki: 'Drama', name: 'Drama & Plays', emoji: '🎭' },
          { wiki: 'Literary_genres', name: 'Genres', emoji: '📚' },
          { wiki: 'Nobel_Prize_in_Literature', name: 'Nobel Literature', emoji: '🏆' },
        ]
      },
      {
        name: 'Performing Arts',
        emoji: '🎭',
        categories: [
          { wiki: 'Film', name: 'Film & Cinema', emoji: '🎬' },
          { wiki: 'Theatre', name: 'Theatre', emoji: '🎭' },
          { wiki: 'Dance', name: 'Dance', emoji: '💃' },
          { wiki: 'Opera', name: 'Opera', emoji: '🎭' },
          { wiki: 'Animation', name: 'Animation', emoji: '🎞️' },
        ]
      },
      {
        name: 'Architecture',
        emoji: '🏗️',
        categories: [
          { wiki: 'Architectural_styles', name: 'Architectural Styles', emoji: '🏛️' },
          { wiki: 'Famous_buildings', name: 'Famous Buildings', emoji: '🏗️' },
          { wiki: 'Ancient_architecture', name: 'Ancient Architecture', emoji: '🏛️' },
          { wiki: 'Modern_architecture', name: 'Modern Architecture', emoji: '🏙️' },
          { wiki: 'Bridges', name: 'Famous Bridges', emoji: '🌉' },
        ]
      },
    ]
  },

  // GEOGRAPHY
  geography: {
    sections: [
      {
        name: 'Countries',
        emoji: '🗺️',
        categories: [
          { wiki: 'Countries_in_Europe', name: 'European Countries', emoji: '🇪🇺' },
          { wiki: 'Countries_in_Asia', name: 'Asian Countries', emoji: '🌏' },
          { wiki: 'Countries_in_Africa', name: 'African Countries', emoji: '🌍' },
          { wiki: 'Countries_in_North_America', name: 'North American Countries', emoji: '🌎' },
          { wiki: 'Countries_in_South_America', name: 'South American Countries', emoji: '🌎' },
          { wiki: 'Countries_in_Oceania', name: 'Oceania Countries', emoji: '🏝️' },
        ]
      },
      {
        name: 'Natural Features',
        emoji: '🏔️',
        categories: [
          { wiki: 'Mountains', name: 'Mountains', emoji: '🏔️' },
          { wiki: 'Rivers', name: 'Rivers', emoji: '🏞️' },
          { wiki: 'Lakes', name: 'Lakes', emoji: '💧' },
          { wiki: 'Deserts', name: 'Deserts', emoji: '🏜️' },
          { wiki: 'Forests', name: 'Forests', emoji: '🌲' },
          { wiki: 'Volcanoes', name: 'Volcanoes', emoji: '🌋' },
        ]
      },
      {
        name: 'Oceans & Islands',
        emoji: '🌊',
        categories: [
          { wiki: 'Oceans', name: 'Oceans', emoji: '🌊' },
          { wiki: 'Seas', name: 'Seas', emoji: '🌊' },
          { wiki: 'Islands', name: 'Islands', emoji: '🏝️' },
          { wiki: 'Coral_reefs', name: 'Coral Reefs', emoji: '🪸' },
          { wiki: 'Archipelagos', name: 'Archipelagos', emoji: '🏝️' },
        ]
      },
      {
        name: 'Cities & Landmarks',
        emoji: '🌆',
        categories: [
          { wiki: 'Capital_cities', name: 'Capital Cities', emoji: '🏙️' },
          { wiki: 'World_Heritage_Sites', name: 'World Heritage Sites', emoji: '🏛️' },
          { wiki: 'Wonders_of_the_World', name: 'Wonders of the World', emoji: '🗽' },
          { wiki: 'Famous_landmarks', name: 'Famous Landmarks', emoji: '🗼' },
          { wiki: 'Megacities', name: 'Megacities', emoji: '🌆' },
        ]
      },
    ]
  },

  // PEOPLE
  people: {
    sections: [
      {
        name: 'Leaders & Politicians',
        emoji: '👔',
        categories: [
          { wiki: 'Monarchs', name: 'Monarchs & Royalty', emoji: '👑' },
          { wiki: 'Presidents', name: 'Presidents', emoji: '🏛️' },
          { wiki: 'Prime_ministers', name: 'Prime Ministers', emoji: '💼' },
          { wiki: 'Revolutionary_leaders', name: 'Revolutionary Leaders', emoji: '✊' },
          { wiki: 'Military_leaders', name: 'Military Leaders', emoji: '⚔️' },
        ]
      },
      {
        name: 'Scientists & Inventors',
        emoji: '🔬',
        categories: [
          { wiki: 'Physicists', name: 'Physicists', emoji: '⚛️' },
          { wiki: 'Chemists', name: 'Chemists', emoji: '🧪' },
          { wiki: 'Biologists', name: 'Biologists', emoji: '🧬' },
          { wiki: 'Inventors', name: 'Inventors', emoji: '💡' },
          { wiki: 'Nobel_laureates', name: 'Nobel Laureates', emoji: '🏆' },
        ]
      },
      {
        name: 'Artists & Writers',
        emoji: '✍️',
        categories: [
          { wiki: 'Painters', name: 'Painters', emoji: '🎨' },
          { wiki: 'Sculptors', name: 'Sculptors', emoji: '🗿' },
          { wiki: 'Novelists', name: 'Novelists', emoji: '📖' },
          { wiki: 'Poets', name: 'Poets', emoji: '📜' },
          { wiki: 'Playwrights', name: 'Playwrights', emoji: '🎭' },
        ]
      },
      {
        name: 'Performers & Athletes',
        emoji: '🎤',
        categories: [
          { wiki: 'Actors', name: 'Actors', emoji: '🎬' },
          { wiki: 'Singers', name: 'Singers', emoji: '🎤' },
          { wiki: 'Composers', name: 'Composers', emoji: '🎼' },
          { wiki: 'Olympic_athletes', name: 'Olympic Athletes', emoji: '🥇' },
          { wiki: 'Football_players', name: 'Football Players', emoji: '⚽' },
        ]
      },
      {
        name: 'Thinkers & Explorers',
        emoji: '💭',
        categories: [
          { wiki: 'Philosophers', name: 'Philosophers', emoji: '💭' },
          { wiki: 'Explorers', name: 'Explorers', emoji: '🧭' },
          { wiki: 'Astronauts', name: 'Astronauts', emoji: '👨‍🚀' },
          { wiki: 'Mathematicians', name: 'Mathematicians', emoji: '📐' },
          { wiki: 'Economists', name: 'Economists', emoji: '📊' },
        ]
      },
    ]
  },

  // TECHNOLOGY
  technology: {
    sections: [
      {
        name: 'Computing',
        emoji: '💻',
        categories: [
          { wiki: 'Computer_hardware', name: 'Computer Hardware', emoji: '🖥️' },
          { wiki: 'Software', name: 'Software', emoji: '💾' },
          { wiki: 'Programming_languages', name: 'Programming Languages', emoji: '👨‍💻' },
          { wiki: 'Internet', name: 'The Internet', emoji: '🌐' },
          { wiki: 'Artificial_intelligence', name: 'Artificial Intelligence', emoji: '🤖' },
        ]
      },
      {
        name: 'Engineering',
        emoji: '🔧',
        categories: [
          { wiki: 'Civil_engineering', name: 'Civil Engineering', emoji: '🏗️' },
          { wiki: 'Mechanical_engineering', name: 'Mechanical Engineering', emoji: '⚙️' },
          { wiki: 'Electrical_engineering', name: 'Electrical Engineering', emoji: '⚡' },
          { wiki: 'Aerospace_engineering', name: 'Aerospace Engineering', emoji: '🚀' },
          { wiki: 'Robotics', name: 'Robotics', emoji: '🤖' },
        ]
      },
      {
        name: 'Transportation',
        emoji: '🚗',
        categories: [
          { wiki: 'Automobiles', name: 'Automobiles', emoji: '🚗' },
          { wiki: 'Aircraft', name: 'Aircraft', emoji: '✈️' },
          { wiki: 'Ships', name: 'Ships & Boats', emoji: '🚢' },
          { wiki: 'Trains', name: 'Trains', emoji: '🚂' },
          { wiki: 'Spacecraft', name: 'Spacecraft', emoji: '🚀' },
        ]
      },
      {
        name: 'Inventions',
        emoji: '💡',
        categories: [
          { wiki: '19th-century_inventions', name: '19th Century Inventions', emoji: '⚙️' },
          { wiki: '20th-century_inventions', name: '20th Century Inventions', emoji: '📺' },
          { wiki: '21st-century_inventions', name: '21st Century Inventions', emoji: '📱' },
          { wiki: 'Communication_technology', name: 'Communication Tech', emoji: '📡' },
          { wiki: 'Medical_technology', name: 'Medical Technology', emoji: '🏥' },
        ]
      },
    ]
  },

  // PHILOSOPHY & RELIGION
  philosophy: {
    sections: [
      {
        name: 'World Religions',
        emoji: '🕌',
        categories: [
          { wiki: 'Christianity', name: 'Christianity', emoji: '✝️' },
          { wiki: 'Islam', name: 'Islam', emoji: '☪️' },
          { wiki: 'Hinduism', name: 'Hinduism', emoji: '🕉️' },
          { wiki: 'Buddhism', name: 'Buddhism', emoji: '☸️' },
          { wiki: 'Judaism', name: 'Judaism', emoji: '✡️' },
        ]
      },
      {
        name: 'Mythology',
        emoji: '🐉',
        categories: [
          { wiki: 'Greek_mythology', name: 'Greek Mythology', emoji: '⚡' },
          { wiki: 'Norse_mythology', name: 'Norse Mythology', emoji: '🔨' },
          { wiki: 'Egyptian_mythology', name: 'Egyptian Mythology', emoji: '🏺' },
          { wiki: 'Roman_mythology', name: 'Roman Mythology', emoji: '🏛️' },
          { wiki: 'Japanese_mythology', name: 'Japanese Mythology', emoji: '🐉' },
        ]
      },
      {
        name: 'Western Philosophy',
        emoji: '🏛️',
        categories: [
          { wiki: 'Ancient_Greek_philosophy', name: 'Ancient Greek Philosophy', emoji: '🏛️' },
          { wiki: 'Enlightenment_philosophy', name: 'Enlightenment', emoji: '💡' },
          { wiki: 'Existentialism', name: 'Existentialism', emoji: '🤔' },
          { wiki: 'Political_philosophy', name: 'Political Philosophy', emoji: '🏛️' },
          { wiki: 'Ethics', name: 'Ethics', emoji: '⚖️' },
        ]
      },
      {
        name: 'Eastern Philosophy',
        emoji: '☯️',
        categories: [
          { wiki: 'Confucianism', name: 'Confucianism', emoji: '📜' },
          { wiki: 'Taoism', name: 'Taoism', emoji: '☯️' },
          { wiki: 'Zen', name: 'Zen Buddhism', emoji: '🧘' },
          { wiki: 'Indian_philosophy', name: 'Indian Philosophy', emoji: '🕉️' },
          { wiki: 'Yoga', name: 'Yoga Philosophy', emoji: '🧘' },
        ]
      },
    ]
  },

  // MATHEMATICS
  mathematics: {
    sections: [
      {
        name: 'Fundamentals',
        emoji: '🔢',
        categories: [
          { wiki: 'Arithmetic', name: 'Arithmetic', emoji: '➕' },
          { wiki: 'Algebra', name: 'Algebra', emoji: '🔤' },
          { wiki: 'Geometry', name: 'Geometry', emoji: '📐' },
          { wiki: 'Trigonometry', name: 'Trigonometry', emoji: '📏' },
          { wiki: 'Calculus', name: 'Calculus', emoji: '∫' },
        ]
      },
      {
        name: 'Advanced Topics',
        emoji: '🧮',
        categories: [
          { wiki: 'Number_theory', name: 'Number Theory', emoji: '🔢' },
          { wiki: 'Statistics', name: 'Statistics', emoji: '📊' },
          { wiki: 'Probability_theory', name: 'Probability', emoji: '🎲' },
          { wiki: 'Linear_algebra', name: 'Linear Algebra', emoji: '📐' },
          { wiki: 'Topology', name: 'Topology', emoji: '🔄' },
        ]
      },
      {
        name: 'Famous Problems',
        emoji: '🧩',
        categories: [
          { wiki: 'Millennium_Prize_Problems', name: 'Millennium Problems', emoji: '🏆' },
          { wiki: 'Mathematical_paradoxes', name: 'Paradoxes', emoji: '🤯' },
          { wiki: 'Unsolved_problems_in_mathematics', name: 'Unsolved Problems', emoji: '❓' },
          { wiki: 'Mathematical_theorems', name: 'Famous Theorems', emoji: '📜' },
        ]
      },
      {
        name: 'Mathematicians',
        emoji: '🧠',
        categories: [
          { wiki: 'Ancient_Greek_mathematicians', name: 'Greek Mathematicians', emoji: '🏛️' },
          { wiki: 'Number_theorists', name: 'Number Theorists', emoji: '🔢' },
          { wiki: 'Fields_Medal_winners', name: 'Fields Medalists', emoji: '🏅' },
          { wiki: 'Women_mathematicians', name: 'Women in Math', emoji: '👩‍🔬' },
        ]
      },
    ]
  },

  // SOCIETY
  society: {
    sections: [
      {
        name: 'Politics & Government',
        emoji: '🏛️',
        categories: [
          { wiki: 'Democracy', name: 'Democracy', emoji: '🗳️' },
          { wiki: 'Political_ideologies', name: 'Political Ideologies', emoji: '🏛️' },
          { wiki: 'International_organizations', name: 'International Orgs', emoji: '🌐' },
          { wiki: 'Elections', name: 'Elections', emoji: '🗳️' },
          { wiki: 'Constitutions', name: 'Constitutions', emoji: '📜' },
        ]
      },
      {
        name: 'Economics',
        emoji: '💰',
        categories: [
          { wiki: 'Macroeconomics', name: 'Macroeconomics', emoji: '📈' },
          { wiki: 'Microeconomics', name: 'Microeconomics', emoji: '💵' },
          { wiki: 'Stock_markets', name: 'Stock Markets', emoji: '📊' },
          { wiki: 'Economic_systems', name: 'Economic Systems', emoji: '🏭' },
          { wiki: 'Currencies', name: 'Currencies', emoji: '💱' },
        ]
      },
      {
        name: 'Law & Justice',
        emoji: '⚖️',
        categories: [
          { wiki: 'Criminal_law', name: 'Criminal Law', emoji: '👮' },
          { wiki: 'Human_rights', name: 'Human Rights', emoji: '✊' },
          { wiki: 'International_law', name: 'International Law', emoji: '🌐' },
          { wiki: 'Famous_trials', name: 'Famous Trials', emoji: '⚖️' },
          { wiki: 'Supreme_courts', name: 'Supreme Courts', emoji: '🏛️' },
        ]
      },
      {
        name: 'Social Movements',
        emoji: '✊',
        categories: [
          { wiki: 'Civil_rights_movements', name: 'Civil Rights', emoji: '✊' },
          { wiki: 'Feminism', name: 'Feminism', emoji: '♀️' },
          { wiki: 'Environmental_movement', name: 'Environmental Movement', emoji: '🌱' },
          { wiki: 'Labor_movement', name: 'Labor Movement', emoji: '🏭' },
          { wiki: 'Peace_movements', name: 'Peace Movements', emoji: '☮️' },
        ]
      },
    ]
  },

  // EVERYDAY LIFE
  everyday: {
    sections: [
      {
        name: 'Food & Drink',
        emoji: '🍕',
        categories: [
          { wiki: 'Cuisines', name: 'World Cuisines', emoji: '🍽️' },
          { wiki: 'Cooking_techniques', name: 'Cooking Techniques', emoji: '👨‍🍳' },
          { wiki: 'Beverages', name: 'Beverages', emoji: '🥤' },
          { wiki: 'Desserts', name: 'Desserts', emoji: '🍰' },
          { wiki: 'Fast_food', name: 'Fast Food', emoji: '🍔' },
        ]
      },
      {
        name: 'Sports & Games',
        emoji: '⚽',
        categories: [
          { wiki: 'Football', name: 'Football/Soccer', emoji: '⚽' },
          { wiki: 'Basketball', name: 'Basketball', emoji: '🏀' },
          { wiki: 'Olympic_sports', name: 'Olympic Sports', emoji: '🥇' },
          { wiki: 'Board_games', name: 'Board Games', emoji: '🎲' },
          { wiki: 'Video_games', name: 'Video Games', emoji: '🎮' },
        ]
      },
      {
        name: 'Holidays & Traditions',
        emoji: '🎄',
        categories: [
          { wiki: 'Christmas', name: 'Christmas', emoji: '🎄' },
          { wiki: 'New_Year', name: 'New Year', emoji: '🎆' },
          { wiki: 'Halloween', name: 'Halloween', emoji: '🎃' },
          { wiki: 'Cultural_festivals', name: 'Cultural Festivals', emoji: '🎊' },
          { wiki: 'Wedding_traditions', name: 'Wedding Traditions', emoji: '💒' },
        ]
      },
      {
        name: 'Hobbies',
        emoji: '🎮',
        categories: [
          { wiki: 'Gardening', name: 'Gardening', emoji: '🌱' },
          { wiki: 'Collecting', name: 'Collecting', emoji: '📦' },
          { wiki: 'Photography', name: 'Photography', emoji: '📷' },
          { wiki: 'Crafts', name: 'Crafts', emoji: '🎨' },
          { wiki: 'Outdoor_recreation', name: 'Outdoor Activities', emoji: '🏕️' },
        ]
      },
    ]
  },
}

/**
 * Get Level 2 sections for a Level 1 category
 * Returns organized sections with Wikipedia categories
 * @param {string} categoryId - The Level 1 category ID (e.g., 'history', 'science')
 * @returns {Object|null} Section data or null if not found
 */
export function getLevel2Sections(categoryId) {
  return LEVEL_2_SECTIONS[categoryId] || null
}

/**
 * Fetch and organize Level 2 sub-categories from sections
 * @param {string} categoryId - The Level 1 category ID
 * @returns {Promise<Object>} Object with sections containing sub-deck arrays
 */
export async function fetchLevel2WithSections(categoryId) {
  const sectionData = LEVEL_2_SECTIONS[categoryId]
  if (!sectionData) {
    console.log(`[Wikipedia] No section mapping for category: ${categoryId}`)
    return null
  }

  const cacheKey = `l2_sections_${categoryId}`
  const cached = getCachedWikipedia(cacheKey)
  if (cached) {
    console.log(`[Wikipedia] Using cached Level 2 sections for: ${categoryId}`)
    return cached
  }

  console.log(`[Wikipedia] Building Level 2 sections for: ${categoryId}`)

  // Build sections with sub-decks from our curated mappings
  const result = {
    categoryId,
    sections: sectionData.sections.map(section => ({
      name: section.name,
      emoji: section.emoji,
      subDecks: section.categories.map(cat => ({
        id: cat.wiki.toLowerCase().replace(/_/g, '-'),
        name: cat.name,
        emoji: cat.emoji,
        wikiCategory: cat.wiki,
        source: 'wikipedia-section'
      }))
    }))
  }

  setCachedWikipedia(cacheKey, result)
  console.log(`[Wikipedia] Built ${result.sections.length} sections for: ${categoryId}`)

  return result
}

/**
 * Check if a category has Level 2 section mappings
 * @param {string} categoryId - The Level 1 category ID
 * @returns {boolean}
 */
export function hasLevel2Sections(categoryId) {
  return !!LEVEL_2_SECTIONS[categoryId]
}
