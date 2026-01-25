# The Void — Claude Code Implementation Guide

## What You're Building

A space exploration RPG where users map stars of human knowledge, discover impossible connections (wormholes), and slowly uncover why they're here.

**The vibe:** No Man's Sky meets flashcards. Mysterious. Quiet. Curious.

**Core loop:** Explore stars → Capture fragments → Unlock new stars → Discover wormholes → Keep fragments from fading

---

## Current App State

The app already has:
- ✅ React + Vite setup
- ✅ Card generation via Claude API
- ✅ Supabase caching (shared cards)
- ✅ localStorage for user progress
- ✅ 1,000 topics from Wikipedia Vital Articles
- ✅ Working study system (acquisition + retention)
- ✅ Basic topic navigation

What we're adding:
- 🆕 Constellation UI (the Void)
- 🆕 Character origins (starting topics)
- 🆕 Topic unlock system
- 🆕 Wormhole discovery
- 🆕 Narrative framing

---

## Assets to Import

### 1. Constellation Data
**File:** `rememberer_constellation.json`

Contains 284 topics with:
- `name` — Display name
- `cluster` — Which cluster (history, science, etc.)
- `subcluster` — Subcategory within cluster
- `x`, `y` — Position in constellation
- `concepts` — Array of concept tags (for wormholes)
- `color` — Hex color from cluster

Also contains cluster definitions:
```javascript
clusters: {
  history: { x: 0, y: -420, radius: 180, color: "#C9A227" },
  science: { x: 380, y: -200, radius: 200, color: "#4A90D9" },
  // ... 11 total
}
```

**Usage:** Replace or merge with existing topic tree. This becomes the source of truth for topic positions and relationships.

---

### 2. Wormhole System
**File:** `wormholes.js`

Drop-in module for detecting and managing wormholes.

```javascript
import constellationData from './rememberer_constellation.json';
import { initWormholes } from './wormholes.js';

const wormholes = initWormholes(constellationData);

// Get wormholes from a topic
wormholes.forTopic('ancient_egypt')

// Get all unlocked wormholes for user
wormholes.visible(userProgress)

// Check for new discoveries when card claimed
wormholes.checkNew(topicId, cardCount, userProgress)
```

---

### 3. Reference Documents

- **`THE_VOID_VISION.md`** — Full product vision, narrative design, mystery layers
- **`SPACE_THEME_GUIDE.md`** — Naming conventions, tone, copy examples
- **`study_system_specification.pdf`** — Acquisition + Retention mechanics (SRS)
- **`constellation_preview.html`** — Visual preview of the constellation (open in browser)

---

## Implementation Order

### Phase 1: Data Layer
**Goal:** Get constellation data into the app

1. Import `rememberer_constellation.json`
2. Create a hook or context for constellation data:
```javascript
const useConstellation = () => {
  const [data] = useState(constellationData);
  return {
    topics: data.topics,
    clusters: data.clusters,
    getTopic: (id) => data.topics[id],
    getCluster: (name) => data.clusters[name],
  };
};
```
3. Update user progress schema:
```javascript
userProgress: {
  character: null,           // 'chronicler' | 'naturalist' | etc.
  unlockedTopics: [],        // Topic IDs user can see
  exploredTopics: [],        // Topics user has entered
  topicProgress: {           // Per-topic progress
    [topicId]: {
      claimedCards: 0,
      cardIds: [],
      firstVisited: timestamp,
    }
  },
  unlockedWormholes: [],     // Wormhole IDs discovered
}
```

---

### Phase 2: Character Selection
**Goal:** New users pick an origin, get starting stars

**Screen:** Full-screen dark background, minimal text

**Flow:**
```
> calibrating...
> 
> what calls to you?
>
> [the past]           → HISTORICAL
> [living things]      → BIOLOGICAL
> [how things work]    → STRUCTURAL
> [what it all means]  → PHILOSOPHICAL
> [you're not sure]    → RANDOM
```

**Archetypes:**
```javascript
const CHARACTER_ORIGINS = {
  chronicler: {
    name: "Chronicler",
    prompt: "the past",
    startingTopics: ['history', 'ancient_egypt', 'world_war_ii', 'ancient_rome', 'renaissance']
  },
  naturalist: {
    name: "Naturalist",
    prompt: "living things",
    startingTopics: ['biology', 'animal', 'plant', 'evolution', 'human_body']
  },
  architect: {
    name: "Architect",
    prompt: "how things work",
    startingTopics: ['physics', 'engineering', 'mathematics', 'computer', 'energy']
  },
  philosopher: {
    name: "Philosopher",
    prompt: "what it all means",
    startingTopics: ['philosophy', 'religion', 'ethics', 'consciousness', 'god']
  },
  wanderer: {
    name: "Wanderer",
    prompt: "you're not sure",
    startingTopics: null  // Random 5
  }
};
```

**After Selection:**
```
> ...calibrating
> ...
> 5 signals found
>
> [begin]
```

Then fade to the Void.

---

### Phase 3: The Void (Home Screen)
**Goal:** Replace current home with constellation view

**Visual:**
- Black background (#0a0a0f)
- Stars rendered at (x, y) positions from constellation data
- Only unlocked topics visible (others hidden or very faint)
- Cluster labels visible when zoomed out
- Tap star → navigate to topic

**Implementation:**
```jsx
function Void() {
  const { topics, clusters } = useConstellation();
  const { unlockedTopics } = useUserProgress();
  
  return (
    <Canvas>
      {/* Cluster regions (subtle glow) */}
      {Object.entries(clusters).map(([name, cluster]) => (
        <ClusterRegion key={name} {...cluster} />
      ))}
      
      {/* Stars */}
      {Object.entries(topics).map(([id, topic]) => {
        const isUnlocked = unlockedTopics.includes(id);
        if (!isUnlocked) return null;
        
        return (
          <Star 
            key={id}
            x={topic.x}
            y={topic.y}
            color={topic.color}
            onTap={() => navigateToTopic(id)}
          />
        );
      })}
      
      {/* Wormholes */}
      <WormholePortals />
    </Canvas>
  );
}
```

**Interactions:**
- Drag to pan
- Pinch/scroll to zoom
- Tap star → enter topic (Star View)

---

### Phase 4: Topic View (Star View)
**Goal:** Update topic view with new framing

Keep existing card display, but:
1. Update header: Show star name, simple
2. Show progress: "3/6 fragments captured"
3. Cards are "fragments" — dim until captured, bright after
4. Button: "Capture" (not "Claim")

**Unlock Logic:**
When user captures 2nd fragment in a star:
```javascript
function onFragmentCaptured(topicId) {
  const progress = userProgress.topicProgress[topicId];
  progress.claimedCards += 1;
  
  // Reveal nearby stars at 2 fragments
  if (progress.claimedCards === 2) {
    const children = getDirectChildren(topicId);
    
    children.forEach(childId => {
      if (!userProgress.unlockedTopics.includes(childId)) {
        userProgress.unlockedTopics.push(childId);
        // Show: "...new signal detected"
      }
    });
  }
  
  // Check for wormholes at 4 fragments
  if (progress.claimedCards === 4) {
    const newWormholes = wormholes.checkNew(topicId, 4, userProgress);
    if (newWormholes.length > 0) {
      // Show: "...anomaly detected"
      showWormholeDiscovery(newWormholes[0]);
    }
  }
}
```

---

### Phase 5: Wormhole Discovery
**Goal:** The "what the..." moment

**Trigger:** User captures 4th fragment in a star

**Animation sequence:**
1. Brief pause
2. Screen flickers subtly
3. Modal fades in:
   ```
   > ...anomaly detected
   >
   > ANCIENT EGYPT ↔ MATHEMATICS
   > "The Geometry of Monuments"
   >
   > shared resonance: astronomy, construction
   >
   > [investigate]  [later]
   ```
4. If investigated: fade transition → camera pans to destination cluster

**Data flow:**
```javascript
const discovery = wormholes.checkNew('ancient_egypt', 4, userProgress);
// Returns: {
//   id: 'ancient_egypt|mathematics',
//   name: 'The Mathematics of the Pyramids',
//   from: { topicId: 'ancient_egypt', ... },
//   to: { topicId: 'mathematics', cluster: 'mathematics', x: 526, y: -112 },
//   sharedConcepts: ['astronomy', 'construction', ...]
// }
```

---

### Phase 6: Wormhole Rendering
**Goal:** Show discovered wormholes in the Void

**Visual:** Glowing portal at cluster edge, connected by faint line to destination

```javascript
function WormholePortals() {
  const visible = wormholes.visible(userProgress);
  
  return visible.map(w => {
    const pos = wormholes.portalPosition(w, currentCluster);
    return (
      <Portal
        key={w.id}
        x={pos.x}
        y={pos.y}
        name={w.name}
        onTap={() => travelThroughWormhole(w)}
      />
    );
  });
}
```

---

### Phase 7: Polish & Narrative
**Goal:** Add the mystery layer

**System messages (sparse, lowercase):**
- First launch: `> ...` then `> calibrating`
- Fragment captured: `> ...captured`
- New star revealed: `> ...signal detected`
- Wormhole found: `> ...anomaly detected`
- Review needed: `> 8 fragments fading`

**Ranks (based on stars mapped):**
| Stars | Rank |
|-------|------|
| 0 | Unknown |
| 5 | Navigator |
| 25 | Surveyor |
| 100 | Cartographer |
| 250 | Pathfinder |
| 500 | Explorer |
| 1000 | Archivist |

**Story fragments (rare, at milestones):**
See `THE_VOID_VISION.md` for the full narrative design. Key moments:
- 50 stars: First cryptic hint
- 100 stars: Log fragment from someone before you
- Major wormhole discoveries: Deeper hints

The mystery unfolds slowly. Don't explain too much.

---

## File Structure Suggestion

```
src/
├── data/
│   ├── constellation.json      # Topic positions & concepts
│   └── characters.js           # Origin definitions
├── systems/
│   ├── wormholes.js            # Wormhole detection
│   └── progression.js          # Unlock logic, titles
├── hooks/
│   ├── useConstellation.js
│   ├── useWormholes.js
│   └── useUserProgress.js
├── screens/
│   ├── CharacterSelect.jsx
│   ├── Void.jsx                # Constellation home
│   ├── StarView.jsx            # Topic/star view
│   └── StudySession.jsx        # Existing study system
├── components/
│   ├── Star.jsx
│   ├── ClusterRegion.jsx
│   ├── WormholePortal.jsx
│   ├── WormholeDiscovery.jsx   # Modal for discovery moment
│   └── Card.jsx                # Existing
```

---

## What NOT to Change

1. **Study system** — Already working, leave it alone
2. **Card generation** — Keep existing Claude API integration
3. **Supabase caching** — Keep shared card storage
4. **Core card display** — Just update framing/copy

---

## Quick Wins (Start Here)

If you want to see progress fast:

1. **Import constellation.json** — 5 minutes
2. **Add character selection screen** — 30 minutes
3. **Build basic Void view** — 1-2 hours (just dots on black)
4. **Hook up tap → navigate** — 30 minutes

You'll have a working constellation in an afternoon.

---

## Questions to Resolve

1. **How is your topic tree currently structured?** 
   - Need to map constellation data to existing IDs
   - Or replace entirely with constellation.json

2. **Canvas library preference?**
   - Plain Canvas API
   - react-konva
   - SVG
   - Something else?

3. **Animation library?**
   - Framer Motion (recommended)
   - React Spring
   - CSS transitions only

4. **Mobile-first or desktop-first?**
   - Affects touch handling, zoom behavior

---

## Summary

**The minimal viable Void:**
1. Character selection → 5 starting stars
2. Void view → see your constellation
3. Tap star → see fragments
4. Capture fragments → unlock more stars
5. Capture 4 fragments → discover wormhole

Everything else (mystery narrative, story fragments, polish) can come after this loop works.

**Go build it.**
