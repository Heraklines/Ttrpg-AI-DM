# WORLD LORE EXPLORER - Implementation Handoff

## Executive Summary

This document specifies the complete implementation of an interactive World Lore Explorer system for Arcane Gamemaster. The system combines procedural map generation, AI-driven world building with enforced narrative coherence, and a hybrid Codex+Map UI for exploring interconnected lore.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Map Generation System](#3-map-generation-system)
4. [AI Generation Pipeline](#4-ai-generation-pipeline)
5. [UI Components](#5-ui-components)
6. [Implementation Tasks](#6-implementation-tasks)
7. [Dependencies & Resources](#7-dependencies--resources)

---

## 1. Architecture Overview

### Core Philosophy: Tension-First Generation

Everything flows from **Core Tensions** - the fundamental conflicts that define the world. This ensures all generated content is interconnected, not random fantasy noise.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GENERATION CASCADE MODEL                                  │
│                                                                              │
│  LAYER 0: SEEDS (User input → AI extraction)                                │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ Campaign Description → Extract:                              │            │
│  │  • 2-3 Core Tensions (what's fundamentally in conflict?)    │            │
│  │  • Tone/Genre (dark, heroic, intrigue, comedic)             │            │
│  │  • Scale (local, regional, continental, planar)             │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              ▼                                               │
│  LAYER 1: FOUNDATIONS (Each MUST reference seeds)                           │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ • Cosmology (gods embody/take sides in tensions)            │            │
│  │ • Geography (terrain shapes how conflict plays out)         │            │
│  │ • Ancient History (origin stories of the tensions)          │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              ▼                                               │
│  LAYER 2: ACTORS (Exist BECAUSE of Layer 1)                                 │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ • Factions (organizations that take sides)                  │            │
│  │ • Nations (geographic + political entities)                 │            │
│  │ • Major NPCs (leaders who personify faction goals)          │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              ▼                                               │
│  LAYER 3: CONSEQUENCES (Emerge from Layer 2 interactions)                   │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ • Active Conflicts (factions clashing over tensions)        │            │
│  │ • Locations (where conflicts manifest, shaped by geography) │            │
│  │ • Secrets (hidden truths that would change everything)      │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              ▼                                               │
│  LAYER 4: ON-DEMAND (Generated during gameplay)                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │ • Minor NPCs, local details, specific loot, rumors          │            │
│  │ • Expanded only when players approach/ask                   │            │
│  └─────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                                  │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   MAP ENGINE     │    │  LORE GENERATOR  │    │   LORE EXPLORER  │      │
│  │                  │    │                  │    │       UI         │      │
│  │ • Azgaar core    │◄──►│ • Seed extractor │◄──►│ • Map view       │      │
│  │ • Terrain gen    │    │ • Cascade phases │    │ • Codex view     │      │
│  │ • SVG renderer   │    │ • Coherence check│    │ • Relationship   │      │
│  │ • Interaction    │    │ • JSON schemas   │    │   graph          │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                                   ▼                                         │
│                    ┌──────────────────────────┐                             │
│                    │      DATABASE            │                             │
│                    │  • WorldSeed             │                             │
│                    │  • Geography/Cosmology   │                             │
│                    │  • Factions/NPCs         │                             │
│                    │  • Locations/Conflicts   │                             │
│                    │  • Relationships         │                             │
│                    │  • Discovery State       │                             │
│                    └──────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Core Tables

#### WorldSeed (Root entity, 1:1 with Campaign)

```prisma
model WorldSeed {
  id              String   @id @default(uuid())
  campaignId      String   @unique
  campaign        Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  // Core identity
  name            String                    // World name
  tone            String                    // dark, heroic, intrigue, comedic, epic
  scale           String   @default("regional")  // local, regional, continental, planar
  themes          String   @default("[]")   // JSON array of thematic elements
  
  // THE KEY FIELD - everything derives from this
  coreTensions    String   @default("[]")   // JSON: [{name, description, sides: [{name, stance}]}]
  
  creationMyth    String?                   // Optional origin story
  
  // Generation tracking
  generationStatus String  @default("pending")
  currentPhase    String?
  generationError String?
  
  // Relations
  geography       WorldGeography?
  cosmology       WorldCosmology?
  history         WorldHistory?
  factions        Faction[]
  locations       Location[]
  npcs            Npc[]
  conflicts       Conflict[]
  secrets         Secret[]
  relationships   Relationship[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### WorldGeography
```prisma
model WorldGeography {
  id              String    @id @default(uuid())
  worldSeedId     String    @unique
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  // Procedural generation (Azgaar-compatible)
  heightmapSeed   Int                       // For reproducible generation
  mapSettings     String    @default("{}")  // Generation parameters JSON
  mapData         String?                   // Full map state (compressed JSON)
  svgCache        String?                   // Pre-rendered SVG
  
  // AI-named geographic features
  continents      String    @default("[]")  // JSON: [{name, description, climate, bounds}]
  oceans          String    @default("[]")  // JSON: [{name, description}]
  majorRegions    String    @default("[]")  // JSON: [{name, terrain, description}]
  
  // Special geography
  naturalLaws     String    @default("{}")  // Deviations from real physics
  magicGeography  String    @default("[]")  // Ley lines, dead zones, wild magic
  
  updatedAt       DateTime  @updatedAt
}
```

#### WorldCosmology
```prisma
model WorldCosmology {
  id              String    @id @default(uuid())
  worldSeedId     String    @unique
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  planarStructure String    @default("{}")  // How planes connect
  magicSystem     String    @default("{}")  // {source, rules, limitations, costs}
  
  // Pantheon - gods MUST align with tensions
  pantheon        String    @default("[]")  // JSON: [{name, domain, alignment, tensionStance}]
  
  creationStory   String?
  prophecies      String    @default("[]")  // [{content, relatedTensions, fulfilled}]
  afterlife       String    @default("{}")
  
  updatedAt       DateTime  @updatedAt
}
```

#### WorldHistory
```prisma
model WorldHistory {
  id              String    @id @default(uuid())
  worldSeedId     String    @unique
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  eras            String    @default("[]")  // [{name, yearsAgo, duration, description}]
  majorEvents     String    @default("[]")  // [{name, era, consequences, tensionsInvolved}]
  
  // Unreliable narrator system
  writtenBy       String    @default("[]")  // [{culture, bias, whatsHidden}]
  lostKnowledge   String    @default("[]")  // [{topic, truth, discoveryConditions}]
  
  updatedAt       DateTime  @updatedAt
}
```

### 2.2 Actor Tables

#### Faction
```prisma
model Faction {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  tier            String    @default("supporting")  // major, supporting, minor, stub
  
  name            String
  type            String    // guild, religion, government, criminal, military, merchant
  philosophy      String    // Core belief/motivation
  
  // CRITICAL: Links to tensions
  tensionStances  String    @default("[]")  // [{tensionName, stance, publicVsPrivate}]
  
  // Structure
  leadership      String    @default("{}")  // {type, currentLeader, succession}
  ranks           String    @default("[]")
  membership      String    @default("{}")  // {requirements, size, demographics}
  
  // Assets
  resources       String    @default("[]")
  territory       String    @default("[]")  // [{locationId, controlLevel}]
  factionSecrets  String    @default("[]")
  
  // Public face
  publicImage     String?
  symbol          String?
  motto           String?
  influence       Int       @default(5)     // 1-10 scale
  
  // Discovery
  isDiscovered    Boolean   @default(false)
  discoveredAt    DateTime?
  
  // Relations
  members         Npc[]
  
  @@index([worldSeedId])
  @@index([tier])
}
```

#### Npc
```prisma
model Npc {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  tier            String    @default("minor")  // major, supporting, minor, stub
  
  // Identity
  name            String
  race            String
  occupation      String
  age             String?   // young, middle-aged, elderly, ancient
  appearance      String?
  
  // Personality (for AI roleplay)
  personality     String    @default("{}")  // {traits[], ideals[], bonds[], flaws[]}
  speakingStyle   String?
  mannerisms      String    @default("[]")
  
  // Motivations - MUST link to tensions
  publicGoal      String?
  privateGoal     String?
  fears           String    @default("[]")
  tensionRole     String    @default("[]")  // [{tensionName, role, commitment}]
  
  // Connections
  factionId       String?
  faction         Faction?  @relation(fields: [factionId], references: [id])
  factionRank     String?
  primaryLocationId String?
  
  // For AI interaction
  knowledgeScope  String    @default("{}")  // {knows[], suspects[], ignorantOf[]}
  defaultAttitude String    @default("neutral")
  
  // Secrets
  npcSecrets      String    @default("[]")
  hiddenIdentity  String?   // JSON: {trueIdentity, revealTrigger}
  
  // Discovery
  isDiscovered    Boolean   @default(false)
  relationshipLevel String  @default("unknown")  // unknown, met, acquaintance, familiar
  
  @@index([worldSeedId])
  @@index([factionId])
  @@index([tier])
}
```

#### Location
```prisma
model Location {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  tier            String    @default("minor")
  type            String    // continent, nation, region, city, town, landmark, dungeon
  
  // Hierarchy
  parentId        String?
  parent          Location? @relation("LocationHierarchy", fields: [parentId], references: [id])
  children        Location[] @relation("LocationHierarchy")
  
  // Map integration
  mapCoordinates  String    @default("{}")  // {x, y, bounds}
  terrain         String?
  climate         String?
  size            String?   // For settlements
  
  // Description
  name            String
  description     String?
  atmosphere      String?
  sensoryDetails  String    @default("{}")  // {sights, sounds, smells}
  
  // Political
  controllingFactionId String?
  contestedBy     String    @default("[]")
  population      String    @default("{}")
  economy         String    @default("{}")
  
  // Narrative
  landmarks       String    @default("[]")
  currentEvents   String    @default("[]")
  rumors          String    @default("[]")
  locationSecrets String    @default("[]")
  
  // Discovery
  isDiscovered    Boolean   @default(false)
  explorationLevel String   @default("unknown")  // unknown, heard-of, visited, mapped
  
  @@index([worldSeedId])
  @@index([parentId])
  @@index([type])
}
```


### 2.3 Relationship & Conflict Tables

#### Relationship (First-class entity)
```prisma
model Relationship {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  // Polymorphic endpoints
  sourceType      String    // npc, faction, location, deity
  sourceId        String
  targetType      String
  targetId        String
  
  // Nature
  type            String    // ally, enemy, rival, servant, lover, family, trade_partner
  strength        Int       @default(5)  // 1-10
  isPublic        Boolean   @default(true)
  
  // Context
  description     String?
  history         String?   // How formed
  instability     String?   // What could break it
  
  // Discovery
  isDiscovered    Boolean   @default(false)
  
  @@index([worldSeedId])
  @@index([sourceType, sourceId])
  @@index([targetType, targetId])
}
```

#### Conflict
```prisma
model Conflict {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  tier            String    @default("supporting")
  
  name            String
  type            String    // war, political, economic, religious, personal, ideological
  scope           String    @default("regional")
  status          String    @default("brewing")  // brewing, active, climax, resolved
  
  // MUST link to tensions
  rootTension     String    // Which core tension this manifests
  triggerEvent    String?
  
  // Participants
  sides           String    @default("[]")  // [{name, factionIds, npcIds, goals}]
  neutrals        String    @default("[]")
  
  // Stakes
  stakes          String?
  publicNarrative String?   // What people think
  trueNature      String?   // Reality (may differ)
  
  // Progression
  timeline        String    @default("[]")  // [{event, date, consequence}]
  currentState    String?
  possibleOutcomes String   @default("[]")
  
  // Player interaction
  playerInfluence String    @default("[]")  // [{action, side, impact}]
  
  // Affected areas
  affectedLocationIds String @default("[]")
  
  // Discovery
  isDiscovered    Boolean   @default(false)
  knowledgeLevel  String    @default("unaware")
  
  @@index([worldSeedId])
  @@index([status])
}
```

#### Secret
```prisma
model Secret {
  id              String    @id @default(uuid())
  worldSeedId     String
  worldSeed       WorldSeed @relation(fields: [worldSeedId], references: [id], onDelete: Cascade)
  
  tier            String    @default("supporting")  // campaign-defining, major, minor
  type            String    // identity, history, prophecy, location, betrayal, conspiracy
  
  name            String    // Internal reference
  content         String    // The actual secret
  implications    String?   // Why it matters
  
  // Tension impact
  tensionImpact   String    @default("[]")  // [{tensionName, howItChanges}]
  
  // Who knows
  knownBy         String    @default("[]")  // [{entityType, entityId, wouldTell}]
  suspectedBy     String    @default("[]")
  
  // Discovery
  hints           String    @default("[]")  // [{hint, whereFound, obviousness}]
  discoveryConditions String @default("[]")
  revealTriggers  String    @default("[]")
  
  // Effects
  onReveal        String    @default("{}")  // {narrative, effects, relationshipChanges}
  
  // State
  isRevealed      Boolean   @default(false)
  partialReveals  String    @default("[]")  // Breadcrumbs found
  revealedAt      DateTime?
  
  @@index([worldSeedId])
  @@index([isRevealed])
}
```

---

## 3. Map Generation System

### 3.1 Recommended Approach: Azgaar Fantasy Map Generator

**Repository:** https://github.com/Azgaar/Fantasy-Map-Generator

**Why Azgaar:**
- Solves geographic realism (rivers flow downhill, cities on coasts/rivers)
- Built for fantasy worlds, not real-world mapping
- JavaScript-based, integrates with Next.js
- Exports to SVG/JSON

### 3.2 Integration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MAP GENERATION PIPELINE                                 │
│                                                                              │
│  1. PROCEDURAL TERRAIN (Azgaar algorithms)                                  │
│     ├── Heightmap generation (Perlin/Simplex noise)                         │
│     ├── Hydraulic erosion → realistic rivers                                │
│     ├── Climate simulation (latitude + elevation)                           │
│     └── Biome placement                                                     │
│                                                                              │
│  2. AI SEMANTIC LAYER (Gemini)                                              │
│     ├── "Given this terrain, where would factions settle?"                  │
│     ├── Names locations based on culture/lore                               │
│     ├── Places faction territories, borders                                 │
│     └── Assigns narrative significance                                      │
│                                                                              │
│  3. VISUAL RENDERING                                                        │
│     ├── SVG generation from Azgaar data                                     │
│     ├── Custom React component for interaction                              │
│     ├── Themed icons (cities, ruins, forests)                               │
│     └── Faction territory overlays                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Azgaar Modules to Extract

| Module | Purpose |
|--------|---------|
| `heightmap.js` | Terrain elevation generation |
| `rivers.js` | Hydrological simulation |
| `biomes.js` | Climate and vegetation |
| `cultures.js` | Cultural region spreading |
| `states.js` | Nation/border generation |
| `routes.js` | Roads and trade paths |
| `markers.js` | City/landmark placement |

### 3.4 Map Data Structure

```typescript
interface MapData {
  seed: number;                    // For reproducibility
  settings: MapSettings;
  heightmap: number[][];           // Elevation grid
  cells: MapCell[];                // Voronoi cells with data
  rivers: River[];
  routes: Route[];
  markers: Marker[];
  
  // Our additions
  factionTerritories: {
    factionId: string;
    cellIds: number[];
    color: string;
  }[];
}

interface MapCell {
  id: number;
  x: number;
  y: number;
  elevation: number;
  biome: string;
  culture?: string;
  state?: string;                  // Nation
  locationId?: string;             // Links to our Location table
}
```

---

## 4. AI Generation Pipeline

### 4.1 Three-Pass Generation Pattern

```typescript
// PASS 1: SKELETON - Extract seeds and high-level structure
const pass1Prompt = `
You are a master worldbuilder. Analyze this campaign and extract its essence.

CAMPAIGN: "${campaignName}"
DESCRIPTION: "${campaignDescription}"

Extract in JSON format:
{
  "coreTensions": [
    {
      "name": "tension name",
      "description": "what's fundamentally in conflict",
      "sides": [
        {"name": "side A", "stance": "their position"},
        {"name": "side B", "stance": "their position"}
      ]
    }
  ],
  "tone": "dark|heroic|intrigue|comedic|epic",
  "scale": "local|regional|continental|planar",
  "themes": ["theme1", "theme2", "theme3"],
  "worldSketch": "200-word overview of the world"
}

Identify 2-3 core tensions that will drive ALL conflict in this world.
`;

// PASS 2: EXPANSION - Generate entities that MUST reference tensions
const pass2FactionPrompt = `
Generate a faction for this world.

WORLD: ${worldName}
CORE TENSIONS:
${tensions.map(t => `- ${t.name}: ${t.description}`).join('\n')}
EXISTING FACTIONS: ${existingFactions.map(f => f.name).join(', ')}

This faction MUST:
1. Have a clear stance on at least one core tension
2. Have a relationship (ally/enemy/rival) with an existing faction
3. Be headquartered in a logical location given the geography

Generate in JSON format:
{
  "name": "...",
  "type": "...",
  "tensionStances": [{"tensionName": "...", "stance": "...", "isPublic": true}],
  "philosophy": "core belief that drives them",
  "relationships": [{"factionName": "...", "type": "ally|enemy|rival", "reason": "..."}],
  ...
}
`;

// PASS 3: COHERENCE CHECK
const pass3CoherencePrompt = `
Review this world bible for coherence.

WORLD SUMMARY:
${worldBibleSummary}

Identify:
1. CONTRADICTIONS: Facts that conflict with each other
2. MISSING LINKS: Obvious connections not established
3. DEAD ENDS: Entities with no relationships
4. SECRET OPPORTUNITIES: Places where hidden connections would add depth

Return JSON:
{
  "contradictions": [{"issue": "...", "fix": "..."}],
  "missingLinks": [{"from": "...", "to": "...", "suggestedRelationship": "..."}],
  "deadEnds": [{"entity": "...", "suggestion": "..."}],
  "secretOpportunities": [{"secret": "...", "involves": [...], "impact": "..."}]
}
`;
```

### 4.2 Generation Budget System

```typescript
interface GenerationBudget {
  // Hard limits per tier
  major: { factions: 3, npcs: 5, locations: 5, conflicts: 2, secrets: 3 };
  supporting: { factions: 5, npcs: 10, locations: 10, conflicts: 4, secrets: 6 };
  minor: { factions: 0, npcs: 0, locations: 0, conflicts: 0, secrets: 3 };  // Stubs only
  
  // Depth control
  maxGenerationDepth: 3;        // Layers from seed
  relevanceThreshold: 0.3;     // Don't expand if connection score < 0.3
  
  // When to stop
  totalTokenBudget: 50000;     // Approximate generation limit
}

// Tier assignment rules
function assignTier(entity: Entity, context: GenerationContext): Tier {
  // Major: Directly connected to core tensions
  if (entity.tensionStances.some(ts => ts.commitment === 'defining')) return 'major';
  
  // Supporting: Connected to major entities
  if (entity.relationships.some(r => getMajorEntities().includes(r.targetId))) return 'supporting';
  
  // Minor: Everything else (generated as stubs, expanded on-demand)
  return 'minor';
}
```

### 4.3 Expand-on-Demand Pattern

```typescript
// Stubs are minimal placeholders
interface StubEntity {
  id: string;
  name: string;
  type: string;
  tier: 'stub';
  teaser: string;           // One-sentence hook
  connections: string[];    // IDs of related entities
  expandable: true;
}

// When player approaches a stub, expand it
async function expandStub(stubId: string, context: GameContext): Promise<Entity> {
  const stub = await getStub(stubId);
  const relatedEntities = await getEntities(stub.connections);
  
  const prompt = `
    Expand this stub into a full entity.
    
    STUB: ${stub.name} - ${stub.teaser}
    CONNECTED TO: ${relatedEntities.map(e => `${e.name} (${e.type})`).join(', ')}
    CURRENT PLAYER LOCATION: ${context.location}
    RELEVANT TENSIONS: ${context.relevantTensions}
    
    Generate full details that:
    1. Honor the teaser description
    2. Connect meaningfully to related entities
    3. Are relevant to where players currently are
  `;
  
  const expanded = await generateWithGemini(prompt);
  await updateEntityFromStub(stubId, expanded);
  return expanded;
}
```


---

## 5. UI Components

### 5.1 Lore Explorer Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                      │
│  [World: Elarion]              [🔍 Search...]           [👁️ Player] [📖 DM] │
└─────────────────────────────────────────────────────────────────────────────┘
┌────────────────────┬────────────────────────────────────────────────────────┐
│                    │                                                         │
│  NAVIGATION        │                    MAIN CONTENT                         │
│  SIDEBAR           │                                                         │
│                    │    ┌─────────────────────────────────────────────┐     │
│  📍 Geography      │    │                                             │     │
│    ├─ Continents   │    │         MAP VIEW or CODEX ENTRY             │     │
│    ├─ Nations      │    │                                             │     │
│    └─ Settlements  │    │                                             │     │
│                    │    │                                             │     │
│  ⚔️ Factions       │    │                                             │     │
│    ├─ Major        │    │                                             │     │
│    └─ Minor        │    │                                             │     │
│                    │    │                                             │     │
│  👤 People         │    └─────────────────────────────────────────────┘     │
│    ├─ Leaders      │                                                         │
│    └─ Notable      │    ┌─────────────────────────────────────────────┐     │
│                    │    │  RELATIONSHIP BAR                           │     │
│  📜 History        │    │  Viewing: [Iron Covenant]                   │     │
│  🔥 Conflicts      │    │  → allies: [Crown] → enemies: [Druids]      │     │
│  ✨ Cosmology      │    └─────────────────────────────────────────────┘     │
│  ─────────────     │                                                         │
│  🔒 Secrets (DM)   │                                                         │
│                    │                                                         │
└────────────────────┴────────────────────────────────────────────────────────┘
```

### 5.2 Component Specifications

#### MapView Component
```typescript
interface MapViewProps {
  worldSeedId: string;
  mode: 'player' | 'dm';
  initialCenter?: { x: number; y: number };
  initialZoom?: number;
  onLocationClick: (locationId: string) => void;
  onRegionHover: (regionId: string | null) => void;
}

// Features:
// - Pan/zoom with mouse/touch
// - Layer toggles: Political, Geographic, Factions, Routes
// - Click location → info card
// - Fog of war for undiscovered areas (player mode)
// - Faction territory overlays with colors
// - Animated route highlighting
```

#### CodexEntry Component
```typescript
interface CodexEntryProps {
  entityType: 'faction' | 'npc' | 'location' | 'conflict' | 'secret';
  entityId: string;
  mode: 'player' | 'dm';
  onNavigate: (entityType: string, entityId: string) => void;
}

// Features:
// - Breadcrumb navigation
// - Hyperlinked references ([Name] style)
// - Inline relationship mini-graph
// - "Show on Map" button for locations
// - Discovery state indicators
// - Collapsible sections
```

#### RelationshipGraph Component
```typescript
interface RelationshipGraphProps {
  centerId: string;
  centerType: string;
  depth: 1 | 2 | 3;  // How many hops to show
  mode: 'player' | 'dm';
  onNodeClick: (entityType: string, entityId: string) => void;
}

// Features:
// - Force-directed graph layout
// - Color-coded relationship types
// - Line thickness = relationship strength
// - Click node to navigate
// - Zoom/pan for large graphs
// - Undiscovered nodes shown as "???"
```

#### TimelineView Component
```typescript
interface TimelineViewProps {
  worldSeedId: string;
  focusEra?: string;
  highlightEvents?: string[];  // Event IDs to highlight
  onEventClick: (eventId: string) => void;
}

// Features:
// - Horizontal scrolling timeline
// - Era groupings
// - Expandable event cards
// - Links to related entities
// - "Now" marker for current events
```

#### SearchInterface Component
```typescript
interface SearchProps {
  worldSeedId: string;
  mode: 'player' | 'dm';
  onResultSelect: (entityType: string, entityId: string) => void;
}

// Search types:
// - Name search: "Aldric" → exact matches
// - Type filter: "faction:military"
// - Relationship: "enemies of Crown"
// - Natural language: "who knows about the prophecy" (AI-powered)
```

### 5.3 Discovery/Fog System

```typescript
interface DiscoveryState {
  entityType: string;
  entityId: string;
  level: 'undiscovered' | 'rumored' | 'known' | 'detailed';
  discoveredAt?: Date;
  knownFacts: string[];     // What player knows
  hiddenFacts: string[];    // What's still hidden
}

// Player view rendering rules:
// - undiscovered: Show as "???" with vague hints
// - rumored: Show name and 1-sentence teaser
// - known: Show basic info, hide secrets
// - detailed: Show most info, some secrets still hidden

// Map fog rules:
// - undiscovered: Fully fogged
// - rumored: Visible outline, no details
// - known: Full visibility
```

---

## 6. Implementation Tasks

### Phase 1: Database & Core Infrastructure (Priority: HIGH)

| Task | Description | Estimate |
|------|-------------|----------|
| 1.1 | Update Prisma schema with new models (WorldSeed, Geography, etc.) | 2h |
| 1.2 | Create database migrations | 1h |
| 1.3 | Build base CRUD services for all new entities | 4h |
| 1.4 | Implement relationship query helpers (get all relationships for entity) | 2h |
| 1.5 | Add discovery state tracking | 2h |

### Phase 2: AI Generation Pipeline (Priority: HIGH)

| Task | Description | Estimate |
|------|-------------|----------|
| 2.1 | Create seed extraction prompt + parser | 3h |
| 2.2 | Implement Pass 1: Skeleton generation | 4h |
| 2.3 | Implement Pass 2: Entity expansion with tension enforcement | 6h |
| 2.4 | Implement Pass 3: Coherence checking | 4h |
| 2.5 | Build generation budget/cutoff system | 3h |
| 2.6 | Implement expand-on-demand for stubs | 3h |
| 2.7 | Create API routes for generation triggers | 2h |

### Phase 3: Map System (Priority: MEDIUM)

| Task | Description | Estimate |
|------|-------------|----------|
| 3.1 | Extract Azgaar core modules into project | 4h |
| 3.2 | Create map generation service wrapper | 4h |
| 3.3 | Build SVG rendering pipeline | 4h |
| 3.4 | Implement MapView React component | 6h |
| 3.5 | Add faction territory overlay system | 3h |
| 3.6 | Implement fog of war rendering | 3h |
| 3.7 | Add location markers and interactions | 3h |

### Phase 4: Lore Explorer UI (Priority: MEDIUM)

| Task | Description | Estimate |
|------|-------------|----------|
| 4.1 | Create LoreExplorer main layout component | 3h |
| 4.2 | Build NavigationSidebar with category tree | 3h |
| 4.3 | Implement CodexEntry component | 4h |
| 4.4 | Build hyperlink navigation system | 2h |
| 4.5 | Create RelationshipGraph component (D3 or similar) | 6h |
| 4.6 | Implement TimelineView component | 4h |
| 4.7 | Build SearchInterface with AI-powered queries | 4h |
| 4.8 | Add player vs DM view toggle | 2h |

### Phase 5: Integration (Priority: MEDIUM)

| Task | Description | Estimate |
|------|-------------|----------|
| 5.1 | Connect lore generation to campaign creation flow | 2h |
| 5.2 | Integrate lore context into AI DM prompts | 3h |
| 5.3 | Add lore functions to AI (recall_lore, introduce_npc, etc.) | 3h |
| 5.4 | Implement discovery updates during gameplay | 3h |
| 5.5 | Add LoreExplorer access from adventure screen | 2h |

### Phase 6: Polish & Testing (Priority: LOW)

| Task | Description | Estimate |
|------|-------------|----------|
| 6.1 | Add loading states and error handling | 3h |
| 6.2 | Implement animations/transitions | 3h |
| 6.3 | Write unit tests for generation logic | 4h |
| 6.4 | Write integration tests for UI components | 4h |
| 6.5 | Performance optimization for large worlds | 4h |

---

## 7. Dependencies & Resources

### NPM Packages to Add

```json
{
  "dependencies": {
    "d3": "^7.x",           // For relationship graphs
    "d3-force": "^3.x",     // Force-directed layouts
    "leaflet": "^1.9.x",    // Optional: Map interactions
    "react-leaflet": "^4.x",
    "simplex-noise": "^4.x", // Terrain generation
    "uuid": "^9.x"          // ID generation
  }
}
```

### External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| Azgaar FMG | github.com/Azgaar/Fantasy-Map-Generator | Map generation algorithms |
| D3 Gallery | observablehq.com/@d3/gallery | Graph visualization examples |
| Gemini API | cloud.google.com/vertex-ai/docs | AI generation |

### File Structure to Create

```
src/
├── lib/
│   ├── world/
│   │   ├── world-seed-service.ts
│   │   ├── generation-pipeline.ts
│   │   ├── coherence-checker.ts
│   │   ├── expansion-service.ts
│   │   └── index.ts
│   ├── map/
│   │   ├── terrain-generator.ts
│   │   ├── map-renderer.ts
│   │   ├── azgaar-adapter.ts
│   │   └── index.ts
│   └── lore/
│       ├── (existing files)
│       └── discovery-service.ts
├── components/
│   └── lore-explorer/
│       ├── LoreExplorer.tsx
│       ├── MapView.tsx
│       ├── CodexEntry.tsx
│       ├── RelationshipGraph.tsx
│       ├── TimelineView.tsx
│       ├── SearchInterface.tsx
│       ├── NavigationSidebar.tsx
│       └── DiscoveryIndicator.tsx
└── app/
    └── campaign/
        └── [id]/
            └── lore/
                └── page.tsx
```

---

## Appendix A: Sample Generation Output

### Example Core Tensions

```json
{
  "coreTensions": [
    {
      "name": "Crown vs Faith",
      "description": "Secular authority clashes with divine mandate",
      "sides": [
        {"name": "Royal Loyalists", "stance": "The crown's law is supreme"},
        {"name": "Temple Faithful", "stance": "Divine law supersedes mortal kings"}
      ]
    },
    {
      "name": "Progress vs Tradition",
      "description": "New magic/technology threatens old ways",
      "sides": [
        {"name": "Innovators", "stance": "Change brings prosperity"},
        {"name": "Preservers", "stance": "Ancient wisdom must be protected"}
      ]
    }
  ]
}
```

### Example Faction with Enforced Connections

```json
{
  "name": "The Artificers' Compact",
  "type": "guild",
  "tier": "major",
  "tensionStances": [
    {"tensionName": "Crown vs Faith", "stance": "Support Crown (secular patron)", "isPublic": true},
    {"tensionName": "Progress vs Tradition", "stance": "Champions of Progress", "isPublic": true}
  ],
  "philosophy": "Knowledge should serve all, not be hoarded by priests",
  "relationships": [
    {"target": "Royal Court", "type": "ally", "reason": "Crown funds their research"},
    {"target": "Temple of Dawn", "type": "rival", "reason": "Compete for influence"},
    {"target": "Druids of the Old Ways", "type": "enemy", "reason": "Represent everything they oppose"}
  ],
  "headquarters": "The Brass Spire in Ironhold",
  "secrets": [
    {"content": "Developing weapons that could end the Temple's power", "knownBy": ["inner_council"]}
  ]
}
```

---

*Document Version: 1.0*
*Last Updated: 2024-12-02*
*Author: Design Phase - Senior Engineer*
