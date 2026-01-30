import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tile from './Tile'

/**
 * OutlineView - Shows all tiles as a 4-column mosaic
 * Tap anywhere to flip ALL tiles together and reveal the full outline
 *
 * @param {Object} props
 * @param {Array} props.tiles - Array of tile data (flashcards)
 * @param {Object} props.outline - Outline content { core: [], deep_dive: [] }
 * @param {string} props.deckName - Name of the deck
 * @param {string} props.gradient - Tailwind gradient for tiles
 * @param {string} props.patternId - Pattern ID for tile decoration
 */
export default function OutlineView({
  tiles = [],
  outline,
  flashcards = [],
  deckName = 'Outline',
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric'
}) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Combine outline sections
  const sections = [
    ...(outline?.core || []),
    ...(outline?.deep_dive || [])
  ]

  // Total tiles = flashcard count (single source of truth), fallback to card count
  const totalTiles = flashcards.length || tiles.length

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <div className="relative">
      {/* Mosaic grid - 4 columns */}
      <div
        className="grid grid-cols-4 gap-2 p-4 cursor-pointer"
        onClick={handleFlip}
      >
        {Array.from({ length: totalTiles }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.2 }}
          >
            <Tile
              isFlipped={isFlipped}
              gradient={gradient}
              patternId={patternId}
              onClick={handleFlip}
              backContent={
                <div className="w-full h-full" />
              }
            />
          </motion.div>
        ))}
      </div>

      {/* Tap hint */}
      {!isFlipped && (
        <div className="text-center py-2 text-gray-400 text-sm">
          Tap to reveal outline
        </div>
      )}

      {/* Full outline overlay - appears when flipped */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            className="fixed inset-0 z-30 bg-white/98 backdrop-blur-sm overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleFlip}
          >
            <div className="max-w-lg mx-auto p-6 pt-20 pb-32">
              <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
                {deckName}
              </h2>

              <div className="space-y-6">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="border-b border-gray-100 pb-6 last:border-0"
                  >
                    <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                      {idx + 1}. {section.title}
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {section.content || section.concept}
                    </div>
                  </div>
                ))}
              </div>

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
