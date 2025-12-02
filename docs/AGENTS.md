# AGENTS.md - Arcane Gamemaster Quick Reference

## Commands
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production (ALWAYS run before committing)
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npx prisma studio    # View/edit database
npx prisma db push   # Apply schema changes
npx tsc --noEmit     # Type check only
```

---

## Core Philosophy

**Zero Player Overhead** - The AI handles storytelling, code handles ALL mechanics.

**THE AI NEVER ROLLS DICE OR CALCULATES MECHANICS** - The system:
1. Determines what rolls are needed
2. Executes rolls via dice engine
3. Provides results to AI
4. AI narrates WITHOUT mentioning mechanics

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

## Theme Colors (Tailwind)
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

## Git Workflow

```bash
# Daily flow
git pull origin main
npm run build && npm run test    # Verify before committing
git add -A && git commit -m "type: description"
git push origin main

# Commit types: feat, fix, refactor, docs, style, test, chore
```

**Never commit**: `.env`, `node_modules/`, `.next/`, `prisma/*.db`

---

## Common Pitfalls

1. **Set/Map iteration** - Use `Array.from()` instead of spread operator
2. **JSON fields** - Parse with `JSON.parse()` when reading from DB
3. **AI mentions dice** - Check system-prompt.ts and context injection
4. **Inventory not updating** - Verify API route persists changes

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Full system architecture & development guide
- **[HANDOFF.md](./HANDOFF.md)** - Comprehensive project state & implementation details
- **[SPEC_AUDIT.md](./SPEC_AUDIT.md)** - Feature completion checklist
