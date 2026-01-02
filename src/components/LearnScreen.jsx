import { useState } from 'react'
import { generateContent, generateFlashcard } from '../services/claude'

// Helper function to render text with **bold** markdown
function renderTextWithBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function LearnScreen({ topic, intro, sections, onBack }) {
  const [savedCards, setSavedCards] = useState([])
  const [error, setError] = useState(null)

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

          {/* All sections with content */}
          {sections.map((section, index) => (
            <div key={index} className="mb-8">
              {/* Section title */}
              <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                {section.title}
              </h2>

              {/* Section content */}
              <div className="space-y-3">
                {section.content.split('\n').map((line, lIndex) => {
                  // Handle bullet points
                  if (line.trim().startsWith('- ')) {
                    const bulletText = line.trim().substring(2);
                    return (
                      <li key={lIndex} className="ml-5 mb-2 text-gray-800 leading-relaxed">
                        {renderTextWithBold(bulletText)}
                      </li>
                    );
                  }
                  // Skip empty lines
                  if (line.trim() === '') {
                    return null;
                  }
                  // Regular paragraph
                  return (
                    <p key={lIndex} className="mb-3 text-gray-800 leading-relaxed">
                      {renderTextWithBold(line)}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
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
