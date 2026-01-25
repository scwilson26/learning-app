import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import constellationData from '../data/constellation.json'
import { getVoidProgress } from '../services/storage'
import { initWormholes } from '../systems/wormholes'
import { getPlayerStats } from '../systems/progression'

// Initialize wormhole system
const wormholeSystem = initWormholes(constellationData)

/**
 * The Void - Constellation home screen
 *
 * A dark canvas showing unlocked stars at their positions.
 * Pan and zoom to explore. Tap stars to navigate to topics.
 */
export default function Void({ onSelectTopic, onBack }) {
  // Pan and zoom state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const containerRef = useRef(null)

  // Get unlocked topics
  const voidProgress = useMemo(() => getVoidProgress(), [])
  const unlockedTopics = useMemo(() => {
    return voidProgress.unlockedTopics || []
  }, [voidProgress])

  // Calculate visible stars
  const visibleStars = useMemo(() => {
    return Object.entries(constellationData.topics)
      .filter(([id]) => unlockedTopics.includes(id))
      .map(([id, topic]) => ({
        id,
        ...topic
      }))
  }, [unlockedTopics])

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

  // Center on first load (center of coordinate system)
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setOffset({
        x: rect.width / 2,
        y: rect.height / 2
      })
    }
  }, [])

  // Mouse/touch handlers for pan
  const handlePointerDown = (e) => {
    if (e.target.closest('.star-button')) return // Don't drag when clicking stars
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
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.min(Math.max(s * delta, 0.2), 2))
  }

  // Pinch zoom for touch
  const lastTouchDistance = useRef(null)
  const handleTouchMove = (e) => {
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
    if (e.target.closest('.star-button')) return
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
      {/* Star field container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
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

        {/* Stars */}
        {visibleStars.map((star) => (
          <button
            key={star.id}
            className="star-button absolute rounded-full transition-all duration-300
                       hover:scale-150 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{
              left: star.x - 4,
              top: star.y - 4,
              width: 8,
              height: 8,
              backgroundColor: star.color,
              boxShadow: `0 0 10px ${star.color}, 0 0 20px ${star.color}40`,
            }}
            onClick={() => onSelectTopic(star.id, star)}
            title={star.name}
          />
        ))}

        {/* Dim placeholder for locked stars (very faint) */}
        {Object.entries(constellationData.topics)
          .filter(([id]) => !unlockedTopics.includes(id))
          .map(([id, topic]) => (
            <div
              key={`locked-${id}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: topic.x - 1,
                top: topic.y - 1,
                width: 2,
                height: 2,
                backgroundColor: '#ffffff08',
              }}
            />
          ))}

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
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
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
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2">
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
      </div>

      {/* Empty state */}
      {visibleStars.length === 0 && (
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
