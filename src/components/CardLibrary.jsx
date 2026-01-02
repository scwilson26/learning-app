import { useState, useEffect } from 'react'

export default function CardLibrary({ onBack }) {
  const [cards, setCards] = useState([])
  const [expandedCardId, setExpandedCardId] = useState(null)

  useEffect(() => {
    // Load all cards from localStorage
    const savedCards = JSON.parse(localStorage.getItem('flashcards') || '[]')
    // Sort by creation date, newest first
    const sortedCards = savedCards.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    )
    setCards(sortedCards)
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return 'Not reviewed yet'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Due for review'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  const toggleCard = (cardId) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId)
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Cards Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Start learning and save flashcards to build your library.
          </p>
          <button
            onClick={onBack}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </button>
          <div className="text-sm text-gray-600">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} total
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">Card Library</h1>

        {/* Card list */}
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <button
                onClick={() => toggleCard(card.id)}
                className="w-full px-6 py-4 text-left flex justify-between items-start gap-4"
              >
                <div className="flex-1">
                  <p className="text-gray-800 font-medium mb-1">
                    {card.question}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(card.nextReview)}
                  </p>
                </div>
                <span className="text-gray-400 text-xl flex-shrink-0">
                  {expandedCardId === card.id ? '−' : '+'}
                </span>
              </button>

              {expandedCardId === card.id && (
                <div className="px-6 pb-4 border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-500 mb-1 uppercase">
                    Answer
                  </p>
                  <p className="text-gray-800">
                    {card.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
