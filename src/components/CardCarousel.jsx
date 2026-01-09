import { useState, useEffect } from 'react'
import { renderContent } from '../utils/contentRenderer'

export default function CardCarousel({ content, topic, onLinkClick }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  // Reset card index when content changes
  useEffect(() => {
    setCurrentCardIndex(0)
  }, [content])

  if (!content) return null;

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

  // Swipe handlers
  let touchStartY = 0;
  let touchStartX = 0;
  let scrollAtStart = 0;

  const handleTouchStart = (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    scrollAtStart = window.scrollY;
  };

  const handleTouchMove = (e) => {
    const touchCurrentY = e.touches[0].clientY;
    const touchCurrentX = e.touches[0].clientX;
    const deltaY = touchStartY - touchCurrentY;
    const deltaX = Math.abs(touchStartX - touchCurrentX);

    // Prevent scroll during vertical swipe
    if (Math.abs(deltaY) > 10 && deltaX < 30) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY - touchEndY;
    const deltaX = Math.abs(touchStartX - touchEndX);

    // Only trigger if vertical swipe is significant
    if (Math.abs(deltaY) > 50 && deltaX < 30) {
      e.preventDefault();
      if (deltaY > 0 && currentCardIndex < cardBlocks.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (deltaY < 0 && currentCardIndex > 0) {
        setCurrentCardIndex(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: scrollAtStart, behavior: 'instant' });
    }
  };

  return (
    <div>
      {/* Snap scroll container */}
      <div
        className="overflow-y-auto snap-y snap-mandatory h-[80vh] hide-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={(e) => {
          const container = e.target;
          const cardHeight = container.scrollHeight / cardBlocks.length;
          const newIndex = Math.round(container.scrollTop / cardHeight);
          if (newIndex !== currentCardIndex && newIndex >= 0 && newIndex < cardBlocks.length) {
            setCurrentCardIndex(newIndex);
          }
        }}
      >
        {cardBlocks.map((block, idx) => {
          const cardText = block.content.join('\n');
          const cardMatch = cardText.trim().match(/^CARD:\s*(.+?)\n([\s\S]+)$/);
          if (!cardMatch) return null;

          const cardTitle = cardMatch[1].trim();
          const cardContent = cardMatch[2].trim();
          const isActive = idx === currentCardIndex;

          return (
            <div
              key={idx}
              className="snap-center h-[80vh] flex items-center justify-center px-4 py-8 transition-opacity duration-300"
              style={{
                opacity: isActive ? 1 : 0.25
              }}
            >
              <div className="bg-white rounded-xl shadow-lg p-5 md:p-6 w-full max-w-xl max-h-[70vh] overflow-y-auto">
                <div className="text-center mb-4">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 capitalize">{topic}</h1>
                </div>
                <div className="text-base md:text-lg font-semibold text-gray-900 mb-3">{cardTitle}</div>
                <div className="text-sm md:text-base text-gray-800 leading-relaxed ml-3">
                  {renderContent(cardContent, onLinkClick)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card navigation dots */}
      <div className="flex justify-center gap-2 mt-4 mb-6">
        {cardBlocks.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentCardIndex(idx);
              const container = document.querySelector('.snap-y');
              if (container) {
                const cardHeight = container.scrollHeight / cardBlocks.length;
                container.scrollTo({ top: idx * cardHeight, behavior: 'smooth' });
              }
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentCardIndex
                ? 'bg-indigo-600 w-6'
                : 'bg-gray-300'
            }`}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
