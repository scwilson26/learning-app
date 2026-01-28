import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TilePattern } from './TilePatterns'

/**
 * CardsView - Instagram-style vertical scroll of 2×2 tile groups
 * Each group of 4 tiles represents one card
 * Tap a group → 4 tiles merge into 1 large tile showing card content
 * Tap again → splits back into 4 tiles
 *
 * @param {Object} props
 * @param {Array} props.flashcards - Array of flashcard data (determines tile count)
 * @param {Array} props.cards - Array of card data (core + deep_dive combined)
 * @param {string} props.gradient - Tailwind gradient for tiles
 * @param {string} props.patternId - Pattern ID for tile decoration
 */
export default function CardsView({
  flashcards = [],
  cards = [],
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric'
}) {
  const [flippedCards, setFlippedCards] = useState({})

  // Group flashcards by their source card
  const tilesPerCard = 4
  const cardGroups = []

  // Map flashcards to card indices
  const flashcardsWithCards = flashcards.map((fc, idx) => {
    if (fc.sourceCardId) {
      const cardIndex = cards.findIndex(c => c.id === fc.sourceCardId)
      return { ...fc, cardIndex: cardIndex >= 0 ? cardIndex : Math.floor(idx / tilesPerCard) }
    }
    return { ...fc, cardIndex: Math.floor(idx / tilesPerCard) }
  })

  // Group by card index
  const groupedByCard = {}
  flashcardsWithCards.forEach((fc, idx) => {
    const cardIdx = fc.cardIndex
    if (!groupedByCard[cardIdx]) {
      groupedByCard[cardIdx] = []
    }
    groupedByCard[cardIdx].push({ ...fc, originalIndex: idx })
  })

  // Convert to array of groups
  const cardIndices = Object.keys(groupedByCard).map(Number).sort((a, b) => a - b)
  cardIndices.forEach(cardIdx => {
    cardGroups.push({
      cardIndex: cardIdx,
      card: cards[cardIdx] || null,
      tiles: groupedByCard[cardIdx]
    })
  })

  const handleGroupClick = (cardIndex) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardIndex]: !prev[cardIndex]
    }))
  }

  return (
    <div className="relative">
      {/* Scrollable container with snap */}
      <div
        className="h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory px-4 py-6"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {cardGroups.map((group, groupIdx) => {
          const isFlipped = flippedCards[group.cardIndex]
          const tiles = group.tiles

          // Create a 2×2 grid with empty spots if needed
          const gridTiles = []
          for (let i = 0; i < tilesPerCard; i++) {
            gridTiles.push(tiles[i] || null)
          }

          return (
            <motion.div
              key={group.cardIndex}
              className="snap-center mb-6 last:mb-0"
              style={{ scrollSnapAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.05, duration: 0.3 }}
            >
              {/* Card label */}
              {group.card && (
                <div className="text-center mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    {group.card.title || `Card ${group.cardIndex + 1}`}
                  </span>
                </div>
              )}

              {/* Container for the flip animation */}
              <div
                className="max-w-sm mx-auto cursor-pointer perspective-1000"
                style={{ perspective: '1000px' }}
                onClick={() => handleGroupClick(group.cardIndex)}
              >
                <motion.div
                  className="relative w-full"
                  style={{
                    transformStyle: 'preserve-3d',
                    aspectRatio: '1/1'
                  }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  {/* Front - 4 tiles in 2×2 grid */}
                  <div
                    className="absolute inset-0 grid grid-cols-2 gap-2"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {gridTiles.map((tile, tileIdx) => (
                      <div key={tileIdx} className="aspect-square">
                        {tile ? (
                          <div className={`w-full h-full rounded-lg bg-gradient-to-br ${gradient} relative overflow-hidden shadow-md`}>
                            <TilePattern patternId={patternId} />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-200 bg-gray-50" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Back - 1 large merged tile with card content */}
                  <div
                    className="absolute inset-0 rounded-xl bg-white shadow-lg overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <div className="w-full h-full p-5 overflow-auto">
                      {group.card && (
                        <>
                          <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                            {group.card.title}
                          </h3>
                          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {group.card.content || group.card.concept}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Tap hint */}
              <div className="text-center mt-2 text-gray-400 text-xs">
                {isFlipped ? 'Tap to flip back' : 'Tap to reveal'}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
