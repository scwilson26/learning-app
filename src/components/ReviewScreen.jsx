import { useState, useEffect } from 'react'

export default function ReviewScreen({ onBack }) {
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewComplete, setReviewComplete] = useState(false)

  useEffect(() => {
    // Load cards from localStorage
    const savedCards = JSON.parse(localStorage.getItem('flashcards') || '[]')

    // Filter cards that are due for review
    const now = new Date()
    const dueCards = savedCards.filter(card => {
      if (!card.nextReview) return true // New cards are always due
      return new Date(card.nextReview) <= now
    })

    setCards(dueCards)
    setReviewComplete(dueCards.length === 0)
  }, [])

  const calculateNextReview = (difficulty) => {
    const now = new Date()
    let daysToAdd

    switch (difficulty) {
      case 'easy':
        daysToAdd = 7 // Review in 7 days
        break
      case 'medium':
        daysToAdd = 3 // Review in 3 days
        break
      case 'hard':
        daysToAdd = 1 // Review tomorrow
        break
      default:
        daysToAdd = 1
    }

    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + daysToAdd)
    return nextReview.toISOString()
  }

  const handleDifficulty = (difficulty) => {
    const currentCard = cards[currentIndex]

    // Update card with next review date
    const updatedCard = {
      ...currentCard,
      nextReview: calculateNextReview(difficulty),
      lastReviewed: new Date().toISOString()
    }

    // Update localStorage
    const allCards = JSON.parse(localStorage.getItem('flashcards') || '[]')
    const updatedCards = allCards.map(card =>
      card.id === currentCard.id ? updatedCard : card
    )
    localStorage.setItem('flashcards', JSON.stringify(updatedCards))

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
    } else {
      setReviewComplete(true)
    }
  }

  if (reviewComplete || cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {cards.length === 0 ? 'No Cards to Review' : 'Review Complete!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {cards.length === 0
              ? 'Save some flashcards while learning to review them here.'
              : `Great job! You've reviewed ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}.`
            }
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

  const currentCard = cards[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Home
          </button>
          <div className="text-sm text-gray-600">
            Card {currentIndex + 1} of {cards.length}
          </div>
        </div>

        {/* Flashcard */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 min-h-[300px] flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase">
              Question
            </h3>
            <p className="text-xl text-gray-800 leading-relaxed">
              {currentCard.question}
            </p>
          </div>

          {showAnswer && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase">
                Answer
              </h3>
              <p className="text-xl text-gray-800 leading-relaxed">
                {currentCard.answer}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Show Answer
          </button>
        ) : (
          <div>
            <p className="text-center text-sm text-gray-600 mb-4">
              How difficult was this card?
            </p>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleDifficulty('easy')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Easy
                <span className="block text-xs mt-1 opacity-80">Review in 7 days</span>
              </button>
              <button
                onClick={() => handleDifficulty('medium')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Medium
                <span className="block text-xs mt-1 opacity-80">Review in 3 days</span>
              </button>
              <button
                onClick={() => handleDifficulty('hard')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Hard
                <span className="block text-xs mt-1 opacity-80">Review tomorrow</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
