import { useState } from 'react'
import { motion } from 'framer-motion'
import Tile from './Tile'

/**
 * FlashcardsView - Instagram-style vertical scroll of single large tiles
 * Each tile is one flashcard
 * Tap a tile → it flips → shows Q/A
 *
 * @param {Object} props
 * @param {Array} props.flashcards - Array of flashcard data { question, answer }
 * @param {string} props.gradient - Tailwind gradient for tiles
 * @param {string} props.patternId - Pattern ID for tile decoration
 */
export default function FlashcardsView({
  flashcards = [],
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric'
}) {
  const [flippedTiles, setFlippedTiles] = useState({})

  const handleTileClick = (index) => {
    setFlippedTiles(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <div className="relative">
      {/* Scrollable container with snap */}
      <div
        className="h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory px-4 py-6"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {flashcards.map((flashcard, index) => {
          const isFlipped = flippedTiles[index]

          return (
            <motion.div
              key={flashcard.id || index}
              className="snap-center mb-6 last:mb-0"
              style={{ scrollSnapAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              {/* Large single tile */}
              <div className="max-w-sm mx-auto">
                <div className="aspect-square">
                  <Tile
                    isFlipped={isFlipped}
                    gradient={gradient}
                    patternId={patternId}
                    onClick={() => handleTileClick(index)}
                    frontContent={
                      <div className="text-center p-4">
                        <span className="text-white font-semibold text-lg drop-shadow-md line-clamp-5">
                          {flashcard.question}
                        </span>
                      </div>
                    }
                    backContent={
                      <div className="h-full flex flex-col p-4">
                        <div className="text-emerald-600 font-medium text-sm mb-3 line-clamp-2">
                          {flashcard.question}
                        </div>
                        <div className="flex-1 overflow-auto">
                          <p className="text-gray-700 leading-relaxed">
                            {flashcard.answer}
                          </p>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Card counter */}
                <div className="text-center mt-3 text-gray-400 text-sm">
                  {index + 1} / {flashcards.length}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="flex gap-1">
          {flashcards.slice(0, Math.min(10, flashcards.length)).map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                flippedTiles[idx] ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            />
          ))}
          {flashcards.length > 10 && (
            <span className="text-gray-400 text-xs ml-1">
              +{flashcards.length - 10}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
