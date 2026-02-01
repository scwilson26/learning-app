import { motion } from 'framer-motion'
import { TilePattern } from './TilePatterns'

/**
 * Category gradients - derived from theme accent colors
 * These create rich, full-color tile backgrounds
 */
const CATEGORY_GRADIENTS = {
  // Darks/Serious
  mathematics: 'from-zinc-700 via-zinc-800 to-zinc-900',
  philosophy: 'from-slate-600 via-slate-700 to-slate-800',
  physics: 'from-slate-500 via-slate-600 to-slate-700',
  technology: 'from-emerald-800 via-emerald-900 to-teal-900',

  // Earthy/Warm
  history: 'from-amber-600 via-orange-700 to-amber-800',
  geography: 'from-stone-500 via-stone-600 to-stone-700',
  everyday: 'from-gray-500 via-gray-600 to-gray-700',
  people: 'from-orange-600 via-amber-700 to-orange-800',

  // Pops of color
  arts: 'from-pink-500 via-rose-600 to-pink-700',
  biology: 'from-teal-500 via-teal-600 to-emerald-700',
  health: 'from-sky-500 via-blue-600 to-sky-700',
  society: 'from-purple-500 via-fuchsia-600 to-purple-700',

  // User content
  'user-notes': 'from-emerald-500 via-emerald-600 to-teal-700',

  // Fallback
  default: 'from-gray-500 via-gray-600 to-gray-700',
}

/**
 * Category to pattern mapping - each category has unique pattern
 */
const CATEGORY_PATTERNS = {
  arts: 'flower',
  biology: 'vesica',
  health: 'wave',
  everyday: 'geometric',
  geography: 'honeycomb',
  history: 'star',
  mathematics: 'lattice',
  people: 'prague-cross',
  philosophy: 'sacred',      // Unique: plus signs + dots
  physics: 'atom',           // Unique: orbital/atomic design
  society: 'chevron',        // Unique: diagonal chevrons
  technology: 'circuit',     // Unique: circuit board style
  'user-notes': 'geometric',
  default: 'geometric',
}

/**
 * CategoryTile - A colored tile for category navigation
 * Used on Browse page for categories and Continue Exploring
 *
 * @param {Object} props
 * @param {string} props.name - Display name
 * @param {string} props.categoryId - Category ID for theming
 * @param {function} props.onClick - Click handler
 * @param {string} props.subtitle - Optional subtitle (e.g., progress)
 * @param {number} props.progress - Optional progress percentage (0-100)
 * @param {string} props.className - Additional classes
 */
export default function CategoryTile({
  name,
  categoryId,
  onClick,
  subtitle,
  progress,
  className = ''
}) {
  const gradient = CATEGORY_GRADIENTS[categoryId] || CATEGORY_GRADIENTS.default
  const patternId = CATEGORY_PATTERNS[categoryId] || CATEGORY_PATTERNS.default

  return (
    <motion.div
      className={`aspect-square cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-full h-full rounded-lg bg-gradient-to-br ${gradient} relative overflow-hidden`}
        style={{
          boxShadow: '0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {/* Pattern overlay */}
        <TilePattern patternId={patternId} opacity={0.15} />

        {/* Matte texture overlay - subtle grain for dry ceramic feel */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" preserveAspectRatio="none">
          <defs>
            <filter id="matte-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#matte-noise)" />
        </svg>

        {/* 3D Beveled edge effect - light from top-left */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            boxShadow: `
              inset 2px 2px 4px rgba(255,255,255,0.25),
              inset -2px -2px 4px rgba(0,0,0,0.25)
            `,
          }}
        />

        {/* Subtle top highlight for raised surface feel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 30%, rgba(0,0,0,0.08) 100%)',
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
          <span className={`text-white font-semibold text-center leading-tight drop-shadow-md ${
            (name || '').length > 25 ? 'text-xs' : (name || '').length > 15 ? 'text-sm' : 'text-sm'
          }`}>
            {name || ''}
          </span>

          {/* Optional subtitle */}
          {subtitle && (
            <span className="text-white/70 text-xs mt-1">
              {subtitle}
            </span>
          )}

          {/* Optional progress bar */}
          {typeof progress === 'number' && (
            <div className="w-3/4 mt-2">
              <div className="w-full h-1 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white/80 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Export the gradients and patterns for use elsewhere if needed
export { CATEGORY_GRADIENTS, CATEGORY_PATTERNS }
