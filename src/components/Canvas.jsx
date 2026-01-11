import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

// Category data - Level 1 cards with unique themes
const CATEGORIES = [
  {
    id: 'arts',
    name: 'Arts',
    emoji: '🎨',
    gradient: 'from-pink-500 to-rose-600',
    description: 'From cave paintings to digital art. Explore the creative expressions that define human culture across millennia.'
  },
  {
    id: 'biology',
    name: 'Biology & Health',
    emoji: '🧬',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'The science of life itself. Discover how living things work, from tiny cells to entire ecosystems.'
  },
  {
    id: 'everyday',
    name: 'Everyday Life',
    emoji: '☕',
    gradient: 'from-amber-500 to-orange-600',
    description: 'The things we do, eat, and enjoy. Explore the fascinating stories behind ordinary life.'
  },
  {
    id: 'geography',
    name: 'Geography',
    emoji: '🌍',
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Mountains, rivers, cities, and nations. Explore the places that shape our world.'
  },
  {
    id: 'history',
    name: 'History',
    emoji: '📜',
    gradient: 'from-yellow-600 to-amber-700',
    description: 'Wars, revolutions, and empires. The stories of how we got here and the people who shaped the world.'
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    emoji: '🔢',
    gradient: 'from-indigo-500 to-purple-600',
    description: 'The language of the universe. From simple numbers to mind-bending theories that explain reality.'
  },
  {
    id: 'people',
    name: 'People',
    emoji: '👤',
    gradient: 'from-sky-500 to-blue-600',
    description: 'The remarkable humans who changed everything. Leaders, artists, scientists, and outlaws.'
  },
  {
    id: 'philosophy',
    name: 'Philosophy & Religion',
    emoji: '🧘',
    gradient: 'from-violet-500 to-purple-700',
    description: 'The big questions. What is real? What is good? What do we believe and why?'
  },
  {
    id: 'physics',
    name: 'Physical Sciences',
    emoji: '⚛️',
    gradient: 'from-blue-500 to-indigo-700',
    description: 'Atoms, stars, and everything between. The rules that govern the universe.'
  },
  {
    id: 'society',
    name: 'Society',
    emoji: '🏛️',
    gradient: 'from-slate-500 to-gray-700',
    description: 'How humans organize themselves. Politics, economics, laws, and cultures.'
  },
  {
    id: 'technology',
    name: 'Technology',
    emoji: '💻',
    gradient: 'from-green-500 to-emerald-700',
    description: 'The tools we build. From ancient inventions to AI and beyond.'
  },
]

function CategoryCard({ category, onClaim, claimed }) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleClick = (e) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const handleClaim = (e) => {
    e.stopPropagation()
    onClaim(category.id)
    setIsFlipped(false)
  }

  return (
    <div
      className="w-40 h-56 cursor-pointer perspective-1000"
      onClick={handleClick}
      style={{ perspective: '1000px' }}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-500
          ${isFlipped ? '[transform:rotateY(180deg)]' : ''}
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
        >
          <div className={`
            absolute inset-0 rounded-xl
            bg-gradient-to-br ${category.gradient}
            shadow-lg hover:shadow-xl transition-shadow
            ${claimed ? 'ring-4 ring-yellow-400' : ''}
          `} />
          <div className="absolute inset-[4px] rounded-lg bg-white flex flex-col items-center justify-center">
            <span className="text-5xl mb-3">{category.emoji}</span>
            <span className="text-sm font-semibold text-gray-800 text-center px-4">{category.name}</span>
            {claimed && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className={`
            absolute inset-0 rounded-xl
            bg-gradient-to-br ${category.gradient}
            shadow-lg
          `} />
          <div className="absolute inset-[4px] rounded-lg bg-white flex flex-col p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2">{category.name}</h3>
            <p className="text-xs text-gray-600 flex-1 leading-relaxed">{category.description}</p>
            {!claimed && (
              <button
                onClick={handleClaim}
                className={`
                  mt-3 py-2 px-4 rounded-lg text-xs font-bold text-white
                  bg-gradient-to-r ${category.gradient}
                  hover:opacity-90 active:scale-95 transition-all
                `}
              >
                Claim Card
              </button>
            )}
            {claimed && (
              <div className="mt-3 py-2 px-4 rounded-lg text-xs font-bold text-center text-yellow-600 bg-yellow-100">
                ✓ Claimed!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Canvas() {
  const [claimedCards, setClaimedCards] = useState(new Set())

  const handleClaim = (cardId) => {
    setClaimedCards(prev => new Set([...prev, cardId]))
  }

  return (
    <div className="w-screen h-screen bg-gray-100 overflow-hidden">

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        centerOnInit={true}
        limitToBounds={false}
        panning={{ velocityDisabled: false }}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          {/* The infinite canvas - cards positioned in a grid */}
          <div className="w-[1200px] h-[1000px] relative flex items-center justify-center">
            <div className="grid grid-cols-4 gap-20 p-16">
              {CATEGORIES.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  claimed={claimedCards.has(category.id)}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Collection counter - fixed position */}
      <div className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200 shadow-sm">
        <span className="text-gray-500 text-sm">Cards collected: </span>
        <span className="text-gray-800 font-bold">{claimedCards.size} / 5,000</span>
      </div>
    </div>
  )
}
