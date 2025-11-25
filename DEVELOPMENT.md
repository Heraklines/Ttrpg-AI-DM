# Arcane Gamemaster - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

Create `.env` file:

```env
# AI Providers (at least one required)
VERTEX_AI_API_KEY=your_vertex_ai_key
OPENROUTER_API_KEY=your_openrouter_key

# Database (optional, defaults to file:./dev.db)
DATABASE_URL="file:./dev.db"
```

## Development Workflow

### 1. Creating a Campaign
1. Go to `/campaigns`
2. Click "Create New Campaign"
3. Enter name and description (description shapes the world!)

### 2. Creating a Character
1. Open campaign
2. Click "Add Character"
3. Complete 5-step wizard:
   - Basics (name, race, class)
   - Abilities (point buy)
   - Skills (proficiencies)
   - Details (backstory)
   - Review

### 3. Playing Adventure
1. Click "Play" on campaign
2. System generates intro (if first time with characters)
3. Type actions in chat
4. System handles dice automatically

## Code Conventions

### TypeScript
- Strict mode enabled
- All game types in `lib/engine/types.ts`
- Zod for runtime validation

### React Components
- Functional components with hooks
- 'use client' directive for client components
- Tailwind CSS for styling

### API Routes
- Zod validation on all inputs
- Structured error responses
- JSON responses with `{ data }` or `{ error }`

### Game Engines
- Pure TypeScript, no framework deps
- Immutable updates (return new objects)
- Comprehensive test coverage

## Adding New Features

### New Dice Roll Type
1. Add result interface to `types.ts`
2. Add method to `DiceEngine`
3. Add test cases
4. Add function to `function-registry.ts`
5. Add executor case to `function-executor.ts`

### New API Endpoint
1. Create route file in `app/api/`
2. Define Zod schema for input
3. Implement handler with error handling
4. Add to documentation

### New UI Component
1. Create in `components/`
2. Use Tailwind with theme colors
3. Handle loading/error states
4. Make responsive

## Theme Colors

```css
/* In Tailwind config */
primary: '#C4A35A'      /* Aged gold */
secondary: '#6B1C23'    /* Deep burgundy */
tertiary: '#1E4D6B'     /* Mystical blue */
background: '#1A1714'   /* Dark wood */
surface: '#2D241E'      /* Medium wood */
parchment: '#F4E4BC'    /* Text color */
ember: '#CF6679'        /* Error/danger */
forest: '#4CAF50'       /* Success */
amber: '#FFC107'        /* Warning */
```

## Testing

### Unit Tests
```bash
npm run test           # Run all
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

### E2E Tests
```bash
npm run test:e2e       # Run Playwright tests
npm run test:e2e:ui    # With Playwright UI
```

### Manual Testing Checklist
- [ ] Create campaign
- [ ] Create character (all steps)
- [ ] Start adventure (intro generates)
- [ ] Take exploration action
- [ ] Dice roll happens automatically
- [ ] Narrative doesn't mention mechanics
- [ ] Combat (if testing combat)

## Debugging

### AI Issues
Enable debug logging:
```typescript
// In orchestrator.ts
console.log('AI Prompt:', fullPrompt);
console.log('AI Response:', aiResponse);
console.log('Function Calls:', functionCalls);
```

### Database Issues
```bash
# View database
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

### Build Issues
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Common Tasks

### Reset All Data
```bash
rm prisma/dev.db
npx prisma db push
```

### Update AI Prompt
Edit `lib/ai/system-prompt.ts` - changes apply immediately.

### Add Monster/Spell
- Monsters: Fetched from D&D 5e API, cached in `MonsterCache`
- Spells: Fetched from D&D 5e API, cached in `SpellCache`

### Modify Combat Flow
1. Update `combat-engine.ts` methods
2. Update `function-executor.ts` cases
3. Update combat overlay UI if needed

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Docker
```dockerfile
# Dockerfile example
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

## Troubleshooting

### "No characters" on adventure start
- Character creation must complete all steps
- Check character was saved to database

### AI mentions dice/rolls
- Check system prompt in `system-prompt.ts`
- Verify roll results are in context
- Check `cleanNarrative()` in orchestrator

### Combat not starting
- Verify `start_combat` function is called
- Check combat state is saved to `activeCombat`
- Verify mode changes to 'combat'

### Slow AI responses
- Vertex AI: 2-5 seconds typical
- OpenRouter: 3-10 seconds typical
- Consider streaming for long responses
