import { useState } from 'react'

// Category data - Level 1 decks
const CATEGORIES = [
  {
    id: 'arts',
    name: 'Arts',
    emoji: '🎨',
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    description: 'From cave paintings to digital art. Explore the creative expressions that define human culture across millennia.',
    children: ['architecture', 'literature', 'music', 'visual-arts', 'film-tv', 'performing-arts', 'photography', 'fashion-design']
  },
  {
    id: 'biology',
    name: 'Biology & Health',
    emoji: '🧬',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    description: 'The science of life itself. Discover how living things work, from tiny cells to entire ecosystems.',
    children: ['human-body', 'animals', 'plants', 'ecology', 'medicine', 'genetics', 'microbes', 'marine-life']
  },
  {
    id: 'everyday',
    name: 'Everyday Life',
    emoji: '☕',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    description: 'The things we do, eat, and enjoy. Explore the fascinating stories behind ordinary life.',
    children: ['food-drink', 'sports-games', 'hobbies', 'holidays', 'fashion', 'home-living', 'travel']
  },
  {
    id: 'geography',
    name: 'Geography',
    emoji: '🌍',
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    description: 'Mountains, rivers, cities, and nations. Explore the places that shape our world.',
    children: ['countries', 'cities', 'mountains', 'rivers-lakes', 'oceans', 'islands', 'deserts-forests', 'landmarks']
  },
  {
    id: 'history',
    name: 'History',
    emoji: '📜',
    gradient: 'from-yellow-600 to-amber-700',
    bgColor: 'bg-yellow-50',
    description: 'Wars, revolutions, and empires. The stories of how we got here and the people who shaped the world.',
    children: ['ancient', 'medieval', 'renaissance', 'modern', 'world-wars', 'empires', 'revolutions', 'exploration']
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    emoji: '🔢',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    description: 'The language of the universe. From simple numbers to mind-bending theories that explain reality.',
    children: ['numbers', 'algebra', 'geometry', 'statistics', 'famous-problems', 'mathematicians']
  },
  {
    id: 'people',
    name: 'People',
    emoji: '👤',
    gradient: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    description: 'The remarkable humans who changed everything. Leaders, artists, scientists, and outlaws.',
    children: ['leaders', 'scientists', 'artists-writers', 'musicians', 'explorers', 'philosophers', 'athletes', 'villains']
  },
  {
    id: 'philosophy',
    name: 'Philosophy & Religion',
    emoji: '🧘',
    gradient: 'from-violet-500 to-purple-700',
    bgColor: 'bg-violet-50',
    description: 'The big questions. What is real? What is good? What do we believe and why?',
    children: ['world-religions', 'mythology', 'ethics', 'logic', 'eastern-philosophy', 'western-philosophy', 'spirituality']
  },
  {
    id: 'physics',
    name: 'Physical Sciences',
    emoji: '⚛️',
    gradient: 'from-blue-500 to-indigo-700',
    bgColor: 'bg-blue-50',
    description: 'Atoms, stars, and everything between. The rules that govern the universe.',
    children: ['physics', 'chemistry', 'astronomy', 'earth-science', 'energy', 'elements']
  },
  {
    id: 'society',
    name: 'Society',
    emoji: '🏛️',
    gradient: 'from-slate-500 to-gray-700',
    bgColor: 'bg-slate-50',
    description: 'How humans organize themselves. Politics, economics, laws, and cultures.',
    children: ['politics', 'economics', 'law', 'education', 'media', 'social-movements', 'military', 'culture']
  },
  {
    id: 'technology',
    name: 'Technology',
    emoji: '💻',
    gradient: 'from-green-500 to-emerald-700',
    bgColor: 'bg-green-50',
    description: 'The tools we build. From ancient inventions to AI and beyond.',
    children: ['computers', 'engineering', 'inventions', 'transportation', 'weapons', 'communication', 'energy-power', 'future-tech']
  },
]

// Subcategory data (for History as example)
const SUBCATEGORIES = {
  'ancient': { id: 'ancient', name: 'Ancient World', emoji: '🏛️', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'medieval': { id: 'medieval', name: 'Medieval', emoji: '⚔️', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'renaissance': { id: 'renaissance', name: 'Renaissance', emoji: '🎨', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'modern': { id: 'modern', name: 'Modern History', emoji: '🏭', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'world-wars': { id: 'world-wars', name: 'World Wars', emoji: '💣', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'empires': { id: 'empires', name: 'Empires', emoji: '👑', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'revolutions': { id: 'revolutions', name: 'Revolutions', emoji: '✊', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
  'exploration': { id: 'exploration', name: 'Exploration', emoji: '🧭', gradient: 'from-yellow-600 to-amber-700', bgColor: 'bg-yellow-50' },
}

// Overview cards for History deck
const OVERVIEW_CARDS = {
  'history': [
    { id: 'history-1', title: 'What is History?', content: 'History is the study of past events, particularly human affairs. It helps us understand how societies evolved, why conflicts arose, and how ideas spread across civilizations.' },
    { id: 'history-2', title: 'Why Study History?', content: 'Those who cannot remember the past are condemned to repeat it. History teaches us patterns, warns us of mistakes, and shows us what humans are capable of—both good and evil.' },
    { id: 'history-3', title: 'How We Know', content: 'Historians piece together the past using primary sources: documents, artifacts, buildings, art. Each source is a puzzle piece in understanding what really happened.' },
  ]
}

// Deck component - looks like a stack of cards
function Deck({ deck, onOpen, claimed }) {
  return (
    <div
      className="w-40 h-56 cursor-pointer group"
      onClick={() => onOpen(deck)}
    >
      {/* Stack effect - cards behind */}
      <div className={`absolute w-40 h-56 rounded-xl bg-gradient-to-br ${deck.gradient} opacity-40 translate-x-2 translate-y-2`} />
      <div className={`absolute w-40 h-56 rounded-xl bg-gradient-to-br ${deck.gradient} opacity-60 translate-x-1 translate-y-1`} />

      {/* Main card */}
      <div className="relative w-40 h-56">
        <div className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-br ${deck.gradient}
          shadow-lg group-hover:shadow-xl transition-all
          group-hover:-translate-y-1
          ${claimed ? 'ring-4 ring-yellow-400' : ''}
        `} />
        <div className="absolute inset-[4px] rounded-lg bg-white flex flex-col items-center justify-center">
          <span className="text-5xl mb-3">{deck.emoji}</span>
          <span className="text-sm font-semibold text-gray-800 text-center px-4">{deck.name}</span>
          {claimed && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
          {/* Card count indicator */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {deck.children?.length || 0} decks
          </div>
        </div>
      </div>
    </div>
  )
}

// Overview card component - for reading content
function OverviewCard({ card, index, total, onClaim, claimed, isExpanded, onToggle }) {
  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onToggle}
      >
        <div
          className="w-80 bg-white rounded-2xl shadow-2xl p-6 m-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-800">{card.title}</h2>
            <span className="text-sm text-gray-400">{index + 1}/{total}</span>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">{card.content}</p>
          {!claimed ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(card.id); }}
              className="w-full py-3 rounded-xl text-white font-bold bg-gradient-to-r from-yellow-500 to-amber-600 hover:opacity-90 active:scale-95 transition-all"
            >
              Claim Card
            </button>
          ) : (
            <div className="w-full py-3 rounded-xl text-center font-bold text-yellow-600 bg-yellow-100">
              ✓ Claimed!
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        w-32 h-44 rounded-xl cursor-pointer
        bg-white border-2 border-gray-200
        shadow-md hover:shadow-lg transition-all hover:-translate-y-1
        flex flex-col items-center justify-center p-3
        ${claimed ? 'ring-2 ring-yellow-400' : ''}
      `}
      onClick={onToggle}
    >
      <span className="text-xs text-gray-400 mb-2">{index + 1}/{total}</span>
      <span className="text-sm font-medium text-gray-800 text-center">{card.title}</span>
      {claimed && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  )
}

export default function Canvas() {
  const [claimedCards, setClaimedCards] = useState(new Set())
  const [currentPath, setCurrentPath] = useState([]) // Stack of deck IDs
  const [expandedCard, setExpandedCard] = useState(null)

  const handleClaim = (cardId) => {
    setClaimedCards(prev => new Set([...prev, cardId]))
  }

  const openDeck = (deck) => {
    setCurrentPath(prev => [...prev, deck.id])
  }

  const goBack = () => {
    setCurrentPath(prev => prev.slice(0, -1))
  }

  // Get current deck based on path
  const getCurrentDeck = () => {
    if (currentPath.length === 0) return null
    const lastId = currentPath[currentPath.length - 1]
    return CATEGORIES.find(c => c.id === lastId) || null
  }

  const currentDeck = getCurrentDeck()

  // Root level - show all category decks
  if (!currentDeck) {
    return (
      <div className="w-screen h-screen bg-gray-100 overflow-auto">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
            {CATEGORIES.map((category) => (
              <Deck
                key={category.id}
                deck={category}
                claimed={claimedCards.has(category.id)}
                onOpen={openDeck}
              />
            ))}
          </div>
        </div>

        {/* Collection counter */}
        <div className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-sm">Cards collected: </span>
          <span className="text-gray-800 font-bold">{claimedCards.size} / 5,000</span>
        </div>
      </div>
    )
  }

  // Inside a deck - show overview cards and child decks
  const overviewCards = OVERVIEW_CARDS[currentDeck.id] || []
  const childDecks = (currentDeck.children || []).map(id => SUBCATEGORIES[id]).filter(Boolean)

  return (
    <div className={`w-screen min-h-screen ${currentDeck.bgColor} overflow-auto`}>
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentDeck.emoji}</span>
            <h1 className="text-xl font-bold text-gray-800">{currentDeck.name}</h1>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Overview cards section */}
        {overviewCards.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Overview</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {overviewCards.map((card, index) => (
                <OverviewCard
                  key={card.id}
                  card={card}
                  index={index}
                  total={overviewCards.length}
                  claimed={claimedCards.has(card.id)}
                  onClaim={handleClaim}
                  isExpanded={expandedCard === card.id}
                  onToggle={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Child decks section */}
        {childDecks.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Explore</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {childDecks.map((deck) => (
                <Deck
                  key={deck.id}
                  deck={deck}
                  claimed={claimedCards.has(deck.id)}
                  onOpen={openDeck}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state for decks without data yet */}
        {overviewCards.length === 0 && childDecks.length === 0 && (
          <div className="text-center py-16">
            <span className="text-6xl mb-4 block">{currentDeck.emoji}</span>
            <p className="text-gray-500">Content coming soon...</p>
            <p className="text-sm text-gray-400 mt-2">This deck will be filled with cards to explore!</p>
          </div>
        )}
      </div>

      {/* Collection counter */}
      <div className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
        <span className="text-gray-500 text-sm">Cards collected: </span>
        <span className="text-gray-800 font-bold">{claimedCards.size} / 5,000</span>
      </div>
    </div>
  )
}
