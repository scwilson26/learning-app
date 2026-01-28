/**
 * Prague-style geometric tile patterns
 * Each pattern is an SVG overlay at low opacity
 */

// Pattern definitions - inspired by European geometric tile designs
const patterns = {
  // Classic cross pattern (good for History, Philosophy)
  'prague-cross': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="cross-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          {/* Vertical line */}
          <rect x="23" y="5" width="4" height="40" fill="white" />
          {/* Horizontal line */}
          <rect x="5" y="23" width="40" height="4" fill="white" />
          {/* Corner dots */}
          <circle cx="10" cy="10" r="3" fill="white" />
          <circle cx="40" cy="10" r="3" fill="white" />
          <circle cx="10" cy="40" r="3" fill="white" />
          <circle cx="40" cy="40" r="3" fill="white" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#cross-pattern)" />
    </svg>
  ),

  // Interlocking circles (good for Science, Biology)
  'vesica': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="vesica-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="0" r="15" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="20" cy="40" r="15" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="0" cy="20" r="15" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="40" cy="20" r="15" fill="none" stroke="white" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#vesica-pattern)" />
    </svg>
  ),

  // Diamond lattice (good for Math, Technology)
  'lattice': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="lattice-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M15 0 L30 15 L15 30 L0 15 Z" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="15" cy="15" r="3" fill="white" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#lattice-pattern)" />
    </svg>
  ),

  // Flower of life (good for Arts, Culture)
  'flower': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="flower-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="25" cy="13" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="25" cy="37" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="14" cy="19" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="36" cy="19" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="14" cy="31" r="12" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="36" cy="31" r="12" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#flower-pattern)" />
    </svg>
  ),

  // Hexagonal grid (good for Geography, Nature)
  'honeycomb': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="honeycomb-pattern" x="0" y="0" width="30" height="52" patternUnits="userSpaceOnUse">
          <path d="M15 0 L28 7.5 L28 22.5 L15 30 L2 22.5 L2 7.5 Z" fill="none" stroke="white" strokeWidth="1.5" />
          <path d="M15 30 L28 37.5 L28 52.5 L15 60 L2 52.5 L2 37.5 Z" fill="none" stroke="white" strokeWidth="1.5" transform="translate(0, -8)" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#honeycomb-pattern)" />
    </svg>
  ),

  // Moroccan star (good for History, Culture)
  'star': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="star-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* 8-point star */}
          <polygon
            points="20,5 23,17 35,17 25,24 28,36 20,29 12,36 15,24 5,17 17,17"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Corner squares */}
          <rect x="2" y="2" width="6" height="6" fill="none" stroke="white" strokeWidth="1" />
          <rect x="32" y="2" width="6" height="6" fill="none" stroke="white" strokeWidth="1" />
          <rect x="2" y="32" width="6" height="6" fill="none" stroke="white" strokeWidth="1" />
          <rect x="32" y="32" width="6" height="6" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#star-pattern)" />
    </svg>
  ),

  // Simple geometric (clean, modern - good default)
  'geometric': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="geometric-pattern" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
          <rect x="5" y="5" width="15" height="15" fill="none" stroke="white" strokeWidth="1" />
          <line x1="0" y1="0" x2="25" y2="25" stroke="white" strokeWidth="0.5" />
          <line x1="25" y1="0" x2="0" y2="25" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#geometric-pattern)" />
    </svg>
  ),

  // Wave pattern (good for Health, Mind)
  'wave': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="wave-pattern" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M0 10 Q10 0, 20 10 T40 10"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#wave-pattern)" />
    </svg>
  ),

  // Sacred geometry - plus signs with dots (Philosophy & Religion)
  'sacred': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="sacred-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Central plus */}
          <rect x="18" y="8" width="4" height="24" fill="white" />
          <rect x="8" y="18" width="24" height="4" fill="white" />
          {/* Corner dots */}
          <circle cx="8" cy="8" r="2.5" fill="white" />
          <circle cx="32" cy="8" r="2.5" fill="white" />
          <circle cx="8" cy="32" r="2.5" fill="white" />
          <circle cx="32" cy="32" r="2.5" fill="white" />
          {/* Center dot */}
          <circle cx="20" cy="20" r="2" fill="white" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#sacred-pattern)" />
    </svg>
  ),

  // Atomic orbital pattern (Physical Sciences)
  'atom': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="atom-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Outer square */}
          <rect x="4" y="4" width="32" height="32" fill="none" stroke="white" strokeWidth="1" />
          {/* Inner rotated square (diamond) */}
          <rect x="12" y="12" width="16" height="16" fill="none" stroke="white" strokeWidth="1" transform="rotate(45 20 20)" />
          {/* Center circle (nucleus) */}
          <circle cx="20" cy="20" r="4" fill="none" stroke="white" strokeWidth="1.5" />
          {/* Electron dots */}
          <circle cx="20" cy="6" r="2" fill="white" />
          <circle cx="20" cy="34" r="2" fill="white" />
          <circle cx="6" cy="20" r="2" fill="white" />
          <circle cx="34" cy="20" r="2" fill="white" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#atom-pattern)" />
    </svg>
  ),

  // Diagonal chevron pattern (Society)
  'chevron': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="chevron-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          {/* Diagonal lines forming chevrons */}
          <path d="M0 15 L15 0 L30 15" fill="none" stroke="white" strokeWidth="1.5" />
          <path d="M0 30 L15 15 L30 30" fill="none" stroke="white" strokeWidth="1.5" />
          {/* Small squares at intersections */}
          <rect x="13" y="13" width="4" height="4" fill="white" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#chevron-pattern)" />
    </svg>
  ),

  // Circuit board pattern (Technology)
  'circuit': (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <pattern id="circuit-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Grid of plus signs */}
          <rect x="18" y="5" width="4" height="12" fill="white" />
          <rect x="12" y="9" width="16" height="4" fill="white" />
          {/* Connection lines */}
          <rect x="20" y="17" width="2" height="8" fill="white" opacity="0.6" />
          <rect x="5" y="20" width="8" height="2" fill="white" opacity="0.6" />
          <rect x="27" y="20" width="8" height="2" fill="white" opacity="0.6" />
          {/* Node dots */}
          <circle cx="10" cy="10" r="2" fill="white" />
          <circle cx="30" cy="10" r="2" fill="white" />
          <circle cx="10" cy="30" r="2" fill="white" />
          <circle cx="30" cy="30" r="2" fill="white" />
          <circle cx="20" cy="30" r="3" fill="none" stroke="white" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#circuit-pattern)" />
    </svg>
  )
}

// Map category colors to appropriate patterns - each category has unique pattern
export const categoryPatterns = {
  'arts': 'flower',
  'biology': 'vesica',
  'health': 'wave',
  'everyday': 'geometric',
  'geography': 'honeycomb',
  'history': 'star',
  'mathematics': 'lattice',
  'people': 'prague-cross',
  'philosophy': 'sacred',      // Unique: plus signs + dots
  'physics': 'atom',           // Unique: orbital/atomic design
  'society': 'chevron',        // Unique: diagonal chevrons
  'technology': 'circuit',     // Unique: circuit board style
  // Default for user notes
  'default': 'geometric'
}

/**
 * Tile pattern overlay component
 * @param {Object} props
 * @param {string} props.patternId - Pattern ID from patterns object
 * @param {number} props.opacity - Overlay opacity (default 0.15)
 */
export function TilePattern({ patternId = 'geometric', opacity = 0.15 }) {
  const pattern = patterns[patternId] || patterns['geometric']

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      {pattern}
    </div>
  )
}

export default patterns
