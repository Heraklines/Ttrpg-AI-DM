# Arcane Gamemaster - Comprehensive Handoff Document

## Project Overview

This is a **D&D 5th Edition AI Companion App** built with Next.js 14, TypeScript, Prisma, and AI integration (Vertex AI / OpenRouter). The core philosophy is **zero player overhead** - all game mechanics (dice, HP, combat, inventory) are handled automatically in the background while the AI focuses purely on storytelling.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  /campaigns (list) → /campaign/[id]/setup → /campaign/[id] (play)  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (/api)                            │
│  /campaign, /character, /adventure/action, /adventure/intro         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI ORCHESTRATOR                                │
│  system-prompt.ts → orchestrator.ts → function-executor.ts          │
│                          ↓                                          │
│                   state-guardian.ts (context injection + validation)│
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GAME ENGINES (Pure TypeScript)                 │
│  dice-engine.ts │ combat-engine.ts │ spatial-engine.ts              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (Prisma + SQLite)                     │
│  Campaign, Character, GameState, Session, Location                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Files & Their Purposes

### AI System (`/src/lib/ai/`)

| File | Purpose |
|------|---------|
| `system-prompt.ts` | The DM's "brain" - execution protocol, function requirements, banned words, examples. **CRITICAL FILE** |
| `orchestrator.ts` | Main conversation loop - sends prompt to AI, parses function calls, executes them, validates response |
| `function-executor.ts` | Maps AI function calls to actual game engine operations (roll_attack, apply_damage, modify_inventory, etc.) |
| `state-guardian.ts` | Generates context injection (party status, location, combat state) and validates AI responses |
| `client.ts` | AI API client (Vertex AI primary, OpenRouter fallback) |

### Game Engines (`/src/lib/engine/`)

| File | Purpose |
|------|---------|
| `dice-engine.ts` | All dice mechanics - parsing notation, rolling, advantage/disadvantage |
| `combat-engine.ts` | Initiative, turn tracking, HP management, conditions, death saves |
| `spatial-engine.ts` | A* pathfinding, line-of-sight, cover calculations, fog of war |
| `types.ts` | Shared TypeScript interfaces (Character, Combat, etc.) |
| `spatial-types.ts` | Map/grid types (GameMap, MapEntity, GridPosition) |

### API Routes (`/src/app/api/`)

| Route | Purpose |
|-------|---------|
| `/api/campaign/[id]` | CRUD for campaigns (GET, PATCH, DELETE) |
| `/api/character` | Create characters, list all |
| `/api/character/[id]` | Get/update/delete individual character |
| `/api/adventure/action` | **MAIN GAMEPLAY ENDPOINT** - processes player input through AI |
| `/api/adventure/intro` | Generates rich campaign introduction |
| `/api/spatial` | Map operations (create, move, query) |

### Frontend Pages (`/src/app/`)

| Page | Purpose |
|------|---------|
| `/campaigns` | Campaign list - create new or continue existing |
| `/campaign/[id]/setup` | Party selection before starting adventure |
| `/campaign/[id]` | **MAIN ADVENTURE SCREEN** - chat interface with party sidebar |
| `/campaign/[id]/character/new` | 6-step character creation wizard |
| `/campaign/[id]/settings` | Campaign settings (difficulty, rules) |
| `/campaign/[id]/sessions` | Session history with transcripts |

---

## How the AI Loop Works

1. **Player types action** → Frontend sends to `/api/adventure/action`

2. **API loads context** → Campaign, characters, game state from DB

3. **Orchestrator builds prompt**:
   - `state-guardian.generateContextInjection()` adds:
     - Current location (inferred from recent messages)
     - Party status (HP, conditions)
     - Combat state (if in combat)
     - Recent messages for context
   - System prompt from `system-prompt.ts`
   - Player's input

4. **AI responds** with function calls + narrative:
   ```
   roll_ability_check(character_id="elena", ability="dexterity", skill="stealth", dc=15)
   
   Elena presses herself against the cold stone wall, her breathing shallow...
   ```

5. **Orchestrator parses & executes**:
   - `parseFunctionCalls()` extracts function calls from text
   - `executeFunction()` runs each through game engines
   - Results stored (e.g., "🎲 Stealth: 18 vs DC 15 - SUCCESS!")

6. **If narrative empty**, orchestrator requests follow-up narrative from AI

7. **State Guardian validates** - checks for mechanical terms in narrative

8. **API persists changes** to database:
   - Character updates (HP, inventory, conditions, etc.)
   - Game state updates (mode, time, combat)
   - Message history

9. **Frontend receives** narrative + dice rolls, updates UI

---

## Critical Implementation Details

### Inventory System

**Character creation** (`/campaign/[id]/character/new/page.tsx`):
- Combines `CLASS_STARTING_EQUIPMENT` + `BACKGROUND_EQUIPMENT`
- Gold = class gold + background gold
- `combineEquipment()` helper merges both sources

**During adventures** (`function-executor.ts`):
- `modify_inventory` function handles add/remove/use/equip
- **CRITICAL**: API must persist inventory changes! Check `/api/adventure/action/route.ts` line ~129:
  ```typescript
  if (updates.inventory !== undefined) updateData.inventory = JSON.stringify(updates.inventory);
  ```

### AI Sanity Checks

The AI has a **STEP 0: SANITY CHECK** in `system-prompt.ts`:
- Must verify player action is POSSIBLE given current location
- `state-guardian.ts` infers location from recent DM messages
- AI should reject impossible actions (e.g., "steal from merchant" when in a forest)

### Combat Flow

1. `start_combat()` → Creates Combat object, rolls initiative
2. `roll_attack()` → `roll_damage()` → `apply_damage()` sequence
3. `next_turn()` → Advances initiative
4. `end_combat()` → Cleans up, changes mode to exploration

### Function Call Format

AI outputs function calls as text (not native function calling):
```
function_name(param1="value", param2=123)
```

Parsed by regex in `function-executor.ts` → `parseFunctionCalls()`

---

## What's Working

- [x] Campaign CRUD
- [x] Character creation with class + background equipment
- [x] AI conversation loop with function execution
- [x] Dice rolling (all D&D mechanics)
- [x] Combat engine (initiative, turns, HP tracking)
- [x] Inventory management (add/remove/use)
- [x] Spell slots and class resources
- [x] Conditions (add/remove/duration)
- [x] Spatial engine (pathfinding, LoS, cover)
- [x] Session history
- [x] Campaign settings
- [x] Adventure screen with party sidebar
- [x] Collapsible dice log
- [x] World Lore Generation System (WorldSeed + related models)
- [x] Lore Explorer UI with Codex view
- [x] MiniMap component (canvas-based, drag-to-move)
- [x] All game functions implemented in function-executor.ts

---

## Current Status

### IMPLEMENTED
1. **World Lore Generation** - Full pipeline with WorldSeed, tensions extraction, 6-phase generation
2. **Lore Explorer UI** - `/campaign/[id]/lore` page with codex navigation, map view with locations, relationship graph
3. **All AI Functions** - roll_*, apply_*, combat_*, lore_*, spatial_* all implemented
4. **MiniMap Component** - Canvas rendering with fog of war, entities, drag movement - integrated into adventure screen right panel
5. **Streaming** - `/api/adventure/action/stream` integrated with toggle button and status indicator
6. **Spell System UI** - Right panel shows spell slots, known/prepared spells, click-to-cast

### COMPLETED (This Session)
- Fixed all build errors (type casting issues in lore page, character page, CodexEntry)
- Fixed all test failures (vitest parallelism, schema field mismatches)
- Integrated MapView into LoreExplorer with tabs (Codex/Map/Graph)
- Added streaming support to adventure sendMessage function
- Fixed property-based test date generation issue

### COMPLETED (World Lore Fixes)
- **Fixed lore generation not triggering from templates**: Added world description editor to setup page
- **Added 50-character minimum indicator**: Character counter shows progress to minimum required
- **Added manual "Generate World Lore" button**: Visible when description is sufficient
- **Improved lore-status API**: Returns detailed `reason` field (`no_description`, `description_too_short`, `ready`)
- **Integrated RelationshipGraph component**: Relationships tab now shows faction/NPC connections with force-directed layout
- **Added description editing**: Users can edit/expand campaign description after creation
- Setup page now shows exactly why generation hasn't started and what to do

### COMPLETED (New Lore Visualizations)
- **TimelineView component**: Horizontal timeline displaying world eras and major events
  - Era bars showing time spans with color-coded tones
  - Event markers at correct positions with hover tooltips
  - Zoom controls (50% to 200%) for exploring dense timelines
  - Player/DM mode filtering (DM-only events hidden for players)
  - Click-to-navigate to event details in codex
  - File: `src/components/lore-explorer/TimelineView.tsx`
- **Enhanced MapView component**: Interactive world map with advanced features
  - Procedural terrain generation (mountains, forests, water, plains)
  - SVG compass rose with cardinal/intercardinal directions
  - Route visualization between connected locations
  - Layer toggles (terrain/routes/labels)
  - Zoom (25% to 200%) and pan controls
  - Info cards on location hover
  - File: `src/components/lore-explorer/MapView.tsx`
- **LoreExplorer integration**: Added timeline tab button and view section
  - Four tabs: Codex, World Map, Relationships, Timeline
  - Timeline data fetched from history endpoint
  - Smooth tab switching between all views

### KNOWN ISSUES

1. **Test file TypeScript errors** - `src/__tests__/api-routes.test.ts` has NextRequest type mismatches (18 errors)
   - Tests use `Request` but API expects `NextRequest`
   - Doesn't affect runtime, only test execution
   - Fix: Create proper NextRequest mocks or update test utilities

2. **AI Sometimes Doesn't Narrate** - The orchestrator has a fallback but may need tuning

3. **Location Inference** - `inferCurrentLocation()` in state-guardian is basic. Enhanced by:
   - `set_location()` function in function-executor
   - Location lore provides rich context when available

### REMAINING FEATURES (Nice-to-have)

1. **Equipment/Armor UI** - Data structure exists (`equippedItems` in Character) - already shows in inventory panel

2. **Sound System** - Not implemented (optional)

3. **PDF Import** - Not implemented (optional)

4. **Rate Limiting** - No API protection (production concern)

---

## Database Schema (Prisma)

Key models in `/prisma/schema.prisma`:

```prisma
model Campaign {
  id          String      @id @default(uuid())
  name        String
  description String?
  characters  Character[]
  gameState   GameState?
  sessions    Session[]
}

model Character {
  id                String   @id @default(uuid())
  campaignId        String?
  name              String
  race              String
  className         String
  level             Int      @default(1)
  currentHp         Int
  maxHp             Int
  inventory         String   @default("[]")  // JSON array
  gold              Int      @default(0)
  conditions        String   @default("[]")  // JSON array
  spellSlots        String   @default("{}")  // JSON object
  classResources    String   @default("[]")  // JSON array
  // ... many more fields
}

model GameState {
  id             String   @id @default(uuid())
  campaignId     String   @unique
  mode           String   @default("exploration")
  gameDay        Int      @default(1)
  gameHour       Int      @default(8)
  recentMessages String   @default("[]")  // JSON - last 20 messages
  activeCombat   String?  // JSON Combat object
  activeMap      String?  // JSON GameMap object
}
```

---

## Environment Variables

Required in `.env`:
```
DATABASE_URL="file:./dev.db"
VERTEX_AI_API_KEY="..."
OPENROUTER_API_KEY="..."  # Fallback
```

---

## Running the App

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (if schema changed)
npx prisma migrate dev

# Start dev server
npm run dev

# Run tests
npm run test
```

---

## Testing

- **Unit tests**: `/src/lib/engine/*.test.ts` - 115 tests for dice/combat/spatial engines
- **Run with**: `npm run test` or `npx vitest run`
- **E2E**: Playwright setup exists but minimal tests

---

## Common Debugging

### "AI isn't calling functions"
1. Check `system-prompt.ts` - is the function in the requirements table?
2. Check console logs in orchestrator for what AI actually returned
3. The AI might be confused about character IDs - check context injection

### "Inventory not updating"
1. Check `/api/adventure/action/route.ts` - is inventory in the update list?
2. Check function-executor `modify_inventory` - is it updating context correctly?
3. Check frontend - is it refetching campaign after action?

### "AI goes along with impossible actions"
1. Check `system-prompt.ts` STEP 0 sanity check
2. Check `state-guardian.ts` `inferCurrentLocation()` - is it providing good context?
3. Add more explicit location tracking

### "TypeScript errors with Set/Map iteration"
Use `Array.from()` instead of spread operator on Sets/Maps

---

## Files Changed This Session

1. `/src/lib/ai/system-prompt.ts` - Added STEP 0 sanity check, DM authority section, inventory examples
2. `/src/lib/ai/state-guardian.ts` - Added `inferCurrentLocation()` method
3. `/src/lib/ai/orchestrator.ts` - Added fallback narrative generation when AI only outputs functions
4. `/src/app/api/adventure/action/route.ts` - Added inventory/gold/spellSlots/classResources to character updates
5. `/src/app/campaign/[id]/page.tsx` - Redesigned adventure UI (dark theme, 3-column layout)
6. `/src/app/campaign/[id]/character/new/page.tsx` - Added BACKGROUND_EQUIPMENT, BACKGROUND_GOLD, combineEquipment()

---

## Design Philosophy Reminders

1. **Zero Player Overhead** - All mechanics automatic, player just types what they want to do
2. **AI Never Sees Numbers** - Narrative only, no "you rolled 18" in output
3. **Functions Before Narrative** - AI must call tools first, then describe results
4. **DM Has Authority** - AI should reject impossible actions, maintain world consistency
5. **Information Hierarchy** - Essential info always visible, details on demand

---

## Quick Start for Successor

1. Read `ARCHITECTURE.md` and `SPEC_AUDIT.md` in project root
2. Understand the AI loop: `system-prompt.ts` → `orchestrator.ts` → `function-executor.ts`
3. Test by creating a campaign, adding a character, playing through a few actions
4. Check browser console and server logs for AI responses and function calls
5. The adventure page (`/campaign/[id]/page.tsx`) is the most important UI file

Good luck! The core systems are solid - it's mostly about polish, edge cases, and UI improvements now.

---

## UPCOMING: Campaign World Lore Generation System

### Overview

The next major feature is an **asynchronous world lore generation system** that automatically creates rich campaign content when a player finishes describing their setting. Full design specification is in `/.kiro/specs/campaign-lore-generation/design.md`.

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN CREATION FLOW                                  │
│                                                                                │
│  Player completes       POST /api/campaign          LoreGenerationQueue       │
│  campaign description ─────────────────────────→ enqueues job with campaignId │
│                                                           │                   │
│                                                           ▼                   │
│                              ┌─────────────────────────────────────────┐      │
│                              │      LoreGenerationService              │      │
│                              │                                         │      │
│                              │  Phase 1: World History & Cosmology     │      │
│                              │  Phase 2: Factions & Power Structures   │      │
│                              │  Phase 3: Key NPCs & Personalities      │      │
│                              │  Phase 4: Conflicts & Tensions          │      │
│                              │  Phase 5: Geography & Locations         │      │
│                              │  Phase 6: Secrets & Plot Hooks          │      │
│                              └─────────────────────────────────────────┘      │
│                                                           │                   │
│                                                           ▼                   │
│                              ┌─────────────────────────────────────────┐      │
│                              │         CampaignLore Database           │      │
│                              │  (1:1 with Campaign, stores all lore)   │      │
│                              └─────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### New Database Models

```prisma
model CampaignLore {
  id                String   @id @default(uuid())
  campaignId        String   @unique
  campaign          Campaign @relation(...)
  generationStatus  String   @default("pending") // pending, generating, completed, failed
  worldName         String?
  tone              String?  // dark, heroic, comedic, etc.
  themes            String   @default("[]")
  cosmology         String   @default("{}")
  worldHistory      String   @default("[]")
  npcs              LoreNpc[]
  factions          LoreFaction[]
  locations         LoreLocation[]
  conflicts         LoreConflict[]
  secrets           LoreSecret[]
}

model LoreNpc {
  name, role, importance, personality, publicGoal, secretGoal, 
  relationships, factionId, primaryLocation, isRevealed
}

model LoreFaction {
  name, type, importance, goals, methods, resources, allies, enemies,
  headquarters, influence, playerStanding
}

model LoreLocation {
  name, locationType, importance, description, atmosphere, sensoryDetails,
  region, terrain, connectedTo, factionPresence, isDiscovered
}

model LoreConflict {
  name, type, scope, importance, participants, stakes, 
  publicKnowledge, trueNature, currentState, isRevealed
}

model LoreSecret {
  name, type, importance, content, hints, relatedNpcs, relatedFactions,
  discoveryConditions, revealImpact, isRevealed
}
```

### Context Injection Strategy

**Tiered Injection Model:**
- **Tier 1 (Always ~100-150 tokens)**: World name, tone, current location, main conflict
- **Tier 2 (Situational ~200-400 tokens)**: NPCs at current location, local conflicts, recent mentions
- **Tier 3 (On-demand via functions)**: Deep history, distant locations, unrevealed secrets

**Relevance Scoring:**
- At current location: +10 points
- Recently mentioned: +8 points
- Major importance: +5 points
- Already revealed: +2 points

### New AI Functions

| Function | Purpose |
|----------|---------|
| `recall_lore(topic, type?)` | Query world lore database for information |
| `reveal_secret(secret_name, context)` | Mark secret as revealed, return full content |
| `introduce_npc(npc_name, type)` | Mark NPC as revealed, return personality details |
| `discover_location(location_name, method)` | Mark location discovered, return description |

### Implementation Files to Create

```
src/lib/lore/
├── lore-generation-queue.ts    # Job queue with idempotency
├── lore-generation-service.ts  # 6-phase generation orchestrator
└── lore-context-manager.ts     # Tiered context injection

src/app/api/campaign/[id]/
├── generate-lore/route.ts      # POST - trigger generation
├── lore-status/route.ts        # GET - check status
└── lore/route.ts               # POST - query lore
```

### Key Design Decisions

1. **Non-blocking Generation**: Players can start playing immediately while lore generates
2. **Idempotent Operations**: Multiple triggers for same campaign return existing job
3. **Phase Skip Logic**: Failed generation preserves partial progress, resumes from last complete phase
4. **Token Budget Management**: Relevance scoring ensures important lore fits within limits
5. **Campaign Isolation**: All lore strictly scoped to its campaign via foreign keys
