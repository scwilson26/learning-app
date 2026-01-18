# Learning Cards - Product Vision

## The Core Concept

**A card table where every deck contains more decks.**

Imagine a table with decks of cards. Tap a deck and its contents fan out ON TOP - the parent deck stays visible underneath. You're building a stack through curiosity. The goal: **Collect all the cards.**

But here's the twist: **The map is shared. The loot is personal.**

Everyone explores the same knowledge structure. When Claude generates a card, that card exists for everyone. But YOUR collection - what you've claimed, what you've discovered - that's uniquely yours.

## The Big Ideas

### 1. Shared Map, Personal Loot

**The knowledge structure is global.** When you open "History → Ancient World → Egypt", you see the same cards everyone else does. Claude generates cards once, and they become permanent fixtures in the shared knowledge map.

**But discovery is personal.** Be the first person to open a deck? You get the "First Discovery" badge. That's YOUR achievement, forever recorded.

This creates:
- Consistent learning experience (same facts for everyone)
- Personal achievement (your collection, your discoveries)
- Social possibilities (leaderboards, first discoveries, rare finds)

### 2. First Discovery

**Be the first to explore uncharted territory.**

When Claude generates a NEW card that nobody has ever seen before:
- You get a "First Discovery" badge on that card
- Your name (or username) is recorded as the discoverer
- Visible forever: "First discovered by @sean on Jan 18, 2025"

This transforms exploration into pioneering. You're not just learning - you're charting the map for everyone who follows.

**Where First Discovery Happens:**
- Opening a deck for the first time ever (deck contents generated)
- Being the first to flip a card that triggers generation
- Exploring deep into niche topics nobody's touched

### 3. Card Rarity (Determined at Generation)

Cards have rarity, but it's **set when Claude generates the card**, not when you find it.

**Rarity Tiers:**
- **Common** (white/gray border) - 70% of generated cards
- **Rare** (blue border) - 20% of generated cards
- **Epic** (purple border) - 8% of generated cards
- **Legendary** (gold border, sparkle) - 2% of generated cards

**Key Insight:** Rarity is baked into the card at creation. The "Pyramids" legendary card is legendary for everyone who claims it. This means:
- No grinding or manipulation
- First discoverer of a Legendary gets extra prestige
- Everyone can eventually collect the same set
- Rarity affects presentation style, not just visuals

**What Rarity Means for Content:**
- **Common**: Solid, informative, well-written
- **Rare**: Unusual angle, surprising connection
- **Epic**: Deep dive, mind-blowing detail
- **Legendary**: The wildest fact, the craziest story

## The Three Tabs

### Learn Tab (Discovery Mode)

The main exploration experience. Open decks, stack cards, wander through knowledge.

**Features:**
- Card table with stacking navigation
- Wander button for random exploration
- Full hierarchy navigation
- First Discovery opportunities

### Study Tab (Spaced Repetition)

Turn your claimed cards into active learning.

**Features:**
- Review cards using spaced repetition algorithm
- Cards you've claimed become study material
- Track retention and mastery
- "Due for review" queue

### Collection Tab

Your personal card museum.

**Features:**
- View all claimed cards
- Filter by rarity, topic, date claimed
- See completion percentages
- Showcase achievements and First Discoveries
- Collection statistics

## Weekly Spotlight

**Curated exploration with fresh rewards.**

Each week, a different topic gets the spotlight:
- Featured prominently on the home screen
- Special "Weekly Spotlight" badge for cards claimed this week
- Encourages exploration of areas you might skip
- Creates shared cultural moments ("Did you do the Space week?")

**Implementation:**
- Admin-curated topic selection
- Spotlight badge visual treatment on cards
- Limited-time motivation to explore specific areas

## Navigation Model: Stacking

**TAP a deck** → Contents fan out ON TOP
- Overview cards spread out (readable content)
- Sub-decks appear below them
- Parent deck stays visible underneath

**TAP an overview card** → Flip to read
- Card enlarges to readable size
- Tap "Claim" to collect it
- Your name attached if First Discovery

**TAP "Claim"** → Collect the card
- Card marked as yours
- Added to your collection
- First Discovery recorded if applicable

**CLEAR / BACK** → Sweep away top layer
- Current deck's cards slide away
- Parent deck waiting underneath

```
[Open App - see category decks]

┌─────────┐ ┌─────────┐ ┌─────────┐
│ History │ │ Science │ │  Arts   │
└─────────┘ └─────────┘ └─────────┘

[Tap History - contents fan out ON TOP]

    ┌───────┐ ┌───────┐ ┌───────┐
    │ 1/3   │ │ 2/3   │ │ 3/3   │     ← Overview cards
    └───────┘ └───────┘ └───────┘
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ Ancient │ │Medieval │ │  Wars   │  ← Sub-decks
  └─────────┘ └─────────┘ └─────────┘
┌─────────────────────────────────────┐
│            HISTORY                  │  ← Parent peeking out
└─────────────────────────────────────┘
```

## The Wander Button

**"Surprise Me" - Instant teleportation to somewhere interesting.**

1. Tap "Wander"
2. App picks a random deep destination
3. Decks stack instantly to that location
4. First overview card auto-opens
5. Explore from there, or Wander again

**Key Insight:** Wander stacks you directly to the destination. The decks along the path are opened but their cards remain unclaimed - creating "islands" of knowledge that encourage filling in the gaps.

## Technical Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │ canonical_cards │  │     user_claimed_cards       │ │
│  │ (shared map)    │  │     (personal loot)          │ │
│  │                 │  │                              │ │
│  │ - id            │  │ - user_id                    │ │
│  │ - topic_id      │  │ - card_id                    │ │
│  │ - card_number   │  │ - claimed_at                 │ │
│  │ - title         │  │ - first_discovery            │ │
│  │ - content       │  │                              │ │
│  │ - rarity        │  │                              │ │
│  │ - created_by    │  │                              │ │
│  │ - created_at    │  │                              │ │
│  └─────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↑
                           │ sync
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    LOCAL STORAGE                        │
│         (offline-first, syncs when online)              │
│                                                         │
│  - Cached cards and content                             │
│  - Pending claims to sync                               │
│  - Local progress state                                 │
└─────────────────────────────────────────────────────────┘
```

### Card Generation (Two-Phase)

**Phase 1: Deck Structure**
When you open a deck for the first time:
- Claude generates the list of cards (titles, rarities)
- Cards saved to Supabase as "canonical"
- Content field is NULL (not generated yet)

**Phase 2: Card Content**
When you flip a card to read it:
- If content is NULL, Claude generates it
- Content saved to the canonical card
- Everyone who reads this card later sees the same content

**Why Two Phases:**
- Faster initial deck load (just titles)
- Content generated on-demand
- First reader becomes "first discoverer"
- Reduces API costs (only generate what's read)

### Offline-First Strategy

1. **localStorage is primary** - app works offline
2. **Supabase syncs when online** - cloud backup and social features
3. **Conflict resolution** - server wins for canonical cards, merge for claims

## Visual Language

### Deck Cards (Have Children)
- Thick, stacky appearance
- Multiple cards peeking out
- Signals "there's more inside"

### Leaf Cards (No Children)
- Single, flat appearance
- Signals "content only"

### Rarity Visual Treatment
- **Common**: Simple white/gray border
- **Rare**: Blue border, subtle glow
- **Epic**: Purple border, particle effects
- **Legendary**: Gold border, shimmer animation

### First Discovery Badge
- Small star or pioneer icon
- "First discovered by @username"
- Visible on card in collection view

## Structure & Scale

**Level 1 - Categories:** ~10 decks
(History, Science, Art, Tech, Nature, etc.)

**Level 2 - Sub-categories:** ~80 decks
(History → Ancient, Medieval, Modern, etc.)

**Level 3 - Topics:** ~800 decks
(Ancient → Egypt, Rome, Greece, etc.)

**Level 4 - Content cards:** ~4,000 cards
(Egypt → 5 cards about Egypt)

**Total: ~5,000 cards** to discover and collect

## MVP Scope

### Phase 1: Core Loop
- [ ] Card table with stacking navigation
- [ ] Basic deck/card generation
- [ ] Claim cards to collection
- [ ] localStorage persistence
- [ ] Wander button

### Phase 2: Shared Map
- [ ] Supabase integration (canonical cards table)
- [ ] Card content persists globally
- [ ] First Discovery tracking
- [ ] Cloud sync for claims

### Phase 3: Polish
- [ ] Card rarity system
- [ ] Collection tab with filters
- [ ] Study tab (basic spaced repetition)
- [ ] Weekly Spotlight

### Phase 4: Social
- [ ] User accounts
- [ ] Leaderboards
- [ ] Collection sharing
- [ ] First Discovery showcase

## The Vision

When someone opens this app, they're sitting at a card table full of mystery decks. Every tap opens something new. Every deck contains more decks.

But they're not alone. They're exploring a shared map - claiming their personal loot, maybe being the first to discover something nobody's seen before.

It's not "another learning app." It's a knowledge card game where the map belongs to everyone but the collection is yours.

**Wikipedia meets trading cards meets exploration game.**

## Technical Stack
- React (Vite)
- Framer Motion for animations
- Tailwind CSS
- Claude API (Anthropic)
- Supabase (auth, database, sync)
- localStorage (offline-first)
