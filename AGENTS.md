# AGENTS.md - Arcane Gamemaster

## Quick Reference

### Commands
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npx prisma studio    # View/edit database
npx prisma db push   # Apply schema changes
npx tsc --noEmit     # Type check only
npx ts-node scripts/cleanup-db.ts  # Clean up test/duplicate campaigns
```

### After Making Changes
Always run `npm run build` to verify no type errors before finishing.

---

## Core Philosophy

**Zero Player Overhead** - The AI handles storytelling, code handles ALL mechanics.

**THE AI NEVER ROLLS DICE OR CALCULATES MECHANICS** - The system:
1. Determines what rolls are needed
2. Executes rolls via dice engine
3. Provides results to AI
4. AI narrates WITHOUT mentioning mechanics

---

## Architecture

```
src/
├── app/               # Next.js 14 App Router
│   └── api/           # Backend endpoints
├── components/        # React components
└── lib/               # Core libraries (PORTABLE - no Next.js deps)
    ├── ai/            # AI integration
    │   ├── orchestrator.ts      # Main conversation loop
    │   ├── system-prompt.ts     # DM brain (CRITICAL)
    │   ├── function-executor.ts # Executes AI function calls
    │   └── state-guardian.ts    # Context injection + validation
    └── engine/        # Game mechanics (PORTABLE)
        ├── dice-engine.ts       # All dice rolling
        ├── combat-engine.ts     # Combat state management
        └── types.ts             # All TypeScript types
```

---

## Key Design Rules

### Code Style
- TypeScript strict mode enabled
- Zod for all API input validation
- Functional React components with hooks
- Tailwind CSS for styling
- `'use client'` directive for client components

### Game Engines
- Pure TypeScript, NO framework dependencies
- Immutable updates (return new objects)
- All types in `lib/engine/types.ts`

### API Routes
- Always validate with Zod schemas
- Return `{ data }` or `{ error }` JSON
- Complex state stored as JSON in SQLite

### Theme Colors (Tailwind)
```
primary: '#C4A35A'     (Aged gold)
secondary: '#6B1C23'   (Deep burgundy)  
tertiary: '#1E4D6B'    (Mystical blue)
background: '#1A1714'  (Dark wood)
surface: '#2D241E'     (Medium wood)
parchment: '#F4E4BC'   (Text)
ember: '#CF6679'       (Error)
forest: '#4CAF50'      (Success)
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `lib/ai/system-prompt.ts` | DM personality and rules - **MOST CRITICAL** |
| `lib/ai/orchestrator.ts` | Main AI conversation loop |
| `lib/ai/function-executor.ts` | Maps AI calls to game engines |
| `lib/engine/dice-engine.ts` | All dice mechanics |
| `lib/engine/combat-engine.ts` | Combat state management |
| `app/campaign/[id]/page.tsx` | Main adventure screen |

---

## AI Function Call Format

AI outputs function calls as text (not native function calling):
```
function_name(param1="value", param2=123)
```

Parsed by regex in `function-executor.ts`.

---

## Database

Prisma + SQLite. Key models:
- **Campaign**: name, description, characters, gameState
- **Character**: stats, inventory (JSON), conditions (JSON), spellSlots (JSON)
  - `campaignId` is optional - characters can exist without a campaign
  - Deleting a campaign sets character's `campaignId` to null (not cascade delete)
- **GameState**: mode, time, recentMessages (JSON), activeCombat (JSON)
- **CampaignTemplate**: name, description (for reusable campaign configurations)

Reset database: `rm prisma/dev.db && npx prisma db push`

---

## Testing

- **Unit tests**: `lib/engine/*.test.ts` (Vitest)
- **E2E tests**: `e2e/` (Playwright)
- Always check existing tests before adding new features

---

## Common Pitfalls

1. **Set/Map iteration** - Use `Array.from()` instead of spread operator
2. **JSON fields** - Parse with `JSON.parse()` when reading from DB
3. **AI mentions dice** - Check system-prompt.ts and context injection
4. **Inventory not updating** - Verify API route persists changes

---

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
VERTEX_AI_API_KEY="..."
OPENROUTER_API_KEY="..."  # Fallback
```

---

## Adding Features

### New Dice Roll Type
1. Add result interface to `types.ts`
2. Add method to `DiceEngine`
3. Add tests
4. Add to `function-registry.ts`
5. Add executor case to `function-executor.ts`

### New API Endpoint
1. Create route in `app/api/`
2. Define Zod schema
3. Implement with error handling

### New UI Component
1. Create in `components/`
2. Use Tailwind with theme colors
3. Handle loading/error states
