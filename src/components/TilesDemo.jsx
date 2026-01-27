import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Single tile component - used across all views
function SingleTile({ index, isFlipped, onClick, delay = 0 }) {
  return (
    <motion.div
      className="aspect-square cursor-pointer perspective-1000"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - emerald tile */}
        <div
          className="absolute inset-0 rounded-sm overflow-hidden backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 relative">
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
        {/* Back - white (content rendered by parent) */}
        <div
          className="absolute inset-0 rounded-sm bg-white backface-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        />
      </motion.div>
    </motion.div>
  )
}

// OUTLINE VIEW: All tiles flip together to reveal one document
function OutlineView({ tileCount, outline, deckName, cols }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const rows = Math.ceil(tileCount / cols)

  return (
    <div className="relative">
      {/* Tiles layer */}
      <div
        className="grid gap-1 cursor-pointer"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {Array.from({ length: tileCount }).map((_, i) => (
          <SingleTile
            key={i}
            index={i}
            isFlipped={isFlipped}
            onClick={() => setIsFlipped(!isFlipped)}
            delay={i * 0.005}
          />
        ))}
      </div>

      {/* Content overlay - shows when flipped */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            className="absolute inset-0 bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            onClick={() => setIsFlipped(false)}
          >
            <div className="h-full overflow-auto p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">{deckName}</h2>
              <div className="space-y-6 text-sm">
                {outline.map((section, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                    <h3 className="font-semibold text-emerald-600 mb-2">
                      {idx + 1}. {section.title}
                    </h3>
                    <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {section.content || section.concept}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center py-6 text-gray-400 text-sm">
                Tap to see tiles
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap hint when not flipped */}
      {!isFlipped && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Tap to reveal outline
        </div>
      )}
    </div>
  )
}

// CARDS VIEW: Tiles grouped, each group flips together
function CardsView({ tileCount, cards, cols }) {
  const [flippedGroups, setFlippedGroups] = useState({})

  // Divide tiles evenly among cards
  const tilesPerCard = Math.ceil(tileCount / cards.length)
  const cardCols = 2 // Cards arranged 2 per row
  const tileCols = Math.ceil(Math.sqrt(tilesPerCard)) // Tiles within each card

  const toggleGroup = (cardIndex) => {
    setFlippedGroups(prev => ({
      ...prev,
      [cardIndex]: !prev[cardIndex]
    }))
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cardCols}, 1fr)` }}
    >
      {cards.map((card, cardIndex) => {
        const isFlipped = flippedGroups[cardIndex]
        const startTile = cardIndex * tilesPerCard
        const endTile = Math.min(startTile + tilesPerCard, tileCount)
        const cardTileCount = endTile - startTile

        return (
          <div
            key={cardIndex}
            className="relative cursor-pointer"
            onClick={() => toggleGroup(cardIndex)}
          >
            {/* Tiles grid for this card */}
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${tileCols}, 1fr)` }}
            >
              {Array.from({ length: cardTileCount }).map((_, i) => (
                <SingleTile
                  key={i}
                  index={startTile + i}
                  isFlipped={isFlipped}
                  onClick={() => toggleGroup(cardIndex)}
                  delay={i * 0.02}
                />
              ))}
            </div>

            {/* Card content overlay when flipped */}
            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  className="absolute inset-0 bg-white rounded-lg shadow-lg p-4 overflow-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                >
                  <h3 className="font-semibold text-emerald-600 mb-2 text-sm">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap">
                    {card.content || card.concept}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// FLASHCARDS VIEW: Each tile flips individually
function FlashcardsView({ flashcards, cols }) {
  const [flippedCards, setFlippedCards] = useState({})

  const toggleCard = (index) => {
    setFlippedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {flashcards.map((flashcard, index) => {
        const isFlipped = flippedCards[index]

        return (
          <motion.div
            key={index}
            className="aspect-square cursor-pointer perspective-1000 relative"
            onClick={() => toggleCard(index)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01, duration: 0.2 }}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front - emerald tile with question hint */}
              <div
                className="absolute inset-0 rounded-lg overflow-hidden backface-hidden shadow-md"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 relative">
                  <div className="absolute inset-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <span className="text-white font-medium text-center text-xs drop-shadow-lg line-clamp-4">
                      {flashcard.question}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back - answer */}
              <div
                className="absolute inset-0 rounded-lg bg-white shadow-lg p-2 overflow-auto backface-hidden"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <p className="text-emerald-600 font-medium text-xs mb-1 line-clamp-2">
                  {flashcard.question}
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {flashcard.answer}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// Main TileView component
export default function TileView({ deck, onBack, embedded = false }) {
  const [zoomLevel, setZoomLevel] = useState('outline')

  const levels = ['outline', 'cards', 'flashcards']
  const currentIndex = levels.indexOf(zoomLevel)

  const canBreakDown = currentIndex < levels.length - 1
  const canZoomOut = currentIndex > 0

  const breakDown = () => {
    if (canBreakDown) {
      setZoomLevel(levels[currentIndex + 1])
    }
  }

  const zoomOut = () => {
    if (canZoomOut) {
      setZoomLevel(levels[currentIndex - 1])
    }
  }

  // Build data from deck
  const outlineTiles = deck?.outline
    ? [...(deck.outline.core || []), ...(deck.outline.deep_dive || [])]
    : []

  const cardTiles = deck?.cards
    ? [...(deck.cards.core || []), ...(deck.cards.deep_dive || [])]
    : []

  const flashcardTiles = deck?.flashcards || []

  // Demo data fallback
  const DEMO_OUTLINE = Array.from({ length: 4 }, (_, i) => ({
    id: `outline-${i}`,
    title: `Section ${i + 1}: Key Concept`,
    content: `This section covers important information about topic ${i + 1}.\n\n• First key point\n• Second important detail\n• Third concept`
  }))
  const DEMO_CARDS = Array.from({ length: 4 }, (_, i) => ({
    id: `card-${i}`,
    title: `Card ${i + 1}: Learning Topic`,
    content: `Detailed explanation for card ${i + 1}. This contains the learning content that students need to understand.`
  }))
  const DEMO_FLASHCARDS = Array.from({ length: 16 }, (_, i) => ({
    id: `flash-${i}`,
    question: `What is concept ${i + 1}?`,
    answer: `This is the answer explaining concept ${i + 1} in detail.`
  }))

  const activeOutline = deck ? outlineTiles : DEMO_OUTLINE
  const activeCards = deck ? cardTiles : DEMO_CARDS
  const activeFlashcards = deck ? flashcardTiles : DEMO_FLASHCARDS
  const deckName = deck?.name || 'Demo Deck'

  // THE KEY: tile count is based on flashcards
  const tileCount = activeFlashcards.length

  // Calculate columns based on tile count for a nice grid
  const cols = tileCount <= 9 ? 3 : tileCount <= 16 ? 4 : tileCount <= 25 ? 5 : 6

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 ${embedded ? '' : 'w-screen'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        {/* Back button + Title */}
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-800 truncate flex-1">{deckName}</h1>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center justify-center gap-2 text-sm mb-3">
          {levels.map((level, i) => (
            <span key={level} className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(level)}
                className={`capitalize transition-colors ${
                  zoomLevel === level
                    ? 'text-emerald-600 font-semibold'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {level}
              </button>
              {i < levels.length - 1 && (
                <span className="text-gray-300">→</span>
              )}
            </span>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              canZoomOut
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            ← Zoom Out
          </button>
          <button
            onClick={breakDown}
            disabled={!canBreakDown}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
              canBreakDown
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            Break Down →
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 pb-24">
        <AnimatePresence mode="wait">
          {zoomLevel === 'outline' && (
            <motion.div
              key="outline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <OutlineView
                tileCount={tileCount}
                outline={activeOutline}
                deckName={deckName}
                cols={cols}
              />
            </motion.div>
          )}

          {zoomLevel === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardsView
                tileCount={tileCount}
                cards={activeCards}
                cols={cols}
              />
            </motion.div>
          )}

          {zoomLevel === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FlashcardsView
                flashcards={activeFlashcards}
                cols={cols}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Level indicator */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-gray-600 shadow-lg">
          {zoomLevel === 'outline' && `${tileCount} tiles → 1 outline`}
          {zoomLevel === 'cards' && `${tileCount} tiles → ${activeCards.length} cards`}
          {zoomLevel === 'flashcards' && `${tileCount} flashcards`}
        </div>
      </div>
    </div>
  )
}

// Export standalone demo version
export function TilesDemo() {
  return <TileView />
}
