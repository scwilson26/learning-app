import { useState, useEffect } from 'react'
import { CHARACTER_ORIGINS, getStartingTopics } from '../data/characters'
import { setCharacter } from '../services/storage'
import constellationData from '../data/constellation.json'

/**
 * CharacterSelect - The mysterious origin selection screen
 *
 * Shown on first launch when no character has been selected.
 * Sets the tone for the entire experience with sparse, cryptic text.
 */
export default function CharacterSelect({ onComplete }) {
  const [phase, setPhase] = useState('calibrating') // 'calibrating' | 'question' | 'selected' | 'ready'
  const [selectedOrigin, setSelectedOrigin] = useState(null)
  const [showOptions, setShowOptions] = useState(false)

  // Initial calibrating animation
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPhase('question')
    }, 1500)

    const timer2 = setTimeout(() => {
      setShowOptions(true)
    }, 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleOriginSelect = (originId) => {
    setSelectedOrigin(originId)
    setPhase('selected')

    // Get starting topics and save character
    const allTopicIds = Object.keys(constellationData.topics)
    const startingTopics = getStartingTopics(originId, allTopicIds)
    setCharacter(originId, startingTopics)

    // Transition to ready phase
    setTimeout(() => {
      setPhase('ready')
    }, 1500)
  }

  const handleBegin = () => {
    onComplete()
  }

  const origins = Object.values(CHARACTER_ORIGINS)

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
      {/* Subtle star field background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-8 max-w-md">
        {/* Calibrating phase */}
        {phase === 'calibrating' && (
          <div className="animate-pulse">
            <p className="text-gray-500 text-lg font-mono">...calibrating</p>
          </div>
        )}

        {/* Question phase */}
        {phase === 'question' && (
          <div className="space-y-12">
            <div className="space-y-2 animate-fadeIn">
              <p className="text-gray-400 text-lg font-mono">what calls to you?</p>
            </div>

            {showOptions && (
              <div className="space-y-3 animate-fadeIn">
                {origins.map((origin) => (
                  <button
                    key={origin.id}
                    onClick={() => handleOriginSelect(origin.id)}
                    className="w-full py-4 px-6 text-left border border-gray-800 rounded-lg
                             hover:border-gray-600 hover:bg-gray-900/50 transition-all duration-300
                             group"
                  >
                    <span className="text-gray-300 font-mono text-lg group-hover:text-white transition-colors">
                      [{origin.prompt}]
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected phase */}
        {phase === 'selected' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-gray-500 text-lg font-mono">...calibrating</p>
            <p className="text-gray-600 text-sm font-mono animate-pulse">...</p>
          </div>
        )}

        {/* Ready phase */}
        {phase === 'ready' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <p className="text-gray-400 text-lg font-mono">5 signals found</p>
            </div>

            <button
              onClick={handleBegin}
              className="py-4 px-12 border border-gray-600 rounded-lg
                       hover:border-gray-400 hover:bg-gray-900/50 transition-all duration-300
                       text-gray-300 hover:text-white font-mono text-lg"
            >
              [begin]
            </button>
          </div>
        )}
      </div>

      {/* Custom fadeIn animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
