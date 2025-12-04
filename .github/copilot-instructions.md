# Arcane Gamemaster - AI Coding Guidelines

## Core Philosophy
**Zero Player Overhead** - The AI handles storytelling, code handles ALL game mechanics.  
**The AI NEVER rolls dice** - Pre-determine rolls via engines, execute, then AI narrates results.

## Architecture Overview

```
Frontend (Next.js App Router) → API Routes → AI Orchestrator → Game Engines → SQLite/Prisma
```

### Key Data Flow (Player Action)
1. Player input → `POST /api/adventure/action`
2. Load campaign/characters from DB
3. `orchestrator.processAction()`:
   - `state-guardian.ts` injects context (location, party HP, combat state)
   - Determine required dice rolls
   - Execute via `dice-engine.ts`
   - Build prompt with results
   - Send to AI (Vertex AI primary, OpenRouter fallback)
   - Parse function calls from AI response text
   - Execute functions via `function-executor.ts`
4. Persist changes to DB
5. Return `{ narrative, diceRolls, gameState }`

### Critical Files
| File | Purpose |
|------|---------|
| `lib/ai/system-prompt.ts` | DM personality, execution protocol, banned words - **MOST CRITICAL** |
| `lib/ai/orchestrator.ts` | Main conversation loop, function parsing |
| `lib/ai/function-executor.ts` | Maps AI text function calls to game engines (45+ functions) |
| `lib/engine/types.ts` | All D&D TypeScript interfaces |
| `lib/engine/dice-engine.ts` | Dice mechanics, advantage/disadvantage |
| `lib/engine/combat-engine.ts` | Initiative, turns, HP, conditions |
| `lib/engine/spatial-engine.ts` | A* pathfinding, LoS, cover calculations |

## Development Commands
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # ALWAYS run before committing
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npx prisma studio        # View/edit database
npx prisma db push       # Apply schema changes
```

## Code Conventions

### TypeScript
- Strict mode enabled; all game types in `lib/engine/types.ts`
- Use Zod for runtime validation on API inputs
- Game engines (`lib/engine/*`) are **portable** - zero Next.js dependencies

### Database (Prisma + SQLite)
- Complex state stored as JSON strings (parse with `JSON.parse()` when reading)
- Reset database: `rm prisma/dev.db && npx prisma db push`
- Key models: `Campaign`, `Character`, `GameState`, `WorldSeed` (lore), `CampaignLore` (legacy)

### AI Function Format
AI outputs function calls as text (not native function calling):
```
roll_ability_check(character_id="elena", ability="dexterity", skill="stealth", dc=15)
```
Parsed by regex in `function-executor.ts` → `parseFunctionCalls()`.

### React/Tailwind
- Use `'use client'` directive for client components
- Theme colors: `primary: #C4A35A` (gold), `secondary: #6B1C23` (burgundy), `background: #1A1714` (dark wood)

## Common Pitfalls

1. **Set/Map iteration** - Use `Array.from()` instead of spread operator
2. **JSON fields from DB** - Always parse: `JSON.parse(character.inventory)`
3. **AI mentions dice** - Check `system-prompt.ts` banned words and context injection
4. **Inventory not updating** - Verify API route persists inventory in character updates
5. **Character lookup** - `function-executor.ts` searches by ID and by name (case-insensitive)

## Adding Features

### New AI Function
1. Add to `knownFunctions` array in `function-executor.ts`
2. Add case to `executeFunction()` switch statement
3. Document in `system-prompt.ts` function requirements table
4. Add test cases

### New API Endpoint
1. Create route in `app/api/[route]/route.ts`
2. Define Zod schema for request body
3. Return `{ data }` or `{ error }` JSON

## World Lore System
- `WorldSeed` + related models: Tension-first generation with factions, NPCs, locations, conflicts, secrets
- Generation service in `lib/lore/lore-generation-service.ts` with 6-phase pipeline
- Lore Explorer UI at `/campaign/[id]/lore` with codex navigation
- AI lore functions: `recall_lore`, `introduce_npc`, `discover_location`, `reveal_secret`
- Async lore queries handled via `executeLoreFunction()` in function-executor

## Key UI Components
- `components/mini-map.tsx` - Canvas-based tactical map with fog of war
- `components/combat-overlay.tsx` - Initiative tracker during combat
- `components/lore-explorer/` - World lore codex UI

## Testing
- Unit tests: `src/lib/engine/*.test.ts` - 115+ tests for dice/combat/spatial
- E2E tests: `e2e/*.spec.ts` - Playwright
- Test utilities: `src/__tests__/test-utils.ts`
