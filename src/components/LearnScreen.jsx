import { useState } from 'react'
import { generateQuickCard } from '../services/claude'

// Helper function to render text with [[hyperlinks]]
function renderContent(text, onLinkClick, addDebugLog) {
  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, i) => {
    // Check if this is a hyperlink
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const term = part.slice(2, -2);

      return (
        <span
          key={i}
          onClick={() => {
            addDebugLog(`SPAN CLICKED: ${term}`)
            onLinkClick(term)
          }}
          onTouchStart={() => {
            addDebugLog(`TOUCH START: ${term}`)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            addDebugLog(`TOUCH END: ${term}`)
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
        <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-gray-900">
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
  breadcrumbs = [],
  onBack,
  onGoDeeper,
  onBreadcrumbClick,
  loading,
  progress
}) {
  const [quickCard, setQuickCard] = useState(null) // { term, text, hyperlinks }
  const [loadingCard, setLoadingCard] = useState(false)
  const [debugLogs, setDebugLogs] = useState([])

  const addDebugLog = (message) => {
    setDebugLogs(prev => [...prev.slice(-4), message])
  }

  const handleLinkClick = async (term) => {
    console.log('handleLinkClick called with:', term)
    addDebugLog(`handleLinkClick: ${term}`)
    setLoadingCard(true)
    try {
      const cardData = await generateQuickCard(term, topic)
      setQuickCard({ term, ...cardData })
      addDebugLog(`Card loaded: ${term}`)
    } catch (error) {
      console.error('Error loading quick card:', error)
      addDebugLog(`ERROR: ${error.message}`)
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
                      index === breadcrumbs.length - 1
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
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Title */}
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{topic}</h1>

          {/* Hook paragraph - larger, bold */}
          <p className="text-xl font-semibold mb-6 text-gray-900 leading-relaxed">
            {renderContent(hook, handleLinkClick, addDebugLog)}
          </p>

          {/* Body content - render paragraphs */}
          <div className="space-y-4 text-gray-800 leading-relaxed text-lg">
            {content.split('\n\n').map((paragraph, idx) => {
              // Skip empty paragraphs
              if (!paragraph.trim()) return null;

              // Check if this is a header
              if (paragraph.trim().startsWith('## ')) {
                const headerText = paragraph.trim().slice(3);
                return (
                  <h2 key={idx} className="text-2xl font-bold mt-8 mb-4 text-gray-900">
                    {renderContent(headerText, handleLinkClick, addDebugLog)}
                  </h2>
                );
              }

              return (
                <p key={idx} className="mb-4">
                  {renderContent(paragraph, handleLinkClick, addDebugLog)}
                </p>
              );
            })}
          </div>
        </div>

        {/* Quick Card Pop-up */}
        {quickCard && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50"
            onClick={handleCloseCard}
          >
            <div
              className="bg-white rounded-t-2xl md:rounded-2xl p-6 max-w-2xl w-full md:mx-4 shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{quickCard.term}</h3>
                <button
                  onClick={handleCloseCard}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Card content */}
              <div className="text-gray-800 text-lg leading-relaxed mb-6">
                {renderContent(quickCard.text, handleLinkClick, addDebugLog)}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleGoDeeper(quickCard.term)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Go Deeper →
                </button>
                <button
                  onClick={handleCloseCard}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Keep Reading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay for quick cards */}
        {loadingCard && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        )}

        {/* Loading overlay for "Go Deeper" navigation */}
        {loading && progress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md">
              <div className="text-center">
                <div className="text-lg font-medium text-indigo-600 mb-4">
                  {progress.message}
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug console for mobile */}
        {debugLogs.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 text-green-400 p-4 text-xs font-mono z-50 max-h-32 overflow-y-auto">
            {debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
