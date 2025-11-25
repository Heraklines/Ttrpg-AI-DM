# Arcane Gamemaster - Architecture Documentation

## Overview

Arcane Gamemaster is an AI-powered D&D 5th Edition companion application. The key innovation is **cognitive load offloading** - the AI handles storytelling while code handles all game mechanics.

## Core Principle

**The AI NEVER rolls dice or calculates mechanics.**

The system:
1. Determines what rolls are needed based on player actions
2. Executes the rolls using the dice engine
3. Provides results to the AI
4. AI narrates the outcome WITHOUT mentioning mechanics

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # Backend API endpoints
│   │   ├── adventure/     # Main gameplay endpoints
│   │   │   ├── action/    # Process player actions
│   │   │   └── intro/     # Generate campaign introductions
│   │   ├── campaign/      # Campaign CRUD
│   │   ├── character/     # Character CRUD  
│   │   ├── combat/        # Combat management (start/turn/end)
│   │   ├── dice/          # Direct dice rolling
│   │   └── rules/         # D&D rules lookup (monster/spell/condition)
│   ├── campaign/          # Campaign pages
│   │   └── [id]/          # Adventure screen & character creation
│   ├── campaigns/         # Campaign list page
│   ├── character/         # Character sheet page
│   └── settings/          # App settings
├── components/            # React components
│   └── combat-overlay.tsx # Combat initiative tracker
├── lib/                   # Core libraries (PORTABLE - no Next.js deps)
│   ├── ai/               # AI integration layer
│   │   ├── client.ts     # Vertex AI / OpenRouter API client
│   │   ├── orchestrator.ts # Main AI conversation loop
│   │   ├── state-guardian.ts # Context injection & validation
│   │   ├── system-prompt.ts # DM system prompts
│   │   ├── function-registry.ts # Function definitions for AI
│   │   └── function-executor.ts # Execute AI function calls
│   ├── engine/           # Game mechanics (PORTABLE)
│   │   ├── types.ts      # All TypeScript type definitions
│   │   ├── dice-engine.ts # Dice rolling mechanics
│   │   └── combat-engine.ts # Combat turn tracking
│   └── db.ts             # Prisma database client
└── test/                 # Test setup
```

## Key Components

### 1. AI Orchestrator (`lib/ai/orchestrator.ts`)

The brain of the system. Handles:
- Building context for AI prompts
- Processing AI responses
- Executing function calls
- Validating responses with State Guardian
- Generating campaign introductions

**Key Methods:**
- `processAction(playerInput, context)` - Main gameplay loop
- `generateCampaignIntro(context)` - Rich opening narration

### 2. State Guardian (`lib/ai/state-guardian.ts`)

Ensures mechanical consistency:
- **Context Injection**: Adds game state to every AI prompt
- **Validation**: Checks AI responses for mechanical claims without rolls
- **Correction**: Generates retry messages for invalid responses

**Key Methods:**
- `generateContextInjection(context)` - Build state block for prompts
- `validateResponse(text, functionsCalled)` - Check for violations
- `generateCorrectionMessage(issues)` - Create retry prompt

### 3. Dice Engine (`lib/engine/dice-engine.ts`)

Pure TypeScript dice rolling:
- `roll(notation)` - Parse and roll dice notation (e.g., "2d6+3")
- `rollAttack(attacker, target, weapon, bonus)` - Attack rolls with hit/miss
- `rollDamage(dice, type, modifier, isCritical)` - Damage calculation
- `rollAbilityCheck(character, ability, skill, dc)` - Skill/ability checks
- `rollSavingThrow(character, ability, dc)` - Saving throws
- `rollInitiative(combatants)` - Initiative order

### 4. Combat Engine (`lib/engine/combat-engine.ts`)

Combat state management:
- `startCombat(params)` - Initialize combat with initiative
- `nextTurn(combat)` - Advance to next combatant
- `applyDamage(combat, targetId, damage)` - HP tracking
- `applyHealing(combat, targetId, amount)` - Healing
- `addCondition(combat, targetId, condition)` - Status effects
- `endCombat(combat, outcome)` - Conclude combat, award XP

### 5. Function Executor (`lib/ai/function-executor.ts`)

Bridges AI function calls to game engines:
- Parses function call syntax from AI text
- Executes against appropriate engine
- Returns structured results
- Updates character/combat state

## Data Flow

### Player Action Flow

```
1. Player types: "I search the room"
   ↓
2. POST /api/adventure/action
   ↓
3. Load campaign, characters, game state from DB
   ↓
4. Orchestrator.processAction()
   ├── State Guardian injects context
   ├── Determine roll needed (Investigation check)
   ├── Execute roll via Dice Engine
   ├── Build prompt with roll results
   ├── Send to AI
   ├── Parse response, strip any function calls
   ├── Validate response
   └── Return narrative + results
   ↓
5. Update DB (messages, state changes)
   ↓
6. Return to client: { narrative, diceRolls, gameState }
```

### Campaign Start Flow

```
1. User clicks "Play" on campaign
   ↓
2. Adventure page loads
   ↓
3. Check if campaign has characters
   ├── NO: Show "Create character first" message
   └── YES: Continue
   ↓
4. Check if campaign has existing messages
   ├── YES: Load existing conversation
   └── NO: Generate intro
   ↓
5. POST /api/adventure/intro
   ├── Orchestrator.generateCampaignIntro()
   ├── Rich narrative with world, characters, hook
   └── Store in recentMessages
   ↓
6. Display intro, await player action
```

## Database Schema

### Campaign
- `id` - UUID primary key
- `name` - Campaign name
- `description` - Setting description (used for world building)
- `createdAt`, `updatedAt` - Timestamps

### Character  
- `id` - UUID primary key
- `campaignId` - Foreign key to Campaign
- `name`, `race`, `className`, `level`
- Ability scores: `strength`, `dexterity`, etc.
- Combat stats: `maxHp`, `currentHp`, `armorClass`, etc.
- JSON fields: `savingThrowProficiencies`, `skillProficiencies`, `conditions`, etc.

### GameState
- `id` - UUID primary key  
- `campaignId` - Unique foreign key to Campaign
- `mode` - 'exploration' | 'combat' | 'social' | 'rest'
- `gameDay`, `gameHour`, `gameMinute` - In-game time
- `activeCombat` - JSON combat state (null when not in combat)
- `recentMessages` - JSON array of conversation history

## API Endpoints

### Adventure
- `POST /api/adventure/action` - Process player action
- `POST /api/adventure/intro` - Generate campaign introduction

### Campaign
- `GET /api/campaign` - List campaigns
- `POST /api/campaign` - Create campaign
- `GET /api/campaign/[id]` - Get campaign details
- `PUT /api/campaign/[id]` - Update campaign
- `DELETE /api/campaign/[id]` - Delete campaign

### Character
- `GET /api/character?campaignId=X` - List characters
- `POST /api/character` - Create character
- `GET /api/character/[id]` - Get character
- `PUT /api/character/[id]` - Update character
- `DELETE /api/character/[id]` - Delete character

### Combat
- `POST /api/combat/start` - Initialize combat
- `POST /api/combat/turn` - Advance turn
- `POST /api/combat/end` - End combat

### Rules
- `GET /api/rules/monster/[name]` - Monster lookup
- `GET /api/rules/spell/[name]` - Spell lookup
- `GET /api/rules/condition/[name]` - Condition lookup

## AI Integration

### Providers
1. **Vertex AI** (Primary) - Google's Gemini API
2. **OpenRouter** (Fallback) - Uses Kimi K2 model

### System Prompt Structure
The DM system prompt (`lib/ai/system-prompt.ts`) contains:
1. Role definition - What the AI does and doesn't do
2. Golden rules - Never mention mechanics
3. Narrative style guide - Sensory details, pacing
4. Combat narration examples
5. Good vs bad examples

### Context Injection
Every AI call includes:
- Campaign name and description
- Party status (HP, conditions)
- Recent conversation history
- Combat state (if in combat)
- Roll results (if action required roll)

## Testing

### Unit Tests (Vitest)
- `dice-engine.test.ts` - Dice mechanics
- `combat-engine.test.ts` - Combat management

### E2E Tests (Playwright)
- `comprehensive-audit.spec.ts` - Full system audit
- API endpoint tests
- UI flow tests

Run tests:
```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
```

## Key Design Decisions

### 1. Portable Core
All game logic in `lib/engine/` has zero Next.js dependencies. This enables future React Native migration.

### 2. AI Never Rolls
The system pre-determines what rolls are needed, executes them, then asks AI to narrate results. This prevents hallucinated outcomes.

### 3. State Guardian
Post-response validation catches when AI mentions attacks/damage without proper rolls. Currently logs warnings; can be extended to force retries.

### 4. JSON Storage
Complex game state (combat, inventory, conditions) stored as JSON in SQLite. Enables flexible schema evolution.

### 5. Campaign Intro Generation
Rich introductions are generated AFTER character creation, weaving backstories into the world narrative.

## Common Issues

### AI Mentions Dice/Numbers
- Check system prompt emphasis
- Verify context injection includes roll results
- Check narrative cleaning in orchestrator

### Rolls Not Happening
- Check `determineRollNeeded()` in orchestrator
- Verify function executor is processing calls
- Check dice engine is being invoked

### State Out of Sync
- Always derive state from database
- Use transactions for multi-step updates
- Re-inject combat state every turn

## Future Improvements

1. **Streaming Responses** - SSE for long AI responses
2. **Native Function Calling** - Use Gemini's function calling vs text parsing
3. **Mini-map System** - Spatial positioning for combat
4. **Voice Input/Output** - Accessibility
5. **Mobile App** - React Native with shared core
