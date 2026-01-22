import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_THEMES, getCategoryTheme, hasCustomTheme, isDarkTheme } from '../themes'
import { generateSubDecks, generateSingleCardContent, generateTierCards, generateTopicPreview, generateTopicOutline, generateFlashcardsFromCard, classifyTopic } from '../services/claude'
import { supabase, onAuthStateChange, signOut, syncCards, getCanonicalCardsForTopic, upsertCanonicalCard, getPreviewCardRemote, savePreviewCardRemote, getOutline, saveOutline, syncFlashcards, upsertFlashcardRemote, upsertFlashcardsRemote } from '../services/supabase'
import Auth from './Auth'
import {
  getDeckCards,
  saveDeckCards,
  saveStreamedCard,
  saveCardContent,
  getCardContent,
  claimCard,
  getClaimedCardIds,
  getDeckChildren,
  saveDeckChildren,
  getDynamicDeck,
  getData,
  saveData,
  getUserArchetype,
  getTierCards,
  getDeckTierCompletion,
  unlockTier,
  getTreeChildren,
  isTreeDeck,
  getTreeNode,
  getRandomTreePath,
  searchTopics,
  getSearchableTopicCount,
  clearAllData,
  claimCategoryNode,
  countDescendants,
  countClaimedDescendants,
  savePreviewCard,
  getPreviewCard,
  claimPreviewCard,
  hasPreviewCard,
  getClaimedCardsByCategory,
  getClaimedCardsByCategoryAndDeck,
  getAllFlashcards,
  getDueFlashcards,
  getFlashcardCount,
  getDueFlashcardCount,
  getNextReviewTime,
  saveFlashcards,
  updateFlashcard,
  skipFlashcard,
  getCardsNeedingFlashcards,
  markCardAsFlashcardGenerated,
  calculateSM2,
  formatTimeUntilReview,
  getAllFlashcardsArray,
  importFlashcardsFromRemote,
  findRootCategory,
  getInProgressDecks,
  updateDeckLastInteracted,
  getStudyDeck,
  addToStudyDeck,
  removeFromStudyDeck,
  getStudyDeckFlashcards,
  getFlashcardCountForTopic,
  getAvailableStudyTopics,
  migrateToStudyDeck,
  isInStudyDeck,
  getLearningCards,
  getLearningCardCount,
  getReviewDueCards,
  getReviewDueCount,
  getNextLearnedReviewTime,
  graduateFlashcard,
  graduateFlashcards,
  updateLearningState,
  startLearningCard,
  getStudyDeckLearningCards,
  getStudyDeckReviewDueCards
} from '../services/storage'

// Configuration - card counts can be adjusted here or per-deck
const DEFAULT_OVERVIEW_CARDS = 5

// Helper to convert text to title case (e.g., "Magellan expedition" -> "Magellan Expedition")
const toTitleCase = (str) => {
  if (!str) return ''
  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet']
  return str.split(' ').map((word, index) => {
    // Always capitalize first word, otherwise check if it's a small word
    if (index === 0 || !smallWords.includes(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }
    return word.toLowerCase()
  }).join(' ')
}

// Helper to get card count for a deck (uses deck's overviewCardCount or default)
function getDeckCardCount(deck) {
  return deck?.overviewCardCount ?? DEFAULT_OVERVIEW_CARDS
}

// Helper to get subtle tint color based on deck gradient
function getCardTint(gradient) {
  if (!gradient) return '#fafbfc'

  // Map gradient classes to subtle tint colors
  if (gradient.includes('pink') || gradient.includes('rose')) return '#fff5f7'  // Arts - pink tint
  if (gradient.includes('emerald') || gradient.includes('teal')) return '#f0fdfa' // Biology - teal tint
  if (gradient.includes('amber') || gradient.includes('orange')) return '#fffbf5' // Everyday - warm tint
  if (gradient.includes('cyan')) return '#f0f9ff'  // Geography - cyan tint
  if (gradient.includes('yellow')) return '#fffef5' // History - yellow tint
  if (gradient.includes('indigo') && gradient.includes('purple')) return '#faf5ff' // Mathematics - purple tint
  if (gradient.includes('sky')) return '#f0f9ff'   // People - sky tint
  if (gradient.includes('violet')) return '#faf5ff' // Philosophy - violet tint
  if (gradient.includes('blue') && gradient.includes('indigo')) return '#f0f5ff' // Physics - blue tint
  if (gradient.includes('slate') || gradient.includes('gray')) return '#f8fafc'  // Society - slate tint
  if (gradient.includes('green')) return '#f0fdf4'  // Technology - green tint

  return '#fafbfc' // Default subtle gray
}

// Get expanded card styling - clean, minimal design
// White/light gray background, accent stripe on left, subtle shadow
function getExpandedCardStyle(categoryId, theme, claimed, tint) {
  // All cards use the same clean white background
  // Category-specific accent color used for left stripe (rendered separately)
  return {
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    boxShadow: claimed ? theme.shadowHover : theme.shadow,
    borderRadius: theme.radius,
  }
}

// Render left accent stripe for card - the only decoration in clean design
// Returns a colored stripe on the left edge that indicates category
function renderCardAccentStripe(theme, claimed = false) {
  return (
    <div
      className="absolute top-0 bottom-0 left-0 rounded-l-[12px]"
      style={{
        width: theme.accentWidth,
        background: claimed ? theme.accent : theme.accentFaded,
      }}
    />
  )
}

// Legacy function name kept for compatibility - now just renders accent stripe
function renderExpandedCardDecorations(categoryId, theme, isBack = false, claimed = false) {
  return renderCardAccentStripe(theme, claimed)
}

// Category data - Level 1 decks (from VISION.md)
// Home screen decks - the top level
const HOME_DECKS = [
  {
    id: 'my-decks',
    name: 'Learn',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
  },
  {
    id: 'collections',
    name: 'Collection',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  }
]

const CATEGORIES = [
  {
    id: 'arts',
    name: 'Arts',
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    children: ['architecture', 'literature', 'music', 'visual-arts', 'film-tv', 'performing-arts', 'photography', 'fashion-design']
  },
  {
    id: 'biology',
    name: 'Biology',
    gradient: 'from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    children: ['animals', 'plants', 'ecology', 'genetics', 'microbes', 'marine-life']
  },
  {
    id: 'health',
    name: 'Health',
    gradient: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
  },
  {
    id: 'everyday',
    name: 'Everyday Life',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    children: ['food-drink', 'sports-games', 'hobbies', 'holidays', 'fashion-clothing', 'home-living', 'travel-transport']
  },
  {
    id: 'geography',
    name: 'Geography',
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    children: ['countries', 'cities', 'mountains-volcanoes', 'rivers-lakes', 'oceans-seas', 'islands', 'deserts-forests', 'landmarks-wonders']
  },
  {
    id: 'history',
    name: 'History',
    gradient: 'from-yellow-600 to-amber-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    children: ['ancient', 'medieval', 'renaissance', 'modern', 'world-wars', 'empires', 'revolutions', 'exploration']
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    children: ['numbers-arithmetic', 'algebra', 'geometry', 'statistics-probability', 'famous-problems', 'mathematicians']
  },
  {
    id: 'people',
    name: 'People',
    gradient: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    children: ['leaders-politicians', 'scientists-inventors', 'artists-writers', 'musicians-performers', 'explorers-adventurers', 'philosophers-thinkers', 'athletes', 'villains-outlaws']
  },
  {
    id: 'philosophy',
    name: 'Philosophy & Religion',
    gradient: 'from-violet-500 to-purple-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    children: ['world-religions', 'mythology', 'ethics-morality', 'logic-reasoning', 'eastern-philosophy', 'western-philosophy', 'spirituality-mysticism']
  },
  {
    id: 'physics',
    name: 'Physical Sciences',
    gradient: 'from-blue-500 to-indigo-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    children: ['physics', 'chemistry', 'astronomy-space', 'earth-science', 'energy-forces', 'elements-materials']
  },
  {
    id: 'society',
    name: 'Society',
    gradient: 'from-slate-500 to-gray-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    children: ['politics-government', 'economics-money', 'law-justice', 'education', 'media-communication', 'social-movements', 'war-military', 'culture-customs']
  },
  {
    id: 'technology',
    name: 'Technology',
    gradient: 'from-green-500 to-emerald-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    children: ['computers-internet', 'engineering', 'inventions', 'transportation', 'weapons-defense', 'communication-tech', 'energy-power', 'future-tech-ai']
  },
]

// Subcategory data - Level 2 decks (from VISION.md)
const SUBCATEGORIES = {
  // ===== ARTS (8 sub-categories) =====
  'architecture': { id: 'architecture', name: 'Architecture', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'literature': { id: 'literature', name: 'Literature', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'music': { id: 'music', name: 'Music', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'visual-arts': { id: 'visual-arts', name: 'Visual Arts', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'film-tv': { id: 'film-tv', name: 'Film & Television', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'performing-arts': { id: 'performing-arts', name: 'Performing Arts', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'photography': { id: 'photography', name: 'Photography', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'fashion-design': { id: 'fashion-design', name: 'Fashion & Design', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },

  // ===== BIOLOGY (6 sub-categories) =====
  'animals': { id: 'animals', name: 'Animals', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },
  'plants': { id: 'plants', name: 'Plants', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },
  'ecology': { id: 'ecology', name: 'Ecology & Environment', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },
  'genetics': { id: 'genetics', name: 'Genetics & Evolution', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },
  'microbes': { id: 'microbes', name: 'Microbes & Viruses', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },
  'marine-life': { id: 'marine-life', name: 'Marine Life', gradient: 'from-emerald-500 to-green-600', borderColor: 'border-emerald-300', children: [] },

  // ===== HEALTH (5 sub-categories) =====
  'human-body': { id: 'human-body', name: 'Human Body', gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300', children: [] },
  'medicine': { id: 'medicine', name: 'Medicine & Disease', gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300', children: [] },
  'nutrition': { id: 'nutrition', name: 'Nutrition', gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300', children: [] },
  'mental-health': { id: 'mental-health', name: 'Mental Health', gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300', children: [] },
  'fitness': { id: 'fitness', name: 'Fitness & Exercise', gradient: 'from-teal-500 to-cyan-600', borderColor: 'border-teal-300', children: [] },

  // ===== EVERYDAY LIFE (7 sub-categories) =====
  'food-drink': { id: 'food-drink', name: 'Food & Drink', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'sports-games': { id: 'sports-games', name: 'Sports & Games', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'hobbies': { id: 'hobbies', name: 'Hobbies & Recreation', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'holidays': { id: 'holidays', name: 'Holidays & Traditions', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'fashion-clothing': { id: 'fashion-clothing', name: 'Fashion & Clothing', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'home-living': { id: 'home-living', name: 'Home & Living', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'travel-transport': { id: 'travel-transport', name: 'Travel & Transport', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },

  // ===== GEOGRAPHY (8 sub-categories) =====
  'countries': { id: 'countries', name: 'Countries', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'cities': { id: 'cities', name: 'Cities', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'mountains-volcanoes': { id: 'mountains-volcanoes', name: 'Mountains & Volcanoes', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'rivers-lakes': { id: 'rivers-lakes', name: 'Rivers & Lakes', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'oceans-seas': { id: 'oceans-seas', name: 'Oceans & Seas', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'islands': { id: 'islands', name: 'Islands', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'deserts-forests': { id: 'deserts-forests', name: 'Deserts & Forests', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'landmarks-wonders': { id: 'landmarks-wonders', name: 'Landmarks & Wonders', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },

  // ===== HISTORY (8 sub-categories) =====
  'ancient': { id: 'ancient', name: 'Ancient World', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: ['egypt', 'rome', 'greece', 'persia', 'china-ancient', 'mesopotamia', 'maya'] },
  'medieval': { id: 'medieval', name: 'Medieval', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'renaissance': { id: 'renaissance', name: 'Renaissance & Early Modern', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'modern': { id: 'modern', name: 'Modern History', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'world-wars': { id: 'world-wars', name: 'World Wars', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'empires': { id: 'empires', name: 'Empires & Civilizations', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'revolutions': { id: 'revolutions', name: 'Revolutions & Conflicts', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'exploration': { id: 'exploration', name: 'Exploration & Discovery', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },

  // Ancient World children (Level 3)
  'egypt': { id: 'egypt', name: 'Ancient Egypt', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'rome': { id: 'rome', name: 'Ancient Rome', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'greece': { id: 'greece', name: 'Ancient Greece', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'persia': { id: 'persia', name: 'Persian Empire', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'china-ancient': { id: 'china-ancient', name: 'Ancient China', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'mesopotamia': { id: 'mesopotamia', name: 'Mesopotamia', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'maya': { id: 'maya', name: 'Maya Civilization', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },

  // ===== MATHEMATICS (6 sub-categories) =====
  'numbers-arithmetic': { id: 'numbers-arithmetic', name: 'Numbers & Arithmetic', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'algebra': { id: 'algebra', name: 'Algebra', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'geometry': { id: 'geometry', name: 'Geometry', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'statistics-probability': { id: 'statistics-probability', name: 'Statistics & Probability', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'famous-problems': { id: 'famous-problems', name: 'Famous Problems', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'mathematicians': { id: 'mathematicians', name: 'Mathematicians', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },

  // ===== PEOPLE (8 sub-categories) =====
  'leaders-politicians': { id: 'leaders-politicians', name: 'Leaders & Politicians', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'scientists-inventors': { id: 'scientists-inventors', name: 'Scientists & Inventors', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'artists-writers': { id: 'artists-writers', name: 'Artists & Writers', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'musicians-performers': { id: 'musicians-performers', name: 'Musicians & Performers', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'explorers-adventurers': { id: 'explorers-adventurers', name: 'Explorers & Adventurers', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'philosophers-thinkers': { id: 'philosophers-thinkers', name: 'Philosophers & Thinkers', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'athletes': { id: 'athletes', name: 'Athletes', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'villains-outlaws': { id: 'villains-outlaws', name: 'Villains & Outlaws', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },

  // ===== PHILOSOPHY & RELIGION (7 sub-categories) =====
  'world-religions': { id: 'world-religions', name: 'World Religions', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'mythology': { id: 'mythology', name: 'Mythology', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'ethics-morality': { id: 'ethics-morality', name: 'Ethics & Morality', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'logic-reasoning': { id: 'logic-reasoning', name: 'Logic & Reasoning', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'eastern-philosophy': { id: 'eastern-philosophy', name: 'Eastern Philosophy', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'western-philosophy': { id: 'western-philosophy', name: 'Western Philosophy', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'spirituality-mysticism': { id: 'spirituality-mysticism', name: 'Spirituality & Mysticism', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },

  // ===== PHYSICAL SCIENCES (6 sub-categories) =====
  'physics': { id: 'physics', name: 'Physics', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'chemistry': { id: 'chemistry', name: 'Chemistry', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'astronomy-space': { id: 'astronomy-space', name: 'Astronomy & Space', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'earth-science': { id: 'earth-science', name: 'Earth Science', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'energy-forces': { id: 'energy-forces', name: 'Energy & Forces', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'elements-materials': { id: 'elements-materials', name: 'Elements & Materials', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },

  // ===== SOCIETY (8 sub-categories) =====
  'politics-government': { id: 'politics-government', name: 'Politics & Government', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'economics-money': { id: 'economics-money', name: 'Economics & Money', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'law-justice': { id: 'law-justice', name: 'Law & Justice', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'education': { id: 'education', name: 'Education', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'media-communication': { id: 'media-communication', name: 'Media & Communication', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'social-movements': { id: 'social-movements', name: 'Social Movements', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'war-military': { id: 'war-military', name: 'War & Military', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'culture-customs': { id: 'culture-customs', name: 'Culture & Customs', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },

  // ===== TECHNOLOGY (8 sub-categories) =====
  'computers-internet': { id: 'computers-internet', name: 'Computers & Internet', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'engineering': { id: 'engineering', name: 'Engineering', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'inventions': { id: 'inventions', name: 'Inventions', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'transportation': { id: 'transportation', name: 'Transportation', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'weapons-defense': { id: 'weapons-defense', name: 'Weapons & Defense', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'communication-tech': { id: 'communication-tech', name: 'Communication Tech', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'energy-power': { id: 'energy-power', name: 'Energy & Power', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'future-tech-ai': { id: 'future-tech-ai', name: 'Future Tech & AI', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
}

// Overview cards are now generated dynamically by AI when a deck is first opened
// No hardcoded cards - all study material is generated on-the-fly

// Helper to determine deck depth level
function getDeckLevel(id) {
  // Level 1: Categories
  if (CATEGORIES.find(c => c.id === id)) return 1
  // Level 2: Hardcoded sub-categories
  if (SUBCATEGORIES[id]) return 2
  // Level 3+: Dynamic decks (check localStorage)
  const dynamicDeck = getDynamicDeck(id)
  return dynamicDeck?.depth || 3
}

// Get deck data by ID (checks hardcoded data first, then tree, then dynamic storage)
function getDeck(id) {
  // Check hardcoded categories first (Level 1)
  const category = CATEGORIES.find(c => c.id === id)
  if (category) return { ...category, level: 1 }

  // Check hardcoded sub-categories (Level 2)
  const subcat = SUBCATEGORIES[id]
  if (subcat) return { ...subcat, level: 2 }

  // Check vital articles tree (tree-based navigation)
  const treeNode = getTreeNode(id)
  if (treeNode) {
    return treeNode
  }

  // Check dynamic decks (Level 3+)
  const dynamicDeck = getDynamicDeck(id)
  if (dynamicDeck) {
    return {
      id: dynamicDeck.id,
      name: dynamicDeck.name,
      gradient: dynamicDeck.gradient,
      borderColor: dynamicDeck.borderColor,
      children: dynamicDeck.children || [],
      level: dynamicDeck.depth || 3,
      parentPath: dynamicDeck.parentPath,
      childrenGenerated: dynamicDeck.childrenGenerated,
    }
  }

  return null
}

// Deck component - a card with subtle stack effect (cards underneath)
// Deck component - clean, minimal design with left accent stripe
function Deck({ deck, onOpen, claimed, rootCategoryId = null }) {
  const themeId = rootCategoryId || deck.id
  const theme = getCategoryTheme(themeId)

  return (
    <motion.div
      className="relative cursor-pointer group"
      onClick={() => onOpen(deck)}
      whileHover={{ y: -4, boxShadow: theme.shadowHover }}
      whileTap={{ scale: 0.98 }}
      style={{ paddingRight: 6, paddingBottom: 6 }}
    >
      {/* Stack layers - subtle cards underneath */}
      <div
        className="absolute w-28 h-36 rounded-xl"
        style={{
          transform: 'translate(4px, 4px) rotate(2deg)',
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      />
      <div
        className="absolute w-28 h-36 rounded-xl"
        style={{
          transform: 'translate(2px, 2px) rotate(0.5deg)',
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      />

      {/* Top card - clean design with left accent stripe */}
      <div className="relative w-28 h-36">
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            boxShadow: claimed ? theme.shadowHover : theme.shadow,
          }}
        >
          {/* Left accent stripe */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-l-xl"
            style={{
              width: theme.accentWidth,
              background: claimed ? theme.accent : theme.accentFaded,
            }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pl-1">
          <span className="text-xs font-semibold text-center px-2 leading-tight whitespace-pre-line" style={{ color: theme.textPrimary }}>{deck.name}</span>
          {claimed && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: theme.accent }}>
              <span className="text-white text-[10px] font-bold">✓</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Overview card component - same size as deck cards (w-28 h-36)
// Matches the visual style of CategoryCard for each theme
// Helper to get card styles for a category
// Get overview card styling - clean, minimal design
// White/light gray background, accent stripe on left, subtle shadow
function getOverviewCardStyles(rootCategoryId, theme, claimed, tint) {
  return {
    background: theme.cardBg,
    border: `1px solid ${theme.border}`,
    boxShadow: claimed ? theme.shadowHover : theme.shadow,
    borderRadius: theme.radius,
  }
}

// Render left accent stripe for overview card
function renderOverviewCardDecorations(rootCategoryId, theme, claimed = false) {
  return (
    <div
      className="absolute top-0 bottom-0 left-0 rounded-l-[12px]"
      style={{
        width: theme.accentWidth,
        background: claimed ? theme.accent : theme.accentFaded,
      }}
    />
  )
}

function OverviewCard({ card, index, total, onClaim, claimed, onRead, tint = '#fafbfc', rootCategoryId = null, isRevealed = true }) {
  const theme = getCategoryTheme(rootCategoryId)
  const cardStyles = getOverviewCardStyles(rootCategoryId, theme, claimed, tint)

  return (
    <div
      className="relative w-28 h-36"
      style={{
        perspective: '600px',
        WebkitPerspective: '600px',
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        }}
        initial={false}
        animate={{ rotateY: isRevealed ? 0 : 180 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face (revealed) */}
        <motion.div
          className="absolute inset-0 rounded-xl cursor-pointer flex flex-col items-center justify-center p-3 pl-4 overflow-hidden"
          style={{
            ...cardStyles,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            zIndex: isRevealed ? 2 : 1,
          }}
          onClick={() => isRevealed && onRead(card)}
          whileHover={isRevealed ? { y: -4, boxShadow: theme.shadowHover } : {}}
          whileTap={isRevealed ? { scale: 0.98 } : {}}
        >
          {/* Left accent stripe */}
          {renderOverviewCardDecorations(rootCategoryId, theme, claimed)}
          <span className="text-xs font-semibold text-center leading-tight px-1 relative z-10" style={{ color: theme.textPrimary }}>{card.title}</span>
          {claimed && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: theme.accent }}>
              <span className="text-white text-[10px] font-bold">✓</span>
            </div>
          )}
        </motion.div>

        {/* Back face (face-down/loading) */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            ...cardStyles,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
            zIndex: isRevealed ? 1 : 2,
          }}
        >
          {/* Left accent stripe */}
          {renderOverviewCardDecorations(rootCategoryId, theme, false)}
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.accent}20, transparent)`
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Mini card for collection display - shows a small version of the actual card
// size: 'small' (drawer preview), 'medium' (expanded grid), 'large' (future use)
function MiniCollectionCard({ card, rootCategoryId, style = {}, size = 'small', onClick }) {
  const theme = getCategoryTheme(rootCategoryId)

  // Size configurations - with accent stripe width scaling
  const sizeConfig = {
    small: { width: 'w-12', height: 'h-16', text: 'text-[6px]', check: 'w-2 h-2 text-[5px]', padding: 'p-1 pl-2', stripeWidth: '3px' },
    medium: { width: 'w-20', height: 'h-28', text: 'text-[9px]', check: 'w-3 h-3 text-[7px]', padding: 'p-2 pl-3', stripeWidth: '4px' },
    large: { width: 'w-28', height: 'h-36', text: 'text-xs', check: 'w-4 h-4 text-[10px]', padding: 'p-3 pl-4', stripeWidth: '5px' },
  }
  const config = sizeConfig[size] || sizeConfig.small

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      className={`${config.width} ${config.height} rounded-lg flex flex-col items-center justify-center ${config.padding} overflow-hidden relative ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        borderRadius: '8px',
        ...style
      }}
      onClick={onClick}
    >
      {/* Left accent stripe */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-l-lg"
        style={{
          width: config.stripeWidth,
          background: theme.accent,
        }}
      />

      {/* Card title - truncated */}
      <span
        className={`${config.text} font-semibold text-center leading-tight px-0.5 relative z-10 line-clamp-3`}
        style={{ color: theme.textPrimary }}
      >
        {card.title}
      </span>

      {/* Claimed checkmark */}
      <div
        className={`absolute top-0.5 right-0.5 ${config.check} rounded-full flex items-center justify-center`}
        style={{ background: theme.accent }}
      >
        <span className="text-white font-bold">✓</span>
      </div>
    </Wrapper>
  )
}

// Locked card placeholder for locked tiers - clean design
function LockedCard({ index, rootCategoryId = null }) {
  const theme = getCategoryTheme(rootCategoryId)

  return (
    <motion.div
      className="relative w-28 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 pl-4 opacity-50 overflow-hidden"
      style={{
        background: theme.cardBg,
        borderColor: theme.border,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.5, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Faded left accent stripe */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-l-xl"
        style={{
          width: theme.accentWidth,
          background: theme.accentFaded,
        }}
      />
      <span className="text-xl mb-1">🔒</span>
      <span className="text-xs text-center" style={{ color: theme.textSecondary }}>Locked</span>
    </motion.div>
  )
}

// Category card - flippable card showing category info and progress
// Styled to match the themed child cards
function CategoryCard({ deck, tint = '#fafbfc', rootCategoryId = null }) {
  const [isFlipped, setIsFlipped] = useState(true) // Start showing info side
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)

  // Get progress stats
  const totalTopics = countDescendants(deck.id)
  const claimedTopics = countClaimedDescendants(deck.id)
  const progressPercent = totalTopics > 0 ? Math.round((claimedTopics / totalTopics) * 100) : 0

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Get card styling - clean, minimal design with left accent stripe
  const getCardStyle = () => {
    return {
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      boxShadow: theme.shadow,
    }
  }

  // Render left accent stripe decoration
  const renderDecorations = () => {
    return (
      <div
        className="absolute top-0 bottom-0 left-0 rounded-l-2xl"
        style={{
          width: '6px',
          background: theme.accent,
        }}
      />
    )
  }

  const cardStyle = getCardStyle()

  return (
    <motion.div
      className="relative w-64 h-44 cursor-pointer"
      style={{ perspective: 1000 }}
      onClick={handleFlip}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(1px)',
            ...cardStyle
          }}
        >
          {renderDecorations()}
          <h2 className="text-lg font-bold text-center relative z-10" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{deck.name}</h2>
          <p className="text-xs mt-2 relative z-10" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Tap to flip</p>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)',
            ...cardStyle
          }}
        >
          {renderDecorations()}
          <h3 className="text-sm font-bold text-center mb-3 relative z-10" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{deck.name}</h3>

          {/* Progress bar */}
          <div className="w-full px-4 mb-3 relative z-10">
            <div className="flex justify-between text-xs mb-1" style={{ color: isThemed ? theme.textSecondary : '#6b7280' }}>
              <span>Progress</span>
              <span>{claimedTopics}/{totalTopics}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)`
                }}
              />
            </div>
          </div>

          <p className="text-xs text-center relative z-10" style={{ color: isThemed ? theme.textSecondary : '#6b7280' }}>
            Explore the topics within
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Continue Exploring section - shows in-progress topics on Learn tab
function ContinueExploringSection({ decks, onOpenDeck }) {
  if (!decks || decks.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-3">Continue Exploring</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {decks.map((deck) => {
          const theme = getCategoryTheme(deck.rootCategoryId)
          const isThemed = hasCustomTheme(deck.rootCategoryId)
          const progressPercent = Math.round((deck.claimedCount / deck.totalCount) * 100)

          return (
            <motion.button
              key={deck.id}
              onClick={() => onOpenDeck({ id: deck.id, name: deck.name })}
              className="flex-shrink-0 w-32 rounded-xl p-3 text-left transition-all"
              style={{
                background: isThemed ? theme.cardBg : '#ffffff',
                border: `2px solid ${isThemed ? theme.accent : '#e5e7eb'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Topic name */}
              <p
                className="text-sm font-semibold line-clamp-2 leading-tight mb-2"
                style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}
              >
                {deck.name}
              </p>

              {/* Progress count */}
              <p
                className="text-xs font-medium mb-1.5"
                style={{ color: isThemed ? theme.accent : '#6b7280' }}
              >
                {deck.claimedCount}/{deck.totalCount}
              </p>

              {/* Progress bar */}
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    background: isThemed ? theme.accent : '#6b7280',
                  }}
                />
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Tier section component - shows cards for one tier with header and progress
function TierSection({ tier, tierName, cards, claimedCards, onReadCard, completion, isLocked, onUnlock, isUnlocking, totalCards = 15, tint, rootCategoryId, outline }) {
  const { claimed, total } = completion
  const isComplete = total > 0 && claimed === total

  // Track which cards have been revealed (for flip animation)
  const [revealedCards, setRevealedCards] = useState(new Set())

  // When a new card arrives, reveal it after a short delay
  useEffect(() => {
    cards.forEach((card, index) => {
      if (!revealedCards.has(card.id)) {
        // Stagger reveals: each card flips 150ms after the previous
        const delay = index * 150
        setTimeout(() => {
          setRevealedCards(prev => new Set([...prev, card.id]))
        }, delay)
      }
    })
  }, [cards])

  if (isLocked) {
    const lockedCount = outline?.[tier]?.length || 5
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-400">{tierName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Locked</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">Complete the previous tier to unlock!</p>
        <div className="flex gap-2 flex-wrap justify-center opacity-50">
          {Array.from({ length: lockedCount }).map((_, index) => (
            <LockedCard key={`locked-${tier}-${index}`} index={index} rootCategoryId={rootCategoryId} />
          ))}
        </div>
      </div>
    )
  }

  // Cards generated but tier accessible - show all slots (some may be face-down)
  if (cards.length > 0 || (outline && outline[tier])) {
    // Get expected count from outline (how many cards will be generated)
    const expectedCount = outline?.[tier]?.length || cards.length || 5
    // Calculate offset based on tier (supports both new two-tier and legacy three-tier)
    const tierOffset = tier === 'core' ? 0 : tier === 'deep_dive' ? expectedCount : tier === 'deep_dive_1' ? 5 : 10

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{tierName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isComplete
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {claimed}/{total || expectedCount}
          </span>
          {isComplete && <span className="text-green-500">✓</span>}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {/* Render all 5 slots - loaded cards or face-down placeholders */}
          {Array.from({ length: expectedCount }).map((_, index) => {
            const card = cards[index]
            const globalIndex = tierOffset + index

            if (card) {
              // Card has loaded - show it (may or may not be revealed yet)
              return (
                <OverviewCard
                  key={card.id}
                  card={card}
                  index={globalIndex}
                  total={totalCards}
                  claimed={claimedCards.has(card.id)}
                  onClaim={() => {}}
                  onRead={onReadCard}
                  tint={tint}
                  rootCategoryId={rootCategoryId}
                  isRevealed={revealedCards.has(card.id)}
                />
              )
            } else {
              // Card not yet loaded - show face-down placeholder
              return (
                <OverviewCard
                  key={`placeholder-${tier}-${index}`}
                  card={{ id: `placeholder-${tier}-${index}`, title: '' }}
                  index={globalIndex}
                  total={totalCards}
                  claimed={false}
                  onClaim={() => {}}
                  onRead={() => {}}
                  tint={tint}
                  rootCategoryId={rootCategoryId}
                  isRevealed={false}
                />
              )
            }
          })}
        </div>
      </div>
    )
  }

  // Tier accessible but not yet generated - show unlock prompt
  const tierEmoji = tier === 'core' ? '📚' : (tier === 'deep_dive' || tier === 'deep_dive_1') ? '🔬' : '🎓'
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{tierEmoji}</span>
        <span className="text-sm font-semibold text-gray-600">{tierName}</span>
      </div>
      <motion.button
        onClick={onUnlock}
        disabled={isUnlocking}
        className={`
          px-6 py-3 rounded-xl text-white font-semibold
          bg-gradient-to-r from-purple-500 to-indigo-600
          shadow-lg hover:shadow-xl transition-all
          ${isUnlocking ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'}
        `}
        whileHover={isUnlocking ? {} : { y: -2 }}
        whileTap={isUnlocking ? {} : { scale: 0.95 }}
      >
        {isUnlocking ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </span>
        ) : (
          <span>🎁 Unlock {tierName}</span>
        )}
      </motion.button>
      <p className="text-xs text-gray-400">5 bonus cards await!</p>
    </div>
  )
}

// Tier completion celebration modal - "What's Next?" screen
function TierCompleteCelebration({
  tierName,
  nextTierName,
  onContinue,
  onUnlockNext,
  nextTierReady,
  topicName,
  siblingTopics,
  onSelectTopic,
  onWander,
  onHome,
  isFullyMastered
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
      >
        {/* Close button */}
        <button
          onClick={onContinue}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
          aria-label="Close"
        >
          <span className="text-lg font-light text-gray-500">×</span>
        </button>

        {/* Section 1: Celebration (subtle) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium mb-3">
            <span>✓</span>
            <span>{tierName} Complete</span>
          </div>
          <p className="text-gray-600 text-sm">
            {isFullyMastered
              ? `You've fully mastered ${topicName}!`
              : `You understand ${topicName}`
            }
          </p>
        </div>

        {/* Section 2: Go Deeper (primary action) - only if not fully mastered */}
        {nextTierName && (
          <div className="mb-6">
            <button
              onClick={onUnlockNext}
              className="w-full py-4 rounded-xl text-white font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
            >
              Unlock {nextTierName}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              5 bonus cards await
            </p>
          </div>
        )}

        {/* Section 3: Related Topics (rabbit hole) */}
        {siblingTopics && siblingTopics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Related Topics</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {siblingTopics.slice(0, 3).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className="flex-shrink-0 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-left min-w-[140px]"
                >
                  <span className="text-sm font-medium text-gray-800 line-clamp-2">{topic.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Other paths (subtle, bottom) */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onWander}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
          >
            <span>🌀</span>
            <span>Wander</span>
          </button>
          <button
            onClick={onHome}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Preview card modal - shown before committing to learn a topic
// Styled to match ExpandedCard exactly with flip animation
function PreviewCardModal({
  topic,
  preview,
  isLoading,
  claimed,
  cardId,
  onClaim,
  onDealMeIn,
  onWander,
  onBack,
  rootCategoryId,
  isCurrentPage = false // True if we're already on this topic's page
}) {
  const [isFlipped, setIsFlipped] = useState(false) // Start on front, flip when content arrives
  const [hasAutoFlipped, setHasAutoFlipped] = useState(false)
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)

  // Auto-flip when content arrives
  useEffect(() => {
    if (preview && !isLoading && !hasAutoFlipped) {
      // Small delay so user sees the transition
      const timer = setTimeout(() => {
        setIsFlipped(true)
        setHasAutoFlipped(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [preview, isLoading, hasAutoFlipped])

  const handleFlip = (e) => {
    // Don't flip if clicking buttons
    if (e.target.closest('button')) return
    if (!isLoading && preview) {
      setIsFlipped(!isFlipped)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onBack}
    >
      <motion.div
        className="relative w-[85vw] max-w-[380px] h-[75vh] min-h-[400px] max-h-[600px] cursor-pointer"
        style={{ perspective: 1000 }}
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => { e.stopPropagation(); handleFlip(e); }}
      >
        {/* Inner container that flips */}
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? -180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Front of card - title and "Tap to read" */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden shadow-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(1px)',
              ...getExpandedCardStyle(rootCategoryId, theme, claimed, '#fafbfc')
            }}
          >
            {/* Themed decorations */}
            {renderExpandedCardDecorations(rootCategoryId, theme)}

            {/* Claimed badge - top right (next to close button) */}
            {claimed && (
              <div className="absolute top-3 right-12 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-20" style={{ background: isThemed ? theme.accent : '#facc15' }}>
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            )}

            {/* Close button - top right */}
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
              style={{
                background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                color: isThemed ? theme.textSecondary : '#6b7280'
              }}
              aria-label="Close"
            >
              <span className="text-lg font-light">×</span>
            </button>

            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{
                  borderColor: isThemed ? theme.cardBgAlt : '#e5e7eb',
                  borderTopColor: isThemed ? theme.accent : '#eab308'
                }} />
                <span className="text-base" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Peeking...</span>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-center mb-4 leading-tight px-2 relative z-10" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{toTitleCase(topic)}</h2>
                <span className="text-sm relative z-10" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Tap to read</span>
              </>
            )}
          </div>

          {/* Back of card - content and action buttons */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col p-5 overflow-hidden shadow-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(-180deg) translateZ(1px)',
              ...getExpandedCardStyle(rootCategoryId, theme, claimed, '#fafbfc')
            }}
          >
            {/* Themed decorations */}
            {renderExpandedCardDecorations(rootCategoryId, theme, true)}

            {/* Close button - top right */}
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
              style={{
                background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                color: isThemed ? theme.textSecondary : '#6b7280'
              }}
              aria-label="Close"
            >
              <span className="text-lg font-light">×</span>
            </button>

            {/* Header */}
            <div className="flex justify-between items-start mb-3 pr-8 relative z-10">
              <h2 className="text-lg font-bold leading-tight flex-1" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{topic}</h2>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto relative z-10">
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: isThemed ? theme.textPrimary : '#374151' }}>
                {renderMarkdown(preview)}
              </div>
            </div>

            {/* Card ID - bottom left corner */}
            {cardId && (
              <div
                className="absolute bottom-3 left-4 text-xs font-mono z-10"
                style={{ color: isThemed ? `${theme.textSecondary}80` : '#9ca3af' }}
              >
                {cardId}
              </div>
            )}

            {/* Claimed badge - bottom right corner */}
            {claimed && (
              <div
                className="absolute bottom-3 right-4 flex items-center gap-1 px-2 py-1 rounded-full z-10"
                style={{
                  background: isThemed ? theme.accent : '#10b981',
                  boxShadow: `0 1px 4px ${isThemed ? theme.accentGlow : 'rgba(16, 185, 129, 0.3)'}`
                }}
              >
                <span className={`text-xs font-bold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>✓</span>
                <span className={`text-[10px] font-semibold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>Claimed</span>
              </div>
            )}

            {/* Action buttons - hide if already on this page and claimed */}
            {!(isCurrentPage && claimed) && (
              <div className="mt-3 pt-3 relative z-10 space-y-2" style={{ borderTop: isThemed ? `1px solid ${theme.accent}20` : '1px solid #f3f4f6' }} onClick={e => e.stopPropagation()}>
                {/* Claim and Explore buttons side by side */}
                <div className="flex gap-2">
                  <button
                    onClick={onClaim}
                    disabled={claimed}
                    className="flex-1 py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: claimed
                        ? (isThemed ? theme.cardBgAlt : '#e5e7eb')
                        : (isThemed ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` : 'linear-gradient(135deg, #eab308, #d97706)'),
                      color: claimed
                        ? (isThemed ? theme.textSecondary : '#9ca3af')
                        : (isThemed ? '#0f172a' : '#ffffff'),
                      boxShadow: claimed ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {claimed ? 'Claimed' : 'Claim'}
                  </button>
                  <button
                    onClick={() => {
                      if (!claimed) onClaim()
                      onDealMeIn()
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                    style={{
                      background: isThemed ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` : 'linear-gradient(135deg, #eab308, #d97706)',
                      color: isThemed ? '#0f172a' : '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    Explore →
                  </button>
                </div>

                {/* Secondary options */}
                <div className="flex gap-2">
                  <button
                    onClick={onBack}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    style={{
                      background: '#ffffff',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb'
                    }}
                  >
                    <span>←</span>
                    <span>Back</span>
                  </button>
                  <button
                    onClick={onWander}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(to right, #a855f7, #4f46e5)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <span>🎲</span>
                    <span>Wander</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// Wander Card - shows wandering animation inside a card, then transitions to preview
function WanderCard({
  pathSteps,
  currentStep,
  isComplete,
  // Preview props (only used when isComplete and preview is ready)
  previewData,  // { title, preview, isLoading, claimed, cardId }
  onClaim,
  onExplore,
  onWander,
  onBack,
  rootCategoryId
}) {
  const [isFlipped, setIsFlipped] = useState(true) // Start flipped to show content
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)

  // Determine if we're still in "wandering" phase or showing preview
  const showPreview = isComplete && previewData && !previewData.isLoading && previewData.preview

  const handleFlip = (e) => {
    // Don't flip if clicking buttons or if not showing preview yet
    if (e.target.closest('button')) return
    if (showPreview) {
      setIsFlipped(!isFlipped)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={isComplete ? onBack : undefined}
    >
      <motion.div
        className="relative w-[85vw] max-w-[380px] h-[75vh] min-h-[400px] max-h-[600px] cursor-pointer"
        style={{ perspective: 1000 }}
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => { e.stopPropagation(); handleFlip(e); }}
      >
        {/* WANDERING STATE - non-flipping card */}
        {!showPreview && (
          <div
            className="w-full h-full rounded-2xl flex flex-col overflow-hidden relative shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)' }}
          >
            {/* Close button - top right (only when complete) */}
            {isComplete && (
              <button
                onClick={onBack}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                aria-label="Close"
              >
                <span className="text-lg font-light">×</span>
              </button>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-5 relative">
              {/* Mini stars background */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                    }}
                    animate={{
                      opacity: [0.3, 0.8, 0.3],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>

              {/* Dice/target animation */}
              <motion.div
                className="text-5xl mb-4 relative z-10"
                animate={{
                  rotate: isComplete ? 0 : [0, 360],
                  scale: isComplete ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  rotate: { duration: 2, repeat: isComplete ? 0 : Infinity, ease: 'linear' },
                  scale: { duration: 0.5 },
                }}
              >
                {isComplete ? '🎯' : '🎲'}
              </motion.div>

              <motion.h2
                className="text-lg font-bold text-white mb-3 relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {isComplete ? 'Found something!' : 'Wandering...'}
              </motion.h2>

              {/* Path building animation */}
              <div className="flex flex-wrap items-center justify-center gap-1 text-white/90 text-sm px-2 relative z-10 min-h-[40px]">
                {pathSteps.map((step, index) => (
                  <motion.span
                    key={index}
                    className="flex items-center"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.3 }}
                  >
                    {index > 0 && <span className="text-white/50 mx-1">→</span>}
                    <span className={index === pathSteps.length - 1 ? 'text-yellow-300 font-medium' : ''}>
                      {step.name}
                    </span>
                    {index === currentStep && !isComplete && (
                      <motion.span
                        className="ml-0.5"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        ...
                      </motion.span>
                    )}
                  </motion.span>
                ))}
              </div>

              {/* Loading preview indicator */}
              {isComplete && previewData?.isLoading && (
                <motion.div
                  className="mt-4 flex items-center gap-2 text-white/70 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Loading preview...</span>
                </motion.div>
              )}

              {!isComplete && (
                <motion.p
                  className="text-white/60 text-xs mt-4 relative z-10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Discovering unexplored territory...
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* PREVIEW STATE - flipping card */}
        {showPreview && (
          <motion.div
            className="relative w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: isFlipped ? -180 : 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {/* Front of card - "Introduction" and "Tap to read" */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(1px)',
                ...getExpandedCardStyle(rootCategoryId, theme, previewData?.claimed, '#fafbfc')
              }}
            >
              {renderExpandedCardDecorations(rootCategoryId, theme)}

              {/* Claimed badge - top right (next to close button) */}
              {previewData?.claimed && (
                <div className="absolute top-3 right-12 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-20" style={{ background: isThemed ? theme.accent : '#facc15' }}>
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
                style={{
                  background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                  color: isThemed ? theme.textSecondary : '#6b7280'
                }}
                aria-label="Close"
              >
                <span className="text-lg font-light">×</span>
              </button>

              <h2 className="text-xl font-bold text-center mb-4 leading-tight px-2 relative z-10" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{toTitleCase(previewData?.title)}</h2>
              <span className="text-sm relative z-10" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Tap to read</span>
            </div>

            {/* Back of card - content and action buttons */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col p-5 overflow-hidden shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(-180deg) translateZ(1px)',
                ...getExpandedCardStyle(rootCategoryId, theme, previewData?.claimed, '#fafbfc')
              }}
            >
              {renderExpandedCardDecorations(rootCategoryId, theme, true)}

              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
                style={{
                  background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                  color: isThemed ? theme.textSecondary : '#6b7280'
                }}
                aria-label="Close"
              >
                <span className="text-lg font-light">×</span>
              </button>

              {/* Title */}
              <div className="flex justify-between items-start mb-3 pr-8 relative z-10">
                <h2 className="text-lg font-bold leading-tight flex-1" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{previewData.title}</h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto text-sm leading-relaxed relative z-10" style={{ color: isThemed ? theme.textPrimary : '#374151' }}>
                {renderMarkdown(previewData.preview)}
              </div>

              {/* Card ID - bottom left corner */}
              {previewData.cardId && (
                <div
                  className="absolute bottom-3 left-4 text-xs font-mono z-10"
                  style={{ color: isThemed ? `${theme.textSecondary}80` : '#9ca3af' }}
                >
                  {previewData.cardId}
                </div>
              )}

              {/* Claimed badge - bottom right corner */}
              {previewData.claimed && (
                <div
                  className="absolute bottom-3 right-4 flex items-center gap-1 px-2 py-1 rounded-full z-10"
                  style={{
                    background: isThemed ? theme.accent : '#10b981',
                    boxShadow: `0 1px 4px ${isThemed ? theme.accentGlow : 'rgba(16, 185, 129, 0.3)'}`
                  }}
                >
                  <span className={`text-xs font-bold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>✓</span>
                  <span className={`text-[10px] font-semibold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>Claimed</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 pt-3 space-y-2 relative z-10" style={{ borderTop: isThemed ? `1px solid ${theme.accent}20` : '1px solid #f3f4f6' }} onClick={e => e.stopPropagation()}>
                <div className="flex gap-2">
                  <button
                    onClick={onClaim}
                    disabled={previewData.claimed}
                    className="flex-1 py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: previewData.claimed
                        ? (isThemed ? theme.cardBgAlt : '#e5e7eb')
                        : (isThemed ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` : 'linear-gradient(135deg, #eab308, #d97706)'),
                      color: previewData.claimed
                        ? (isThemed ? theme.textSecondary : '#9ca3af')
                        : (isThemed ? '#0f172a' : '#ffffff'),
                      boxShadow: previewData.claimed ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {previewData.claimed ? 'Claimed' : 'Claim'}
                  </button>
                  <button
                    onClick={() => {
                      if (!previewData.claimed) onClaim()
                      onExplore()
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                    style={{
                      background: isThemed ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` : 'linear-gradient(135deg, #eab308, #d97706)',
                      color: isThemed ? '#0f172a' : '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    Explore →
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onWander}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(to right, #a855f7, #4f46e5)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <span>🎲</span>
                    <span>Wander</span>
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    style={{
                      background: '#ffffff',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb'
                    }}
                  >
                    <span>←</span>
                    <span>Back</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

// Skeleton card - shown while generating cards for the first time
function SkeletonCard({ index, rootCategoryId = null }) {
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)

  return (
    <motion.div
      className="relative w-28 h-36 rounded-xl border-2 overflow-hidden"
      style={{
        background: isThemed ? theme.cardBgAlt : '#f3f4f6',
        borderColor: isThemed ? `${theme.accent}30` : '#e5e7eb'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center h-full p-3 gap-2">
        {/* Index placeholder */}
        <div className="w-6 h-3 rounded" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }} />
        {/* Title placeholder - two lines */}
        <div className="w-16 h-2 rounded" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }} />
        <div className="w-14 h-2 rounded" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }} />
      </div>
    </motion.div>
  )
}

// Simple markdown renderer for **bold** text and paragraph breaks
// Optional: definedTerms array and onTermClick callback for tappable definitions
function renderMarkdown(text, definedTerms = [], onTermClick = null) {
  if (!text) return null

  // Split by double newlines to create paragraphs
  const paragraphs = text.split(/\n\n+/)

  // Create a case-insensitive regex to find defined terms
  const termRegex = definedTerms.length > 0
    ? new RegExp(`\\b(${definedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    : null

  return paragraphs.map((paragraph, pIndex) => {
    // Handle bold text within each paragraph
    const parts = paragraph.split(/(\*\*.*?\*\*)/g)
    const content = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2)

        // Check if bold text contains a defined term
        if (termRegex && onTermClick) {
          const termParts = boldText.split(termRegex)
          if (termParts.length > 1) {
            return (
              <strong key={i} className="font-semibold">
                {termParts.map((tp, tpi) => {
                  const isDefinedTerm = definedTerms.some(t => t.toLowerCase() === tp.toLowerCase())
                  if (isDefinedTerm) {
                    return (
                      <span
                        key={tpi}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTermClick(tp, e) }}
                        className="underline decoration-dotted decoration-blue-400 cursor-help"
                        style={{ textDecorationThickness: '2px' }}
                      >
                        {tp}
                      </span>
                    )
                  }
                  return tp
                })}
              </strong>
            )
          }
        }

        return <strong key={i} className="font-semibold">{boldText}</strong>
      }

      // Check for defined terms in regular text
      if (termRegex && onTermClick) {
        const termParts = part.split(termRegex)
        if (termParts.length > 1) {
          return termParts.map((tp, tpi) => {
            const isDefinedTerm = definedTerms.some(t => t.toLowerCase() === tp.toLowerCase())
            if (isDefinedTerm) {
              return (
                <span
                  key={`${i}-${tpi}`}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onTermClick(tp, e) }}
                  className="underline decoration-dotted decoration-blue-400 cursor-help"
                  style={{ textDecorationThickness: '2px' }}
                >
                  {tp}
                </span>
              )
            }
            return tp
          })
        }
      }

      return part
    })

    return (
      <p key={pIndex} className={pIndex > 0 ? 'mt-3' : ''}>
        {content}
      </p>
    )
  })
}

// Definition popup component
function DefinitionPopup({ term, position, topicContext, onClose }) {
  const [definition, setDefinition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const popupRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchDefinition = async () => {
      try {
        // Check cache first
        const cacheKey = `def_${term.toLowerCase()}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setDefinition(cached)
          setLoading(false)
          return
        }

        const { generateDefinition } = await import('../services/claude.js')
        const result = await generateDefinition(term, topicContext)

        if (!cancelled) {
          setDefinition(result.definition)
          // Cache for session
          sessionStorage.setItem(cacheKey, result.definition)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load definition')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDefinition()
    return () => { cancelled = true }
  }, [term, topicContext])

  // Close on click outside (with small delay to avoid race condition with term click)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Delay adding listener to avoid catching the same click that opened the popup
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Smart positioning - show above if not enough space below
  const popupHeight = 100 // approximate
  const spaceBelow = window.innerHeight - position.y
  const showAbove = spaceBelow < popupHeight + 20

  const style = {
    position: 'fixed',
    left: Math.min(Math.max(10, position.x - 50), window.innerWidth - 270),
    top: showAbove ? position.y - popupHeight - 10 : position.y + 10,
    zIndex: 99999
  }

  // Use portal to render at body level (escapes any overflow:hidden or transform ancestors)
  return createPortal(
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, y: showAbove ? 5 : -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: showAbove ? 5 : -5 }}
      style={style}
      className="bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-[260px]"
    >
      <div className="font-semibold text-blue-300 text-sm mb-1">{term}</div>
      {loading ? (
        <div className="text-gray-400 text-xs">Loading...</div>
      ) : error ? (
        <div className="text-red-400 text-xs">{error}</div>
      ) : (
        <div className="text-gray-200 text-xs leading-relaxed">{definition}</div>
      )}
    </motion.div>,
    document.body
  )
}

// Swipe hint that hides after 5 swipes
function SwipeHint({ hasPrev, hasNext }) {
  const [swipeCount, setSwipeCount] = useState(() => {
    const stored = localStorage.getItem('swipeHintCount')
    return stored ? parseInt(stored, 10) : 0
  })

  // Track swipe count when navigation happens
  useEffect(() => {
    const count = parseInt(localStorage.getItem('swipeHintCount') || '0', 10)
    setSwipeCount(count)
  }, [hasPrev, hasNext]) // Re-check when navigation state changes

  // Increment swipe count (called from parent via effect)
  useEffect(() => {
    const handleSwipe = () => {
      const newCount = swipeCount + 1
      localStorage.setItem('swipeHintCount', newCount.toString())
      setSwipeCount(newCount)
    }

    // Listen for custom swipe event
    window.addEventListener('cardSwiped', handleSwipe)
    return () => window.removeEventListener('cardSwiped', handleSwipe)
  }, [swipeCount])

  // Hide after 5 swipes
  if (swipeCount >= 5) return null

  return (
    <p className="text-center text-gray-400 text-xs mt-2">
      {hasPrev || hasNext ? 'Swipe to navigate' : 'Tap to flip'}
    </p>
  )
}

// Expanded card - zooms in and can flip back and forth
function ExpandedCard({ card, index, total, onClaim, claimed, onClose, deckName, onContentGenerated, allCards, onNext, onPrev, hasNext, hasPrev, startFlipped = false, slideDirection = 0, tint = '#fafbfc', rootCategoryId = null }) {
  const [isFlipped, setIsFlipped] = useState(startFlipped)
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)
  const isTech = rootCategoryId === 'technology'
  const isHistory = rootCategoryId === 'history'
  const isArts = rootCategoryId === 'arts'
  const [content, setContent] = useState(card.content || null)
  const [displayedContent, setDisplayedContent] = useState(card.content || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prevCardId, setPrevCardId] = useState(card.id)
  // Track initial rotation for new cards entering (to skip flip animation)
  const initialRotation = useRef(startFlipped ? 180 : 0)
  // Definition popup state
  const [definitionPopup, setDefinitionPopup] = useState(null) // { term, position }

  const handleTermClick = (term, event) => {
    const rect = event.target.getBoundingClientRect()
    setDefinitionPopup({
      term,
      position: { x: rect.left, y: rect.bottom }
    })
  }

  // Generate content on mount if starting flipped without content
  useEffect(() => {
    if (startFlipped && !card.content && !isLoading) {
      setIsLoading(true)
      const cardNumber = card.number || (index + 1)
      generateSingleCardContent(deckName, cardNumber, card.title, allCards || [])
        .then(finalContent => {
          setContent(finalContent)
          setDisplayedContent(finalContent)
          if (onContentGenerated) {
            onContentGenerated(card.id, finalContent)
          }
        })
        .catch(err => {
          console.error('Failed to generate content:', err)
          setError('Failed to load content')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, []) // Only on mount

  // Reset state when card changes (navigation)
  useEffect(() => {
    if (card.id !== prevCardId) {
      const cardContent = card.content || null
      setContent(cardContent)
      setDisplayedContent(cardContent || '')
      // Always show the back (flipped) when navigating, start already rotated
      initialRotation.current = 180
      setIsFlipped(true)
      setError(null)
      setPrevCardId(card.id)

      // If no content, start generating it
      if (!cardContent) {
        setIsLoading(true)
        const cardNumber = card.number || (index + 1)
        generateSingleCardContent(deckName, cardNumber, card.title, allCards || [])
          .then(finalContent => {
            setContent(finalContent)
            setDisplayedContent(finalContent)
            if (onContentGenerated) {
              onContentGenerated(card.id, finalContent)
            }
          })
          .catch(err => {
            console.error('Failed to generate content:', err)
            setError('Failed to load content')
          })
          .finally(() => {
            setIsLoading(false)
          })
      } else {
        setIsLoading(false)
      }
    }
  }, [card.id, prevCardId])

  // Update content if it arrives from background generation (but not while loading)
  useEffect(() => {
    if (card.content && !content && !isLoading) {
      setContent(card.content)
      setDisplayedContent(card.content)
    }
  }, [card.content, isLoading])

  const handleFlip = (e) => {
    e.stopPropagation()

    // Flip immediately
    setIsFlipped(!isFlipped)

    // If flipping to back and no content yet, generate it
    if (!isFlipped && !content && !isLoading) {
      setIsLoading(true)
      setError(null)

      const cardNumber = card.number || (index + 1)

      // Generate content (no streaming - just wait for full content)
      generateSingleCardContent(
        deckName,
        cardNumber,
        card.title,
        allCards || []
      )
        .then(finalContent => {
          setContent(finalContent)
          setDisplayedContent(finalContent)
          if (onContentGenerated) {
            onContentGenerated(card.id, finalContent)
          }
        })
        .catch(err => {
          console.error('Failed to generate content:', err)
          setError('Failed to load content')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }

  // Handle claim (no auto-advance)
  const handleClaim = () => {
    onClaim(card.id)
  }

  // Handle swipe gestures
  const handleDragEnd = (event, info) => {
    const threshold = 100
    const velocity = 500

    if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swiped right - go to previous
      if (hasPrev) {
        window.dispatchEvent(new CustomEvent('cardSwiped'))
        onPrev()
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swiped left - go to next
      if (hasNext) {
        window.dispatchEvent(new CustomEvent('cardSwiped'))
        onNext()
      }
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Card container */}
      <motion.div
        className="relative w-[85vw] max-w-[380px] h-[75vh] min-h-[400px] max-h-[600px] cursor-pointer"
        style={{ perspective: 1000 }}
        initial={{ x: slideDirection * 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={handleFlip}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {/* Inner container that flips */}
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          initial={{ rotateY: initialRotation.current ? -180 : 0 }}
          animate={{ rotateY: isFlipped ? -180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Front of card - themed to match OverviewCard */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'translateZ(1px)',
              ...getExpandedCardStyle(rootCategoryId, theme, claimed, tint)
            }}
          >
            {/* Themed decorative elements */}
            {renderExpandedCardDecorations(rootCategoryId, theme)}

            {/* Claimed badge - top right (next to close button) */}
            {claimed && (
              <div className="absolute top-3 right-12 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-20" style={{ background: isThemed ? theme.accent : '#facc15' }}>
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            )}

            {/* Close button - top right */}
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
              style={{
                background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                color: isThemed ? theme.textSecondary : '#6b7280'
              }}
              aria-label="Close"
            >
              <span className="text-lg font-light">×</span>
            </button>

            <h2 className="text-xl font-bold text-center mb-4 leading-tight px-2 relative z-10" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{card.title}</h2>
            <span className="text-sm relative z-10" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Tap to read</span>
          </div>

          {/* Back of card - reading view optimized for mobile */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col p-5 overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(-180deg) translateZ(1px)',
              ...getExpandedCardStyle(rootCategoryId, theme, claimed, tint)
            }}
          >
            {/* Themed decorative elements (more subtle on back) */}
            {renderExpandedCardDecorations(rootCategoryId, theme, true)}
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-20"
              style={{
                background: isThemed ? theme.cardBgAlt : '#f3f4f6',
                color: isThemed ? theme.textSecondary : '#6b7280'
              }}
              aria-label="Close"
            >
              <span className="text-lg font-light">×</span>
            </button>

            {/* Header */}
            <div className="flex justify-between items-start mb-3 pr-8 relative z-10">
              <h2 className="text-lg font-bold leading-tight flex-1" style={{ color: isThemed ? theme.textPrimary : '#1f2937' }}>{card.title}</h2>
            </div>

            {/* Content area with loading state */}
            <div className="flex-1 overflow-auto relative z-10">
              {isLoading && !displayedContent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{
                      borderColor: isThemed ? theme.cardBgAlt : '#e5e7eb',
                      borderTopColor: isThemed ? theme.accent : '#eab308'
                    }} />
                    <span className="text-base" style={{ color: isThemed ? theme.textSecondary : '#9ca3af' }}>Generating...</span>
                  </div>
                </div>
              ) : error ? (
                <p className="text-red-500 text-center text-base">{error}</p>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: isThemed ? theme.textPrimary : '#374151' }}>
                  {renderMarkdown(displayedContent, card.definedTerms || [], handleTermClick)}
                </div>
              )}
            </div>

            {/* Definition popup */}
            <AnimatePresence>
              {definitionPopup && (
                <DefinitionPopup
                  term={definitionPopup.term}
                  position={definitionPopup.position}
                  topicContext={deckName}
                  onClose={() => setDefinitionPopup(null)}
                />
              )}
            </AnimatePresence>

            {/* Card ID - bottom left corner */}
            {card.cardId && (
              <div
                className="absolute bottom-3 left-4 text-xs font-mono z-10"
                style={{ color: isThemed ? `${theme.textSecondary}80` : '#9ca3af' }}
              >
                {card.cardId}
              </div>
            )}

            {/* Claimed badge - bottom right corner */}
            {claimed && (
              <div
                className="absolute bottom-3 right-4 flex items-center gap-1 px-2 py-1 rounded-full z-10"
                style={{
                  background: isThemed ? theme.accent : '#10b981',
                  boxShadow: `0 1px 4px ${isThemed ? theme.accentGlow : 'rgba(16, 185, 129, 0.3)'}`
                }}
              >
                <span className={`text-xs font-bold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>✓</span>
                <span className={`text-[10px] font-semibold ${rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')}`}>Claimed</span>
              </div>
            )}

            {/* Action button - compact at bottom */}
            <div className="mt-3 pt-3 relative z-10" style={{ borderTop: isThemed ? `1px solid ${theme.accent}20` : '1px solid #f3f4f6' }} onClick={e => e.stopPropagation()}>
              {!claimed ? (
                <button
                  onClick={handleClaim}
                  disabled={isLoading || !content}
                  className="w-full py-3 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
                  style={{
                    background: isLoading || !content
                      ? (isThemed ? theme.cardBgAlt : '#d1d5db')
                      : (isThemed ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` : 'linear-gradient(135deg, #eab308, #d97706)'),
                    color: isLoading || !content
                      ? (isThemed ? theme.textSecondary : '#9ca3af')
                      : (isThemed ? '#0f172a' : '#ffffff'),
                    cursor: isLoading || !content ? 'not-allowed' : 'pointer',
                    boxShadow: isLoading || !content ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {isLoading ? 'Loading...' : 'Claim'}
                </button>
              ) : (
                <button
                  onClick={() => hasNext ? onNext() : onClose()}
                  disabled={!hasNext && index < total - 1}
                  className="w-full py-3 rounded-xl font-semibold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{
                    background: '#ffffff',
                    color: (!hasNext && index < total - 1) ? '#9ca3af' : '#1f2937',
                    border: '2px solid #d1d5db',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
                    cursor: (!hasNext && index < total - 1) ? 'wait' : 'pointer'
                  }}
                >
                  {hasNext ? (
                    'Next Card →'
                  ) : index < total - 1 ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Done'
                  )}
                </button>
              )}
              {/* Hint text - hide after 5 swipes */}
              <SwipeHint hasPrev={hasPrev} hasNext={hasNext} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// Simple header with back button and current location
function DeckHeader({ stackDecks, onGoBack }) {
  const currentDeck = stackDecks.length > 0 ? stackDecks[stackDecks.length - 1] : null
  const parentDeck = stackDecks.length > 1 ? stackDecks[stackDecks.length - 2] : null

  if (!currentDeck) return null

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Back button */}
      <button
        onClick={onGoBack}
        className="flex items-center gap-1 text-blue-600 font-medium text-sm px-2 py-1 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors shrink-0"
      >
        <span>‹</span>
        <span>{parentDeck ? parentDeck.name : 'Back'}</span>
      </button>

      {/* Current location */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-800 truncate">
          {currentDeck.name}
        </h1>
      </div>
    </div>
  )
}

// Skeleton deck placeholder while loading children
function SkeletonDeck({ index, rootCategoryId = null }) {
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      style={{ paddingRight: 6, paddingBottom: 6 }}
    >
      {/* Stack layers */}
      <div
        className="absolute w-28 h-36 rounded-xl"
        style={{
          transform: 'translate(4px, 4px) rotate(2deg)',
          background: isThemed ? theme.cardBgAlt : '#e5e7eb',
          border: isThemed ? `1px solid ${theme.accent}30` : '1px solid #d1d5db'
        }}
      />
      <div
        className="absolute w-28 h-36 rounded-xl"
        style={{
          transform: 'translate(2px, 2px) rotate(0.5deg)',
          background: isThemed ? theme.cardBgAlt : '#e5e7eb',
          border: isThemed ? `1px solid ${theme.accent}30` : '1px solid #d1d5db'
        }}
      />
      {/* Top card */}
      <div
        className="relative w-28 h-36 rounded-xl border-2 overflow-hidden"
        style={{
          background: isThemed ? theme.cardBg : '#f3f4f6',
          borderColor: isThemed ? `${theme.accent}30` : '#e5e7eb'
        }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <div className="w-8 h-8 rounded-full" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }} />
          <div className="w-14 h-2 rounded" style={{ background: isThemed ? `${theme.accent}20` : '#e5e7eb' }} />
        </div>
      </div>
    </motion.div>
  )
}

// Section header with collapsible content
function SectionHeader({ section, isExpanded, onToggle, deckCount }) {
  return (
    <motion.button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-white/50 hover:bg-white/80 rounded-xl border border-gray-200 transition-colors group"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-800">{section.name}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{deckCount} topics</span>
      </div>
      <motion.span
        className="text-gray-400 text-xl"
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        ▼
      </motion.span>
    </motion.button>
  )
}

// Sectioned decks display for Level 1 categories
function SectionedDecks({ sections, onOpenDeck, claimedCards, parentGradient, parentBorderColor, rootCategoryId }) {
  const [expandedSections, setExpandedSections] = useState(() => {
    // Start with first section expanded
    return { 0: true }
  })

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl">
      {sections.sections.map((section, sectionIndex) => (
        <div key={section.name} className="flex flex-col gap-3">
          <SectionHeader
            section={section}
            isExpanded={expandedSections[sectionIndex]}
            onToggle={() => toggleSection(sectionIndex)}
            deckCount={section.subDecks.length}
          />

          <AnimatePresence>
            {expandedSections[sectionIndex] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 flex-wrap justify-start pl-4 py-2">
                  {section.subDecks.map((subDeck, deckIndex) => (
                    <motion.div
                      key={subDeck.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: deckIndex * 0.03 }}
                    >
                      <Deck
                        deck={{
                          ...subDeck,
                          gradient: parentGradient,
                          borderColor: parentBorderColor,
                          level: 2,
                        }}
                        onOpen={onOpenDeck}
                        claimed={claimedCards.has(subDeck.id)}
                        rootCategoryId={rootCategoryId}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// Cover card - shown at top of topic view after preview is claimed
function CoverCard({ title, preview, claimed, onRead, rootCategoryId }) {
  const theme = getCategoryTheme(rootCategoryId)
  const isThemed = hasCustomTheme(rootCategoryId)
  const cardStyles = getOverviewCardStyles(rootCategoryId, theme, claimed, '#fafbfc')

  // Get text colors based on theme
  const textPrimary = isThemed ? theme.textPrimary : '#1f2937'
  const checkBg = isThemed ? theme.accent : '#6b7280'
  const checkText = rootCategoryId === 'technology' ? 'text-slate-900' : (rootCategoryId === 'philosophy' ? 'text-indigo-900' : 'text-white')

  return (
    <motion.div
      className="relative w-28 h-36 rounded-xl cursor-pointer flex flex-col items-center justify-center p-3 overflow-hidden"
      style={cardStyles}
      onClick={onRead}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Decorations */}
      {renderOverviewCardDecorations(rootCategoryId, theme)}

      {/* Claimed badge - top right */}
      {claimed && (
        <div
          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center z-20"
          style={{ background: checkBg }}
        >
          <span className={`${checkText} text-[10px] font-bold`}>✓</span>
        </div>
      )}

      {/* Content */}
      <span className="text-xs font-semibold text-center leading-tight px-1 relative z-10" style={{ color: textPrimary }}>
        {toTitleCase(title)}
      </span>
    </motion.div>
  )
}

// The spread - overview cards + sub-decks laid out in a grid (now with tiered cards)
function DeckSpread({
  deck,
  overviewCards,
  childDecks,
  onOpenDeck,
  onReadCard,
  claimedCards,
  isLoading,
  isLoadingChildren,
  isLoadingSections,
  skeletonCount,
  isLeaf,
  isArticle, // Whether this deck should have learning cards (vs just being a category)
  onClaimCategory, // Handler for claiming category cards
  // Tier-related props
  tierCards,
  tierCompletion,
  onUnlockTier,
  unlockingTier,
  // Section-related props (for Level 1)
  sections,
  // Progress for card generation
  generationProgress,
  // Root category for theming
  rootCategoryId,
  // Preview/cover card
  previewCard,
  onReadPreviewCard,
  // Outline for toggle display
  outline
}) {
  // State for outline toggle
  const [showOutline, setShowOutline] = useState(false)

  // Detect if this is a new two-tier outline or legacy three-tier
  const isNewTwoTierSystem = outline?.deep_dive && !outline?.deep_dive_1

  // Tier metadata - dynamically based on outline type
  const tiers = isNewTwoTierSystem
    ? [
        { key: 'core', name: 'Core' },
        { key: 'deep_dive', name: 'Deep Dive' },
      ]
    : [
        { key: 'core', name: 'Core Essentials' },
        { key: 'deep_dive_1', name: 'Deep Dive 1' },
        { key: 'deep_dive_2', name: 'Deep Dive 2' },
      ]

  // Check if we have tier data (new system) or legacy data
  const hasTierData = tierCards && (tierCards.core?.length > 0 || tierCards.deep_dive?.length > 0 || tierCards.deep_dive_1?.length > 0 || tierCards.deep_dive_2?.length > 0)

  return (
    <motion.div
      className="flex flex-col items-center gap-8 pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Deck title - only show for articles, categories show in card */}
      {isArticle && (
        <span className="text-sm font-semibold text-gray-700">{deck.name}</span>
      )}

      {/* Cover/Preview card - shows at top if claimed */}
      {isArticle && previewCard && previewCard.claimed && (
        <CoverCard
          title={deck.name}
          preview={previewCard.content}
          claimed={true}
          onRead={onReadPreviewCard}
          rootCategoryId={rootCategoryId}
        />
      )}

      {/* Outline toggle - only show when we have an outline and cards */}
      {isArticle && outline && hasTierData && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowOutline(!showOutline)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors mx-auto"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showOutline ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showOutline ? 'Hide outline' : 'Show outline'}
          </button>

          {/* Collapsible outline display */}
          <AnimatePresence>
            {showOutline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
                  {outline.topic_type && (
                    <div className="mb-3 text-xs text-gray-400 uppercase tracking-wide">
                      {outline.topic_type}
                    </div>
                  )}

                  {/* Core */}
                  {outline.core && outline.core.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Core ({outline.core.length} cards)</div>
                      <ul className="space-y-1">
                        {outline.core.map((card, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            <span className="font-medium">{card.title}</span>
                            {card.concept && (
                              <span className="text-gray-400 ml-1">— {card.concept}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Deep Dive (new two-tier system) */}
                  {outline.deep_dive && outline.deep_dive.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">Deep Dive ({outline.deep_dive.length} cards)</div>
                      <ul className="space-y-1">
                        {outline.deep_dive.map((card, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            <span className="font-medium">{card.title}</span>
                            {card.concept && (
                              <span className="text-gray-400 ml-1">— {card.concept}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Legacy: Deep Dive 1 (for old outlines) */}
                  {outline.deep_dive_1 && outline.deep_dive_1.length > 0 && !outline.deep_dive && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-600 mb-2">Deep Dive 1</div>
                      <ul className="space-y-1">
                        {outline.deep_dive_1.map((card, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            <span className="font-medium">{card.title}</span>
                            {card.concept && (
                              <span className="text-gray-400 ml-1">— {card.concept}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Legacy: Deep Dive 2 (for old outlines) */}
                  {outline.deep_dive_2 && outline.deep_dive_2.length > 0 && !outline.deep_dive && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-2">Deep Dive 2</div>
                      <ul className="space-y-1">
                        {outline.deep_dive_2.map((card, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            <span className="font-medium">{card.title}</span>
                            {card.concept && (
                              <span className="text-gray-400 ml-1">— {card.concept}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Category card - for non-article nodes (categories with children) */}
      {!isArticle && (
        <CategoryCard
          deck={deck}
          tint={getCardTint(deck.gradient)}
          rootCategoryId={rootCategoryId}
        />
      )}

      {/* Loading state - show progress while generating all 15 cards */}
      {isArticle && isLoading && !hasTierData && (
        <div className="flex flex-col items-center gap-6 py-12">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
          </div>

          {/* Progress text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700 mb-1">
              Creating your learning cards...
            </p>
            <p className="text-sm text-gray-500">
              Generating 15 high-quality educational cards
            </p>
          </div>

          {/* Fake progress bar that fills over ~8 seconds */}
          <div className="w-64">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '95%' }}
                transition={{ duration: 8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              This takes about 5-8 seconds
            </p>
          </div>
        </div>
      )}

      {/* NEW: Tiered card display - shows progressively as tiers complete (only for articles) */}
      {isArticle && hasTierData && (
        <div className="flex flex-col items-center gap-10 w-full">
          {tiers.map((tier, tierIndex) => {
            const cards = tierCards[tier.key] || []
            const completion = tierCompletion[tier.key] || { claimed: 0, total: 0 }
            const prevTier = tierIndex > 0 ? tiers[tierIndex - 1] : null
            const prevComplete = prevTier ? tierCompletion[prevTier.key]?.complete : true
            const isLocked = !prevComplete

            // Hide Deep Dive 2 entirely until Deep Dive 1 is complete
            if (tier.key === 'deep_dive_2' && !tierCompletion.deep_dive_1?.complete) {
              return null
            }

            // Calculate total cards across all tiers
            const allTierCards = (tierCards.core?.length || 0) + (tierCards.deep_dive_1?.length || 0) + (tierCards.deep_dive_2?.length || 0)

            return (
              <TierSection
                key={tier.key}
                tier={tier.key}
                tierName={tier.name}
                cards={cards}
                claimedCards={claimedCards}
                onReadCard={onReadCard}
                completion={completion}
                isLocked={isLocked}
                onUnlock={() => onUnlockTier(tier.key)}
                isUnlocking={unlockingTier === tier.key}
                totalCards={allTierCards || 15}
                tint={getCardTint(deck.gradient)}
                rootCategoryId={rootCategoryId}
                outline={outline}
              />
            )
          })}
        </div>
      )}

      {/* LEGACY: Flat overview cards row (for backward compatibility, only for articles) */}
      {isArticle && !isLoading && !hasTierData && overviewCards.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2 flex-wrap justify-center">
            {overviewCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <OverviewCard
                  card={card}
                  index={index}
                  total={15}
                  claimed={claimedCards.has(card.id)}
                  onClaim={() => {}}
                  onRead={onReadCard}
                  tint={getCardTint(deck.gradient)}
                  rootCategoryId={rootCategoryId}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state for sub-decks */}
      {isLoadingChildren && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Loading sub-topics...</span>
          <div className="flex gap-2 flex-wrap justify-center max-w-4xl">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonDeck key={`skeleton-deck-${index}`} index={index} rootCategoryId={rootCategoryId} />
            ))}
          </div>
        </div>
      )}

      {/* Loading sections indicator */}
      {isLoadingSections && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Loading topics...</span>
          <div className="flex gap-2 flex-wrap justify-center max-w-4xl">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonDeck key={`skeleton-section-${index}`} index={index} rootCategoryId={rootCategoryId} />
            ))}
          </div>
        </div>
      )}

      {/* Sectioned sub-decks (for Level 1 with Wikipedia sections) */}
      {!isLoadingSections && sections && (
        <div id="explore-section" className="flex flex-col items-center gap-3 w-full">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Explore by Topic</span>
          <SectionedDecks
            sections={sections}
            onOpenDeck={onOpenDeck}
            claimedCards={claimedCards}
            parentGradient={deck.gradient}
            parentBorderColor={deck.borderColor}
            rootCategoryId={rootCategoryId}
          />
        </div>
      )}

      {/* Sub-decks grid (for non-sectioned decks) */}
      {!isLoadingChildren && !sections && childDecks.length > 0 && (
        <div id="explore-section" className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Explore</span>
          <div className="flex gap-2 flex-wrap justify-center max-w-4xl">
            {childDecks.map((childDeck, index) => (
              <motion.div
                key={childDeck.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 + (isLoading ? 0 : 0.15) }}
              >
                <Deck
                  deck={childDeck}
                  onOpen={onOpenDeck}
                  claimed={claimedCards.has(childDeck.id)}
                  rootCategoryId={rootCategoryId}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Leaf indicator - show when deck has no sub-decks */}
      {!isLoading && !isLoadingChildren && isLeaf && (overviewCards.length > 0 || hasTierData) && (
        <motion.div
          className="flex flex-col items-center gap-2 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full border border-amber-200">
            <span className="text-amber-600">🍂</span>
            <span className="text-sm text-amber-700 font-medium">You've reached the deepest level</span>
          </div>
          <p className="text-xs text-gray-400">Try exploring other branches to discover more</p>
        </motion.div>
      )}

    </motion.div>
  )
}

// Search bar component with fuzzy search
function SearchBar({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const topicCount = getSearchableTopicCount()

  // Search as user types
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const matches = searchTopics(query, 10)
    setResults(matches)
    setSelectedIndex(0)
    setShowResults(true)
  }, [query])

  // Highlight matching text in results
  const highlightMatch = (text, query) => {
    if (!query || query.length < 2) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark> : part
    )
  }

  // Handle result selection
  const handleResultClick = (result) => {
    console.log('[SEARCH] Selected:', result.title)
    onNavigate(result)
    setQuery('')
    setShowResults(false)
    setResults([])
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowResults(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${topicCount.toLocaleString()} topics...`}
          className="
            w-full pl-12 pr-4 py-3
            text-base
            bg-white
            border-2 border-gray-200
            rounded-full
            shadow-sm
            outline-none
            transition-all duration-200
            focus:border-indigo-400 focus:shadow-md
            placeholder:text-gray-400
          "
        />
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full left-0 right-0
              mt-2 bg-white
              rounded-xl
              shadow-xl
              border border-gray-200
              max-h-96 overflow-y-auto
              z-50
            "
          >
            {/* Results count header */}
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <span className="text-sm text-gray-500">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Result items */}
            {results.map((result, index) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                className={`
                  px-4 py-3 cursor-pointer
                  border-b border-gray-50 last:border-b-0
                  transition-colors duration-100
                  ${index === selectedIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                `}
              >
                <div className="font-semibold text-gray-800 mb-1">
                  {highlightMatch(result.title, query)}
                </div>
                {result.path.length > 0 && (
                  <div className="text-sm text-gray-500 truncate">
                    {result.path.join(' → ')}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint when only 1 character typed */}
      <AnimatePresence>
        {query.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="
              absolute top-full left-0 right-0
              mt-2 bg-white
              rounded-xl
              shadow-md
              border border-gray-200
              px-4 py-3
              text-center
              z-50
            "
          >
            <p className="text-gray-500 text-sm">Type one more character to search...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      <AnimatePresence>
        {showResults && query.length >= 2 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="
              absolute top-full left-0 right-0
              mt-2 bg-white
              rounded-xl
              shadow-xl
              border border-gray-200
              px-4 py-6
              text-center
              z-50
            "
          >
            <span className="text-3xl mb-2 block">🔍</span>
            <p className="text-gray-500">No topics found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Canvas() {
  // Auth state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  // Bottom nav state - 'learn' | 'cards' | 'study' | 'settings'
  const [activeTab, setActiveTab] = useState('learn')

  // Toast message for "Coming Soon" etc
  const [toastMessage, setToastMessage] = useState(null)

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // { uploaded, downloaded } or null

  // Listen for auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setAuthLoading(false)
    })

    // Subscribe to auth changes
    let hasSynced = false
    const unsubscribe = onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      if (event === 'SIGNED_IN' && session?.user && !hasSynced) {
        hasSynced = true
        setShowAuth(false)
        // Sync cards and flashcards when user signs in
        setIsSyncing(true)
        setSyncStatus(null)
        console.log('[Canvas] Starting sync...')
        try {
          const localData = getData()

          // Sync cards with timeout
          console.log('[Canvas] Syncing cards...')
          const cardsResult = await Promise.race([
            syncCards(localData, session.user),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Cards sync timeout')), 15000))
          ]).catch(err => ({ uploaded: 0, downloaded: 0, error: err }))
          console.log('[Canvas] Cards sync result:', cardsResult)

          // Sync flashcards with timeout
          console.log('[Canvas] Syncing flashcards...')
          const localFlashcards = getAllFlashcards()
          const flashcardsResult = await Promise.race([
            syncFlashcards(localFlashcards, session.user),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Flashcards sync timeout')), 15000))
          ]).catch(err => ({ uploaded: 0, downloaded: 0, merged: 0, error: err }))
          console.log('[Canvas] Flashcards sync result:', flashcardsResult)

          // Import any flashcards from remote
          if (flashcardsResult.flashcardsToImport?.length > 0) {
            importFlashcardsFromRemote(flashcardsResult.flashcardsToImport)
          }

          // Show combined sync status
          if (!cardsResult.error && !flashcardsResult.error) {
            const totalUploaded = (cardsResult.uploaded || 0) + (flashcardsResult.uploaded || 0)
            const totalDownloaded = (cardsResult.downloaded || 0) + (flashcardsResult.downloaded || 0)
            setSyncStatus({ uploaded: totalUploaded, downloaded: totalDownloaded })
            // Clear sync status after 3 seconds
            setTimeout(() => setSyncStatus(null), 3000)
          }
          console.log('[Canvas] Sync complete')
        } catch (err) {
          console.error('[Canvas] Sync error:', err)
        } finally {
          setIsSyncing(false)
        }
      }
    })

    return unsubscribe
  }, [])

  // Load claimed cards from localStorage on mount
  const [claimedCards, setClaimedCards] = useState(() => getClaimedCardIds())
  const [stack, setStack] = useState([]) // Array of deck IDs representing the stack
  const [expandedCard, setExpandedCard] = useState(null)
  const [expandedCardStartFlipped, setExpandedCardStartFlipped] = useState(false) // Whether card should start showing back
  const [expandedCardSlideDirection, setExpandedCardSlideDirection] = useState(0) // 1 = from right, -1 = from left
  const [generatedContent, setGeneratedContent] = useState({}) // cardId -> content (in-memory cache)
  const [generatedCards, setGeneratedCards] = useState({}) // deckId -> array of cards (in-memory cache)
  const [dynamicChildren, setDynamicChildren] = useState({}) // deckId -> array of child deck objects (in-memory cache)
  const [loadingDeck, setLoadingDeck] = useState(null) // deckId currently loading
  const [generationProgress, setGenerationProgress] = useState(null) // { current, total } for progress display
  const [loadingChildren, setLoadingChildren] = useState(null) // deckId currently loading children
  const [isWandering, setIsWandering] = useState(false) // True when wander navigation is in progress
  const [wanderMessage, setWanderMessage] = useState(null) // Message to show user (e.g., "All explored!")
  const [autoOpenCardId, setAutoOpenCardId] = useState(null) // Card to auto-open after wander navigation
  const [wanderPathSteps, setWanderPathSteps] = useState([]) // Path steps for wandering animation
  const [wanderCurrentStep, setWanderCurrentStep] = useState(0) // Current step being generated
  const [wanderComplete, setWanderComplete] = useState(false) // True when path generation is complete
  const [expandedCollectionCategory, setExpandedCollectionCategory] = useState(null) // For trophy case drawer
  const [selectedCollectionCard, setSelectedCollectionCard] = useState(null) // For trophy case card detail
  const [selectedCollectionTopic, setSelectedCollectionTopic] = useState(null) // For topic card view { id, name, cards, ... }

  // Tier-related state
  const [tierCards, setTierCards] = useState({}) // deckId -> { core: [], deep_dive_1: [], deep_dive_2: [] }
  const [unlockingTier, setUnlockingTier] = useState(null) // tier currently being unlocked/generated
  const [showCelebration, setShowCelebration] = useState(null) // { tierName, nextTierName } or null
  const [lastCompletedTier, setLastCompletedTier] = useState({}) // deckId -> last tier shown celebration for
  const [backgroundGenerating, setBackgroundGenerating] = useState({}) // deckId -> { tier: 'deep_dive_1' | 'deep_dive_2', promise: Promise }

  // Preview card state (shown before committing to a topic)
  const [showPreviewCard, setShowPreviewCard] = useState(null) // { deckId, title, preview, isLoading } or null
  const [previewCards, setPreviewCards] = useState({}) // deckId -> { preview, claimed }
  const [loadedOutlines, setLoadedOutlines] = useState({}) // deckId -> outline object

  // Track in-flight outline generation promises (to avoid duplicate requests)
  const outlinePromisesRef = useRef({}) // deckId -> Promise<outline>

  // Section-based Level 2 data (from Wikipedia)
  const [sectionData, setSectionData] = useState({}) // categoryId -> { sections: [...] }
  const [loadingSections, setLoadingSections] = useState(null) // categoryId currently loading sections

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Handle full reset
  const handleReset = () => {
    clearAllData()
    // Reset all in-memory state
    setClaimedCards(new Set())
    setStack([])
    setExpandedCard(null)
    setGeneratedContent({})
    setGeneratedCards({})
    setDynamicChildren({})
    setTierCards({})
    setLastCompletedTier({})
    setSectionData({})
    setShowResetConfirm(false)
  }

  // Claim a card and persist to localStorage
  const handleClaim = (cardId) => {
    claimCard(cardId)  // Persist to localStorage
    setClaimedCards(prev => new Set([...prev, cardId]))
    // Don't close the modal, let user see the claimed state

    // Generate flashcards in background (Option C from spec)
    const cardContent = generatedContent[cardId] || getCardContent(cardId)
    console.log(`[handleClaim] Card ${cardId} claimed. Has content: ${!!cardContent}`)

    if (cardContent) {
      // Check if already generated
      const data = getData()
      const alreadyGenerated = data.flashcardMeta?.generatedFromCards?.includes(cardId)
      if (alreadyGenerated) {
        console.log(`[handleClaim] Flashcards already generated for ${cardId}, skipping`)
        return
      }

      // Get card info from localStorage
      const cardData = data.cards?.[cardId]
      const cardTitle = cardData?.title || cardId

      // Generate flashcards asynchronously (don't await - fire and forget)
      console.log(`[handleClaim] Starting flashcard generation for ${cardId}`)
      generateFlashcardsInBackground(cardId, cardTitle, cardContent)
    } else {
      console.log(`[handleClaim] No content yet for ${cardId}, will generate when content loads`)
    }
  }

  // Background flashcard generation (non-blocking)
  const generateFlashcardsInBackground = async (cardId, cardTitle, cardContent) => {
    try {
      console.log(`[generateFlashcardsInBackground] Starting for ${cardId}`)
      const rawFlashcards = await generateFlashcardsFromCard(cardTitle, cardContent)

      // Transform to full flashcard objects - start as 'new' for Learn New mode
      const flashcards = rawFlashcards.map((fc, index) => ({
        id: `fc_${cardId}_${index}`,
        question: fc.question,
        answer: fc.answer,
        sourceCardId: cardId,
        sourceCardTitle: cardTitle,
        status: 'new',
        createdAt: new Date().toISOString()
      }))

      saveFlashcards(flashcards)
      markCardAsFlashcardGenerated(cardId)
      console.log(`[generateFlashcardsInBackground] ✅ Generated ${flashcards.length} flashcards for ${cardId}`)

      // Sync to Supabase if user is logged in
      if (user) {
        upsertFlashcardsRemote(flashcards, user.id).catch(err => {
          console.error('[generateFlashcardsInBackground] Failed to sync to remote:', err)
        })
      }
    } catch (error) {
      console.error(`[generateFlashcardsInBackground] Failed for ${cardId}:`, error)
    }
  }

  // Save generated content when a card is first flipped
  const handleContentGenerated = (cardId, content) => {
    saveCardContent(cardId, content)  // Persist to localStorage
    setGeneratedContent(prev => ({
      ...prev,
      [cardId]: content
    }))

    // If card is already claimed, generate flashcards now
    const data = getData()
    const cardData = data.cards?.[cardId]
    if (cardData?.claimed) {
      // Check if flashcards already generated for this card
      const alreadyGenerated = data.flashcardMeta?.generatedFromCards?.includes(cardId)
      if (!alreadyGenerated) {
        console.log(`[handleContentGenerated] Card ${cardId} is claimed, generating flashcards...`)
        const cardTitle = cardData?.title || cardId
        generateFlashcardsInBackground(cardId, cardTitle, content)
      }
    }
  }

  // Load or generate sub-decks for a deck (for level 2+ decks)
  const loadOrGenerateChildDecks = async (deck, parentPath) => {
    const deckLevel = deck.level || getDeckLevel(deck.id)

    // Vital articles are leaf nodes - they have no children
    if (deck.isLeaf || deck.source === 'vital-articles') {
      setDynamicChildren(prev => ({ ...prev, [deck.id]: [] }))
      return
    }

    // Check if already in memory
    if (dynamicChildren[deck.id] !== undefined) {
      // CRITICAL: Level 2 decks should NEVER have empty children in memory
      // If they do, it's from a previous error or bad generation - we need to regenerate
      if (deckLevel === 2 && dynamicChildren[deck.id].length === 0) {
        // Don't return - fall through to regeneration
      } else {
        return
      }
    }

    // Check vital articles tree for pre-built hierarchy (PRIORITY over hardcoded)
    const treeChildren = getTreeChildren(deck.id)

    if (treeChildren !== null) {
      if (treeChildren.length === 0) {
        // This is a leaf node in the tree
        setDynamicChildren(prev => ({ ...prev, [deck.id]: [] }))
        return
      }

      // Build deck objects from tree children
      const childDeckObjects = treeChildren.map(child => ({
        id: child.id,
        name: child.name,
        gradient: deck.gradient,
        borderColor: deck.borderColor,
        level: deckLevel + 1,
        isLeaf: child.isLeaf || false,
        wikiTitle: child.wikiTitle || null,
        children: [], // Will be populated when opened
        source: 'vital-tree',
      }))

      setDynamicChildren(prev => ({
        ...prev,
        [deck.id]: childDeckObjects
      }))
      return
    }

    // Check localStorage cache for previously generated children
    const cachedChildren = getDeckChildren(deck.id)
    if (cachedChildren !== null) {
      // CRITICAL FIX: Level 2 decks should NEVER be leaves - they're broad topics
      // If we have a cached empty array for Level 2, it's stale data that needs regeneration
      if (deckLevel === 2 && cachedChildren.length === 0) {
        // Clear the stale cache entry by marking it as not generated
        const data = getData()
        if (data.dynamicDecks && data.dynamicDecks[deck.id]) {
          data.dynamicDecks[deck.id].childrenGenerated = false
          data.dynamicDecks[deck.id].children = null
          saveData(data)
        }
        // Fall through to regeneration below
      } else {
        // Load from cache (null means not generated yet, [] means leaf, [items] means has children)
        const childDeckObjects = cachedChildren.map(child => ({
          id: child.id,
          name: child.name,
          gradient: deck.gradient,
          borderColor: deck.borderColor,
          level: deckLevel + 1,
          children: [], // Will be populated when opened
        }))
        setDynamicChildren(prev => ({
          ...prev,
          [deck.id]: childDeckObjects
        }))
        return
      }
    }

    // Generate new sub-decks via AI
    setLoadingChildren(deck.id)
    try {
      const userArchetype = getUserArchetype()
      const subDecks = await generateSubDecks(deck.name, parentPath, deckLevel, userArchetype)

      // CRITICAL: Level 2 decks should NEVER be leaves
      // If AI returned null/empty for Level 2, don't save - just skip and we'll retry next time
      if (deckLevel === 2 && (!subDecks || subDecks.length === 0)) {
        console.warn(`[loadOrGenerateChildDecks] Level 2 deck "${deck.name}" got no sub-decks from AI - NOT saving as leaf`)
        // Don't save to localStorage, don't update state - leave undefined so we retry
        return
      }

      // Save to localStorage
      saveDeckChildren(
        deck.id,
        deck.name,
        subDecks,
        parentPath,
        deckLevel,
        deck.gradient,
        deck.borderColor
      )

      // Update in-memory state
      const childDeckObjects = subDecks
        ? subDecks.map(child => ({
            id: child.id,
            name: child.name,
            gradient: deck.gradient,
            borderColor: deck.borderColor,
            level: deckLevel + 1,
            children: [], // Will be populated when opened
          }))
        : []

      setDynamicChildren(prev => ({
        ...prev,
        [deck.id]: childDeckObjects
      }))
    } catch (error) {
      console.error('Failed to generate sub-decks:', error)
      // For Level 2, don't mark as leaf on error - leave undefined so we can retry
      if (deckLevel !== 2) {
        setDynamicChildren(prev => ({
          ...prev,
          [deck.id]: []
        }))
      }
    } finally {
      setLoadingChildren(null)
    }
  }

  // Load or generate cards for a deck (now tier-aware)
  const loadOrGenerateCardsForDeck = async (deck, parentPath) => {
    console.log(`[loadOrGenerateCardsForDeck] Called for deck.id="${deck.id}", deck.name="${deck.name}"`)

    // Check if deck has hardcoded children property (categories like Health, Arts, etc.)
    const hasHardcodedChildren = deck.children && deck.children.length > 0

    // Check if this deck has children in the vital articles tree
    const treeChildren = getTreeChildren(deck.id)
    const hasTreeChildren = treeChildren && treeChildren.length > 0

    // Determine if this is an ARTICLE node (should have learning cards)
    // Article nodes are either:
    // 1. Wikipedia vital articles (have wikiTitle or source === 'vital-articles')
    // 2. Leaf nodes (no children - neither hardcoded nor tree children)
    const isArticleNode = deck.source === 'vital-articles' || deck.wikiTitle || deck.isLeaf || (!hasHardcodedChildren && !hasTreeChildren)

    // CATEGORY nodes (have children, not vital articles) should NOT generate cards
    // They only show the CategoryCard with stats
    if (!isArticleNode) {
      console.log(`[loadOrGenerateCardsForDeck] 📁 CATEGORY NODE: "${deck.name}" has children - skipping card generation`)
      return
    }

    console.log(`[loadOrGenerateCardsForDeck] 📄 ARTICLE NODE: "${deck.name}" - will generate 15 learning cards`)

    // Classify the topic type (PERSON, PLACE, EVENT, etc.) for better content generation
    // This runs in parallel with other checks - we'll use it when generating new content
    const topicTypePromise = classifyTopic(deck.name, parentPath)

    // Check if tier cards already in memory - content generated on-demand when flipped
    if (tierCards[deck.id]?.core?.length > 0) {
      return
    }

    // Check localStorage cache first - try tier-based storage
    const coreTierCards = getTierCards(deck.id, 'core')
    if (coreTierCards && coreTierCards.length > 0) {
      // Load from tier-based cache
      const deepDive1Cards = getTierCards(deck.id, 'deep_dive_1') || []
      const deepDive2Cards = getTierCards(deck.id, 'deep_dive_2') || []

      // Add content to cards
      const addContent = (cards) => cards.map(card => ({
        ...card,
        content: getCardContent(card.id) || null
      }))

      const coreWithContent = addContent(coreTierCards)
      const dd1WithContent = addContent(deepDive1Cards)
      const dd2WithContent = addContent(deepDive2Cards)

      setTierCards(prev => ({
        ...prev,
        [deck.id]: {
          core: coreWithContent,
          deep_dive_1: dd1WithContent,
          deep_dive_2: dd2WithContent
        }
      }))

      // Also populate content cache
      const allCards = [...coreWithContent, ...dd1WithContent, ...dd2WithContent]
      allCards.forEach(card => {
        if (card.content) {
          setGeneratedContent(prev => ({
            ...prev,
            [card.id]: card.content
          }))
        }
      })

      // Content is generated on-demand when user flips a card

      // Also populate legacy generatedCards for backward compatibility
      setGeneratedCards(prev => ({
        ...prev,
        [deck.id]: allCards
      }))
      return
    }

    // Check legacy cache (for backward compatibility with old data)
    const cachedCards = getDeckCards(deck.id)
    if (cachedCards && cachedCards.length > 0 && !cachedCards[0]?.tier) {
      // Old data without tiers - load as legacy
      const cardsWithContent = cachedCards.map(card => ({
        ...card,
        content: getCardContent(card.id) || null
      }))

      setGeneratedCards(prev => ({
        ...prev,
        [deck.id]: cardsWithContent
      }))

      cardsWithContent.forEach(card => {
        if (card.content) {
          setGeneratedContent(prev => ({
            ...prev,
            [card.id]: card.content
          }))
        }
      })

      // Content is generated on-demand when user flips a card
      return
    }

    // ========================================================================
    // SHARED MAP: Check Supabase for existing canonical cards first
    // ========================================================================
    setLoadingDeck(deck.id)
    setGenerationProgress({ current: 0, total: 5, phase: 'checking' })

    try {
      // Check if canonical cards already exist in Supabase
      const { data: canonicalCards, error: fetchError } = await getCanonicalCardsForTopic(deck.id)

      if (!fetchError && canonicalCards && canonicalCards.length > 0) {
        console.log(`[SHARED MAP] Found ${canonicalCards.length} canonical cards for "${deck.name}" in Supabase`)

        // Use the canonical cards from Supabase
        const coreCards = canonicalCards.filter(c => c.tier === 'core' || !c.tier).slice(0, 5)
        const dd1Cards = canonicalCards.filter(c => c.tier === 'deep_dive_1')
        const dd2Cards = canonicalCards.filter(c => c.tier === 'deep_dive_2')

        // Convert Supabase format to local format
        const convertCard = (card, index) => ({
          id: `${deck.id}-card-${card.card_number || index + 1}`,
          title: card.title,
          content: card.content,
          rarity: card.rarity || 'common',
          tier: card.tier || 'core',
          tierIndex: card.card_number ? card.card_number - 1 : index,
          number: card.card_number || index + 1,
          supabaseId: card.id // Keep reference to Supabase ID
        })

        const localCoreCards = coreCards.map((c, i) => convertCard(c, i))
        const localDD1Cards = dd1Cards.map((c, i) => convertCard(c, i))
        const localDD2Cards = dd2Cards.map((c, i) => convertCard(c, i))

        // Calculate expected total from all canonical cards
        const expectedTotal = canonicalCards.length

        // Save to localStorage for offline access
        localCoreCards.forEach(card => {
          saveStreamedCard(deck.id, deck.name, card, 'core', expectedTotal)
        })

        // Update UI state
        setTierCards(prev => ({
          ...prev,
          [deck.id]: {
            core: localCoreCards,
            deep_dive_1: localDD1Cards,
            deep_dive_2: localDD2Cards
          }
        }))

        setGeneratedCards(prev => ({
          ...prev,
          [deck.id]: [...localCoreCards, ...localDD1Cards, ...localDD2Cards]
        }))

        // Cache content
        const allLocalCards = [...localCoreCards, ...localDD1Cards, ...localDD2Cards]
        allLocalCards.forEach(card => {
          if (card.content) {
            setGeneratedContent(prev => ({
              ...prev,
              [card.id]: card.content
            }))
          }
        })

        setGenerationProgress({ current: 5, total: 5, phase: 'complete' })
        setLoadingDeck(null)
        return
      }

      console.log(`[SHARED MAP] No canonical cards found for "${deck.name}" - generating new cards`)
    } catch (supabaseError) {
      console.warn('[SHARED MAP] Could not check Supabase, falling back to generation:', supabaseError)
    }

    // ========================================================================
    // STREAMING GENERATION - Cards appear progressively as they're generated
    // User sees Card 1 in ~3 seconds, can start reading while others load
    // ========================================================================
    setGenerationProgress({ current: 0, total: 5, phase: 'generating' })

    // Track cards as they stream in
    const streamedCards = []

    // Get the topic type (should be ready by now since we started it early)
    const topicType = await topicTypePromise
    console.log(`[TOPIC TYPE] "${deck.name}" classified as: ${topicType}`)

    // Try to get outline for better card generation quality
    let outline = null
    try {
      outline = await getOutlineForTopic(deck.id)
      if (outline) {
        console.log(`[OUTLINE] Using pre-generated outline for: ${deck.name}`)
        // Store outline for UI display
        setLoadedOutlines(prev => ({ ...prev, [deck.id]: outline }))
      } else {
        console.log(`[OUTLINE] No outline available for: ${deck.name} - generating cards without outline`)
      }
    } catch (err) {
      console.warn(`[OUTLINE] Error fetching outline:`, err)
    }

    // Calculate expected total from outline if available
    const expectedTotalFromOutline = outline
      ? (outline.core?.length || 0) + (outline.deep_dive_1?.length || 0) + (outline.deep_dive_2?.length || 0)
      : null

    try {
      // Generate Core tier with streaming callback (and optional outline)
      const coreCards = await generateTierCards(
        deck.name,
        'core',
        [],
        parentPath,
        // Callback fired for each card as it arrives
        (card, cardNumber) => {
          // Save card immediately to localStorage (creates card entry + adds to cardsByTier)
          // Returns the generated cardId
          const cardId = saveStreamedCard(deck.id, deck.name, card, 'core', expectedTotalFromOutline)

          // Add cardId to the card object
          const cardWithId = { ...card, cardId }
          streamedCards.push(cardWithId)

          // Update progress
          setGenerationProgress({ current: cardNumber, total: 5, phase: 'generating' })

          // Update UI immediately so card appears
          setTierCards(prev => ({
            ...prev,
            [deck.id]: {
              core: [...streamedCards],
              deep_dive_1: prev[deck.id]?.deep_dive_1 || [],
              deep_dive_2: prev[deck.id]?.deep_dive_2 || []
            }
          }))

          // Update content cache
          setGeneratedContent(prev => ({
            ...prev,
            [card.id]: card.content
          }))

          // Update legacy state
          setGeneratedCards(prev => ({
            ...prev,
            [deck.id]: [...streamedCards]
          }))

          console.log(`[STREAM] Card ${cardNumber}/5 displayed: ${card.title}`)
        },
        outline // Pass outline for better card generation quality
      )

      console.log(`[loadOrGenerateCardsForDeck] ✅ Streamed Core tier for ${deck.name}`)

      // Cards are already saved incrementally by saveStreamedCard during streaming
      // No need to call saveDeckCards here (it would overwrite claimed status)

      // ========================================================================
      // SHARED MAP: Save newly generated cards to Supabase as canonical
      // ========================================================================
      console.log(`[SHARED MAP] Saving ${coreCards.length} cards to Supabase for "${deck.name}"`)
      for (let i = 0; i < coreCards.length; i++) {
        const card = coreCards[i]
        try {
          await upsertCanonicalCard({
            topic_id: deck.id,
            card_number: i + 1,
            title: card.title,
            content: card.content,
            rarity: card.rarity || 'common',
            tier: 'core'
          })
        } catch (err) {
          console.warn(`[SHARED MAP] Failed to save card ${i + 1} to Supabase:`, err)
        }
      }
      console.log(`[SHARED MAP] ✅ Saved canonical cards to Supabase`)

      setGenerationProgress({ current: 5, total: 5, phase: 'complete' })

      // Start background generation of Deep Dive
      // Use new 'deep_dive' tier if outline uses new two-tier system, otherwise 'deep_dive_1'
      const nextTier = outline?.deep_dive ? 'deep_dive' : 'deep_dive_1'
      setTimeout(() => {
        generateTierInBackground(deck, nextTier, coreCards, parentPath)
      }, 1000)

    } catch (error) {
      console.error('Failed to generate Core tier:', error)
    } finally {
      setLoadingDeck(null)
      setGenerationProgress(null)
    }
  }

  // Background generation for next tier (no UI updates until complete)
  // Returns a promise that resolves when generation is complete
  const generateTierInBackground = async (deck, tier, previousCards, parentPath) => {
    console.log(`[BACKGROUND] Starting ${tier} generation for ${deck.name}`)

    // Try to get outline for better quality
    let outline = null
    try {
      outline = await getOutlineForTopic(deck.id)
      if (outline) {
        console.log(`[BACKGROUND] Using outline for ${tier} generation`)
        // Store outline for UI display
        setLoadedOutlines(prev => ({ ...prev, [deck.id]: outline }))
      }
    } catch (err) {
      console.warn(`[BACKGROUND] Error fetching outline:`, err)
    }

    const generationPromise = (async () => {
      try {
        // Generate without streaming callback (just wait for all cards)
        const cards = await generateTierCards(deck.name, tier, previousCards, parentPath, null, outline)

        // Calculate expected total from outline if available (supports both tier systems)
        const expectedTotal = outline
          ? outline.deep_dive
            ? (outline.core?.length || 0) + (outline.deep_dive?.length || 0) // New two-tier
            : (outline.core?.length || 0) + (outline.deep_dive_1?.length || 0) + (outline.deep_dive_2?.length || 0) // Legacy three-tier
          : null

        // Save to localStorage
        saveDeckCards(deck.id, deck.name, cards, tier, expectedTotal)
        cards.forEach(card => {
          if (card.content) {
            saveCardContent(card.id, card.content)
          }
        })

        // Save to Supabase as canonical cards
        console.log(`[BACKGROUND] Saving ${cards.length} ${tier} cards to Supabase for "${deck.name}"`)
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i]
          try {
            await upsertCanonicalCard({
              topic_id: deck.id,
              card_number: (tier === 'deep_dive_1' ? 6 : 11) + i, // core: 1-5, dd1: 6-10, dd2: 11-15
              title: card.title,
              content: card.content,
              rarity: card.rarity || 'common',
              tier: tier
            })
          } catch (err) {
            console.warn(`[BACKGROUND] Failed to save ${tier} card ${i + 1} to Supabase:`, err)
          }
        }

        // Update state (cards ready but tier still locked)
        setTierCards(prev => ({
          ...prev,
          [deck.id]: {
            ...prev[deck.id],
            [tier]: cards
          }
        }))

        // Update content cache
        cards.forEach(card => {
          setGeneratedContent(prev => ({
            ...prev,
            [card.id]: card.content
          }))
        })

        console.log(`[BACKGROUND] ✅ ${tier} ready for ${deck.name}`)

        // Clear background tracking for this tier
        setBackgroundGenerating(prev => {
          const updated = { ...prev }
          if (updated[deck.id]?.tier === tier) {
            delete updated[deck.id]
          }
          return updated
        })

        // If DD1 just finished (legacy three-tier), start DD2
        // Note: New two-tier system uses 'deep_dive' which doesn't chain to anything
        if (tier === 'deep_dive_1') {
          const allPreviousCards = [...previousCards, ...cards]
          setTimeout(() => {
            generateTierInBackground(deck, 'deep_dive_2', allPreviousCards, parentPath)
          }, 500)
        }

        return cards
      } catch (error) {
        console.error(`[BACKGROUND] Failed to generate ${tier}:`, error)
        // Clear background tracking on error too
        setBackgroundGenerating(prev => {
          const updated = { ...prev }
          if (updated[deck.id]?.tier === tier) {
            delete updated[deck.id]
          }
          return updated
        })
        throw error
      }
    })()

    // Track this background generation
    setBackgroundGenerating(prev => ({
      ...prev,
      [deck.id]: { tier, promise: generationPromise }
    }))

    return generationPromise
  }

  // Generate cards for a specific tier (called when user unlocks Deep Dive tiers)
  // Uses streaming so cards appear one-by-one while generating
  const generateAndUnlockTier = async (deck, tier, parentPath) => {
    setUnlockingTier(tier)

    // Unlock the tier immediately so cards can display as they stream in
    unlockTier(deck.id, tier)

    try {
      // Collect full card data from previous tiers to avoid duplicate content
      let previousCards = []
      const existingTierCards = tierCards[deck.id] || {}

      if (tier === 'deep_dive' || tier === 'deep_dive_1') {
        // Deep Dive needs to know what Core covered
        previousCards = existingTierCards.core || []
      } else if (tier === 'deep_dive_2') {
        // DD2 (legacy) needs to know what Core AND DD1 covered
        const coreCards = existingTierCards.core || []
        const dd1Cards = existingTierCards.deep_dive_1 || []
        previousCards = [...coreCards, ...dd1Cards]
      }

      const streamedCards = []
      const tierOffset = tier === 'deep_dive' ? (existingTierCards.core?.length || 5) : (tier === 'deep_dive_1' ? 5 : 10)

      // Try to get outline for better quality
      let outline = null
      try {
        outline = await getOutlineForTopic(deck.id)
        if (outline) {
          console.log(`[UNLOCK] Using outline for ${tier} generation`)
          // Store outline for UI display
          setLoadedOutlines(prev => ({ ...prev, [deck.id]: outline }))
        }
      } catch (err) {
        console.warn(`[UNLOCK] Error fetching outline:`, err)
      }

      // Calculate expected total from outline if available (supports both tier systems)
      const expectedTotalForUnlock = outline
        ? outline.deep_dive
          ? (outline.core?.length || 0) + (outline.deep_dive?.length || 0) // New two-tier
          : (outline.core?.length || 0) + (outline.deep_dive_1?.length || 0) + (outline.deep_dive_2?.length || 0) // Legacy three-tier
        : null

      // Use streaming to show cards one-by-one
      const cards = await generateTierCards(
        deck.name,
        tier,
        previousCards,
        parentPath,
        // Streaming callback - called for each card as it completes
        (card, cardNumber) => {
          // Save card immediately to localStorage - returns the generated cardId
          const cardId = saveStreamedCard(deck.id, deck.name, card, tier, expectedTotalForUnlock)

          // Add cardId to the card object
          const cardWithId = { ...card, cardId }
          streamedCards.push(cardWithId)

          // Save content
          if (card.content) {
            saveCardContent(card.id, card.content)
          }

          // Update in-memory state with this card
          setTierCards(prev => ({
            ...prev,
            [deck.id]: {
              ...prev[deck.id],
              [tier]: [...streamedCards]
            }
          }))

          // Update content cache
          if (card.content) {
            setGeneratedContent(prev => ({
              ...prev,
              [card.id]: card.content
            }))
          }

          // Update generation progress
          setGenerationProgress({
            current: tierOffset + cardNumber,
            total: 15,
            phase: `Generating ${tier === 'deep_dive_1' ? 'Deep Dive 1' : 'Deep Dive 2'}`
          })

          console.log(`[STREAM] ${tier} card ${cardNumber}/5: ${card.title}`)
        },
        outline // Pass outline for better card generation quality
      )

      // Also update legacy generatedCards
      setGeneratedCards(prev => ({
        ...prev,
        [deck.id]: [...(prev[deck.id] || []), ...cards]
      }))

      console.log(`[generateAndUnlockTier] ✅ Streamed ${tier} for ${deck.name}`)

    } catch (error) {
      console.error(`Failed to generate ${tier} cards:`, error)
    } finally {
      setUnlockingTier(null)
      setGenerationProgress(null)
    }
  }

  // Handle tier unlock button click
  const handleUnlockTier = async (tier) => {
    if (!currentDeck) return

    // Check if background generation already completed this tier
    const existingTierCards = tierCards[currentDeck.id]?.[tier] || []

    if (existingTierCards.length === 5) {
      // Cards already generated in background - just unlock!
      console.log(`[UNLOCK] ${tier} already ready from background generation!`)
      unlockTier(currentDeck.id, tier)
      // Force re-render by updating state
      setTierCards(prev => ({ ...prev }))
      return
    }

    // Check if background generation is currently in progress for this tier
    const bgGen = backgroundGenerating[currentDeck.id]
    if (bgGen && bgGen.tier === tier) {
      // Background is still generating - wait for it instead of starting a new one
      console.log(`[UNLOCK] Waiting for background ${tier} generation to complete...`)
      setUnlockingTier(tier)
      try {
        await bgGen.promise
        // Background finished - unlock the tier
        console.log(`[UNLOCK] Background ${tier} finished, unlocking!`)
        unlockTier(currentDeck.id, tier)
        setTierCards(prev => ({ ...prev }))
      } catch (error) {
        console.error(`[UNLOCK] Background ${tier} failed, generating on demand...`)
        // Background failed, generate on demand with streaming
        generateAndUnlockTier(currentDeck, tier, parentPath)
      } finally {
        setUnlockingTier(null)
      }
      return
    }

    // No background generation - generate on demand with streaming
    console.log(`[UNLOCK] Generating ${tier} on demand (no background)...`)
    generateAndUnlockTier(currentDeck, tier, parentPath)
  }

  // Start background outline generation for a topic
  // Returns existing promise if already in flight, or starts new one
  const startOutlineGeneration = async (deckId, topicName, parentContext, previewText = null, topicType = null) => {
    // Check if we already have an in-flight promise
    if (outlinePromisesRef.current[deckId]) {
      console.log(`[OUTLINE] Already generating outline for: ${topicName}`)
      return outlinePromisesRef.current[deckId]
    }

    // Check if outline already exists in Supabase
    try {
      const { data: existingOutline, error } = await getOutline(deckId)
      if (!error && existingOutline && existingOutline.outline_json) {
        console.log(`[OUTLINE] Found existing outline for: ${topicName}`)
        return existingOutline.outline_json
      }
    } catch (err) {
      console.warn(`[OUTLINE] Error checking for existing outline:`, err)
    }

    // Start new generation
    console.log(`[OUTLINE] Starting background outline generation for: ${topicName}${previewText ? ' (with preview context)' : ''}${topicType ? ` [${topicType}]` : ''}`)
    const promise = (async () => {
      try {
        const { outline } = await generateTopicOutline(topicName, parentContext, previewText, topicType)

        // Add topicType to outline for future reference
        const outlineWithMeta = {
          ...outline,
          topic_type: topicType || null
        }

        // Save to Supabase
        try {
          await saveOutline(deckId, outlineWithMeta)
          console.log(`[OUTLINE] Saved outline to Supabase for: ${topicName}${topicType ? ` [${topicType}]` : ''}`)
        } catch (err) {
          console.warn(`[OUTLINE] Failed to save outline to Supabase:`, err)
        }

        return outline
      } catch (err) {
        console.error(`[OUTLINE] Failed to generate outline for: ${topicName}`, err)
        throw err
      } finally {
        // Clean up promise ref after completion
        delete outlinePromisesRef.current[deckId]
      }
    })()

    outlinePromisesRef.current[deckId] = promise
    return promise
  }

  // Get outline for a topic (from cache, in-flight, or Supabase)
  const getOutlineForTopic = async (deckId) => {
    // Check if there's an in-flight promise
    if (outlinePromisesRef.current[deckId]) {
      console.log(`[OUTLINE] Waiting for in-flight outline generation...`)
      try {
        return await outlinePromisesRef.current[deckId]
      } catch (err) {
        console.warn(`[OUTLINE] In-flight generation failed:`, err)
        return null
      }
    }

    // Check Supabase
    try {
      const { data: existingOutline, error } = await getOutline(deckId)
      if (!error && existingOutline && existingOutline.outline_json) {
        console.log(`[OUTLINE] Retrieved outline from Supabase`)
        return existingOutline.outline_json
      }
    } catch (err) {
      console.warn(`[OUTLINE] Error fetching outline:`, err)
    }

    return null
  }

  const openDeck = async (deck) => {
    // Check if this is a leaf topic that should show a preview card first
    const isLeafTopic = deck.isLeaf || deck.source === 'vital-articles' ||
      (getTreeNode(deck.id)?.children?.length === 0)

    if (isLeafTopic) {
      // Build parent path for context (used by both preview and outline)
      const parentPath = stackDecks.length > 0
        ? stackDecks.map(d => d.name).join(' > ')
        : null

      // Check if we already have the preview card locally
      const existingPreview = getPreviewCard(deck.id)
      if (existingPreview) {
        // Show existing preview
        setShowPreviewCard({
          deckId: deck.id,
          title: deck.name || deck.title,
          preview: existingPreview.content,
          cardId: existingPreview.cardId,
          isLoading: false,
          claimed: existingPreview.claimed
        })

        // [BACKGROUND OUTLINE] Start outline generation while user reads preview
        // Pass the preview content so outline knows what not to repeat
        startOutlineGeneration(deck.id, deck.name || deck.title, parentPath, existingPreview.content)
      } else {
        // Show loading state
        setShowPreviewCard({
          deckId: deck.id,
          title: deck.name || deck.title,
          preview: null,
          cardId: null,
          isLoading: true,
          claimed: false
        })

        try {
          // [SHARED MAP] Check Supabase first for existing preview
          const { data: remotePreview, error: fetchError } = await getPreviewCardRemote(deck.id)

          if (!fetchError && remotePreview && remotePreview.content) {
            console.log(`[SHARED MAP] Found preview card for "${deck.name || deck.title}" in Supabase`)

            // Save to local storage
            savePreviewCard(deck.id, deck.name || deck.title, remotePreview.content)

            // Get the saved card to get the cardId
            const savedPreview = getPreviewCard(deck.id)

            // Update state
            setShowPreviewCard(prev => prev?.deckId === deck.id ? {
              ...prev,
              preview: remotePreview.content,
              cardId: savedPreview?.cardId || null,
              isLoading: false
            } : prev)

            // [BACKGROUND OUTLINE] Start outline generation while user reads preview
            // Pass the preview content so outline knows what not to repeat
            startOutlineGeneration(deck.id, deck.name || deck.title, parentPath, remotePreview.content)
          } else {
            // No preview in Supabase, generate one
            console.log(`[SHARED MAP] No preview found for "${deck.name || deck.title}", generating...`)

            // Classify topic type for better preview generation
            const topicType = await classifyTopic(deck.name || deck.title, parentPath)
            console.log(`[PREVIEW] Topic "${deck.name || deck.title}" classified as: ${topicType}`)

            const { preview } = await generateTopicPreview(deck.name || deck.title, parentPath, topicType)

            // Save to local storage
            savePreviewCard(deck.id, deck.name || deck.title, preview)

            // [SHARED MAP] Save to Supabase
            try {
              await savePreviewCardRemote(deck.id, deck.name || deck.title, preview)
              console.log(`[SHARED MAP] Saved preview card for "${deck.name || deck.title}" to Supabase`)
            } catch (err) {
              console.warn(`[SHARED MAP] Failed to save preview to Supabase:`, err)
            }

            // Get the saved card to get the cardId
            const savedPreview = getPreviewCard(deck.id)

            // Update state
            setShowPreviewCard(prev => prev?.deckId === deck.id ? {
              ...prev,
              preview,
              cardId: savedPreview?.cardId || null,
              isLoading: false
            } : prev)

            // [BACKGROUND OUTLINE] Start outline generation while user reads preview
            // Pass the preview content and topic type so outline uses proper structure
            startOutlineGeneration(deck.id, deck.name || deck.title, parentPath, preview, topicType)
          }
        } catch (error) {
          console.error('Failed to generate preview:', error)
          // On error, just navigate directly
          setShowPreviewCard(null)
          setStack(prev => [...prev, deck.id])
        }
      }
    } else {
      // Not a leaf topic, navigate directly
      setStack(prev => [...prev, deck.id])
    }
  }

  const goBack = () => {
    setStack(prev => prev.slice(0, -1))
  }


  // Build navigation path from parentPath string to deck
  // Returns array of deck IDs to navigate through
  const buildNavigationPath = (parentPath, targetDeckId) => {
    if (!parentPath) {
      // No parent path means it's a Level 2 deck under a category
      // We need to find which category it belongs to
      const subcat = SUBCATEGORIES[targetDeckId]
      if (subcat) {
        // Find parent category
        const parentCat = CATEGORIES.find(c => c.children?.includes(targetDeckId))
        if (parentCat) {
          return [parentCat.id, targetDeckId]
        }
      }
      return [targetDeckId]
    }

    // Parse parentPath like "Arts > Literature > Poetry"
    const pathParts = parentPath.split(' > ')
    const path = []

    // Find the root category
    const rootName = pathParts[0]
    const rootCat = CATEGORIES.find(c => c.name === rootName)
    if (rootCat) {
      path.push(rootCat.id)
    }

    // For each subsequent part, find the deck ID
    for (let i = 1; i < pathParts.length; i++) {
      const partName = pathParts[i]
      // Check subcategories first
      const subcat = Object.values(SUBCATEGORIES).find(s => s.name === partName)
      if (subcat) {
        path.push(subcat.id)
        continue
      }
      // Check dynamic decks
      const dynamicDeck = getDynamicDeck(partName.toLowerCase().replace(/\s+/g, '-'))
      if (dynamicDeck) {
        path.push(dynamicDeck.id)
      }
    }

    // Add the target deck
    path.push(targetDeckId)

    return path
  }

  // Generate a new random path through the vital articles tree
  const generateWanderPath = async () => {
    // Get a random path from the tree (no AI calls needed!)
    const treePath = getRandomTreePath(3, 5)
    if (!treePath) {
      console.log('[Wander] Could not generate tree path')
      return null
    }

    console.log('[Wander] Generated tree path:', treePath.steps.map(s => s.name).join(' → '))

    // Animate through the path steps
    for (let i = 0; i < treePath.steps.length; i++) {
      setWanderPathSteps(treePath.steps.slice(0, i + 1))
      setWanderCurrentStep(i)
      // Small delay for visual effect between each step
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log('[Wander] Final destination:', treePath.destination.name)
    return {
      id: treePath.destination.id,
      name: treePath.destination.name,
      path: treePath.path,
      parentPath: treePath.steps.slice(0, -1).map(s => s.name).join(' > ') || null
    }
  }

  // Check if a deck is fully completed (all cards claimed)
  const isDeckFullyCompleted = (deckId) => {
    const deckCards = getDeckCards(deckId)
    if (!deckCards || deckCards.length === 0) return false // No cards = not completed, it's fresh
    return deckCards.every(card => claimedCards.has(card.id))
  }

  // Wander to a random destination - always generates fresh AI path with animation
  const handleWander = async () => {
    console.log('[Wander] Starting fresh journey...')

    // Reset wander state
    setIsWandering(true)
    setWanderMessage(null)
    setWanderPathSteps([])
    setWanderCurrentStep(0)
    setWanderComplete(false)

    try {
      // Retry up to 3 times if we land on a fully completed deck
      const MAX_ATTEMPTS = 3
      let attempt = 0
      let generated = null

      while (attempt < MAX_ATTEMPTS) {
        attempt++
        console.log(`[Wander] Generating path (attempt ${attempt}/${MAX_ATTEMPTS})...`)

        // Reset animation state for retry
        if (attempt > 1) {
          setWanderPathSteps([])
          setWanderCurrentStep(0)
        }

        generated = await generateWanderPath()

        if (generated) {
          // Check if destination is fully completed
          if (isDeckFullyCompleted(generated.id)) {
            console.log(`[Wander] Destination ${generated.id} is fully completed, retrying...`)
            generated = null // Try again
            continue
          }
          // Found a good destination with unclaimed content
          break
        }
      }

      if (generated) {
        setWanderComplete(true)
        // Brief pause to show completion animation
        await new Promise(resolve => setTimeout(resolve, 800))

        // DON'T navigate yet - just show the preview card
        // Store the path so "Explore" can navigate when user commits
        const existingPreview = getPreviewCard(generated.id)
        if (existingPreview) {
          // Show existing preview
          setShowPreviewCard({
            deckId: generated.id,
            title: generated.name,
            preview: existingPreview.content,
            cardId: existingPreview.cardId,
            isLoading: false,
            claimed: existingPreview.claimed,
            navigatePath: generated.path  // Store path for later navigation
          })

          // [BACKGROUND OUTLINE] Start outline generation while user reads preview
          startOutlineGeneration(generated.id, generated.name, generated.parentPath, existingPreview.content)
        } else {
          // Show loading state
          setShowPreviewCard({
            deckId: generated.id,
            title: generated.name,
            preview: null,
            cardId: null,
            isLoading: true,
            claimed: false,
            navigatePath: generated.path  // Store path for later navigation
          })

          try {
            // [SHARED MAP] Check Supabase first for existing preview
            const { data: remotePreview, error: fetchError } = await getPreviewCardRemote(generated.id)

            if (!fetchError && remotePreview && remotePreview.content) {
              console.log(`[SHARED MAP] Found preview card for "${generated.name}" in Supabase (wander)`)
              savePreviewCard(generated.id, generated.name, remotePreview.content)
              const savedPreview = getPreviewCard(generated.id)
              setShowPreviewCard(prev => prev?.deckId === generated.id ? {
                ...prev,
                preview: remotePreview.content,
                cardId: savedPreview?.cardId || null,
                isLoading: false
              } : prev)

              // [BACKGROUND OUTLINE] Start outline generation while user reads preview
              startOutlineGeneration(generated.id, generated.name, generated.parentPath, remotePreview.content)
            } else {
              // No preview in Supabase, generate one
              console.log(`[SHARED MAP] No preview found for "${generated.name}", generating... (wander)`)

              // Classify topic type for better preview generation
              const topicType = await classifyTopic(generated.name, generated.parentPath)
              console.log(`[PREVIEW] Topic "${generated.name}" classified as: ${topicType} (wander)`)

              const { preview } = await generateTopicPreview(generated.name, generated.parentPath, topicType)
              savePreviewCard(generated.id, generated.name, preview)

              // [SHARED MAP] Save to Supabase
              try {
                await savePreviewCardRemote(generated.id, generated.name, preview)
                console.log(`[SHARED MAP] Saved preview card for "${generated.name}" to Supabase (wander)`)
              } catch (err) {
                console.warn(`[SHARED MAP] Failed to save preview to Supabase (wander):`, err)
              }

              const savedPreview = getPreviewCard(generated.id)
              setShowPreviewCard(prev => prev?.deckId === generated.id ? {
                ...prev,
                preview,
                cardId: savedPreview?.cardId || null,
                isLoading: false
              } : prev)

              // [BACKGROUND OUTLINE] Start outline generation while user reads preview
              // Pass topic type for proper outline structure
              startOutlineGeneration(generated.id, generated.name, generated.parentPath, preview, topicType)
            }
          } catch (error) {
            console.error('Failed to generate preview after wander:', error)
            // On error, navigate directly
            setShowPreviewCard(null)
            setStack(generated.path)
          }
        }
      } else {
        setWanderMessage('Could not find new content. Try again!')
        setTimeout(() => setWanderMessage(null), 3000)
      }

      setIsWandering(false)
    } catch (error) {
      console.error('[Wander] Error:', error)
      setWanderMessage('Something went wrong. Try again!')
      setTimeout(() => setWanderMessage(null), 2000)
      setIsWandering(false)
    }
  }

  // Get full deck objects for the stack
  const stackDecks = stack.map(id => getDeck(id)).filter(Boolean)
  const currentDeck = stackDecks.length > 0 ? stackDecks[stackDecks.length - 1] : null

  // Handle search result navigation - builds stack from path
  const handleSearchNavigate = (result) => {
    console.log('[SEARCH] Navigating to:', result.title, 'via path:', result.pathIds)

    // Build the full navigation stack: pathIds + the result itself
    const fullStack = [...result.pathIds, result.id]
    console.log('[SEARCH] Setting stack to:', fullStack)

    // Set the stack to navigate there
    setStack(fullStack)
  }

  // Build parent path for context (e.g., "History > Ancient World")
  const parentPath = stackDecks.length > 1
    ? stackDecks.slice(0, -1).map(d => d.name).join(' > ')
    : null

  // Load or generate cards and children when entering any deck
  useEffect(() => {
    if (currentDeck) {
      loadOrGenerateCardsForDeck(currentDeck, parentPath)
      loadOrGenerateChildDecks(currentDeck, parentPath)
    }
  }, [currentDeck?.id])

  // Get overview cards - either from generated cards or empty while loading
  const overviewCards = currentDeck
    ? (generatedCards[currentDeck.id] || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      }))
    : []

  // Get child decks - from dynamicChildren (populated by loadOrGenerateChildDecks from tree)
  const getChildDecks = () => {
    if (!currentDeck) return []

    // dynamicChildren is populated from the vital articles tree by loadOrGenerateChildDecks
    // This is our primary (and only) source for child decks now
    const dynChildren = dynamicChildren[currentDeck.id]
    if (dynChildren && dynChildren.length > 0) {
      return dynChildren
    }

    // If dynamicChildren is empty array, it means this is a leaf node
    if (dynChildren !== undefined) {
      return []
    }

    // dynamicChildren is undefined - still loading from tree
    // Return empty array while loading (the UI will show a loading state)
    return []
  }

  // Get section data for current deck (only for Level 1, and only if tree doesn't have children)
  const getCurrentSections = () => {
    if (!currentDeck) return null
    const deckLevel = currentDeck.level || getDeckLevel(currentDeck.id)
    if (deckLevel !== 1) return null

    // NEW: If tree has children, don't use sections (accordion UI)
    const treeChildren = getTreeChildren(currentDeck.id)
    if (treeChildren && treeChildren.length > 0) return null

    return sectionData[currentDeck.id] || null
  }

  const childDecks = getChildDecks()
  const currentSections = getCurrentSections()
  const isLoading = loadingDeck === currentDeck?.id
  const isLoadingChildren = loadingChildren === currentDeck?.id
  const isLoadingSectionsState = loadingSections === currentDeck?.id

  // Determine if current deck is a leaf (no sub-decks)
  const isLeafDeck = () => {
    if (!currentDeck) return false

    // Vital articles are always leaves
    if (currentDeck.isLeaf || currentDeck.source === 'vital-articles') {
      return true
    }

    // Still loading children - not determined yet
    if (isLoadingChildren) return false
    // Has children - not a leaf
    if (childDecks.length > 0) return false

    const deckLevel = currentDeck.level || getDeckLevel(currentDeck.id)
    // Level 2 decks should NEVER be leaves - they're broad topics
    if (deckLevel <= 2) return false

    // Check if this deck has been processed (children generated)
    const dynamicDeckData = getDynamicDeck(currentDeck.id)
    if (dynamicDeckData?.childrenGenerated && dynamicDeckData?.children?.length === 0) {
      return true // Explicitly marked as leaf
    }
    // Check in-memory cache
    if (dynamicChildren[currentDeck.id] !== undefined && dynamicChildren[currentDeck.id].length === 0) {
      return true // Generated with no children
    }
    return false
  }
  const isLeaf = isLeafDeck()

  // Determine if current deck is an ARTICLE (should have learning cards)
  // Article nodes are: Wikipedia vital articles, leaf nodes, or nodes without children
  // Category nodes are: nodes with children that aren't vital articles
  const isArticleDeck = () => {
    if (!currentDeck) return false
    // Vital articles always have cards
    if (currentDeck.source === 'vital-articles' || currentDeck.wikiTitle) return true
    // Leaf nodes have cards
    if (currentDeck.isLeaf) return true
    // Check if deck itself has children property (hardcoded categories)
    if (currentDeck.children && currentDeck.children.length > 0) return false
    // Check if it has children in the tree
    const treeChildren = getTreeChildren(currentDeck.id)
    // If no children, it's an article
    if (!treeChildren || treeChildren.length === 0) return true
    // Has children = category node, no cards
    return false
  }
  const isArticle = isArticleDeck()

  // Auto-open card after wander navigation (when cards are loaded)
  useEffect(() => {
    if (autoOpenCardId && overviewCards.length > 0) {
      // Special marker: open the first UNCLAIMED card (used by Wander)
      if (autoOpenCardId === '__first_unclaimed__') {
        const firstUnclaimed = overviewCards.find(c => !claimedCards.has(c.id))
        const cardToOpen = firstUnclaimed || overviewCards[0] // Fallback to first if all claimed
        if (cardToOpen) {
          setTimeout(() => {
            setExpandedCard(cardToOpen.id)
            setAutoOpenCardId(null)
          }, 300)
        }
        return
      }

      // Check if the card we want to open is in the current deck
      const cardToOpen = overviewCards.find(c => c.id === autoOpenCardId)
      if (cardToOpen) {
        // Small delay for smooth animation after navigation
        setTimeout(() => {
          setExpandedCard(autoOpenCardId)
          setAutoOpenCardId(null)
        }, 300)
      } else {
        // Card not found - clear auto-open
        setAutoOpenCardId(null)
      }
    }
  }, [autoOpenCardId, overviewCards.length, claimedCards])

  // ONE-TIME CLEANUP: Clear all stale Level 2 leaf data on mount
  // This fixes the bug where Level 2 decks were incorrectly marked as leaves
  useEffect(() => {
    const data = getData()
    let needsSave = false

    // Get all Level 2 deck IDs from SUBCATEGORIES
    const level2DeckIds = Object.keys(SUBCATEGORIES)

    level2DeckIds.forEach(deckId => {
      const dynamicDeck = data.dynamicDecks?.[deckId]
      // If this Level 2 deck is marked as having no children, clear it
      if (dynamicDeck?.childrenGenerated && (!dynamicDeck.children || dynamicDeck.children.length === 0)) {
        console.log(`[Cleanup] Clearing stale leaf data for Level 2 deck: ${deckId}`)
        delete data.dynamicDecks[deckId]
        needsSave = true
      }
    })

    if (needsSave) {
      saveData(data)
      console.log('[Cleanup] Saved cleaned data to localStorage')
    }
  }, [])

  // DEBUG: Function to clear dynamic decks data (call from console: window.clearDynamicDecks())
  useEffect(() => {
    window.clearDynamicDecks = () => {
      const data = getData()
      data.dynamicDecks = {}
      saveData(data)
      console.log('Cleared dynamicDecks from localStorage')
      window.location.reload()
    }
  }, [])

  // Get skeleton count for loading state
  const skeletonCount = currentDeck ? getDeckCardCount(currentDeck) : DEFAULT_OVERVIEW_CARDS

  // Get tier completion data for current deck (recompute when claimedCards changes)
  const currentTierCompletion = useMemo(() => {
    if (!currentDeck) {
      return {
        core: { claimed: 0, total: 0, complete: false },
        deep_dive_1: { claimed: 0, total: 0, complete: false },
        deep_dive_2: { claimed: 0, total: 0, complete: false }
      }
    }
    // Force re-read from localStorage when claimedCards state changes
    return getDeckTierCompletion(currentDeck.id)
  }, [currentDeck?.id, claimedCards])

  // Get tier cards for current deck (merge with latest generated content)
  // Supports both new two-tier (deep_dive) and legacy three-tier (deep_dive_1, deep_dive_2)
  const currentTierCards = currentDeck ? (() => {
    const deckTierCards = tierCards[currentDeck.id] || { core: [], deep_dive: [], deep_dive_1: [], deep_dive_2: [] }
    // Merge in latest generated content for each card (handle partially loaded tiers)
    return {
      core: (deckTierCards.core || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      })),
      deep_dive: (deckTierCards.deep_dive || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      })),
      deep_dive_1: (deckTierCards.deep_dive_1 || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      })),
      deep_dive_2: (deckTierCards.deep_dive_2 || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      }))
    }
  })() : { core: [], deep_dive: [], deep_dive_1: [], deep_dive_2: [] }

  // Check for tier completion and show celebration
  useEffect(() => {
    if (!currentDeck) return

    const completion = getDeckTierCompletion(currentDeck.id)
    const lastCompleted = lastCompletedTier[currentDeck.id]

    // Debug logging
    console.log(`[CELEBRATION CHECK] deck=${currentDeck.id} core=${completion.core.claimed}/${completion.core.total} complete=${completion.core.complete} lastCompleted=${lastCompleted}`)

    // Detect if this deck uses new two-tier or legacy three-tier system
    const isNewTwoTier = !!(tierCards[currentDeck.id]?.deep_dive?.length > 0) || !!loadedOutlines[currentDeck.id]?.deep_dive

    // Check if core just completed
    if (completion.core.complete && lastCompleted !== 'core' && lastCompleted !== 'deep_dive' && lastCompleted !== 'deep_dive_1' && lastCompleted !== 'deep_dive_2') {
      setExpandedCard(null) // Close expanded card so only celebration shows
      setShowCelebration({
        tierName: 'Core',
        nextTierName: 'Deep Dive',
        tier: 'core'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'core' }))

      // Pre-generate Deep Dive content in background
      try {
        const deckTiers = tierCards[currentDeck.id] || {}
        // Use new deep_dive if available, otherwise fall back to deep_dive_1
        const ddCards = isNewTwoTier ? (deckTiers.deep_dive || []) : (deckTiers.deep_dive_1 || [])
        const allCards = isNewTwoTier
          ? [...(deckTiers.core || []), ...ddCards]
          : [...(deckTiers.core || []), ...ddCards, ...(deckTiers.deep_dive_2 || [])]
        console.log(`[BACKGROUND] Starting Deep Dive pre-generation for ${ddCards.length} cards`)
        ddCards.forEach(card => {
          if (card?.id && card?.number && card?.title && !getCardContent(card.id)) {
            generateSingleCardContent(currentDeck.name, card.number, card.title, allCards)
              .then(content => {
                saveCardContent(card.id, content)
                setGeneratedContent(prev => ({ ...prev, [card.id]: content }))
                console.log(`[BACKGROUND] Deep Dive content ready for card ${card.number}: ${card.title}`)
              })
              .catch(err => console.error(`[BACKGROUND] Failed Deep Dive card ${card?.number}:`, err))
          }
        })
      } catch (err) {
        console.error('[BACKGROUND] Deep Dive pre-generation error:', err)
      }
    }
    // Check if deep_dive_1 just completed
    else if (completion.deep_dive_1.complete && lastCompleted === 'core') {
      setExpandedCard(null) // Close expanded card so only celebration shows
      setShowCelebration({
        tierName: 'Deep Dive 1',
        nextTierName: 'Deep Dive 2',
        tier: 'deep_dive_1'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'deep_dive_1' }))

      // Pre-generate Deep Dive 2 content in background
      try {
        const deckTiers = tierCards[currentDeck.id] || {}
        const dd2Cards = deckTiers.deep_dive_2 || []
        const allCards = [...(deckTiers.core || []), ...(deckTiers.deep_dive_1 || []), ...dd2Cards]
        console.log(`[BACKGROUND] Starting DD2 pre-generation for ${dd2Cards.length} cards`)
        dd2Cards.forEach(card => {
          if (card?.id && card?.number && card?.title && !getCardContent(card.id)) {
            generateSingleCardContent(currentDeck.name, card.number, card.title, allCards)
              .then(content => {
                saveCardContent(card.id, content)
                setGeneratedContent(prev => ({ ...prev, [card.id]: content }))
                console.log(`[BACKGROUND] DD2 content ready for card ${card.number}: ${card.title}`)
              })
              .catch(err => console.error(`[BACKGROUND] Failed DD2 card ${card?.number}:`, err))
          }
        })
      } catch (err) {
        console.error('[BACKGROUND] DD2 pre-generation error:', err)
      }
    }
    // Check if deep_dive_2 just completed
    else if (completion.deep_dive_2.complete && lastCompleted === 'deep_dive_1') {
      setExpandedCard(null) // Close expanded card so only celebration shows
      setShowCelebration({
        tierName: 'Deep Dive 2',
        nextTierName: null,
        tier: 'deep_dive_2'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'deep_dive_2' }))
    }
  }, [claimedCards, currentDeck?.id, tierCards])

  // Load parent's children when celebration shows (for related topics)
  useEffect(() => {
    if (showCelebration && stackDecks.length > 1) {
      const parentDeck = stackDecks[stackDecks.length - 2]
      if (parentDeck && dynamicChildren[parentDeck.id] === undefined) {
        console.log('[CELEBRATION] Loading parent children for related topics:', parentDeck.name)
        loadOrGenerateChildDecks(parentDeck, stackDecks.slice(0, -2).map(d => d.name).join(' > ') || null)
      }
    }
  }, [showCelebration, stackDecks])

  // Find the expanded card data (check both tier cards and legacy cards)
  // Combine all tier cards (supports both new two-tier and legacy three-tier)
  const allCurrentCards = currentTierCards.core.length > 0
    ? [...currentTierCards.core, ...currentTierCards.deep_dive, ...currentTierCards.deep_dive_1, ...currentTierCards.deep_dive_2]
    : overviewCards
  // expandedCard can be either a card ID (string) or full card object (from Collections view)
  const expandedCardData = expandedCard
    ? (typeof expandedCard === 'object' ? expandedCard : allCurrentCards.find(c => c.id === expandedCard))
    : null
  const expandedCardIndex = expandedCardData
    ? allCurrentCards.findIndex(c => c.id === (typeof expandedCard === 'object' ? expandedCard.id : expandedCard))
    : -1

  // Toast message component (for "Coming Soon" etc)
  const ToastMessage = () => (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg text-sm"
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Wander message toast
  const WanderMessage = () => (
    <AnimatePresence>
      {wanderMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg text-sm"
        >
          {wanderMessage}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ============================================================================
  // STUDY SCREEN - Spaced Repetition Flashcard Review
  // ============================================================================

  // Flashcard Review Component with flip animation
  const FlashcardReview = ({ flashcard, isFlipped, onFlip, onRate, onSkip, onNext, onPrev, hasNext, hasPrev }) => (
    <div className="w-full max-w-sm mx-auto" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full h-80"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? -180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Question side (front) */}
        <div
          className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden' }}
          onClick={onFlip}
        >
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-800 text-center leading-relaxed">{flashcard.question}</p>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">Tap to flip</p>
        </div>

        {/* Answer side (back) */}
        <div
          className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          onClick={onFlip}
        >
          {/* Skip button */}
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-sm"
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-800 text-center leading-relaxed">{flashcard.answer}</p>
          </div>

          {/* Source topic */}
          <p className="text-xs text-gray-400 text-center mb-4">
            From: {flashcard.sourceCardTitle}
          </p>

          {/* Rating buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRate(0); }}
              className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Again
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRate(1); }}
              className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Hard
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRate(2); }}
              className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Good
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRate(3); }}
              className="py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Easy
            </button>
          </div>
        </div>
      </motion.div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-4 px-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasPrev
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasNext
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )

  // Confirmation Dialog Component
  const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
            >
              Remove
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Study Screen Hub - Shows study deck with hero card and topic list
  const StudyScreen = ({ onGoToLearn }) => {
    const [studyView, setStudyViewRaw] = useState('hub') // 'hub' | 'learnNew' | 'review' | 'complete' | 'addTopics'

    // Wrap setStudyView to log all view changes
    const setStudyView = (newView) => {
      console.log(`[StudyScreen] View changing: ${studyView} → ${newView}`, new Error().stack)
      setStudyViewRaw(newView)
    }
    const [studyDeck, setStudyDeck] = useState([])

    // Review mode state (learned cards)
    const [reviewCards, setReviewCards] = useState([])
    const [reviewIndex, setReviewIndex] = useState(0)
    const [nextReviewTime, setNextReviewTime] = useState(null)

    // Learn New mode state
    const [learningCards, setLearningCards] = useState([])
    const [currentBatch, setCurrentBatch] = useState([])
    const [batchNumber, setBatchNumber] = useState(1)
    const [batchIndex, setBatchIndex] = useState(0)
    const [completedInBatch, setCompletedInBatch] = useState(new Set())
    const [allCompletedCards, setAllCompletedCards] = useState([])
    const [showBatchComplete, setShowBatchComplete] = useState(false)
    const [showGraduateScreen, setShowGraduateScreen] = useState(false)
    const BATCH_SIZE = 5

    // Shared state
    const [isFlipped, setIsFlipped] = useState(false)
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
    const [showSkipConfirm, setShowSkipConfirm] = useState(false)
    const [availableTopics, setAvailableTopics] = useState({})
    const [generatingTopicId, setGeneratingTopicId] = useState(null)

    // Load data on mount and run migration
    useEffect(() => {
      console.log('[StudyScreen] Component MOUNTED')
      migrateToStudyDeck()
      refreshData()
      return () => console.log('[StudyScreen] Component UNMOUNTED')
    }, [])

    // Refresh data periodically to pick up background flashcard generation (only on hub)
    useEffect(() => {
      if (studyView === 'hub') {
        console.log('[StudyScreen] Starting 3s refresh interval (hub view)')
        const interval = setInterval(() => {
          console.log('[StudyScreen] Refresh interval tick')
          refreshData()
        }, 3000)
        return () => {
          console.log('[StudyScreen] Clearing refresh interval')
          clearInterval(interval)
        }
      }
    }, [studyView])

    // Refresh all data
    const refreshData = () => {
      const deck = getStudyDeck()
      const learning = getStudyDeckLearningCards()
      const review = getStudyDeckReviewDueCards()
      const nextTime = getNextLearnedReviewTime()
      const available = getAvailableStudyTopics()

      setStudyDeck(deck)
      setLearningCards(learning)
      setReviewCards(review)
      setNextReviewTime(nextTime)
      setAvailableTopics(available)
    }

    // ========== LEARN NEW MODE ==========

    // Start Learn New session
    const startLearning = () => {
      const cards = getStudyDeckLearningCards()
      if (cards.length > 0) {
        setLearningCards(cards)
        // Take first batch
        const firstBatch = cards.slice(0, BATCH_SIZE)
        setCurrentBatch(firstBatch)
        setBatchNumber(1)
        setBatchIndex(0)
        setCompletedInBatch(new Set())
        setAllCompletedCards([])
        setShowBatchComplete(false)
        setShowGraduateScreen(false)
        setIsFlipped(false)
        setStudyView('learnNew')
      }
    }

    // Handle Learn New: Again button (card stays in batch)
    const handleLearnAgain = () => {
      const currentCard = currentBatch[batchIndex]
      // Update again count
      updateLearningState(currentCard.id, {
        status: 'learning',
        againCount: (currentCard.againCount || 0) + 1
      })
      // Move card to end of batch
      setCurrentBatch(prev => {
        const newBatch = [...prev]
        const [card] = newBatch.splice(batchIndex, 1)
        newBatch.push({ ...card, againCount: (card.againCount || 0) + 1 })
        return newBatch
      })
      // If at end, wrap to start
      if (batchIndex >= currentBatch.length - 1) {
        setBatchIndex(0)
      }
      setIsFlipped(false)
    }

    // Handle Learn New: Good button (card done for this batch)
    const handleLearnGood = () => {
      const currentCard = currentBatch[batchIndex]
      const newCompleted = new Set(completedInBatch).add(currentCard.id)
      setCompletedInBatch(newCompleted)

      // Check if all cards in batch are done
      const remainingCards = currentBatch.filter(c => !newCompleted.has(c.id))
      if (remainingCards.length === 0) {
        // Batch complete!
        setAllCompletedCards(prev => [...prev, ...currentBatch])

        // Check if there are more cards to learn
        const nextBatchStart = batchNumber * BATCH_SIZE
        const remainingLearningCards = learningCards.slice(nextBatchStart)

        if (remainingLearningCards.length === 0) {
          // All cards done - show graduate screen
          setShowGraduateScreen(true)
        } else {
          // Show batch complete, offer next batch
          setShowBatchComplete(true)
        }
      } else {
        // Move to next card that isn't completed
        let nextIndex = (batchIndex + 1) % currentBatch.length
        while (newCompleted.has(currentBatch[nextIndex].id)) {
          nextIndex = (nextIndex + 1) % currentBatch.length
        }
        setBatchIndex(nextIndex)
        setIsFlipped(false)
      }
    }

    // Load next batch
    const loadNextBatch = () => {
      const nextBatchStart = batchNumber * BATCH_SIZE
      const nextBatch = learningCards.slice(nextBatchStart, nextBatchStart + BATCH_SIZE)
      if (nextBatch.length > 0) {
        setCurrentBatch(nextBatch)
        setBatchNumber(prev => prev + 1)
        setBatchIndex(0)
        setCompletedInBatch(new Set())
        setShowBatchComplete(false)
        setIsFlipped(false)
      }
    }

    // Graduate all completed cards
    const handleGraduate = () => {
      const idsToGraduate = allCompletedCards.map(c => c.id)
      graduateFlashcards(idsToGraduate)

      // Sync to Supabase if user is logged in
      if (user) {
        const graduatedCards = allCompletedCards.map(c => ({
          ...c,
          status: 'learned',
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          graduatedAt: new Date().toISOString()
        }))
        graduatedCards.forEach(card => {
          upsertFlashcardRemote(card, user.id).catch(err => {
            console.error('[StudyScreen] Failed to sync graduated card:', err)
          })
        })
      }

      setStudyView('complete')
      refreshData()
    }

    // ========== REVIEW MODE (Spaced Repetition) ==========

    // Start Review session
    const startReview = () => {
      const due = getStudyDeckReviewDueCards()
      if (due.length > 0) {
        setReviewCards(due)
        setReviewIndex(0)
        setIsFlipped(false)
        setStudyView('review')
      }
    }

    // Calculate interval preview for review buttons
    const getIntervalPreview = (rating, card) => {
      const { interval } = calculateSM2(
        rating,
        card.repetitions || 0,
        card.easeFactor || 2.5,
        card.interval || 1
      )
      if (interval === 1) return '1 day'
      if (interval < 7) return `${interval} days`
      if (interval < 30) return `${Math.round(interval / 7)} weeks`
      return `${Math.round(interval / 30)} months`
    }

    // Handle Review rating (Again/Good/Easy = 0/2/3)
    const handleReviewRate = (rating) => {
      const currentCard = reviewCards[reviewIndex]

      // Calculate new SM-2 values
      const { nextReview: newNextReview, interval, easeFactor, repetitions } = calculateSM2(
        rating,
        currentCard.repetitions || 0,
        currentCard.easeFactor || 2.5,
        currentCard.interval || 1
      )

      // Update flashcard in storage
      const updatedCard = {
        ...currentCard,
        nextReview: newNextReview,
        interval,
        easeFactor,
        repetitions,
        lastReviewedAt: new Date().toISOString()
      }
      updateFlashcard(currentCard.id, {
        nextReview: newNextReview,
        interval,
        easeFactor,
        repetitions,
        lastReviewedAt: new Date().toISOString()
      })

      // Sync to Supabase if user is logged in
      if (user) {
        upsertFlashcardRemote(updatedCard, user.id).catch(err => {
          console.error('[StudyScreen] Failed to sync flashcard to remote:', err)
        })
      }

      // If rating is 0 (Again), keep card in session at end
      if (rating === 0) {
        setReviewCards(prev => {
          const newCards = [...prev]
          const [card] = newCards.splice(reviewIndex, 1)
          newCards.push(card)
          return newCards
        })
        if (reviewIndex >= reviewCards.length - 1) {
          setReviewIndex(0)
        }
        setIsFlipped(false)
        return
      }

      // Good/Easy - remove card from pile
      setReviewCards(prev => prev.filter((_, i) => i !== reviewIndex))

      if (reviewIndex >= reviewCards.length - 1) {
        if (reviewCards.length <= 1) {
          setStudyView('complete')
          refreshData()
        } else {
          setReviewIndex(reviewCards.length - 2)
          setIsFlipped(false)
        }
      } else {
        setIsFlipped(false)
      }
    }

    // Handle skip flashcard (review mode)
    const handleSkipConfirm = () => {
      const currentCard = reviewCards[reviewIndex]
      skipFlashcard(currentCard.id)

      if (user) {
        const skippedCard = { ...currentCard, status: 'skipped' }
        upsertFlashcardRemote(skippedCard, user.id).catch(err => {
          console.error('[StudyScreen] Failed to sync skipped flashcard:', err)
        })
      }

      const newReviewCards = reviewCards.filter((_, i) => i !== reviewIndex)
      setShowSkipConfirm(false)

      if (newReviewCards.length === 0) {
        setStudyView('complete')
        refreshData()
      } else {
        setReviewCards(newReviewCards)
        if (reviewIndex >= newReviewCards.length) {
          setReviewIndex(newReviewCards.length - 1)
        }
        setIsFlipped(false)
      }
    }

    // Remove topic from study deck
    const handleRemoveTopic = (topicId) => {
      removeFromStudyDeck(topicId)
      setShowRemoveConfirm(null)
      refreshData()
    }

    // Add topic to study deck
    const handleAddTopic = (topicId) => {
      console.log('[StudyScreen] handleAddTopic called with:', topicId)
      addToStudyDeck(topicId)
      refreshData()
    }

    // Get topic info for display
    const getTopicInfo = (topicId) => {
      const treeNode = getTreeNode(topicId)
      const dynamicDeck = getDynamicDeck(topicId)
      const flashcardCount = getFlashcardCountForTopic(topicId)
      console.log(`[getTopicInfo] ${topicId} -> flashcardCount: ${flashcardCount}`)
      return {
        name: treeNode?.title || dynamicDeck?.name || topicId.split('-').pop(),
        flashcardCount
      }
    }

    // Generate flashcards for all claimed cards in a topic
    const handleGenerateForTopic = async (topicId) => {
      console.log(`[handleGenerateForTopic] Starting for topic: ${topicId}`)
      setGeneratingTopicId(topicId)

      try {
        // Get all claimed cards for this topic
        const data = getData()

        // Debug: log all cards for this topic
        const allCardsForTopic = Object.values(data.cards || {}).filter(
          card => card.deckId === topicId
        )
        console.log(`[handleGenerateForTopic] All cards for ${topicId}:`, allCardsForTopic.map(c => ({
          id: c.id,
          claimed: c.claimed,
          hasContent: !!c.content,
          title: c.title
        })))

        const claimedCards = Object.values(data.cards || {}).filter(
          card => card.claimed && card.deckId === topicId && card.content
        )

        console.log(`[handleGenerateForTopic] Found ${claimedCards.length} claimed cards WITH CONTENT for ${topicId}`)

        if (claimedCards.length === 0) {
          console.log('[handleGenerateForTopic] No claimed cards with content found')
          setGeneratingTopicId(null)
          return
        }

        // Generate flashcards for each card
        for (const card of claimedCards) {
          // Skip if already has flashcards
          if (data.flashcardMeta?.generatedFromCards?.includes(card.id)) {
            console.log(`[handleGenerateForTopic] Skipping ${card.id} - already generated`)
            continue
          }

          try {
            console.log(`[handleGenerateForTopic] Generating for ${card.id}`)
            const rawFlashcards = await generateFlashcardsFromCard(card.title, card.content)

            const flashcards = rawFlashcards.map((fc, index) => ({
              id: `fc_${card.id}_${index}`,
              question: fc.question,
              answer: fc.answer,
              sourceCardId: card.id,
              sourceCardTitle: card.title,
              status: 'new',
              createdAt: new Date().toISOString()
            }))

            saveFlashcards(flashcards)
            markCardAsFlashcardGenerated(card.id)

            // Sync to Supabase if user is logged in
            if (user) {
              upsertFlashcardsRemote(flashcards, user.id).catch(err => {
                console.error('[handleGenerateForTopic] Failed to sync to remote:', err)
              })
            }

            // Refresh to show progress
            refreshData()
          } catch (error) {
            console.error(`[handleGenerateForTopic] Failed for ${card.id}:`, error)
          }
        }

        console.log('[handleGenerateForTopic] Done!')
      } finally {
        setGeneratingTopicId(null)
        refreshData()
      }
    }

    // Review completion screen
    if (studyView === 'complete') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Review Complete!</h2>
          <p className="text-gray-600 mb-6">Great work on your study session</p>
          <button
            onClick={() => {
              refreshData()
              setStudyView('hub')
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Back to Study
          </button>
        </div>
      )
    }

    // Learn New mode (full screen)
    if (studyView === 'learnNew') {
      // Graduate screen
      if (showGraduateScreen) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">All Cards Practiced!</h2>
            <p className="text-gray-600 mb-2">{allCompletedCards.length} cards ready to graduate</p>
            <p className="text-sm text-gray-500 mb-6">
              Graduate moves cards to spaced repetition review
            </p>
            <div className="space-y-3 w-full max-w-xs">
              <button
                onClick={handleGraduate}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold transition-colors"
              >
                Graduate to Review
              </button>
              <button
                onClick={() => {
                  // Reset and practice again
                  setCurrentBatch(allCompletedCards.slice(0, BATCH_SIZE))
                  setBatchNumber(1)
                  setBatchIndex(0)
                  setCompletedInBatch(new Set())
                  setAllCompletedCards([])
                  setShowGraduateScreen(false)
                  setIsFlipped(false)
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-colors"
              >
                Keep Practicing
              </button>
            </div>
          </div>
        )
      }

      // Batch complete screen
      if (showBatchComplete) {
        const nextBatchStart = batchNumber * BATCH_SIZE
        const remainingCards = learningCards.slice(nextBatchStart)
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Batch {batchNumber} Complete!</h2>
            <p className="text-gray-600 mb-6">{currentBatch.length} cards learned</p>
            <div className="space-y-3 w-full max-w-xs">
              <button
                onClick={loadNextBatch}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold transition-colors"
              >
                Next {Math.min(BATCH_SIZE, remainingCards.length)} Cards
              </button>
              <p className="text-xs text-gray-500">
                {remainingCards.length} cards remaining
              </p>
            </div>
          </div>
        )
      }

      // Learning card view
      const currentCard = currentBatch[batchIndex]
      if (!currentCard) {
        console.warn('[LearnNew] No current card found. batchIndex:', batchIndex, 'currentBatch.length:', currentBatch.length, 'showBatchComplete:', showBatchComplete, 'showGraduateScreen:', showGraduateScreen)
        // Don't change view - just show loading state while state settles
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading...</p>
          </div>
        )
      }

      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => {
                setStudyView('hub')
                refreshData()
              }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Back
            </button>
            <span className="text-sm font-medium text-gray-500">
              Batch {batchNumber} • Card {batchIndex + 1}/{currentBatch.length}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 px-4 mb-4">
            {currentBatch.map((card, i) => (
              <div
                key={card.id}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  completedInBatch.has(card.id)
                    ? 'bg-green-500'
                    : i === batchIndex
                    ? 'bg-indigo-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Flashcard */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm mx-auto" style={{ perspective: '1000px' }}>
              <motion.div
                className="relative w-full h-80"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? -180 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Question side */}
                <div
                  className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
                  style={{ backfaceVisibility: 'hidden' }}
                  onClick={() => setIsFlipped(true)}
                >
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg text-gray-800 text-center leading-relaxed">{currentCard.question}</p>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">Tap to flip</p>
                </div>

                {/* Answer side */}
                <div
                  className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg text-gray-800 text-center leading-relaxed">{currentCard.answer}</p>
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-4">
                    From: {currentCard.sourceCardTitle}
                  </p>

                  {/* Learn buttons - Again / Good */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleLearnAgain}
                      className="py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Again
                      <span className="block text-xs font-normal opacity-80">see soon</span>
                    </button>
                    <button
                      onClick={handleLearnGood}
                      className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Good
                      <span className="block text-xs font-normal opacity-80">next card</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )
    }

    // Review mode (full screen) - Spaced Repetition
    if (studyView === 'review') {
      const currentCard = reviewCards[reviewIndex]
      if (!currentCard) {
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No cards to review</p>
          </div>
        )
      }

      return (
        <div className="flex flex-col h-full">
          {/* Header with progress */}
          <div className="flex justify-between items-center p-4">
            <button
              onClick={() => {
                setStudyView('hub')
                refreshData()
              }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Back
            </button>
            <span className="text-sm font-medium text-gray-500">
              {reviewIndex + 1} of {reviewCards.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="px-4 mb-4">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${((reviewIndex + 1) / reviewCards.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-sm mx-auto" style={{ perspective: '1000px' }}>
              <motion.div
                className="relative w-full h-80"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? -180 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Question side */}
                <div
                  className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
                  style={{ backfaceVisibility: 'hidden' }}
                  onClick={() => setIsFlipped(true)}
                >
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg text-gray-800 text-center leading-relaxed">{currentCard.question}</p>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">Tap to flip</p>
                </div>

                {/* Answer side */}
                <div
                  className="absolute inset-0 bg-white rounded-2xl shadow-lg p-6 flex flex-col"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {/* Skip button */}
                  <button
                    onClick={() => setShowSkipConfirm(true)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-sm"
                  >
                    ✕
                  </button>

                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg text-gray-800 text-center leading-relaxed">{currentCard.answer}</p>
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-4">
                    From: {currentCard.sourceCardTitle}
                  </p>

                  {/* Review buttons - Again / Good / Easy */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleReviewRate(0)}
                      className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Again
                      <span className="block text-xs font-normal opacity-80">{getIntervalPreview(0, currentCard)}</span>
                    </button>
                    <button
                      onClick={() => handleReviewRate(2)}
                      className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Good
                      <span className="block text-xs font-normal opacity-80">{getIntervalPreview(2, currentCard)}</span>
                    </button>
                    <button
                      onClick={() => handleReviewRate(3)}
                      className="py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Easy
                      <span className="block text-xs font-normal opacity-80">{getIntervalPreview(3, currentCard)}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Skip confirmation */}
          <ConfirmDialog
            isOpen={showSkipConfirm}
            title="Remove flashcard?"
            message="This will skip this flashcard from future reviews."
            onConfirm={handleSkipConfirm}
            onCancel={() => setShowSkipConfirm(false)}
          />
        </div>
      )
    }

    // Add Topics screen
    if (studyView === 'addTopics') {
      return (
        <div className="flex flex-col h-full overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button
              onClick={() => setStudyView('hub')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
            <span className="text-sm font-semibold text-gray-700">Add Topics</span>
            <div className="w-16" />
          </div>

          {/* Topics grouped by category */}
          <div className="flex-1 p-4 space-y-4">
            {Object.keys(availableTopics).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <h3 className="font-semibold text-gray-800 mb-1">No topics available</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Claim cards while learning to add topics here
                </p>
                <button
                  onClick={onGoToLearn}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Go to Learn →
                </button>
              </div>
            ) : (
              Object.entries(availableTopics).map(([categoryId, topics]) => {
                const categoryNode = getTreeNode(categoryId)
                const categoryName = categoryNode?.title || categoryId

                return (
                  <div key={categoryId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <h4 className="font-semibold text-gray-700">{categoryName}</h4>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {topics.map(topic => (
                        <div
                          key={topic.id}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex-1 mr-3">
                            <p className="text-gray-800 font-medium truncate">{topic.name}</p>
                            <p className="text-xs text-gray-500">
                              {topic.flashcardCount} flashcards • {topic.claimedCount} cards
                            </p>
                          </div>
                          {topic.inStudyDeck ? (
                            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700">
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddTopic(topic.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )
    }

    // Hub view (default) - Two mode hero cards
    return (
      <div className="flex flex-col h-full overflow-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-800 text-center">Study</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* Learn New Hero Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
            {learningCards.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Learn New</h3>
                    <p className="text-emerald-100 text-sm">Intensive practice</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold">{learningCards.length}</span>
                    <p className="text-emerald-100 text-xs">cards waiting</p>
                  </div>
                </div>
                <button
                  onClick={startLearning}
                  className="w-full bg-white text-emerald-600 py-3 rounded-xl font-semibold transition-colors hover:bg-emerald-50 shadow-md"
                >
                  Start Learning
                </button>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="text-3xl mb-2">✓</div>
                <h3 className="font-semibold mb-1">No new cards</h3>
                <p className="text-emerald-100 text-sm">
                  Add topics or wait for cards to graduate back
                </p>
              </div>
            )}
          </div>

          {/* Review Hero Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
            {reviewCards.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Review</h3>
                    <p className="text-indigo-100 text-sm">Spaced repetition</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-bold">{reviewCards.length}</span>
                    <p className="text-indigo-100 text-xs">cards due</p>
                  </div>
                </div>
                <button
                  onClick={startReview}
                  className="w-full bg-white text-indigo-600 py-3 rounded-xl font-semibold transition-colors hover:bg-indigo-50 shadow-md"
                >
                  Start Review
                </button>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="text-3xl mb-2">✨</div>
                <h3 className="font-semibold mb-1">No reviews due</h3>
                {nextReviewTime ? (
                  <p className="text-indigo-100 text-sm">
                    Next review in {formatTimeUntilReview(nextReviewTime)}
                  </p>
                ) : (
                  <p className="text-indigo-100 text-sm">
                    Graduate cards from Learn New to start
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Study Deck Section */}
        <div className="flex-1 p-4 pt-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              My Study Deck
            </h3>
            <span className="text-xs text-gray-400">{studyDeck.length} topics</span>
          </div>

          {studyDeck.length > 0 ? (
            <div className="space-y-2 mb-4">
              {studyDeck.map(topicId => {
                const info = getTopicInfo(topicId)
                const isGenerating = generatingTopicId === topicId
                return (
                  <div
                    key={topicId}
                    className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 mr-3">
                      <p className="font-medium text-gray-800 truncate">{info.name}</p>
                      <p className="text-xs text-gray-500">
                        {isGenerating ? 'Generating...' : `${info.flashcardCount} flashcards`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {info.flashcardCount === 0 && !isGenerating && (
                        <button
                          onClick={() => handleGenerateForTopic(topicId)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                        >
                          Generate
                        </button>
                      )}
                      {isGenerating && (
                        <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <button
                        onClick={() => setShowRemoveConfirm(topicId)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-6 text-center mb-4">
              <p className="text-gray-500 text-sm">
                No topics in your study deck yet
              </p>
            </div>
          )}

          {/* Add Topics Button */}
          <button
            onClick={() => setStudyView('addTopics')}
            className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Topics to Study
          </button>
        </div>

        {/* Remove topic confirmation */}
        <ConfirmDialog
          isOpen={showRemoveConfirm !== null}
          title="Remove from study deck?"
          message="This topic's flashcards won't appear in reviews until you add it back."
          onConfirm={() => handleRemoveTopic(showRemoveConfirm)}
          onCancel={() => setShowRemoveConfirm(null)}
        />
      </div>
    )
  }

  // Bottom navigation bar
  const BottomNav = () => (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white border-t border-gray-200 flex items-end justify-around px-2 h-16 relative">
        {/* Learn */}
        <button
          onClick={() => {
            setActiveTab('learn')
            // Always reset to root categories view
            setStack(['my-decks'])
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
            activeTab === 'learn' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-xs mt-1 font-medium">Learn</span>
        </button>

        {/* Cards */}
        <button
          onClick={() => {
            setActiveTab('cards')
            setStack(['collections'])
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
            activeTab === 'cards' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs mt-1 font-medium">Cards</span>
        </button>

        {/* Wander - spacer for center button */}
        <div className="flex-1" />

        {/* Study */}
        <button
          onClick={() => setActiveTab('study')}
          className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
            activeTab === 'study' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Study</span>
        </button>

        {/* Settings - placeholder */}
        <button
          onClick={() => {
            setToastMessage('Coming Soon!')
            setTimeout(() => setToastMessage(null), 2000)
          }}
          className="flex flex-col items-center justify-center flex-1 py-2 text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Settings</span>
        </button>
      </div>

      {/* Wander button - floating above nav bar */}
      <motion.button
        onClick={handleWander}
        disabled={isWandering}
        className={`
          absolute left-1/2 -translate-x-1/2 -top-8 w-16 h-16 rounded-full
          bg-gradient-to-br from-purple-400 via-purple-500 to-indigo-600
          text-white z-50
          flex items-center justify-center
          ${isWandering ? 'opacity-70' : ''}
        `}
        style={{
          boxShadow: isWandering
            ? '0 4px 15px rgba(139, 92, 246, 0.3)'
            : '0 8px 25px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3), inset 0 1px 1px rgba(255,255,255,0.3)'
        }}
        whileHover={isWandering ? {} : { scale: 1.08, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.6), 0 0 25px rgba(139, 92, 246, 0.4), inset 0 1px 1px rgba(255,255,255,0.3)' }}
        whileTap={isWandering ? {} : { scale: 0.95 }}
      >
        <span className="text-2xl">{isWandering ? '✨' : '🎲'}</span>
      </motion.button>
    </div>
  )

  // Check if we have sub-decks to explore
  const hasSubDecks = childDecks.length > 0 || (currentSections?.sections?.length > 0)

  // Show auth screen if requested
  if (showAuth) {
    return <Auth onSkip={() => setShowAuth(false)} />
  }

  // Study screen - spaced repetition flashcard review
  if (activeTab === 'study') {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto pb-24">
        <StudyScreen onGoToLearn={() => setActiveTab('learn')} />
        <BottomNav />
      </div>
    )
  }

  // Learn screen (default) - show all category decks with Continue Exploring
  if (stack.length === 0 || (stack.length === 1 && stack[0] === 'my-decks')) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
        {/* Top navigation bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            {/* User button / Sign In + Reset */}
            <div className="flex items-center gap-2">
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm hidden sm:inline">Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm('Reset all data? This cannot be undone.')) {
                    localStorage.clear()
                    window.location.reload()
                  }
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Reset
              </button>
            </div>
            <span className="font-semibold text-gray-800">Learn</span>
            <div className="bg-gray-100 rounded-full px-3 py-1">
              <span className="text-gray-500 text-xs">Cards: </span>
              <span className="text-gray-800 font-bold text-sm">{claimedCards.size}</span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="fixed top-12 left-0 right-0 z-30 pt-2 pb-2 px-4 bg-gradient-to-b from-gray-100 via-gray-100 to-transparent">
          <SearchBar onNavigate={handleSearchNavigate} />
        </div>

        {/* Sync status indicator */}
        <AnimatePresence>
          {(isSyncing || syncStatus) && (
            <motion.div
              className="fixed top-24 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-full px-4 py-2 shadow-lg border border-gray-200 text-sm flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {isSyncing ? (
                <>
                  <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Syncing...</span>
                </>
              ) : syncStatus && (
                <>
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    Synced {syncStatus.uploaded > 0 ? `${syncStatus.uploaded} cards` : 'up to date'}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-h-screen p-4 pt-32 pb-24">
          {(() => {
            const inProgressDecks = getInProgressDecks()
            return (
              <>
                {/* Continue Exploring section - shows in-progress topics */}
                <ContinueExploringSection
                  decks={inProgressDecks}
                  onOpenDeck={openDeck}
                />

                {/* Categories header - only show if there are in-progress decks */}
                {inProgressDecks.length > 0 && (
                  <h2 className="text-lg font-semibold text-slate-700 mb-3">Categories</h2>
                )}
              </>
            )
          })()}

          {/* Category grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((category) => (
              <Deck
                key={category.id}
                deck={category}
                claimed={claimedCards.has(category.id)}
                onOpen={openDeck}
              />
            ))}
          </div>
        </div>

        {/* Bottom navigation */}
        <BottomNav />
        <ToastMessage />
        <WanderMessage />

        {/* Wander card overlay - shows path animation then preview */}
        <AnimatePresence>
          {(isWandering || (showPreviewCard && showPreviewCard.navigatePath)) && wanderPathSteps.length > 0 && (
            <WanderCard
              pathSteps={wanderPathSteps}
              currentStep={wanderCurrentStep}
              isComplete={wanderComplete}
              previewData={showPreviewCard ? {
                title: showPreviewCard.title,
                preview: showPreviewCard.preview,
                isLoading: showPreviewCard.isLoading,
                claimed: showPreviewCard.claimed,
                cardId: showPreviewCard.cardId
              } : null}
              onClaim={() => {
                claimPreviewCard(showPreviewCard.deckId)
                setClaimedCards(getClaimedCardIds())
                setShowPreviewCard(prev => ({ ...prev, claimed: true }))
              }}
              onExplore={() => {
                if (showPreviewCard.navigatePath) {
                  setStack(showPreviewCard.navigatePath)
                  // Update lastInteracted so it shows in Continue Exploring
                  updateDeckLastInteracted(showPreviewCard.deckId)
                }
                setShowPreviewCard(null)
                setWanderPathSteps([])
              }}
              onWander={() => {
                setShowPreviewCard(null)
                setWanderPathSteps([])
                handleWander()
              }}
              onBack={() => {
                setShowPreviewCard(null)
                setWanderPathSteps([])
                setIsWandering(false)
              }}
              rootCategoryId={showPreviewCard?.navigatePath?.[0] || wanderPathSteps[0]?.id}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Collections screen - Trophy Case with Drawers (grouped by topic)
  if (stack.length === 1 && stack[0] === 'collections') {
    const cardsByCategoryAndDeck = getClaimedCardsByCategoryAndDeck()

    // Build category data with topic counts
    const categoriesWithTopics = CATEGORIES.filter(cat => {
      const decks = cardsByCategoryAndDeck[cat.id]
      return decks && Object.keys(decks).length > 0
    }).map(cat => {
      const decks = cardsByCategoryAndDeck[cat.id]
      const topics = Object.values(decks).sort((a, b) => {
        // Sort by most recently interacted first
        if (!a.lastInteracted && !b.lastInteracted) return a.name.localeCompare(b.name)
        if (!a.lastInteracted) return 1
        if (!b.lastInteracted) return -1
        return new Date(b.lastInteracted) - new Date(a.lastInteracted)
      })
      const totalCards = topics.reduce((sum, t) => sum + t.claimedCount, 0)
      return { ...cat, topics, topicCount: topics.length, totalCards }
    }).sort((a, b) => a.name.localeCompare(b.name))

    // Calculate total stats
    const allCards = categoriesWithTopics.flatMap(cat => cat.topics.flatMap(t => t.cards))
    const totalCards = allCards.length
    const totalTopics = categoriesWithTopics.reduce((sum, cat) => sum + cat.topicCount, 0)
    const rarityCount = {
      common: allCards.filter(c => !c.rarity || c.rarity === 'common').length,
      rare: allCards.filter(c => c.rarity === 'rare').length,
      epic: allCards.filter(c => c.rarity === 'epic').length,
      legendary: allCards.filter(c => c.rarity === 'legendary').length
    }

    // Topic Card View - shows cards for a specific topic
    if (selectedCollectionTopic) {
      const topic = selectedCollectionTopic
      const rootCategoryId = findRootCategory(topic.id)
      const theme = getCategoryTheme(rootCategoryId)
      const isComplete = topic.claimedCount >= topic.expectedTotal

      return (
        <div className="w-screen min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 overflow-auto pb-20">
          {/* Header with back button */}
          <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
            <div className="px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSelectedCollectionTopic(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-white truncate">{topic.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{topic.claimedCount}/{topic.expectedTotal}</span>
                  {isComplete && <span className="text-green-400 text-sm">✓ Complete</span>}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="px-4 pb-3">
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((topic.claimedCount / topic.expectedTotal) * 100)}%`,
                    background: theme.accent
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="p-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {topic.cards.map((card) => (
                <MiniCollectionCard
                  key={card.id}
                  card={card}
                  rootCategoryId={rootCategoryId}
                  size="medium"
                  onClick={() => setSelectedCollectionCard(card)}
                />
              ))}
            </div>
          </div>

          {/* Bottom navigation */}
          <BottomNav />

          {/* Card detail */}
          <AnimatePresence>
            {selectedCollectionCard && (
              <ExpandedCard
                card={{
                  ...selectedCollectionCard,
                  content: selectedCollectionCard.content || getCardContent(selectedCollectionCard.id),
                  contentLoaded: true
                }}
                index={selectedCollectionCard.number || 0}
                total={topic.cards.length}
                claimed={true}
                onClaim={() => {}}
                onClose={() => setSelectedCollectionCard(null)}
                deckName={topic.name}
                onContentGenerated={() => {}}
                allCards={topic.cards}
                hasNext={false}
                hasPrev={false}
                onNext={() => {}}
                onPrev={() => {}}
                startFlipped={true}
                tint="#fafbfc"
                rootCategoryId={rootCategoryId}
              />
            )}
          </AnimatePresence>
        </div>
      )
    }

    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 overflow-auto pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
          <div className="px-4 py-4">
            <h1 className="text-lg font-semibold text-white text-center mb-3">Collection</h1>

            {/* Stats */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              {/* Total count */}
              <div className="text-center mb-3">
                <span className="text-4xl font-bold text-white">{totalCards}</span>
                <span className="text-slate-400 ml-2">Cards</span>
                <span className="text-slate-500 mx-2">·</span>
                <span className="text-slate-400">{totalTopics} Topics</span>
              </div>

              {/* Rarity breakdown */}
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400 border border-gray-300" />
                  <span className="text-slate-300">{rarityCount.common}</span>
                </div>
                {rarityCount.rare > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
                    <span className="text-slate-300">{rarityCount.rare}</span>
                  </div>
                )}
                {rarityCount.epic > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-400" />
                    <span className="text-slate-300">{rarityCount.epic}</span>
                  </div>
                )}
                {rarityCount.legendary > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400" />
                    <span className="text-slate-300">{rarityCount.legendary}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Drawers */}
        <div className="p-4">
          {categoriesWithTopics.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-slate-300 text-lg mb-2">Your collection is empty</p>
              <p className="text-slate-500 text-sm">Start exploring to collect cards!</p>
              <button
                onClick={() => {
                  setActiveTab('learn')
                  setStack([])
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {categoriesWithTopics.map((category) => {
                const isExpanded = expandedCollectionCategory === category.id
                const previewTopics = category.topics.slice(0, 3)

                return (
                  <motion.div
                    key={category.id}
                    className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
                    layout
                  >
                    {/* Drawer header */}
                    <button
                      onClick={() => setExpandedCollectionCategory(isExpanded ? null : category.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">{category.name}</span>
                        <span className="text-slate-400 text-sm">
                          ({category.topicCount} {category.topicCount === 1 ? 'topic' : 'topics'}, {category.totalCards} cards)
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Topic name pills (when collapsed) */}
                        {!isExpanded && (
                          <div className="flex gap-1.5">
                            {previewTopics.map((topic) => (
                              <span
                                key={topic.id}
                                className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full truncate max-w-[80px]"
                              >
                                {topic.name}
                              </span>
                            ))}
                            {category.topicCount > 3 && (
                              <span className="text-xs text-slate-500">+{category.topicCount - 3}</span>
                            )}
                          </div>
                        )}

                        {/* Chevron */}
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded content - topic list with progress */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-2">
                            {category.topics.map((topic) => {
                              const progressPercent = Math.round((topic.claimedCount / topic.expectedTotal) * 100)
                              const isComplete = topic.claimedCount >= topic.expectedTotal
                              const theme = getCategoryTheme(category.id)

                              return (
                                <button
                                  key={topic.id}
                                  onClick={() => setSelectedCollectionTopic(topic)}
                                  className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium truncate pr-2">{topic.name}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-slate-400 text-sm">
                                        {topic.claimedCount}/{topic.expectedTotal}
                                      </span>
                                      {isComplete ? (
                                        <span className="text-green-400">✓</span>
                                      ) : (
                                        <span className="text-slate-500">→</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-300"
                                      style={{
                                        width: `${progressPercent}%`,
                                        background: isComplete ? '#22c55e' : theme.accent
                                      }}
                                    />
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <BottomNav />
        <ToastMessage />
        <WanderMessage />
      </div>
    )
  }

  // Collection category view - show decks within a category
  if (stack.length === 2 && stack[0] === 'collections') {
    const categoryId = stack[1]
    const category = CATEGORIES.find(c => c.id === categoryId)
    const cardsByCategoryAndDeck = getClaimedCardsByCategoryAndDeck()
    const categoryDecks = cardsByCategoryAndDeck[categoryId] || {}
    const deckList = Object.values(categoryDecks)
    const totalCards = deckList.reduce((sum, deck) => sum + deck.cards.length, 0)

    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
        {/* Top navigation bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setStack(['collections'])}
              className="flex items-center gap-2 text-amber-600 hover:text-amber-800 transition-colors"
            >
              <span className="text-lg">‹</span>
              <span className="text-sm font-medium">Collection</span>
            </button>
            <span className="font-semibold text-gray-800">{category?.name || 'Category'}</span>
            <div className="bg-gray-100 rounded-full px-3 py-1">
              <span className="text-gray-500 text-xs">Cards: </span>
              <span className="text-gray-800 font-bold text-sm">{totalCards}</span>
            </div>
          </div>
        </div>

        <div className="min-h-screen p-4 pt-16">
          {deckList.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <p>No cards in this category yet</p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-center max-w-4xl mx-auto">
              {deckList.map((deck, index) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Deck
                    deck={{ id: deck.id, name: `${toTitleCase(deck.name)}\n${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}` }}
                    onOpen={() => setStack(['collections', categoryId, deck.id])}
                    claimed={false}
                    rootCategoryId={categoryId}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Collection deck view - show cards within a specific deck
  if (stack.length === 3 && stack[0] === 'collections') {
    const categoryId = stack[1]
    const deckId = stack[2]
    const category = CATEGORIES.find(c => c.id === categoryId)
    const cardsByCategoryAndDeck = getClaimedCardsByCategoryAndDeck()
    const deck = cardsByCategoryAndDeck[categoryId]?.[deckId]
    const deckCards = deck?.cards || []

    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
        {/* Top navigation bar */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setStack(['collections', categoryId])}
              className="flex items-center gap-2 text-amber-600 hover:text-amber-800 transition-colors"
            >
              <span className="text-lg">‹</span>
              <span className="text-sm font-medium">{category?.name || 'Category'}</span>
            </button>
            <span className="font-semibold text-gray-800 text-center flex-1 mx-2 truncate">{toTitleCase(deck?.name || 'Deck')}</span>
            <div className="bg-gray-100 rounded-full px-3 py-1 shrink-0">
              <span className="text-gray-500 text-xs">Cards: </span>
              <span className="text-gray-800 font-bold text-sm">{deckCards.length}</span>
            </div>
          </div>
        </div>

        <div className="min-h-screen p-4 pt-16 pb-24">
          {deckCards.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <p>No cards in this deck yet</p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-center max-w-4xl mx-auto">
              {deckCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Deck
                    deck={{ id: card.id, name: card.title }}
                    onOpen={() => {
                      setExpandedCard(card)
                      setExpandedCardStartFlipped(true)
                    }}
                    claimed={claimedCards.has(card.id)}
                    rootCategoryId={categoryId}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Continue Learning / Completed button */}
          {deckCards.length > 0 && (
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30">
              {deckCards.length >= 16 ? (
                <div className="px-6 py-3 rounded-full bg-green-100 text-green-700 font-semibold text-sm border border-green-200 flex items-center gap-2">
                  <span>✓</span>
                  <span>Completed all cards</span>
                </div>
              ) : (
                <button
                  onClick={() => setStack([categoryId, deckId])}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Continue Learning →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expanded card modal for Collections view */}
        <AnimatePresence>
          {expandedCardData && (
            <ExpandedCard
              key={`${expandedCardData.id}-${expandedCardStartFlipped}`}
              card={expandedCardData}
              index={0}
              total={deckCards.length}
              claimed={claimedCards.has(expandedCardData.id)}
              onClaim={handleClaim}
              onClose={() => { setExpandedCard(null); setExpandedCardStartFlipped(false); setExpandedCardSlideDirection(0) }}
              deckName={deck?.name || 'Collection'}
              onContentGenerated={handleContentGenerated}
              allCards={deckCards}
              hasNext={false}
              hasPrev={false}
              startFlipped={expandedCardStartFlipped}
              slideDirection={expandedCardSlideDirection}
              tint="#fafbfc"
              rootCategoryId={categoryId}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Inside the stack - show parent decks underneath and current spread on top
  return (
    <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
      {/* Top navigation bar - simplified */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-2">
          <DeckHeader
            stackDecks={stackDecks}
            onGoBack={goBack}
          />

          {/* Card counter */}
          <div className="bg-gray-100 rounded-full px-3 py-1 shrink-0">
            <span className="text-gray-500 text-xs">Cards: </span>
            <span className="text-gray-800 font-bold text-sm">{claimedCards.size}</span>
          </div>
        </div>
      </div>

      {/* Current spread + parent deck underneath */}
      <div className="min-h-screen flex flex-col items-center pt-20 px-4">
        {/* Current spread */}
        <div className="flex-1 flex items-start justify-center w-full">
          <AnimatePresence mode="wait">
            <DeckSpread
              key={currentDeck.id}
              deck={currentDeck}
              overviewCards={overviewCards}
              childDecks={childDecks}
              onOpenDeck={openDeck}
              onReadCard={(card) => setExpandedCard(card.id)}
              claimedCards={claimedCards}
              isLoading={isLoading}
              isLoadingChildren={isLoadingChildren}
              isLoadingSections={isLoadingSectionsState}
              skeletonCount={skeletonCount}
              isLeaf={isLeaf}
              isArticle={isArticle}
              onClaimCategory={() => {
                if (currentDeck && claimCategoryNode(currentDeck.id, currentDeck.name)) {
                  setClaimedCards(getClaimedCardIds())
                }
              }}
              tierCards={currentTierCards}
              tierCompletion={currentTierCompletion}
              onUnlockTier={handleUnlockTier}
              unlockingTier={unlockingTier}
              sections={currentSections}
              generationProgress={generationProgress}
              rootCategoryId={stackDecks[0]?.id}
              previewCard={currentDeck ? getPreviewCard(currentDeck.id) : null}
              onReadPreviewCard={() => {
                const preview = currentDeck ? getPreviewCard(currentDeck.id) : null
                if (preview) {
                  // Open the preview as an expanded card-like view
                  setShowPreviewCard({
                    deckId: currentDeck.id,
                    title: currentDeck.name,
                    preview: preview.content,
                    cardId: preview.cardId,
                    isLoading: false,
                    claimed: preview.claimed
                  })
                }
              }}
              outline={currentDeck ? loadedOutlines[currentDeck.id] : null}
            />
          </AnimatePresence>
        </div>

      </div>

      {/* Expanded card modal */}
      <AnimatePresence>
        {expandedCardData && (
          <ExpandedCard
            key={`${expandedCardData.id}-${expandedCardStartFlipped}`}
            card={expandedCardData}
            index={expandedCardIndex}
            total={15}
            claimed={claimedCards.has(expandedCardData.id)}
            onClaim={handleClaim}
            onClose={() => { setExpandedCard(null); setExpandedCardStartFlipped(false); setExpandedCardSlideDirection(0) }}
            deckName={currentDeck?.name || ''}
            onContentGenerated={handleContentGenerated}
            allCards={allCurrentCards}
            hasNext={(() => {
              const coreCards = currentTierCards.core
              const dd1Cards = currentTierCards.deep_dive_1
              const dd2Cards = currentTierCards.deep_dive_2
              const currentCardId = allCurrentCards[expandedCardIndex]?.id
              const nextCard = allCurrentCards[expandedCardIndex + 1]

              // At last Core card - can loop back if there are OTHER unclaimed Core cards
              if (expandedCardIndex === coreCards.length - 1) {
                const hasOtherUnclaimed = coreCards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) return true
              }

              // At last Deep Dive 1 card - can loop back if there are OTHER unclaimed DD1 cards
              if (expandedCardIndex === coreCards.length + dd1Cards.length - 1) {
                const hasOtherUnclaimed = dd1Cards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) return true
              }

              // At last Deep Dive 2 card - can loop back if there are OTHER unclaimed DD2 cards
              if (expandedCardIndex === coreCards.length + dd1Cards.length + dd2Cards.length - 1) {
                const hasOtherUnclaimed = dd2Cards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) return true
              }

              // Default: check if there's a next card AND it has a title (is loaded)
              return nextCard && nextCard.title
            })()}
            hasPrev={expandedCardIndex > 0}
            startFlipped={expandedCardStartFlipped}
            slideDirection={expandedCardSlideDirection}
            tint={getCardTint(currentDeck?.gradient)}
            rootCategoryId={stackDecks[0]?.id}
            onNext={() => {
              const coreCards = currentTierCards.core
              const dd1Cards = currentTierCards.deep_dive_1
              const dd2Cards = currentTierCards.deep_dive_2
              const currentCardId = allCurrentCards[expandedCardIndex]?.id

              // At last Core card - loop back to card 1 if there are OTHER unclaimed Core cards
              if (expandedCardIndex === coreCards.length - 1) {
                const hasOtherUnclaimed = coreCards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) {
                  const firstCoreCard = coreCards[0]
                  if (firstCoreCard) {
                    setExpandedCardSlideDirection(1)
                    setExpandedCardStartFlipped(true)
                    setExpandedCard(firstCoreCard.id)
                    return
                  }
                }
              }

              // At last Deep Dive 1 card - loop back to card 6 if there are OTHER unclaimed DD1 cards
              if (expandedCardIndex === coreCards.length + dd1Cards.length - 1) {
                const hasOtherUnclaimed = dd1Cards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) {
                  const firstDD1Card = dd1Cards[0]
                  if (firstDD1Card) {
                    setExpandedCardSlideDirection(1)
                    setExpandedCardStartFlipped(true)
                    setExpandedCard(firstDD1Card.id)
                    return
                  }
                }
              }

              // At last Deep Dive 2 card - loop back to card 11 if there are OTHER unclaimed DD2 cards
              if (expandedCardIndex === coreCards.length + dd1Cards.length + dd2Cards.length - 1) {
                const hasOtherUnclaimed = dd2Cards.some(card => !claimedCards.has(card.id) && card.id !== currentCardId)
                if (hasOtherUnclaimed) {
                  const firstDD2Card = dd2Cards[0]
                  if (firstDD2Card) {
                    setExpandedCardSlideDirection(1)
                    setExpandedCardStartFlipped(true)
                    setExpandedCard(firstDD2Card.id)
                    return
                  }
                }
              }

              // Default: go to next card
              const nextCard = allCurrentCards[expandedCardIndex + 1]
              if (nextCard) {
                setExpandedCardSlideDirection(1) // Next card slides in from right
                setExpandedCardStartFlipped(true)
                setExpandedCard(nextCard.id)
              }
            }}
            onPrev={() => {
              const prevCard = allCurrentCards[expandedCardIndex - 1]
              if (prevCard) {
                setExpandedCardSlideDirection(-1) // Prev card slides in from left
                setExpandedCardStartFlipped(true)
                setExpandedCard(prevCard.id)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Tier completion celebration modal */}
      <AnimatePresence>
        {showCelebration && (
          <TierCompleteCelebration
            tierName={showCelebration.tierName}
            nextTierName={showCelebration.nextTierName}
            nextTierReady={(() => {
              // Check if next tier cards are already generated (from background pre-generation)
              const nextTier = showCelebration.tier === 'core' ? 'deep_dive_1' : 'deep_dive_2'
              const nextTierCards = tierCards[currentDeck?.id]?.[nextTier] || []
              return nextTierCards.length === 5
            })()}
            topicName={currentDeck?.name || 'this topic'}
            isFullyMastered={showCelebration.tier === 'deep_dive_2'}
            siblingTopics={(() => {
              // Get sibling topics (other children of parent deck)
              const parentDeck = stackDecks.length > 1 ? stackDecks[stackDecks.length - 2] : null
              console.log('[CELEBRATION] Parent deck:', parentDeck?.name, 'Stack length:', stackDecks.length)
              if (!parentDeck) return []
              const parentChildren = dynamicChildren[parentDeck.id] || []
              console.log('[CELEBRATION] Parent children:', parentChildren.length, parentChildren.map(c => c.name))
              // Filter out current deck and return siblings
              const siblings = parentChildren.filter(child => child.id !== currentDeck?.id)
              console.log('[CELEBRATION] Siblings:', siblings.length, siblings.map(c => c.name))
              return siblings
            })()}
            onSelectTopic={(topic) => {
              setShowCelebration(null)
              // Navigate to the sibling topic
              const newStack = [...stack.slice(0, -1), topic.id]
              setStack(newStack)
            }}
            onContinue={() => setShowCelebration(null)}
            onUnlockNext={() => {
              const nextTier = showCelebration.tier === 'core' ? 'deep_dive_1' : 'deep_dive_2'
              handleUnlockTier(nextTier)
              setShowCelebration(null)
            }}
            onWander={() => {
              setShowCelebration(null)
              handleWander()
            }}
            onHome={() => {
              setShowCelebration(null)
              setStack([])
            }}
          />
        )}
      </AnimatePresence>

      {/* Preview card modal (shown before committing to a topic - for DIRECT clicks only) */}
      <AnimatePresence>
        {showPreviewCard && !showPreviewCard.navigatePath && (
          <PreviewCardModal
            topic={showPreviewCard.title}
            preview={showPreviewCard.preview}
            isLoading={showPreviewCard.isLoading}
            claimed={showPreviewCard.claimed}
            cardId={showPreviewCard.cardId}
            rootCategoryId={stackDecks[0]?.id}
            isCurrentPage={showPreviewCard.deckId === stackDecks[stackDecks.length - 1]?.id}
            onClaim={() => {
              // Claim the preview card
              claimPreviewCard(showPreviewCard.deckId)
              setClaimedCards(getClaimedCardIds())
              setShowPreviewCard(prev => ({ ...prev, claimed: true }))
            }}
            onDealMeIn={() => {
              // From clicking a topic - just add to current stack
              setStack(prev => [...prev, showPreviewCard.deckId])
              setShowPreviewCard(null)
            }}
            onWander={() => {
              setShowPreviewCard(null)
              handleWander()
            }}
            onBack={() => {
              setShowPreviewCard(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Bottom navigation - hide when preview card is open */}
      {!showPreviewCard && <BottomNav />}
      <ToastMessage />
      <WanderMessage />

      {/* Wander card overlay - shows path animation then preview (for WANDER only) */}
      <AnimatePresence>
        {(isWandering || (showPreviewCard && showPreviewCard.navigatePath)) && wanderPathSteps.length > 0 && (
          <WanderCard
            pathSteps={wanderPathSteps}
            currentStep={wanderCurrentStep}
            isComplete={wanderComplete}
            previewData={showPreviewCard ? {
              title: showPreviewCard.title,
              preview: showPreviewCard.preview,
              isLoading: showPreviewCard.isLoading,
              claimed: showPreviewCard.claimed,
              cardId: showPreviewCard.cardId
            } : null}
            onClaim={() => {
              claimPreviewCard(showPreviewCard.deckId)
              setClaimedCards(getClaimedCardIds())
              setShowPreviewCard(prev => ({ ...prev, claimed: true }))
            }}
            onExplore={() => {
              if (showPreviewCard.navigatePath) {
                setStack(showPreviewCard.navigatePath)
                // Update lastInteracted so it shows in Continue Exploring
                updateDeckLastInteracted(showPreviewCard.deckId)
              }
              setShowPreviewCard(null)
              setWanderPathSteps([])
            }}
            onWander={() => {
              setShowPreviewCard(null)
              setWanderPathSteps([])
              handleWander()
            }}
            onBack={() => {
              setShowPreviewCard(null)
              setWanderPathSteps([])
              setIsWandering(false)
            }}
            rootCategoryId={showPreviewCard?.navigatePath?.[0] || wanderPathSteps[0]?.id}
          />
        )}
      </AnimatePresence>

      {/* Reset confirmation dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Progress?</h3>
              <p className="text-gray-600 mb-6">This will clear all your claimed cards and progress. This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
