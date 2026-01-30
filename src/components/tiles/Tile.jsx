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
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - colored tile with pattern */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`w-full h-full bg-gradient-to-br ${gradient} relative`}>
            {/* Decorative pattern overlay */}
            <TilePattern patternId={patternId} />

            {/* Optional front content (e.g., question text at large sizes) */}
            {frontContent && (
              <div className="absolute inset-0 flex items-center justify-center p-2 z-10">
                {frontContent}
              </div>
            )}
          </div>
        </div>

        {/* Back - white with content */}
        <div
          className="absolute inset-0 rounded-lg bg-white shadow-lg overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="w-full h-full p-3 overflow-auto">
            {backContent}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
