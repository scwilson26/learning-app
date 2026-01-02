import { useState, useEffect } from 'react'
import { generateDeepDive } from './services/claude'
import LearnScreen from './components/LearnScreen'
import ReviewScreen from './components/ReviewScreen'
import CardLibrary from './components/CardLibrary'

function App() {
  const [screen, setScreen] = useState('home') // 'home', 'learn', 'review', or 'library'
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [learnContent, setLearnContent] = useState('')
  const [learnTopic, setLearnTopic] = useState('')
  const [cardStats, setCardStats] = useState({ total: 0, dueToday: 0 })
  const [deepDiveProgress, setDeepDiveProgress] = useState(null)

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
      setDeepDiveProgress({ current: 0, total: 0, section: 'Generating outline...' })

      try {
        const content = await generateDeepDive(topic, (current, total, section) => {
          setDeepDiveProgress({ current, total, section })
        })
        setLearnContent(content)
        setLearnTopic(topic)
        setDeepDiveProgress(null)
        setScreen('learn')
      } catch (err) {
        setError(err.message)
        setDeepDiveProgress(null)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBackToHome = () => {
    setScreen('home')
    setTopic('')
    setLearnContent('')
    setLearnTopic('')
  }

  const handleGoToReview = () => {
    setScreen('review')
  }

  const handleGoToLibrary = () => {
    setScreen('library')
  }

  // Show Learn screen if we're on it
  if (screen === 'learn') {
    return (
      <LearnScreen
        initialContent={learnContent}
        initialTopic={learnTopic}
        onBack={handleBackToHome}
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
      <div className="w-full max-w-md">
        {/* Navigation buttons */}
        <div className="flex justify-end gap-4 mb-4">
          <button
            onClick={handleGoToLibrary}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            View All Cards
          </button>
          {cardStats.dueToday > 0 && (
            <button
              onClick={handleGoToReview}
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Review Cards →
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Start Learning
            </h1>
            <p className="text-gray-600">Discover something new today</p>
          </div>

          {/* Progress stats */}
          {cardStats.total > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{cardStats.dueToday}</div>
                  <div className="text-sm text-gray-600">due today</div>
                </div>
                <div className="border-l border-gray-200"></div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{cardStats.total}</div>
                  <div className="text-sm text-gray-600">total cards</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn about?"
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 shadow-sm"
            />
          </div>

          {deepDiveProgress ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-4">
                <div className="text-xl font-bold text-indigo-600 mb-2">
                  {deepDiveProgress.current > 0 ? `${deepDiveProgress.current} / ${deepDiveProgress.total}` : 'Preparing...'}
                </div>
                <div className="text-gray-600 text-sm">
                  {deepDiveProgress.section}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${deepDiveProgress.total > 0 ? (deepDiveProgress.current / deepDiveProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Loading...' : 'Get Started'}
            </button>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default App
