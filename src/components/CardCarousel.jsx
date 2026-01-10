import { useState, useEffect, useRef } from 'react'
import { renderContent } from '../utils/contentRenderer'

export default function CardCarousel({
  content,
  topic,
  onLinkClick,
  // Action cards props
  currentPart,
  loadingContinuation,
  onKeepReading,
  suggestions,
  onSuggestionClick,
  onSurpriseMe
}) {
  if (!content) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Track scroll position to determine active card
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const cards = container.querySelectorAll('[data-card-index]');

      // Find which card is closest to the top of viewport
      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerRect.top);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = idx;
        }
      });

      setActiveIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Set initial active card

    return () => container.removeEventListener('scroll', handleScroll);
  }, [content, currentPart, suggestions]);

  // Split content into blocks by CARD: markers
  const blocks = [];
  const lines = content.split('\n');
  let currentBlock = { type: null, content: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for PART divider (skip it)
    if (line.trim().match(/^---PART-(\d)---$/)) {
      if (currentBlock.content.length > 0) {
        blocks.push(currentBlock);
      }
      blocks.push({ type: 'part', content: [line] });
      currentBlock = { type: null, content: [] };
      continue;
    }

    // Check for CARD marker
    if (line.trim().startsWith('CARD:')) {
      if (currentBlock.content.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = { type: 'card', content: [line] };
      continue;
    }

    // Add line to current block
    currentBlock.content.push(line);
  }

  // Push last block
  if (currentBlock.content.length > 0) {
    blocks.push(currentBlock);
  }

  // Filter to only card blocks
  const cardBlocks = blocks.filter(b => b.type === 'card');

  // Calculate total number of cards for indexing
  let cardIndex = 0;

  return (
    <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory snap-center hide-scrollbar">
      {/* Content cards */}
      {cardBlocks.map((block, idx) => {
        const cardText = block.content.join('\n');
        const cardMatch = cardText.trim().match(/^CARD:\s*(.+?)\n([\s\S]+)$/);
        if (!cardMatch) return null;

        const cardTitle = cardMatch[1].trim();
        const cardContent = cardMatch[2].trim();
        const currentCardIndex = cardIndex++;
        const isActive = currentCardIndex === activeIndex;

        return (
          <div
            key={`content-${idx}`}
            data-card-index={currentCardIndex}
            className="snap-center flex items-center justify-center px-4 py-2 min-h-screen transition-opacity duration-300"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 w-full max-w-xl">
                <div className="text-sm md:text-base font-semibold text-gray-900 mb-2">{cardTitle}</div>
                <div className="text-xs md:text-sm text-gray-800 leading-snug ml-2">
                  {renderContent(cardContent, onLinkClick)}
                </div>
              </div>
            </div>
          );
        })}

      {/* Deep Dive card - shows when not at max parts */}
      {currentPart < 4 && (() => {
        const currentCardIndex = cardIndex++;
        const isActive = currentCardIndex === activeIndex;
        return (
          <div
            key="deep-dive-card"
            data-card-index={currentCardIndex}
            className="snap-center flex items-center justify-center px-4 py-2 min-h-screen transition-opacity duration-300"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🤿</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to dive deeper?</h2>
              <p className="text-gray-600">
                Continue reading to learn more about {topic}
              </p>
            </div>
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
                  <span>Deep Dive</span>
                  <span className="text-sm opacity-80">
                    (Part {currentPart + 1} of 4)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
        );
      })()}

      {/* Completed indicator card when at part 4 */}
      {currentPart === 4 && (() => {
        const currentCardIndex = cardIndex++;
        const isActive = currentCardIndex === activeIndex;
        return (
          <div
            key="completed-card"
            data-card-index={currentCardIndex}
            className="snap-center flex items-center justify-center px-4 py-2 min-h-screen transition-opacity duration-300"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xl text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete!</h2>
            <p className="text-gray-600 text-lg mb-2">You've read the complete deep-dive!</p>
            <p className="text-sm text-gray-500">Swipe to explore related topics or start a new adventure</p>
          </div>
        </div>
        );
      })()}

      {/* Where to next card */}
      {suggestions && (suggestions.related.length > 0 || suggestions.tangents.length > 0) && (() => {
        const currentCardIndex = cardIndex++;
        const isActive = currentCardIndex === activeIndex;
        return (
          <div
            key="suggestions-card"
            data-card-index={currentCardIndex}
            className="snap-center flex items-center justify-center px-4 py-2 min-h-screen transition-opacity duration-300"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xl">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">🐇 Where to next?</h2>

            {/* Combined suggestions - Rabbit Hole options */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[...suggestions.related, ...suggestions.tangents].slice(0, 6).map((suggestedTopic, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(suggestedTopic)}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg transition-colors"
                >
                  {suggestedTopic}
                </button>
              ))}
            </div>

            {/* Surprise Me button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={onSurpriseMe}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ✨ Surprise Me
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
