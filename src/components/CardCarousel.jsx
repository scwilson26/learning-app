import { useState, useEffect } from 'react'
import { renderContent } from '../utils/contentRenderer'

export default function CardCarousel({ content, topic, onLinkClick }) {
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

  return (
    <div className="snap-y snap-proximity space-y-4">
      {cardBlocks.map((block, idx) => {
        const cardText = block.content.join('\n');
        const cardMatch = cardText.trim().match(/^CARD:\s*(.+?)\n([\s\S]+)$/);
        if (!cardMatch) return null;

        const cardTitle = cardMatch[1].trim();
        const cardContent = cardMatch[2].trim();

        return (
          <div
            key={idx}
            className="snap-center min-h-[75vh] flex items-center justify-center px-4 py-4"
          >
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 w-full max-w-xl max-h-[70vh] overflow-y-auto">
                <div className="text-center mb-3">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-2 capitalize">{topic}</h1>
                </div>
                <div className="text-sm md:text-base font-semibold text-gray-900 mb-2">{cardTitle}</div>
                <div className="text-xs md:text-sm text-gray-800 leading-snug ml-2">
                  {renderContent(cardContent, onLinkClick)}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
