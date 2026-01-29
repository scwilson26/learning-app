import { useState } from 'react'
import { motion } from 'framer-motion'
import { TilePattern } from './TilePatterns'

/**
 * CardsView - Vertical scroll of cards, each shown as a 2×2 tile group
 * Tap a group → 4 tiles merge into 1 large tile showing card content
 * Tap again → splits back into 4 tiles
 *
 * @param {Object} props
 * @param {Array} props.cards - Array of card data (core + deep_dive combined)
 * @param {string} props.gradient - Tailwind gradient for tiles
 * @param {string} props.patternId - Pattern ID for tile decoration
 */
export default function CardsView({
  cards = [],
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric'
}) {
  const [flippedCards, setFlippedCards] = useState({})

  const handleCardClick = (index) => {
    setFlippedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Simple markdown-ish rendering: bold (**text** or ****text****), bullets
  const renderContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return <br key={i} />

      // Bold markers
      const formatted = trimmed.replace(/\*{2,4}(.+?)\*{2,4}/g, '<strong>$1</strong>')
      // Bullet points
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')

      return (
        <p
          key={i}
          className={`${isBullet ? 'pl-3' : ''} mb-1`}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })
  }

  return (
    <div className="relative">
      <div
        className="h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory px-4 py-6"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {cards.map((card, index) => {
          const isFlipped = flippedCards[index]

          return (
            <motion.div
              key={card.id || index}
              className="snap-center mb-6 last:mb-0"
              style={{ scrollSnapAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              {/* Card title label */}
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {card.title || `Card ${index + 1}`}
                </span>
              </div>

              {/* Flip container */}
              <div
                className="max-w-sm mx-auto cursor-pointer"
                style={{ perspective: '1000px' }}
                onClick={() => handleCardClick(index)}
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
                  {/* Front - 2×2 tile grid */}
                  <div
                    className="absolute inset-0 grid grid-cols-2 gap-2"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    {[0, 1, 2, 3].map((tileIdx) => (
                      <div key={tileIdx} className="aspect-square">
                        <div className={`w-full h-full rounded-lg bg-gradient-to-br ${gradient} relative overflow-hidden shadow-md`}>
                          <TilePattern patternId={patternId} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Back - full card content */}
                  <div
                    className="absolute inset-0 rounded-xl bg-white shadow-lg overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <div className="w-full h-full p-5 overflow-auto">
                      <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                        {card.title}
                      </h3>
                      <div className="text-gray-700 text-sm leading-relaxed">
                        {renderContent(card.content || card.concept)}
                      </div>
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
