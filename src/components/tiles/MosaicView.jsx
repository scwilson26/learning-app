import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OutlineView from './OutlineView'
import CardsView from './CardsView'
import FlashcardsView from './FlashcardsView'
import { categoryPatterns } from './TilePatterns'

/**
 * MosaicView - Main container for tile-based deck viewing
 * Provides toggle between Outline, Cards, and Flashcards views
 *
 * @param {Object} props
 * @param {Object} props.deck - User deck with { name, outline, cards, flashcards }
 * @param {function} props.onBack - Back button handler
 * @param {string} props.category - Category for pattern/gradient selection
 */
export default function MosaicView({
  deck,
  onBack,
  category = 'default'
}) {
  const [viewMode, setViewMode] = useState('flashcards') // outline | cards | flashcards

  // Extract deck data
  const deckName = deck?.name || 'My Deck'
  const outline = deck?.outline || { core: [], deep_dive: [] }
  const cards = [
    ...(deck?.cards?.core || []),
    ...(deck?.cards?.deep_dive || [])
  ]
  const flashcards = deck?.flashcards || []

  // Get gradient based on category
  const gradients = {
    'arts': 'from-pink-400 via-pink-500 to-rose-500',
    'biology': 'from-emerald-400 via-emerald-500 to-teal-500',
    'health': 'from-cyan-400 via-cyan-500 to-blue-500',
    'everyday': 'from-orange-400 via-orange-500 to-amber-500',
    'geography': 'from-green-400 via-green-500 to-emerald-500',
    'history': 'from-yellow-400 via-amber-500 to-orange-500',
    'mathematics': 'from-indigo-400 via-indigo-500 to-purple-500',
    'people': 'from-rose-400 via-rose-500 to-pink-500',
    'philosophy': 'from-violet-400 via-violet-500 to-purple-500',
    'physics': 'from-blue-400 via-blue-500 to-indigo-500',
    'society': 'from-teal-400 via-teal-500 to-cyan-500',
    'technology': 'from-slate-400 via-slate-500 to-gray-500',
    'default': 'from-emerald-400 via-emerald-500 to-emerald-600'
  }

  const gradient = gradients[category] || gradients['default']
  const patternId = categoryPatterns[category] || categoryPatterns['default']

  const views = [
    { id: 'outline', label: 'Outline', icon: '▦' },
    { id: 'cards', label: 'Cards', icon: '▤' },
    { id: 'flashcards', label: 'Flash', icon: '▢' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-3">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-800 truncate flex-1">
              {deckName}
            </h1>
            <div className="text-sm text-gray-400">
              {flashcards.length} cards
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center justify-center gap-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  viewMode === view.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-xs opacity-70">{view.icon}</span>
                {view.label}
              </button>
            ))}
          </div>

          {/* View description */}
          <div className="text-center text-xs text-gray-400 mt-2">
            {viewMode === 'outline' && 'Tap anywhere → all tiles flip → full outline'}
            {viewMode === 'cards' && 'Tap a card → tiles flip → shows card content'}
            {viewMode === 'flashcards' && 'Tap a tile → it flips → shows Q/A'}
          </div>
        </div>
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, x: viewMode === 'outline' ? -20 : viewMode === 'flashcards' ? 20 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {viewMode === 'outline' && (
            <OutlineView
              tiles={flashcards}
              outline={outline}
              deckName={deckName}
              gradient={gradient}
              patternId={patternId}
            />
          )}

          {viewMode === 'cards' && (
            <CardsView
              flashcards={flashcards}
              cards={cards}
              gradient={gradient}
              patternId={patternId}
            />
          )}

          {viewMode === 'flashcards' && (
            <FlashcardsView
              flashcards={flashcards}
              gradient={gradient}
              patternId={patternId}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
