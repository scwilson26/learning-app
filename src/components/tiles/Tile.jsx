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
  merging = false,
  onClick,
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'prague-cross',
  className = ''
}) {
  const borderRadius = merging ? '0px' : '0.5rem'

  return (
    <div
      className={`w-full h-full cursor-pointer ${className}`}
      onClick={onClick}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - colored tile with pattern */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
          animate={{ borderRadius, boxShadow: merging ? '0 0 0 rgba(0,0,0,0)' : '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          transition={{ duration: 0.3 }}
        >
          <div className={`w-full h-full bg-gradient-to-br ${gradient} relative`}>
            <TilePattern patternId={patternId} />
            {frontContent && (
              <div className="absolute inset-0 flex items-center justify-center p-2 z-10">
                {frontContent}
              </div>
            )}
          </div>
        </motion.div>

        {/* Back - white with category-colored border frame */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          animate={{ borderRadius, boxShadow: merging ? '0 0 0 rgba(0,0,0,0)' : '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          transition={{ duration: 0.3 }}
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
        </motion.div>
      </motion.div>
    </div>
  )
}
