import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tile from './Tile'

/**
 * CardsView - Instagram-style vertical scroll of 2×2 tile groups
 * Each group of 4 tiles represents one card
 * Tap a group → all 4 tiles flip together → shows card content
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
  const [expandedCard, setExpandedCard] = useState(null)

  // Group flashcards by their source card
  // Each card gets 4 tiles (or fewer for the last card)
  const tilesPerCard = 4
  const cardGroups = []

  // If we have sourceCardId on flashcards, group by that
  // Otherwise, just chunk into groups of 4
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
    const isCurrentlyFlipped = flippedCards[cardIndex]
    if (isCurrentlyFlipped) {
      // Show expanded card content
      setExpandedCard(cardIndex)
    } else {
      // Flip the tiles
      setFlippedCards(prev => ({
        ...prev,
        [cardIndex]: true
      }))
    }
  }

  const handleCloseExpanded = () => {
    setExpandedCard(null)
    // Optionally unflip when closing
    // setFlippedCards({})
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

              {/* 2×2 tile grid */}
              <div
                className="grid grid-cols-2 gap-2 max-w-sm mx-auto cursor-pointer"
                onClick={() => handleGroupClick(group.cardIndex)}
              >
                {gridTiles.map((tile, tileIdx) => (
                  <div key={tileIdx} className="aspect-square">
                    {tile ? (
                      <Tile
                        isFlipped={isFlipped}
                        gradient={gradient}
                        patternId={patternId}
                        frontContent={
                          <span className="text-white/80 text-xs font-medium">
                            {tileIdx + 1}
                          </span>
                        }
                        backContent={
                          <div className="h-full flex items-center justify-center">
                            <span className="text-emerald-600 text-2xl font-bold">
                              {group.cardIndex + 1}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      // Empty spot placeholder
                      <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-200 bg-gray-50" />
                    )}
                  </div>
                ))}
              </div>

              {/* Tap hint */}
              {isFlipped && (
                <div className="text-center mt-2 text-gray-400 text-xs">
                  Tap again to read full card
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Expanded card overlay */}
      <AnimatePresence>
        {expandedCard !== null && (
          <motion.div
            className="fixed inset-0 z-30 bg-white/98 backdrop-blur-sm overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleCloseExpanded}
          >
            <div className="max-w-lg mx-auto p-6 pt-20 pb-32">
              {cards[expandedCard] && (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {cards[expandedCard].title}
                  </h2>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {cards[expandedCard].content || cards[expandedCard].concept}
                  </div>
                </>
              )}

              {/* Show associated flashcards */}
              {cardGroups[expandedCard]?.tiles && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 mb-4">
                    Flashcards in this card
                  </h3>
                  <div className="space-y-3">
                    {cardGroups[expandedCard].tiles.map((tile, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-emerald-600 font-medium text-sm">
                          Q: {tile.question}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          A: {tile.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center py-8 text-gray-400 text-sm">
                Tap anywhere to close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
