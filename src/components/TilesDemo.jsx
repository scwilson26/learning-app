import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Tile sizes for each zoom level
const TILE_SIZES = {
  outline: 'w-8 h-8',      // Tiny - all fit on screen
  cards: 'w-20 h-20',      // Medium - grouped
  flashcards: 'w-28 h-28'  // Large - need to scroll
}

const GRID_GAPS = {
  outline: 'gap-1',
  cards: 'gap-2',
  flashcards: 'gap-3'
}

// Main TileView component - unified zoom experience
export default function TileView({ deck, onBack, embedded = false }) {
  const [zoomLevel, setZoomLevel] = useState('outline')
  const [flippedTiles, setFlippedTiles] = useState({})
  const [allFlipped, setAllFlipped] = useState(false)

  const levels = ['outline', 'cards', 'flashcards']
  const currentIndex = levels.indexOf(zoomLevel)

  const canBreakDown = currentIndex < levels.length - 1
  const canZoomOut = currentIndex > 0

  const breakDown = () => {
    if (canBreakDown) {
      // Reset flip states when changing level
      setFlippedTiles({})
      setAllFlipped(false)
      setZoomLevel(levels[currentIndex + 1])
    }
  }

  const zoomOut = () => {
    if (canZoomOut) {
      setFlippedTiles({})
      setAllFlipped(false)
      setZoomLevel(levels[currentIndex - 1])
    }
  }

  const handleLevelClick = (level) => {
    setFlippedTiles({})
    setAllFlipped(false)
    setZoomLevel(level)
  }

  // Build data from deck
  const outlineSections = deck?.outline
    ? [...(deck.outline.core || []), ...(deck.outline.deep_dive || [])]
    : []

  const cards = deck?.cards
    ? [...(deck.cards.core || []), ...(deck.cards.deep_dive || [])]
    : []

  const flashcards = deck?.flashcards || []

  // Demo data fallback
  const DEMO_OUTLINE = Array.from({ length: 4 }, (_, i) => ({
    id: `outline-${i}`,
    title: `Section ${i + 1}: Key Concept`,
    content: `This section covers topic ${i + 1}.\n\n• First key point\n• Second detail\n• Third concept`
  }))
  const DEMO_CARDS = Array.from({ length: 4 }, (_, i) => ({
    id: `card-${i}`,
    title: `Card ${i + 1}`,
    content: `Detailed explanation for card ${i + 1}.`
  }))
  const DEMO_FLASHCARDS = Array.from({ length: 16 }, (_, i) => ({
    id: `flash-${i}`,
    question: `What is concept ${i + 1}?`,
    answer: `Answer for concept ${i + 1}.`
  }))

  const activeOutline = deck ? outlineSections : DEMO_OUTLINE
  const activeCards = deck ? cards : DEMO_CARDS
  const activeFlashcards = deck ? flashcards : DEMO_FLASHCARDS
  const deckName = deck?.name || 'Demo Deck'

  // Tile count = flashcard count
  const tileCount = activeFlashcards.length
  const tilesPerCard = Math.ceil(tileCount / activeCards.length)

  // Handle tile click based on zoom level
  const handleTileClick = (tileIndex) => {
    if (zoomLevel === 'outline') {
      // All tiles flip together
      setAllFlipped(!allFlipped)
    } else if (zoomLevel === 'cards') {
      // Group flips together
      const cardIndex = Math.floor(tileIndex / tilesPerCard)
      const newFlipped = { ...flippedTiles }
      const isGroupFlipped = flippedTiles[`card-${cardIndex}`]
      newFlipped[`card-${cardIndex}`] = !isGroupFlipped
      setFlippedTiles(newFlipped)
    } else {
      // Individual flip
      setFlippedTiles(prev => ({
        ...prev,
        [tileIndex]: !prev[tileIndex]
      }))
    }
  }

  // Check if a tile is flipped
  const isTileFlipped = (tileIndex) => {
    if (zoomLevel === 'outline') {
      return allFlipped
    } else if (zoomLevel === 'cards') {
      const cardIndex = Math.floor(tileIndex / tilesPerCard)
      return flippedTiles[`card-${cardIndex}`]
    } else {
      return flippedTiles[tileIndex]
    }
  }

  // Get content for flipped tile based on zoom level
  const getFlippedContent = (tileIndex) => {
    if (zoomLevel === 'outline') {
      // Show full outline
      return null // Handled separately
    } else if (zoomLevel === 'cards') {
      const cardIndex = Math.floor(tileIndex / tilesPerCard)
      const card = activeCards[cardIndex]
      return card ? { title: card.title, content: card.content || card.concept } : null
    } else {
      const flashcard = activeFlashcards[tileIndex]
      return flashcard ? { question: flashcard.question, answer: flashcard.answer } : null
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 ${embedded ? '' : 'w-screen'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
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
                onClick={() => handleLevelClick(level)}
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
            Zoom In →
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 pb-24 relative">
        {/* Tile grid */}
        <motion.div
          className={`flex flex-wrap justify-center ${GRID_GAPS[zoomLevel]}`}
          layout
        >
          {Array.from({ length: tileCount }).map((_, tileIndex) => {
            const isFlipped = isTileFlipped(tileIndex)
            const flashcard = activeFlashcards[tileIndex]

            return (
              <motion.div
                key={tileIndex}
                className={`${TILE_SIZES[zoomLevel]} cursor-pointer perspective-1000`}
                onClick={() => handleTileClick(tileIndex)}
                layout
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <motion.div
                  className="relative w-full h-full"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front - emerald tile */}
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
                      {/* Show question text on flashcard level */}
                      {zoomLevel === 'flashcards' && flashcard && (
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                          <span className="text-white font-medium text-center text-xs drop-shadow-lg line-clamp-4">
                            {flashcard.question}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back - white with content */}
                  <div
                    className="absolute inset-0 rounded-lg bg-white shadow-lg overflow-hidden backface-hidden"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {zoomLevel === 'flashcards' && flashcard && (
                      <div className="p-2 h-full overflow-auto">
                        <p className="text-emerald-600 font-medium text-xs mb-1 line-clamp-2">
                          {flashcard.question}
                        </p>
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {flashcard.answer}
                        </p>
                      </div>
                    )}
                    {zoomLevel === 'cards' && (() => {
                      const cardIndex = Math.floor(tileIndex / tilesPerCard)
                      const card = activeCards[cardIndex]
                      // Only show content on first tile of group
                      const isFirstInGroup = tileIndex % tilesPerCard === 0
                      if (!isFirstInGroup || !card) return null
                      return (
                        <div className="p-2 h-full overflow-auto">
                          <p className="text-emerald-600 font-semibold text-xs mb-1">
                            {card.title}
                          </p>
                          <p className="text-gray-600 text-xs leading-relaxed">
                            {card.content || card.concept}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Outline overlay - shows when all tiles flipped at outline level */}
        <AnimatePresence>
          {zoomLevel === 'outline' && allFlipped && (
            <motion.div
              className="fixed inset-0 z-20 bg-white/95 backdrop-blur-sm overflow-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setAllFlipped(false)}
            >
              <div className="max-w-lg mx-auto p-6 pt-20">
                <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">{deckName}</h2>
                <div className="space-y-6 text-sm">
                  {activeOutline.map((section, idx) => (
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
                  Tap anywhere to close
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap hint for outline level */}
        {zoomLevel === 'outline' && !allFlipped && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Tap tiles to reveal outline
          </div>
        )}
      </div>

      {/* Level indicator */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-10">
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
