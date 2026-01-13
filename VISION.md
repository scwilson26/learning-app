# Learning App - Product Vision

## The Big Idea

**A card table where every deck contains more decks.**

Imagine a table with decks of cards. You open a deck, and cards fan out - some you can read, some are smaller decks to explore further. Open one of those sub-decks, and its cards fan out ON TOP, the parent deck still visible underneath. Your learning journey is a stack of cards you're building through curiosity.

The goal: **Collect all the cards.** Learning becomes a game.

## Core Concept: The Card Table

The whole app is a card table. You're opening decks and stacking cards.

### What's Inside a Deck

Every deck (History, Egypt, Pyramids) contains:
- **Overview cards** (2-6): Readable cards about this topic itself
- **Sub-decks**: Smaller decks for deeper topics

When you open a deck, its contents spread out. The overview cards teach you about the topic. The sub-decks let you go deeper.

```
[History Deck] contains:
├── Overview Cards: "What is History?" (1/3), "Why Study It?" (2/3), "How We Know" (3/3)
└── Sub-decks: Ancient World, Medieval, World Wars, Empires...

[Ancient World Deck] contains:
├── Overview Cards: "The Ancient World" (1/3), "Timeline" (2/3), ...
└── Sub-decks: Egypt, Rome, Greece, Persia, China...

[Egypt Deck] contains:
├── Overview Cards: "Ancient Egypt" (1/5), "The Nile" (2/5), "Daily Life" (3/5)...
└── Sub-decks: Pyramids, Pharaohs, Hieroglyphics... (or none if this is a leaf)
```

This pattern repeats until you hit leaf decks (no sub-decks, just overview cards).

### Navigation Model: Stacking

**TAP a deck** = Open it, cards fan out ON TOP
- Overview cards spread out (readable content about this topic)
- Sub-decks appear below them
- Parent deck stays visible underneath, peeking out
- You're building a stack

**TAP an overview card** = Flip it up to read
- Card enlarges to readable size
- Tap "Claim" to collect it
- Tap again to put it back down

**TAP "Claim"** = Collect the card
- Card gets checkmark/glow
- Adds to your collection count

**CLEAR / BACK** = Sweep away the top layer
- Current deck's cards slide away
- Parent deck is right there waiting
- You're back where you were

### The Stacking Metaphor

Think of it like poker hands stacked on top of each other:

```
[Open App - see category decks on table]

┌─────────┐ ┌─────────┐ ┌─────────┐
│ History │ │ Science │ │  Arts   │  ← Top-level decks on the table
└─────────┘ └─────────┘ └─────────┘

[Tap History - its contents fan out ON TOP]

    ┌───────┐ ┌───────┐ ┌───────┐
    │ 1/3   │ │ 2/3   │ │ 3/3   │     ← Overview cards (readable)
    │ What  │ │ Why   │ │ How   │
    └───────┘ └───────┘ └───────┘
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ Ancient │ │Medieval │ │  Wars   │  ← Sub-decks (tappable)
  └─────────┘ └─────────┘ └─────────┘
┌─────────────────────────────────────┐
│            HISTORY                  │  ← Parent deck peeking out underneath
└─────────────────────────────────────┘

[Tap Ancient World - its contents fan out ON TOP of History]

      ┌───────┐ ┌───────┐ ┌───────┐
      │ 1/3   │ │ 2/3   │ │ 3/3   │   ← Ancient World overview cards
      └───────┘ └───────┘ └───────┘
    ┌───────┐ ┌───────┐ ┌───────┐
    │ Egypt │ │ Rome  │ │Greece │     ← Ancient World sub-decks
    └───────┘ └───────┘ └───────┘
  ┌───────────────────────────────────┐
  │        ANCIENT WORLD              │  ← Ancient World deck underneath
  └───────────────────────────────────┘
┌─────────────────────────────────────────┐
│              HISTORY                    │  ← History still there, deeper
└─────────────────────────────────────────┘

[Clear/Back - Ancient World's cards sweep away]

Back to History's spread, Ancient World is just a deck again.
```

### Why Stacking Works

- **Context is physical** - Parent is literally right there underneath
- **Navigation is intuitive** - "Clear the hand" to go back
- **Depth is visible** - Tall stack = deep in the hierarchy
- **Feels like real cards** - Not folders, not a file browser
- **No "where am I?"** - You can see exactly where you came from

## Visual Language

**Cards look different based on what they are.**

### Deck Cards vs Leaf Cards

**Deck cards** (have children inside):
- Thick, stacky appearance
- Multiple cards peeking out underneath with slight rotation
- Clearly signals "there's more inside"
- Tapping opens the deck, children fan out

**Leaf cards** (no children, just content):
- Single, flat appearance
- No stack effect
- Signals "this is the deepest it goes"
- Tapping flips the card to read

This visual distinction is instant communication - you know at a glance what a card does.

### Card Flip Interaction

**Tap to flip** - The card flips in place, revealing the back content. Feels real and tactile, like holding an actual card.

**Zoom to read** - After flipping, tap again to zoom in on the card. It enlarges smoothly so you can read the full content comfortably.

**Claim while reading** - "Claim" button visible on the zoomed card. Tap to collect it.

**Tap out** - Tap outside or swipe down to shrink the card back to its place in the spread.

This is more tactile than a modal popup. The card stays in context - you flipped it, you're holding it up to read, you put it back down. Physical and satisfying.

## The Collection Game

**Every card you claim = a card collected.**

### Visual Progress
- Unclaimed cards: Dim/faded
- Claimed cards: Bright/glowing/checkmark
- Decks show completion: "12/47 cards" on the deck face
- Clear back and see which decks are complete vs. incomplete

### The Psychology
- Incomplete decks create "unfinished business" - you HAVE to come back
- "Just one more card" before bed
- Completionists will explore decks they'd never normally touch
- Your collection is unique to YOU - shows your curiosity path

### Progress Visibility
- Deck faces show completion counts
- Claimed cards glow when you open a deck
- Your stack history tells the story of your learning journey

## Personality System

**Your learning style shapes your cards.**

### The First Launch Quiz

When you first open the app, a quick RPG-style quiz (3-5 questions):
- "Do you see patterns or stories?"
- "Numbers or words?"
- "Build things or understand things?"
- "Details or big picture?"
- "Why it works or how it happened?"

### Learner Archetypes

Based on answers, you get a title and a lens:

**Lorekeeper** - Stories, history, context
- Cards emphasize narrative, origin stories, "how we got here"
- Egypt card: "The mythology of the afterlife and the god-kings who built eternity in stone"

**Pattern Seeker** - Systems, connections, structure
- Cards emphasize underlying rules, relationships, "how it all fits together"
- Egypt card: "The engineering systems and social hierarchies that made the pyramids possible"

**Tinkerer** - How things work, building, making
- Cards emphasize mechanics, construction, "how to do it"
- Egypt card: "How they cut, moved, and stacked 2.3 million blocks without modern tools"

**Word Weaver** - Language, meaning, expression
- Cards emphasize etymology, quotes, linguistic connections
- Egypt card: "From 'Aigyptos' to hieroglyphs—how words shaped and preserved a civilization"

**Number Cruncher** - Data, quantities, precision
- Cards emphasize statistics, measurements, timelines
- Egypt card: "4,500 years. 481 feet tall. 20 years to build. The numbers behind the wonder."

### How It Affects Cards

Same facts, different lens. The AI generates content tailored to your archetype:
- **Framing** - What angle leads the card
- **Emphasis** - Which details get highlighted
- **Tone** - Analytical vs. narrative vs. practical
- **Connections** - What related topics get mentioned

### Changeable Later

- Settings let you retake the quiz anytime
- Changing archetype doesn't delete cards—just affects NEW cards
- Some users might want to "collect" cards in different styles

## Card Rarity

**Not all cards are equal. Some are special.**

### Rarity Tiers

- **Common** (white/gray border) - Standard cards, most of what you'll find
- **Rare** (blue border) - Less common, interesting angles
- **Epic** (purple border) - Unusual topics, deeper dives
- **Legendary** (gold border, sparkle effect) - The really special ones

### How Rarity Works

**Pure random chance.** No grinding. No "complete X to unlock Y."

When a card is generated:
- 70% Common
- 20% Rare
- 8% Epic
- 2% Legendary

That's it. Just exploring = chance at something special.

### Why Random is Better

- **No meta-gaming** - You can't optimize for Legendaries
- **Pure serendipity** - "Holy shit I found a Legendary in the Fungi deck!"
- **Learning IS the reward** - Not a means to get rewards
- **Respects the player** - Doesn't manipulate behavior
- **Every card flip is exciting** - Could be anything

### What Rarity Means

Rarity affects **presentation**, not facts:
- **Common**: Solid, informative, well-written
- **Rare**: Unusual angle, surprising connection
- **Epic**: Deep dive, mind-blowing detail
- **Legendary**: The wildest fact, the craziest story, the thing you'll tell people about

### Visual Treatment

- Different border colors/effects
- Legendary cards might have subtle animation (shimmer, glow)
- Rarity visible in collection view
- Flex factor: "I have 3 Legendaries"

### Future: Mythic Tier

A 5th tier for truly one-of-a-kind cards:

- **Mythic** (prismatic/holographic effect) - Hand-crafted, not random
- Only 10-20 in the entire app
- Easter eggs hidden in unexpected places
- The ultimate flex: "I found a Mythic"

These are curated, not AI-generated:
- Timely cards (anniversaries, current events)
- Guest-curated cards from experts
- Hidden gems that reward deep exploration
- Override AI generation for specific topics

## User Experience Flow

1. Open app → See category decks on the table (History, Science, Arts...)
2. Curious about Science → tap it → deck opens, contents fan out on top
3. See 3 overview cards about Science + sub-decks (Physics, Biology, Chemistry...)
4. Read the overview cards, claim them
5. Tap Physics → Physics opens ON TOP, Science deck visible underneath
6. See overview cards about Physics + sub-decks (Quantum, Relativity...)
7. Read Physics overview cards, claim them
8. Tap Quantum → opens on top, now 3 decks deep
9. Read Quantum's overview cards (leaf deck, no sub-decks) → claim them all
10. Clear/back → back to Physics spread, Quantum now shows as completed
11. Tap Relativity → explore that branch

**No dead ends.** You're never stuck. Just clear back and explore sideways.

## What Makes This Unique

1. **Physical Metaphor** - It's cards on a table, not folders on a computer
2. **Fractal Knowledge** - Every deck contains more decks, as deep as needed
3. **Visible Progress** - Watch your card collection grow, decks light up as completed
4. **Context Always Visible** - Parent deck is right there underneath, you always know where you are
5. **Satisfying Navigation** - Open decks, clear hands, stack cards - it FEELS good
6. **No Linear Path** - You're wandering, not following a curriculum
7. **The Interface IS the Game** - Exploring feels like playing cards

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

### Cards Per Deck
- Category decks: ~3 overview cards + ~8 sub-decks
- Sub-category decks: ~3 overview cards + ~10 sub-decks
- Topic decks: ~5 overview cards + sub-decks (or none if leaf)
- Always a manageable spread, never overwhelming

## Technical Considerations

### Stacking Implementation
- Cards fan out with smooth animations
- Parent decks remain visible underneath (layered rendering)
- Clear/back animation sweeps cards away satisfyingly
- Touch-optimized gestures (tap to open, tap to read, swipe/button to go back)

### Content Generation
- AI generates deck contents when you first open a deck
- AI generates card content when you first flip/read a card
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
- Card content fills in when first read
- Claimed status + timestamp saved when collected
- Deck contents generated when first opened

### Card States
- Unvisited: Dim, just a title visible
- Flipped (not claimed): You've seen it but don't own it
- Claimed: Bright, checkmark, it's yours
- Fully completed (all children claimed): Gold border? Star? The flex.

### Performance
- Only render current stack (parent decks + current spread)
- Lazy load deck contents when first opened
- Cache collected cards locally
- Smooth animations for open/close/stack

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
- Going **DEEP** (opening more sub-decks, stacking higher, completing a branch)
- Going **WIDE** (clearing back, exploring sibling decks, discovering new areas)

Both feel rewarding. Both grow your collection. Both show progress.

**This turns learning into Pokemon.** Gotta catch 'em all.

## The Wander Button

**"Surprise Me" / "Wander" - A guided random journey through knowledge.**

### The Problem It Solves
- Decision paralysis: "Where do I start?"
- New users don't know how to explore
- Sometimes you want serendipity, not choice

### How It Works

1. **Button always visible** on the table (floating, prominent)
2. **User taps "Wander"**
3. **App picks a random destination** deep in the hierarchy:
   - History → Ancient World → Egypt → Pyramids
   - Technology → Inventions → Printing Press
   - People → Scientists → Marie Curie
4. **Instantly stacks to that destination** - all the decks open in sequence
5. **Auto-opens the first overview card** - content immediately visible
6. **User explores from there** - or taps Wander again

### The Key Insight: Stack Without Exploring

Wander **stacks you directly** to a random leaf deck. The decks along the path are opened but their overview cards remain unclaimed. This is intentional:
- Forces users to manually explore to fill in the gaps
- Creates "islands" of knowledge - you've claimed Egypt cards, but Ancient World's overview cards are unclaimed
- You can see the path (it's stacked underneath!) but haven't read it
- Encourages clearing back to explore what you skipped

### The Experience

```
[Wander Button Tapped]
     ↓
Decks stack instantly: History → Ancient → Egypt
     ↓
Egypt's overview cards fan out on top
     ↓
First card auto-opens: "Ancient Egypt" content visible
     ↓
User reads, claims, explores Egypt's other cards
     ↓
User can: Wander again, open Egypt's sub-decks, or clear back
     ↓
Clearing back reveals Ancient World's spread - siblings like Rome, Greece visible
```

### Why This Is Powerful

- **Teaches the mechanic** - shows users what stacking looks like
- **Guarantees discovery** - every tap is a new place
- **Creates stories** - "I wandered and ended up at the Byzantine Empire"
- **Low commitment** - don't like it? Wander again
- **Surfaces buried content** - exposes deep decks users might never find
- **Perfect for "just 5 minutes"** - instant engagement

### Design Notes

- Button should feel playful, not utilitarian
- Animation: fast deck stacking, maybe show the path building
- Could have variants: "Wander Near" (explore siblings), "Wander Far" (totally random)

## Mind Map Mode (Future)

**An alternative way to visualize your knowledge.**

Toggle between two views of the same data:

**Card Table Mode** (default)
- Grid of decks, tap to open, cards spread out
- Feels like playing cards on a table
- Good for: exploring, collecting, the tactile experience

**Mind Map Mode**
- Visual web of connected topics
- Central node with branches radiating out
- See relationships and structure at a glance
- Good for: understanding the big picture, seeing where you've been, finding gaps

### Visual Progress on the Map
- Claimed areas glow bright
- Unexplored branches are dim/faded
- Your knowledge visualized as a growing web
- Instantly see what you know vs. what's left to discover

### Navigation
- Tap a node to jump there in Card Table mode
- Pinch to zoom in/out
- Pan to explore different areas
- Toggle button in corner to switch modes

Same data, different lens. The map shows you the forest; the table lets you pick up the trees.

## Social Possibilities (Future)

- Share your collection stats - flex your coverage
- See where friends explored that you haven't
- "I've collected 847 cards"
- Heat maps of most popular decks
- "X also explored this after visiting Y"

## The Vision

When someone opens this app, they should feel like they're sitting down at a card table full of mystery decks. Every tap opens something new. Every deck contains more decks. Your knowledge grows as your card collection grows.

It's not "another learning app." It's a knowledge card game you play forever.

**Wikipedia meets a deck of cards meets Pokemon.**

## Technical Stack
- React (Vite)
- Framer Motion or similar for card animations
- Tailwind CSS
- Claude API (Anthropic)
- localStorage for collection progress
- No backend (fully client-side)

## Migration Path

The current swipe-through-cards experience becomes the deepest level (leaf deck overview cards). Everything above it is new. The good work on card content, Quick Cards, and AI prompts carries forward.
