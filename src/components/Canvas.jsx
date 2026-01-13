import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateCardContent, generateDeckCards, generateSubDecks } from '../services/claude'
import { fetchLevel2WithSections, hasLevel2Sections } from '../services/wikipedia'
import {
  getDeckCards,
  saveDeckCards,
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
  unlockTier
} from '../services/storage'

// Configuration - card counts can be adjusted here or per-deck
const DEFAULT_OVERVIEW_CARDS = 5

// Helper to get card count for a deck (uses deck's overviewCardCount or default)
function getDeckCardCount(deck) {
  return deck?.overviewCardCount ?? DEFAULT_OVERVIEW_CARDS
}

// Category data - Level 1 decks (from VISION.md)
const CATEGORIES = [
  {
    id: 'arts',
    name: 'Arts',
    emoji: '🎨',
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    children: ['architecture', 'literature', 'music', 'visual-arts', 'film-tv', 'performing-arts', 'photography', 'fashion-design']
  },
  {
    id: 'biology',
    name: 'Biology & Health',
    emoji: '🧬',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    children: ['human-body', 'animals', 'plants', 'ecology', 'medicine', 'genetics', 'microbes', 'marine-life']
  },
  {
    id: 'everyday',
    name: 'Everyday Life',
    emoji: '☕',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    children: ['food-drink', 'sports-games', 'hobbies', 'holidays', 'fashion-clothing', 'home-living', 'travel-transport']
  },
  {
    id: 'geography',
    name: 'Geography',
    emoji: '🌍',
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    children: ['countries', 'cities', 'mountains-volcanoes', 'rivers-lakes', 'oceans-seas', 'islands', 'deserts-forests', 'landmarks-wonders']
  },
  {
    id: 'history',
    name: 'History',
    emoji: '📜',
    gradient: 'from-yellow-600 to-amber-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    children: ['ancient', 'medieval', 'renaissance', 'modern', 'world-wars', 'empires', 'revolutions', 'exploration']
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    emoji: '🔢',
    gradient: 'from-indigo-500 to-purple-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    children: ['numbers-arithmetic', 'algebra', 'geometry', 'statistics-probability', 'famous-problems', 'mathematicians']
  },
  {
    id: 'people',
    name: 'People',
    emoji: '👤',
    gradient: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    children: ['leaders-politicians', 'scientists-inventors', 'artists-writers', 'musicians-performers', 'explorers-adventurers', 'philosophers-thinkers', 'athletes', 'villains-outlaws']
  },
  {
    id: 'philosophy',
    name: 'Philosophy & Religion',
    emoji: '🧘',
    gradient: 'from-violet-500 to-purple-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    children: ['world-religions', 'mythology', 'ethics-morality', 'logic-reasoning', 'eastern-philosophy', 'western-philosophy', 'spirituality-mysticism']
  },
  {
    id: 'physics',
    name: 'Physical Sciences',
    emoji: '⚛️',
    gradient: 'from-blue-500 to-indigo-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    children: ['physics', 'chemistry', 'astronomy-space', 'earth-science', 'energy-forces', 'elements-materials']
  },
  {
    id: 'society',
    name: 'Society',
    emoji: '🏛️',
    gradient: 'from-slate-500 to-gray-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    children: ['politics-government', 'economics-money', 'law-justice', 'education', 'media-communication', 'social-movements', 'war-military', 'culture-customs']
  },
  {
    id: 'technology',
    name: 'Technology',
    emoji: '💻',
    gradient: 'from-green-500 to-emerald-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    children: ['computers-internet', 'engineering', 'inventions', 'transportation', 'weapons-defense', 'communication-tech', 'energy-power', 'future-tech-ai']
  },
]

// Subcategory data - Level 2 decks (from VISION.md)
const SUBCATEGORIES = {
  // ===== ARTS (8 sub-categories) =====
  'architecture': { id: 'architecture', name: 'Architecture', emoji: '🏗️', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'literature': { id: 'literature', name: 'Literature', emoji: '📚', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'music': { id: 'music', name: 'Music', emoji: '🎵', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'visual-arts': { id: 'visual-arts', name: 'Visual Arts', emoji: '🖼️', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'film-tv': { id: 'film-tv', name: 'Film & Television', emoji: '🎬', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'performing-arts': { id: 'performing-arts', name: 'Performing Arts', emoji: '🎭', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'photography': { id: 'photography', name: 'Photography', emoji: '📷', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },
  'fashion-design': { id: 'fashion-design', name: 'Fashion & Design', emoji: '👗', gradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-300', children: [] },

  // ===== BIOLOGY & HEALTH (8 sub-categories) =====
  'human-body': { id: 'human-body', name: 'Human Body', emoji: '🫀', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'animals': { id: 'animals', name: 'Animals', emoji: '🦁', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'plants': { id: 'plants', name: 'Plants', emoji: '🌿', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'ecology': { id: 'ecology', name: 'Ecology & Environment', emoji: '🌍', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'medicine': { id: 'medicine', name: 'Medicine & Disease', emoji: '💊', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'genetics': { id: 'genetics', name: 'Genetics & Evolution', emoji: '🧬', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'microbes': { id: 'microbes', name: 'Microbes & Viruses', emoji: '🦠', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },
  'marine-life': { id: 'marine-life', name: 'Marine Life', emoji: '🐙', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-300', children: [] },

  // ===== EVERYDAY LIFE (7 sub-categories) =====
  'food-drink': { id: 'food-drink', name: 'Food & Drink', emoji: '🍕', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'sports-games': { id: 'sports-games', name: 'Sports & Games', emoji: '⚽', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'hobbies': { id: 'hobbies', name: 'Hobbies & Recreation', emoji: '🎮', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'holidays': { id: 'holidays', name: 'Holidays & Traditions', emoji: '🎄', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'fashion-clothing': { id: 'fashion-clothing', name: 'Fashion & Clothing', emoji: '👔', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'home-living': { id: 'home-living', name: 'Home & Living', emoji: '🏠', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },
  'travel-transport': { id: 'travel-transport', name: 'Travel & Transport', emoji: '✈️', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-300', children: [] },

  // ===== GEOGRAPHY (8 sub-categories) =====
  'countries': { id: 'countries', name: 'Countries', emoji: '🗺️', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'cities': { id: 'cities', name: 'Cities', emoji: '🌆', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'mountains-volcanoes': { id: 'mountains-volcanoes', name: 'Mountains & Volcanoes', emoji: '🏔️', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'rivers-lakes': { id: 'rivers-lakes', name: 'Rivers & Lakes', emoji: '🏞️', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'oceans-seas': { id: 'oceans-seas', name: 'Oceans & Seas', emoji: '🌊', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'islands': { id: 'islands', name: 'Islands', emoji: '🏝️', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'deserts-forests': { id: 'deserts-forests', name: 'Deserts & Forests', emoji: '🏜️', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },
  'landmarks-wonders': { id: 'landmarks-wonders', name: 'Landmarks & Wonders', emoji: '🗽', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-300', children: [] },

  // ===== HISTORY (8 sub-categories) =====
  'ancient': { id: 'ancient', name: 'Ancient World', emoji: '🏛️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: ['egypt', 'rome', 'greece', 'persia', 'china-ancient', 'mesopotamia', 'maya'] },
  'medieval': { id: 'medieval', name: 'Medieval', emoji: '⚔️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'renaissance': { id: 'renaissance', name: 'Renaissance & Early Modern', emoji: '🎨', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'modern': { id: 'modern', name: 'Modern History', emoji: '🏭', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'world-wars': { id: 'world-wars', name: 'World Wars', emoji: '💣', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'empires': { id: 'empires', name: 'Empires & Civilizations', emoji: '👑', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'revolutions': { id: 'revolutions', name: 'Revolutions & Conflicts', emoji: '✊', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'exploration': { id: 'exploration', name: 'Exploration & Discovery', emoji: '🧭', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },

  // Ancient World children (Level 3)
  'egypt': { id: 'egypt', name: 'Ancient Egypt', emoji: '🏺', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'rome': { id: 'rome', name: 'Ancient Rome', emoji: '🏛️', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'greece': { id: 'greece', name: 'Ancient Greece', emoji: '🏺', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'persia': { id: 'persia', name: 'Persian Empire', emoji: '🦁', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'china-ancient': { id: 'china-ancient', name: 'Ancient China', emoji: '🐉', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'mesopotamia': { id: 'mesopotamia', name: 'Mesopotamia', emoji: '🌙', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },
  'maya': { id: 'maya', name: 'Maya Civilization', emoji: '🌽', gradient: 'from-yellow-600 to-amber-700', borderColor: 'border-yellow-400', children: [] },

  // ===== MATHEMATICS (6 sub-categories) =====
  'numbers-arithmetic': { id: 'numbers-arithmetic', name: 'Numbers & Arithmetic', emoji: '🔢', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'algebra': { id: 'algebra', name: 'Algebra', emoji: '➗', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'geometry': { id: 'geometry', name: 'Geometry', emoji: '📐', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'statistics-probability': { id: 'statistics-probability', name: 'Statistics & Probability', emoji: '📊', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'famous-problems': { id: 'famous-problems', name: 'Famous Problems', emoji: '🧩', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },
  'mathematicians': { id: 'mathematicians', name: 'Mathematicians', emoji: '🧠', gradient: 'from-indigo-500 to-purple-600', borderColor: 'border-indigo-300', children: [] },

  // ===== PEOPLE (8 sub-categories) =====
  'leaders-politicians': { id: 'leaders-politicians', name: 'Leaders & Politicians', emoji: '👔', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'scientists-inventors': { id: 'scientists-inventors', name: 'Scientists & Inventors', emoji: '🔬', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'artists-writers': { id: 'artists-writers', name: 'Artists & Writers', emoji: '✍️', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'musicians-performers': { id: 'musicians-performers', name: 'Musicians & Performers', emoji: '🎤', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'explorers-adventurers': { id: 'explorers-adventurers', name: 'Explorers & Adventurers', emoji: '🧭', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'philosophers-thinkers': { id: 'philosophers-thinkers', name: 'Philosophers & Thinkers', emoji: '💭', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'athletes': { id: 'athletes', name: 'Athletes', emoji: '🏅', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },
  'villains-outlaws': { id: 'villains-outlaws', name: 'Villains & Outlaws', emoji: '🦹', gradient: 'from-sky-500 to-blue-600', borderColor: 'border-sky-300', children: [] },

  // ===== PHILOSOPHY & RELIGION (7 sub-categories) =====
  'world-religions': { id: 'world-religions', name: 'World Religions', emoji: '🕌', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'mythology': { id: 'mythology', name: 'Mythology', emoji: '🐉', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'ethics-morality': { id: 'ethics-morality', name: 'Ethics & Morality', emoji: '⚖️', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'logic-reasoning': { id: 'logic-reasoning', name: 'Logic & Reasoning', emoji: '🧠', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'eastern-philosophy': { id: 'eastern-philosophy', name: 'Eastern Philosophy', emoji: '☯️', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'western-philosophy': { id: 'western-philosophy', name: 'Western Philosophy', emoji: '🏛️', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },
  'spirituality-mysticism': { id: 'spirituality-mysticism', name: 'Spirituality & Mysticism', emoji: '✨', gradient: 'from-violet-500 to-purple-700', borderColor: 'border-violet-300', children: [] },

  // ===== PHYSICAL SCIENCES (6 sub-categories) =====
  'physics': { id: 'physics', name: 'Physics', emoji: '⚛️', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'chemistry': { id: 'chemistry', name: 'Chemistry', emoji: '🧪', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'astronomy-space': { id: 'astronomy-space', name: 'Astronomy & Space', emoji: '🔭', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'earth-science': { id: 'earth-science', name: 'Earth Science', emoji: '🌋', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'energy-forces': { id: 'energy-forces', name: 'Energy & Forces', emoji: '⚡', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },
  'elements-materials': { id: 'elements-materials', name: 'Elements & Materials', emoji: '💎', gradient: 'from-blue-500 to-indigo-700', borderColor: 'border-blue-300', children: [] },

  // ===== SOCIETY (8 sub-categories) =====
  'politics-government': { id: 'politics-government', name: 'Politics & Government', emoji: '🏛️', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'economics-money': { id: 'economics-money', name: 'Economics & Money', emoji: '💰', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'law-justice': { id: 'law-justice', name: 'Law & Justice', emoji: '⚖️', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'education': { id: 'education', name: 'Education', emoji: '🎓', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'media-communication': { id: 'media-communication', name: 'Media & Communication', emoji: '📺', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'social-movements': { id: 'social-movements', name: 'Social Movements', emoji: '✊', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'war-military': { id: 'war-military', name: 'War & Military', emoji: '🎖️', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },
  'culture-customs': { id: 'culture-customs', name: 'Culture & Customs', emoji: '🎎', gradient: 'from-slate-500 to-gray-700', borderColor: 'border-slate-300', children: [] },

  // ===== TECHNOLOGY (8 sub-categories) =====
  'computers-internet': { id: 'computers-internet', name: 'Computers & Internet', emoji: '💻', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'engineering': { id: 'engineering', name: 'Engineering', emoji: '🔧', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'inventions': { id: 'inventions', name: 'Inventions', emoji: '💡', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'transportation': { id: 'transportation', name: 'Transportation', emoji: '🚀', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'weapons-defense': { id: 'weapons-defense', name: 'Weapons & Defense', emoji: '🛡️', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'communication-tech': { id: 'communication-tech', name: 'Communication Tech', emoji: '📡', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'energy-power': { id: 'energy-power', name: 'Energy & Power', emoji: '🔋', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
  'future-tech-ai': { id: 'future-tech-ai', name: 'Future Tech & AI', emoji: '🤖', gradient: 'from-green-500 to-emerald-700', borderColor: 'border-green-300', children: [] },
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

// Get deck data by ID (checks hardcoded data first, then dynamic storage)
function getDeck(id) {
  // Check hardcoded categories first (Level 1)
  const category = CATEGORIES.find(c => c.id === id)
  if (category) return { ...category, level: 1 }

  // Check hardcoded sub-categories (Level 2)
  const subcat = SUBCATEGORIES[id]
  if (subcat) return { ...subcat, level: 2 }

  // Check dynamic decks (Level 3+)
  const dynamicDeck = getDynamicDeck(id)
  if (dynamicDeck) {
    return {
      id: dynamicDeck.id,
      name: dynamicDeck.name,
      emoji: dynamicDeck.emoji || '📄',
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
function Deck({ deck, onOpen, claimed }) {
  return (
    <motion.div
      className="relative cursor-pointer group"
      onClick={() => onOpen(deck)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      style={{ paddingRight: 6, paddingBottom: 6 }}
    >
      {/* Stack layers - cards peeking out underneath with slight rotation */}
      <div
        className="absolute w-36 h-48 rounded-xl bg-white border border-gray-300"
        style={{
          transform: 'translate(4px, 4px) rotate(2deg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      />
      <div
        className="absolute w-36 h-48 rounded-xl bg-white border border-gray-300"
        style={{
          transform: 'translate(2px, 2px) rotate(0.5deg)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}
      />

      {/* Top card */}
      <div className="relative w-36 h-48">
        <div className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-br ${deck.gradient}
          shadow-lg group-hover:shadow-xl transition-shadow
          ${claimed ? 'ring-4 ring-yellow-400' : ''}
        `} />
        <div className="absolute inset-[3px] rounded-lg bg-white flex flex-col items-center justify-center">
          <span className="text-4xl mb-2">{deck.emoji}</span>
          <span className="text-sm font-semibold text-gray-800 text-center px-3 leading-tight">{deck.name}</span>
          {claimed && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Overview card component - same size as deck cards (w-36 h-48)
function OverviewCard({ card, index, total, onClaim, claimed, onRead }) {
  return (
    <motion.div
      className={`
        relative w-36 h-48 rounded-xl cursor-pointer
        bg-white border-2 ${claimed ? 'border-yellow-400' : 'border-gray-200'}
        shadow-lg hover:shadow-xl transition-shadow
        flex flex-col items-center justify-center p-4
      `}
      onClick={() => onRead(card)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <span className="text-sm text-gray-400 mb-2">{index + 1}/{total}</span>
      <span className="text-sm font-semibold text-gray-800 text-center leading-tight px-2">{card.title}</span>
      {claimed && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </motion.div>
  )
}

// Locked card placeholder for locked tiers
function LockedCard({ index }) {
  return (
    <motion.div
      className="relative w-36 h-48 rounded-xl bg-gray-100 border-2 border-gray-200 border-dashed flex flex-col items-center justify-center p-4 opacity-60"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 0.6, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <span className="text-2xl mb-2">🔒</span>
      <span className="text-xs text-gray-400 text-center">Locked</span>
    </motion.div>
  )
}

// Tier section component - shows cards for one tier with header and progress
function TierSection({ tier, tierName, tierEmoji, cards, claimedCards, onReadCard, completion, isLocked, onUnlock, isUnlocking }) {
  const { claimed, total } = completion
  const isComplete = total > 0 && claimed === total

  if (isLocked) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{tierEmoji}</span>
          <span className="text-sm font-semibold text-gray-400">{tierName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Locked</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">Complete the previous tier to unlock!</p>
        <div className="flex gap-4 flex-wrap justify-center opacity-50">
          {Array.from({ length: 5 }).map((_, index) => (
            <LockedCard key={`locked-${tier}-${index}`} index={index} />
          ))}
        </div>
      </div>
    )
  }

  // Cards generated but tier accessible
  if (cards.length > 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{tierEmoji}</span>
          <span className="text-sm font-semibold text-gray-700">{tierName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isComplete
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {claimed}/{total}
          </span>
          {isComplete && <span className="text-green-500">✓</span>}
        </div>
        <div className="flex gap-4 flex-wrap justify-center">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <OverviewCard
                card={card}
                index={index}
                total={cards.length}
                claimed={claimedCards.has(card.id)}
                onClaim={() => {}}
                onRead={onReadCard}
              />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // Tier accessible but not yet generated - show unlock prompt
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

// Tier completion celebration modal
function TierCompleteCelebration({ tierName, nextTierName, onContinue, onUnlockNext }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
      >
        <span className="text-6xl block mb-4">🎉</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{tierName} Complete!</h2>
        <p className="text-gray-600 mb-6">
          You've mastered the essentials. You now understand this topic!
        </p>

        {nextTierName && (
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-700 mb-3">
              <span className="font-semibold">🎁 Want to go deeper?</span>
              <br />
              Unlock {nextTierName} for 5 bonus cards!
            </p>
            <button
              onClick={onUnlockNext}
              className="w-full py-3 rounded-xl text-white font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Unlock {nextTierName}
            </button>
          </div>
        )}

        <button
          onClick={onContinue}
          className="text-gray-500 hover:text-gray-700 text-sm underline"
        >
          {nextTierName ? 'Maybe later' : 'Continue exploring'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// Wandering screen - animated loading state while generating new path
function WanderingScreen({ pathSteps, currentStep, isComplete }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative text-center px-8 max-w-md">
        {/* Compass/dice animation */}
        <motion.div
          className="text-7xl mb-8"
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
          className="text-2xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isComplete ? 'Found something interesting!' : 'Wandering...'}
        </motion.h2>

        {/* Path building animation */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-white/90 min-h-[60px]">
          {pathSteps.map((step, index) => (
            <motion.span
              key={index}
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.3 }}
            >
              {index > 0 && <span className="text-white/50 mx-1">→</span>}
              <span className="text-lg">{step.emoji}</span>
              <span className={`font-medium ${index === pathSteps.length - 1 ? 'text-yellow-300' : ''}`}>
                {step.name}
              </span>
              {index === currentStep && !isComplete && (
                <motion.span
                  className="ml-1"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  ...
                </motion.span>
              )}
            </motion.span>
          ))}
        </div>

        {/* Loading indicator */}
        {!isComplete && (
          <motion.p
            className="text-white/60 text-sm mt-6"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Discovering unexplored territory...
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}

// Skeleton card - shown while generating cards for the first time
function SkeletonCard({ index }) {
  return (
    <motion.div
      className="relative w-36 h-48 rounded-xl bg-gray-100 border-2 border-gray-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
        {/* Index placeholder */}
        <div className="w-8 h-4 bg-gray-200 rounded" />
        {/* Title placeholder - two lines */}
        <div className="w-24 h-3 bg-gray-200 rounded" />
        <div className="w-20 h-3 bg-gray-200 rounded" />
      </div>
    </motion.div>
  )
}

// Expanded card - zooms in and can flip back and forth
function ExpandedCard({ card, index, total, onClaim, claimed, onClose, deckName, onContentGenerated }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [content, setContent] = useState(card.content || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Update content if it arrives from background generation
  useEffect(() => {
    if (card.content && !content) {
      setContent(card.content)
    }
  }, [card.content])

  const handleFlip = async (e) => {
    e.stopPropagation()

    // If flipping to back and no content yet, generate it (fallback if pre-generation not done)
    if (!isFlipped && !content && !isLoading) {
      setIsLoading(true)
      setError(null)
      try {
        const generatedContent = await generateCardContent(deckName, card.title)
        setContent(generatedContent)
        // Notify parent to save the content
        if (onContentGenerated) {
          onContentGenerated(card.id, generatedContent)
        }
      } catch (err) {
        console.error('Failed to generate content:', err)
        setError('Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }

    setIsFlipped(!isFlipped)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Card container with perspective for 3D flip - optimized for mobile */}
      <motion.div
        className="relative w-[90vw] max-w-md h-[80vh] max-h-[600px] cursor-pointer"
        style={{ perspective: 1000 }}
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
        onClick={handleFlip}
      >
        {/* Inner container that flips */}
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Front of card */}
          <div
            className="absolute inset-0 rounded-3xl bg-white border border-gray-200 shadow-2xl flex flex-col items-center justify-center p-8"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-base text-gray-400 mb-4">{index + 1} of {total}</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-6 leading-tight px-2">{card.title}</h2>
            <span className="text-gray-400 text-base">Tap to read</span>
            {claimed && (
              <div className="absolute top-6 right-6 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-lg">✓</span>
              </div>
            )}
          </div>

          {/* Back of card - reading view optimized for mobile */}
          <div
            className="absolute inset-0 rounded-3xl bg-white border border-gray-200 shadow-2xl flex flex-col p-6 sm:p-8"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight flex-1 pr-4">{card.title}</h2>
              <span className="text-sm text-gray-400 whitespace-nowrap">{index + 1}/{total}</span>
            </div>

            {/* Content area with loading state - comfortable reading */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                    <span className="text-base text-gray-400">Generating...</span>
                  </div>
                </div>
              ) : error ? (
                <p className="text-red-500 text-center text-base">{error}</p>
              ) : (
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed sm:leading-relaxed">{content}</p>
              )}
            </div>

            {/* Action button - prominent at bottom */}
            <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
              {!claimed ? (
                <button
                  onClick={() => onClaim(card.id)}
                  disabled={isLoading || !content}
                  className={`w-full py-4 rounded-2xl text-white font-bold text-lg transition-all ${
                    isLoading || !content
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:opacity-90 active:scale-[0.98] shadow-lg'
                  }`}
                >
                  {isLoading ? 'Loading...' : '✓ Got it!'}
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl text-center font-bold text-lg text-yellow-600 bg-yellow-50 border-2 border-yellow-200">
                  ✓ Card Claimed!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hint text - subtle at bottom */}
      <div className="absolute bottom-4 sm:bottom-6 text-white/60 text-sm">
        Tap to flip · Tap outside to close
      </div>
    </motion.div>
  )
}

// Breadcrumb navigation trail
function Breadcrumbs({ stackDecks, onNavigateTo }) {
  const [showFullPath, setShowFullPath] = useState(false)

  // If 4+ levels, compress to show only last 3
  const shouldCompress = stackDecks.length >= 4
  const visibleDecks = shouldCompress ? stackDecks.slice(-3) : stackDecks
  const hiddenDecks = shouldCompress ? stackDecks.slice(0, -3) : []

  return (
    <div className="flex items-center gap-1 text-sm">
      {/* Ellipsis for hidden levels */}
      {shouldCompress && (
        <div className="relative">
          <button
            onClick={() => setShowFullPath(!showFullPath)}
            className="px-2 py-1 rounded hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
          >
            ...
          </button>

          {/* Dropdown showing full path */}
          <AnimatePresence>
            {showFullPath && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-50"
              >
                {hiddenDecks.map((deck, index) => (
                  <button
                    key={deck.id}
                    onClick={() => {
                      onNavigateTo(index)
                      setShowFullPath(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <span>{deck.emoji}</span>
                    <span>{deck.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-gray-400 ml-1">›</span>
        </div>
      )}

      {/* Visible breadcrumbs */}
      {visibleDecks.map((deck, index) => {
        const actualIndex = shouldCompress ? hiddenDecks.length + index : index
        const isLast = index === visibleDecks.length - 1

        return (
          <div key={deck.id} className="flex items-center">
            {isLast ? (
              // Current deck - not clickable, just styled differently
              <span className="px-2 py-1 text-gray-800 font-medium flex items-center gap-1">
                <span>{deck.emoji}</span>
                <span>{deck.name}</span>
              </span>
            ) : (
              // Parent deck - clickable
              <button
                onClick={() => onNavigateTo(actualIndex)}
                className="px-2 py-1 rounded hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <span>{deck.emoji}</span>
                <span>{deck.name}</span>
              </button>
            )}
            {!isLast && <span className="text-gray-400">›</span>}
          </div>
        )
      })}
    </div>
  )
}

// Skeleton deck placeholder while loading children
function SkeletonDeck({ index }) {
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
        className="absolute w-36 h-48 rounded-xl bg-gray-200 border border-gray-300"
        style={{ transform: 'translate(4px, 4px) rotate(2deg)' }}
      />
      <div
        className="absolute w-36 h-48 rounded-xl bg-gray-200 border border-gray-300"
        style={{ transform: 'translate(2px, 2px) rotate(0.5deg)' }}
      />
      {/* Top card */}
      <div className="relative w-36 h-48 rounded-xl bg-gray-100 border-2 border-gray-200 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="w-20 h-3 bg-gray-200 rounded" />
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
        <span className="text-2xl">{section.emoji}</span>
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
function SectionedDecks({ sections, onOpenDeck, claimedCards, parentGradient, parentBorderColor }) {
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
                <div className="flex gap-4 flex-wrap justify-start pl-4 py-2">
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
  // Tier-related props
  tierCards,
  tierCompletion,
  onUnlockTier,
  unlockingTier,
  // Section-related props (for Level 1)
  sections
}) {
  // Tier metadata
  const tiers = [
    { key: 'core', name: 'Core Essentials', emoji: '📚' },
    { key: 'deep_dive_1', name: 'Deep Dive 1', emoji: '🔍' },
    { key: 'deep_dive_2', name: 'Deep Dive 2', emoji: '🎓' },
  ]

  // Check if we have tier data (new system) or legacy data
  const hasTierData = tierCards && (tierCards.core?.length > 0 || tierCards.deep_dive_1?.length > 0 || tierCards.deep_dive_2?.length > 0)

  return (
    <motion.div
      className="flex flex-col items-center gap-8 pb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Deck title */}
      <span className="text-sm font-semibold text-gray-700">{deck.emoji} {deck.name}</span>

      {/* Skeleton cards while loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4 flex-wrap justify-center">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* NEW: Tiered card display */}
      {!isLoading && hasTierData && (
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

            return (
              <TierSection
                key={tier.key}
                tier={tier.key}
                tierName={tier.name}
                tierEmoji={tier.emoji}
                cards={cards}
                claimedCards={claimedCards}
                onReadCard={onReadCard}
                completion={completion}
                isLocked={isLocked}
                onUnlock={() => onUnlockTier(tier.key)}
                isUnlocking={unlockingTier === tier.key}
              />
            )
          })}
        </div>
      )}

      {/* LEGACY: Flat overview cards row (for backward compatibility) */}
      {!isLoading && !hasTierData && overviewCards.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4 flex-wrap justify-center">
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
                  total={overviewCards.length}
                  claimed={claimedCards.has(card.id)}
                  onClaim={() => {}}
                  onRead={onReadCard}
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
          <div className="flex gap-6 flex-wrap justify-center max-w-4xl">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonDeck key={`skeleton-deck-${index}`} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Loading sections indicator */}
      {isLoadingSections && (
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Loading topics...</span>
          <div className="flex gap-6 flex-wrap justify-center max-w-4xl">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonDeck key={`skeleton-section-${index}`} index={index} />
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
          />
        </div>
      )}

      {/* Sub-decks grid (for non-sectioned decks) */}
      {!isLoadingChildren && !sections && childDecks.length > 0 && (
        <div id="explore-section" className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Explore</span>
          <div className="flex gap-6 flex-wrap justify-center max-w-4xl">
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

      {/* Empty state - only show when not loading and no cards/decks */}
      {!isLoading && !isLoadingChildren && overviewCards.length === 0 && !hasTierData && childDecks.length === 0 && (
        <div className="text-center py-8">
          <span className="text-5xl mb-4 block">{deck.emoji}</span>
          <p className="text-gray-500">Content coming soon...</p>
        </div>
      )}
    </motion.div>
  )
}

export default function Canvas() {
  // Load claimed cards from localStorage on mount
  const [claimedCards, setClaimedCards] = useState(() => getClaimedCardIds())
  const [stack, setStack] = useState([]) // Array of deck IDs representing the stack
  const [expandedCard, setExpandedCard] = useState(null)
  const [generatedContent, setGeneratedContent] = useState({}) // cardId -> content (in-memory cache)
  const [generatedCards, setGeneratedCards] = useState({}) // deckId -> array of cards (in-memory cache)
  const [dynamicChildren, setDynamicChildren] = useState({}) // deckId -> array of child deck objects (in-memory cache)
  const [loadingDeck, setLoadingDeck] = useState(null) // deckId currently loading
  const [loadingChildren, setLoadingChildren] = useState(null) // deckId currently loading children
  const [isWandering, setIsWandering] = useState(false) // True when wander navigation is in progress
  const [wanderMessage, setWanderMessage] = useState(null) // Message to show user (e.g., "All explored!")
  const [autoOpenCardId, setAutoOpenCardId] = useState(null) // Card to auto-open after wander navigation
  const [wanderPathSteps, setWanderPathSteps] = useState([]) // Path steps for wandering animation
  const [wanderCurrentStep, setWanderCurrentStep] = useState(0) // Current step being generated
  const [wanderComplete, setWanderComplete] = useState(false) // True when path generation is complete

  // Tier-related state
  const [tierCards, setTierCards] = useState({}) // deckId -> { core: [], deep_dive_1: [], deep_dive_2: [] }
  const [unlockingTier, setUnlockingTier] = useState(null) // tier currently being unlocked/generated
  const [showCelebration, setShowCelebration] = useState(null) // { tierName, nextTierName } or null
  const [lastCompletedTier, setLastCompletedTier] = useState({}) // deckId -> last tier shown celebration for

  // Section-based Level 2 data (from Wikipedia)
  const [sectionData, setSectionData] = useState({}) // categoryId -> { sections: [...] }
  const [loadingSections, setLoadingSections] = useState(null) // categoryId currently loading sections

  // Claim a card and persist to localStorage
  const handleClaim = (cardId) => {
    claimCard(cardId)  // Persist to localStorage
    setClaimedCards(prev => new Set([...prev, cardId]))
    // Don't close the modal, let user see the claimed state
  }

  // Save generated content when a card is first flipped
  const handleContentGenerated = (cardId, content) => {
    saveCardContent(cardId, content)  // Persist to localStorage
    setGeneratedContent(prev => ({
      ...prev,
      [cardId]: content
    }))
  }

  // Pre-generate content for all cards that don't have it yet
  const preGenerateAllContent = async (cards, deckName) => {
    // Find cards without content
    const cardsNeedingContent = cards.filter(card => {
      const cachedContent = getCardContent(card.id)
      return !cachedContent
    })

    if (cardsNeedingContent.length === 0) return

    // Generate all content in parallel
    const contentPromises = cardsNeedingContent.map(async (card) => {
      try {
        const content = await generateCardContent(deckName, card.title)
        // Save to localStorage
        saveCardContent(card.id, content)
        // Update in-memory state
        setGeneratedContent(prev => ({
          ...prev,
          [card.id]: content
        }))
        return { cardId: card.id, content }
      } catch (error) {
        console.error(`Failed to generate content for card ${card.id}:`, error)
        return { cardId: card.id, content: null }
      }
    })

    // Wait for all to complete (but don't block UI - this runs in background)
    await Promise.all(contentPromises)
  }

  // Load or generate sub-decks for a deck (for level 2+ decks)
  const loadOrGenerateChildDecks = async (deck, parentPath) => {
    const deckLevel = deck.level || getDeckLevel(deck.id)

    // Level 1 categories always have hardcoded children (never generate)
    if (deckLevel === 1) return

    // Check if already in memory
    if (dynamicChildren[deck.id] !== undefined) {
      // CRITICAL: Level 2 decks should NEVER have empty children in memory
      // If they do, it's from a previous error or bad generation - we need to regenerate
      if (deckLevel === 2 && dynamicChildren[deck.id].length === 0) {
        console.log(`[loadOrGenerateChildDecks] Level 2 deck "${deck.name}" has empty in-memory children, will regenerate`)
        // Don't return - fall through to regeneration
      } else {
        return
      }
    }

    // Check if already has ACTUAL hardcoded children (like 'ancient' > egypt, rome, etc.)
    // Note: Level 2 decks have children: [] which means "needs generation", not "is a leaf"
    const hardcodedDeck = SUBCATEGORIES[deck.id]
    if (hardcodedDeck?.children?.length > 0) {
      // Has hardcoded children, no need to generate
      setDynamicChildren(prev => ({
        ...prev,
        [deck.id]: hardcodedDeck.children.map(id => getDeck(id)).filter(Boolean)
      }))
      return
    }

    // Check localStorage cache for previously generated children
    const cachedChildren = getDeckChildren(deck.id)
    if (cachedChildren !== null) {
      // CRITICAL FIX: Level 2 decks should NEVER be leaves - they're broad topics
      // If we have a cached empty array for Level 2, it's stale data that needs regeneration
      if (deckLevel === 2 && cachedChildren.length === 0) {
        console.log(`[loadOrGenerateChildDecks] Level 2 deck "${deck.name}" has stale empty cache, regenerating...`)
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
          emoji: child.emoji,
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
      console.log(`[loadOrGenerateChildDecks] Calling generateSubDecks for "${deck.name}" at level ${deckLevel}`)
      const subDecks = await generateSubDecks(deck.name, parentPath, deckLevel, userArchetype)
      console.log(`[loadOrGenerateChildDecks] Got subDecks for "${deck.name}":`, subDecks)

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
            emoji: child.emoji,
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
    // Check if tier cards already in memory
    if (tierCards[deck.id]?.core?.length > 0) {
      // Still check if we need to pre-generate content for any cards
      const allCards = [
        ...(tierCards[deck.id]?.core || []),
        ...(tierCards[deck.id]?.deep_dive_1 || []),
        ...(tierCards[deck.id]?.deep_dive_2 || [])
      ]
      const needsContent = allCards.some(card => !generatedContent[card.id] && !getCardContent(card.id))
      if (needsContent) {
        preGenerateAllContent(allCards, deck.name)
      }
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

      // Pre-generate any missing content in background
      preGenerateAllContent(allCards, deck.name)

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

      preGenerateAllContent(cardsWithContent, deck.name)
      return
    }

    // Not cached - generate new Core cards only (Deep Dives generated on-demand)
    setLoadingDeck(deck.id)
    try {
      const cards = await generateDeckCards(deck.name, parentPath, 5, 'core')

      // Save to localStorage with tier
      saveDeckCards(deck.id, deck.name, cards, 'core')

      // Update in-memory state
      setTierCards(prev => ({
        ...prev,
        [deck.id]: {
          core: cards,
          deep_dive_1: [],
          deep_dive_2: []
        }
      }))

      // Also populate legacy generatedCards for backward compatibility
      setGeneratedCards(prev => ({
        ...prev,
        [deck.id]: cards
      }))

      // Clear loading state - cards are visible now
      setLoadingDeck(null)

      // Now pre-generate all content in background
      preGenerateAllContent(cards, deck.name)
    } catch (error) {
      console.error('Failed to generate cards for deck:', error)
      setLoadingDeck(null)
    }
  }

  // Generate cards for a specific tier (called when user unlocks)
  const generateTierCards = async (deck, tier, parentPath) => {
    setUnlockingTier(tier)
    try {
      const cards = await generateDeckCards(deck.name, parentPath, 5, tier)

      // Save to localStorage with tier
      saveDeckCards(deck.id, deck.name, cards, tier)

      // Unlock the tier in storage
      unlockTier(deck.id, tier)

      // Update in-memory state
      setTierCards(prev => ({
        ...prev,
        [deck.id]: {
          ...prev[deck.id],
          [tier]: cards
        }
      }))

      // Also update legacy generatedCards
      setGeneratedCards(prev => ({
        ...prev,
        [deck.id]: [...(prev[deck.id] || []), ...cards]
      }))

      // Pre-generate content in background
      preGenerateAllContent(cards, deck.name)
    } catch (error) {
      console.error(`Failed to generate ${tier} cards:`, error)
    } finally {
      setUnlockingTier(null)
    }
  }

  // Handle tier unlock button click
  const handleUnlockTier = (tier) => {
    if (!currentDeck) return
    generateTierCards(currentDeck, tier, parentPath)
  }

  const openDeck = (deck) => {
    setStack(prev => [...prev, deck.id])
  }

  const goBack = () => {
    setStack(prev => prev.slice(0, -1))
  }

  // Navigate to a specific level in the stack (for breadcrumb clicks)
  const navigateToLevel = (levelIndex) => {
    setStack(prev => prev.slice(0, levelIndex + 1))
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

  // Generate a new random path on-the-fly
  const generateWanderPath = async () => {
    const userArchetype = getUserArchetype()

    // Pick random target depth (3-5 levels)
    const targetDepth = 3 + Math.floor(Math.random() * 3) // 3, 4, or 5
    console.log('[Wander] Target depth:', targetDepth)

    // Pick a random category (Level 1)
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    setWanderPathSteps([{ emoji: category.emoji, name: category.name, id: category.id }])
    setWanderCurrentStep(0)
    console.log('[Wander] Starting from category:', category.name)

    let currentPath = [category.id]
    let currentDeckName = category.name
    let currentParentPath = null
    let currentDepth = 1
    // Initialize to at least the category - we'll update as we go deeper
    let lastDeckWithCards = { id: category.id, path: [...currentPath], parentPath: null }

    // Build path level by level
    while (currentDepth < targetDepth) {
      setWanderCurrentStep(currentDepth - 1)
      console.log(`[Wander] At depth ${currentDepth}, deck: ${currentDeckName}`)

      // Get or generate children for current deck
      const currentId = currentPath[currentPath.length - 1]
      let children = []

      // Check hardcoded children first
      if (currentDepth === 1) {
        // Level 1 -> Level 2: use category's hardcoded children
        const cat = CATEGORIES.find(c => c.id === currentId)
        if (cat?.children) {
          children = cat.children.map(childId => {
            const subcat = SUBCATEGORIES[childId]
            return subcat ? { id: childId, name: subcat.name, emoji: subcat.emoji } : null
          }).filter(Boolean)
        }
      } else if (currentDepth === 2) {
        // Level 2 -> Level 3: check SUBCATEGORIES for hardcoded children, else generate
        const subcat = SUBCATEGORIES[currentId]
        if (subcat?.children?.length > 0) {
          children = subcat.children.map(childId => {
            const child = SUBCATEGORIES[childId]
            return child ? { id: childId, name: child.name, emoji: child.emoji } : null
          }).filter(Boolean)
        } else {
          // Check localStorage cache
          const cachedChildren = getDeckChildren(currentId)
          if (cachedChildren?.length > 0) {
            children = cachedChildren
          } else {
            // Generate new children
            const result = await generateSubDecks(currentDeckName, currentParentPath, currentDepth, userArchetype)
            if (result && result.length > 0) {
              // Save to storage
              const parentDeck = getDeck(currentId)
              const gradient = parentDeck?.gradient || 'from-gray-500 to-gray-700'
              const borderColor = parentDeck?.borderColor || 'border-gray-300'
              saveDeckChildren(
                currentId,
                currentDeckName,
                result,
                currentParentPath,
                currentDepth,
                gradient,
                borderColor
              )
              children = result
              // Update in-memory cache
              setDynamicChildren(prev => ({
                ...prev,
                [currentId]: result.map(child => ({
                  ...child,
                  gradient,
                  borderColor,
                  level: currentDepth + 1,
                }))
              }))
            }
          }
        }
      } else {
        // Level 3+: check cache or generate
        const cachedChildren = getDeckChildren(currentId)
        if (cachedChildren?.length > 0) {
          children = cachedChildren
        } else {
          const result = await generateSubDecks(currentDeckName, currentParentPath, currentDepth, userArchetype)
          if (result && result.length > 0) {
            const parentDeck = getDeck(currentId) || getDynamicDeck(currentId)
            const gradient = parentDeck?.gradient || 'from-gray-500 to-gray-700'
            const borderColor = parentDeck?.borderColor || 'border-gray-300'
            saveDeckChildren(
              currentId,
              currentDeckName,
              result,
              currentParentPath,
              currentDepth,
              gradient,
              borderColor
            )
            children = result
            setDynamicChildren(prev => ({
              ...prev,
              [currentId]: result.map(child => ({
                ...child,
                gradient,
                borderColor,
                level: currentDepth + 1,
              }))
            }))
          }
        }
      }

      // If no children, this is a leaf - stop here
      if (children.length === 0) {
        console.log(`[Wander] No children at depth ${currentDepth}, stopping at ${currentDeckName}`)
        lastDeckWithCards = { id: currentId, path: [...currentPath], parentPath: currentParentPath }
        break
      }

      // Pick a random child and continue
      const randomChild = children[Math.floor(Math.random() * children.length)]
      currentPath.push(randomChild.id)
      currentParentPath = currentParentPath ? `${currentParentPath} > ${currentDeckName}` : currentDeckName
      currentDeckName = randomChild.name
      currentDepth++

      // Update path steps for animation
      setWanderPathSteps(prev => [...prev, { emoji: randomChild.emoji, name: randomChild.name, id: randomChild.id }])
      lastDeckWithCards = { id: randomChild.id, path: [...currentPath], parentPath: currentParentPath }
      console.log(`[Wander] Moved to ${randomChild.name} (${randomChild.id}), path:`, [...currentPath])

      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log('[Wander] Final destination:', lastDeckWithCards)
    return lastDeckWithCards
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

        // Navigate to destination
        setStack(generated.path)

        // Auto-open first UNCLAIMED card for instant engagement
        setAutoOpenCardId('__first_unclaimed__')
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

  // Build parent path for context (e.g., "History > Ancient World")
  const parentPath = stackDecks.length > 1
    ? stackDecks.slice(0, -1).map(d => d.name).join(' > ')
    : null

  // Load section data for Level 1 categories
  const loadSectionsForCategory = async (categoryId) => {
    // Check if already loaded
    if (sectionData[categoryId]) return

    // Check if this category has section mappings
    if (!hasLevel2Sections(categoryId)) return

    setLoadingSections(categoryId)
    try {
      const sections = await fetchLevel2WithSections(categoryId)
      if (sections) {
        setSectionData(prev => ({
          ...prev,
          [categoryId]: sections
        }))

        // Get parent category for styling
        const parentCategory = CATEGORIES.find(c => c.id === categoryId)

        // Register all section decks as dynamic decks so getDeck() can find them
        sections.sections.forEach(section => {
          section.subDecks.forEach(subDeck => {
            // Save each section deck to localStorage as a dynamic deck
            const data = getData()
            if (!data.dynamicDecks) data.dynamicDecks = {}

            // Only add if not already exists
            if (!data.dynamicDecks[subDeck.id]) {
              data.dynamicDecks[subDeck.id] = {
                id: subDeck.id,
                name: subDeck.name,
                emoji: subDeck.emoji,
                gradient: parentCategory?.gradient || 'from-gray-500 to-gray-700',
                borderColor: parentCategory?.borderColor || 'border-gray-300',
                depth: 2,
                parentPath: parentCategory?.name || categoryId,
                children: null,
                childrenGenerated: false,
                wikiCategory: subDeck.wikiCategory, // Store for future Wikipedia lookups
                source: 'wikipedia-section'
              }
              saveData(data)
            }
          })
        })
      }
    } catch (error) {
      console.error('Failed to load sections:', error)
    } finally {
      setLoadingSections(null)
    }
  }

  // Load or generate cards and children when entering any deck
  useEffect(() => {
    if (currentDeck) {
      loadOrGenerateCardsForDeck(currentDeck, parentPath)
      loadOrGenerateChildDecks(currentDeck, parentPath)

      // Load sections for Level 1 categories
      const deckLevel = currentDeck.level || getDeckLevel(currentDeck.id)
      if (deckLevel === 1) {
        loadSectionsForCategory(currentDeck.id)
      }
    }
  }, [currentDeck?.id])

  // Get overview cards - either from generated cards or empty while loading
  const overviewCards = currentDeck
    ? (generatedCards[currentDeck.id] || []).map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      }))
    : []

  // Get child decks - from hardcoded data or dynamic generation
  const getChildDecks = () => {
    if (!currentDeck) return []

    const deckLevel = currentDeck.level || getDeckLevel(currentDeck.id)

    // Level 1: Return flat list for compatibility (sections handled separately)
    if (deckLevel === 1) {
      const childIds = currentDeck.children || []
      return childIds.map(id => getDeck(id)).filter(Boolean)
    }

    // Level 2+: Check for hardcoded children first (like 'ancient' has hardcoded egypt, rome, etc.)
    const hardcodedDeck = SUBCATEGORIES[currentDeck.id]
    if (hardcodedDeck?.children?.length > 0) {
      return hardcodedDeck.children.map(id => getDeck(id)).filter(Boolean)
    }

    // Use dynamically generated children
    return dynamicChildren[currentDeck.id] || []
  }

  // Get section data for current deck (only for Level 1)
  const getCurrentSections = () => {
    if (!currentDeck) return null
    const deckLevel = currentDeck.level || getDeckLevel(currentDeck.id)
    if (deckLevel !== 1) return null
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

  // Get tier completion data for current deck
  const currentTierCompletion = currentDeck ? getDeckTierCompletion(currentDeck.id) : {
    core: { claimed: 0, total: 0, complete: false },
    deep_dive_1: { claimed: 0, total: 0, complete: false },
    deep_dive_2: { claimed: 0, total: 0, complete: false }
  }

  // Get tier cards for current deck (merge with latest generated content)
  const currentTierCards = currentDeck ? (() => {
    const deckTierCards = tierCards[currentDeck.id] || { core: [], deep_dive_1: [], deep_dive_2: [] }
    // Merge in latest generated content for each card
    return {
      core: deckTierCards.core.map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      })),
      deep_dive_1: deckTierCards.deep_dive_1.map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      })),
      deep_dive_2: deckTierCards.deep_dive_2.map(card => ({
        ...card,
        content: generatedContent[card.id] || card.content || null
      }))
    }
  })() : { core: [], deep_dive_1: [], deep_dive_2: [] }

  // Check for tier completion and show celebration
  useEffect(() => {
    if (!currentDeck) return

    const completion = getDeckTierCompletion(currentDeck.id)
    const lastCompleted = lastCompletedTier[currentDeck.id]

    // Check if core just completed
    if (completion.core.complete && lastCompleted !== 'core' && lastCompleted !== 'deep_dive_1' && lastCompleted !== 'deep_dive_2') {
      setShowCelebration({
        tierName: 'Core Essentials',
        nextTierName: 'Deep Dive 1',
        tier: 'core'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'core' }))
    }
    // Check if deep_dive_1 just completed
    else if (completion.deep_dive_1.complete && lastCompleted === 'core') {
      setShowCelebration({
        tierName: 'Deep Dive 1',
        nextTierName: 'Deep Dive 2',
        tier: 'deep_dive_1'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'deep_dive_1' }))
    }
    // Check if deep_dive_2 just completed
    else if (completion.deep_dive_2.complete && lastCompleted === 'deep_dive_1') {
      setShowCelebration({
        tierName: 'Deep Dive 2',
        nextTierName: null,
        tier: 'deep_dive_2'
      })
      setLastCompletedTier(prev => ({ ...prev, [currentDeck.id]: 'deep_dive_2' }))
    }
  }, [claimedCards, currentDeck?.id])

  // Find the expanded card data (check both tier cards and legacy cards)
  const allCurrentCards = currentTierCards.core.length > 0
    ? [...currentTierCards.core, ...currentTierCards.deep_dive_1, ...currentTierCards.deep_dive_2]
    : overviewCards
  const expandedCardData = expandedCard
    ? allCurrentCards.find(c => c.id === expandedCard)
    : null
  const expandedCardIndex = expandedCardData
    ? allCurrentCards.findIndex(c => c.id === expandedCard)
    : -1

  // Wander button component (floating) - always visible and functional
  const WanderButton = () => (
    <motion.button
      onClick={handleWander}
      disabled={isWandering}
      className={`
        fixed bottom-6 right-6 z-50
        px-5 py-3 rounded-full
        bg-gradient-to-r from-purple-500 to-indigo-600
        text-white font-semibold text-sm
        shadow-lg hover:shadow-xl
        flex items-center gap-2
        transition-all
        ${isWandering ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'}
      `}
      whileHover={isWandering ? {} : { y: -2 }}
      whileTap={isWandering ? {} : { scale: 0.95 }}
    >
      <span className="text-lg">{isWandering ? '✨' : '🎲'}</span>
      <span>{isWandering ? 'Wandering...' : 'Wander'}</span>
    </motion.button>
  )

  // Wander message toast
  const WanderMessage = () => (
    <AnimatePresence>
      {wanderMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-full shadow-lg text-sm"
        >
          {wanderMessage}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Calculate topic count for Explore button
  const getTopicCount = () => {
    if (currentSections?.sections) {
      return currentSections.sections.reduce((sum, section) => sum + section.subDecks.length, 0)
    }
    return childDecks.length
  }

  // Check if we have sub-decks to explore
  const hasSubDecks = childDecks.length > 0 || (currentSections?.sections?.length > 0)

  // Scroll to explore section
  const scrollToExplore = () => {
    const exploreSection = document.getElementById('explore-section')
    if (exploreSection) {
      exploreSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Explore Deeper button component (floating)
  const ExploreButton = () => {
    if (!hasSubDecks || isLeaf) return null

    const topicCount = getTopicCount()

    return (
      <motion.button
        onClick={scrollToExplore}
        className="
          fixed bottom-6 left-6 z-50
          px-5 py-3 rounded-full
          bg-gradient-to-r from-emerald-500 to-teal-600
          text-white font-semibold text-sm
          shadow-lg hover:shadow-xl
          flex items-center gap-2
          transition-all
          hover:scale-105 active:scale-95
        "
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg">↓</span>
        <span>{topicCount} Topics</span>
      </motion.button>
    )
  }

  // Root level - show all category decks
  if (stack.length === 0) {
    return (
      <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
        <div className="min-h-screen flex items-center justify-center p-8 pt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
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

        {/* Collection counter */}
        <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
          <span className="text-gray-500 text-sm">Cards: </span>
          <span className="text-gray-800 font-bold">{claimedCards.size}</span>
          <span className="text-gray-400 text-sm"> / 5,000</span>
        </div>

        {/* Wander button */}
        <WanderButton />
        <WanderMessage />

        {/* Wandering screen overlay */}
        <AnimatePresence>
          {isWandering && wanderPathSteps.length > 0 && (
            <WanderingScreen
              pathSteps={wanderPathSteps}
              currentStep={wanderCurrentStep}
              isComplete={wanderComplete}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Inside the stack - show parent decks underneath and current spread on top
  return (
    <div className="w-screen min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 overflow-auto">
      {/* Top navigation bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Back button + Breadcrumbs */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={goBack}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl">←</span>
            </motion.button>

            <Breadcrumbs
              stackDecks={stackDecks}
              onNavigateTo={navigateToLevel}
            />
          </div>

          {/* Collection counter */}
          <div className="bg-white/90 rounded-full px-4 py-2 border border-gray-200 shadow-sm">
            <span className="text-gray-500 text-sm">Cards: </span>
            <span className="text-gray-800 font-bold">{claimedCards.size}</span>
            <span className="text-gray-400 text-sm"> / 5,000</span>
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
              tierCards={currentTierCards}
              tierCompletion={currentTierCompletion}
              onUnlockTier={handleUnlockTier}
              unlockingTier={unlockingTier}
              sections={currentSections}
            />
          </AnimatePresence>
        </div>

      </div>

      {/* Expanded card modal */}
      <AnimatePresence>
        {expandedCardData && (
          <ExpandedCard
            card={expandedCardData}
            index={expandedCardIndex}
            total={allCurrentCards.length}
            claimed={claimedCards.has(expandedCardData.id)}
            onClaim={handleClaim}
            onClose={() => setExpandedCard(null)}
            deckName={currentDeck?.name || ''}
            onContentGenerated={handleContentGenerated}
          />
        )}
      </AnimatePresence>

      {/* Tier completion celebration modal */}
      <AnimatePresence>
        {showCelebration && (
          <TierCompleteCelebration
            tierName={showCelebration.tierName}
            nextTierName={showCelebration.nextTierName}
            onContinue={() => setShowCelebration(null)}
            onUnlockNext={() => {
              const nextTier = showCelebration.tier === 'core' ? 'deep_dive_1' : 'deep_dive_2'
              handleUnlockTier(nextTier)
              setShowCelebration(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating buttons */}
      <ExploreButton />
      <WanderButton />
      <WanderMessage />

      {/* Wandering screen overlay */}
      <AnimatePresence>
        {isWandering && wanderPathSteps.length > 0 && (
          <WanderingScreen
            pathSteps={wanderPathSteps}
            currentStep={wanderCurrentStep}
            isComplete={wanderComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
