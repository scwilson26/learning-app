import { useState } from 'react'
import { generateContent, generateFlashcard, generateSection } from '../services/claude'

export default function LearnScreen({ topic, intro, sections, onBack }) {
  const [savedCards, setSavedCards] = useState([])
  const [error, setError] = useState(null)

  // Track which sections are expanded and their content
  const [expandedSections, setExpandedSections] = useState({})
  const [sectionContent, setSectionContent] = useState({})
  const [loadingSections, setLoadingSections] = useState({})

  const handleToggleSection = async (sectionTitle, index) => {
    // If already expanded, just collapse it
    if (expandedSections[index]) {
      setExpandedSections(prev => ({ ...prev, [index]: false }))
      return
    }

    // If we already have content cached, just expand it
    if (sectionContent[index]) {
      setExpandedSections(prev => ({ ...prev, [index]: true }))
      return
    }

    // Otherwise, fetch the content
    setLoadingSections(prev => ({ ...prev, [index]: true }))
    setError(null)

    try {
      const content = await generateSection(topic, sectionTitle)
      setSectionContent(prev => ({ ...prev, [index]: content }))
      setExpandedSections(prev => ({ ...prev, [index]: true }))
    } catch (err) {
      setError(`Failed to load section: ${sectionTitle}`)
    } finally {
      setLoadingSections(prev => ({ ...prev, [index]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button and card counter */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </button>
          <div className="bg-white px-4 py-2 rounded-full shadow-sm">
            <span className="text-sm font-medium text-gray-700">
              {savedCards.length} {savedCards.length === 1 ? 'card' : 'cards'} saved
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{topic}</h1>

          {/* Intro paragraph */}
          <p className="mb-6 text-gray-800 leading-relaxed">{intro}</p>

          {/* Section outline with collapsible content */}
          <div className="space-y-3">
            {sections.map((sectionTitle, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Section header - clickable */}
                <button
                  onClick={() => handleToggleSection(sectionTitle, index)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
                >
                  <h2 className="text-lg font-semibold text-gray-800 text-left">
                    {sectionTitle}
                  </h2>
                  <span className="text-gray-500 text-xl">
                    {loadingSections[index] ? (
                      <span className="animate-spin inline-block">⟳</span>
                    ) : expandedSections[index] ? (
                      '▼'
                    ) : (
                      '▶'
                    )}
                  </span>
                </button>

                {/* Section content - expandable */}
                {expandedSections[index] && sectionContent[index] && (
                  <div className="px-4 py-4 bg-white">
                    {sectionContent[index].split('\n\n').map((paragraph, pIndex) => (
                      <p key={pIndex} className="mb-3 text-gray-800 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            disabled
            className="bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg cursor-not-allowed opacity-50"
          >
            Go Deeper
          </button>

          <button
            disabled
            className="bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg cursor-not-allowed opacity-50"
          >
            Take a Tangent
          </button>

          <button
            disabled
            className="bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg cursor-not-allowed opacity-50"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
