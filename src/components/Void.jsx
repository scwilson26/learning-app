import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import constellationData from '../data/constellation.json'
import {
  getVoidProgress,
  clearAllData,
  getFadingNotifiedTopics,
  markFadingNotified,
  recordVoidVisit,
  getLastVoidVisit
} from '../services/storage'
import { initWormholes } from '../systems/wormholes'
import { getPlayerStats } from '../systems/progression'
import { getTopicState, STAR_STATES } from '../systems/starStates'
import {
  checkAmbientTriggers,
  recordVisit,
  recordActivity,
  checkIdleTrigger,
  resetIdleTrigger
} from '../systems/ambientMessages'
import { getDailyTransmission } from '../systems/transmissions'
import { checkArchivistTrigger } from '../systems/characters'
import {
  checkLayer2Reveal,
  checkLayer3Hint,
  checkCenterGlow,
  getCenterGlowState,
  isFirstFade,
  markFadeExperienced
} from '../systems/revelation'

// Initialize wormhole system
const wormholeSystem = initWormholes(constellationData)

// Visual configuration for each star state
// Per master plan: brightness reflects knowledge, not access
const STAR_VISUALS = {
  undiscovered: {
    size: 2,
    opacity: 0.15,
    glowSize: 0,
    glowOpacity: 0,
  },
  discovered: {
    size: 4,
    opacity: 0.4,
    glowSize: 6,
    glowOpacity: 0.2,
  },
  learning: {
    size: 6,
    opacity: 0.6,
    glowSize: 10,
    glowOpacity: 0.3,
  },
  studied: {
    size: 8,
    opacity: 0.8,
    glowSize: 15,
    glowOpacity: 0.4,
  },
  mastered: {
    size: 10,
    opacity: 1.0,
    glowSize: 25,
    glowOpacity: 0.5,
    pulse: true,
  },
  fading: {
    size: 6,
    opacity: 0.4,
    glowSize: 8,
    glowOpacity: 0.2,
    flicker: true,
    warmShift: true, // Orange tint
  },
}

/**
 * The Void - Constellation home screen
 *
 * A dark canvas showing unlocked stars at their positions.
 * Pan and zoom to explore. Tap stars to navigate to topics.
 */
export default function Void({ onSelectTopic, onBack, isFirstEntry, onEntryComplete }) {
  // Pan and zoom state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const containerRef = useRef(null)

  // Entry animation state
  const [entryPhase, setEntryPhase] = useState(isFirstEntry ? 'black' : 'done')
  // 'black' → 'zoomed-out' → 'animating' → 'done'
  const [arrivalMessage, setArrivalMessage] = useState(null)

  // Fading narrative state (Phase 5)
  const [fadingMessage, setFadingMessage] = useState(null)

  // Ambient message state (Phase 6)
  const [ambientMessage, setAmbientMessage] = useState(null)

  // Daily transmission state (Phase 7)
  const [dailyTransmission, setDailyTransmission] = useState(null)

  // Archivist state (Phase 9)
  const [archivistData, setArchivistData] = useState(null)

  // Revelation state (Phase 10)
  const [revelationMessage, setRevelationMessage] = useState(null)
  const [centerGlow, setCenterGlow] = useState(null)

  // Get unlocked topics
  const voidProgress = useMemo(() => getVoidProgress(), [])
  const unlockedTopics = useMemo(() => {
    return voidProgress.unlockedTopics || []
  }, [voidProgress])

  // Calculate ALL stars with their state (no gates - all 1000 tappable)
  const allStars = useMemo(() => {
    return Object.entries(constellationData.topics).map(([id, topic]) => {
      const state = getTopicState(id)
      const visuals = STAR_VISUALS[state]
      return {
        id,
        ...topic,
        state,
        visuals,
      }
    })
  }, [voidProgress]) // Recalculate when progress changes

  // For backward compatibility (entry animation uses this)
  const visibleStars = useMemo(() => {
    return allStars.filter(star => unlockedTopics.includes(star.id))
  }, [allStars, unlockedTopics])

  // Calculate center of starting stars (for entry animation)
  const startingStarsCenter = useMemo(() => {
    if (visibleStars.length === 0) return { x: 0, y: 0 }

    const sumX = visibleStars.reduce((sum, star) => sum + star.x, 0)
    const sumY = visibleStars.reduce((sum, star) => sum + star.y, 0)

    return {
      x: sumX / visibleStars.length,
      y: sumY / visibleStars.length
    }
  }, [visibleStars])

  // Calculate visible wormholes
  const visibleWormholes = useMemo(() => {
    return wormholeSystem.visible(voidProgress)
  }, [voidProgress])

  // Get player stats and rank
  const stats = useMemo(() => {
    return getPlayerStats(voidProgress)
  }, [voidProgress])

  // Calculate mapped stars per cluster (for label visibility)
  // A star is "mapped" when user has captured at least 1 fragment from it
  const mappedPerCluster = useMemo(() => {
    const counts = {}
    const topicProgress = voidProgress.topicProgress || {}

    for (const [topicId, progress] of Object.entries(topicProgress)) {
      // capturedCards is an array of card IDs
      const capturedCount = progress.capturedCards?.length || 0
      if (capturedCount > 0) {
        const topic = constellationData.topics[topicId]
        if (topic) {
          const cluster = topic.cluster
          counts[cluster] = (counts[cluster] || 0) + 1
        }
      }
    }

    return counts
  }, [voidProgress])

  // Count mastered stars (for center glow Phase 10)
  const masteredCount = useMemo(() => {
    return allStars.filter(star => star.state === STAR_STATES.mastered).length
  }, [allStars])

  // Phase 5: Detect fading stars and show narrative message
  // Phase 10: Also check for Layer 2 reveal on first fade
  useEffect(() => {
    // Don't show during entry animation
    if (isFirstEntry && entryPhase !== 'done') return

    // Record this visit
    recordVoidVisit()

    // Find all currently fading stars
    const fadingStars = allStars.filter(star => star.state === STAR_STATES.fading)
    if (fadingStars.length === 0) return

    // Get list of already-notified topics
    const notifiedTopics = getFadingNotifiedTopics()

    // Find NEW fading stars (fading but not yet notified)
    const newlyFading = fadingStars.filter(star => !notifiedTopics.includes(star.id))
    if (newlyFading.length === 0) return

    // Mark these as notified so we don't spam
    newlyFading.forEach(star => markFadingNotified(star.id))

    // Phase 10: Check for Layer 2 reveal on first fade
    const firstFadeCheck = isFirstFade()
    if (firstFadeCheck) {
      markFadeExperienced()
      const layer2 = checkLayer2Reveal({
        hasFadingStars: true,
        isFirstFade: true
      })
      if (layer2) {
        // Layer 2 takes priority over fading message
        setTimeout(() => {
          setRevelationMessage(layer2.message)
          setTimeout(() => setRevelationMessage(null), 5000)
        }, 500)
        console.log(`[Void] Layer 2 reveal: "${layer2.message}"`)
        return // Don't show fading message, Layer 2 is more important
      }
    }

    // Choose narrative message based on count
    const fadingMessages = [
      '...something dims',
      '...signal fading',
      '...the light wavers',
      '...memories drift',
    ]

    let message
    if (newlyFading.length === 1) {
      // Single star fading
      message = fadingMessages[Math.floor(Math.random() * fadingMessages.length)]
    } else if (newlyFading.length <= 3) {
      // A few stars fading
      message = `...${newlyFading.length} signals fading`
    } else {
      // Many stars fading
      message = '...the void reclaims'
    }

    // Small delay to let the view settle
    setTimeout(() => {
      setFadingMessage(message)
      // Clear after display
      setTimeout(() => setFadingMessage(null), 3000)
    }, 500)

    console.log(`[Void] Fading notification: ${newlyFading.length} stars - "${message}"`)
  }, [allStars, isFirstEntry, entryPhase])

  // Phase 6: Check ambient triggers on mount (return, milestones, recovery)
  useEffect(() => {
    // Don't check during entry animation
    if (isFirstEntry && entryPhase !== 'done') return
    // Don't show if fading message is showing
    if (fadingMessage) return

    // Record visit and get previous visit time
    const previousVisit = recordVisit()

    // Check all ambient triggers
    const result = checkAmbientTriggers({
      voidProgress,
      allStars,
      wormholeCount: visibleWormholes.length,
      previousVisit
    })

    if (result) {
      // Small delay to let the view settle
      setTimeout(() => {
        setAmbientMessage(result.message)
        // Clear after display
        setTimeout(() => setAmbientMessage(null), 3500)
      }, 800)
      console.log(`[Void] Ambient message (${result.type}): "${result.message}"`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPhase]) // Only run when entry completes

  // Phase 6: Idle detection (30+ seconds of no interaction)
  useEffect(() => {
    if (entryPhase !== 'done') return

    const idleCheckInterval = setInterval(() => {
      // Don't show if another message is showing
      if (fadingMessage || ambientMessage || arrivalMessage) return

      const idleMsg = checkIdleTrigger()
      if (idleMsg) {
        setAmbientMessage(idleMsg)
        setTimeout(() => setAmbientMessage(null), 3000)
        console.log(`[Void] Idle message: "${idleMsg}"`)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(idleCheckInterval)
  }, [entryPhase, fadingMessage, ambientMessage, arrivalMessage])

  // Phase 7: Daily transmission (once per day, contextual)
  useEffect(() => {
    // Wait for entry animation and arrival message to clear
    if (entryPhase !== 'done') return
    if (arrivalMessage) return
    // Don't show if other messages are active
    if (fadingMessage || ambientMessage) return

    // Small delay after other messages
    const timer = setTimeout(() => {
      const transmission = getDailyTransmission({
        allStars,
        allWormholes: wormholeSystem.all,
        clusters: constellationData.clusters
      })

      if (transmission) {
        setDailyTransmission(transmission.message)
        // Clear after display (longer than ambient - this is the "main" message)
        setTimeout(() => setDailyTransmission(null), 4000)
      }
    }, 1500)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPhase, arrivalMessage, fadingMessage, ambientMessage])

  // Phase 9: Check for Archivist trigger (cluster mastery)
  useEffect(() => {
    // Wait for entry animation to complete
    if (entryPhase !== 'done') return
    // Wait for other messages to clear
    if (arrivalMessage || fadingMessage || ambientMessage || dailyTransmission) return

    // Delay to let other messages finish
    const timer = setTimeout(() => {
      const archivist = checkArchivistTrigger(allStars, constellationData.clusters)
      if (archivist) {
        setArchivistData(archivist)
      }
    }, 2000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPhase, arrivalMessage, fadingMessage, ambientMessage, dailyTransmission])

  // Phase 10: Update center glow state based on mastered count
  useEffect(() => {
    const glowState = getCenterGlowState(masteredCount)
    setCenterGlow(glowState)
  }, [masteredCount])

  // Phase 10: Check for Layer 2 reveal (day 3-5 realization)
  useEffect(() => {
    if (entryPhase !== 'done') return
    if (arrivalMessage || fadingMessage || ambientMessage || dailyTransmission) return
    if (revelationMessage) return

    // Check Layer 2 (realization trigger, not first-fade which is handled above)
    const fadingStars = allStars.filter(star => star.state === STAR_STATES.fading)
    const layer2 = checkLayer2Reveal({
      hasFadingStars: fadingStars.length > 0,
      isFirstFade: false // First fade handled in fading detection
    })

    if (layer2) {
      const timer = setTimeout(() => {
        setRevelationMessage(layer2.message)
        setTimeout(() => setRevelationMessage(null), 5000)
      }, 2500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPhase, arrivalMessage, fadingMessage, ambientMessage, dailyTransmission])

  // Phase 10: Check for Layer 3 hints (rare, deep mystery)
  useEffect(() => {
    if (entryPhase !== 'done') return
    if (arrivalMessage || fadingMessage || ambientMessage || dailyTransmission || revelationMessage) return
    if (archivistData) return // Don't interrupt Archivist

    const timer = setTimeout(() => {
      const layer3Msg = checkLayer3Hint()
      if (layer3Msg) {
        setRevelationMessage(layer3Msg)
        setTimeout(() => setRevelationMessage(null), 6000)
      }
    }, 4000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryPhase, arrivalMessage, fadingMessage, ambientMessage, dailyTransmission, archivistData])

  // Phase 10: Check for center glow milestone messages
  useEffect(() => {
    if (entryPhase !== 'done') return
    if (arrivalMessage || fadingMessage || ambientMessage || dailyTransmission || revelationMessage) return
    if (archivistData) return

    const timer = setTimeout(() => {
      const centerData = checkCenterGlow(masteredCount)
      if (centerData?.message) {
        setRevelationMessage(centerData.message)
        setTimeout(() => setRevelationMessage(null), 5000)
      }
    }, 3000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masteredCount, entryPhase])

  // Track if entry animation has started
  const entryStartedRef = useRef(false)

  // Entry animation sequence
  useEffect(() => {
    // Only run once when isFirstEntry is true
    if (!isFirstEntry || entryStartedRef.current) return
    entryStartedRef.current = true

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const screenCenterX = rect.width / 2
    const screenCenterY = rect.height / 2

    // Starting position: zoomed way out, centered on origin
    const startScale = 0.25
    const startOffsetX = screenCenterX
    const startOffsetY = screenCenterY

    // Target: center on starting stars at 0.8x zoom
    const targetScale = 0.8
    const targetOffsetX = screenCenterX - (startingStarsCenter.x * targetScale)
    const targetOffsetY = screenCenterY - (startingStarsCenter.y * targetScale)

    console.log('[Void] Starting entry animation', { startingStarsCenter, targetOffsetX, targetOffsetY })

    // Phase 1: After brief black, show zoomed-out view
    setTimeout(() => {
      setScale(startScale)
      setOffset({ x: startOffsetX, y: startOffsetY })
      setEntryPhase('zoomed-out')
    }, 300)

    // Phase 2: Start drift animation
    setTimeout(() => {
      setEntryPhase('animating')

      const duration = 2000
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out curve
        const eased = 1 - Math.pow(1 - progress, 3)

        setScale(startScale + (targetScale - startScale) * eased)
        setOffset({
          x: startOffsetX + (targetOffsetX - startOffsetX) * eased,
          y: startOffsetY + (targetOffsetY - startOffsetY) * eased
        })

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Animation complete
          setEntryPhase('done')
          setArrivalMessage('...signal detected')
          console.log('[Void] Entry animation complete')

          // Clear message after a moment
          setTimeout(() => {
            setArrivalMessage(null)
            onEntryComplete?.()
          }, 2000)
        }
      }

      requestAnimationFrame(animate)
    }, 800)
  }, [isFirstEntry, startingStarsCenter, onEntryComplete])

  // Normal center on first load (non-entry case)
  useEffect(() => {
    if (isFirstEntry) return // Entry animation handles positioning

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOffset({
        x: rect.width / 2,
        y: rect.height / 2
      })
    }
  }, [isFirstEntry])

  // Mouse/touch handlers for pan
  const handlePointerDown = (e) => {
    if (entryPhase !== 'done') return // Disable during entry animation
    if (e.target.closest('.star-button')) return // Don't drag when clicking stars

    // Phase 6: Record activity to reset idle timer
    recordActivity()
    resetIdleTrigger()

    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({
      x: dragStart.current.offsetX + dx,
      y: dragStart.current.offsetY + dy
    })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  // Wheel handler for zoom
  const handleWheel = (e) => {
    if (entryPhase !== 'done') return
    e.preventDefault()

    // Phase 6: Record activity to reset idle timer
    recordActivity()
    resetIdleTrigger()

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.min(Math.max(s * delta, 0.2), 2))
  }

  // Pinch zoom for touch
  const lastTouchDistance = useRef(null)
  const handleTouchMove = (e) => {
    if (entryPhase !== 'done') return

    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      if (lastTouchDistance.current !== null) {
        const delta = distance / lastTouchDistance.current
        setScale(s => Math.min(Math.max(s * delta, 0.2), 2))
      }
      lastTouchDistance.current = distance
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0]
      const dx = touch.clientX - dragStart.current.x
      const dy = touch.clientY - dragStart.current.y
      setOffset({
        x: dragStart.current.offsetX + dx,
        y: dragStart.current.offsetY + dy
      })
    }
  }

  const handleTouchEnd = () => {
    lastTouchDistance.current = null
    setIsDragging(false)
  }

  const handleTouchStart = (e) => {
    if (entryPhase !== 'done') return
    if (e.target.closest('.star-button')) return

    // Phase 6: Record activity to reset idle timer
    recordActivity()
    resetIdleTrigger()

    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        offsetX: offset.x,
        offsetY: offset.y
      }
    }
  }

  // Don't render stars during black phase
  const showContent = entryPhase !== 'black'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#0a0a0f] overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Star field container - fade in during entry */}
      <motion.div
        className="absolute"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
        initial={isFirstEntry ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Center glow - visible at 500+ mastered stars (Phase 10) */}
        {centerGlow && (
          <div
            className={`absolute rounded-full pointer-events-none ${
              centerGlow.pulseRate === 'intense' ? 'animate-center-glow-intense' :
              centerGlow.pulseRate === 'fast' ? 'animate-center-glow-fast' :
              centerGlow.pulseRate === 'medium' ? 'animate-center-glow-medium' :
              'animate-center-glow-slow'
            }`}
            style={{
              // Center of constellation (origin)
              left: -150,
              top: -150,
              width: 300,
              height: 300,
              background: `radial-gradient(circle,
                rgba(255, 255, 255, ${centerGlow.intensity * 0.3}) 0%,
                rgba(200, 200, 255, ${centerGlow.intensity * 0.15}) 30%,
                transparent 70%)`,
              boxShadow: `0 0 ${100 * centerGlow.intensity}px rgba(255, 255, 255, ${centerGlow.intensity * 0.2})`,
            }}
          />
        )}

        {/* Cluster regions (subtle glow) */}
        {Object.entries(constellationData.clusters).map(([name, cluster]) => (
          <div
            key={name}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: cluster.x - cluster.radius,
              top: cluster.y - cluster.radius,
              width: cluster.radius * 2,
              height: cluster.radius * 2,
              background: `radial-gradient(circle, ${cluster.color}08 0%, transparent 70%)`,
            }}
          />
        ))}

        {/* Cluster labels - only visible after mapping 3+ stars in that cluster */}
        {Object.entries(constellationData.clusters).map(([name, cluster]) => {
          const mapped = mappedPerCluster[name] || 0
          const isRevealed = mapped >= 3

          if (!isRevealed) return null

          return (
            <div
              key={`label-${name}`}
              className="absolute text-gray-600 text-xs font-mono uppercase tracking-wider pointer-events-none"
              style={{
                left: cluster.x,
                top: cluster.y - cluster.radius - 20,
                transform: 'translateX(-50%)',
                opacity: scale > 0.4 ? 0.4 : 0,
                transition: 'opacity 0.3s',
              }}
            >
              {name.replace(/_/g, ' ')}
            </div>
          )
        })}

        {/* All Stars - brightness reflects knowledge, all are tappable */}
        {allStars.map((star) => {
          const { visuals, state } = star
          const halfSize = visuals.size / 2

          // Determine color: fading stars get warm orange tint
          const starColor = visuals.warmShift
            ? blendWithOrange(star.color, 0.4)
            : star.color

          // Build box shadow for glow effect
          const glowShadow = visuals.glowSize > 0
            ? `0 0 ${visuals.glowSize}px ${starColor}${Math.round(visuals.glowOpacity * 255).toString(16).padStart(2, '0')}`
            : 'none'

          // Animation class
          let animationClass = ''
          if (visuals.pulse) animationClass = 'animate-star-pulse'
          if (visuals.flicker) animationClass = 'animate-star-flicker'

          return (
            <button
              key={star.id}
              className={`star-button absolute rounded-full transition-all duration-300
                         hover:scale-150 focus:outline-none focus:ring-2 focus:ring-white/30
                         ${animationClass}`}
              style={{
                left: star.x - halfSize,
                top: star.y - halfSize,
                width: visuals.size,
                height: visuals.size,
                backgroundColor: starColor,
                opacity: visuals.opacity,
                boxShadow: glowShadow,
              }}
              onClick={() => onSelectTopic(star.id, star)}
              title={star.name}
            />
          )
        })}

        {/* Echoes - ghost markers at fading stars (Phase 8) */}
        {allStars
          .filter(star => star.state === STAR_STATES.fading)
          .map((star) => {
            // Generate consistent offset based on star id (so it doesn't jump around)
            const hash = star.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
            const angle = (hash % 360) * (Math.PI / 180)
            const distance = 12 + (hash % 8)  // 12-20px offset
            const offsetX = Math.cos(angle) * distance
            const offsetY = Math.sin(angle) * distance

            // Echo is larger and more diffuse than the star
            const echoSize = 14
            const halfSize = echoSize / 2

            return (
              <div
                key={`echo-${star.id}`}
                className="absolute rounded-full pointer-events-none animate-echo-drift"
                style={{
                  left: star.x + offsetX - halfSize,
                  top: star.y + offsetY - halfSize,
                  width: echoSize,
                  height: echoSize,
                  background: `radial-gradient(circle, ${star.color}30 0%, transparent 70%)`,
                  boxShadow: `0 0 20px ${star.color}15`,
                }}
              />
            )
          })}

        {/* Secondary echoes - fainter, opposite side */}
        {allStars
          .filter(star => star.state === STAR_STATES.fading)
          .map((star) => {
            const hash = star.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
            // Opposite angle from primary echo
            const angle = ((hash % 360) + 180) * (Math.PI / 180)
            const distance = 8 + (hash % 6)  // Slightly closer
            const offsetX = Math.cos(angle) * distance
            const offsetY = Math.sin(angle) * distance

            const echoSize = 10
            const halfSize = echoSize / 2

            return (
              <div
                key={`echo2-${star.id}`}
                className="absolute rounded-full pointer-events-none animate-echo-fade"
                style={{
                  left: star.x + offsetX - halfSize,
                  top: star.y + offsetY - halfSize,
                  width: echoSize,
                  height: echoSize,
                  background: `radial-gradient(circle, ${star.color}20 0%, transparent 60%)`,
                }}
              />
            )
          })}

        {/* Wormhole connections */}
        <svg
          className="absolute pointer-events-none"
          style={{
            left: -600,
            top: -600,
            width: 1200,
            height: 1200,
            overflow: 'visible',
          }}
        >
          {visibleWormholes.map((wormhole) => {
            const from = wormhole.endpoints[0]
            const to = wormhole.endpoints[1]
            return (
              <g key={wormhole.id}>
                {/* Gradient definition for this wormhole */}
                <defs>
                  <linearGradient
                    id={`wormhole-gradient-${wormhole.id}`}
                    x1={from.x + 600}
                    y1={from.y + 600}
                    x2={to.x + 600}
                    y2={to.y + 600}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={getClusterColor(from.cluster)} stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
                    <stop offset="100%" stopColor={getClusterColor(to.cluster)} stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                {/* Connecting line */}
                <line
                  x1={from.x + 600}
                  y1={from.y + 600}
                  x2={to.x + 600}
                  y2={to.y + 600}
                  stroke={`url(#wormhole-gradient-${wormhole.id})`}
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  opacity="0.6"
                />
              </g>
            )
          })}
        </svg>

        {/* Wormhole portals */}
        {visibleWormholes.map((wormhole) => {
          const from = wormhole.endpoints[0]
          const to = wormhole.endpoints[1]
          return (
            <div key={`portal-${wormhole.id}`}>
              {/* Portal at "from" endpoint */}
              <button
                className="star-button absolute rounded-full transition-all duration-300
                           hover:scale-125 focus:outline-none"
                style={{
                  left: from.x - 6,
                  top: from.y - 6,
                  width: 12,
                  height: 12,
                  background: `radial-gradient(circle, ${getClusterColor(from.cluster)} 0%, transparent 70%)`,
                  boxShadow: `0 0 15px ${getClusterColor(from.cluster)}, 0 0 30px ${getClusterColor(from.cluster)}60`,
                  border: `1px solid ${getClusterColor(from.cluster)}80`,
                }}
                onClick={() => onSelectTopic(to.topicId, constellationData.topics[to.topicId])}
                title={`${wormhole.name} → ${to.name}`}
              />
              {/* Portal at "to" endpoint */}
              <button
                className="star-button absolute rounded-full transition-all duration-300
                           hover:scale-125 focus:outline-none"
                style={{
                  left: to.x - 6,
                  top: to.y - 6,
                  width: 12,
                  height: 12,
                  background: `radial-gradient(circle, ${getClusterColor(to.cluster)} 0%, transparent 70%)`,
                  boxShadow: `0 0 15px ${getClusterColor(to.cluster)}, 0 0 30px ${getClusterColor(to.cluster)}60`,
                  border: `1px solid ${getClusterColor(to.cluster)}80`,
                }}
                onClick={() => onSelectTopic(from.topicId, constellationData.topics[from.topicId])}
                title={`${wormhole.name} → ${from.name}`}
              />
            </div>
          )
        })}
      </motion.div>

      {/* UI Overlay - hide during entry animation */}
      <AnimatePresence>
        {entryPhase === 'done' && (
          <motion.div
            className="absolute top-0 left-0 right-0 p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-start">
              {/* Back button */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="pointer-events-auto px-3 py-2 text-gray-500 hover:text-gray-300
                             font-mono text-sm transition-colors"
                >
                  [back]
                </button>
              )}

              {/* Stats and Rank */}
              <div className="text-right space-y-1">
                <p className="text-gray-400 font-mono text-sm">
                  {stats.rank.name}
                </p>
                <p className="text-gray-600 font-mono text-xs">
                  {stats.starsRevealed} stars · {stats.fragmentsCaptured} fragments
                </p>
                {stats.wormholesFound > 0 && (
                  <p className="text-gray-600 font-mono text-xs">
                    {stats.wormholesFound} wormhole{stats.wormholesFound !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom controls - hide during entry animation */}
      <AnimatePresence>
        {entryPhase === 'done' && (
          <motion.div
            className="absolute bottom-20 right-4 flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              onClick={() => setScale(s => Math.min(s * 1.2, 2))}
              className="w-10 h-10 rounded-full bg-gray-900/50 border border-gray-700
                         text-gray-400 hover:text-white hover:border-gray-500 transition-colors
                         flex items-center justify-center font-mono"
            >
              +
            </button>
            <button
              onClick={() => setScale(s => Math.max(s * 0.8, 0.2))}
              className="w-10 h-10 rounded-full bg-gray-900/50 border border-gray-700
                         text-gray-400 hover:text-white hover:border-gray-500 transition-colors
                         flex items-center justify-center font-mono"
            >
              -
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear button (dev/testing) */}
      <AnimatePresence>
        {entryPhase === 'done' && (
          <motion.button
            className="absolute bottom-20 left-4 px-3 py-2 text-gray-600 hover:text-red-400
                       font-mono text-xs transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => {
              if (confirm('Clear all progress?')) {
                clearAllData()
                window.location.reload()
              }
            }}
          >
            [clear]
          </motion.button>
        )}
      </AnimatePresence>

      {/* Arrival message */}
      <AnimatePresence>
        {arrivalMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-400 font-mono text-lg">{arrivalMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fading narrative message (Phase 5) */}
      <AnimatePresence>
        {fadingMessage && !arrivalMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-orange-400/70 font-mono text-lg">{fadingMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient message (Phase 6) */}
      <AnimatePresence>
        {ambientMessage && !arrivalMessage && !fadingMessage && !dailyTransmission && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <p className="text-gray-400/80 font-mono text-lg">{ambientMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily transmission (Phase 7) */}
      <AnimatePresence>
        {dailyTransmission && !arrivalMessage && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <p className="text-gray-300 font-mono text-lg tracking-wide">{dailyTransmission}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revelation message - Layer 2/3 (Phase 10) */}
      <AnimatePresence>
        {revelationMessage && !arrivalMessage && !archivistData && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <p className="text-gray-200 font-mono text-xl tracking-wider">{revelationMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Archivist modal (Phase 9) */}
      <AnimatePresence>
        {archivistData && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80" />

            {/* Content */}
            <motion.div
              className="relative max-w-md mx-4 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 -m-8 rounded-full opacity-20 blur-3xl"
                style={{ background: getClusterColor(archivistData.cluster) }}
              />

              {/* Title */}
              <p className="text-gray-500 font-mono text-sm uppercase tracking-widest mb-6">
                {archivistData.title}
              </p>

              {/* Main message */}
              <motion.p
                className="text-gray-200 font-mono text-xl mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                {archivistData.message}
              </motion.p>

              {/* Lore */}
              <motion.p
                className="text-gray-500 font-mono text-sm leading-relaxed mb-8 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                {archivistData.lore}
              </motion.p>

              {/* Cluster name */}
              <motion.p
                className="text-gray-600 font-mono text-xs uppercase tracking-widest mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                {archivistData.cluster.replace(/_/g, ' ')} — mapped
              </motion.p>

              {/* Dismiss button */}
              <motion.button
                className="px-6 py-2 text-gray-400 hover:text-gray-200 font-mono text-sm
                           border border-gray-700 hover:border-gray-500 rounded transition-colors"
                onClick={() => setArchivistData(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
              >
                [continue]
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {entryPhase === 'done' && visibleStars.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-600 font-mono">...no signals detected</p>
        </div>
      )}
    </div>
  )
}

// Helper to get cluster colors
function getClusterColor(cluster) {
  const colors = {
    people: '#E67E22',
    history: '#C9A227',
    geography: '#F39C12',
    science: '#4A90D9',
    biology: '#27AE60',
    technology: '#95A5A6',
    arts: '#9B59B6',
    philosophy_religion: '#1ABC9C',
    society: '#E74C3C',
    everyday_life: '#F1C40F',
    mathematics: '#3498DB',
  }
  return colors[cluster] || '#ffffff'
}

// Helper to blend a color with orange (for fading stars)
function blendWithOrange(hexColor, amount) {
  // Parse hex color
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)

  // Orange: #FF8C00
  const orangeR = 255
  const orangeG = 140
  const orangeB = 0

  // Blend
  const newR = Math.round(r + (orangeR - r) * amount)
  const newG = Math.round(g + (orangeG - g) * amount)
  const newB = Math.round(b + (orangeB - b) * amount)

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}
