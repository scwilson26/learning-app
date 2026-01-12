import { useState, useEffect } from 'react'
import { generateArticleHook, generateArticleBody, generateSurpriseTopic, generateArticleContinuation } from './services/claude'
import { recordArticleRead, recordSurpriseMeClick, resetSession, loadStats, saveJourney, loadJourneys } from './services/stats'
import LearnScreen from './components/LearnScreen'
import ReviewScreen from './components/ReviewScreen'
import CardLibrary from './components/CardLibrary'
import LoadingFacts from './components/LoadingFacts'
import CategoryFilter, { getSavedCategories, saveCategories } from './components/CategoryFilter'
import Canvas from './components/Canvas'

// Toggle this to test the new Canvas UI
const USE_CANVAS = true

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
  const [totalTopics, setTotalTopics] = useState(0)
  const [recentJourneys, setRecentJourneys] = useState([])
  const [currentJourneyId, setCurrentJourneyId] = useState(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [loadingContinuation, setLoadingContinuation] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState(() => getSavedCategories())

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

    // Load total topics count
    const stats = loadStats()
    setTotalTopics(stats.totalArticlesRead)

    // Load recent journeys
    setRecentJourneys(loadJourneys())
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
        // Stream hook first (fast with Haiku) - but don't switch screens yet
        const { hook } = await generateArticleHook(topic, null, null)

        // Stream body content - switch to learn screen on first chunk
        let currentHook = hook
        let firstChunk = false
        const { content, hyperlinks, suggestions } = await generateArticleBody(topic, null, (streamedContent) => {
          // Switch to learn screen on first chunk of body content
          if (!firstChunk) {
            firstChunk = true
            const partialData = { topic, hook: currentHook, content: streamedContent, hyperlinks: [], suggestions: { related: [], tangents: [] } }
            setLearnData(partialData)
            setBreadcrumbs([partialData])
            setCurrentIndex(0)
            setCurrentPart(1)
            setScreen('learn')
            setProgress(null)
          } else {
            // Update content as it streams in
            setLearnData(prev => ({ ...prev, content: streamedContent }))
          }
        }, selectedCategories)

        // Final update with suggestions
        const fullData = { topic, hook: currentHook, content, hyperlinks, suggestions }
        setLearnData(fullData)
        setBreadcrumbs([fullData])

        // Track stats (new search = new chain)
        const stats = recordArticleRead(topic, false)
        setTotalTopics(stats.totalArticlesRead)
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
      // Track Surprise Me click
      recordSurpriseMeClick()

      // Step 1: Generate topic ASAP (filtered by selected categories)
      const randomTopic = await generateSurpriseTopic(selectedCategories)

      // Step 2: Generate hook (fast with Haiku) - but don't switch screens yet
      setProgress({ message: 'Crafting your story...' })
      const { hook } = await generateArticleHook(randomTopic, null, null)

      // Step 3: Stream body content - switch to learn screen on first chunk
      let currentHook = hook
      let firstChunk = false
      const { content, hyperlinks, suggestions } = await generateArticleBody(randomTopic, null, (streamedContent) => {
        // Switch to learn screen on first chunk of body content
        if (!firstChunk) {
          firstChunk = true
          const partialData = { topic: randomTopic, hook: currentHook, content: streamedContent, hyperlinks: [], suggestions: { related: [], tangents: [] } }
          setLearnData(partialData)
          setBreadcrumbs([partialData])
          setCurrentIndex(0)
          setCurrentPart(1)
          setScreen('learn')
          setProgress(null)
        } else {
          setLearnData(prev => ({ ...prev, content: streamedContent }))
        }
      }, selectedCategories)

      // Final update with suggestions
      const fullData = { topic: randomTopic, hook: currentHook, content, hyperlinks, suggestions }
      setLearnData(fullData)
      setBreadcrumbs([fullData])

      // Track stats (Surprise Me = new chain)
      const stats = recordArticleRead(randomTopic, false)
      setTotalTopics(stats.totalArticlesRead)
    } catch (err) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToHome = () => {
    // Save the current journey before leaving
    if (breadcrumbs.length > 0) {
      saveJourney(breadcrumbs, currentIndex)
      setRecentJourneys(loadJourneys())
    }
    // Bank the session stats
    resetSession()
    // Reset all state including loading
    setScreen('home')
    setTopic('')
    setLearnData(null)
    setBreadcrumbs([])
    setCurrentIndex(0)
    setCurrentPart(1)
    setCurrentJourneyId(null)
    setLoading(false)
    setProgress(null)
    setError(null)
  }

  const handleGoDeeper = async (term, quickCardText = null) => {
    setLoading(true)
    setProgress({ message: 'Crafting your story...' })

    try {
      // Show partial data immediately with empty hook
      const partialData = { topic: term, hook: '', content: '', hyperlinks: [], suggestions: { related: [], tangents: [] } }
      setLearnData(partialData)
      // If we're in the middle of history, branch from current point
      setBreadcrumbs(prev => [...prev.slice(0, currentIndex + 1), partialData])
      setCurrentIndex(prev => prev + 1)
      setCurrentPart(1) // Reset to part 1 for new topic
      setProgress(null)
      window.scrollTo(0, 0)

      // Stream hook first (fast with Haiku)
      const { hook } = await generateArticleHook(term, quickCardText, (streamedHook) => {
        setLearnData(prev => ({ ...prev, hook: streamedHook }))
      })

      // Stream body content - updates appear in real-time
      let currentHook = hook
      const { content, hyperlinks, suggestions } = await generateArticleBody(term, quickCardText, (streamedContent) => {
        setLearnData(prev => ({ ...prev, content: streamedContent }))
      }, selectedCategories)

      // Final update with suggestions
      const fullData = { topic: term, hook: currentHook, content, hyperlinks, suggestions }
      setLearnData(fullData)
      // Update breadcrumbs with full data
      setBreadcrumbs(prev => {
        const newBreadcrumbs = [...prev]
        newBreadcrumbs[newBreadcrumbs.length - 1] = fullData
        return newBreadcrumbs
      })

      // Track stats (going deeper = continuing chain)
      const stats = recordArticleRead(term, true)
      setTotalTopics(stats.totalArticlesRead)
    } catch (err) {
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeepReading = async () => {
    if (currentPart >= 4 || loadingContinuation || !learnData) return

    setLoadingContinuation(true)
    try {
      const nextPart = currentPart + 1
      // Build the full existing content (just body, no hook - hook is too specific to Part 1)
      const existingContent = learnData.content

      // Store the base content before streaming starts
      const baseContent = learnData.content
      const partDivider = `\n\n---PART-${nextPart}---\n\n`

      const { content: newContent, hyperlinks: newHyperlinks } = await generateArticleContinuation(
        learnData.topic,
        existingContent,
        nextPart,
        // Streaming callback - update content as it comes in
        (streamedContent) => {
          setLearnData(prev => ({
            ...prev,
            content: baseContent + partDivider + streamedContent
          }))
        }
      )

      // Final update with complete content and hyperlinks
      const updatedContent = baseContent + partDivider + newContent
      const updatedHyperlinks = [...(learnData.hyperlinks || []), ...newHyperlinks]

      const updatedData = {
        ...learnData,
        content: updatedContent,
        hyperlinks: updatedHyperlinks
      }

      setLearnData(updatedData)
      setCurrentPart(nextPart)

      // Update breadcrumbs with the updated data
      setBreadcrumbs(prev => {
        const newBreadcrumbs = [...prev]
        newBreadcrumbs[currentIndex] = updatedData
        return newBreadcrumbs
      })
    } catch (err) {
      console.error('Error loading continuation:', err)
    } finally {
      setLoadingContinuation(false)
    }
  }

  const handleBreadcrumbClick = (index) => {
    // Don't do anything if clicking the current breadcrumb
    if (index === currentIndex) return

    // Jump to that topic (no reloading, just switch view)
    const selectedData = breadcrumbs[index]
    setLearnData(selectedData)
    setCurrentIndex(index)
    // Reset to part 1 when switching topics (each topic has its own depth)
    setCurrentPart(selectedData.currentPart || 1)
    window.scrollTo(0, 0)
  }

  const handleGoToReview = () => {
    setScreen('review')
  }

  const handleGoToLibrary = () => {
    setScreen('library')
  }

  const handleResumeJourney = (journey) => {
    // Restore the journey state
    setBreadcrumbs(journey.breadcrumbs)
    setCurrentIndex(journey.currentIndex)
    setLearnData(journey.breadcrumbs[journey.currentIndex])
    setCurrentJourneyId(journey.id)
    setScreen('learn')
  }

  const handleCategoriesChange = (newCategories) => {
    setSelectedCategories(newCategories)
    saveCategories(newCategories)
  }

  // New Canvas UI - takes priority when enabled
  if (USE_CANVAS) {
    return <Canvas />
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
        currentPart={currentPart}
        onBack={handleBackToHome}
        onGoDeeper={handleGoDeeper}
        onBreadcrumbClick={handleBreadcrumbClick}
        onKeepReading={handleKeepReading}
        loading={loading}
        progress={progress}
        loadingContinuation={loadingContinuation}
        selectedCategories={selectedCategories}
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

          {/* Total topics counter - only show if they've explored something */}
          {totalTopics > 0 && !loading && (
            <p className="text-gray-500 text-sm mb-2">
              🧠 {totalTopics} topic{totalTopics === 1 ? '' : 's'} explored
            </p>
          )}

          {/* Fun facts loading screen */}
          {loading && <LoadingFacts />}

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

        {/* Category Filter - show above search when not loading */}
        {!loading && (
          <div className="mb-6">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onCategoriesChange={handleCategoriesChange}
            />
          </div>
        )}

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

        {/* Recent Journeys - show below search when not loading */}
        {!loading && recentJourneys.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">Recent</h2>
            <div className="space-y-2">
              {recentJourneys.map((journey) => (
                <button
                  key={journey.id}
                  onClick={() => handleResumeJourney(journey)}
                  className="w-full text-left px-4 py-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-300 flex justify-between items-center"
                >
                  <span className="font-medium text-gray-800">{journey.firstTopic}</span>
                  <span className="text-sm text-gray-500">{journey.depth} deep</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
