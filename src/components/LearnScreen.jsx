import { useState } from 'react'
import { generateContent, generateFlashcard, generateDeepDive } from '../services/claude'

export default function LearnScreen({ initialContent, initialTopic, onBack }) {
  const [content, setContent] = useState(initialContent)
  const [topic, setTopic] = useState(initialTopic)
  const [loading, setLoading] = useState(false)
  const [savedCards, setSavedCards] = useState([])
  const [error, setError] = useState(null)
  const [deepDiveProgress, setDeepDiveProgress] = useState(null)

  const handleDeeper = async () => {
    setLoading(true)
    setError(null)

    try {
      const newContent = await generateContent(topic, 'deeper', content)
      setContent(newContent)
    } catch (err) {
      setError('Failed to generate content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTangent = async () => {
    setLoading(true)
    setError(null)

    try {
      // If no content yet, use the topic as context
      const context = content || `The topic: ${topic}`
      const newContent = await generateContent(topic, 'tangent', context)
      setContent(newContent)
      // Update topic based on the tangent (we'll use the first sentence as a proxy)
      const firstSentence = newContent.split('.')[0]
      setTopic(firstSentence)
    } catch (err) {
      setError('Failed to generate content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndContinue = async () => {
    setLoading(true)
    setError(null)

    try {
      // Generate multiple flashcards from current content
      const flashcards = await generateFlashcard(content)

      // Add to saved cards with unique IDs
      const newCards = flashcards.map((flashcard, index) => ({
        id: Date.now() + index,
        ...flashcard,
        createdAt: new Date().toISOString()
      }))
      setSavedCards([...savedCards, ...newCards])

      // Save to localStorage
      const existingCards = JSON.parse(localStorage.getItem('flashcards') || '[]')
      localStorage.setItem('flashcards', JSON.stringify([...existingCards, ...newCards]))

      // Continue with deeper content
      const newContent = await generateContent(topic, 'deeper', content)
      setContent(newContent)
    } catch (err) {
      setError('Failed to save cards. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLearnEverything = async () => {
    setLoading(true)
    setError(null)
    setDeepDiveProgress({ current: 0, total: 0, section: 'Generating outline...' })

    try {
      const fullContent = await generateDeepDive(topic, (current, total, section) => {
        setDeepDiveProgress({ current, total, section })
      })

      setContent(fullContent)
      setDeepDiveProgress(null)
    } catch (err) {
      setError('Failed to generate comprehensive content. Please try again.')
      setDeepDiveProgress(null)
    } finally {
      setLoading(false)
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
          {deepDiveProgress ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="text-2xl font-bold text-indigo-600 mb-2">
                  {deepDiveProgress.current > 0 ? `${deepDiveProgress.current} / ${deepDiveProgress.total}` : 'Preparing...'}
                </div>
                <div className="text-gray-600">
                  {deepDiveProgress.section}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${deepDiveProgress.total > 0 ? (deepDiveProgress.current / deepDiveProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">
              {content.split('\n\n').map((paragraph, index) => {
                // Check if it's a heading
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold mb-4 text-gray-900">{paragraph.slice(2)}</h1>
                }
                if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-gray-800">{paragraph.slice(3)}</h2>
                }
                return (
                  <p key={index} className="mb-4 text-gray-800 leading-relaxed">
                    {paragraph}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-4">
          {/* Learn Everything button - prominent */}
          <button
            onClick={handleLearnEverything}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-5 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && deepDiveProgress ? 'Generating...' : 'Learn Everything'}
          </button>

          {/* Standard buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleDeeper}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && !deepDiveProgress ? 'Loading...' : 'Go Deeper'}
            </button>

            <button
              onClick={handleTangent}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && !deepDiveProgress ? 'Loading...' : 'Take a Tangent'}
            </button>

            <button
              onClick={handleSaveAndContinue}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && !deepDiveProgress ? 'Loading...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
