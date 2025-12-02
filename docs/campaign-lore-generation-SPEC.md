# Campaign World Lore Generation System - Complete Specification

## 1. Executive Summary

This document specifies the complete implementation of an asynchronous, background-running world lore generation system for the Arcane Gamemaster TTRPG AI companion. When a player finishes describing their campaign setting, the system automatically generates rich world details—conflicts, NPCs with motivations and personalities, deep lore, geography, factions, and narrative hooks—all stored in a campaign-specific database and intelligently injected into the AI context during gameplay.

---

## 2. Requirements Overview

### 2.1 Functional Requirements

#### Lore Generation Trigger
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Auto-trigger when campaign description >= 50 characters | HIGH |
| FR-002 | Provide manual "Regenerate Lore" endpoint | MEDIUM |
| FR-003 | Prevent duplicate generation for same campaign | HIGH |
| FR-004 | Async generation without blocking user | HIGH |

#### Lore Content Generation
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | Generate world foundation (name, tone, themes, cosmology, history) | HIGH |
| FR-011 | Generate 5-8 factions with goals, methods, relationships | HIGH |
| FR-012 | Generate 10-15 NPCs with personalities, motivations, relationships | HIGH |
| FR-013 | Generate 4-6 conflicts with participants, stakes, resolutions | HIGH |
| FR-014 | Generate 10-15 locations with descriptions, atmosphere, connections | HIGH |
| FR-015 | Generate 8-12 secrets with hints and discovery conditions | HIGH |
| FR-016 | Cross-reference elements between phases | MEDIUM |
| FR-017 | Integrate player character backstories | MEDIUM |

#### Context Injection
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | Inject relevant lore into AI context during gameplay | HIGH |
| FR-031 | Prioritize by current location and recent mentions | HIGH |
| FR-032 | Respect token budget | HIGH |
| FR-033 | Tiered injection (always-present, situational, on-demand) | MEDIUM |
| FR-034 | AI functions: recall_lore, reveal_secret, introduce_npc | MEDIUM |

### 2.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | Generation completes within 60 seconds | MEDIUM |
| NFR-002 | Context injection < 200ms | HIGH |
| NFR-010 | Idempotent operations | HIGH |
| NFR-011 | Graceful failure with retry logic | HIGH |
| NFR-020 | Strict campaign isolation | HIGH |
| NFR-022 | Cascade delete on campaign removal | HIGH |

---

## 3. Architecture

### 3.1 System Flow

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

┌──────────────────────────────────────────────────────────────────────────────┐
│                        GAMEPLAY CONTEXT INJECTION                              │
│                                                                                │
│  Player action ──→ StateGuardian.generateContextInjection()                   │
│                              │                                                 │
│                              ▼                                                 │
│                    LoreContextManager.getRelevantLore()                       │
│                              │                                                 │
│                    ┌─────────┴─────────┐                                      │
│                    ▼                   ▼                                      │
│            relevance scoring    token budget                                  │
│            (location, NPCs,     management                                    │
│             active conflicts)   (prioritize essential)                        │
│                    │                   │                                      │
│                    └─────────┬─────────┘                                      │
│                              ▼                                                 │
│                    Tiered Lore Injection:                                     │
│                    • Tier 1: Always (world name, tone, active quest)          │
│                    • Tier 2: Location-relevant (nearby NPCs, local conflicts) │
│                    • Tier 3: On-demand (via recall_lore function)             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Design Principles

1. **Non-blocking Generation**: Players can immediately start playing while generation completes
2. **Idempotent Operations**: Multiple triggers for same campaign return existing job
3. **Progressive Enhancement**: Partial results available as phases complete
4. **Token Budget Awareness**: Relevance scoring determines which lore to include
5. **Campaign Isolation**: All lore strictly scoped to its campaign

---

## 4. Database Schema

### 4.1 Prisma Models

```prisma
model CampaignLore {
  id                String   @id @default(uuid())
  campaignId        String   @unique
  campaign          Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  // Generation status
  generationStatus  String   @default("pending") // pending, generating, completed, failed
  generationPhase   String?  // current phase being generated
  generationError   String?
  startedAt         DateTime?
  completedAt       DateTime?
  
  // Core lore (JSON strings for SQLite)
  worldName         String?
  tone              String?  // dark, heroic, comedic, etc.
  themes            String   @default("[]")
  cosmology         String   @default("{}")
  worldHistory      String   @default("[]")
  
  // Relational data
  npcs              LoreNpc[]
  factions          LoreFaction[]
  locations         LoreLocation[]
  conflicts         LoreConflict[]
  secrets           LoreSecret[]
  
  @@index([generationStatus])
}

model LoreNpc {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(...)
  
  name            String
  role            String       // innkeeper, villain, mentor, quest_giver
  importance      String       @default("minor") // major, supporting, minor
  personality     String       @default("{}") // {traits, ideals, bonds, flaws}
  speakingStyle   String?
  quirks          String       @default("[]")
  publicGoal      String?
  secretGoal      String?
  fears           String       @default("[]")
  relationships   String       @default("[]") // [{npcId, relationship, description}]
  factionId       String?
  primaryLocation String?
  race            String?
  appearance      String?
  isRevealed      Boolean      @default(false)
  playerRelation  String?      // friendly, neutral, hostile, unknown
  
  @@index([campaignLoreId])
  @@index([importance])
}

model LoreFaction {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(...)
  
  name            String
  type            String       // guild, religion, government, criminal, military
  importance      String       @default("minor")
  publicImage     String?
  secretNature    String?
  symbol          String?
  motto           String?
  goals           String       @default("[]")
  methods         String       @default("[]")
  resources       String       @default("[]")
  allies          String       @default("[]")
  enemies         String       @default("[]")
  headquarters    String?
  territory       String       @default("[]")
  influence       Int          @default(5) // 1-10
  playerStanding  String?
  
  @@index([campaignLoreId])
}

model LoreLocation {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(...)
  
  name            String
  locationType    String       // city, town, village, dungeon, wilderness, landmark
  importance      String       @default("minor")
  description     String?
  atmosphere      String?
  sensoryDetails  String       @default("{}") // {sights, sounds, smells}
  region          String?
  terrain         String?
  climate         String?
  connectedTo     String       @default("[]") // [{locationId, direction, travelTime}]
  historicalNote  String?
  currentEvents   String       @default("[]")
  population      String?
  notableNpcs     String       @default("[]")
  factionPresence String       @default("[]")
  hiddenSecrets   String       @default("[]")
  isDiscovered    Boolean      @default(false)
  
  @@index([campaignLoreId])
  @@index([region])
}

model LoreConflict {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(...)
  
  name            String
  type            String       // war, political, personal, ideological, economic, supernatural
  scope           String       @default("regional") // local, regional, world
  importance      String       @default("supporting")
  participants    String       @default("[]") // [{type, id, role}]
  stakes          String?
  publicKnowledge String?
  trueNature      String?
  currentState    String       @default("brewing") // brewing, active, climax, resolved
  recentEvents    String       @default("[]")
  possibleOutcomes String      @default("[]")
  playerInfluence  String?
  isRevealed      Boolean      @default(false)
  playerStance    String?
  
  @@index([campaignLoreId])
  @@index([currentState])
}

model LoreSecret {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(...)
  
  name            String
  type            String       // plot_twist, hidden_identity, forbidden_knowledge, treasure, betrayal
  importance      String       @default("supporting")
  content         String
  hints           String       @default("[]")
  relatedNpcs     String       @default("[]")
  relatedFactions String       @default("[]")
  relatedLocations String      @default("[]")
  discoveryConditions String   @default("[]")
  revealImpact    String?
  isRevealed      Boolean      @default(false)
  partiallyKnown  String       @default("[]")
  
  @@index([campaignLoreId])
  @@index([isRevealed])
}
```

### 4.2 Schema Rationale

**Why separate models instead of JSON blobs?**
During gameplay, we need multi-dimensional queries:
- "Which NPCs are at this location?"
- "What conflicts involve this faction?"
- "What secrets can be discovered here?"

**Why `importance` field everywhere?**
Token budget management. Prioritize `major` over `minor` when limited.

**Why `isRevealed` tracking?**
AI needs to know what players have encountered to avoid spoilers.

---

## 5. Implementation Files

### 5.1 File Structure

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

### 5.2 LoreGenerationQueue

Key responsibilities:
- **Enqueue**: Create/check CampaignLore record, prevent duplicates
- **ClaimNextJob**: Atomic claim with race condition handling
- **Status Management**: Track pending/generating/completed/failed
- **Stale Job Recovery**: Reset jobs stuck > 10 minutes

```typescript
// Atomic job claim to prevent race conditions
const result = await prisma.campaignLore.updateMany({
  where: {
    campaignId: job.campaignId,
    generationStatus: 'pending'  // Race condition guard
  },
  data: {
    generationStatus: 'generating',
    startedAt: new Date()
  }
});
// Only one worker succeeds (result.count === 1)
```

### 5.3 LoreGenerationService

**Generation Phases** (each builds on previous):

| Phase | Output | Dependencies |
|-------|--------|--------------|
| 1. World Foundation | worldName, tone, themes, cosmology, history | Campaign description |
| 2. Factions | 5-8 factions with relationships | Phase 1 |
| 3. NPCs | 10-15 NPCs tied to factions | Phases 1-2 |
| 4. Conflicts | 4-6 conflicts with participants | Phases 1-3 |
| 5. Geography | 10-15 locations with connections | Phases 1-4 |
| 6. Secrets | 8-12 secrets with discovery conditions | All previous |

**Phase Skip Logic**: Check if data exists before regenerating (preserves partial progress on retry).

### 5.4 LoreContextManager

**Tiered Injection Model**:
- **Tier 1 (Always ~100-150 tokens)**: World name, tone, current location, main conflict
- **Tier 2 (Situational ~200-400 tokens)**: NPCs at location, local conflicts, recent mentions
- **Tier 3 (On-demand via functions)**: Deep history, distant locations, unrevealed secrets

**Relevance Scoring**:
- At current location: +10 points
- Recently mentioned: +8 points
- Major importance: +5 points
- Already revealed: +2 points

---

## 6. AI Functions

| Function | Purpose |
|----------|---------|
| `recall_lore(topic, type?)` | Query world lore database |
| `reveal_secret(secret_name, context)` | Mark secret revealed, return content |
| `introduce_npc(npc_name, type)` | Mark NPC revealed, return details |
| `discover_location(location_name, method)` | Mark location discovered |

---

## 7. Acceptance Criteria

### AC-001: Automatic Generation
**Given** user creates campaign with description >= 50 chars
**When** campaign is saved
**Then** lore generation begins automatically AND user can access campaign immediately

### AC-002: Generation Completion
**Given** generation started
**When** all 6 phases complete
**Then** status = "completed" AND all categories have content

### AC-003: Context Injection
**Given** completed lore AND player at specific location
**When** player takes action
**Then** AI context includes relevant NPCs, conflicts, atmosphere

### AC-004: Partial Failure Recovery
**Given** phases 1-3 complete, phase 4 fails
**Then** phases 1-3 data preserved AND regeneration skips completed phases

### AC-005: Idempotent Triggering
**Given** generation in progress for campaign X
**When** another request triggers for X
**Then** no duplicate generation, existing job continues

---

## 8. Out of Scope

- Visual map generation
- NPC portrait/image generation
- Voice lines or audio content
- Real-time collaborative lore editing
- Import from external world-building tools
- Lore version history/rollback
