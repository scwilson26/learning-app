# Claude Code Architecture Guide

## Architecture Rules

### Shared Explore Flow
**Location:** `src/components/Canvas.jsx` → `sharedExploreHandler()`

All exploration flows MUST use `sharedExploreHandler`. This includes:
- **Wander** (WanderCard onExplore)
- **Browser** (PreviewCardModal onDealMeIn)
- **Rabbit Hole popups** (RabbitHoleSheet onExplore → handleExploreRabbitHole)

**DO NOT** create separate navigation/claim logic elsewhere.

**To update explore behavior:** Modify `sharedExploreHandler()` - all flows will automatically get the change.

**Usage:**
```javascript
sharedExploreHandler(deckId, navigatePath)
```

### Preview Cards
Preview cards are shared across all discovery methods (Wander, Browser, Rabbit Hole).
- Same topic = same preview card (cached in localStorage and Supabase)
- All previews support rabbit hole links (clickable topic mentions)

### Two-Tier Card System
Topics have two tiers of cards:
- `core` (4 cards) - unlocked by default
- `deep_dive` (3 cards) - unlocked after completing core
