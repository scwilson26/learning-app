/**
 * Authentication component - email magic link login
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmail } from '../services/supabase'

export default function Auth({ onSkip }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await signInWithEmail(email)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Spaced</h1>
        <p className="text-gray-500 text-center mb-8">Sign in to sync progress</p>

        <AnimatePresence mode="wait">
          {message ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <div className="bg-green-50 text-green-700 rounded-xl p-4 mb-4">
                <span className="text-2xl mb-2 block">✉️</span>
                {message}
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Try a different email
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <form onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all mb-4"
                />

                {error && (
                  <div className="bg-red-50 text-red-600 rounded-xl p-3 mb-4 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Sign in with email'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip for now */}
        {!message && (
          <div className="mt-8 text-center">
            <button
              onClick={onSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              skip for now
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
