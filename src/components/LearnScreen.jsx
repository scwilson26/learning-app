import { useState, useEffect } from 'react'
import { generateQuickCard } from '../services/claude'
import { recordHyperlinkClick, recordQuickCardView, recordSurpriseMeClick } from '../services/stats'
import LoadingFacts from './LoadingFacts'
import CardCarousel from './CardCarousel'
import { renderContent } from '../utils/contentRenderer'

export default function LearnScreen({
  topic,
  hook,
  content,
  hyperlinks,
  suggestions = { related: [], tangents: [] },
  breadcrumbs = [],
  currentIndex = 0,
  currentPart = 1,
  onBack,
  onGoDeeper,
  onBreadcrumbClick,
  onKeepReading,
  loading,
  progress,
  loadingContinuation,
  selectedCategories = null
}) {
  const [quickCard, setQuickCard] = useState(null) // { term, text, hyperlinks }
  const [loadingCard, setLoadingCard] = useState(false)
  const [loadingSurprise, setLoadingSurprise] = useState(false)

  // Reset loadingSurprise when topic changes (new article has loaded)
  useEffect(() => {
    setLoadingSurprise(false)
  }, [topic])

  const handleLinkClick = async (term) => {
    recordHyperlinkClick()
    setLoadingCard(true)
    try {
      // Pass current topic for disambiguation context
      const cardData = await generateQuickCard(term, topic)
      recordQuickCardView()
      setQuickCard({ term, ...cardData })
    } catch (error) {
      console.error('Error loading quick card:', error)
    } finally {
      setLoadingCard(false)
    }
  }

  const handleCloseCard = () => {
    setQuickCard(null)
  }

  const handleGoDeeper = (term) => {
    // Pass the Quick Card text so the article can build on it
    const cardText = quickCard?.text || null
    setQuickCard(null)
    onGoDeeper(term, cardText)
  }

  const handleSuggestionClick = async (term) => {
    // Show Quick Card preview first
    recordHyperlinkClick()
    setLoadingCard(true)
    try {
      // Pass current topic for disambiguation context
      const cardData = await generateQuickCard(term, topic)
      recordQuickCardView()
      setQuickCard({ term, ...cardData })
    } catch (error) {
      console.error('Error loading quick card:', error)
    } finally {
      setLoadingCard(false)
    }
  }

  const handleSurpriseMe = async () => {
    recordSurpriseMeClick()
    setLoadingSurprise(true)
    // Import the function at runtime
    const { generateSurpriseTopic } = await import('../services/claude')
    // Pass selected categories to filter surprise topics
    const randomTopic = await generateSurpriseTopic(selectedCategories)
    // Don't reset loadingSurprise - the component will re-render with new topic
    // and the overlay will naturally disappear when the hook shows
    onGoDeeper(randomTopic)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Content area - Full screen card carousel */}
      <div className="h-full">
          {content !== null && content !== undefined ? (
            <CardCarousel
              content={content}
              topic={topic}
              onLinkClick={handleLinkClick}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-md p-5 md:p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-gray-500">Loading more...</span>
            </div>
          )}

          {/* Deep Dive button - shows when content is loaded and not at max parts */}
          {content && currentPart < 4 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={onKeepReading}
                disabled={loadingContinuation}
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {loadingContinuation ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading more...</span>
                  </>
                ) : (
                  <>
                    <span>🤿 Deep Dive</span>
                    <span className="text-sm opacity-80">
                      (Part {currentPart + 1} of 4)
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Completed indicator when at part 4 */}
          {content && currentPart === 4 && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <div className="text-2xl mb-2">🎓</div>
              <p className="text-gray-600 font-medium">You've read the complete deep-dive!</p>
              <p className="text-sm text-gray-500 mt-1">Explore related topics below or start a new adventure</p>
            </div>
          )}
        </div>

        {/* Where to next? section */}
        {(suggestions.related.length > 0 || suggestions.tangents.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">🐇 Where to next?</h2>

            {/* Combined suggestions - Rabbit Hole options */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[...suggestions.related, ...suggestions.tangents].slice(0, 6).map((suggestedTopic, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestedTopic)}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg transition-colors"
                >
                  {suggestedTopic}
                </button>
              ))}
            </div>

            {/* Surprise Me button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSurpriseMe}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ✨ Surprise Me
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Card Pop-up - MOVED OUTSIDE CONTAINER */}
      {quickCard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            overflowY: 'auto'
          }}
          onClick={handleCloseCard}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '672px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{quickCard.term}</h3>
              <button
                onClick={handleCloseCard}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '32px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* Card content */}
            <div style={{ color: '#1F2937', fontSize: '18px', lineHeight: '1.75', marginBottom: '24px' }}>
              {renderContent(quickCard.text, handleLinkClick)}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleGoDeeper(quickCard.term)}
                style={{
                  flex: 1,
                  backgroundColor: '#4F46E5',
                  color: 'white',
                  fontWeight: '600',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Go Deeper →
              </button>
              <button
                onClick={handleCloseCard}
                style={{
                  flex: 1,
                  backgroundColor: '#E5E7EB',
                  color: '#1F2937',
                  fontWeight: '600',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Keep Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for quick cards - subtle version */}
      {loadingCard && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg p-3 shadow-lg z-40 flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      )}

      {/* Loading indicator for "Go Deeper" navigation - subtle version */}
      {loading && progress && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg p-3 shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-gray-600">{progress.message}</span>
        </div>
      )}

      {/* Full-screen loading overlay for Surprise Me */}
      {/* Shows until topic changes (useEffect resets loadingSurprise) */}
      {loadingSurprise && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-[100000] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              Finding something fascinating...
            </h2>
            <LoadingFacts />
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
        </div>
      </div>

    </div>
  )
}
