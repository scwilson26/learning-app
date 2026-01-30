import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import Tile from './Tile'
import { TilePattern } from './TilePatterns'

export default function UnifiedTileView({
  viewMode = 'outline',
  allFlashcards = [],
  allCards = [],
  outline,
  deckName = '',
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric',
  onEditFlashcard,
}) {
  const [flippedTiles, setFlippedTiles] = useState({})
  const [editingIndex, setEditingIndex] = useState(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [merging, setMerging] = useState(false)
  const timeoutRefs = useRef([])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => timeoutRefs.current.forEach(t => clearTimeout(t))
  }, [])

  // Reset state when viewMode changes
  useEffect(() => {
    timeoutRefs.current.forEach(t => clearTimeout(t))
    timeoutRefs.current = []
    setFlippedTiles({})
    setOutlineOpen(false)
    setMerging(false)
  }, [viewMode])

  // Build the effective tile list
  const hasFlashcards = allFlashcards.length > 0
  const effectiveTiles = useMemo(() => {
    if (hasFlashcards) return allFlashcards
    return allCards.flatMap(card =>
      Array.from({ length: 4 }, (_, i) => ({
        question: '',
        answer: '',
        sectionTitle: card.title,
        _placeholder: true
      }))
    )
  }, [allFlashcards, allCards, hasFlashcards])

  // Pre-compute section ranges — evenly distribute tiles across cards
  const { sections, tileToSection } = useMemo(() => {
    const secs = []
    const t2s = {}
    const cardCount = allCards.length
    const tileCount = effectiveTiles.length

    if (cardCount === 0 || tileCount === 0) {
      return { sections: secs, tileToSection: t2s }
    }

    // Distribute tiles evenly across cards
    const basePerCard = Math.floor(tileCount / cardCount)
    const remainder = tileCount % cardCount
    let idx = 0

    for (let c = 0; c < cardCount; c++) {
      const card = allCards[c]
      const count = basePerCard + (c < remainder ? 1 : 0)
      const startIdx = idx
      for (let i = 0; i < count; i++) {
        t2s[idx] = secs.length
        idx++
      }
      secs.push({
        title: card.title,
        content: card.content || card.concept || '',
        startIdx,
        endIdx: idx,
        count
      })
    }

    return { sections: secs, tileToSection: t2s }
  }, [effectiveTiles, allCards])

  // Combine outline sections
  const outlineSections = useMemo(() => [
    ...(outline?.core || []),
    ...(outline?.deep_dive || [])
  ], [outline])

  // Click handlers per mode
  const handleTileClick = (globalIndex) => {
    if (viewMode === 'outline') {
      if (!outlineOpen) {
        // Phase 1: flip all tiles
        const newState = {}
        effectiveTiles.forEach((_, i) => { newState[i] = true })
        setFlippedTiles(newState)
        // Phase 2: after flip, merge (close gaps, remove borders)
        const t1 = setTimeout(() => {
          setMerging(true)
          // Phase 3: after merge, swap to outline
          const t2 = setTimeout(() => {
            setOutlineOpen(true)
            setMerging(false)
          }, 350)
          timeoutRefs.current.push(t2)
        }, 350)
        timeoutRefs.current.push(t1)
      } else {
        // Hide outline, show tiles unflipped
        setOutlineOpen(false)
        setFlippedTiles({})
      }
      return
    } else if (viewMode === 'cards') {
      // Toggle all sections expanded/collapsed
      setFlippedTiles(prev => {
        return prev._allExpanded ? {} : { _allExpanded: true }
      })
      return
    } else {
      setFlippedTiles(prev => ({ ...prev, [globalIndex]: !prev[globalIndex] }))
    }
  }

  // Get back content for a tile
  const getBackContent = (fc, globalIndex) => {
    if (viewMode === 'outline') {
      const sectionIdx = tileToSection[globalIndex]
      const section = sectionIdx >= 0 ? sections[sectionIdx] : null
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <span className="text-emerald-600 text-[10px] font-medium text-center leading-tight line-clamp-3">
            {section?.title || ''}
          </span>
        </div>
      )
    }
    if (viewMode === 'cards') {
      const sectionIdx = tileToSection[globalIndex]
      const section = sectionIdx >= 0 ? sections[sectionIdx] : null
      if (!section || globalIndex !== section.startIdx) {
        return <div className="w-full h-full" />
      }
      return (
        <div className="w-full h-full p-2 overflow-auto">
          <h3 className="font-semibold text-emerald-600 text-xs mb-1 line-clamp-1">
            {section.title}
          </h3>
          <div className="text-gray-700 text-[10px] leading-relaxed">
            {renderContent(section.content)}
          </div>
        </div>
      )
    }
    // Flash mode
    return (
      <div className="h-full flex flex-col p-4 relative">
        {onEditFlashcard && (
          <button
            className="absolute top-1 right-1 p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setEditingIndex(globalIndex)
              setEditQuestion(fc.question)
              setEditAnswer(fc.answer)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
            </svg>
          </button>
        )}
        <div className="text-emerald-600 font-medium text-sm mb-3 line-clamp-2">
          {fc.question}
        </div>
        <div className="flex-1 overflow-auto">
          <p className="text-gray-700 leading-relaxed">{fc.answer}</p>
        </div>
      </div>
    )
  }

  // Get front content for a tile
  const getFrontContent = (fc, globalIndex) => {
    if (viewMode === 'flashcards') {
      return (
        <div className="text-center p-4">
          <span className="text-white font-semibold text-lg drop-shadow-md line-clamp-5">
            {fc.question}
          </span>
        </div>
      )
    }
    return null
  }

  // Simple markdown rendering
  const renderContent = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return <br key={i} />
      const formatted = trimmed.replace(/\*{2,4}(.+?)\*{2,4}/g, '<strong>$1</strong>')
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
      return (
        <p key={i} className={`${isBullet ? 'pl-3' : ''} mb-1`}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      )
    })
  }

  // Build grid items based on viewMode
  const gridItems = useMemo(() => {
    const items = []

    if (viewMode === 'cards') {
      if (flippedTiles._allExpanded) {
        // Show all sections as large content cards stacked vertically
        sections.forEach((section, sIdx) => {
          if (section.count === 0) return
          items.push({ type: 'expanded', section, sectionIdx: sIdx })
        })
      } else {
        // Show tiles grouped by section with subtle labels
        sections.forEach((section, sIdx) => {
          if (section.count === 0) return
          items.push({ type: 'label', title: section.title, sectionIdx: sIdx })
          for (let i = section.startIdx; i < section.endIdx; i++) {
            items.push({ type: 'tile', globalIndex: i, fc: effectiveTiles[i] })
          }
        })
      }
    } else if (viewMode === 'flashcards') {
      effectiveTiles.forEach((fc, i) => {
        items.push({ type: 'tile', globalIndex: i, fc })
      })
    } else {
      // Outline mode: all tiles flat in 4-col grid
      effectiveTiles.forEach((fc, i) => {
        items.push({ type: 'tile', globalIndex: i, fc })
      })
    }

    return items
  }, [viewMode, sections, effectiveTiles, flippedTiles])

  // Container styles
  const cardsExpanded = viewMode === 'cards' && flippedTiles._allExpanded
  const containerStyle = viewMode === 'outline'
    ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '1rem', gap: '0.5rem' }
    : viewMode === 'cards' && !cardsExpanded
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', padding: '1rem', gap: '0.5rem' }
    : viewMode === 'cards' && cardsExpanded
    ? { display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem' }
    : { display: 'flex', flexDirection: 'column', padding: '1rem 1rem', gap: '1.5rem' }

  const containerClass = viewMode === 'flashcards'
    ? 'h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory'
    : ''

  return (
    <>
      {!outlineOpen && <motion.div
        className={containerClass}
        style={containerStyle}
        animate={merging ? { gap: '0px' } : {}}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {gridItems.map((item) => {
          if (item.type === 'label') {
            return (
              <div
                key={`label-${item.sectionIdx}`}
                style={{ gridColumn: '1 / -1' }}
                className={`px-1 ${item.sectionIdx > 0 ? 'pt-3' : ''}`}
              >
                <span className="text-xs text-gray-400 font-medium">
                  {item.title.replace(/\*{2,4}/g, '')}
                </span>
              </div>
            )
          }

          if (item.type === 'expanded') {
            const { section, sectionIdx } = item
            return (
              <div
                key={`expanded-${sectionIdx}`}
                className={`rounded-xl overflow-hidden shadow-md cursor-pointer bg-gradient-to-br ${gradient} relative`}
                onClick={() => handleTileClick(section.startIdx)}
              >
                <TilePattern patternId={patternId} opacity={0.12} />
                <div className="absolute inset-2 bg-white rounded-lg" />
                <div className="relative z-10 p-5">
                  <h3 className="font-semibold text-emerald-600 text-base mb-2">
                    {section.title.replace(/\*{2,4}/g, '')}
                  </h3>
                  <div className="text-gray-700 text-sm leading-relaxed">
                    {renderContent(section.content)}
                  </div>
                </div>
              </div>
            )
          }

          const { globalIndex, fc } = item
          const isFlipped = !!flippedTiles[globalIndex]

          // Flash mode: large tile with snap
          if (viewMode === 'flashcards') {
            return (
              <div
                key={`wrap-${globalIndex}`}
                className="snap-center max-w-sm mx-auto w-full"
                style={{ scrollSnapAlign: 'center' }}
              >
                <div className="aspect-square">
                  <Tile
                    isFlipped={isFlipped}
                    gradient={gradient}
                    patternId={patternId}
                    onClick={() => handleTileClick(globalIndex)}
                    frontContent={getFrontContent(fc, globalIndex)}
                    backContent={getBackContent(fc, globalIndex)}
                  />
                </div>
                <div className="text-center mt-3 text-gray-400 text-sm">
                  {globalIndex + 1} / {effectiveTiles.length}
                </div>
              </div>
            )
          }

          // Grid tiles (Slate/Tiles modes)
          return (
            <div
              key={`tile-${globalIndex}`}
              className="aspect-square"
            >
              <Tile
                isFlipped={isFlipped}
                merging={merging}
                gradient={gradient}
                patternId={patternId}
                onClick={() => handleTileClick(globalIndex)}
                frontContent={getFrontContent(fc, globalIndex)}
                backContent={getBackContent(fc, globalIndex)}
              />
            </div>
          )
        })}
      </motion.div>}

      {/* Slate mode: outline content replaces tiles */}
      {viewMode === 'outline' && outlineOpen && (
        <div className="px-4 pb-8 cursor-pointer" onClick={() => handleTileClick(0)}>
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
              {deckName}
            </h2>
            <div className="space-y-6">
              {outlineSections.map((section, idx) => (
                <div key={idx} className="border-b border-gray-100 pb-6 last:border-0">
                  <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                    {idx + 1}. {section.title}
                  </h3>
                  <div className="text-gray-700 leading-relaxed">
                    {renderContent(section.content || section.concept)}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-6 text-gray-400 text-sm">
              Click anywhere to show tiles
            </div>
          </div>
        </div>
      )}

      {/* Slate mode: tap hint (only when not showing content) */}
      {viewMode === 'outline' && !outlineOpen && (
        <div className="text-center py-2 text-gray-400 text-sm">
          Tap to reveal full slate
        </div>
      )}

      {/* Flash mode: progress dots */}
      {viewMode === 'flashcards' && (
        <div className="flex justify-center py-4">
          <div className="flex gap-1">
            {effectiveTiles.slice(0, Math.min(10, effectiveTiles.length)).map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  flippedTiles[idx] ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            ))}
            {effectiveTiles.length > 10 && (
              <span className="text-gray-400 text-xs ml-1">
                +{effectiveTiles.length - 10}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit flashcard modal */}
      {editingIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingIndex(null)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-800 mb-3">Edit Flashcard</h3>
            <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
              value={editQuestion}
              onChange={(e) => setEditQuestion(e.target.value)}
            />
            <label className="block text-xs font-medium text-gray-500 mb-1">Answer</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={4}
              value={editAnswer}
              onChange={(e) => setEditAnswer(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setEditingIndex(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                onClick={() => {
                  if (onEditFlashcard) {
                    onEditFlashcard(editingIndex, editQuestion, editAnswer)
                  }
                  setEditingIndex(null)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
