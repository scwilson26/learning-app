import { useState, useEffect } from 'react'
import { generateFullArticle, generateSurpriseTopic } from './services/claude'
import LearnScreen from './components/LearnScreen'
import ReviewScreen from './components/ReviewScreen'
import CardLibrary from './components/CardLibrary'

function App() {
  const [screen, setScreen] = useState('home') // 'home', 'learn', 'review', or 'library'
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [learnData, setLearnData] = useState(null) // { topic, hook, content, hyperlinks }
  const [cardStats, setCardStats] = useState({ total: 0, dueToday: 0 })
  const [progress, setProgress] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([]) // Track user's journey: [{topic, hook, content, hyperlinks}, ...]

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
        const { hook, content, hyperlinks } = await generateFullArticle(topic, (message) => {
          setProgress({ message })
        })
        const newData = { topic, hook, content, hyperlinks }
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
      // Generate a random topic
      const randomTopic = await generateSurpriseTopic()
      setTopic(randomTopic)

      // Immediately load the article
      setProgress({ message: 'Crafting your story...' })
      const { hook, content, hyperlinks } = await generateFullArticle(randomTopic, (message) => {
        setProgress({ message })
      })
      const newData = { topic: randomTopic, hook, content, hyperlinks }
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
  }

  const handleGoDeeper = async (term) => {
    setLoading(true)
    setProgress({ message: 'Crafting your story...' })

    try {
      const { hook, content, hyperlinks } = await generateFullArticle(term, (message) => {
        setProgress({ message })
      })
      const newData = { topic: term, hook, content, hyperlinks }
      setLearnData(newData)
      // Add to breadcrumb trail
      setBreadcrumbs(prev => [...prev, newData])
      setProgress(null)
    } catch (err) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBreadcrumbClick = (index) => {
    // Jump back to a previous topic in the journey
    const selectedData = breadcrumbs[index]
    setLearnData(selectedData)
    // Trim breadcrumbs to this point
    setBreadcrumbs(prev => prev.slice(0, index + 1))
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
        breadcrumbs={breadcrumbs}
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
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            Start Learning
          </h1>
          <p className="text-gray-600 text-lg">Discover something new today</p>
        </div>

        {/* Progress stats */}
        {cardStats.total > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-3xl font-bold text-indigo-600">{cardStats.dueToday}</div>
                <div className="text-sm text-gray-600 mt-1">due today</div>
              </div>
              <div className="border-l-2 border-gray-200"></div>
              <div>
                <div className="text-3xl font-bold text-gray-800">{cardStats.total}</div>
                <div className="text-sm text-gray-600 mt-1">total cards</div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleGoToLibrary}
                className="flex-1 text-indigo-600 hover:text-indigo-800 font-medium py-2 px-4 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                View All Cards
              </button>
              {cardStats.dueToday > 0 && (
                <button
                  onClick={handleGoToReview}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Review Now →
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn about?"
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 shadow-sm"
            />
          </div>

          {progress ? (
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="text-center">
                <div className="text-lg font-medium text-indigo-600 mb-4">
                  {progress.message}
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {loading ? 'Loading...' : 'Get Started'}
              </button>

              {/* Surprise Me button */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSurpriseMe}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                ✨ Surprise Me
              </button>
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-4 rounded-xl border border-red-200">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default App
