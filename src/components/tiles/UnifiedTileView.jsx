import { useState, useEffect, useRef, useMemo } from 'react'
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
  const [transitionPhase, setTransitionPhase] = useState(null) // null | 'flip' | 'merge' | 'shatter' | 'flip-back'
  const prevViewMode = useRef(viewMode)
  const timeoutRefs = useRef([])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => timeoutRefs.current.forEach(t => clearTimeout(t))
  }, [])

  // Orchestrate transitions when viewMode changes
  useEffect(() => {
    const prev = prevViewMode.current
    prevViewMode.current = viewMode

    // Clear pending timeouts from previous transitions
    timeoutRefs.current.forEach(t => clearTimeout(t))
    timeoutRefs.current = []

    if (prev === 'cards' && viewMode === 'outline') {
      // Tiles → Slate: flip then merge
      setTransitionPhase('flip')
      const allFlipped = {}
      effectiveTiles.forEach((_, i) => { allFlipped[i] = true })
      setFlippedTiles(allFlipped)

      const t1 = setTimeout(() => {
        setTransitionPhase('merge')
        const t2 = setTimeout(() => {
          setTransitionPhase(null)
          setOutlineOpen(true)
        }, 350)
        timeoutRefs.current.push(t2)
      }, 350)
      timeoutRefs.current.push(t1)
    } else if (prev === 'outline' && viewMode === 'cards') {
      // Slate → Tiles: shatter then flip back
      setOutlineOpen(false)
      setTransitionPhase('shatter')
      const allFlipped = {}
      effectiveTiles.forEach((_, i) => { allFlipped[i] = true })
      setFlippedTiles(allFlipped)

      const t1 = setTimeout(() => {
        setTransitionPhase('flip-back')
        setFlippedTiles({})
        const t2 = setTimeout(() => {
          setTransitionPhase(null)
        }, 350)
        timeoutRefs.current.push(t2)
      }, 350)
      timeoutRefs.current.push(t1)
    } else {
      // Other transitions: instant
      setFlippedTiles({})
      setOutlineOpen(false)
      setTransitionPhase(null)
    }
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

  // Pre-compute section ranges
  const { sections, tileToSection } = useMemo(() => {
    const secs = []
    const t2s = {}
    let idx = 0
    for (const card of allCards) {
      const cardTiles = effectiveTiles.filter(fc => fc.sectionTitle === card.title)
      const startIdx = idx
      cardTiles.forEach(() => {
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
    while (idx < effectiveTiles.length) {
      t2s[idx] = -1
      idx++
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
    // Ignore clicks during transitions
    if (transitionPhase) return

    if (viewMode === 'outline') {
      const allFlipped = !flippedTiles[0]
      const newState = {}
      effectiveTiles.forEach((_, i) => { newState[i] = allFlipped })
      setFlippedTiles(newState)
      setOutlineOpen(allFlipped)
    } else if (viewMode === 'cards') {
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
      setFlippedTiles(prev => ({ ...prev, [globalIndex]: !prev[globalIndex] }))
    }
  }

  // Get back content for a tile
  const getBackContent = (fc, globalIndex) => {
    // During transitions, show outline-style backs (section titles)
    if (transitionPhase) {
      const sectionIdx = tileToSection[globalIndex]
      const section = sectionIdx >= 0 ? sections[sectionIdx] : null
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <span className="text-emerald-600 text-[10px] font-medium text-center leading-tight line-clamp-3">
            {section?.title?.replace(/\*{2,4}/g, '') || ''}
          </span>
        </div>
      )
    }

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

  // Determine the visual layout mode (during transitions, keep the source layout)
  const visualMode = transitionPhase ? (
    // During tiles→slate transitions, keep cards (2-col) grid
    // During slate→tiles transitions, also use cards (2-col) grid
    'cards'
  ) : viewMode

  // Build grid items based on visual mode
  const gridItems = useMemo(() => {
    const items = []

    if (visualMode === 'cards') {
      // During transitions OR normal cards mode: use 2-col grid with section headers
      // But during transitions, don't merge — show individual tiles
      const isTransitioning = !!transitionPhase
      sections.forEach((section, sIdx) => {
        if (section.count === 0) return
        if (!isTransitioning) {
          items.push({ type: 'header', section, sectionIdx: sIdx })
        }
        if (!isTransitioning && flippedTiles[section.startIdx]) {
          items.push({ type: 'merged', section, sectionIdx: sIdx })
        } else {
          for (let i = section.startIdx; i < section.endIdx; i++) {
            items.push({ type: 'tile', globalIndex: i, fc: effectiveTiles[i] })
          }
        }
      })
    } else if (visualMode === 'flashcards') {
      effectiveTiles.forEach((fc, i) => {
        items.push({ type: 'tile', globalIndex: i, fc })
      })
    } else {
      // Outline mode (no transition): all tiles flat
      effectiveTiles.forEach((fc, i) => {
        items.push({ type: 'tile', globalIndex: i, fc })
      })
    }

    return items
  }, [visualMode, sections, effectiveTiles, flippedTiles, transitionPhase])

  // Container styles — use visualMode for layout during transitions
  const isMerging = transitionPhase === 'merge'
  const containerStyle = visualMode === 'outline'
    ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '1rem' }
    : visualMode === 'cards'
    ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', padding: '1rem' }
    : { display: 'flex', flexDirection: 'column', padding: '1rem 1rem' }

  const containerClass = visualMode === 'flashcards'
    ? 'h-[calc(100vh-180px)] overflow-y-auto snap-y snap-mandatory'
    : visualMode === 'cards'
    ? 'h-[calc(100vh-180px)] overflow-y-auto'
    : ''

  // Animated gap value
  const animatedGap = isMerging ? '0px'
    : visualMode === 'flashcards' ? '1.5rem'
    : '0.5rem'

  return (
    <LayoutGroup>
      <motion.div
        className={containerClass}
        style={containerStyle}
        animate={{ gap: animatedGap }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {gridItems.map((item) => {
          if (item.type === 'header') {
            return (
              <div
                key={`header-${item.sectionIdx}`}
                style={{ gridColumn: '1 / -1' }}
                className={`text-center py-3 ${item.sectionIdx > 0 ? 'mt-4' : ''}`}
              >
                <span className="text-sm font-medium text-gray-600">
                  {item.section.title.replace(/\*{2,4}/g, '')}
                </span>
              </div>
            )
          }

          if (item.type === 'merged') {
            const { section, sectionIdx } = item
            return (
              <div
                key={`merged-${sectionIdx}`}
                style={{ gridColumn: '1 / -1' }}
                className="rounded-xl bg-white shadow-lg border border-gray-200 cursor-pointer"
                onClick={() => handleTileClick(section.startIdx)}
              >
                <div className="p-5">
                  <h3 className="font-semibold text-emerald-600 text-lg mb-3">
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
          if (visualMode === 'flashcards') {
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
                  {globalIndex + 1} / {effectiveTiles.length}
                </div>
              </div>
            )
          }

          // Grid tiles (Slate/Tiles modes + transitions)
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
                merging={isMerging}
                gradient={gradient}
                patternId={patternId}
                onClick={() => handleTileClick(globalIndex)}
                frontContent={getFrontContent(fc, globalIndex)}
                backContent={getBackContent(fc, globalIndex)}
              />
            </motion.div>
          )
        })}
      </motion.div>

      {/* Slate mode: inline outline content (replaces full-screen overlay) */}
      <AnimatePresence>
        {viewMode === 'outline' && outlineOpen && !transitionPhase && (
          <motion.div
            className="px-4 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
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
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {section.content || section.concept}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slate mode: tap hint (only when not showing content) */}
      {viewMode === 'outline' && !outlineOpen && !transitionPhase && (
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
    </LayoutGroup>
  )
}
