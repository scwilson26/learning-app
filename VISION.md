```markdown
# Learning App - Product Vision

## Overview
A mobile-first learning app that creates addictive rabbit-hole exploration through narrative-driven content. Users search for topics and fall down interconnected rabbit holes, ending up on completely different subjects without realizing how they got there. The goal is to maximize engagement through curiosity cascades and dopamine loops.

## Current State
- Screen 1: Topic search input
- Screen 2: AI-generated content about the topic (currently formal outline format - needs to be redesigned)

## Core User Experience Flow
1. User searches for a topic (e.g., "Roman Empire")
2. App displays narrative-driven content with embedded hyperlinks
3. User taps hyperlinked term → Quick Card pops up inline
4. User either continues reading OR taps "Go deeper" to navigate to that topic
5. Breadcrumb trail shows their path, journey visualization unlocks after 5+ topics
6. Process repeats endlessly

## Three Content Depth Levels

### 1. Quick Cards (2-3 sentences)
- Pop up inline when user taps any hyperlinked term
- Don't navigate away from current content
- Written to create more questions than answers (tantalizing, not complete)
- Include "Go deeper" button to navigate to full content about that term
- Contain 2-3 new embedded hyperlinks to related concepts
- Conversational, punchy tone

### 2. Medium Articles (5-8 paragraphs)
- For sub-topics that are interesting but not complex enough for full treatment
- Still heavily hyperlinked
- Narrative style, not outline format

### 3. Main Topic Content (Primary Content Format)
- This is what currently shows on Screen 2
- **CRITICAL: Must be narrative-driven, NOT outline/bullet point format**
- Written like a smart friend explaining something fascinating, not an encyclopedia
- Story-based structure with natural flow
- Present tense for immediacy ("Caesar crosses the Rubicon" not "crossed")
- Heavily hyperlinked throughout with terms that trigger Quick Cards

## Narrative Content Requirements
**This is the most important part of the entire app.**

Every main topic must follow this structure:

### Opening Hook (1-2 sentences)
Start with something surprising, dramatic, or mysterious.

**Examples:**
- "The Roman Empire started with a murder"
- "Egyptian pyramids might not have been tombs at all"
- "Roman concrete is stronger than modern concrete and we don't know why"

### Body (Narrative Paragraphs)
- Tell the story chronologically or thematically, NOT as outline sections
- Short paragraphs (2-3 sentences each) for mobile readability
- Use section breaks with compelling headers that sound like podcast episode titles
  - ❌ NOT: "Economic Structure"
  - ✅ YES: "How Rome Became Filthy Rich" or "The Grain Dole: Ancient Welfare State or Vote-Buying?"
- Inject mystery and controversy where it exists ("Historians disagree about X, but new evidence suggests Y...")
- Use inline questions that the next paragraph answers: "So how did they move those 800-ton stones? Turns out..."
- Authoritative but conversational tone - factual with personality
- Think Hardcore History podcast, not Wikipedia

### Hyperlink Strategy
- Key terms, concepts, people, places, events all become hyperlinks
- Links should feel natural in the narrative, not forced
- Each hyperlink triggers a Quick Card on tap
- Dense enough that users constantly see tappable opportunities (every 1-2 sentences)

## Critical UX Features

### 1. Breadcrumb Navigation Bar
- Always visible at top of screen
- Shows user's path: `Topic 1 > Topic 2 > Topic 3 > ...`
- Horizontally scrollable as path gets longer
- Each node is tappable to jump back to that topic

### 2. Quick Card Pop-up System
- When user taps any hyperlink, card slides up from bottom (or expands inline)
- Card contains 2-3 sentence explanation
- "Go deeper" button prominently displayed
- 2-3 new hyperlinks embedded in the card text
- Easy to dismiss (tap outside or X button) to return to reading
- Smooth animations, no jarring transitions

### 3. Journey Visualization
- Unlocks after user has visited 5+ topics
- "See your journey" button appears
- Shows tree/mind-map of everywhere they've been
- Display alternate paths they could have taken but didn't
- Make it shareable (optional but nice to have)

### 4. Content Generation via AI
- All content (main topics, medium articles, quick cards) should be AI-generated based on user's search
- Content must match the narrative style requirements above
- Ensure hyperlinks are intelligently placed and connect to related concepts

## Technical Requirements
- Mobile-first responsive design (primary use case is on phone)
- Fast load times - absolute minimal friction between taps (critical for the dopamine loop)
- Store user's navigation history to build breadcrumb trail and journey visualization
- Smooth, polished animations for Quick Card pop-ups
- Clean, readable typography optimized for mobile reading

## Development Phases

### Phase 1 (MVP)
- Topic search functionality
- AI-generated narrative content with embedded hyperlinks
- Quick Card pop-up system
- Breadcrumb navigation trail
- Basic routing between topics via "Go deeper"

### Phase 2
- Medium Article content depth
- Journey visualization after 5+ topics
- Polish animations and transitions
- Optimize AI prompts for better narrative quality

### Phase 3 (Future)
- User accounts and saved journeys
- Shareability features
- Audio playback of narrative content

## Example Content Transformation

### ❌ Formal Outline Approach (What we DON'T want)
```
The Praetorian Guard (Latin: cohortēs praetōriae) was an elite unit of the Imperial Roman army. Established by Augustus, they served as personal bodyguards to Roman emperors.
```

### ✅ Narrative Approach (What we DO want)
```
Augustus created the Praetorian Guard as his personal protection force, but he couldn't have predicted what they'd become: the most dangerous job hazard an emperor would face. These bodyguards would eventually murder more emperors than they protected.
```

See the difference? The narrative version creates forward momentum and makes you want to know which emperors and why.

## Key Success Metrics
- Time spent in app per session
- Number of topics explored per session
- Depth of rabbit hole (how many topics deep users go)
- Return rate (do users come back?)
- Quick Card tap rate (are hyperlinks compelling?)

## Core Philosophy
The narrative style is THE most important element - everything else supports making users unable to stop tapping and reading. This should feel like falling down a Wikipedia rabbit hole at 2 AM, not like studying for an exam.
```