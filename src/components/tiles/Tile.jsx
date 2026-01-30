import { motion } from 'framer-motion'
import { TilePattern } from './TilePatterns'

/**
 * Base Tile component - a flippable square tile
 *
 * @param {Object} props
 * @param {React.ReactNode} props.frontContent - Optional content for front (usually just pattern)
 * @param {React.ReactNode} props.backContent - Content shown when flipped
 * @param {boolean} props.isFlipped - Whether tile is flipped
 * @param {function} props.onClick - Click handler
 * @param {string} props.gradient - Tailwind gradient classes (e.g., 'from-emerald-400 to-emerald-600')
 * @param {string} props.patternId - Pattern ID for the tile decoration
 * @param {string} props.className - Additional classes
 */
export default function Tile({
  frontContent,
  backContent,
  isFlipped = false,
  onClick,
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'prague-cross',
  className = ''
}) {
  return (
    <div
      className={`w-full h-full cursor-pointer ${className}`}
      onClick={onClick}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - colored tile with pattern */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`w-full h-full bg-gradient-to-br ${gradient} relative`}>
            <TilePattern patternId={patternId} />
            {frontContent && (
              <div className="absolute inset-0 flex items-center justify-center p-2 z-10">
                {frontContent}
              </div>
            )}
          </div>
        </div>

        {/* Back - white with category-colored border frame */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Category gradient border frame */}
          <div className={`w-full h-full bg-gradient-to-br ${gradient} relative`}>
            <TilePattern patternId={patternId} opacity={0.12} />
            {/* White center that fades from the border */}
            <div className="absolute inset-2 bg-white rounded-lg" />
            <div className="absolute inset-0 p-3 overflow-auto z-10">
              {backContent}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
