import { useState } from 'react'
import { generateContent, generateFlashcard } from '../services/claude'

export default function LearnScreen({ initialContent, initialTopic, onBack }) {
  const [content, setContent] = useState(initialContent)
  const [topic, setTopic] = useState(initialTopic)
  const [loading, setLoading] = useState(false)
  const [savedCards, setSavedCards] = useState([])
  const [error, setError] = useState(null)

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
      const newContent = await generateContent(topic, 'tangent', content)
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
      // Generate a flashcard from current content
      const flashcard = await generateFlashcard(content)

      // Add to saved cards
      const newCard = {
        id: Date.now(),
        ...flashcard,
        createdAt: new Date().toISOString()
      }
      setSavedCards([...savedCards, newCard])

      // Save to localStorage
      const existingCards = JSON.parse(localStorage.getItem('flashcards') || '[]')
      localStorage.setItem('flashcards', JSON.stringify([...existingCards, newCard]))

      // Continue with deeper content
      const newContent = await generateContent(topic, 'deeper', content)
      setContent(newContent)
    } catch (err) {
      setError('Failed to save card. Please try again.')
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
          <div className="prose prose-lg max-w-none">
            {content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4 text-gray-800 leading-relaxed">
                {paragraph}
              </p>
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
        <div className="space-y-4">
          {/* Explore section */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Keep Exploring:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleDeeper}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'More on This Topic'}
              </button>

              <button
                onClick={handleTangent}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Explore Something Related'}
              </button>
            </div>
          </div>

          {/* Save section */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Save as Flashcard:</p>
            <button
              onClick={handleSaveAndContinue}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Loading...' : '💾 Save & Continue Learning'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Creates a flashcard from this content and continues exploring
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
