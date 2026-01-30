import { useState, useEffect, useMemo } from 'react'
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion'
import Tile from './Tile'

export default function UnifiedTileView({
  viewMode = 'outline',
  allFlashcards = [],
  allCards = [],
  outline,
  deckName = '',
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric'
}) {
  const [flippedTiles, setFlippedTiles] = useState({})
  const [outlineOpen, setOutlineOpen] = useState(false)

  // Reset flip state when view mode changes
  useEffect(() => {
    setFlippedTiles({})
    setOutlineOpen(false)
  }, [viewMode])

  // Pre-compute section ranges: which flashcard indices belong to which section
  const { sections, tileToSection } = useMemo(() => {
    const secs = []
    const t2s = {}
    let idx = 0
    for (const card of allCards) {
      const cardFlashcards = allFlashcards.filter(fc => fc.sectionTitle === card.title)
      const startIdx = idx
      cardFlashcards.forEach((_, fi) => {
        t2s[idx] = secs.length
        idx++
      })
      secs.push({
        title: card.title,
        content: card.content || card.concept || '',
        startIdx,
        endIdx: idx,
        count: idx - startIdx
      })
    }
    // Handle any flashcards that didn't match a section
    while (idx < allFlashcards.length) {
      t2s[idx] = -1
      idx++
    }
    return { sections: secs, tileToSection: t2s }
  }, [allFlashcards, allCards])

  // Combine outline sections for overlay
  const outlineSections = useMemo(() => [
    ...(outline?.core || []),
    ...(outline?.deep_dive || [])
  ], [outline])

  // Click handlers per mode
  const handleTileClick = (globalIndex) => {
    if (viewMode === 'outline') {
      // Flip all tiles + show overlay
      const allFlipped = !flippedTiles[0]
      const newState = {}
      allFlashcards.forEach((_, i) => { newState[i] = allFlipped })
      setFlippedTiles(newState)
      setOutlineOpen(allFlipped)
    } else if (viewMode === 'cards') {
      // Flip all tiles in the same section
      const sectionIdx = tileToSection[globalIndex]
      if (sectionIdx === undefined || sectionIdx < 0) return
      const section = sections[sectionIdx]
      const isCurrentlyFlipped = flippedTiles[section.startIdx]
      const newState = { ...flippedTiles }
      for (let i = section.startIdx; i < section.endIdx; i++) {
        newState[i] = !isCurrentlyFlipped
      }
      setFlippedTiles(newState)
    } else {
      // Flash: flip individual tile
      setFlippedTiles(prev => ({ ...prev, [globalIndex]: !prev[globalIndex] }))
    }
  }

  // Get back content for a tile based on view mode
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
      return <div className="w-full h-full" />
    }
    // Flash mode
    return (
      <div className="h-full flex flex-col p-4">
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
    return null // outline and cards: just pattern
  }

  // Simple markdown rendering for cards overlay
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

  // Build the grid items: interleave section headers (cards mode) with tiles
  const gridItems = useMemo(() => {
    const items = []

    if (viewMode === 'cards') {
      sections.forEach((section, sIdx) => {
        if (section.count === 0) return
        // Section header
        items.push({ type: 'header', section, sectionIdx: sIdx })
        // Tiles for this section
        for (let i = section.startIdx; i < section.endIdx; i++) {
          items.push({ type: 'tile', globalIndex: i, fc: allFlashcards[i] })
        }
      })
    } else {
      // Outline and Flash: just tiles
      allFlashcards.forEach((fc, i) => {
        items.push({ type: 'tile', globalIndex: i, fc })
      })
    }

    return items
  }, [viewMode, sections, allFlashcards])

  // Container styles per mode
  const containerStyle = viewMode === 'outline'
    ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '1rem' }
    : viewMode === 'cards'
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', padding: '1rem' }
    : { display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 1rem' }

  const containerClass = viewMode === 'flashcards'
    ? 'h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory'
    : viewMode === 'cards'
    ? 'h-[calc(100vh-180px)] overflow-y-auto'
    : ''

  return (
    <LayoutGroup>
      <div className={containerClass} style={containerStyle}>
        {gridItems.map((item) => {
          if (item.type === 'header') {
            return (
              <div
                key={`header-${item.sectionIdx}`}
                style={{ gridColumn: '1 / -1' }}
                className={`text-center py-3 ${item.sectionIdx > 0 ? 'mt-4' : ''}`}
              >
                <span className="text-sm font-medium text-gray-600">
                  {item.section.title}
                </span>
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
                <motion.div
                  layout
                  layoutId={`tile-${globalIndex}`}
                  transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
                  className="aspect-square"
                >
                  <Tile
                    isFlipped={isFlipped}
                    gradient={gradient}
                    patternId={patternId}
                    onClick={() => handleTileClick(globalIndex)}
                    frontContent={getFrontContent(fc, globalIndex)}
                    backContent={getBackContent(fc, globalIndex)}
                  />
                </motion.div>
                <div className="text-center mt-3 text-gray-400 text-sm">
                  {globalIndex + 1} / {allFlashcards.length}
                </div>
              </div>
            )
          }

          // Outline + Cards: tiles in grid
          return (
            <motion.div
              key={`tile-${globalIndex}`}
              layout
              layoutId={`tile-${globalIndex}`}
              transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
              className="aspect-square"
            >
              <Tile
                isFlipped={isFlipped}
                gradient={gradient}
                patternId={patternId}
                onClick={() => handleTileClick(globalIndex)}
                frontContent={getFrontContent(fc, globalIndex)}
                backContent={getBackContent(fc, globalIndex)}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Cards mode: section content overlays */}
      {viewMode === 'cards' && sections.map((section, sIdx) => {
        const isFlipped = flippedTiles[section.startIdx]
        if (!isFlipped) return null
        return (
          <motion.div
            key={`content-${sIdx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4 rounded-xl bg-white shadow-lg overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                {section.title}
              </h3>
              <div className="text-gray-700 text-sm leading-relaxed">
                {renderContent(section.content)}
              </div>
            </div>
          </motion.div>
        )
      })}

      {/* Outline mode: tap hint */}
      {viewMode === 'outline' && !outlineOpen && (
        <div className="text-center py-2 text-gray-400 text-sm">
          Tap to reveal outline
        </div>
      )}

      {/* Outline mode: full-screen overlay */}
      <AnimatePresence>
        {viewMode === 'outline' && outlineOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-white/98 backdrop-blur-sm overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              setFlippedTiles({})
              setOutlineOpen(false)
            }}
          >
            <div className="max-w-lg mx-auto p-6 pt-20 pb-32">
              <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
                {deckName}
              </h2>
              <div className="space-y-6">
                {outlineSections.map((section, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-6 last:border-0">
                    <h3 className="font-semibold text-emerald-600 text-lg mb-3">
                      {idx + 1}. {section.title}
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {section.content || section.concept}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center py-8 text-gray-400 text-sm">
                Tap anywhere to close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash mode: progress dots */}
      {viewMode === 'flashcards' && (
        <div className="flex justify-center py-4">
          <div className="flex gap-1">
            {allFlashcards.slice(0, Math.min(10, allFlashcards.length)).map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  flippedTiles[idx] ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            ))}
            {allFlashcards.length > 10 && (
              <span className="text-gray-400 text-xs ml-1">
                +{allFlashcards.length - 10}
              </span>
            )}
          </div>
        </div>
      )}
    </LayoutGroup>
  )
}
