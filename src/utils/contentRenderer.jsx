// Helper function to render text with [[hyperlinks]], **bold**, and bullet points
export function renderContent(text, onLinkClick) {
  if (!text) return null;

  // Split by newlines first to handle bullets
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    // Check if this line is a bullet point
    if (line.trim().startsWith('- ')) {
      const bulletText = line.trim().slice(2);
      return (
        <div key={lineIndex} className="flex gap-2 mb-2">
          <span className="text-indigo-600 font-bold flex-shrink-0">•</span>
          <span>{renderTextWithMarkup(bulletText, onLinkClick)}</span>
        </div>
      );
    }

    // Regular paragraph
    if (line.trim()) {
      return (
        <p key={lineIndex} className="mb-2">
          {renderTextWithMarkup(line, onLinkClick)}
        </p>
      );
    }

    return null;
  });
}

// Helper to render hyperlinks and bold within a single line of text
export function renderTextWithMarkup(text, onLinkClick) {
  // First split by bold markers
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((boldPart, i) => {
    // Check if this is bold text
    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
      const boldText = boldPart.slice(2, -2);
      // Process hyperlinks within bold text
      return (
        <strong key={i} className="font-bold text-gray-900">
          {processHyperlinks(boldText, onLinkClick)}
        </strong>
      );
    }

    // Process hyperlinks in non-bold text
    return <span key={i}>{processHyperlinks(boldPart, onLinkClick)}</span>;
  });
}

// Process hyperlinks within text
export function processHyperlinks(text, onLinkClick) {
  const parts = text.split(/(\[\[.*?\]\])/g);

  return parts.map((part, i) => {
    // Check if this is a hyperlink
    if (part.startsWith('[[') && part.endsWith(']]')) {
      let term = part.slice(2, -2);

      // Handle wiki-style links like [[display|target]] - just use the first part
      if (term.includes('|')) {
        term = term.split('|')[0];
      }

      return (
        <span
          key={i}
          onClick={() => onLinkClick(term)}
          onTouchEnd={(e) => {
            e.preventDefault()
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
        <h2 key={i} className="text-xl md:text-2xl font-bold mt-6 md:mt-8 mb-3 md:mb-4 text-gray-900">
          {headerText}
        </h2>
      );
    }

    return <span key={i}>{part}</span>;
  });
}
