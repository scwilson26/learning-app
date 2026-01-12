# Learning App - Product Vision

## The Big Idea

**An infinite canvas of knowledge where every card contains more cards.**

Imagine Google Maps, but for learning. You zoom out and see broad categories. Zoom in and see topics. Zoom in further and see the actual content. Pan around to explore adjacent ideas. Your entire learning journey is visible as a spatial map that YOU built through curiosity.

The goal: **Collect all the cards.** Learning becomes a game.

## Core Concept: The Card Table

The whole app is an infinite card table. You're exploring nested decks of cards.

### Decks, Not Just Cards

Every topic (History, Egypt, Pyramids) is a **deck** - a stack of cards that contains:
- **Overview cards** (2-6): Content about this topic itself
- **Child decks**: Deeper topics to explore

This pattern repeats all the way down until you hit leaf nodes (decks with no children).

```
[History Deck]
├── Overview Cards: "What is History?" (1/4), "Why Study It?" (2/4), ...
└── Child Decks: Ancient, Medieval, Wars, Empires...

[Ancient Deck] (inside History)
├── Overview Cards: "The Ancient World" (1/3), "Timeline" (2/3), ...
└── Child Decks: Egypt, Rome, Greece, Persia, China...

[Egypt Deck] (inside Ancient)
├── Overview Cards: "Ancient Egypt" (1/5), "The Nile" (2/5), ...
└── Child Decks: Pyramids, Pharaohs, Hieroglyphics... (or none if leaf)
```

### Navigation Model

**TAP a deck** = Open it
- Deck becomes the background/table
- You're now "inside" that deck
- Overview cards fan out at top
- Child decks appear below

**TAP an overview card** = Zoom up to read it
- Card enlarges to readable size
- Tap again or swipe to zoom back down

**TAP "Claim"** = Collect the card
- All cards (overview and deck cards) are claimable
- Card gets checkmark/glow
- Adds to your collection count

**PINCH OUT or BACK BUTTON** = Rise up one level
- Return to parent deck
- See where you came from

### Visual Language

- **Decks look thick/stacky** - clearly contain cards inside
- **Overview cards are numbered** - "1/4", "2/4", etc.
- **Claimed cards glow** - checkmark visible
- **Each deck has its own aesthetic** - background color/theme when inside

### The Experience

```
[Open App]
     ↓
See category decks on table (History, Science, Arts...)
     ↓
Tap "History" deck
     ↓
History becomes the table background
Overview cards fan out: "What is History?" (1/4), "Why Study It?" (2/4)...
Child decks appear: Ancient, Medieval, Wars...
     ↓
Tap overview card "What is History?"
     ↓
Card zooms up, you read it, tap "Claim"
     ↓
Tap "Ancient" deck
     ↓
Ancient becomes the table, its overview cards fan out...
     ↓
Pinch out to go back to History level
```

### Why Decks > Continuous Zoom

- **Intentional navigation** - "I'm going INTO History" vs. accidental zoom
- **Clear mental model** - you're always "inside" somewhere
- **Natural hierarchy** - decks contain decks contain decks
- **Escape is obvious** - pinch out or back button
- **Overview + depth** - every deck teaches you about itself AND lets you go deeper

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

## The Wander Button

**"Surprise Me" / "Wander" - A guided random journey through knowledge.**

### The Problem It Solves
- Decision paralysis: "Where do I start?"
- New users don't know how to explore
- Sometimes you want serendipity, not choice

### How It Works

1. **Button always visible** on the main canvas (floating, prominent)
2. **User taps "Wander"**
3. **App picks a random destination** deep in the hierarchy:
   - History → Ancient World → Egypt → Pyramids
   - Technology → Inventions → Printing Press
   - People → Scientists → Marie Curie
4. **Teleports directly to destination** - user lands inside the target deck
5. **Auto-opens the first overview card** - content immediately visible
6. **User explores from there** - or taps Wander again

### The Key Insight: Teleport, Don't Animate

Wander **teleports** you directly to a random leaf deck. The decks along the path remain unexplored. This is intentional:
- Forces users to manually explore to fill in the gaps
- Creates "islands" of knowledge on your map
- You've been to Egypt, but Ancient World is still unclaimed
- Encourages coming back to explore the path you skipped

### The Experience

```
[Wander Button Tapped]
     ↓
Screen transitions to Egypt deck (inside Ancient, inside History)
     ↓
Egypt's overview cards fan out
     ↓
First card auto-zooms up: "Ancient Egypt" content visible
     ↓
User reads, claims, explores Egypt's other cards
     ↓
User can: Wander again, explore Egypt's children, or pinch out to see Ancient
     ↓
Going up reveals unexplored sibling decks (Rome, Greece, Persia...)
```

### Why This Is Powerful

- **Teaches the mechanic** - shows users what zooming does
- **Guarantees discovery** - every tap is a new place
- **Creates stories** - "I wandered and ended up at the Byzantine Empire"
- **Low commitment** - don't like it? Wander again
- **Surfaces buried content** - exposes Level 4 cards users might never find
- **Perfect for "just 5 minutes"** - instant engagement

### Design Notes

- Button should feel playful, not utilitarian
- Animation speed: fast enough to feel magical, slow enough to see the path
- Maybe show breadcrumb trail during animation: History → Ancient → Egypt → Pyramids
- Could have variants: "Wander Near" (explore siblings), "Wander Far" (totally random)

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
