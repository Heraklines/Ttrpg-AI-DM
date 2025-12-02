# Arcane Gamemaster - Architecture & Development Guide

## Overview

Arcane Gamemaster is an AI-powered D&D 5th Edition companion application. The key innovation is **cognitive load offloading** - the AI handles storytelling while code handles all game mechanics.

**Core Principle: The AI NEVER rolls dice or calculates mechanics.**

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # Backend API endpoints
│   │   ├── adventure/     # Main gameplay (action, intro, stream)
│   │   ├── campaign/      # Campaign CRUD
│   │   ├── character/     # Character CRUD  
│   │   ├── combat/        # Combat management
│   │   └── rules/         # D&D rules lookup
│   ├── campaign/          # Campaign pages
│   │   └── [id]/          # Adventure screen & character creation
│   ├── campaigns/         # Campaign list page
│   └── settings/          # App settings
├── components/            # React components
└── lib/                   # Core libraries (PORTABLE - no Next.js deps)
    ├── ai/               # AI integration layer
    │   ├── client.ts            # Vertex AI / OpenRouter client
    │   ├── orchestrator.ts      # Main conversation loop
    │   ├── state-guardian.ts    # Context injection & validation
    │   ├── system-prompt.ts     # DM system prompts
    │   ├── function-registry.ts # Function definitions
    │   └── function-executor.ts # Execute AI function calls
    ├── engine/           # Game mechanics (PORTABLE)
    │   ├── types.ts             # All TypeScript types
    │   ├── dice-engine.ts       # Dice rolling
    │   ├── combat-engine.ts     # Combat turns
    │   └── spatial-engine.ts    # A* pathfinding, LoS
    └── db.ts             # Prisma database client
```

---

## Key Components

### 1. AI Orchestrator (`lib/ai/orchestrator.ts`)
- Builds context for AI prompts
- Processes AI responses and function calls
- Validates responses with State Guardian
- Generates campaign introductions

### 2. State Guardian (`lib/ai/state-guardian.ts`)
- **Context Injection**: Adds game state to every AI prompt
- **Validation**: Checks AI responses for mechanical claims without rolls
- **Location Inference**: Determines current location from messages

### 3. Dice Engine (`lib/engine/dice-engine.ts`)
- `roll(notation)` - Parse and roll dice (e.g., "2d6+3")
- `rollAttack()`, `rollDamage()`, `rollAbilityCheck()`, `rollSavingThrow()`
- `rollInitiative()` - Initiative order

### 4. Combat Engine (`lib/engine/combat-engine.ts`)
- `startCombat()`, `nextTurn()`, `endCombat()`
- `applyDamage()`, `applyHealing()`, `addCondition()`

---

## Data Flow

### Player Action Flow
```
1. Player types action → POST /api/adventure/action
2. Load campaign, characters, game state from DB
3. Orchestrator.processAction():
   ├── State Guardian injects context
   ├── Determine roll needed
   ├── Execute roll via Dice Engine
   ├── Build prompt with results
   ├── Send to AI
   ├── Parse response, execute function calls
   └── Validate response
4. Update DB (messages, state changes)
5. Return: { narrative, diceRolls, gameState }
```

---

## Database Schema (Prisma + SQLite)

```prisma
model Campaign {
  id, name, description, characters[], gameState, sessions[], lore?
}

model Character {
  id, campaignId?, name, race, className, level
  maxHp, currentHp, armorClass, speed
  inventory (JSON), conditions (JSON), spellSlots (JSON)
}

model GameState {
  id, campaignId (unique), mode, gameDay/Hour/Minute
  recentMessages (JSON), activeCombat (JSON), activeMap (JSON)
}

model CampaignLore {
  id, campaignId (unique), generationStatus, worldName, tone
  npcs[], factions[], locations[], conflicts[], secrets[]
}
```

**Reset database**: `rm prisma/dev.db && npx prisma db push`

---

## API Endpoints

| Category | Endpoints |
|----------|-----------|
| Adventure | `POST /action`, `POST /intro`, `POST /stream` |
| Campaign | `GET/POST /campaign`, `GET/PUT/DELETE /campaign/[id]` |
| Character | `GET/POST /character`, `GET/PUT/DELETE /character/[id]` |
| Combat | `POST /combat/start`, `/turn`, `/end` |
| Rules | `GET /rules/monster/[name]`, `/spell/[name]`, `/condition/[name]` |

---

## Development Setup

### Quick Start
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
# Open http://localhost:3000
```

### Environment Variables (.env)
```env
DATABASE_URL="file:./dev.db"
VERTEX_AI_API_KEY="..."      # Primary AI
OPENROUTER_API_KEY="..."     # Fallback
```

---

## Code Conventions

### TypeScript
- Strict mode enabled
- All game types in `lib/engine/types.ts`
- Zod for runtime validation

### React Components
- Functional components with hooks
- `'use client'` directive for client components
- Tailwind CSS for styling

### API Routes
- Zod validation on all inputs
- Return `{ data }` or `{ error }` JSON
- Complex state stored as JSON in SQLite

### Game Engines
- Pure TypeScript, no framework dependencies
- Immutable updates (return new objects)
- Comprehensive test coverage

---

## Adding Features

### New Dice Roll Type
1. Add result interface to `types.ts`
2. Add method to `DiceEngine`
3. Add test cases
4. Add function to `function-registry.ts`
5. Add executor case to `function-executor.ts`

### New API Endpoint
1. Create route in `app/api/`
2. Define Zod schema
3. Implement with error handling

### New UI Component
1. Create in `components/`
2. Use Tailwind with theme colors
3. Handle loading/error states

---

## Testing

### Unit Tests (Vitest)
```bash
npm run test           # Run all
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

### E2E Tests (Playwright)
```bash
npm run test:e2e       # Run tests
npm run test:e2e:ui    # With UI
```

---

## Debugging

### AI Issues
```typescript
// In orchestrator.ts
console.log('AI Prompt:', fullPrompt);
console.log('AI Response:', aiResponse);
console.log('Function Calls:', functionCalls);
```

### Database Issues
```bash
npx prisma studio              # View database
npx prisma db push --force-reset  # Reset
```

---

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No characters" on adventure | Check character creation saved to DB |
| AI mentions dice/rolls | Check system-prompt.ts, verify roll results in context |
| Combat not starting | Verify start_combat called, check activeCombat saved |
| Slow AI responses | Vertex: 2-5s, OpenRouter: 3-10s typical |

---

## AI Integration

### Providers
1. **Vertex AI** (Primary) - Google's Gemini
2. **OpenRouter** (Fallback) - Kimi K2 model

### Function Call Format
AI outputs function calls as text:
```
function_name(param1="value", param2=123)
```
Parsed by regex in `function-executor.ts`.

---

## Key Design Decisions

1. **Portable Core**: All `lib/engine/` has zero Next.js deps (enables React Native)
2. **AI Never Rolls**: Pre-determine rolls, execute, then ask AI to narrate
3. **State Guardian**: Post-response validation catches mechanical terms
4. **JSON Storage**: Flexible schema evolution for complex state
5. **Campaign Intro**: Rich introductions generated AFTER character creation
