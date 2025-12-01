# Campaign World Lore Generation System - Comprehensive Design Specification

## Executive Summary

This document specifies the complete implementation of an asynchronous, background-running world lore generation system for the Arcane Gamemaster TTRPG AI companion. When a player finishes describing their campaign setting, the system automatically generates rich world details—conflicts, NPCs with motivations and personalities, deep lore, geography, factions, and narrative hooks—all stored in a campaign-specific database and intelligently injected into the AI context during gameplay.

---

## 1. ARCHITECTURAL OVERVIEW

### 1.1 System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN CREATION FLOW                                  │
│                                                                                │
│  Player completes       POST /api/campaign          LoreGenerationQueue       │
│  campaign description ─────────────────────────→ enqueues job with campaignId │
│                                                           │                   │
│                                                           ▼                   │
│                                              ┌────────────────────────┐       │
│                                              │  Background Worker     │       │
│                                              │  (polling or webhook)  │       │
│                                              └────────────────────────┘       │
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
│                              │                                                 │
│                              ▼                                                 │
│                    AI generates response with lore-aware context              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Design Principles

1. **Non-blocking Generation**: Lore generation runs asynchronously. Players can immediately start playing while generation completes in the background. The system gracefully degrades—if lore isn't ready, the AI operates with minimal context.

2. **Idempotent Operations**: Multiple triggers for the same campaign produce identical results. Job IDs are derived from campaignId to prevent duplicate processing.

3. **Progressive Enhancement**: As lore generation completes, more context becomes available. Early gameplay benefits from partial results.

4. **Token Budget Awareness**: Context injection respects token limits. Relevance scoring determines which lore to include given available budget.

5. **Campaign Isolation**: All lore is strictly scoped to its campaign. No cross-campaign contamination.

---

## 2. DATABASE SCHEMA DESIGN

### 2.1 Prisma Schema Extensions

```prisma
// Add to prisma/schema.prisma

model CampaignLore {
  id                String   @id @default(uuid())
  campaignId        String   @unique
  campaign          Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  
  // Generation status tracking
  generationStatus  String   @default("pending") // pending, generating, completed, failed
  generationPhase   String?  // current phase being generated
  generationError   String?  // error message if failed
  startedAt         DateTime?
  completedAt       DateTime?
  
  // Core lore content (JSON stored as strings for SQLite)
  worldName         String?  // The world/setting name
  worldHistory      String   @default("[]") // Array of historical events/eras
  cosmology         String   @default("{}") // Gods, planes, magic system
  tone              String?  // dark, heroic, comedic, etc.
  themes            String   @default("[]") // Array of thematic elements
  
  // Relational data stored in separate models for better querying
  npcs              LoreNpc[]
  factions          LoreFaction[]
  locations         LoreLocation[]
  conflicts         LoreConflict[]
  secrets           LoreSecret[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([generationStatus])
}

model LoreNpc {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(fields: [campaignLoreId], references: [id], onDelete: Cascade)
  
  name            String
  role            String       // innkeeper, villain, mentor, quest_giver, etc.
  importance      String       @default("minor") // major, supporting, minor
  
  // Personality
  personality     String       @default("{}") // {traits: [], ideals: [], bonds: [], flaws: []}
  speakingStyle   String?      // How they talk (formal, gruff, nervous, etc.)
  quirks          String       @default("[]") // Memorable behaviors
  
  // Motivations
  publicGoal      String?      // What they appear to want
  secretGoal      String?      // What they actually want
  fears           String       @default("[]")
  
  // Relationships
  relationships   String       @default("[]") // Array of {npcId, relationship, description}
  factionId       String?      // Primary faction affiliation
  
  // Location
  primaryLocation String?      // Where they're usually found
  
  // Physical
  race            String?
  appearance      String?
  
  // Narrative state
  isRevealed      Boolean      @default(false) // Has player met them?
  playerRelation  String?      // friendly, neutral, hostile, unknown
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@index([campaignLoreId])
  @@index([importance])
  @@index([role])
}

model LoreFaction {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(fields: [campaignLoreId], references: [id], onDelete: Cascade)
  
  name            String
  type            String       // guild, religion, government, criminal, military, etc.
  importance      String       @default("minor") // major, supporting, minor
  
  // Identity
  publicImage     String?      // How they present themselves
  secretNature    String?      // What they really are
  symbol          String?      // Visual identifier
  motto           String?
  
  // Goals & Methods
  goals           String       @default("[]") // Array of objectives
  methods         String       @default("[]") // How they achieve goals
  resources       String       @default("[]") // Money, soldiers, magic, etc.
  
  // Relationships
  allies          String       @default("[]") // Array of factionIds
  enemies         String       @default("[]") // Array of factionIds
  
  // Territory
  headquarters    String?      // Primary location
  territory       String       @default("[]") // Array of locationIds or descriptions
  influence       Int          @default(5) // 1-10 scale of power
  
  // Narrative state
  playerStanding  String?      // friendly, neutral, hostile, unknown
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@index([campaignLoreId])
  @@index([type])
}

model LoreLocation {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(fields: [campaignLoreId], references: [id], onDelete: Cascade)
  
  name            String
  locationType    String       // city, town, village, dungeon, wilderness, landmark, etc.
  importance      String       @default("minor") // major, supporting, minor
  
  // Description
  description     String?      // General description
  atmosphere      String?      // Mood/feel of the place
  sensoryDetails  String       @default("{}") // {sights, sounds, smells}
  
  // Geography
  region          String?      // Broader area it belongs to
  terrain         String?      // Mountains, forest, coastal, etc.
  climate         String?
  connectedTo     String       @default("[]") // Array of {locationId, direction, travelTime}
  
  // Significance
  historicalNote  String?      // Historical importance
  currentEvents   String       @default("[]") // What's happening now
  
  // Population
  population      String?      // Size/composition
  notableNpcs     String       @default("[]") // Array of npcIds present here
  factionPresence String       @default("[]") // Array of {factionId, influence}
  
  // Secrets
  hiddenSecrets   String       @default("[]") // Array of secretIds
  
  // Narrative state
  isDiscovered    Boolean      @default(false) // Has player been here?
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@index([campaignLoreId])
  @@index([locationType])
  @@index([region])
}

model LoreConflict {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(fields: [campaignLoreId], references: [id], onDelete: Cascade)
  
  name            String
  type            String       // war, political, personal, ideological, economic, supernatural
  scope           String       @default("regional") // local, regional, world
  importance      String       @default("supporting") // major (campaign-defining), supporting, minor
  
  // Parties
  participants    String       @default("[]") // Array of {type: 'faction'|'npc', id, role: 'aggressor'|'defender'|'neutral'}
  
  // Stakes
  stakes          String?      // What's at risk
  publicKnowledge String?      // What people generally know
  trueNature      String?      // The reality of the situation
  
  // State
  currentState    String       @default("brewing") // brewing, active, climax, resolved
  recentEvents    String       @default("[]") // Recent developments
  
  // Resolution
  possibleOutcomes String      @default("[]") // Array of potential resolutions
  playerInfluence  String?     // How players might affect this
  
  // Narrative state
  isRevealed      Boolean      @default(false) // Are players aware?
  playerStance    String?      // which side (if any) players have taken
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@index([campaignLoreId])
  @@index([type])
  @@index([currentState])
}

model LoreSecret {
  id              String       @id @default(uuid())
  campaignLoreId  String
  campaignLore    CampaignLore @relation(fields: [campaignLoreId], references: [id], onDelete: Cascade)
  
  name            String       // Internal reference name
  type            String       // plot_twist, hidden_identity, forbidden_knowledge, treasure, betrayal
  importance      String       @default("supporting") // major, supporting, minor
  
  // Content
  content         String       // The actual secret
  hints           String       @default("[]") // Array of clues that point to this
  
  // Connections
  relatedNpcs     String       @default("[]") // NPCs who know or are affected
  relatedFactions String       @default("[]") // Factions involved
  relatedLocations String      @default("[]") // Where evidence might be found
  
  // Discovery
  discoveryConditions String   @default("[]") // What triggers reveal
  revealImpact    String?      // What happens when revealed
  
  // State
  isRevealed      Boolean      @default(false)
  partiallyKnown  String       @default("[]") // Which hints have been discovered
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@index([campaignLoreId])
  @@index([type])
  @@index([isRevealed])
}

// Update Campaign model to include lore relation
model Campaign {
  // ... existing fields ...
  lore            CampaignLore?
}
```

### 2.2 Schema Design Rationale

**Why separate models instead of JSON blobs?**

The critical insight here is that during gameplay, we need to query lore by multiple dimensions:
- "Which NPCs are at this location?" → requires `LoreNpc` with `primaryLocation` index
- "What conflicts involve this faction?" → requires `LoreConflict` with participants query
- "What secrets can be discovered here?" → requires `LoreSecret` with location links

JSON blobs would require loading the entire lore structure and filtering in memory, which becomes problematic with rich worlds containing 20+ NPCs, 10+ factions, and dozens of locations.

**Why the `importance` field everywhere?**

Token budget management. When we have 200 tokens for lore injection, we prioritize `major` importance items over `minor`. This creates a natural hierarchy:
- Major: Campaign-defining elements (the BBEG, the main conflict, capital city)
- Supporting: Significant but not central (major quest givers, regional conflicts)
- Minor: Flavor and depth (random tavern NPCs, minor factions)

**Why `isRevealed` tracking?**

The AI needs to know what players have already encountered. If they've met an NPC, we include that NPC's full details in context. If not, we might only hint at their existence. This prevents the AI from referencing unknown characters or spoiling secrets.

---

## 3. LORE GENERATION SERVICE

### 3.1 Generation Queue Implementation

```typescript
// src/lib/lore/lore-generation-queue.ts

import { prisma } from '@/lib/db';

interface LoreGenerationJob {
  id: string;           // Same as campaignId for idempotency
  campaignId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * LoreGenerationQueue manages the lifecycle of lore generation jobs.
 * 
 * CRITICAL DESIGN DECISION: We use the campaignId as the job ID.
 * This provides automatic idempotency—if a job for campaignId X already exists,
 * attempting to enqueue it again returns the existing job instead of creating a duplicate.
 * 
 * RACE CONDITION MITIGATION:
 * Multiple simultaneous requests to generate lore for the same campaign
 * will all hit the same database row. We use optimistic locking via
 * a version field and Prisma's atomic updates to prevent conflicts.
 */
export class LoreGenerationQueue {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff
  
  /**
   * Enqueue a lore generation job for a campaign.
   * 
   * EXECUTION FLOW:
   * 1. Check if CampaignLore record exists for this campaign
   * 2. If exists AND status is 'completed' or 'generating', return existing (no duplicate work)
   * 3. If exists AND status is 'failed', reset for retry
   * 4. If not exists, create new CampaignLore with status='pending'
   * 5. Return the job information
   * 
   * EDGE CASE: What if the campaign doesn't exist?
   * The foreign key constraint will cause Prisma to throw. We catch this
   * and return an error result rather than crashing.
   * 
   * EDGE CASE: What if generation was started but server crashed mid-way?
   * We detect this by checking for records with status='generating' but
   * startedAt > 10 minutes ago. These are considered stale and reset to 'pending'.
   */
  async enqueue(campaignId: string): Promise<{
    success: boolean;
    job?: LoreGenerationJob;
    error?: string;
    alreadyExists?: boolean;
  }> {
    try {
      // First, verify the campaign exists
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, description: true }
      });
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      if (!campaign.description || campaign.description.trim().length < 20) {
        return { 
          success: false, 
          error: 'Campaign description too short for lore generation (minimum 20 characters)' 
        };
      }
      
      // Check for existing lore record
      const existing = await prisma.campaignLore.findUnique({
        where: { campaignId }
      });
      
      if (existing) {
        // Handle the various existing states
        if (existing.generationStatus === 'completed') {
          return { 
            success: true, 
            alreadyExists: true,
            job: this.recordToJob(existing)
          };
        }
        
        if (existing.generationStatus === 'generating') {
          // Check for stale job (started > 10 minutes ago)
          const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
          if (existing.startedAt && existing.startedAt < staleThreshold) {
            // Reset stale job
            const updated = await prisma.campaignLore.update({
              where: { campaignId },
              data: {
                generationStatus: 'pending',
                generationError: 'Previous generation attempt timed out',
                startedAt: null
              }
            });
            return { success: true, job: this.recordToJob(updated) };
          }
          
          // Still processing, return current state
          return { 
            success: true, 
            alreadyExists: true,
            job: this.recordToJob(existing)
          };
        }
        
        if (existing.generationStatus === 'failed') {
          // Reset for retry
          const updated = await prisma.campaignLore.update({
            where: { campaignId },
            data: {
              generationStatus: 'pending',
              generationError: null,
              startedAt: null
            }
          });
          return { success: true, job: this.recordToJob(updated) };
        }
        
        // Status is 'pending', return as-is
        return { success: true, job: this.recordToJob(existing) };
      }
      
      // Create new lore record
      const newLore = await prisma.campaignLore.create({
        data: {
          campaignId,
          generationStatus: 'pending'
        }
      });
      
      return { success: true, job: this.recordToJob(newLore) };
      
    } catch (error) {
      console.error('Error enqueueing lore generation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Claim a job for processing.
   * 
   * CRITICAL SECTION - RACE CONDITION HANDLING:
   * Multiple worker instances might try to claim the same job simultaneously.
   * We use Prisma's atomic updateMany with a WHERE condition that includes
   * the current status. Only one worker will successfully update from
   * 'pending' to 'generating'.
   * 
   * ALGORITHM:
   * 1. Find oldest pending job
   * 2. Attempt atomic update: SET status='generating', startedAt=now() WHERE status='pending'
   * 3. If updateCount === 0, another worker claimed it → try next job
   * 4. If updateCount === 1, we own it → return job
   */
  async claimNextJob(): Promise<LoreGenerationJob | null> {
    // Find pending jobs ordered by creation time
    const pendingJobs = await prisma.campaignLore.findMany({
      where: { generationStatus: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 5 // Get a few in case of contention
    });
    
    for (const job of pendingJobs) {
      // Attempt atomic claim
      const result = await prisma.campaignLore.updateMany({
        where: {
          campaignId: job.campaignId,
          generationStatus: 'pending' // This is the race condition guard
        },
        data: {
          generationStatus: 'generating',
          startedAt: new Date()
        }
      });
      
      if (result.count === 1) {
        // We successfully claimed this job
        const claimed = await prisma.campaignLore.findUnique({
          where: { campaignId: job.campaignId }
        });
        return claimed ? this.recordToJob(claimed) : null;
      }
      // Another worker claimed it, try next
    }
    
    return null;
  }
  
  /**
   * Mark a job as completed.
   * 
   * POST-CONDITION: generationStatus='completed', completedAt is set
   * 
   * NOTE: We don't validate that the job was actually in 'generating' state.
   * This is intentional—if a job somehow got stuck and is being manually
   * completed, we allow it. The important invariant is that completedAt
   * is set for completed jobs.
   */
  async markCompleted(campaignId: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: {
        generationStatus: 'completed',
        completedAt: new Date(),
        generationError: null
      }
    });
  }
  
  /**
   * Mark a job as failed with an error message.
   * 
   * RETRY LOGIC:
   * We don't automatically retry here. The worker calls this, then
   * checks if retries are available before potentially re-enqueueing.
   * This keeps the retry policy in the worker layer where it belongs.
   */
  async markFailed(campaignId: string, error: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: {
        generationStatus: 'failed',
        generationError: error
      }
    });
  }
  
  /**
   * Update the current phase being generated.
   * This allows the UI to show progress like "Generating NPCs..."
   */
  async updatePhase(campaignId: string, phase: string): Promise<void> {
    await prisma.campaignLore.update({
      where: { campaignId },
      data: { generationPhase: phase }
    });
  }
  
  private recordToJob(record: any): LoreGenerationJob {
    return {
      id: record.campaignId,
      campaignId: record.campaignId,
      status: record.generationStatus,
      retryCount: 0, // We'd need to add this field to track
      lastError: record.generationError || undefined,
      createdAt: record.createdAt,
      startedAt: record.startedAt || undefined,
      completedAt: record.completedAt || undefined
    };
  }
}

export const loreGenerationQueue = new LoreGenerationQueue();
```

### 3.2 Multi-Phase Generation Service

```typescript
// src/lib/lore/lore-generation-service.ts

import { prisma } from '@/lib/db';
import { generateContent } from '@/lib/ai/client';
import { loreGenerationQueue } from './lore-generation-queue';

interface GenerationContext {
  campaignId: string;
  campaignName: string;
  campaignDescription: string;
  characterBackstories: string[];
}

/**
 * LoreGenerationService orchestrates the multi-phase generation of world lore.
 * 
 * GENERATION PHASES (in order, each building on previous):
 * 
 * Phase 1: World Foundation
 *   - World name
 *   - Tone and themes
 *   - Cosmology (gods, magic, planes)
 *   - Historical eras
 *   
 * Phase 2: Factions & Power Structures
 *   - Major factions (3-5)
 *   - Supporting factions (3-5)
 *   - Inter-faction relationships
 *   
 * Phase 3: Key NPCs
 *   - Major NPCs (5-8) tied to factions/conflicts
 *   - Supporting NPCs (8-12)
 *   - NPC relationships graph
 *   
 * Phase 4: Conflicts & Tensions
 *   - Main conflict (campaign-defining)
 *   - Regional conflicts (2-3)
 *   - Personal conflicts (tied to NPCs)
 *   
 * Phase 5: Geography & Locations
 *   - Major locations (5-8)
 *   - Supporting locations (5-10)
 *   - Location connections
 *   
 * Phase 6: Secrets & Plot Hooks
 *   - Major secrets (3-5)
 *   - Supporting secrets (5-8)
 *   - Discovery conditions
 * 
 * WHY THIS ORDER?
 * Each phase depends on the previous. You can't create NPCs without knowing
 * what factions exist. You can't create conflicts without knowing the parties.
 * You can't place secrets without knowing locations and NPCs.
 */
export class LoreGenerationService {
  
  /**
   * Execute the full generation pipeline for a campaign.
   * 
   * IMPORTANT INVARIANT:
   * This method is idempotent within a single execution. If called multiple
   * times for the same campaign, it will check existing data and skip
   * phases that already have content.
   * 
   * ERROR HANDLING STRATEGY:
   * If any phase fails, we save partial progress and mark the job as failed.
   * The next retry attempt will detect existing data and skip completed phases.
   * This means a failure in Phase 4 doesn't lose the work from Phases 1-3.
   */
  async generateLore(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Load campaign and existing lore state
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          characters: {
            select: { backstory: true, name: true, className: true, race: true }
          },
          lore: true
        }
      });
      
      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      const context: GenerationContext = {
        campaignId,
        campaignName: campaign.name,
        campaignDescription: campaign.description || '',
        characterBackstories: campaign.characters
          .filter(c => c.backstory)
          .map(c => `${c.name} (${c.race} ${c.className}): ${c.backstory}`)
      };
      
      // Phase 1: World Foundation
      await this.executePhase(
        campaignId,
        'world_foundation',
        () => this.generateWorldFoundation(context)
      );
      
      // Phase 2: Factions
      await this.executePhase(
        campaignId,
        'factions',
        () => this.generateFactions(context)
      );
      
      // Phase 3: NPCs
      await this.executePhase(
        campaignId,
        'npcs',
        () => this.generateNPCs(context)
      );
      
      // Phase 4: Conflicts
      await this.executePhase(
        campaignId,
        'conflicts',
        () => this.generateConflicts(context)
      );
      
      // Phase 5: Geography
      await this.executePhase(
        campaignId,
        'geography',
        () => this.generateGeography(context)
      );
      
      // Phase 6: Secrets
      await this.executePhase(
        campaignId,
        'secrets',
        () => this.generateSecrets(context)
      );
      
      // Mark completed
      await loreGenerationQueue.markCompleted(campaignId);
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
      await loreGenerationQueue.markFailed(campaignId, errorMessage);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Execute a single generation phase with progress tracking.
   * 
   * PHASE SKIP LOGIC:
   * We check if the phase has already produced data. This is done by
   * querying the relevant tables for records linked to this campaignLore.
   * If records exist, we skip the phase.
   * 
   * WHY NOT TRACK WITH A FLAG?
   * Checking actual data is more robust. If a phase partially completed
   * (e.g., created 2 of 5 factions), we can detect this and either
   * skip or supplement. A simple flag would miss partial states.
   */
  private async executePhase(
    campaignId: string,
    phaseName: string,
    generator: () => Promise<void>
  ): Promise<void> {
    await loreGenerationQueue.updatePhase(campaignId, phaseName);
    
    const shouldSkip = await this.checkPhaseComplete(campaignId, phaseName);
    if (shouldSkip) {
      console.log(`Phase ${phaseName} already complete for campaign ${campaignId}, skipping`);
      return;
    }
    
    await generator();
  }
  
  private async checkPhaseComplete(campaignId: string, phase: string): Promise<boolean> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: { take: 1 },
        factions: { take: 1 },
        locations: { take: 1 },
        conflicts: { take: 1 },
        secrets: { take: 1 }
      }
    });
    
    if (!lore) return false;
    
    switch (phase) {
      case 'world_foundation':
        return lore.worldName !== null && lore.worldName.length > 0;
      case 'factions':
        return lore.factions.length > 0;
      case 'npcs':
        return lore.npcs.length > 0;
      case 'conflicts':
        return lore.conflicts.length > 0;
      case 'geography':
        return lore.locations.length > 0;
      case 'secrets':
        return lore.secrets.length > 0;
      default:
        return false;
    }
  }
  
  // ============================================================
  // PHASE 1: WORLD FOUNDATION
  // ============================================================
  
  /**
   * Generate the foundational elements of the world.
   * 
   * AI PROMPT STRUCTURE:
   * We provide the campaign description and any character backstories,
   * then ask for specific structured output. The prompt is carefully
   * crafted to extract consistent, usable data.
   * 
   * OUTPUT VALIDATION:
   * We parse the AI response as JSON and validate required fields exist.
   * If parsing fails, we attempt to extract structured data from freeform text.
   * This fallback handles cases where the AI doesn't follow JSON format perfectly.
   */
  private async generateWorldFoundation(context: GenerationContext): Promise<void> {
    const prompt = `You are a creative fantasy world-builder. Based on the following campaign description, generate rich world lore.

CAMPAIGN: "${context.campaignName}"
DESCRIPTION: "${context.campaignDescription}"

${context.characterBackstories.length > 0 ? `
CHARACTER BACKSTORIES (integrate relevant elements):
${context.characterBackstories.join('\n\n')}
` : ''}

Generate the following in JSON format:

{
  "worldName": "A unique, evocative name for this world/setting",
  "tone": "One of: dark, heroic, intrigue, comedic, epic, gritty, mysterious",
  "themes": ["Array of 3-5 thematic elements like 'corruption', 'redemption', 'ancient powers awakening'"],
  "cosmology": {
    "gods": [
      {
        "name": "God name",
        "domain": "What they rule over",
        "disposition": "How they interact with mortals"
      }
    ],
    "magicSystem": "Brief description of how magic works in this world",
    "otherPlanes": "Brief mention of relevant other planes/realms"
  },
  "worldHistory": [
    {
      "era": "Name of historical period",
      "yearsAgo": "Approximate time (e.g., '1000 years ago', 'The founding')",
      "significance": "Why this era matters to current events"
    }
  ]
}

Focus on elements that create hooks for adventure and connect to the campaign description. Be creative but consistent.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    // Validate and store
    await prisma.campaignLore.update({
      where: { campaignId: context.campaignId },
      data: {
        worldName: parsed.worldName || context.campaignName + ' World',
        tone: parsed.tone || 'heroic',
        themes: JSON.stringify(parsed.themes || []),
        cosmology: JSON.stringify(parsed.cosmology || {}),
        worldHistory: JSON.stringify(parsed.worldHistory || [])
      }
    });
  }
  
  // ============================================================
  // PHASE 2: FACTIONS
  // ============================================================
  
  /**
   * Generate factions based on world foundation.
   * 
   * IMPORTANT: We load the previously generated world foundation
   * to inform faction creation. Factions should fit the tone and
   * themes established in Phase 1.
   * 
   * FACTION COUNT REASONING:
   * - 2-3 major factions: Enough for meaningful conflict, few enough to track
   * - 3-5 supporting factions: Add depth without overwhelming
   * - Factions are interconnected with ally/enemy relationships
   */
  private async generateFactions(context: GenerationContext): Promise<void> {
    // Load world foundation for context
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId }
    });
    
    const worldContext = lore ? `
WORLD: ${lore.worldName}
TONE: ${lore.tone}
THEMES: ${lore.themes}
HISTORY: ${lore.worldHistory}
` : '';

    const prompt = `Based on this campaign setting, generate factions and power structures.

CAMPAIGN: "${context.campaignName}"
DESCRIPTION: "${context.campaignDescription}"
${worldContext}

Generate 5-8 factions in JSON format:

{
  "factions": [
    {
      "name": "Faction name",
      "type": "One of: guild, religion, government, criminal, military, merchant, academic, secret_society",
      "importance": "One of: major, supporting, minor",
      "publicImage": "How the public perceives them",
      "secretNature": "What they're really up to (can be same as public if honest)",
      "goals": ["Goal 1", "Goal 2"],
      "methods": ["How they achieve goals"],
      "resources": ["What power/resources they have"],
      "symbol": "Visual identifier",
      "motto": "Their saying/creed",
      "influence": 7, // 1-10 scale
      "headquarters": "Where they're based",
      "relationships": [
        {"factionName": "Other faction", "relationship": "ally/enemy/neutral/rival", "reason": "Why"}
      ]
    }
  ]
}

Include 2-3 major factions that drive conflict, 3-5 supporting factions that add depth.
Ensure relationships create interesting dynamics (not everyone can be enemies with everyone).`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    if (!parsed.factions || !Array.isArray(parsed.factions)) {
      throw new Error('Failed to parse factions from AI response');
    }
    
    // Get the lore ID
    const loreRecord = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId }
    });
    
    if (!loreRecord) {
      throw new Error('CampaignLore record not found');
    }
    
    // Create faction records
    for (const faction of parsed.factions) {
      await prisma.loreFaction.create({
        data: {
          campaignLoreId: loreRecord.id,
          name: faction.name,
          type: faction.type || 'guild',
          importance: faction.importance || 'supporting',
          publicImage: faction.publicImage,
          secretNature: faction.secretNature,
          goals: JSON.stringify(faction.goals || []),
          methods: JSON.stringify(faction.methods || []),
          resources: JSON.stringify(faction.resources || []),
          symbol: faction.symbol,
          motto: faction.motto,
          influence: faction.influence || 5,
          headquarters: faction.headquarters,
          // Store relationships temporarily; we'll resolve IDs in a second pass
          allies: JSON.stringify([]),
          enemies: JSON.stringify([])
        }
      });
    }
    
    // Second pass: resolve faction relationships
    await this.resolveFactionRelationships(loreRecord.id, parsed.factions);
  }
  
  /**
   * Resolve faction relationships by matching names to IDs.
   * 
   * ALGORITHM:
   * 1. Load all factions for this lore
   * 2. Build name→ID map
   * 3. For each faction's relationships, look up the target faction ID
   * 4. Update the faction with resolved ally/enemy arrays
   * 
   * EDGE CASE: What if a relationship references a faction that wasn't created?
   * We silently skip it. The AI might hallucinate faction names that don't
   * exist in the generated list. Better to have fewer relationships than crash.
   */
  private async resolveFactionRelationships(
    loreId: string,
    factionData: any[]
  ): Promise<void> {
    const factions = await prisma.loreFaction.findMany({
      where: { campaignLoreId: loreId }
    });
    
    const nameToId = new Map<string, string>();
    for (const faction of factions) {
      nameToId.set(faction.name.toLowerCase(), faction.id);
    }
    
    for (const data of factionData) {
      const factionId = nameToId.get(data.name.toLowerCase());
      if (!factionId) continue;
      
      const allies: string[] = [];
      const enemies: string[] = [];
      
      for (const rel of (data.relationships || [])) {
        const targetId = nameToId.get(rel.factionName?.toLowerCase());
        if (!targetId) continue;
        
        if (rel.relationship === 'ally') {
          allies.push(targetId);
        } else if (rel.relationship === 'enemy') {
          enemies.push(targetId);
        }
      }
      
      await prisma.loreFaction.update({
        where: { id: factionId },
        data: {
          allies: JSON.stringify(allies),
          enemies: JSON.stringify(enemies)
        }
      });
    }
  }
  
  // ============================================================
  // PHASE 3: NPCs
  // ============================================================
  
  /**
   * Generate key NPCs tied to factions and setting.
   * 
   * NPC GENERATION STRATEGY:
   * We explicitly reference the factions created in Phase 2, ensuring
   * NPCs are properly integrated into the power structures.
   * 
   * Each NPC has:
   * - Public goal (what they appear to want)
   * - Secret goal (what they actually want) - creates intrigue
   * - Personality traits following D&D format (ideals, bonds, flaws)
   * - Relationships to other NPCs
   */
  private async generateNPCs(context: GenerationContext): Promise<void> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true }
    });
    
    if (!lore) throw new Error('CampaignLore not found');
    
    const factionList = lore.factions
      .map(f => `- ${f.name} (${f.type}): ${f.publicImage}`)
      .join('\n');

    const prompt = `Generate NPCs for this campaign setting.

CAMPAIGN: "${context.campaignName}"
SETTING: ${lore.worldName} (${lore.tone} tone)
THEMES: ${lore.themes}

EXISTING FACTIONS:
${factionList}

Generate 10-15 NPCs in JSON format:

{
  "npcs": [
    {
      "name": "NPC name",
      "role": "innkeeper/villain/mentor/quest_giver/rival/ally/merchant/scholar/guard/noble/commoner",
      "importance": "major/supporting/minor",
      "race": "human/elf/dwarf/etc",
      "appearance": "Brief physical description",
      "speakingStyle": "How they talk (formal/gruff/nervous/eloquent)",
      "personality": {
        "traits": ["Trait 1", "Trait 2"],
        "ideals": ["What they believe in"],
        "bonds": ["What they care about"],
        "flaws": ["Their weaknesses"]
      },
      "quirks": ["Memorable behaviors"],
      "publicGoal": "What they appear to want",
      "secretGoal": "What they actually want (can match public if honest)",
      "fears": ["What scares them"],
      "factionAffiliation": "Name of faction they belong to (or null)",
      "primaryLocation": "Where they're usually found",
      "relationships": [
        {"npcName": "Other NPC", "relationship": "friend/enemy/family/business/romantic", "description": "Brief note"}
      ]
    }
  ]
}

Include:
- 3-5 major NPCs (campaign-important characters, potential villains/allies)
- 5-7 supporting NPCs (quest givers, faction representatives)
- 3-5 minor NPCs (flavor characters, information sources)

Ensure NPCs are tied to factions where appropriate. Create relationship web between NPCs.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    if (!parsed.npcs || !Array.isArray(parsed.npcs)) {
      throw new Error('Failed to parse NPCs from AI response');
    }
    
    // Build faction name→ID map
    const factionNameToId = new Map<string, string>();
    for (const faction of lore.factions) {
      factionNameToId.set(faction.name.toLowerCase(), faction.id);
    }
    
    // Create NPC records
    for (const npc of parsed.npcs) {
      await prisma.loreNpc.create({
        data: {
          campaignLoreId: lore.id,
          name: npc.name,
          role: npc.role || 'commoner',
          importance: npc.importance || 'minor',
          race: npc.race,
          appearance: npc.appearance,
          speakingStyle: npc.speakingStyle,
          personality: JSON.stringify(npc.personality || {}),
          quirks: JSON.stringify(npc.quirks || []),
          publicGoal: npc.publicGoal,
          secretGoal: npc.secretGoal,
          fears: JSON.stringify(npc.fears || []),
          factionId: npc.factionAffiliation 
            ? factionNameToId.get(npc.factionAffiliation.toLowerCase()) || null
            : null,
          primaryLocation: npc.primaryLocation,
          relationships: JSON.stringify(npc.relationships || [])
        }
      });
    }
    
    // Second pass: resolve NPC relationships to IDs
    await this.resolveNpcRelationships(lore.id, parsed.npcs);
  }
  
  private async resolveNpcRelationships(loreId: string, npcData: any[]): Promise<void> {
    const npcs = await prisma.loreNpc.findMany({
      where: { campaignLoreId: loreId }
    });
    
    const nameToId = new Map<string, string>();
    for (const npc of npcs) {
      nameToId.set(npc.name.toLowerCase(), npc.id);
    }
    
    for (const data of npcData) {
      const npcId = nameToId.get(data.name.toLowerCase());
      if (!npcId) continue;
      
      const resolvedRelationships = (data.relationships || [])
        .map((rel: any) => ({
          npcId: nameToId.get(rel.npcName?.toLowerCase()),
          relationship: rel.relationship,
          description: rel.description
        }))
        .filter((rel: any) => rel.npcId);
      
      await prisma.loreNpc.update({
        where: { id: npcId },
        data: { relationships: JSON.stringify(resolvedRelationships) }
      });
    }
  }
  
  // ============================================================
  // PHASE 4: CONFLICTS
  // ============================================================
  
  private async generateConflicts(context: GenerationContext): Promise<void> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true, npcs: { where: { importance: 'major' } } }
    });
    
    if (!lore) throw new Error('CampaignLore not found');
    
    const factionList = lore.factions.map(f => `- ${f.name}: ${f.goals}`).join('\n');
    const majorNpcs = lore.npcs.map(n => `- ${n.name} (${n.role}): ${n.publicGoal}`).join('\n');

    const prompt = `Generate conflicts and tensions for this campaign.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
TONE: ${lore.tone}
THEMES: ${lore.themes}

FACTIONS AND GOALS:
${factionList}

MAJOR NPCs AND GOALS:
${majorNpcs}

Generate 4-6 conflicts in JSON format:

{
  "conflicts": [
    {
      "name": "Conflict name (e.g., 'The Succession Crisis')",
      "type": "war/political/personal/ideological/economic/supernatural",
      "scope": "local/regional/world",
      "importance": "major/supporting/minor",
      "participants": [
        {"type": "faction", "name": "Faction name", "role": "aggressor/defender/neutral/opportunist"},
        {"type": "npc", "name": "NPC name", "role": "mastermind/pawn/mediator"}
      ],
      "stakes": "What's at risk if this conflict isn't resolved",
      "publicKnowledge": "What common people know about this",
      "trueNature": "The real story behind the conflict",
      "currentState": "brewing/active/climax/stalemate",
      "recentEvents": ["Recent development 1", "Recent development 2"],
      "possibleOutcomes": [
        {"outcome": "Possible resolution", "consequence": "What happens"}
      ],
      "playerInfluence": "How players might affect this conflict"
    }
  ]
}

Include:
- 1 MAJOR conflict that defines the campaign arc
- 2-3 SUPPORTING conflicts that interweave with the main plot
- 1-2 MINOR conflicts for side quests and local flavor

Ensure conflicts involve the factions and NPCs already established.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    if (!parsed.conflicts || !Array.isArray(parsed.conflicts)) {
      throw new Error('Failed to parse conflicts from AI response');
    }
    
    for (const conflict of parsed.conflicts) {
      await prisma.loreConflict.create({
        data: {
          campaignLoreId: lore.id,
          name: conflict.name,
          type: conflict.type || 'political',
          scope: conflict.scope || 'regional',
          importance: conflict.importance || 'supporting',
          participants: JSON.stringify(conflict.participants || []),
          stakes: conflict.stakes,
          publicKnowledge: conflict.publicKnowledge,
          trueNature: conflict.trueNature,
          currentState: conflict.currentState || 'active',
          recentEvents: JSON.stringify(conflict.recentEvents || []),
          possibleOutcomes: JSON.stringify(conflict.possibleOutcomes || []),
          playerInfluence: conflict.playerInfluence
        }
      });
    }
  }
  
  // ============================================================
  // PHASE 5: GEOGRAPHY
  // ============================================================
  
  private async generateGeography(context: GenerationContext): Promise<void> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId },
      include: { factions: true, npcs: true, conflicts: true }
    });
    
    if (!lore) throw new Error('CampaignLore not found');
    
    const factionHQs = lore.factions
      .filter(f => f.headquarters)
      .map(f => `- ${f.name} HQ: ${f.headquarters}`)
      .join('\n');
    
    const npcLocations = lore.npcs
      .filter(n => n.primaryLocation)
      .map(n => `- ${n.name}: ${n.primaryLocation}`)
      .join('\n');

    const prompt = `Generate geography and locations for this campaign.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
DESCRIPTION: "${context.campaignDescription}"
TONE: ${lore.tone}

ALREADY MENTIONED LOCATIONS:
${factionHQs}
${npcLocations}

Generate 10-15 locations in JSON format:

{
  "locations": [
    {
      "name": "Location name",
      "locationType": "city/town/village/dungeon/wilderness/landmark/ruin/fortress/temple/tavern",
      "importance": "major/supporting/minor",
      "region": "Broader geographic region (e.g., 'Northern Highlands')",
      "terrain": "Mountains/forest/coastal/plains/swamp/desert/underground",
      "climate": "Temperate/cold/tropical/arid",
      "description": "General description of the place",
      "atmosphere": "The mood/feel (bustling/eerie/peaceful/tense)",
      "sensoryDetails": {
        "sights": "What you see",
        "sounds": "What you hear",
        "smells": "What you smell"
      },
      "population": "Size and composition (for settlements)",
      "historicalNote": "Historical significance",
      "currentEvents": ["What's happening here now"],
      "notableNpcs": ["Names of NPCs found here"],
      "factionPresence": [{"factionName": "Faction", "influence": "strong/moderate/weak"}],
      "connectedTo": [{"locationName": "Other place", "direction": "north/etc", "travelTime": "2 days on foot"}],
      "hiddenSecrets": ["Hints at secrets here"]
    }
  ]
}

Include:
- 2-3 MAJOR locations (campaign hubs, conflict epicenters)
- 5-7 SUPPORTING locations (adventure sites, faction territories)
- 3-5 MINOR locations (flavor, random encounters)

Ensure locations already mentioned in NPCs/factions are included and detailed.
Create logical geographic connections between locations.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    if (!parsed.locations || !Array.isArray(parsed.locations)) {
      throw new Error('Failed to parse locations from AI response');
    }
    
    // Create location records
    for (const location of parsed.locations) {
      await prisma.loreLocation.create({
        data: {
          campaignLoreId: lore.id,
          name: location.name,
          locationType: location.locationType || 'town',
          importance: location.importance || 'minor',
          region: location.region,
          terrain: location.terrain,
          climate: location.climate,
          description: location.description,
          atmosphere: location.atmosphere,
          sensoryDetails: JSON.stringify(location.sensoryDetails || {}),
          population: location.population,
          historicalNote: location.historicalNote,
          currentEvents: JSON.stringify(location.currentEvents || []),
          notableNpcs: JSON.stringify(location.notableNpcs || []),
          factionPresence: JSON.stringify(location.factionPresence || []),
          connectedTo: JSON.stringify(location.connectedTo || []),
          hiddenSecrets: JSON.stringify(location.hiddenSecrets || [])
        }
      });
    }
    
    // Update NPC primaryLocation references to location IDs where possible
    await this.linkNpcsToLocations(lore.id, parsed.locations);
  }
  
  private async linkNpcsToLocations(loreId: string, locationData: any[]): Promise<void> {
    const locations = await prisma.loreLocation.findMany({
      where: { campaignLoreId: loreId }
    });
    
    const locationNameToId = new Map<string, string>();
    for (const loc of locations) {
      locationNameToId.set(loc.name.toLowerCase(), loc.id);
    }
    
    const npcs = await prisma.loreNpc.findMany({
      where: { campaignLoreId: loreId }
    });
    
    for (const npc of npcs) {
      if (npc.primaryLocation) {
        const locationId = locationNameToId.get(npc.primaryLocation.toLowerCase());
        if (locationId) {
          await prisma.loreNpc.update({
            where: { id: npc.id },
            data: { primaryLocation: locationId }
          });
        }
      }
    }
  }
  
  // ============================================================
  // PHASE 6: SECRETS
  // ============================================================
  
  private async generateSecrets(context: GenerationContext): Promise<void> {
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId: context.campaignId },
      include: { 
        factions: true, 
        npcs: { where: { importance: { in: ['major', 'supporting'] } } },
        conflicts: true,
        locations: { where: { importance: { in: ['major', 'supporting'] } } }
      }
    });
    
    if (!lore) throw new Error('CampaignLore not found');

    const prompt = `Generate secrets and plot hooks for this campaign.

CAMPAIGN: "${context.campaignName}"
WORLD: ${lore.worldName}
THEMES: ${lore.themes}

KEY NPCs:
${lore.npcs.map(n => `- ${n.name}: ${n.secretGoal}`).join('\n')}

CONFLICTS:
${lore.conflicts.map(c => `- ${c.name}: ${c.trueNature}`).join('\n')}

LOCATIONS:
${lore.locations.map(l => `- ${l.name}: ${l.hiddenSecrets}`).join('\n')}

Generate 8-12 secrets in JSON format:

{
  "secrets": [
    {
      "name": "Internal reference name (e.g., 'The True Heir')",
      "type": "plot_twist/hidden_identity/forbidden_knowledge/treasure/betrayal/prophecy/ancient_evil",
      "importance": "major/supporting/minor",
      "content": "The actual secret - what is hidden",
      "hints": [
        "Clue 1 that players might discover",
        "Clue 2 that points to this secret"
      ],
      "relatedNpcs": ["NPC names who know or are affected"],
      "relatedFactions": ["Faction names involved"],
      "relatedLocations": ["Location names where evidence exists"],
      "discoveryConditions": [
        "Condition 1: Talk to NPC X",
        "Condition 2: Find document in Location Y"
      ],
      "revealImpact": "What changes when this is revealed"
    }
  ]
}

Include:
- 2-3 MAJOR secrets that could change the campaign direction
- 4-5 SUPPORTING secrets that deepen specific NPCs/conflicts
- 2-4 MINOR secrets for rewards and side content

Secrets should connect to established NPCs, factions, and conflicts.
Each secret should have multiple discovery paths.`;

    const response = await generateContent(prompt);
    const parsed = this.parseJsonFromResponse(response);
    
    if (!parsed.secrets || !Array.isArray(parsed.secrets)) {
      throw new Error('Failed to parse secrets from AI response');
    }
    
    for (const secret of parsed.secrets) {
      await prisma.loreSecret.create({
        data: {
          campaignLoreId: lore.id,
          name: secret.name,
          type: secret.type || 'plot_twist',
          importance: secret.importance || 'supporting',
          content: secret.content,
          hints: JSON.stringify(secret.hints || []),
          relatedNpcs: JSON.stringify(secret.relatedNpcs || []),
          relatedFactions: JSON.stringify(secret.relatedFactions || []),
          relatedLocations: JSON.stringify(secret.relatedLocations || []),
          discoveryConditions: JSON.stringify(secret.discoveryConditions || []),
          revealImpact: secret.revealImpact
        }
      });
    }
  }
  
  // ============================================================
  // UTILITY METHODS
  // ============================================================
  
  /**
   * Parse JSON from AI response, handling various formats.
   * 
   * AI responses might contain:
   * 1. Pure JSON
   * 2. JSON wrapped in markdown code blocks
   * 3. JSON with leading/trailing text
   * 
   * We try multiple extraction strategies:
   */
  private parseJsonFromResponse(response: string): any {
    // Strategy 1: Try direct parse
    try {
      return JSON.parse(response);
    } catch (e) {
      // Continue to other strategies
    }
    
    // Strategy 2: Extract from markdown code block
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e) {
        // Continue
      }
    }
    
    // Strategy 3: Find JSON object in text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Continue
      }
    }
    
    // Strategy 4: Find JSON array in text
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return { items: JSON.parse(arrayMatch[0]) };
      } catch (e) {
        // Continue
      }
    }
    
    console.error('Failed to parse JSON from response:', response.substring(0, 500));
    throw new Error('Could not extract valid JSON from AI response');
  }
}

export const loreGenerationService = new LoreGenerationService();
```

---

## 4. CONTEXT INJECTION STRATEGY

### 4.1 LoreContextManager

```typescript
// src/lib/lore/lore-context-manager.ts

import { prisma } from '@/lib/db';

interface LoreContext {
  summary: string;           // Always included
  relevantNpcs: string[];    // Based on location/recent mentions
  relevantConflicts: string[];
  locationDetails: string;   // Current location lore
  activeSecretHints: string[];
}

interface ContextBudget {
  totalTokens: number;      // Available tokens for lore
  tier1Reserved: number;    // Always-included content
  tier2Remaining: number;   // Situational content
}

/**
 * LoreContextManager handles intelligent injection of lore into AI context.
 * 
 * TIERED INJECTION MODEL:
 * 
 * Tier 1 - Always Present (~100-150 tokens):
 *   - World name and tone
 *   - Current location name
 *   - Active quest/conflict summary (1 sentence)
 *   
 * Tier 2 - Location-Relevant (~200-400 tokens):
 *   - NPCs at current location
 *   - Local conflicts affecting this area
 *   - Recent NPC mentions from conversation
 *   
 * Tier 3 - On-Demand (via recall_lore function):
 *   - Deep history
 *   - Distant locations
 *   - Unrevealed secrets (AI can request when relevant)
 * 
 * TOKEN BUDGET CALCULATION:
 * We estimate tokens at ~4 characters per token.
 * Total context injection budget is typically 500-800 tokens for lore.
 * We prioritize by importance (major > supporting > minor).
 */
export class LoreContextManager {
  
  /**
   * Generate the lore context block for a given game state.
   * 
   * INPUTS:
   * - campaignId: Which campaign's lore to use
   * - currentLocation: Where the party currently is (name or description)
   * - recentMessages: Last N messages for NPC mention detection
   * - tokenBudget: Maximum tokens for lore injection
   * 
   * ALGORITHM:
   * 1. Load campaign lore (check if generation complete)
   * 2. If generation incomplete, return minimal context
   * 3. Build Tier 1 content (always present)
   * 4. Calculate remaining budget
   * 5. Score and select Tier 2 content by relevance
   * 6. Format and return context block
   */
  async generateLoreContext(
    campaignId: string,
    currentLocation: string | null,
    recentMessages: Array<{ role: string; content: string }>,
    tokenBudget: number = 600
  ): Promise<string> {
    // Check if lore exists and is ready
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: true,
        factions: true,
        locations: true,
        conflicts: true,
        secrets: { where: { isRevealed: false } }
      }
    });
    
    if (!lore || lore.generationStatus !== 'completed') {
      return this.generateMinimalContext(campaignId);
    }
    
    // Extract mentioned NPC names from recent messages
    const mentionedNames = this.extractNpcMentions(recentMessages, lore.npcs);
    
    // Find current location in lore
    const locationLore = this.findLocationLore(currentLocation, lore.locations);
    
    // Build context with budget management
    const context: string[] = [];
    let usedTokens = 0;
    
    // === TIER 1: ALWAYS PRESENT ===
    const tier1 = this.buildTier1Context(lore, locationLore);
    context.push(tier1);
    usedTokens += this.estimateTokens(tier1);
    
    // === TIER 2: LOCATION-RELEVANT ===
    const tier2Budget = tokenBudget - usedTokens;
    
    if (tier2Budget > 100) {
      // Get NPCs relevant to current situation
      const relevantNpcs = this.selectRelevantNpcs(
        lore.npcs,
        locationLore,
        mentionedNames,
        Math.floor(tier2Budget * 0.4)
      );
      
      if (relevantNpcs) {
        context.push(relevantNpcs);
        usedTokens += this.estimateTokens(relevantNpcs);
      }
      
      // Get active conflicts relevant to location
      const relevantConflicts = this.selectRelevantConflicts(
        lore.conflicts,
        locationLore,
        Math.floor(tier2Budget * 0.3)
      );
      
      if (relevantConflicts) {
        context.push(relevantConflicts);
        usedTokens += this.estimateTokens(relevantConflicts);
      }
      
      // Add secret hints if budget allows
      const remainingBudget = tokenBudget - usedTokens;
      if (remainingBudget > 50) {
        const secretHints = this.selectSecretHints(
          lore.secrets,
          locationLore,
          mentionedNames,
          remainingBudget
        );
        
        if (secretHints) {
          context.push(secretHints);
        }
      }
    }
    
    return context.join('\n\n');
  }
  
  /**
   * Build Tier 1 context - the essential always-present lore.
   * 
   * This establishes the world "feel" without specific details.
   * Even if the AI knows nothing else, it knows the world name,
   * tone, and general situation.
   */
  private buildTier1Context(lore: any, locationLore: any | null): string {
    const parts: string[] = [];
    
    // World foundation
    parts.push(`WORLD LORE SUMMARY:`);
    parts.push(`Setting: ${lore.worldName || 'Unknown World'} (${lore.tone || 'fantasy'} tone)`);
    
    // Themes
    const themes = JSON.parse(lore.themes || '[]');
    if (themes.length > 0) {
      parts.push(`Themes: ${themes.slice(0, 3).join(', ')}`);
    }
    
    // Current location
    if (locationLore) {
      parts.push(`Current Location: ${locationLore.name} - ${locationLore.atmosphere || locationLore.description?.substring(0, 100)}`);
    }
    
    // Main conflict (single sentence)
    const mainConflict = lore.conflicts?.find((c: any) => c.importance === 'major');
    if (mainConflict) {
      parts.push(`Central Tension: ${mainConflict.publicKnowledge || mainConflict.name}`);
    }
    
    return parts.join('\n');
  }
  
  /**
   * Select relevant NPCs based on location and recent mentions.
   * 
   * RELEVANCE SCORING:
   * - At current location: +10
   * - Recently mentioned by name: +8
   * - Major importance: +5
   * - Supporting importance: +3
   * - Revealed to players: +2
   * 
   * We sort by score and take top N that fit in budget.
   */
  private selectRelevantNpcs(
    npcs: any[],
    locationLore: any | null,
    mentionedNames: Set<string>,
    tokenBudget: number
  ): string | null {
    if (npcs.length === 0) return null;
    
    // Score each NPC
    const scored = npcs.map(npc => {
      let score = 0;
      
      // Location match
      if (locationLore && npc.primaryLocation === locationLore.id) {
        score += 10;
      }
      
      // Recent mention
      if (mentionedNames.has(npc.name.toLowerCase())) {
        score += 8;
      }
      
      // Importance
      if (npc.importance === 'major') score += 5;
      else if (npc.importance === 'supporting') score += 3;
      
      // Revealed
      if (npc.isRevealed) score += 2;
      
      return { npc, score };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Take NPCs that fit in budget
    const selected: string[] = [];
    let usedTokens = 0;
    
    selected.push('RELEVANT NPCs:');
    
    for (const { npc, score } of scored) {
      if (score === 0) break; // Only include relevant NPCs
      
      const npcLine = this.formatNpcForContext(npc);
      const lineTokens = this.estimateTokens(npcLine);
      
      if (usedTokens + lineTokens > tokenBudget) break;
      
      selected.push(npcLine);
      usedTokens += lineTokens;
    }
    
    if (selected.length <= 1) return null; // Only header, no NPCs
    
    return selected.join('\n');
  }
  
  private formatNpcForContext(npc: any): string {
    const parts = [`- ${npc.name} (${npc.role})`];
    
    if (npc.publicGoal) {
      parts.push(`wants: ${npc.publicGoal}`);
    }
    
    if (npc.speakingStyle) {
      parts.push(`speaks: ${npc.speakingStyle}`);
    }
    
    const personality = JSON.parse(npc.personality || '{}');
    if (personality.traits?.length > 0) {
      parts.push(`traits: ${personality.traits.slice(0, 2).join(', ')}`);
    }
    
    return parts.join(' | ');
  }
  
  /**
   * Select relevant conflicts for the current location.
   */
  private selectRelevantConflicts(
    conflicts: any[],
    locationLore: any | null,
    tokenBudget: number
  ): string | null {
    if (conflicts.length === 0) return null;
    
    // Score conflicts
    const scored = conflicts.map(conflict => {
      let score = 0;
      
      // Importance
      if (conflict.importance === 'major') score += 5;
      else if (conflict.importance === 'supporting') score += 3;
      
      // Active state
      if (conflict.currentState === 'active' || conflict.currentState === 'climax') {
        score += 3;
      }
      
      // Revealed
      if (conflict.isRevealed) score += 2;
      
      return { conflict, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const selected: string[] = [];
    let usedTokens = 0;
    
    selected.push('ACTIVE TENSIONS:');
    
    for (const { conflict, score } of scored) {
      if (score === 0) break;
      
      const conflictLine = `- ${conflict.name}: ${conflict.publicKnowledge || conflict.stakes}`;
      const lineTokens = this.estimateTokens(conflictLine);
      
      if (usedTokens + lineTokens > tokenBudget) break;
      
      selected.push(conflictLine);
      usedTokens += lineTokens;
      
      if (selected.length >= 4) break; // Limit to 3 conflicts
    }
    
    if (selected.length <= 1) return null;
    
    return selected.join('\n');
  }
  
  /**
   * Select secret hints that could be relevant.
   * 
   * We NEVER reveal the secret content directly.
   * Instead, we include hints that the AI can weave into narrative.
   */
  private selectSecretHints(
    secrets: any[],
    locationLore: any | null,
    mentionedNames: Set<string>,
    tokenBudget: number
  ): string | null {
    if (secrets.length === 0) return null;
    
    const hints: string[] = [];
    let usedTokens = 0;
    
    for (const secret of secrets) {
      if (secret.isRevealed) continue;
      
      const secretHints = JSON.parse(secret.hints || '[]');
      const relatedLocations = JSON.parse(secret.relatedLocations || '[]');
      const relatedNpcs = JSON.parse(secret.relatedNpcs || '[]');
      
      // Check if this secret is relevant to current context
      const isLocationRelevant = locationLore && 
        relatedLocations.some((l: string) => 
          l.toLowerCase().includes(locationLore.name.toLowerCase())
        );
      
      const isNpcRelevant = relatedNpcs.some((npcName: string) =>
        mentionedNames.has(npcName.toLowerCase())
      );
      
      if (isLocationRelevant || isNpcRelevant) {
        // Pick a random hint to include
        const hint = secretHints[Math.floor(Math.random() * secretHints.length)];
        if (hint) {
          const hintLine = `[Subtle hint opportunity: ${hint}]`;
          const lineTokens = this.estimateTokens(hintLine);
          
          if (usedTokens + lineTokens <= tokenBudget) {
            hints.push(hintLine);
            usedTokens += lineTokens;
          }
        }
      }
    }
    
    if (hints.length === 0) return null;
    
    return 'NARRATIVE OPPORTUNITIES:\n' + hints.join('\n');
  }
  
  /**
   * Extract NPC names mentioned in recent messages.
   */
  private extractNpcMentions(
    messages: Array<{ role: string; content: string }>,
    npcs: any[]
  ): Set<string> {
    const npcNames = new Set<string>(npcs.map(n => n.name.toLowerCase()));
    const mentioned = new Set<string>();
    
    for (const msg of messages) {
      const lowerContent = msg.content.toLowerCase();
      for (const name of npcNames) {
        if (lowerContent.includes(name)) {
          mentioned.add(name);
        }
      }
    }
    
    return mentioned;
  }
  
  /**
   * Find location lore matching the current location.
   */
  private findLocationLore(
    currentLocation: string | null,
    locations: any[]
  ): any | null {
    if (!currentLocation) return null;
    
    const lowerLocation = currentLocation.toLowerCase();
    
    // Try exact match first
    let match = locations.find(l => 
      l.name.toLowerCase() === lowerLocation
    );
    
    if (!match) {
      // Try partial match
      match = locations.find(l =>
        lowerLocation.includes(l.name.toLowerCase()) ||
        l.name.toLowerCase().includes(lowerLocation)
      );
    }
    
    return match || null;
  }
  
  /**
   * Generate minimal context when lore isn't available.
   */
  private async generateMinimalContext(campaignId: string): Promise<string> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true, description: true }
    });
    
    if (!campaign) return '';
    
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      select: { generationStatus: true, generationPhase: true }
    });
    
    let status = '';
    if (lore?.generationStatus === 'generating') {
      status = `\n[World lore is being generated: ${lore.generationPhase || 'initializing'}...]`;
    }
    
    return `SETTING: ${campaign.name}
${campaign.description || 'A fantasy adventure awaits.'}${status}`;
  }
  
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

export const loreContextManager = new LoreContextManager();
```

### 4.2 Integration with StateGuardian

The existing `StateGuardian.generateContextInjection()` method needs to be updated to include lore context:

```typescript
// Modification to src/lib/ai/state-guardian.ts

import { loreContextManager } from '@/lib/lore/lore-context-manager';

// In the generateContextInjection method, add after existing context building:

async generateContextInjection(context: OrchestratorContext): Promise<string> {
  const blocks: string[] = [];
  
  // ... existing context injection code ...
  
  // === NEW: LORE CONTEXT INJECTION ===
  const loreContext = await loreContextManager.generateLoreContext(
    context.campaignId,
    this.inferCurrentLocation(context.gameState.recentMessages, context.campaignDescription),
    context.gameState.recentMessages,
    500 // Token budget for lore
  );
  
  if (loreContext) {
    blocks.push('---');
    blocks.push(loreContext);
  }
  
  // ... rest of existing code ...
  
  return blocks.join('\n');
}
```

---

## 5. API ENDPOINTS

### 5.1 Lore Generation Trigger

```typescript
// src/app/api/campaign/[id]/generate-lore/route.ts

import { NextResponse } from 'next/server';
import { loreGenerationQueue } from '@/lib/lore/lore-generation-queue';
import { loreGenerationService } from '@/lib/lore/lore-generation-service';

/**
 * POST /api/campaign/[id]/generate-lore
 * 
 * Triggers asynchronous lore generation for a campaign.
 * 
 * EXECUTION MODEL:
 * In a serverless environment (like Vercel), we can't have true background
 * workers. Instead, we use one of these strategies:
 * 
 * Option A: Synchronous generation (simple, but slow)
 *   - Generate all lore in the same request
 *   - Risk: Request timeout for large generations
 *   
 * Option B: Edge function with streaming (better UX)
 *   - Start generation and stream progress updates
 *   - Client shows real-time progress
 *   
 * Option C: External job queue (production-ready)
 *   - Use something like Inngest, Trigger.dev, or AWS SQS
 *   - True async background processing
 * 
 * For initial implementation, we use Option A with timeout handling.
 * The route checks if the request is timing out and saves partial progress.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    // Enqueue the job (idempotent)
    const result = await loreGenerationQueue.enqueue(campaignId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    if (result.alreadyExists && result.job?.status === 'completed') {
      return NextResponse.json({
        status: 'already_completed',
        message: 'Lore generation already completed for this campaign'
      });
    }
    
    // For serverless, we generate synchronously but with a timeout
    // In production, this would dispatch to an external job queue
    const TIMEOUT_MS = 25000; // Leave buffer for response
    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), TIMEOUT_MS);
    });
    
    const generationPromise = loreGenerationService.generateLore(campaignId);
    
    const raceResult = await Promise.race([generationPromise, timeoutPromise]);
    
    if ('timedOut' in raceResult) {
      // Generation is continuing in background
      // In production, this would be handled by the job queue
      return NextResponse.json({
        status: 'generating',
        message: 'Generation started, check status endpoint for progress',
        jobId: campaignId
      });
    }
    
    if (!raceResult.success) {
      return NextResponse.json({ error: raceResult.error }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'completed',
      message: 'Lore generation completed successfully'
    });
    
  } catch (error) {
    console.error('Error in generate-lore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.2 Lore Status Endpoint

```typescript
// src/app/api/campaign/[id]/lore-status/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/campaign/[id]/lore-status
 * 
 * Returns the current status of lore generation and available lore.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: { select: { id: true, name: true, importance: true, isRevealed: true } },
        factions: { select: { id: true, name: true, importance: true } },
        locations: { select: { id: true, name: true, locationType: true, isDiscovered: true } },
        conflicts: { select: { id: true, name: true, importance: true, isRevealed: true } },
        secrets: { select: { id: true, name: true, importance: true, isRevealed: true } }
      }
    });
    
    if (!lore) {
      return NextResponse.json({
        status: 'not_started',
        message: 'Lore generation has not been started for this campaign'
      });
    }
    
    return NextResponse.json({
      status: lore.generationStatus,
      currentPhase: lore.generationPhase,
      error: lore.generationError,
      startedAt: lore.startedAt,
      completedAt: lore.completedAt,
      
      // Summary counts
      summary: {
        worldName: lore.worldName,
        tone: lore.tone,
        npcCount: lore.npcs.length,
        factionCount: lore.factions.length,
        locationCount: lore.locations.length,
        conflictCount: lore.conflicts.length,
        secretCount: lore.secrets.length
      },
      
      // Breakdown by importance
      breakdown: {
        npcs: {
          major: lore.npcs.filter(n => n.importance === 'major').length,
          supporting: lore.npcs.filter(n => n.importance === 'supporting').length,
          minor: lore.npcs.filter(n => n.importance === 'minor').length,
          revealed: lore.npcs.filter(n => n.isRevealed).length
        },
        locations: {
          discovered: lore.locations.filter(l => l.isDiscovered).length,
          total: lore.locations.length
        },
        secrets: {
          revealed: lore.secrets.filter(s => s.isRevealed).length,
          total: lore.secrets.length
        }
      }
    });
    
  } catch (error) {
    console.error('Error in lore-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.3 Lore Query Endpoint (for recall_lore function)

```typescript
// src/app/api/campaign/[id]/lore/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const QuerySchema = z.object({
  topic: z.string().min(1),
  type: z.enum(['npc', 'faction', 'location', 'conflict', 'history', 'any']).default('any')
});

/**
 * POST /api/campaign/[id]/lore
 * 
 * Query lore by topic. Used by the recall_lore function to let the AI
 * access deeper lore when narratively appropriate.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const body = await request.json();
    const { topic, type } = QuerySchema.parse(body);
    
    const lore = await prisma.campaignLore.findUnique({
      where: { campaignId },
      include: {
        npcs: true,
        factions: true,
        locations: true,
        conflicts: true
      }
    });
    
    if (!lore || lore.generationStatus !== 'completed') {
      return NextResponse.json({
        found: false,
        message: 'Lore not available'
      });
    }
    
    const lowerTopic = topic.toLowerCase();
    const results: any[] = [];
    
    // Search NPCs
    if (type === 'any' || type === 'npc') {
      const matchingNpcs = lore.npcs.filter(npc =>
        npc.name.toLowerCase().includes(lowerTopic) ||
        npc.role.toLowerCase().includes(lowerTopic) ||
        (npc.publicGoal?.toLowerCase().includes(lowerTopic))
      );
      results.push(...matchingNpcs.map(npc => ({
        type: 'npc',
        name: npc.name,
        role: npc.role,
        description: `${npc.name} is a ${npc.role}. ${npc.publicGoal || ''} They speak in a ${npc.speakingStyle || 'normal'} manner.`,
        details: {
          personality: JSON.parse(npc.personality || '{}'),
          fears: JSON.parse(npc.fears || '[]'),
          quirks: JSON.parse(npc.quirks || '[]')
        }
      })));
    }
    
    // Search Factions
    if (type === 'any' || type === 'faction') {
      const matchingFactions = lore.factions.filter(faction =>
        faction.name.toLowerCase().includes(lowerTopic) ||
        faction.type.toLowerCase().includes(lowerTopic)
      );
      results.push(...matchingFactions.map(faction => ({
        type: 'faction',
        name: faction.name,
        description: `${faction.name} is a ${faction.type}. ${faction.publicImage || ''} Their motto: "${faction.motto || ''}"`,
        details: {
          goals: JSON.parse(faction.goals || '[]'),
          methods: JSON.parse(faction.methods || '[]'),
          influence: faction.influence
        }
      })));
    }
    
    // Search Locations
    if (type === 'any' || type === 'location') {
      const matchingLocations = lore.locations.filter(loc =>
        loc.name.toLowerCase().includes(lowerTopic) ||
        loc.locationType.toLowerCase().includes(lowerTopic) ||
        (loc.region?.toLowerCase().includes(lowerTopic))
      );
      results.push(...matchingLocations.map(loc => ({
        type: 'location',
        name: loc.name,
        description: `${loc.name} is a ${loc.locationType} in ${loc.region || 'the realm'}. ${loc.atmosphere || ''} ${loc.description || ''}`,
        details: {
          sensoryDetails: JSON.parse(loc.sensoryDetails || '{}'),
          currentEvents: JSON.parse(loc.currentEvents || '[]'),
          historicalNote: loc.historicalNote
        }
      })));
    }
    
    // Search Conflicts
    if (type === 'any' || type === 'conflict') {
      const matchingConflicts = lore.conflicts.filter(conf =>
        conf.name.toLowerCase().includes(lowerTopic) ||
        conf.type.toLowerCase().includes(lowerTopic)
      );
      results.push(...matchingConflicts.map(conf => ({
        type: 'conflict',
        name: conf.name,
        description: `${conf.name} is a ${conf.scope} ${conf.type} conflict. ${conf.publicKnowledge || ''}`,
        details: {
          stakes: conf.stakes,
          currentState: conf.currentState,
          recentEvents: JSON.parse(conf.recentEvents || '[]')
        }
      })));
    }
    
    // Search History
    if (type === 'any' || type === 'history') {
      const history = JSON.parse(lore.worldHistory || '[]');
      const matchingHistory = history.filter((era: any) =>
        era.era?.toLowerCase().includes(lowerTopic) ||
        era.significance?.toLowerCase().includes(lowerTopic)
      );
      results.push(...matchingHistory.map((era: any) => ({
        type: 'history',
        name: era.era,
        description: `${era.era} (${era.yearsAgo}): ${era.significance}`,
        details: {}
      })));
    }
    
    return NextResponse.json({
      found: results.length > 0,
      results: results.slice(0, 5) // Limit results
    });
    
  } catch (error) {
    console.error('Error in lore query:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 6. AI FUNCTION ADDITIONS

### 6.1 New Functions for Function Registry

Add to `src/lib/ai/function-registry.ts`:

```typescript
// Lore-related functions

{
  name: 'recall_lore',
  description: 'Query the world lore database for information about a topic. Use when players ask about history, NPCs, factions, or locations that require deeper knowledge.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The topic to search for (e.g., "the thieves guild", "ancient elven ruins", "Baron Harkon")'
      },
      type: {
        type: 'string',
        enum: ['npc', 'faction', 'location', 'conflict', 'history', 'any'],
        description: 'Type of lore to search (default: any)'
      }
    },
    required: ['topic']
  }
},

{
  name: 'reveal_secret',
  description: 'Reveal a campaign secret to the players. Use when players have fulfilled discovery conditions for a secret.',
  parameters: {
    type: 'object',
    properties: {
      secret_name: {
        type: 'string',
        description: 'The internal name of the secret to reveal'
      },
      revelation_context: {
        type: 'string',
        description: 'How the secret is being revealed (found document, NPC confession, observation, etc.)'
      }
    },
    required: ['secret_name', 'revelation_context']
  }
},

{
  name: 'introduce_npc',
  description: 'Formally introduce an NPC to the players, marking them as revealed and providing full personality context.',
  parameters: {
    type: 'object',
    properties: {
      npc_name: {
        type: 'string',
        description: 'Name of the NPC being introduced'
      },
      introduction_type: {
        type: 'string',
        enum: ['first_meeting', 'reputation_heard', 'formal_introduction', 'dramatic_entrance'],
        description: 'How the NPC is being introduced'
      }
    },
    required: ['npc_name', 'introduction_type']
  }
},

{
  name: 'discover_location',
  description: 'Mark a location as discovered by the players, adding it to their known locations.',
  parameters: {
    type: 'object',
    properties: {
      location_name: {
        type: 'string',
        description: 'Name of the location being discovered'
      },
      discovery_method: {
        type: 'string',
        description: 'How the location was discovered (traveled there, heard about, found map, etc.)'
      }
    },
    required: ['location_name', 'discovery_method']
  }
}
```

### 6.2 Function Executor Implementations

Add to `src/lib/ai/function-executor.ts`:

```typescript
// In executeFunction switch statement:

case 'recall_lore': {
  const { topic, type = 'any' } = args;
  
  // This would call the lore API endpoint
  const response = await fetch(`/api/campaign/${context.campaignId}/lore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, type })
  });
  
  const result = await response.json();
  
  if (!result.found) {
    return {
      success: true,
      displayText: `📚 No specific lore found for "${topic}"`,
      data: { found: false }
    };
  }
  
  const summaries = result.results.map((r: any) => 
    `[${r.type.toUpperCase()}] ${r.name}: ${r.description}`
  ).join('\n');
  
  return {
    success: true,
    displayText: `📚 Lore retrieved for "${topic}"`,
    data: result.results,
    contextAddition: summaries // This gets added to AI context
  };
}

case 'reveal_secret': {
  const { secret_name, revelation_context } = args;
  
  // Find and reveal the secret
  const secret = await prisma.loreSecret.findFirst({
    where: {
      campaignLore: { campaignId: context.campaignId },
      name: { contains: secret_name }
    }
  });
  
  if (!secret) {
    return {
      success: false,
      displayText: `Secret "${secret_name}" not found`,
      data: null
    };
  }
  
  // Mark as revealed
  await prisma.loreSecret.update({
    where: { id: secret.id },
    data: { isRevealed: true }
  });
  
  return {
    success: true,
    displayText: `🔓 Secret Revealed: ${secret.name}`,
    data: {
      name: secret.name,
      content: secret.content,
      impact: secret.revealImpact
    },
    contextAddition: `REVEALED SECRET: ${secret.content}`
  };
}

case 'introduce_npc': {
  const { npc_name, introduction_type } = args;
  
  const npc = await prisma.loreNpc.findFirst({
    where: {
      campaignLore: { campaignId: context.campaignId },
      name: { contains: npc_name }
    }
  });
  
  if (!npc) {
    return {
      success: false,
      displayText: `NPC "${npc_name}" not found in lore`,
      data: null
    };
  }
  
  // Mark as revealed
  await prisma.loreNpc.update({
    where: { id: npc.id },
    data: { isRevealed: true }
  });
  
  const personality = JSON.parse(npc.personality || '{}');
  
  return {
    success: true,
    displayText: `👤 NPC Introduced: ${npc.name}`,
    data: {
      name: npc.name,
      role: npc.role,
      speakingStyle: npc.speakingStyle,
      personality
    },
    contextAddition: `INTRODUCED NPC: ${npc.name} (${npc.role}) - Speaks ${npc.speakingStyle || 'normally'}. Traits: ${personality.traits?.join(', ') || 'unknown'}`
  };
}

case 'discover_location': {
  const { location_name, discovery_method } = args;
  
  const location = await prisma.loreLocation.findFirst({
    where: {
      campaignLore: { campaignId: context.campaignId },
      name: { contains: location_name }
    }
  });
  
  if (!location) {
    return {
      success: false,
      displayText: `Location "${location_name}" not found in lore`,
      data: null
    };
  }
  
  // Mark as discovered
  await prisma.loreLocation.update({
    where: { id: location.id },
    data: { isDiscovered: true }
  });
  
  const sensory = JSON.parse(location.sensoryDetails || '{}');
  
  return {
    success: true,
    displayText: `🗺️ Location Discovered: ${location.name}`,
    data: {
      name: location.name,
      type: location.locationType,
      description: location.description,
      atmosphere: location.atmosphere,
      sensoryDetails: sensory
    },
    contextAddition: `DISCOVERED LOCATION: ${location.name} - ${location.atmosphere || location.description}`
  };
}
```

---

## 7. AUTO-TRIGGER ON CAMPAIGN CREATION

### 7.1 Modify Campaign Creation Route

Update `src/app/api/campaign/route.ts` to auto-trigger lore generation:

```typescript
// In POST handler, after creating campaign and gameState:

// Auto-trigger lore generation if description is substantial
if (description && description.length >= 50) {
  // Non-blocking enqueue
  loreGenerationQueue.enqueue(campaign.id)
    .then(result => {
      if (result.success) {
        // Start generation in background
        // In production, this would be a job queue dispatch
        loreGenerationService.generateLore(campaign.id)
          .catch(err => console.error('Lore generation failed:', err));
      }
    })
    .catch(err => console.error('Failed to enqueue lore generation:', err));
}

return NextResponse.json({ data: campaign });
```

---

## 8. EDGE CASES AND RACE CONDITIONS

### 8.1 Race Condition: Multiple Generation Triggers

**Scenario**: User creates campaign, then immediately clicks "Regenerate Lore" before the auto-trigger completes.

**Mitigation**: The `LoreGenerationQueue.enqueue()` method is idempotent. It checks for existing records before creating new ones. If a record exists in `generating` status, it returns early without starting another generation.

**Code Path**:
```
Request 1: enqueue(campaign123) → creates record with status='pending'
Request 2: enqueue(campaign123) → finds existing record, returns {alreadyExists: true}
Worker 1: claimNextJob() → atomic update from 'pending' to 'generating'
Worker 2: claimNextJob() → atomic update fails (status no longer 'pending')
```

### 8.2 Edge Case: Server Crash Mid-Generation

**Scenario**: Server crashes while generating Phase 3 (NPCs). Phases 1-2 are complete.

**Mitigation**: 
1. Each phase stores data independently before moving to the next.
2. The `checkPhaseComplete()` method examines actual data, not status flags.
3. On restart, calling `generateLore()` will skip Phases 1-2 and resume from Phase 3.
4. Stale job detection: Jobs with `status='generating'` and `startedAt > 10 minutes ago` are reset to `pending`.

### 8.3 Edge Case: AI Returns Invalid JSON

**Scenario**: The AI returns malformed JSON or unexpected structure.

**Mitigation**: The `parseJsonFromResponse()` method tries multiple extraction strategies. If all fail, it throws an error that's caught by the phase executor, marking the job as failed. The partial data from previous phases is preserved.

### 8.4 Edge Case: Token Limit Exceeded During Generation

**Scenario**: The AI's response is truncated due to token limits.

**Mitigation**: We request modest amounts of content per phase (5-15 items). If truncation occurs, partial JSON might be parseable. If not, we fail the phase gracefully and retry.

### 8.5 Edge Case: Concurrent Access to Lore During Generation

**Scenario**: Player starts adventure while lore is still generating. Some phases complete, others don't.

**Mitigation**: The `LoreContextManager.generateLoreContext()` method checks `generationStatus`. If not 'completed', it returns minimal context. As phases complete, more lore becomes available. The context injection naturally incorporates whatever lore exists.

---

## 9. TESTING STRATEGY

### 9.1 Unit Tests

```typescript
// src/lib/lore/lore-generation-service.test.ts

describe('LoreGenerationService', () => {
  describe('parseJsonFromResponse', () => {
    it('parses clean JSON', () => {
      const input = '{"worldName": "Eldoria"}';
      expect(service.parseJsonFromResponse(input)).toEqual({ worldName: 'Eldoria' });
    });
    
    it('extracts JSON from markdown code block', () => {
      const input = '```json\n{"worldName": "Eldoria"}\n```';
      expect(service.parseJsonFromResponse(input)).toEqual({ worldName: 'Eldoria' });
    });
    
    it('finds JSON object in mixed text', () => {
      const input = 'Here is the result: {"worldName": "Eldoria"} Hope that helps!';
      expect(service.parseJsonFromResponse(input)).toEqual({ worldName: 'Eldoria' });
    });
    
    it('throws on unparseable input', () => {
      const input = 'No JSON here at all';
      expect(() => service.parseJsonFromResponse(input)).toThrow();
    });
  });
  
  describe('phaseSkipLogic', () => {
    it('skips phase when data exists', async () => {
      // Setup: Create campaign with existing worldName
      const campaign = await createTestCampaign();
      await prisma.campaignLore.create({
        data: { campaignId: campaign.id, worldName: 'TestWorld' }
      });
      
      // Act
      const shouldSkip = await service.checkPhaseComplete(campaign.id, 'world_foundation');
      
      // Assert
      expect(shouldSkip).toBe(true);
    });
    
    it('does not skip phase when data is empty', async () => {
      const campaign = await createTestCampaign();
      await prisma.campaignLore.create({
        data: { campaignId: campaign.id }
      });
      
      const shouldSkip = await service.checkPhaseComplete(campaign.id, 'world_foundation');
      
      expect(shouldSkip).toBe(false);
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// src/lib/lore/lore-context-manager.test.ts

describe('LoreContextManager', () => {
  describe('generateLoreContext', () => {
    it('returns minimal context for incomplete lore', async () => {
      const campaign = await createTestCampaignWithPendingLore();
      
      const context = await loreContextManager.generateLoreContext(
        campaign.id,
        null,
        [],
        500
      );
      
      expect(context).toContain('World lore is being generated');
    });
    
    it('includes NPCs at current location', async () => {
      const campaign = await createTestCampaignWithFullLore();
      const location = await prisma.loreLocation.findFirst({
        where: { campaignLore: { campaignId: campaign.id } }
      });
      
      const context = await loreContextManager.generateLoreContext(
        campaign.id,
        location!.name,
        [],
        500
      );
      
      expect(context).toContain('RELEVANT NPCs');
    });
    
    it('respects token budget', async () => {
      const campaign = await createTestCampaignWithFullLore();
      
      const smallBudget = await loreContextManager.generateLoreContext(
        campaign.id,
        null,
        [],
        100 // Very small budget
      );
      
      const largeBudget = await loreContextManager.generateLoreContext(
        campaign.id,
        null,
        [],
        1000 // Large budget
      );
      
      expect(smallBudget.length).toBeLessThan(largeBudget.length);
    });
  });
});
```

### 9.3 Property Tests

```typescript
// Property: Idempotent generation
test.prop([fc.uuid()], (campaignId) => {
  // Multiple enqueue calls for the same campaign should be idempotent
  const result1 = await loreGenerationQueue.enqueue(campaignId);
  const result2 = await loreGenerationQueue.enqueue(campaignId);
  
  // Both should return the same job ID (which is the campaignId)
  if (result1.success && result2.success) {
    expect(result1.job?.id).toEqual(result2.job?.id);
  }
});

// Property: All NPCs have valid faction references
test.prop([], async () => {
  const campaigns = await prisma.campaign.findMany({
    include: { lore: { include: { npcs: true, factions: true } } }
  });
  
  for (const campaign of campaigns) {
    if (!campaign.lore) continue;
    
    const factionIds = new Set(campaign.lore.factions.map(f => f.id));
    
    for (const npc of campaign.lore.npcs) {
      if (npc.factionId) {
        expect(factionIds.has(npc.factionId)).toBe(true);
      }
    }
  }
});
```

---

## 10. IMPLEMENTATION CHECKLIST

- [ ] **Database Schema**
  - [ ] Add CampaignLore model to Prisma
  - [ ] Add LoreNpc, LoreFaction, LoreLocation, LoreConflict, LoreSecret models
  - [ ] Add relation from Campaign to CampaignLore
  - [ ] Run `npx prisma db push`
  
- [ ] **Generation Queue**
  - [ ] Create `src/lib/lore/lore-generation-queue.ts`
  - [ ] Implement enqueue, claimNextJob, markCompleted, markFailed
  - [ ] Add stale job detection
  
- [ ] **Generation Service**
  - [ ] Create `src/lib/lore/lore-generation-service.ts`
  - [ ] Implement all 6 generation phases
  - [ ] Add JSON parsing fallbacks
  - [ ] Add phase skip logic
  
- [ ] **Context Manager**
  - [ ] Create `src/lib/lore/lore-context-manager.ts`
  - [ ] Implement tiered injection
  - [ ] Add relevance scoring
  - [ ] Add token budget management
  
- [ ] **StateGuardian Integration**
  - [ ] Modify `generateContextInjection()` to include lore
  - [ ] Add lore context to campaign intro generation
  
- [ ] **API Endpoints**
  - [ ] Create `POST /api/campaign/[id]/generate-lore`
  - [ ] Create `GET /api/campaign/[id]/lore-status`
  - [ ] Create `POST /api/campaign/[id]/lore`
  
- [ ] **AI Functions**
  - [ ] Add recall_lore to function registry
  - [ ] Add reveal_secret to function registry
  - [ ] Add introduce_npc to function registry
  - [ ] Add discover_location to function registry
  - [ ] Implement all in function executor
  
- [ ] **Auto-Trigger**
  - [ ] Modify campaign creation to trigger lore generation
  
- [ ] **Tests**
  - [ ] Unit tests for generation service
  - [ ] Integration tests for context manager
  - [ ] Property tests for data consistency
  
- [ ] **UI (Optional)**
  - [ ] Lore generation progress indicator
  - [ ] Lore browser/viewer
  - [ ] Manual lore editing

---

## 11. FUTURE ENHANCEMENTS

1. **Streaming Generation Progress**: Use Server-Sent Events to stream generation progress in real-time.

2. **External Job Queue**: Integrate with Inngest, Trigger.dev, or AWS SQS for true background processing.

3. **Lore Regeneration**: Allow regenerating specific sections while preserving others.

4. **Custom Lore Import**: Allow users to import their own lore in a structured format.

5. **Lore Consistency Checker**: Post-generation validation that ensures cross-references are valid.

6. **NPC Dialogue Generation**: Generate sample dialogue lines for each NPC based on their personality.

7. **Map Generation**: Generate visual representations of geography based on location lore.

8. **Timeline Visualization**: Create a visual timeline of world history events.
