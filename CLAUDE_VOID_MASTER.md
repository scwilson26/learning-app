# The Void — Master Implementation Plan

---

## 🚨 WHERE WE ARE NOW (January 2026)

**Phases 1-10 COMPLETE. Phase 11 (Sound) is optional/deferred.**

| Phase | Status | Summary |
|-------|--------|---------|
| 1 | ✅ DONE | Star state data model (`src/systems/starStates.js`) |
| 2 | ✅ DONE | Star brightness visuals (all 1000 tappable, state-based) |
| 3 | ✅ DONE | Wormhole mastery trigger (both topics must be mastered) |
| 4 | ✅ DONE | Browse ↔ Void sync (viewing marks discovered) |
| 5 | ✅ DONE | Fading system (narrative messages when stars fade) |
| 6 | ✅ DONE | Ambient messages system (idle, milestones, return, recovery) |
| 7 | ✅ DONE | Daily transmissions (contextual guidance once per day) |
| 8 | ✅ DONE | Echoes (ghost markers at fading stars) |
| 9 | ✅ DONE | The Archivist (appears on cluster mastery) |
| 10 | ✅ DONE | Narrative polish & The Reveal (Layer 2/3, center glow) |
| 11 | ❌ DEFERRED | Sound design (optional enhancement) |

**Key files modified so far:**
- `src/systems/starStates.js` — NEW: calculates star states from SRS data
- `src/systems/wormholes.js` — MODIFIED: mastery-based unlock
- `src/systems/ambientMessages.js` — NEW: ambient message triggers and pools
- `src/systems/transmissions.js` — NEW: daily transmission logic
- `src/systems/characters.js` — NEW: Archivist trigger and messages
- `src/systems/revelation.js` — NEW: Layer 2/3 reveal and center glow logic
- `src/components/Void.jsx` — MODIFIED: full constellation with all systems
- `src/components/Canvas.jsx` — MODIFIED: topic discovery tracking, wormhole checks
- `src/services/storage.js` — MODIFIED: `markTopicDiscovered()`, fading notification tracking
- `src/index.css` — MODIFIED: star-pulse, star-flicker, echo-drift, center-glow animations

**What works now:**
- All 1000 stars visible and tappable (brightness = knowledge level)
- Stars brighten as you learn: undiscovered → discovered → learning → studied → mastered
- Fading stars flicker with orange tint (>7 days overdue)
- Mastered stars pulse
- Wormholes only appear when BOTH endpoints are mastered
- Browsing a topic marks it "discovered" in The Void
- Narrative messages appear when stars start fading (`...something dims`)
- Ambient messages on return after absence (`...you were missed`)
- Milestone messages (`...you're beginning to see`, `...a light in the dark`)
- Idle messages after 30s of no interaction (`...the void is patient`)
- Recovery messages when fading stars are restored (`...the light returns`)
- Daily transmissions - contextual guidance once per day
- Transmission types: fading warnings, near-wormhole, unexplored areas, momentum, streak
- Echoes - translucent ghost markers floating near fading stars
- The Archivist - appears when cluster is fully mastered
- Cluster-specific lore and messages
- Modal overlay with staged reveal animation
- **NEW:** Layer 2 Reveal - "the void doesn't take. you let go." (first fade or day 3-5)
- **NEW:** Layer 3 Hints - rare deep mystery messages ("you are not the first")
- **NEW:** Center glow at 500/750/900/1000 mastered stars with milestone messages

**All narrative phases complete! Sound design (Phase 11) is deferred.**

---

## What This Is

**The Void is gamification, not an RPG.**

Like Duolingo has streaks and XP, we have stars and fading.

- **Core product:** Learning app. Crystal clear.
- **Gamification layer:** The Void. Visual progress tracker.
- **Hidden depth:** The mystery. For those who notice.

### User Understanding (in order)

| When | What they think |
|------|-----------------|
| Minute 1 | "I learn topics, stars light up." |
| Day 1 | "If I don't review, stars fade. I want to keep them bright." |
| Week 1 | "This is a cool way to see what I know." |
| Month 1 (some users) | "Wait... why do these messages feel weird? Is this... my mind?" |

### Marketing-Safe Description

> Watch your knowledge grow.
> Every topic you learn becomes a star.
> Let it fade, and it dims.

Not confusing. Not weird. Just a visual progress tracker with atmosphere.

### What NOT To Do

- Don't lead with mystery
- Don't confuse new users
- Don't make the RPG elements required
- Don't hide basic functionality behind narrative

### What TO Do

- Learning app first, always
- Void is optional view (Browse still exists)
- Mystery reveals itself slowly, naturally
- Users who don't care about story just see pretty stars

### Summary

| App | Gamification | Vibe |
|-----|--------------|------|
| Duolingo | Cute owl + streaks + guilt | Playful |
| The Void | Dark space + stars + beauty | Atmospheric |

Same purpose. Different vibe. **Learning app for masses, mystery for the obsessed.**

---

## The Secret (Hidden Layer)

The Void is the user's mind. They don't know this. They discover it.

But that's not the whole mystery. That's just Layer 1.

*Note: This secret is for users who dig deep. New users just see a pretty star map.*

---

## The Layered Mystery (For Those Who Notice)

### Layer 1 — What They See
Space exploration. Stars. Fragments. Void. A game.

### Layer 2 — First Realization (reveal around day 3-5)
"This is my mind." Stars = what I know. Fading = forgetting.

Triggered by first star fading:
```
> ...the void doesn't take. you let go.
```
Or after extended play:
```
> ...did you think this was somewhere else?
```

### Layer 3 — But Wait... (never fully answered)
They know it's their mind. But new questions emerge:
- Why is my mind a void?
- Who left these log entries before me?
- Why does the void "speak"?
- What's at the center?
- Am I recovering memories? Or building new ones?
- Was my mind erased? By who?

**Possible interpretations (never confirmed):**
- Coma patient rebuilding consciousness
- Amnesia recovery
- AI becoming sentient
- Afterlife — reassembling your soul
- Alien absorbing human knowledge
- Simulation / mental prison
- Just a metaphor for learning (the "boring" answer they'll reject)

**The trick:** Tell them it's their mind. That's not the mystery.
The mystery is: *what happened to it, and why are you here?*

---

## The Twist Beneath the Twist
The "previous explorer" logs scattered around?
They're YOU. From past sessions. Your own forgotten history.

---

## Plot Arc (hidden, emergent)

### Act 1 — Wonder
Pure exploration. Stars light up. Feels like a game.

### Act 2 — Unease
Stars fade. Echoes appear. "Why is this happening?"

### Act 3 — Recognition
User realizes: this is me. The fading is forgetting. The light is learning.

### Act 4 — The Deep
What's at the center of the void? What happens when you've mastered it all?

At 500 stars, something begins to glow at the center.
At 900 stars, it pulses when they look.
At 1000... they finally reach it. And nothing happens. Or everything does.

**Leave this unanswered. Let them chase it forever.**

---

## Current State
- ✅ Constellation UI with pan/zoom
- ✅ Character selection (starting 5 stars)
- ✅ Basic star display (unlocked/locked binary)
- ✅ Wormholes (currently trigger at 4 fragments)
- ✅ SRS system exists (flashcards, study sessions)
- ✅ Browse is primary, Void is optional entry point
- ✅ **Phase 1 COMPLETE:** Star state data model (`src/systems/starStates.js`)
- ✅ **Phase 2 COMPLETE:** Star brightness visuals (all 1000 stars tappable, state-based rendering)
- ✅ **Phase 3 COMPLETE:** Wormhole mastery trigger (both topics must be mastered)
- ✅ **Phase 4 COMPLETE:** Browse ↔ Void Sync (viewing topics marks them discovered)
- ✅ **Phase 5 COMPLETE:** Fading System (narrative messages when stars fade)
- ✅ **Phase 6 COMPLETE:** Ambient Messages System (idle, milestones, return, recovery)
- ✅ **Phase 7 COMPLETE:** Daily Transmissions (contextual guidance once per day)
- ✅ **Phase 8 COMPLETE:** Echoes (ghost markers at fading stars)
- ✅ **Phase 9 COMPLETE:** The Archivist (cluster mastery character)
- ✅ **Phase 10 COMPLETE:** The Reveal (Layer 2/3 narrative, center glow)
- ❌ **Phase 11:** Sound design (deferred)

---

## Implementation Log

### Phase 1: Star State Data Model — COMPLETE

**Created:** `src/systems/starStates.js`

**What it does:**
Calculates the visual state of each star based on user progress and SRS data. This is the brain that determines how bright each star should be.

**Exported Constants:**
```javascript
export const STAR_STATES = {
  undiscovered: 'undiscovered',  // Never interacted with
  discovered: 'discovered',      // Topic opened/visited
  learning: 'learning',          // Has captured 1+ fragments
  studied: 'studied',            // Has flashcards in SRS
  mastered: 'mastered',          // All 4 core + >80% retention + no critical overdue
  fading: 'fading',              // Has overdue flashcards (>7 days past due)
}
```

**Exported Functions:**
```javascript
// Core state calculation
getTopicState(topicId) → STAR_STATES value
getTopicStates(topicIds[]) → { [topicId]: state }
getTopicsInState(topicIds[], state) → topicIds[]

// Flashcard queries
getFlashcardsForTopic(topicId) → flashcard[]
getSRSFlashcardsForTopic(topicId) → flashcard[]  // Only learned/mastered

// Retention & overdue
getRetentionScore(topicId) → number (0-1)
getRetentionStats(topicId) → { total, healthy, overdue, mastered, retention }
hasOverdueCards(topicId) → boolean  // >7 days past due
hasAnyOverdueCards(topicId) → boolean  // >0 days past due

// Debug
debugStarStates() → console table of all unlocked topics
```

**Key Logic - `getTopicState()` priority order:**
1. `fading` - Has critically overdue flashcards (>7 days)
2. `mastered` - All core fragments + >80% retention + no critical overdue
3. `studied` - Has flashcards in SRS (learned or mastered studyState)
4. `learning` - Has captured 1+ fragments
5. `discovered` - Topic opened (in exploredTopics or has firstVisited)
6. `undiscovered` - Default

**Flashcard → Topic Linkage:**
```javascript
// Path: flashcard.sourceCardId → cards[sourceCardId].deckId = topicId
// Example: flashcard { sourceCardId: "ancient_egypt-core-1" }
//          → card { deckId: "ancient_egypt" }
//          → topic: "ancient_egypt"
```

**Thresholds:**
- `MASTERY_RETENTION_THRESHOLD = 0.8` (80%)
- `CRITICAL_OVERDUE_DAYS = 7`
- `CORE_FRAGMENTS_REQUIRED = 4`

---

### Phase 2: Star Brightness Visuals — COMPLETE

**Modified:** `src/components/Void.jsx`, `src/index.css`

**What changed:**

1. **All 1000 stars now tappable** (no gates)
   - Before: Only `unlockedTopics` were rendered as interactive stars
   - After: ALL topics from constellation.json are rendered, brightness varies by state

2. **State-based star rendering**
   - Added import: `import { getTopicState, STAR_STATES } from '../systems/starStates'`
   - Added visual config:
   ```javascript
   const STAR_VISUALS = {
     undiscovered: { size: 2, opacity: 0.15, glowSize: 0, glowOpacity: 0 },
     discovered:   { size: 4, opacity: 0.4, glowSize: 6, glowOpacity: 0.2 },
     learning:     { size: 6, opacity: 0.6, glowSize: 10, glowOpacity: 0.3 },
     studied:      { size: 8, opacity: 0.8, glowSize: 15, glowOpacity: 0.4 },
     mastered:     { size: 10, opacity: 1.0, glowSize: 25, glowOpacity: 0.5, pulse: true },
     fading:       { size: 6, opacity: 0.4, glowSize: 8, glowOpacity: 0.2, flicker: true, warmShift: true },
   }
   ```

3. **Changed variable name:** `visibleStars` → `allStars`
   - Now maps ALL topics with state calculation:
   ```javascript
   const allStars = useMemo(() => {
     return Object.entries(constellationData.topics).map(([id, topic]) => {
       const state = getTopicState(id)
       const visuals = STAR_VISUALS[state]
       return { id, ...topic, state, visuals }
     })
   }, [voidProgress])
   ```

4. **Star rendering uses visuals config:**
   - Size: `visuals.size` pixels
   - Opacity: `visuals.opacity`
   - Glow: `visuals.glowSize` and `visuals.glowOpacity`
   - Animations: `animate-star-pulse` for mastered, `animate-star-flicker` for fading
   - Color shift: `blendWithOrange()` helper for fading stars

5. **Added helper function:**
   ```javascript
   function blendWithOrange(hexColor, amount) {
     // Blends any hex color toward orange (#ff6b35)
     // Used for fading stars to show "warmth" of decay
   }
   ```

**CSS Animations Added:** `src/index.css`
```css
/* Star pulse animation for mastered stars */
@keyframes star-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.85; }
}
.animate-star-pulse {
  animation: star-pulse 2s ease-in-out infinite;
}

/* Star flicker animation for fading stars */
@keyframes star-flicker {
  0%, 100% { opacity: 0.4; }
  25% { opacity: 0.25; }
  50% { opacity: 0.5; }
  75% { opacity: 0.3; }
}
.animate-star-flicker {
  animation: star-flicker 1.5s ease-in-out infinite;
}
```

**User Experience After Phase 2:**
- Enter The Void → see all 1000 stars
- Undiscovered stars are barely-visible specks (2px, 15% opacity)
- As user progresses, stars brighten through states
- Mastered stars pulse gently
- Fading stars flicker with orange tint

---

### Phase 3: Wormhole Mastery Trigger — COMPLETE

**Modified:** `src/systems/wormholes.js`, `src/components/Canvas.jsx`

**What changed:**

1. **New unlock requirement:** BOTH endpoints must be MASTERED
   - Before: 4 fragments at EITHER endpoint
   - After: Both topics must have mastered state (4 fragments + >80% retention + no critical overdue)

2. **Added import to wormholes.js:**
   ```javascript
   import { getTopicState, STAR_STATES } from './starStates'
   ```

3. **Updated `isWormholeUnlocked()`:**
   ```javascript
   function isWormholeUnlocked(wormhole, userProgress) {
     // Legacy support for already-unlocked wormholes
     if (userProgress.unlockedWormholes?.includes(wormhole.id)) return true

     // Check if BOTH endpoints are mastered
     const endpoint1State = getTopicState(wormhole.endpoints[0].topicId)
     const endpoint2State = getTopicState(wormhole.endpoints[1].topicId)

     return endpoint1State === STAR_STATES.mastered && endpoint2State === STAR_STATES.mastered
   }
   ```

4. **Updated `checkNewWormholes()` signature:**
   - Before: `checkNew(topicId, cardCount, progress)`
   - After: `checkNew(topicId, progress)`
   - Now checks if topic is mastered and finds wormholes where other endpoint is also mastered

5. **Added wormhole check after study sessions:**
   - In `finishReviewSession()` in Canvas.jsx
   - After review completion, checks all topics in study deck for wormhole discovery
   - Since mastery requires SRS retention, wormholes can now be discovered after successful reviews

**Discovery flow:**
1. User captures 4 fragments → topic NOT yet mastered (no SRS retention)
2. User studies flashcards → SRS scores improve
3. User reviews and gets >80% correct → topic may reach mastered state
4. After review session ends → check all study deck topics for wormhole discovery
5. If both endpoints mastered → wormhole appears!

**User experience:**
- Wormholes are now a reward for MAINTAINING knowledge, not just capturing fragments
- Creates incentive to keep studying (maintains mastery = keeps wormholes)
- More meaningful connections between topics

---

### Phase 4: Browse ↔ Void Sync — COMPLETE

**Modified:** `src/services/storage.js`, `src/components/Canvas.jsx`

**Goal:** When user opens a topic in Browse, mark it as "discovered" in The Void

**What was added:**

1. **New function in storage.js:** `markTopicDiscovered(topicId)`
   ```javascript
   export function markTopicDiscovered(topicId) {
     // Add topicId to exploredTopics array
     // Initialize topicProgress with firstVisited timestamp
     // Returns true if newly discovered
   }
   ```

2. **useEffect in Canvas.jsx** to track stack changes:
   ```javascript
   useEffect(() => {
     if (stack.length === 0) return
     const currentId = stack[stack.length - 1]

     // Check if this is a constellation topic
     if (constellationData.topics[currentId]) {
       if (getCharacter()) {
         markTopicDiscovered(currentId)
       }
     }
   }, [stack])
   ```

**How it works:**
- When user navigates to any topic in Browse (via stack change)
- If the topic exists in constellation.json (is a Void topic)
- And user has selected a character (has started The Void)
- → Topic is marked as "discovered" in voidProgress

**Data flow:**
- `exploredTopics` array gets topicId added
- `topicProgress[topicId].firstVisited` is set
- `getTopicState()` now returns `discovered` instead of `undiscovered`
- Star brightens from 2px/15% to 4px/40% in The Void

**User experience:**
- Open a topic in Browse → that star becomes brighter in The Void
- No fragment capture needed - just viewing marks it discovered
- Consistent progress tracking across both views

---

### Phase 5: Fading System (Narrative) — COMPLETE

**Modified:** `src/components/Void.jsx`, `src/services/storage.js`

**Goal:** Add narrative messages when stars start fading (the visual fading already worked from Phase 2)

**What was added:**

1. **New storage functions in storage.js:**
   ```javascript
   getFadingNotifiedTopics() → string[]  // Topics that already showed fading message
   markFadingNotified(topicId)           // Mark topic as notified
   clearFadingNotified(topicId)          // Reset when topic recovers
   getLastVoidVisit() → number|null      // For return-after-absence detection
   recordVoidVisit()                     // Track visits
   ```

2. **Fading detection in Void.jsx:**
   ```javascript
   useEffect(() => {
     // Find all currently fading stars
     const fadingStars = allStars.filter(star => star.state === STAR_STATES.fading)
     // Find NEW fading stars (not yet notified)
     const newlyFading = fadingStars.filter(star => !notifiedTopics.includes(star.id))
     // Mark as notified and show message
     if (newlyFading.length > 0) {
       setFadingMessage(chooseMessage(newlyFading.length))
     }
   }, [allStars])
   ```

3. **Narrative messages:**
   - Single star: Random from `['...something dims', '...signal fading', '...the light wavers', '...memories drift']`
   - 2-3 stars: `...{n} signals fading`
   - 4+ stars: `...the void reclaims`

4. **Message display:**
   - Orange tint (`text-orange-400/70`) to match fading star warmth
   - 3 second display, 0.8s fade transitions
   - Only shows if arrival message isn't already showing

**Data model addition:**
```javascript
voidProgress: {
  // ... existing fields ...
  fadingNotified: [],  // Topic IDs that have shown fading notification
  lastVisit: number,   // Timestamp of last Void visit
}
```

**User experience:**
- Enter The Void → if stars have started fading since last visit → see narrative message
- Message appears after short delay, fades after 3 seconds
- Each topic only triggers notification ONCE (until it recovers)
- Message style is warmer/orange to match the fading visual

---

### Phase 6: Ambient Messages System — COMPLETE

**Created:** `src/systems/ambientMessages.js`
**Modified:** `src/components/Void.jsx`

**What it does:**
Triggers cryptic messages based on user behavior. Messages appear sparingly to create atmosphere without being intrusive.

**Message Pools:**
```javascript
MESSAGES = {
  idle: ['...the void is patient', '...stillness', '...waiting', '...the stars watch'],
  returnShort: ['...you returned', '...the void remembers', '...welcome back'],
  returnLong: ['...you were missed', '...time passed here too', '...the void waited'],
  firstStar: ['...a light in the dark', '...the first of many'],
  firstMastery: ['...truly known', '...mastery achieved'],
  firstWormhole: ['...they were connected all along', '...a bridge between worlds'],
  stars5: ["...you're beginning to see", '...patterns emerge'],
  stars10: ['...the void grows familiar', '...a constellation forms'],
  stars25: ['...you understand more than most', '...knowledge accumulates'],
  stars50: ['...you begin to see the shape of it', '...halfway to somewhere'],
  stars100: ['...the void remembers what you hold onto', '...a hundred lights'],
  recovery: ['...restored', '...the light returns', '...remembered again'],
}
```

**Exported Functions:**
```javascript
// State tracking
recordVisit() → previousVisitTimestamp    // Record Void visit, return previous
recordActivity()                           // Reset idle timer
resetIdleTrigger()                         // Clear idle flag on interaction

// Trigger detection
checkIdleTrigger() → message|null         // 30+ seconds idle
checkReturnTrigger(previousVisit) → msg   // 1+ days or 7+ days away
checkMilestoneTrigger(voidProgress) → msg // Star count milestones
checkFirstWormholeTrigger(count) → msg    // First wormhole discovery
checkRecoveryTrigger(allStars) → msg      // Star recovered from fading

// Main check function
checkAmbientTriggers({ voidProgress, allStars, wormholeCount, previousVisit })
  → { message, type } | null
```

**Trigger Priority Order:**
1. Return after absence (highest)
2. Milestones (star counts)
3. First wormhole
4. Recovery (fading → not fading)
5. Idle (lowest, checked on interval)

**Void.jsx Integration:**

1. **On mount (after entry animation):**
   - Records visit and gets previous visit time
   - Checks all triggers via `checkAmbientTriggers()`
   - Shows message with delay, auto-clears after 3.5s

2. **Idle detection:**
   - 5-second interval checks `checkIdleTrigger()`
   - Only shows if no other message is displaying
   - Triggers after 30+ seconds of no interaction

3. **Activity recording:**
   - `recordActivity()` and `resetIdleTrigger()` called on:
     - `handlePointerDown` (mouse/touch pan start)
     - `handleWheel` (zoom)
     - `handleTouchStart` (mobile pan start)

4. **Message display:**
   - Gray text (`text-gray-400/80`) for ambient messages
   - 1-second fade in/out transitions
   - Only shows when no arrival or fading message is active

**Data model addition:**
```javascript
ambientMessages: {
  shownMessages: [],      // Message keys shown (one-time messages)
  lastActivity: number,   // Timestamp of last interaction
  lastVisit: number,      // Timestamp of last Void visit
  previousStates: {},     // topicId → last known state (recovery detection)
  milestonesShown: [],    // Milestone keys triggered
  idleTriggered: boolean  // Whether idle message was shown this period
}
```

**User experience:**
- Return after 1+ days → "...you returned" or "...the void remembers"
- Return after 7+ days → "...you were missed" or "...the void waited"
- Reach 5 stars → "...you're beginning to see"
- Master first star → "...truly known"
- First wormhole → "...they were connected all along"
- Star recovers from fading → "...the light returns"
- Idle 30+ seconds → "...the void is patient"

---

### Phase 7: Daily Transmissions — COMPLETE

**Created:** `src/systems/transmissions.js`
**Modified:** `src/components/Void.jsx`

**What it does:**
Shows one contextual "transmission" message per day on entering The Void. Analyzes current state and provides gentle guidance based on what's happening in the constellation.

**Transmission Pools:**
```javascript
TRANSMISSIONS = {
  fadingMany: ['...signals fading in the dark', '...the void grows quieter', ...],
  fadingFew: ['...a light wavers', '...something dims at the edge', ...],
  nearWormhole: ['...anomaly forming', '...a connection stirs', ...],
  unexploredNearby: ['...signals detected in unknown region', '...something waits in the dark', ...],
  momentum: ['...the constellation grows', '...you illuminate the void', ...],
  dedication: ['...the void recognizes persistence', '...day by day, light by light', ...],
  peaceful: ['...all is well in the void', '...the stars hold steady', ...],
  general: ['...the void awaits', '...what will you remember today?', ...],
}
```

**Priority Order:**
1. Multiple fading stars (3+) - urgent warning
2. Few fading stars (1-2) - gentle warning
3. Near wormhole - exciting discovery imminent
4. Unexplored nearby - discovery opportunity
5. Streak (3+ days) - dedication acknowledgment
6. Momentum (3+ mastered) - progress celebration
7. Peaceful (no fading) - calm acknowledgment
8. General - atmospheric fallback

**State Tracking:**
```javascript
transmissions: {
  lastTransmissionDate: string,  // YYYY-MM-DD
  lastTransmissionType: string,  // For variety
  transmissionCount: number,     // Total shown
  streak: number,                // Consecutive days
  lastVisitDate: string          // For streak calculation
}
```

**Void.jsx Integration:**
- useEffect waits for entry animation + arrival message to clear
- 1.5 second delay before showing transmission
- Transmission displays for 4 seconds
- Only shows once per day (tracked in localStorage)

**Streak System:**
- Tracks consecutive days visiting The Void
- Streak of 3+ days triggers "dedication" messages
- Streak resets if user skips a day

**User experience:**
- Enter The Void → after arrival message clears → daily transmission appears
- Contextual to current state (fading stars? near wormhole? good streak?)
- Brighter text than ambient messages (this is the "main" message)
- Only shows once per day, won't repeat

---

### Phase 8: Echoes (Ghost Markers) — COMPLETE

**Modified:** `src/components/Void.jsx`, `src/index.css`

**What it does:**
Renders translucent "echo" ghost markers near fading stars. These represent fading memories - visual personification of knowledge slipping away.

**Visual Design:**
- Echoes are radial gradient circles offset from fading stars
- Two echoes per fading star (primary + secondary) at opposite angles
- Primary echo: 14px, subtle drift animation
- Secondary echo: 10px, slower fade animation
- Colors derived from star's original color with low opacity

**CSS Animations Added:**
```css
@keyframes echo-drift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
  25% { transform: translate(2px, -1px) scale(1.05); opacity: 0.2; }
  50% { transform: translate(-1px, 2px) scale(0.95); opacity: 0.1; }
  75% { transform: translate(1px, 1px) scale(1.02); opacity: 0.18; }
}

@keyframes echo-fade {
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.06; }
}
```

**Positioning Logic:**
- Echo angle derived from hash of star ID (consistent per star)
- Primary echo: 12-20px away from star
- Secondary echo: 8-14px away, opposite direction
- Offset is deterministic so echoes don't jump on re-render

**Void.jsx Integration:**
```javascript
{allStars
  .filter(star => star.state === STAR_STATES.fading)
  .map((star) => {
    // Hash-based consistent offset
    const hash = star.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const angle = (hash % 360) * (Math.PI / 180)
    const offsetX = Math.cos(angle) * distance
    const offsetY = Math.sin(angle) * distance
    // Render translucent echo
  })}
```

**User experience:**
- Fading stars have ghostly afterimages floating nearby
- Echoes drift subtly, creating an ethereal atmosphere
- Reinforces the "memories fading" metaphor
- Subtle enough to not distract from navigation
- Disappear when star is no longer fading (user reviewed)

---

### Phase 9: The Archivist — COMPLETE

**Created:** `src/systems/characters.js`
**Modified:** `src/components/Void.jsx`

**What it does:**
The Archivist is a character that appears when user masters ALL stars in a cluster. Shows a modal overlay with cluster-specific lore, creating a significant moment for completing a knowledge domain.

**Cluster-Specific Messages:**
```javascript
ARCHIVIST_MESSAGES = {
  people: {
    title: 'The Archivist speaks...',
    messages: ['...you have mapped those who shaped the world', ...],
    lore: 'This region holds the echoes of those who changed everything...'
  },
  history: { ... },
  science: { ... },
  // ... all 11 clusters have unique messages
}
```

**Exported Functions:**
```javascript
// Detection
checkArchivistTrigger(allStars, clusters) → { cluster, title, message, lore } | null
isClusterMastered(clusterName, allStars) → boolean
getClusterProgress(clusterName, allStars) → { total, mastered, percentage }

// State tracking
hasArchivistShown(clusterName) → boolean

// Debug
debugCharacters() → state object
resetArchivistForCluster(clusterName) → void
```

**Trigger Logic:**
1. On Void entry, after other messages clear
2. Check each cluster for full mastery (all stars mastered)
3. If cluster is mastered and Archivist hasn't appeared there:
   - Mark as shown (one-time per cluster)
   - Return archivist data
4. Show modal overlay

**Modal Design:**
- Dark backdrop (80% opacity)
- Centered content with cluster-colored glow
- Staged reveal animation:
  - Title appears first
  - Main message at 1s
  - Lore text at 1.5s
  - Cluster name at 2s
  - Dismiss button at 2.5s
- [continue] button to dismiss

**Data Model:**
```javascript
characters: {
  archivistShown: [],      // Cluster names where Archivist appeared
  lastArchivistCluster: string,
  archivistCount: number   // Total appearances
}
```

**User experience:**
- Master all stars in a cluster → Archivist appears
- Dramatic modal with cluster-specific lore
- Creates a "moment" for completing a knowledge domain
- One-time per cluster (won't appear again)
- Builds toward the meta-mystery

---

### Phase 10: Narrative Polish & The Reveal — COMPLETE

**Created:** `src/systems/revelation.js`
**Modified:** `src/components/Void.jsx`, `src/index.css`

**What it does:**
Implements the three-layer narrative reveal:
- **Layer 2:** The Reveal - "This is your mind"
- **Layer 3:** Deep mystery hints - "What happened to it?"
- **Center Glow:** Visual at constellation origin for high mastery counts

**Layer 2 Messages (The Reveal):**
```javascript
// Triggered by first star fading
firstFade: [
  '...the void doesn\'t take. you let go.',
  '...what fades was never truly held',
]

// Triggered after day 3-5 of use
realization: [
  '...did you think this was somewhere else?',
  '...the stars are not out there',
  '...you have always been here',
]
```

**Layer 3 Messages (Deep Mystery):**
```javascript
[
  '...you are not the first',
  '...the void was not always empty',
  '...something remembers what you forget',
  '...others mapped these stars before',
  '...the echoes are not yours alone',
]
```

**Trigger Logic:**
1. **Layer 2 - First Fade:** When user first sees a fading star
2. **Layer 2 - Realization:** 30% chance per visit during days 3-7
3. **Layer 3:** 10% chance per visit, minimum 2 days after Layer 2, 3 days between hints
4. **Center Glow:** Continuous visual at 500+ mastered stars

**Center Glow Milestones:**
| Mastered Stars | Visual | Message |
|----------------|--------|---------|
| 500 | Faint glow, slow pulse | `...something stirs at the center` |
| 750 | Undeniable glow, medium pulse | `...it pulses. slowly.` |
| 900 | Bright glow, fast pulse | `...it sees you` |
| 1000 | Intense glow, rapid pulse | (nothing - forever unresolved) |

**CSS Animations Added:**
```css
@keyframes center-glow-slow { /* 8s pulse at 500+ */ }
@keyframes center-glow-medium { /* 5s pulse at 750+ */ }
@keyframes center-glow-fast { /* 3s pulse at 900+ */ }
@keyframes center-glow-intense { /* 2s pulse at 1000 */ }
```

**Data Model:**
```javascript
revelation: {
  layer2Shown: boolean,        // Has Layer 2 been shown?
  layer2Type: string,          // 'firstFade' or 'realization'
  layer2Date: string,          // When Layer 2 was shown
  layer3Count: number,         // How many Layer 3 hints shown
  layer3LastDate: string,      // When last Layer 3 was shown
  layer3Messages: [],          // Which Layer 3 messages shown
  centerMilestonesShown: [],   // Which center milestones triggered
  firstVoidDate: string,       // First Void visit date
  fadeExperienced: boolean,    // Has user seen fading?
  visitDays: [],               // Unique visit dates (for day counting)
}
```

**Void.jsx Integration:**
- Import revelation functions
- Add `revelationMessage` and `centerGlow` state
- Add `masteredCount` useMemo for center glow
- Update fading detection to check for Layer 2 first-fade trigger
- Add useEffect for Layer 2 realization (day 3-5)
- Add useEffect for Layer 3 hints (rare)
- Add useEffect for center glow milestone messages
- Add center glow visual rendering at origin
- Add revelation message display (brighter than ambient)

**Message Priority:**
1. Arrival message (highest)
2. Layer 2 reveal (first-fade overrides fading notification)
3. Fading notification
4. Ambient messages
5. Daily transmission
6. Layer 2 reveal (realization)
7. Layer 3 hints
8. Center glow milestones
9. Archivist (last, modal overlay)

**User experience:**
- First star fades → "...the void doesn't take. you let go."
- Day 3-5 visit → possible "...did you think this was somewhere else?"
- Long-term play → rare hints like "...you are not the first"
- 500+ mastered → subtle glow appears at constellation center
- 900+ mastered → "...it sees you" (the ultimate mystery tease)
- 1000 mastered → Nothing. The mystery never resolves.

**The Design Philosophy:**
Layer 2 tells them: "This is your mind."
Layer 3 asks: "But what happened to it?"
The center glow promises: "Something awaits."
But nothing is ever fully explained. **The mystery is forever.**

---

## Technical Snapshot (Historical — Pre-Phase 1)

This section documents the data model BEFORE Phase 1 started. Some of this is now outdated.

### Key Files (as of Phase 1 start)
- `src/components/Void.jsx` — Constellation view (pan/zoom, star rendering)
- `src/services/storage.js` — All localStorage data (voidProgress, flashcards, cards)
- `src/systems/wormholes.js` — Wormhole loading and unlock logic
- `src/systems/progression.js` — Ranks and story fragments
- `src/data/constellation.json` — 1000 topics with x/y positions, clusters, colors

### Data Model: voidProgress
```javascript
voidProgress: {
  unlockedTopics: [],        // topic IDs visible in Void (tappable stars)
  exploredTopics: [],        // NOW USED (Phase 4) - tracks "discovered" state
  topicProgress: {
    [topicId]: {
      capturedCards: [],     // array of card IDs captured
      firstVisited: string   // ISO timestamp - NOW SET on topic view (Phase 4)
    }
  },
  unlockedWormholes: [],     // wormhole IDs discovered
  starsRevealed: number,     // count of unlocked topics
  fragmentsCaptured: number  // total fragments across all topics
}
```

### Data Model: flashcards
```javascript
flashcards: {
  [flashcardId]: {
    sourceCardId: string,    // links to cards[id].deckId = topicId
    studyState: 'new' | 'acquiring' | 'learned' | 'mastered',
    leitnerBox: 1-6,         // box 6 = mastered
    nextReviewDate: number,  // timestamp
    easeFactor: number,      // SM-2 style (default 2.5)
    status: 'active' | 'skipped'
  }
}
```

### Data Model: cards
```javascript
cards: {
  [cardId]: {
    deckId: string,          // = topicId (e.g., 'ancient_egypt')
    tier: 'core' | 'deep_dive',
    claimed: boolean,
    content: string
  }
}
```

### Star Rendering BEFORE Phase 2 (NOW OUTDATED)
- **Unlocked stars:** 8px, cluster color, glow — ALL SAME appearance
- **Locked stars:** 2px, `#ffffff08` — barely visible specks
- No brightness variation based on progress or SRS
- ✅ **NOW:** 6-state rendering with size/opacity/glow/animation per state

### Wormhole Logic BEFORE Phase 3 (NOW OUTDATED)
- Unlocks when user claims **4 fragments** at either endpoint
- NOT tied to mastery or retention
- Predefined wormholes loaded from constellation.json (197 total)
- ✅ **NOW:** Requires BOTH endpoints to be MASTERED

### What Was Missing (NOW FIXED)
1. ~~**No `getTopicState()` function**~~ → ✅ Created in Phase 1
2. ~~**No topic → flashcard aggregation**~~ → ✅ `getFlashcardsForTopic()` in Phase 1
3. ~~**No retention calculation**~~ → ✅ `getRetentionScore()` in Phase 1
4. ~~**No overdue detection per topic**~~ → ✅ `hasOverdueCards()` in Phase 1
5. ~~**`exploredTopics` not populated**~~ → ✅ `markTopicDiscovered()` in Phase 4

### What Phase 1 Created
New file: `src/systems/starStates.js`
```javascript
// Core function
getTopicState(topicId) → 'undiscovered' | 'discovered' | 'learning' | 'studied' | 'mastered' | 'fading'

// Helpers
getFlashcardsForTopic(topicId) → flashcard[]
getRetentionScore(topicId) → number (0-1)
hasOverdueCards(topicId) → boolean
```

---

## Target State — ACHIEVED

All narrative systems are now implemented:
- ✅ Stars have 6 brightness states tied to SRS
- ✅ Wormholes only appear when BOTH topics are mastered
- ✅ Browse and Void share the same data
- ✅ Stars fade when knowledge decays (overdue reviews)
- ✅ Daily transmissions guide exploration
- ✅ Characters emerge at key moments (The Archivist)
- ✅ Users gradually realize: "This is my mind" — then wonder what happened to it
- ✅ Center glow teases something at the core of the constellation
- ✅ The mystery never resolves (by design)

---

## Star States

| State | Visual | Trigger |
|-------|--------|---------|
| Undiscovered | Faint speck (barely visible) | Never opened |
| Discovered | Soft glow | Opened the topic |
| Learning | Brighter glow | Captured 1+ fragments |
| Studied | Bright | Has flashcards in SRS |
| Mastered | Blazing/pulse animation | Strong SRS retention (>80%) |
| Fading | Flickering/dimming | Overdue for review |

---

## Characters

### The Signal
Cryptic narrator. Only speaks in fragments. Never explains.
```
> ...you are not the first
> ...the void was not always empty
> ...something remembers
```

### Echoes
Ghost markers at fading stars. Faint silhouettes where you used to be.
Your own forgotten memories, personified.
- Appear when stars begin to fade
- Fade completely if star goes dark
- Visual: translucent afterimage near the star

### The Archivist
Appears after mastering a full cluster.
Reveals lore about that knowledge domain.
```
> ...you now carry what they left behind
> ...this region is mapped. it will not fade easily.
```

### Something Else (The Center)
Deep void. Only hints until late game.
What's at the center when you've mapped everything?
**Never show. Only suggest.**

**The progression of hints:**
- **500 stars mastered:** A faint glow appears at the center of the constellation. Barely visible. Could be imagination.
- **750 stars mastered:** The glow is undeniable now. It pulses slowly, like breathing.
- **900 stars mastered:** The pulse quickens when you look at it. `> ...it sees you`
- **1000 stars mastered:** ...nothing happens. Or does it? Leave this unresolved forever.

**What users will theorize:**
- It's the core of consciousness
- It's what erased their memory
- It's themselves, waiting
- It's nothing — just a visual

**The point:** Give them something to chase that never resolves.

---

## Quests

### Daily Transmissions
Shown on entering The Void (one per day, random from pool):

| Situation | Transmission |
|-----------|--------------|
| Unexplored cluster nearby | `> ...signal detected in unknown region` |
| 3+ stars fading | `> ...three signals fading` |
| Close to unlocking wormhole | `> ...anomaly forming` |
| Nothing specific | `> ...the void is patient` |

### Chain Quests (milestones)

| Quest | Reward |
|-------|--------|
| Map 10 stars | First story beat / cryptic message |
| Find your first wormhole | Character moment (The Signal speaks) |
| Lose a star to the void | Dark message: `> ...it will wait for you` |
| Master a full cluster | The Archivist appears |
| Return after 7+ days away | `> ...you were missed` |

---

## Ambient Messages

Trigger based on behavior, never explained:

| Trigger | Message |
|---------|---------|
| Idle for 30 sec | `> ...the void is patient` |
| Star starts fading | `> ...something dims` |
| Return after days away | `> ...you were missed` |
| Master 5th star | `> ...you're beginning to see` |
| First wormhole | `> ...they were connected all along` |
| Lose a star completely | `> ...it will wait for you` |
| 50 stars mastered | `> ...you begin to see the shape of it` |
| 100 stars mastered | `> ...the void remembers what you hold onto` |

---

## Implementation Phases

### Phase 0: First Session Experience
**Goal:** Make minute 1-5 feel magical, before any SRS exists

The first session happens before retention mechanics matter. It needs to feel special.

**What new users see:**
- All 1000 stars visible as dim specks (undiscovered state)
- Character selection determines which 5 stars are "lit" initially
- First transmission on entry: `> ...choose a light`

**The magic moment:**
- User taps a dim star → it brightens immediately
- No waiting, no SRS yet — just instant feedback
- They feel: "I'm lighting up the void"

**Flow:**
1. Character select → 5 starting stars glow
2. Entry animation drifts to their cluster
3. `> ...choose a light`
4. They tap a new star → it shifts from speck to soft glow
5. They capture a fragment → it brightens more
6. `> ...fragment captured`

This creates the wonder before the system complexity arrives.

---

### Phase 1: Star State Data Model
**Goal:** Define and calculate star states from existing data

Files to modify:
- `src/services/storage.js` - Add `getTopicState(topicId)` function
- `src/systems/starStates.js` - NEW: Star state calculation logic

Logic:
```javascript
function getTopicState(topicId) {
  // Check in order of priority
  if (hasOverdueCards(topicId)) return 'fading'
  if (getRetentionScore(topicId) > 0.8) return 'mastered'
  if (hasFlashcards(topicId)) return 'studied'
  if (getCapturedFragments(topicId) > 0) return 'learning'
  if (hasBeenOpened(topicId)) return 'discovered'
  return 'undiscovered'
}
```

---

### Phase 2: Star Brightness Visuals
**Goal:** Render stars differently based on state

Files to modify:
- `src/components/Void.jsx` - Update star rendering

Visual specs:
- **Undiscovered:** `opacity: 0.1`, size: 2px, no glow
- **Discovered:** `opacity: 0.4`, size: 4px, soft glow
- **Learning:** `opacity: 0.6`, size: 6px, medium glow
- **Studied:** `opacity: 0.8`, size: 8px, bright glow
- **Mastered:** `opacity: 1.0`, size: 10px, pulse animation, strong glow
- **Fading:** `opacity: 0.3-0.6` (flickering), size: 6px, dim/warm color shift

---

### Phase 3: Wormhole Mastery Trigger
**Goal:** Wormholes only appear when BOTH connected topics are mastered

Files to modify:
- `src/systems/wormholes.js` - Change unlock logic

New logic:
```javascript
function isWormholeUnlocked(wormhole, userProgress) {
  const topic1State = getTopicState(wormhole.endpoints[0].topicId)
  const topic2State = getTopicState(wormhole.endpoints[1].topicId)
  return topic1State === 'mastered' && topic2State === 'mastered'
}
```

Discovery moment:
- When user masters a topic, check if any wormholes just became visible
- Show: `> ...connection detected`

---

### Phase 4: Browse ↔ Void Sync
**Goal:** Learning in Browse updates Void stars

Already partially done:
- Capturing fragments updates `voidProgress`
- Flashcards are generated from cards

Need to add:
- When opening a topic in Browse → mark as "discovered" in Void
- Flashcard SRS data feeds into star state calculation
- Both views show consistent progress

Files to modify:
- `src/components/Canvas.jsx` - Track topic opens
- `src/services/storage.js` - Unified progress tracking

---

### Phase 5: Fading System
**Goal:** Stars fade when knowledge decays

Trigger: Flashcards from that topic are overdue (past due date)

Visual:
- Star flickers (opacity oscillates 0.3-0.6)
- Color shifts warmer (orange tint)
- Glow diminishes

Narrative (shown occasionally, not every time):
- `> ...something dims`
- `> ...signal fading`

Files to modify:
- `src/components/Void.jsx` - Add flickering animation
- `src/systems/starStates.js` - Detect overdue state

---

### Phase 6: Ambient Messages System
**Goal:** Cryptic messages triggered by behavior

Files to create:
- `src/systems/ambientMessages.js` - Message triggers and selection

Logic:
- Track user behavior (idle time, return after absence, milestones)
- Select appropriate message from pool
- Show sparingly (not every trigger)
- Store shown messages to avoid repetition

---

### Phase 7: Daily Transmissions
**Goal:** One guiding message per day on entering The Void

Files to modify:
- `src/components/Void.jsx` - Show transmission on entry
- `src/systems/transmissions.js` - NEW: Daily transmission logic

Logic:
- Check last transmission date
- Analyze current state (fading stars, unexplored areas, near-wormholes)
- Select contextual transmission
- Show once per day

---

### Phase 8: Echoes (Ghost Markers)
**Goal:** Visual representation of fading memories

Files to modify:
- `src/components/Void.jsx` - Render echoes near fading stars

Visual:
- Translucent silhouette/afterimage
- Appears when star enters fading state
- Fades completely if star goes fully dark
- Subtle, not distracting

---

### Phase 9: The Archivist
**Goal:** Character that appears on cluster mastery

Files to create:
- `src/components/Archivist.jsx` - Character modal/overlay
- `src/systems/characters.js` - Character trigger logic

Trigger:
- Master all stars in a cluster
- Show Archivist with cluster-specific message
- One-time per cluster

---

### Phase 10: Narrative Polish & The Reveal
**Goal:** Layer 2 reveal and ongoing mystery

The reveal message (triggered around day 3-5 or first star fade):
```
> ...the void doesn't take. you let go.
```
or
```
> ...did you think this was somewhere else?
```

Layer 3 hints (scattered, rare):
```
> ...you are not the first
> ...the void was not always empty
> ...something remembers what you forget
```

---

### Phase 11: Sound Design
**Goal:** Audio that sells the vibe

Sound will make The Void feel real in a way visuals alone can't.

**Ambient:**
- Low void hum (always present, barely audible)
- Subtle cosmic wind when panning
- Deeper tone when zoomed out

**Interactions:**
- Soft chime when star brightens
- Warmer tone when fragment captured
- Gentle pulse for mastered stars (synced to visual pulse)
- Unsettling, fading tone when star starts dimming

**Events:**
- Wormhole discovery: resonant, otherworldly chord
- The Signal speaks: subtle static crackle before message
- Archivist appears: ancient, reverent tone

**Rules:**
- All sounds subtle, not gamified
- No notification-style beeps
- Should feel like the void itself is responding

---

## Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐
│   Browse    │     │  The Void   │
│  (list UI)  │     │ (map UI)    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               │
       ┌───────▼───────┐
       │   Unified     │
       │   Progress    │
       │   (storage)   │
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │  SRS System   │
       │ (flashcards)  │
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │  Star States  │
       │  Calculator   │
       └───────────────┘
```

---

## Definition of "Mastery"

A topic is **mastered** when:
- User has captured all core fragments (4 cards)
- Flashcards from that topic have >80% retention score
- No flashcards are critically overdue (>7 days past due)

This makes mastery meaningful and maintainable.

---

## Order of Execution

**Onboarding (do first):**
0. Phase 0: First Session Experience ← START HERE

**Foundation (core mechanics):**
1. Phase 1: Star State Data Model
2. Phase 2: Star Brightness Visuals
3. Phase 3: Wormhole Mastery Trigger
4. Phase 4: Browse ↔ Void Sync

**Atmosphere (immersion):**
5. Phase 5: Fading System
6. Phase 6: Ambient Messages System
7. Phase 7: Daily Transmissions

**Characters & Story (late game):**
8. Phase 8: Echoes (Ghost Markers)
9. Phase 9: The Archivist
10. Phase 10: Narrative Polish & The Reveal

**Polish (last):**
11. Phase 11: Sound Design

Each phase should be testable independently.

---

## Design Principles

### Priority Order
1. **Learning app first:** Core functionality is never hidden behind narrative
2. **Gamification second:** Stars, fading, wormholes = visual progress tracking
3. **Mystery third:** Subtle hints for those who notice, invisible to those who don't

### Implementation Rules
- **Browse still exists:** The Void is an optional view, not a replacement
- **No gates:** All 1000 stars are tappable from day one. Brightness reflects knowledge, not access.
- **No confusion:** New users immediately understand "learn = star lights up"
- **The constraint is retention:** Keeping stars lit takes work (reviews)
- **Melancholic, not punishing:** Fading should make users want to save the star, not feel guilty

### Mystery Rules (Hidden Layer)
- **Never explain:** Let users piece it together
- **Story emerges from behavior:** Not cutscenes, just messages and discoveries
- **Multiple interpretations:** Is this your brain? A mental hospital? Alien technology? Don't answer.
- **Reveal slowly:** Mystery is for month-2 users, not minute-1 users

---

## Notes

- Don't break existing functionality
- Each phase = commit + test
- The deeper mystery stays mysterious forever
- What's at the center of the void? **Never show. Only suggest.**
