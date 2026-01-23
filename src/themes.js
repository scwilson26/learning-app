// ============================================================================
// CENTRALIZED THEME SYSTEM
// ============================================================================
// Change colors HERE and they update EVERYWHERE.
// Canvas.jsx should NEVER contain hardcoded colors - it just uses these.
//
// To change a category color:
//   1. Find the category in CATEGORY_ACCENTS below
//   2. Change the hex value
//   3. Done! All cards, buttons, stripes update automatically.

// ============================================================================
// CATEGORY ACCENT COLORS
// ============================================================================
// These are the ONLY category-specific colors. Everything else is derived.
// Organized by color family for easy reference.

const CATEGORY_ACCENTS = {
  // Darks/Serious
  mathematics: '#2D2D2D',     // Charcoal
  philosophy: '#1E3A5F',      // Navy
  physics: '#4A6E82',         // Slate
  technology: '#2D4A3E',      // Forest

  // Earthy/Warm
  history: '#8B4513',         // Rust brown
  geography: '#5D4E37',       // Dark earth
  everyday: '#6B6B6B',        // Stone gray
  people: '#A0522D',          // Sienna

  // Pops of color
  arts: '#D94F6E',            // Bold rose
  biology: '#2A9D8F',         // Teal
  health: '#4A90B8',          // Ocean blue
  society: '#8B4A8B',         // Deep magenta

  // Fallback
  default: '#6B6B6B',         // Stone gray
}

// ============================================================================
// COMMON CARD STYLING
// ============================================================================
// Shared across ALL cards regardless of category.

const COMMON_CARD = {
  bg: '#FAFAFA',
  bgAlt: '#FFFFFF',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  shadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  shadowHover: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  radius: '12px',
  accentWidth: '5px',
}

// ============================================================================
// BUTTON STYLING
// ============================================================================
// Consistent button colors used across preview cards, modals, etc.

const BUTTON_STYLES = {
  // Primary action buttons (Claim, Explore)
  primary: {
    text: '#ffffff',
    shadowAlpha: 0.15,
  },
  // Secondary/neutral buttons (Back)
  secondary: {
    bg: '#ffffff',
    text: '#6b7280',
    border: '#e5e7eb',
  },
  // Special buttons (Wander)
  wander: {
    gradient: 'linear-gradient(to right, #a855f7, #4f46e5)',
    text: '#ffffff',
    shadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
  },
  // Disabled state
  disabled: {
    bg: '#e5e7eb',
    text: '#9ca3af',
  },
}

// ============================================================================
// PUBLIC API
// ============================================================================
// These are the functions Canvas.jsx imports and uses.

/**
 * Get the accent color for a category (internal helper)
 */
function getCategoryAccent(categoryId) {
  return CATEGORY_ACCENTS[categoryId] || CATEGORY_ACCENTS.default
}

/**
 * Get complete theme object for a category
 * This is the main function - returns everything needed to style a card
 */
export function getCategoryTheme(categoryId) {
  const accent = getCategoryAccent(categoryId)

  return {
    // Card backgrounds
    cardBg: COMMON_CARD.bg,
    cardBgAlt: COMMON_CARD.bgAlt,

    // Text colors
    textPrimary: COMMON_CARD.textPrimary,
    textSecondary: COMMON_CARD.textSecondary,

    // Borders and shadows
    border: COMMON_CARD.border,
    shadow: COMMON_CARD.shadow,
    shadowHover: COMMON_CARD.shadowHover,
    radius: COMMON_CARD.radius,

    // Accent stripe
    accent: accent,
    accentWidth: COMMON_CARD.accentWidth,
    accentFaded: accent + '80',  // 50% opacity
    accentGlow: accent + '4D',   // 30% opacity

    // Button styling - pre-computed for easy use
    buttonPrimaryBg: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
    buttonPrimaryText: BUTTON_STYLES.primary.text,
    buttonPrimaryShadow: `0 4px 12px rgba(0,0,0,${BUTTON_STYLES.primary.shadowAlpha})`,

    buttonSecondaryBg: BUTTON_STYLES.secondary.bg,
    buttonSecondaryText: BUTTON_STYLES.secondary.text,
    buttonSecondaryBorder: BUTTON_STYLES.secondary.border,

    buttonDisabledBg: BUTTON_STYLES.disabled.bg,
    buttonDisabledText: BUTTON_STYLES.disabled.text,

    buttonWanderGradient: BUTTON_STYLES.wander.gradient,
    buttonWanderText: BUTTON_STYLES.wander.text,
    buttonWanderShadow: BUTTON_STYLES.wander.shadow,

    // Divider line color (for sections)
    divider: `${accent}20`,
  }
}

/**
 * Check if a category has a custom theme defined
 */
export function hasCustomTheme(categoryId) {
  return categoryId && CATEGORY_ACCENTS[categoryId] !== undefined
}

/**
 * Legacy function - always returns false now (all cards use light backgrounds)
 */
export function isDarkTheme(categoryId) {
  return false
}

