import { useState, useEffect } from 'react'
import { generateFullArticle, generateSurpriseTopic } from './services/claude'
import LearnScreen from './components/LearnScreen'
import ReviewScreen from './components/ReviewScreen'
import CardLibrary from './components/CardLibrary'

function App() {
  const [screen, setScreen] = useState('home')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [learnData, setLearnData] = useState(null)
  const [cardStats, setCardStats] = useState({ total: 0, dueToday: 0 })
  const [progress, setProgress] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasHydrated, setHasHydrated] = useState(false)

  // Restore saved state from localStorage on mount (fixes mobile Safari)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('appState')
      if (saved) {
        const savedState = JSON.parse(saved)
        if (savedState?.screen) setScreen(savedState.screen)
        if (savedState?.topic) setTopic(savedState.topic)
        if (savedState?.learnData) setLearnData(savedState.learnData)
        if (savedState?.breadcrumbs) setBreadcrumbs(savedState.breadcrumbs)
        if (savedState?.currentIndex !== undefined) setCurrentIndex(savedState.currentIndex)
      }
    } catch (e) {
      console.error('Error loading saved state:', e)
    }
    setHasHydrated(true)
  }, [])

  // Save state to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return // Don't save until we've loaded existing state

    if (screen === 'learn' && learnData) {
      localStorage.setItem('appState', JSON.stringify({
        screen,
        topic,
        learnData,
        breadcrumbs,
        currentIndex
      }))
    } else if (screen === 'home') {
      // Clear saved state when returning home
      localStorage.removeItem('appState')
    }
  }, [hasHydrated, screen, topic, learnData, breadcrumbs, currentIndex])

  useEffect(() => {
    // Calculate card statistics
    const updateCardStats = () => {
      const savedCards = JSON.parse(localStorage.getItem('flashcards') || '[]')
      const now = new Date()

      const dueCards = savedCards.filter(card => {
        if (!card.nextReview) return true // New cards are always due
        return new Date(card.nextReview) <= now
      })

      setCardStats({
        total: savedCards.length,
        dueToday: dueCards.length
      })
    }

    updateCardStats()

    // Update stats when screen changes (in case cards were added/reviewed)
    if (screen === 'home') {
      updateCardStats()
    }
  }, [screen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (topic.trim()) {
      setLoading(true)
      setError(null)
      setProgress({ message: 'Crafting your story...' })

      try {
        const { hook, content, hyperlinks, suggestions } = await generateFullArticle(topic, (message) => {
          setProgress({ message })
        })
        const newData = { topic, hook, content, hyperlinks, suggestions }
        setLearnData(newData)
        // Start new journey - reset breadcrumbs and add first topic
        setBreadcrumbs([newData])
        setProgress(null)
        setScreen('learn')
      } catch (err) {
        setError(err.message)
        setProgress(null)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSurpriseMe = async () => {
    setLoading(true)
    setError(null)
    setProgress({ message: 'Finding something fascinating...' })

    try {
      // Generate a random topic (don't show it yet!)
      const randomTopic = await generateSurpriseTopic()

      // Immediately load the article
      setProgress({ message: 'Crafting your story...' })
      const { hook, content, hyperlinks, suggestions } = await generateFullArticle(randomTopic, (message) => {
        setProgress({ message })
      })
      const newData = { topic: randomTopic, hook, content, hyperlinks, suggestions }
      setLearnData(newData)
      setBreadcrumbs([newData])
      setProgress(null)
      setScreen('learn')
    } catch (err) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToHome = () => {
    setScreen('home')
    setTopic('')
    setLearnData(null)
    setBreadcrumbs([])
    setCurrentIndex(0)
  }

  const handleGoDeeper = async (term) => {
    setLoading(true)
    setProgress({ message: 'Crafting your story...' })

    try {
      const { hook, content, hyperlinks, suggestions } = await generateFullArticle(term, (message) => {
        setProgress({ message })
      })
      const newData = { topic: term, hook, content, hyperlinks, suggestions }
      setLearnData(newData)
      // If we're in the middle of history, branch from current point
      // Otherwise just append to the end
      setBreadcrumbs(prev => {
        const newBreadcrumbs = [...prev.slice(0, currentIndex + 1), newData]
        return newBreadcrumbs
      })
      setCurrentIndex(prev => prev + 1)
      setProgress(null)
      // Scroll to top when new article loads
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBreadcrumbClick = (index) => {
    // Don't do anything if clicking the current breadcrumb
    if (index === currentIndex) return

    // Jump to that topic (no reloading, just switch view)
    const selectedData = breadcrumbs[index]
    setLearnData(selectedData)
    setCurrentIndex(index)
    window.scrollTo(0, 0)
  }

  const handleGoToReview = () => {
    setScreen('review')
  }

  const handleGoToLibrary = () => {
    setScreen('library')
  }

  // Show Learn screen if we're on it
  if (screen === 'learn' && learnData) {
    return (
      <LearnScreen
        topic={learnData.topic}
        hook={learnData.hook}
        content={learnData.content}
        hyperlinks={learnData.hyperlinks}
        suggestions={learnData.suggestions || { related: [], tangents: [] }}
        breadcrumbs={breadcrumbs}
        currentIndex={currentIndex}
        onBack={handleBackToHome}
        onGoDeeper={handleGoDeeper}
        onBreadcrumbClick={handleBreadcrumbClick}
        loading={loading}
        progress={progress}
      />
    )
  }

  // Show Review screen if we're on it
  if (screen === 'review') {
    return <ReviewScreen onBack={handleBackToHome} />
  }

  // Show Card Library screen if we're on it
  if (screen === 'library') {
    return <CardLibrary onBack={handleBackToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            Start Learning
          </h1>

          {/* Loading indicator - show when loading */}
          {loading && (
            <div className="my-8">
              <div className="flex justify-center mb-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
              <p className="text-indigo-600 font-medium">{progress?.message || 'Loading...'}</p>
            </div>
          )}

          {/* Surprise Me button - centered below title (hide when loading) */}
          {!loading && (
            <button
              type="button"
              onClick={handleSurpriseMe}
              disabled={loading}
              style={{
                marginTop: '1.5rem',
                marginBottom: '2.5rem',
                padding: '1.25rem 3.5rem',
                fontSize: '1.5rem'
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              ✨ Surprise Me!
            </button>
          )}
        </div>

        {/* Hide search form when loading */}
        {!loading && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex gap-3 items-center justify-center">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Search anything!"
                className="w-72 px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 shadow-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-2xl"
              >
                ↵
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-4 rounded-xl border border-red-200">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default App
