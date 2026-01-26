/**
 * Authentication component - Space themed login
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { signInWithEmail, signInWithGoogle } from '../services/supabase'

export default function Auth({ onSkip }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // If successful, browser will redirect
  }

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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle star background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Scattered stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
        {/* Subtle gradient glow at center */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">Spaced</h1>
          <p className="text-gray-500 font-mono text-sm">knowledge is infinite</p>
        </div>

        {message ? (
          <div className="text-center">
            <div className="bg-gray-900/80 border border-gray-800 text-gray-300 rounded-xl p-6 mb-4">
              <span className="text-2xl mb-3 block opacity-70">...</span>
              <p className="font-mono text-sm">{message}</p>
            </div>
            <button
              onClick={() => {
                setMessage(null)
                setShowEmailForm(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-400 font-mono"
            >
              try a different method
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Sign In - Primary */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3.5 rounded-xl bg-white text-gray-900 font-semibold
                flex items-center justify-center gap-3
                hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {/* Google Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-sm font-mono">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Email Magic Link - Secondary */}
            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full py-3 rounded-xl border border-gray-800 text-gray-400 font-medium
                  hover:border-gray-700 hover:text-gray-300 transition-colors"
              >
                Sign in with email
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800
                    text-white placeholder-gray-600
                    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                    outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium
                    hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-500"
                >
                  Back
                </button>
              </form>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 rounded-xl p-3 text-sm font-mono">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Skip for now */}
        <div className="mt-10 text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-600 hover:text-gray-500 transition-colors font-mono"
          >
            skip for now
          </button>
        </div>
      </motion.div>
    </div>
  )
}
