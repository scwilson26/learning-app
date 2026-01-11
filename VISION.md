# Learning App - Product Vision

## The Big Idea

**An infinite canvas of knowledge where every card contains more cards.**

Imagine Google Maps, but for learning. You zoom out and see broad categories. Zoom in and see topics. Zoom in further and see the actual content. Pan around to explore adjacent ideas. Your entire learning journey is visible as a spatial map that YOU built through curiosity.

The goal: **Collect all the cards.** Learning becomes a game.

## Core Concept: Cards Within Cards

The entire app is one infinite 2D canvas. You can pan (drag) and zoom (pinch) anywhere.

### Zoom Levels

```
LEVEL 1 - Categories (furthest out)
┌─────────┐ ┌─────────┐ ┌─────────┐
│ History │ │ Science │ │   Art   │
└─────────┘ └─────────┘ └─────────┘
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Tech   │ │ Nature  │ │  Music  │
└─────────┘ └─────────┘ └─────────┘

LEVEL 2 - Sub-categories (zoom into History)
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Ancient│ │Medieval│ │ Wars  │ │Empires│
└───────┘ └───────┘ └───────┘ └───────┘

LEVEL 3 - Topics (zoom into Ancient)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Egypt│ │Rome │ │Greece│ │Persia│ │China│
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘

LEVEL 4 - Content Cards (zoom into Rome)
┌────┐ ┌────┐ ┌────┐ ┌────┐
│Card│ │Card│ │Card│ │Card│
│ 1  │ │ 2  │ │ 3  │ │ 4  │
└────┘ └────┘ └────┘ └────┘
```

### Two Gestures, Two Actions

**FLIP a card** = See the back
- Tap any card at any level to flip it over
- See the content/overview about that thing
- Flip back to see front again

**CLAIM a card** = Collect it
- After reading the back, hit "Claim" button
- NOW it's in your collection
- Card visually changes (glow, checkmark, etc.)
- Must actually engage with content to collect
- Prevents speed-tapping through cards

**ZOOM into a card** = Go deeper
- Pinch to zoom into any card
- Reveals the cards nested inside it
- History contains Ancient, Medieval, etc.
- Ancient contains Egypt, Rome, Greece, etc.
- Each level reveals more specific cards

### Every Card is Both a Container AND Content

This is the key insight. The "History" card isn't just a folder - it has its OWN content on the back (flip it to read "what is history, why does it matter"). But it also CONTAINS sub-cards (zoom in to see them).

Same at every level:
- Flip "Rome" → read a quick summary about Rome
- Zoom into "Rome" → see the detailed content cards about Rome

## The Collection Game

**Every card you flip = a card collected.**

### Visual Progress
- Unread cards: Dim/faded
- Read cards: Bright/glowing/checkmark
- Zoom out and you literally SEE your knowledge map lighting up
- "I've collected 12/47 cards in Ancient History"

### The Psychology
- Half-filled grids create "unfinished business" - you HAVE to come back
- "Just one more card" before bed
- Completionists will explore categories they'd never normally touch
- Your canvas is unique to YOU - shows your curiosity path

### Progress Visibility
- Zoomed out: See which whole categories you've explored
- Zoomed in: See which specific cards you've collected
- Your map tells the story of your learning journey

## User Experience Flow

1. Open app → See grid of category cards
2. Curious about Science → flip it → read quick summary → interesting!
3. Zoom into Science → see Physics, Biology, Chemistry, etc.
4. Flip Physics → quick overview
5. Zoom into Physics → see Quantum, Relativity, Thermodynamics...
6. Flip Quantum → "that's wild, I want more"
7. Zoom into Quantum → actual content cards
8. Flip through content cards, collecting each one
9. Zoom out → see Quantum is now "lit up" as explored
10. Pan over to Relativity → repeat

**No dead ends.** You're never stuck. Just zoom out and go sideways.

## What Makes This Unique

1. **Spatial Memory** - "Rome is left of Greece" - your brain remembers WHERE things are
2. **Fractal Knowledge** - Every card contains more cards, infinitely deep
3. **Visible Progress** - Watch your knowledge map light up over time
4. **Natural Exploration** - Pinch/zoom/pan is intuitive
5. **Context Always Visible** - Zoom out a bit, see sibling topics
6. **No Linear Path** - You're wandering, not following a curriculum
7. **The Interface IS the Game** - Exploring feels like playing

## Structure & Scale

### Depth Levels (Starting with 4)

**Level 1 - Categories:** ~10 cards
(History, Science, Art, Tech, Nature, Music, Philosophy, Sports, Food, etc.)

**Level 2 - Sub-categories:** ~80 cards (10 × 8)
(History → Ancient, Medieval, Modern, Wars, Empires, etc.)

**Level 3 - Topics:** ~800 cards (80 × 10)
(Ancient → Egypt, Rome, Greece, Persia, China, Maya, etc.)

**Level 4 - Content cards:** ~4,000 cards (800 × 5)
(Egypt → Pyramids overview, Pharaohs overview, Nile overview, etc.)

**Total: ~5,000 cards** to collect

### Category & Sub-category Map

**Arts** (8)
- Architecture, Literature, Music, Visual Arts, Film & Television, Performing Arts, Photography, Fashion & Design

**Biology & Health** (8)
- Human Body, Animals, Plants, Ecology & Environment, Medicine & Disease, Genetics & Evolution, Microbes & Viruses, Marine Life

**Everyday Life** (7)
- Food & Drink, Sports & Games, Hobbies & Recreation, Holidays & Traditions, Fashion & Clothing, Home & Living, Travel & Transport

**Geography** (8)
- Countries, Cities, Mountains & Volcanoes, Rivers & Lakes, Oceans & Seas, Islands, Deserts & Forests, Landmarks & Wonders

**History** (8)
- Ancient World, Medieval, Renaissance & Early Modern, Modern History, World Wars, Empires & Civilizations, Revolutions & Conflicts, Exploration & Discovery

**Mathematics** (6)
- Numbers & Arithmetic, Algebra, Geometry, Statistics & Probability, Famous Problems, Mathematicians

**People** (8)
- Leaders & Politicians, Scientists & Inventors, Artists & Writers, Musicians & Performers, Explorers & Adventurers, Philosophers & Thinkers, Athletes, Villains & Outlaws

**Philosophy & Religion** (7)
- World Religions, Mythology, Ethics & Morality, Logic & Reasoning, Eastern Philosophy, Western Philosophy, Spirituality & Mysticism

**Physical Sciences** (6)
- Physics, Chemistry, Astronomy & Space, Earth Science, Energy & Forces, Elements & Materials

**Society** (8)
- Politics & Government, Economics & Money, Law & Justice, Education, Media & Communication, Social Movements, War & Military, Culture & Customs

**Technology** (8)
- Computers & Internet, Engineering, Inventions, Transportation, Weapons & Defense, Communication Tech, Energy & Power, Future Tech & AI

**Totals: 11 categories, 82 sub-categories**

### Future Expansion
- Level 5+ can be added later where it makes sense
- Not every Level 4 card needs children - some are "leaf" cards
- AI can decide: big topics get sub-cards, specific facts are leaves
- System is depth-agnostic - just renders whatever cards exist
- Sub-categories can be added/changed anytime - just a config update

### Cards Per View
- Zoomed out (categories): 9-12 cards visible (3x3 or 4x3 grid)
- Zoomed into category: 6-10 sub-category cards
- Zoomed into topic: 4-8 content cards
- Always a manageable amount, never overwhelming

## Technical Considerations

### Canvas Implementation
- Infinite 2D pan/zoom canvas
- Cards rendered at appropriate detail level based on zoom
- Smooth transitions between zoom levels
- Touch-optimized gestures (pinch, pan, tap)

### Content Generation
- AI generates sub-cards when you first zoom into something
- AI generates back content when you first flip a card
- Once generated, cards are saved permanently (localStorage)
- Your cards are YOUR cards - same content forever

### Card Permanence (localStorage)
```javascript
{
  "egypt": {
    id: "egypt",
    title: "Egypt",
    backContent: "Ancient civilization along the Nile...",
    claimed: true,
    claimedAt: "2025-01-10T...",
    children: ["pyramids", "pharaohs", "nile", "cleopatra"]
  },
  "pyramids": {
    id: "pyramids",
    title: "Pyramids",
    backContent: null,  // not flipped yet
    claimed: false,
    parent: "egypt",
    children: []  // not zoomed into yet
  }
}
```

- Cards exist once generated
- Back content fills in when first flipped
- Claimed status + timestamp saved when collected
- Children generated when first zoomed into

### Card States
- Unvisited: Dim, just a title visible
- Flipped (not claimed): You've seen it but don't own it
- Claimed: Bright, checkmark, it's yours
- Fully completed (all children claimed): Gold border? Star? The flex.

### Performance
- Only render visible cards at current zoom level
- Lazy load deeper content as user zooms
- Cache collected cards locally
- Progressive detail based on zoom level

## Card Content (Same Quality Standards)

### Flip Side Content
- Self-contained summaries that make sense alone
- Varied length (30-130 words depending on level)
- Punchy, conversational tone
- **Bold** for key facts
- Hyperlinks to related cards

### Content Depth by Level
- **Category cards**: 1-2 sentence teaser about what's inside
- **Sub-category cards**: Brief overview of the area
- **Topic cards**: The hook, the interesting angle
- **Content cards**: The actual learning content (like current cards)

## The Addiction Loop

You're always torn between:
- Going **DEEP** (zooming into one area, completing it)
- Going **WIDE** (exploring new categories, discovering new things)

Both feel rewarding. Both grow your collection. Both are visible on your map.

**This turns learning into Pokemon.** Gotta catch 'em all.

## Social Possibilities (Future)

- Share your map - flex your coverage
- See where friends explored that you haven't
- "I've collected 847 cards"
- Heat maps of most popular paths
- "X also explored this after visiting Y"

## The Vision

When someone opens this app, they should feel like they're about to explore uncharted territory. Every zoom, every flip, every pan reveals something new. Your knowledge grows visually in front of you.

It's not "another learning app." It's a knowledge universe you navigate.

**Wikipedia meets Google Maps meets Pokemon.**

## Technical Stack
- React (Vite)
- Canvas/WebGL for infinite pan/zoom (or react-zoom-pan-pinch)
- Tailwind CSS
- Claude API (Anthropic)
- localStorage for collection progress
- No backend (fully client-side)

## Migration Path

The current swipe-through-cards experience becomes LEVEL 4 (the deepest zoom). Everything above it is new. The good work on card content, Quick Cards, and AI prompts carries forward.
