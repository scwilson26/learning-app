import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * WormholeDiscovery - The "what the..." moment
 *
 * Shown when a user captures their 4th fragment and discovers
 * a cross-cluster connection (wormhole).
 */
export default function WormholeDiscovery({ wormhole, onInvestigate, onLater }) {
  const [phase, setPhase] = useState('detecting') // 'detecting' | 'revealed'

  useEffect(() => {
    // Brief pause before reveal
    const timer = setTimeout(() => {
      setPhase('revealed')
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (!wormhole) return null

  const { from, to, name, sharedConcepts } = wormhole

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Subtle screen flicker effect */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.05, 0, 0.03, 0] }}
        transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }}
      />

      <div className="relative z-10 text-center px-8 max-w-md">
        {/* Detecting phase */}
        {phase === 'detecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-gray-400 text-lg font-mono animate-pulse">
              ...anomaly detected
            </p>
          </motion.div>
        )}

        {/* Revealed phase */}
        {phase === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Connection display */}
            <div className="space-y-4">
              <p className="text-gray-500 text-sm font-mono">...anomaly detected</p>

              {/* Topic connection */}
              <div className="flex items-center justify-center gap-4 text-lg">
                <span className="text-gray-300 font-medium" style={{ color: from?.cluster ? getClusterColor(from.cluster) : '#fff' }}>
                  {from?.name}
                </span>
                <span className="text-gray-500 font-mono">↔</span>
                <span className="text-gray-300 font-medium" style={{ color: to?.cluster ? getClusterColor(to.cluster) : '#fff' }}>
                  {to?.name}
                </span>
              </div>

              {/* Wormhole name */}
              <p className="text-white text-xl font-medium italic">
                "{name}"
              </p>

              {/* Shared concepts */}
              <p className="text-gray-500 text-sm font-mono">
                shared resonance: {sharedConcepts?.slice(0, 3).join(', ')}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={onInvestigate}
                className="px-6 py-3 border border-gray-500 rounded-lg
                         hover:border-gray-300 hover:bg-gray-900/50 transition-all duration-300
                         text-gray-300 hover:text-white font-mono"
              >
                [investigate]
              </button>
              <button
                onClick={onLater}
                className="px-6 py-3 border border-gray-700 rounded-lg
                         hover:border-gray-500 transition-all duration-300
                         text-gray-500 hover:text-gray-300 font-mono"
              >
                [later]
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Background stars effect */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
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
    </motion.div>
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
