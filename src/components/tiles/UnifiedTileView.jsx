import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import Tile from './Tile'
import { TilePattern } from './TilePatterns'

const LAYOUT_TRANSITION = { duration: 0.45, ease: [0.4, 0, 0.2, 1] }

export default function UnifiedTileView({
  viewMode = 'outline',
  allFlashcards = [],
  allCards = [],
  outline,
  deckName = '',
  gradient = 'from-emerald-400 via-emerald-500 to-emerald-600',
  patternId = 'geometric',
  onEditFlashcard,
  onSlateClick,
}) {
  const [flippedTiles, setFlippedTiles] = useState({})
  const [slateMerging, setSlateMerging] = useState(false)
  const [slateMerged, setSlateMerged] = useState(false)
  const [slateReversing, setSlateReversing] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselFlipped, setCarouselFlipped] = useState({})
  const touchStart = useRef(null)
  const touchDelta = useRef(0)
  const swipeDirection = useRef(0)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const slateTimers = useRef([])
  const hasPlayedSlate = useRef(false)
  const activeMode = viewMode

  // Reset all state when mode changes
  useEffect(() => {
    slateTimers.current.forEach(t => clearTimeout(t))
    slateTimers.current = []
    setFlippedTiles({})
    setSlateReversing(false)
    setCarouselIndex(0)
    setCarouselFlipped({})

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

  // Keyboard arrow keys for carousel navigation (Tiles and Flash)
  useEffect(() => {
    if (activeMode !== 'cards' && activeMode !== 'flashcards') return
    const maxIdx = activeMode === 'flashcards' ? allFlashcards.length - 1 : sections.length - 1
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' && carouselIndex < maxIdx) {
        swipeDirection.current = 1
        setCarouselIndex(prev => prev + 1)
      } else if (e.key === 'ArrowLeft' && carouselIndex > 0) {
        swipeDirection.current = -1
        setCarouselIndex(prev => prev - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeMode, carouselIndex, allFlashcards.length])

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

  const hasFlashcards = allFlashcards.length > 0

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

  // Click handler for carousel tile flip (Tiles and Flash)
  const handleCarouselFlip = () => {
    setCarouselFlipped(prev => ({ ...prev, [carouselIndex]: !prev[carouselIndex] }))
  }

  // Swipe handlers for carousel
  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX
    touchDelta.current = 0
  }
  const handleTouchMove = (e) => {
    if (touchStart.current !== null) {
      touchDelta.current = e.touches[0].clientX - touchStart.current
    }
  }
  const handleTouchEnd = (maxIdx) => {
    if (Math.abs(touchDelta.current) > 50) {
      if (touchDelta.current < 0 && carouselIndex < maxIdx) {
        swipeDirection.current = 1
        setCarouselIndex(prev => prev + 1)
      } else if (touchDelta.current > 0 && carouselIndex > 0) {
        swipeDirection.current = -1
        setCarouselIndex(prev => prev - 1)
      }
    }
    touchStart.current = null
    touchDelta.current = 0
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
  const flashLoading = activeMode === 'flashcards' && !hasFlashcards
  const cardsLoading = activeMode === 'cards' && sections.length === 0

  if (slateLoading || flashLoading || cardsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">
          {slateLoading ? 'Building outline...' : flashLoading ? 'Creating flashcards...' : 'Loading cards...'}
        </p>
      </div>
    )
  }

  // Carousel renderer shared by Tiles and Flash
  const renderCarousel = (items, renderSlide) => {
    const maxIdx = items.length - 1
    return (
      <div
        className="px-4 pb-4 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd(maxIdx)}
      >
        <AnimatePresence mode="wait" custom={swipeDirection.current}>
          <motion.div
            key={carouselIndex}
            custom={swipeDirection.current}
            initial="enter"
            animate="center"
            exit="exit"
            variants={{
              enter: (dir) => ({ x: dir >= 0 ? 300 : -300, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir) => ({ x: dir >= 0 ? -300 : 300, opacity: 0 }),
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderSlide(carouselIndex)}
          </motion.div>
        </AnimatePresence>

        {/* Progress indicator with arrows */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${carouselIndex > 0 ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'text-gray-200 cursor-default'}`}
            onClick={() => {
              if (carouselIndex > 0) {
                swipeDirection.current = -1
                setCarouselIndex(prev => prev - 1)
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1.5">
            {items.length <= 15 ? items.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${idx === carouselIndex ? 'bg-emerald-500 scale-125' : 'bg-gray-300'}`}
                onClick={() => {
                  swipeDirection.current = idx > carouselIndex ? 1 : -1
                  setCarouselIndex(idx)
                }}
              />
            )) : (
              <span className="text-xs text-gray-400">
                {carouselIndex + 1} / {items.length}
              </span>
            )}
          </div>
          <button
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${carouselIndex < maxIdx ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'text-gray-200 cursor-default'}`}
            onClick={() => {
              if (carouselIndex < maxIdx) {
                swipeDirection.current = 1
                setCarouselIndex(prev => prev + 1)
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          {items.length <= 15 && (
            <span className="text-xs text-gray-400 ml-1">
              {carouselIndex + 1} / {items.length}
            </span>
          )}
        </div>
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

      {/* Tiles (cards) mode: tall content cards carousel */}
      {activeMode === 'cards' && sections.length > 0 && renderCarousel(
        sections,
        (idx) => {
          const section = sections[idx]
          if (!section) return null

          return (
            <div className="max-w-sm mx-auto w-full" style={{ height: 'calc(100vh - 260px)', minHeight: '400px' }}>
              <div className={`h-full rounded-xl overflow-hidden shadow-md bg-gradient-to-br ${gradient} relative`}>
                <TilePattern patternId={patternId} opacity={0.12} />
                <div className="absolute inset-2 bg-white rounded-lg" />
                <div className="absolute inset-2 z-10 overflow-y-auto p-4 pb-6 hide-scrollbar">
                  <h3 className="font-semibold text-emerald-600 text-base mb-3">
                    {section.title?.replace(/\*{2,4}/g, '')}
                  </h3>
                  <div className="text-gray-700 text-base leading-relaxed">
                    {renderContent(section.content)}
                  </div>
                </div>
              </div>
            </div>
          )
        },
      )}

      {/* Flash mode: tall flashcard carousel with tap-to-flip */}
      {activeMode === 'flashcards' && allFlashcards.length > 0 && renderCarousel(
        allFlashcards,
        (idx) => {
          const fc = allFlashcards[idx]
          if (!fc) return null
          const isFlipped = !!carouselFlipped[idx]

          return (
            <div className="max-w-sm mx-auto w-full cursor-pointer" onClick={handleCarouselFlip} style={{ perspective: '1000px', height: 'calc(100vh - 260px)', minHeight: '400px' }}>
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
              >
                {/* Front: gradient + pattern + question */}
                <div
                  className={`absolute inset-0 rounded-xl overflow-hidden shadow-md bg-gradient-to-br ${gradient}`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <TilePattern patternId={patternId} />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <span className="text-white font-semibold text-lg text-center drop-shadow-md leading-snug">
                      {fc.question}
                    </span>
                  </div>
                </div>
                {/* Back: gradient border + white center + Q&A */}
                <div
                  className={`absolute inset-0 rounded-xl overflow-hidden shadow-md bg-gradient-to-br ${gradient}`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <TilePattern patternId={patternId} opacity={0.12} />
                  <div className="absolute inset-2 bg-white rounded-lg" />
                  <div className="absolute inset-2 z-10 overflow-y-auto p-4 pb-6 hide-scrollbar">
                    {onEditFlashcard && (
                      <button
                        className="absolute top-1 right-1 p-1.5 text-gray-300 hover:text-gray-500 transition-colors z-20"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingIndex(idx)
                          setEditQuestion(fc.question)
                          setEditAnswer(fc.answer)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
                        </svg>
                      </button>
                    )}
                    <div className="text-emerald-600 font-medium text-base mb-3">
                      {fc.question}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{fc.answer}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        },
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
