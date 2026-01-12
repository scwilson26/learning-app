import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Category data - Level 1 decks
const CATEGORIES = [
  {
    id: 'arts',
    name: 'Arts',
    emoji: '🎨',
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    children: ['architecture', 'literature', 'music', 'visual-arts', 'film-tv', 'performing-arts', 'photography', 'fashion-design']
  },
  {
    id: 'biology',
    name: 'Biology & Health',
    emoji: '🧬',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    children: ['human-body', 'animals', 'plants', 'ecology', 'medicine', 'genetics', 'microbes', 'marine-life']
  },
  {
    id: 'everyday',
    name: 'Everyday Life',
    emoji: '☕',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    children: ['food-drink', 'sports-games', 'hobbies', 'holidays', 'fashion', 'home-living', 'travel']
  },
  {
    id: 'geography',
    name: 'Geography',
    emoji: '🌍',
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    children: ['countries', 'cities', 'mountains', 'rivers-lakes', 'oceans', 'islands', 'deserts-forests', 'landmarks']
  },
  {
    id: 'history',
    name: 'History',
    emoji: '📜',
    gradient: 'from-yellow-600 to-amber-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    children: ['ancient', 'medieval', 'renaissance', 'modern', 'world-wars', 'empires', 'revolutions', 'exploration']
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    emoji: '🔢',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    children: ['numbers', 'algebra', 'geometry', 'statistics', 'famous-problems', 'mathematicians']
  },
  {
    id: 'people',
    name: 'People',
    emoji: '👤',
    gradient: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    children: ['leaders', 'scientists', 'artists-writers', 'musicians', 'explorers', 'philosophers', 'athletes', 'villains']
  },
  {
    id: 'philosophy',
    name: 'Philosophy & Religion',
    emoji: '🧘',
    gradient: 'from-violet-500 to-purple-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    children: ['world-religions', 'mythology', 'ethics', 'logic', 'eastern-philosophy', 'western-philosophy', 'spirituality']
  },
  {
    id: 'physics',
    name: 'Physical Sciences',
    emoji: '⚛️',
    gradient: 'from-blue-500 to-indigo-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    children: ['physics-mechanics', 'chemistry', 'astronomy', 'earth-science', 'energy', 'elements']
  },
  {
    id: 'society',
    name: 'Society',
    emoji: '🏛️',
    gradient: 'from-slate-500 to-gray-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    children: ['politics', 'economics', 'law', 'education', 'media', 'social-movements', 'military', 'culture']
  },
  {
    id: 'technology',
    name: 'Technology',
    emoji: '💻',
    gradient: 'from-green-500 to-emerald-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    children: ['computers', 'engineering', 'inventions', 'transportation', 'weapons', 'communication', 'energy-power', 'future-tech']
  },
]

// Subcategory data - Level 2 decks
const SUBCATEGORIES = {
  // History
  'ancient': { id: 'ancient', name: 'Ancient World', emoji: '🏛️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: ['egypt', 'rome', 'greece', 'persia', 'china-ancient', 'mesopotamia', 'maya'] },
  'medieval': { id: 'medieval', name: 'Medieval', emoji: '⚔️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'renaissance': { id: 'renaissance', name: 'Renaissance', emoji: '🎨', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'modern': { id: 'modern', name: 'Modern History', emoji: '🏭', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'world-wars': { id: 'world-wars', name: 'World Wars', emoji: '💣', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'empires': { id: 'empires', name: 'Empires', emoji: '👑', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'revolutions': { id: 'revolutions', name: 'Revolutions', emoji: '✊', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'exploration': { id: 'exploration', name: 'Exploration', emoji: '🧭', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },

  // Ancient World children (Level 3)
  'egypt': { id: 'egypt', name: 'Ancient Egypt', emoji: '🏺', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'rome': { id: 'rome', name: 'Ancient Rome', emoji: '🏛️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'greece': { id: 'greece', name: 'Ancient Greece', emoji: '🏺', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'persia': { id: 'persia', name: 'Persian Empire', emoji: '🦁', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'china-ancient': { id: 'china-ancient', name: 'Ancient China', emoji: '🐉', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'mesopotamia': { id: 'mesopotamia', name: 'Mesopotamia', emoji: '🌙', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'maya': { id: 'maya', name: 'Maya Civilization', emoji: '🌽', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
}

// Overview cards for each deck
const OVERVIEW_CARDS = {
  'history': [
    { id: 'history-1', title: 'What is History?', content: 'History is the study of past events, particularly human affairs. It helps us understand how societies evolved, why conflicts arose, and how ideas spread across civilizations.' },
    { id: 'history-2', title: 'Why Study History?', content: 'Those who cannot remember the past are condemned to repeat it. History teaches us patterns, warns us of mistakes, and shows us what humans are capable of—both good and evil.' },
    { id: 'history-3', title: 'How We Know', content: 'Historians piece together the past using primary sources: documents, artifacts, buildings, art. Each source is a puzzle piece in understanding what really happened.' },
  ],
  'ancient': [
    { id: 'ancient-1', title: 'The Ancient World', content: 'From roughly 3000 BCE to 500 CE, ancient civilizations built the foundations of everything we know. Writing, law, philosophy, architecture—it all started here.' },
    { id: 'ancient-2', title: 'River Valley Origins', content: 'The first great civilizations arose along rivers: the Nile, Tigris, Euphrates, Indus, and Yellow River. Water meant farming, farming meant cities, cities meant civilization.' },
    { id: 'ancient-3', title: 'Connected World', content: 'Ancient peoples traded, fought, and exchanged ideas across vast distances. The Silk Road, Mediterranean shipping, and migration spread technology and culture far and wide.' },
  ],
  'egypt': [
    { id: 'egypt-1', title: 'Gift of the Nile', content: 'Egypt existed because of the Nile. Annual floods deposited rich soil, enabling farming in a desert. Herodotus called Egypt "the gift of the Nile"—without it, no pyramids, no pharaohs, nothing.' },
    { id: 'egypt-2', title: 'God-Kings', content: 'Pharaohs weren\'t just rulers—they were living gods. This divine authority let them command massive projects like the pyramids and maintain power for 3,000 years.' },
    { id: 'egypt-3', title: 'Death & Afterlife', content: 'Egyptians were obsessed with the afterlife. Mummification, tomb paintings, the Book of the Dead—all designed to ensure eternal life. Death was just the beginning.' },
    { id: 'egypt-4', title: 'Hieroglyphics', content: 'Egyptian writing used pictures for sounds and meanings. Lost for centuries until the Rosetta Stone was discovered in 1799, unlocking 3,000 years of history.' },
    { id: 'egypt-5', title: 'Legacy', content: 'Egypt gave us the 365-day calendar, paper (papyrus), advances in medicine and mathematics, and architectural techniques still studied today. Their influence echoes through millennia.' },
  ],
  'arts': [
    { id: 'arts-1', title: 'What is Art?', content: 'Art is humanity\'s way of expressing what words cannot. From cave paintings to digital installations, we\'ve always needed to create beauty, provoke thought, and capture experience.' },
    { id: 'arts-2', title: 'Art Through Time', content: 'Every era has its art: Egyptian monuments, Greek sculptures, Renaissance paintings, modern abstracts. Art reflects what each society valued, feared, and dreamed.' },
    { id: 'arts-3', title: 'Why Art Matters', content: 'Art challenges us, comforts us, and connects us across time and culture. A 30,000-year-old cave painting still moves us. That\'s the power of human creativity.' },
  ],
  'biology': [
    { id: 'biology-1', title: 'The Science of Life', content: 'Biology studies living things—from bacteria to blue whales, from cells to ecosystems. It asks: What is life? How does it work? How did we get here?' },
    { id: 'biology-2', title: 'Unity in Diversity', content: 'All life shares the same basic machinery: DNA, cells, proteins. Yet from this common foundation springs incredible diversity—millions of species, each uniquely adapted.' },
    { id: 'biology-3', title: 'You Are Biology', content: 'Your heartbeat, your thoughts, your hunger—all biology. Understanding life means understanding yourself, your health, and your place in the living world.' },
  ],
  'technology': [
    { id: 'technology-1', title: 'Tools That Changed Everything', content: 'Technology is humanity\'s superpower. Fire, the wheel, writing, computers—each invention transformed what we could do and who we could become.' },
    { id: 'technology-2', title: 'Accelerating Change', content: 'Technology builds on itself. The smartphone in your pocket has more computing power than NASA used to land on the moon. Progress is exponential.' },
    { id: 'technology-3', title: 'Double-Edged Sword', content: 'Every technology can help or harm. Nuclear power or nuclear weapons. Social connection or social manipulation. The tool is neutral; we choose how to use it.' },
  ],
}

// Get deck data by ID
function getDeck(id) {
  const category = CATEGORIES.find(c => c.id === id)
  if (category) return category
  return SUBCATEGORIES[id] || null
}

// Deck component - a card with subtle stack effect (cards underneath)
function Deck({ deck, onOpen, claimed, cardCount }) {
  return (
    <motion.div
      className="relative cursor-pointer group"
      onClick={() => onOpen(deck)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{ paddingRight: 6, paddingBottom: 6 }}
    >
      {/* Stack layers - cards peeking out underneath with slight rotation */}
      <div
        className="absolute w-36 h-48 rounded-xl bg-white border border-gray-300"
        style={{
          transform: 'translate(4px, 4px) rotate(2deg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      />
      <div
        className="absolute w-36 h-48 rounded-xl bg-white border border-gray-300"
        style={{
          transform: 'translate(2px, 2px) rotate(0.5deg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}
      />

      {/* Top card */}
      <div className="relative w-36 h-48">
        <div className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-br ${deck.gradient}
          shadow-lg group-hover:shadow-xl transition-shadow
          ${claimed ? 'ring-4 ring-yellow-400' : ''}
        `} />
        <div className="absolute inset-[3px] rounded-lg bg-white flex flex-col items-center justify-center">
          <span className="text-4xl mb-2">{deck.emoji}</span>
          <span className="text-sm font-semibold text-gray-800 text-center px-3 leading-tight">{deck.name}</span>
          {claimed && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
          {/* Card count */}
          <div className="absolute bottom-2 text-xs text-gray-400">
            {cardCount !== undefined ? `${cardCount} cards` : `${deck.children?.length || 0} decks`}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Overview card component
function OverviewCard({ card, index, total, onClaim, claimed, onRead }) {
  return (
    <motion.div
      className={`
        relative w-28 h-40 rounded-xl cursor-pointer
        bg-white border-2 ${claimed ? 'border-yellow-400' : 'border-gray-200'}
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col items-center justify-center p-3
      `}
      onClick={() => onRead(card)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <span className="text-xs text-gray-400 mb-1">{index + 1}/{total}</span>
      <span className="text-xs font-medium text-gray-800 text-center leading-tight">{card.title}</span>
      {claimed && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </div>
      )}
    </motion.div>
  )
}

// Expanded card - zooms in and can flip back and forth
function ExpandedCard({ card, index, total, onClaim, claimed, onClose }) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = (e) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Card container with perspective for 3D flip */}
      <motion.div
        className="relative w-72 h-96 cursor-pointer"
        style={{ perspective: 1000 }}
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 50 }}
        onClick={handleFlip}
      >
        {/* Inner container that flips */}
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Front of card */}
          <div
            className="absolute inset-0 rounded-2xl bg-white border-2 border-gray-200 shadow-2xl flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-sm text-gray-400 mb-2">{index + 1}/{total}</span>
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">{card.title}</h2>
            <span className="text-gray-400 text-sm">Tap to flip</span>
            {claimed && (
              <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </div>

          {/* Back of card */}
          <div
            className="absolute inset-0 rounded-2xl bg-white border-2 border-gray-200 shadow-2xl flex flex-col p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-800">{card.title}</h2>
              <span className="text-sm text-gray-400">{index + 1}/{total}</span>
            </div>
            <p className="text-gray-600 leading-relaxed flex-1 overflow-auto">{card.content}</p>
            <div className="mt-4" onClick={e => e.stopPropagation()}>
              {!claimed ? (
                <button
                  onClick={() => onClaim(card.id)}
                  className="w-full py-3 rounded-xl text-white font-bold bg-gradient-to-r from-yellow-500 to-amber-600 hover:opacity-90 active:scale-[0.98] transition-all"
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
        </motion.div>
      </motion.div>

      {/* Hint text */}
      <div className="absolute bottom-8 text-white/70 text-sm">
        Tap card to flip · Tap outside to close
      </div>
    </motion.div>
  )
}

// Parent deck card - shows underneath the current spread
function ParentDeckCard({ deck, depth }) {
  const offset = depth * 8

  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2"
      style={{ bottom: offset }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`
        w-[90vw] max-w-2xl h-20 rounded-xl
        bg-gradient-to-br ${deck.gradient}
        shadow-lg border-4 border-white/50
        flex items-center justify-center gap-3
      `}>
        <span className="text-3xl">{deck.emoji}</span>
        <span className="text-lg font-bold text-white drop-shadow">{deck.name}</span>
      </div>
    </motion.div>
  )
}

// The spread - overview cards + sub-decks laid out in a grid
function DeckSpread({ deck, overviewCards, childDecks, onOpenDeck, onReadCard, claimedCards }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-8 pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Overview cards row */}
      {overviewCards.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">{deck.emoji} {deck.name}</span>
          <div className="flex gap-4 flex-wrap justify-center">
            {overviewCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <OverviewCard
                  card={card}
                  index={index}
                  total={overviewCards.length}
                  claimed={claimedCards.has(card.id)}
                  onClaim={() => {}}
                  onRead={onReadCard}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-decks grid */}
      {childDecks.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Explore</span>
          <div className="flex gap-6 flex-wrap justify-center max-w-4xl">
            {childDecks.map((childDeck, index) => (
              <motion.div
                key={childDeck.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 + 0.15 }}
              >
                <Deck
                  deck={childDeck}
                  onOpen={onOpenDeck}
                  claimed={claimedCards.has(childDeck.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {overviewCards.length === 0 && childDecks.length === 0 && (
        <div className="text-center py-8">
          <span className="text-5xl mb-4 block">{deck.emoji}</span>
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      )}
    </motion.div>
  )
}

export default function Canvas() {
  const [claimedCards, setClaimedCards] = useState(new Set())
  const [stack, setStack] = useState([]) // Array of deck IDs representing the stack
  const [expandedCard, setExpandedCard] = useState(null)

  const handleClaim = (cardId) => {
    setClaimedCards(prev => new Set([...prev, cardId]))
    // Don't close the modal, let user see the claimed state
  }

  const openDeck = (deck) => {
    setStack(prev => [...prev, deck.id])
  }

  const goBack = () => {
    setStack(prev => prev.slice(0, -1))
  }

  // Get full deck objects for the stack
  const stackDecks = stack.map(id => getDeck(id)).filter(Boolean)
  const currentDeck = stackDecks.length > 0 ? stackDecks[stackDecks.length - 1] : null

  // Get data for current spread
  const overviewCards = currentDeck ? (OVERVIEW_CARDS[currentDeck.id] || []) : []
  const childDeckIds = currentDeck?.children || []
  const childDecks = childDeckIds.map(id => getDeck(id)).filter(Boolean)

  // Find the expanded card data
  const expandedCardData = expandedCard
    ? overviewCards.find(c => c.id === expandedCard)
    : null
  const expandedCardIndex = expandedCardData
    ? overviewCards.findIndex(c => c.id === expandedCard)
    : -1

  // Root level - show all category decks
  if (stack.length === 0) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
        <div className="min-h-screen flex items-center justify-center p-8 pt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
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
        <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-sm">Cards: </span>
          <span className="text-gray-800 font-bold">{claimedCards.size}</span>
          <span className="text-gray-400 text-sm"> / 5,000</span>
        </div>
      </div>
    )
  }

  // Inside the stack - show parent decks underneath and current spread on top
  return (
    <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-40">
        <motion.button
          onClick={goBack}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-2xl">←</span>
        </motion.button>
      </div>

      {/* Collection counter */}
      <div className="fixed top-4 right-4 z-40 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
        <span className="text-gray-500 text-sm">Cards: </span>
        <span className="text-gray-800 font-bold">{claimedCards.size}</span>
        <span className="text-gray-400 text-sm"> / 5,000</span>
      </div>

      {/* Current spread */}
      <div className="min-h-screen flex items-start justify-center pt-20 px-4">
        <AnimatePresence mode="wait">
          <DeckSpread
            key={currentDeck.id}
            deck={currentDeck}
            overviewCards={overviewCards}
            childDecks={childDecks}
            onOpenDeck={openDeck}
            onReadCard={(card) => setExpandedCard(card.id)}
            claimedCards={claimedCards}
          />
        </AnimatePresence>
      </div>

      {/* Expanded card modal */}
      <AnimatePresence>
        {expandedCardData && (
          <ExpandedCard
            card={expandedCardData}
            index={expandedCardIndex}
            total={overviewCards.length}
            claimed={claimedCards.has(expandedCardData.id)}
            onClaim={handleClaim}
            onClose={() => setExpandedCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
