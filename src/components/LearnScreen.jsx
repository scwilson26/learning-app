import { useState } from 'react'
import { generateQuickCard } from '../services/claude'

// Helper function to render text with [[hyperlinks]]
function renderContent(text, onLinkClick) {
  // Strip ** markdown (we handle bold via CSS instead)
  text = text.replace(/\*\*/g, '');

  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, i) => {
    // Check if this is a hyperlink
    if (part.startsWith('[[') && part.endsWith(']]')) {
      let term = part.slice(2, -2);

      // Handle wiki-style links like [[display|target]] - just use the first part
      if (term.includes('|')) {
        term = term.split('|')[0];
      }

      return (
        <span
          key={i}
          onClick={() => onLinkClick(term)}
          onTouchEnd={(e) => {
            e.preventDefault()
            onLinkClick(term)
          }}
          style={{
            color: '#4F46E5',
            fontWeight: '500',
            textDecoration: 'underline',
            textDecorationThickness: '2px',
            textUnderlineOffset: '2px',
            cursor: 'pointer',
            display: 'inline-block',
            WebkitTapHighlightColor: 'rgba(79, 70, 229, 0.3)',
            touchAction: 'manipulation',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
        >
          {term}
        </span>
      );
    }

    // Check for section headers (lines starting with ##)
    if (part.trim().startsWith('## ')) {
      const headerText = part.trim().slice(3);
      return (
        <h2 key={i} className="text-xl md:text-2xl font-bold mt-6 md:mt-8 mb-3 md:mb-4 text-gray-900">
          {headerText}
        </h2>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

export default function LearnScreen({
  topic,
  hook,
  content,
  hyperlinks,
  suggestions = { related: [], tangents: [] },
  breadcrumbs = [],
  currentIndex = 0,
  onBack,
  onGoDeeper,
  onBreadcrumbClick,
  loading,
  progress
}) {
  const [quickCard, setQuickCard] = useState(null) // { term, text, hyperlinks }
  const [loadingCard, setLoadingCard] = useState(false)

  const handleLinkClick = async (term) => {
    setLoadingCard(true)
    try {
      const cardData = await generateQuickCard(term)
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
    setQuickCard(null)
    onGoDeeper(term)
  }

  const handleSuggestionClick = async (term) => {
    // Show Quick Card preview first
    setLoadingCard(true)
    try {
      const cardData = await generateQuickCard(term)
      setQuickCard({ term, ...cardData })
    } catch (error) {
      console.error('Error loading quick card:', error)
    } finally {
      setLoadingCard(false)
    }
  }

  const handleSurpriseMe = async () => {
    // Import the function at runtime
    const { generateSurpriseTopic } = await import('../services/claude')
    const randomTopic = await generateSurpriseTopic()
    onGoDeeper(randomTopic)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb Navigation */}
        {breadcrumbs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mb-4 p-3 overflow-x-auto">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    onClick={() => onBreadcrumbClick(index)}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      index === currentIndex
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {crumb.topic}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </button>
          {breadcrumbs.length >= 5 && (
            <div className="text-sm text-indigo-600 font-medium">
              🎯 {breadcrumbs.length} topics deep!
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="bg-white rounded-lg shadow-lg p-5 md:p-8 mb-6">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-900">{topic}</h1>

          {/* Hook paragraph - larger, bold */}
          <p className="text-base md:text-lg font-semibold mb-4 md:mb-6 text-gray-900 leading-relaxed">
            {renderContent(hook, handleLinkClick)}
          </p>

          {/* Body content - render paragraphs */}
          <div className="space-y-3 md:space-y-4 text-gray-800 leading-relaxed text-base md:text-lg">
            {content.split('\n\n').map((paragraph, idx) => {
              // Skip empty paragraphs
              if (!paragraph.trim()) return null;

              // Check if this is a header
              if (paragraph.trim().startsWith('## ')) {
                const headerText = paragraph.trim().slice(3);
                return (
                  <h2 key={idx} className="text-xl md:text-2xl font-bold mt-6 md:mt-8 mb-3 md:mb-4 text-gray-900">
                    {renderContent(headerText, handleLinkClick)}
                  </h2>
                );
              }

              return (
                <p key={idx} className="mb-4">
                  {renderContent(paragraph, handleLinkClick)}
                </p>
              );
            })}
          </div>
        </div>

        {/* Where to next? section */}
        {(suggestions.related.length > 0 || suggestions.tangents.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">🎯 Where to next?</h2>

            {suggestions.related.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Related</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.related.map((suggestedTopic, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestedTopic)}
                      className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg transition-colors"
                    >
                      {suggestedTopic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {suggestions.tangents.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Tangents</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.tangents.map((suggestedTopic, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestedTopic)}
                      className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg transition-colors"
                    >
                      {suggestedTopic}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

    </div>
  )
}
