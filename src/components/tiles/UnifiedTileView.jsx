import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Tile from './Tile'
import { TilePattern } from './TilePatterns'

const LAYOUT_TRANSITION = { duration: 0.45, ease: [0.4, 0, 0.2, 1] }

export default function UnifiedTileView({
  viewMode = 'outline',
  allCards = [],
  outline,
  deckName = '',
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric',
  onSlateClick,
  isStreaming = false,
  streamingContent = null,
}) {
  const [flippedTiles, setFlippedTiles] = useState({})
  const [slateMerging, setSlateMerging] = useState(false)
  const [slateMerged, setSlateMerged] = useState(false)
  const [slateReversing, setSlateReversing] = useState(false)
  const slateTimers = useRef([])
  const hasPlayedSlate = useRef(false)
  const activeMode = viewMode

  // Reset all state when mode changes
  useEffect(() => {
    slateTimers.current.forEach(t => clearTimeout(t))
    slateTimers.current = []
    setFlippedTiles({})
    setSlateReversing(false)

    if (activeMode === 'outline' && hasPlayedSlate.current) {
      // Already seen animation — show outline directly
      setSlateMerging(true)
      setSlateMerged(true)
    } else if (activeMode === 'outline' && !hasPlayedSlate.current) {
      // First time — auto-trigger flip animation after tiles render
      setSlateMerging(false)
      setSlateMerged(false)
      const t0 = setTimeout(() => {
        setFlippedTiles(() => {
          const newState = {}
          for (let i = 0; i < 9; i++) newState[i] = true
          return newState
        })
        const t1 = setTimeout(() => {
          setSlateMerging(true)
          const t2 = setTimeout(() => {
            setSlateMerged(true)
            hasPlayedSlate.current = true
          }, 400)
          slateTimers.current.push(t2)
        }, 450)
        slateTimers.current.push(t1)
      }, 200)
      slateTimers.current.push(t0)
    } else {
      setSlateMerging(false)
      setSlateMerged(false)
    }
  }, [activeMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => slateTimers.current.forEach(t => clearTimeout(t))
  }, [])

  // Sections from allCards (one tile per section for Slate and Tiles)
  const sections = useMemo(() => {
    return allCards.map((card, idx) => ({
      title: card.title,
      content: card.content || card.concept || '',
      index: idx,
    }))
  }, [allCards])

  // Combine outline sections for Slate content display
  const outlineSections = useMemo(() => [
    ...(outline?.core || []),
    ...(outline?.deep_dive || [])
  ], [outline])


  // Click handler for Slate tiles
  const handleSlateClick = () => {
    if (slateMerged) {
      setSlateReversing(true)
      setSlateMerged(false)
      const t1 = setTimeout(() => {
        setSlateMerging(false)
        const t2 = setTimeout(() => {
          setFlippedTiles({})
          setSlateReversing(false)
        }, 400)
        slateTimers.current.push(t2)
      }, 300)
      slateTimers.current.push(t1)
    } else if (!slateMerging) {
      const newState = {}
      sections.forEach((_, i) => { newState[i] = true })
      setFlippedTiles(newState)
      const t1 = setTimeout(() => {
        setSlateMerging(true)
        const t2 = setTimeout(() => {
          setSlateMerged(true)
          hasPlayedSlate.current = true
        }, 400)
        slateTimers.current.push(t2)
      }, 450)
      slateTimers.current.push(t1)
    }
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

  // Container styles — Slate only (Tiles and Flash use separate carousel)
  const containerStyle = useMemo(() => {
    if (activeMode === 'outline') {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: slateMerging ? '0px' : '6px',
        maxWidth: '400px',
        margin: '0 auto',
        padding: '0 1rem',
        ...((slateMerged && !slateReversing) ? { position: 'absolute', visibility: 'hidden' } : {})
      }
    }
    return { display: 'none' }
  }, [activeMode, sections.length, slateMerging, slateMerged, slateReversing])

  // Loading states
  const slateLoading = activeMode === 'outline' && outlineSections.length === 0
  const cardsLoading = activeMode === 'cards' && sections.length === 0 && !streamingContent

  if (slateLoading || cardsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">
          {slateLoading ? 'Building outline...' : 'Loading cards...'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Slate mode: tile grid */}
      {activeMode === 'outline' && (
        <LayoutGroup>
          <motion.div
            style={containerStyle}
            layout
            transition={LAYOUT_TRANSITION}
          >
            {sections.map((section, idx) => (
              <motion.div
                key={`tile-${idx}`}
                layoutId={`tile-${idx}`}
                layout
                transition={LAYOUT_TRANSITION}
                animate={{
                  opacity: (slateMerged && !slateReversing) ? 0 : 1,
                  scale: (slateMerged && !slateReversing) ? 0.8 : 1,
                  borderRadius: slateMerging ? '0px' : '8px',
                }}
                className="aspect-square overflow-hidden"
                style={{ pointerEvents: (slateMerged && !slateReversing) ? 'none' : 'auto' }}
              >
                <Tile
                  isFlipped={!!flippedTiles[idx]}
                  gradient={gradient}
                  patternId={patternId}
                  onClick={handleSlateClick}
                  backContent={
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <span className="text-emerald-600 text-[10px] font-medium text-center leading-tight line-clamp-3">
                        {section.title?.replace(/\*{2,4}/g, '') || ''}
                      </span>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      )}

      {/* Slate mode: full outline revealed after tiles merge */}
      <AnimatePresence>
        {activeMode === 'outline' && slateMerged && (
          <motion.div
            key="slate-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pb-8 cursor-pointer"
            style={{ maxWidth: '400px', margin: '0 auto', padding: '0 1rem' }}
            onClick={handleSlateClick}
          >
            <div className={`rounded-xl overflow-hidden shadow-md bg-gradient-to-br ${gradient} relative`}>
              <TilePattern patternId={patternId} opacity={0.12} />
              <div className="absolute inset-2 bg-white rounded-lg" />
              <div className="relative z-10 p-5">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards mode: single scrollable page with all sections */}
      {activeMode === 'cards' && (sections.length > 0 || streamingContent) && (
        <div className="px-4 pb-6">
          {/* While streaming: show only the live streaming text */}
          {streamingContent ? (
            <div className="text-gray-700 text-base leading-relaxed">
              {renderContent(streamingContent)}
              <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse rounded-sm" style={{ verticalAlign: 'text-bottom' }} />
            </div>
          ) : (
            /* After streaming: show completed sections */
            sections.map((section, idx) => (
              <div key={section.title || idx} className={idx > 0 ? 'mt-6' : ''}>
                <h3 className="font-semibold text-emerald-600 text-base mb-3">
                  {section.title?.replace(/\*{2,4}/g, '')}
                </h3>
                <div className="text-gray-700 text-base leading-relaxed">
                  {renderContent(section.content)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </>
  )
}
