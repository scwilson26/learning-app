// Centralized category themes - used across Canvas, LearnScreen, and anywhere else
// that needs category-specific styling. Change a theme here and it updates everywhere.
//
// DESIGN SYSTEM: Clean, minimal, futuristic
// - All common cards: white/light gray background (#FAFAFA)
// - Dark text for readability (#1a1a1a)
// - Single accent color stripe on left edge (4-6px)
// - Subtle shadow for depth
// - Rounded corners (8-12px)
// - NO patterns, gradients, glows, or dark backgrounds (save for rare tiers)

// Common card styling (shared across all categories)
export const COMMON_CARD = {
  bg: '#FAFAFA',              // Light gray background
  bgAlt: '#FFFFFF',           // Pure white (for contrast/hover)
  textPrimary: '#1a1a1a',     // Near-black for maximum readability
  textSecondary: '#6b7280',   // Gray-500 for muted text
  border: '#e5e7eb',          // Gray-200 for subtle borders
  shadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  shadowHover: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  radius: '12px',
  accentWidth: '5px',         // Left stripe width
}

// Category accent colors - bold, saturated palette
// These are the ONLY category-specific colors (used for left stripe)
// Bold enough to work across all rarities (common → legendary)
export const CATEGORY_THEMES = {
  // Warm colors
  arts: {
    accent: '#D94F6E',        // Bold rose
  },
  history: {
    accent: '#C9852A',        // Rich amber
  },
  people: {
    accent: '#B85A3A',        // Burnt orange
  },
  everyday: {
    accent: '#A89050',        // Ochre
  },
  // Cool colors
  geography: {
    accent: '#2E7DAF',        // Strong blue
  },
  technology: {
    accent: '#1896B8',        // Electric teal
  },
  physics: {
    accent: '#4A6E82',        // Deep slate
  },
  // Greens
  biology: {
    accent: '#4A9B5A',        // Forest green
  },
  health: {
    accent: '#2A9D8F',        // Bold teal
  },
  // Purples/neutrals
  philosophy: {
    accent: '#5B4B9E',        // Royal indigo
  },
  mathematics: {
    accent: '#6A6A7A',        // Graphite
  },
  society: {
    accent: '#8B4A8B',        // Deep magenta
  },
  default: {
    accent: '#6A6A7A',        // Graphite
  }
}

// Get accent color for a category
export function getCategoryAccent(categoryId) {
  return CATEGORY_THEMES[categoryId]?.accent || CATEGORY_THEMES.default.accent
}

// Get theme for a category (returns common card + category accent)
export function getCategoryTheme(categoryId) {
  const accent = getCategoryAccent(categoryId)
  return {
    // Common styling for all cards
    cardBg: COMMON_CARD.bg,
    cardBgAlt: COMMON_CARD.bgAlt,
    textPrimary: COMMON_CARD.textPrimary,
    textSecondary: COMMON_CARD.textSecondary,
    border: COMMON_CARD.border,
    shadow: COMMON_CARD.shadow,
    shadowHover: COMMON_CARD.shadowHover,
    radius: COMMON_CARD.radius,
    accentWidth: COMMON_CARD.accentWidth,
    // Category-specific accent
    accent: accent,
    accentFaded: accent + '80', // 50% opacity version for unclaimed
    accentGlow: accent + '4D', // 30% opacity for subtle glow effects
  }
}

// Check if a category has a custom theme
export function hasCustomTheme(categoryId) {
  return categoryId && CATEGORY_THEMES[categoryId] !== undefined
}

// isDarkTheme is no longer needed - all common cards use light backgrounds
// Keeping for backwards compatibility but always returns false
export function isDarkTheme(categoryId) {
  return false
}
