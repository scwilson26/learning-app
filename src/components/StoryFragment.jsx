import { motion } from 'framer-motion'

/**
 * StoryFragment - Shows narrative fragments at milestones
 *
 * These are rare moments of discovery. The mystery unfolds slowly.
 */
export default function StoryFragment({ fragment, onDismiss }) {
  if (!fragment) return null

  const hasTitle = !!fragment.title

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
    >
      <motion.div
        className="max-w-md px-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title for log fragments */}
        {hasTitle && (
          <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-6">
            {fragment.title}
          </p>
        )}

        {/* Content */}
        <div className="space-y-4">
          {fragment.content.split('\n').map((line, i) => (
            <p
              key={i}
              className={`font-mono leading-relaxed ${
                hasTitle ? 'text-gray-300 text-sm' : 'text-gray-400 text-lg'
              }`}
            >
              {line || '\u00A0'}
            </p>
          ))}
        </div>

        {/* Dismiss hint */}
        <motion.p
          className="mt-12 text-gray-600 text-xs font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          [tap to continue]
        </motion.p>
      </motion.div>

      {/* Subtle star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
