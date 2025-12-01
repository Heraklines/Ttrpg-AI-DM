# Campaign World Lore Generation - Requirements Specification

## 1. Overview

This feature enables automatic generation of rich world lore when a player finishes describing their campaign setting. The generated lore should be stored in a campaign-specific database and intelligently injected into the AI context during gameplay.

---

## 2. Functional Requirements

### 2.1 Lore Generation Trigger

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | System SHALL automatically trigger lore generation when a campaign is created with a description >= 50 characters | HIGH |
| FR-002 | System SHALL provide a manual "Regenerate Lore" endpoint for explicit triggering | MEDIUM |
| FR-003 | System SHALL NOT trigger duplicate generation for the same campaign | HIGH |
| FR-004 | System SHALL allow lore generation to proceed asynchronously without blocking the user | HIGH |

### 2.2 Lore Content Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | System SHALL generate world foundation (name, tone, themes, cosmology, history) | HIGH |
| FR-011 | System SHALL generate 5-8 factions with goals, methods, and relationships | HIGH |
| FR-012 | System SHALL generate 10-15 NPCs with personalities, motivations, and relationships | HIGH |
| FR-013 | System SHALL generate 4-6 conflicts with participants, stakes, and resolution paths | HIGH |
| FR-014 | System SHALL generate 10-15 locations with descriptions, atmosphere, and connections | HIGH |
| FR-015 | System SHALL generate 8-12 secrets with hints and discovery conditions | HIGH |
| FR-016 | System SHALL ensure generated content references elements from previous phases | MEDIUM |
| FR-017 | System SHALL integrate player character backstories into generated lore when available | MEDIUM |

### 2.3 Lore Storage

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-020 | System SHALL store lore in a campaign-specific database structure (1:1 with Campaign) | HIGH |
| FR-021 | System SHALL store NPCs, factions, locations, conflicts, and secrets in separate queryable models | HIGH |
| FR-022 | System SHALL track generation status (pending, generating, completed, failed) | HIGH |
| FR-023 | System SHALL track which lore elements have been revealed to players | MEDIUM |
| FR-024 | System SHALL preserve partial progress if generation fails mid-process | MEDIUM |

### 2.4 Context Injection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | System SHALL inject relevant lore into AI context during gameplay | HIGH |
| FR-031 | System SHALL prioritize lore based on relevance to current location and recent mentions | HIGH |
| FR-032 | System SHALL respect token budget when injecting lore context | HIGH |
| FR-033 | System SHALL use tiered injection (always-present, situational, on-demand) | MEDIUM |
| FR-034 | System SHALL provide AI functions to query deeper lore (recall_lore) | MEDIUM |
| FR-035 | System SHALL provide AI functions to reveal secrets (reveal_secret) | MEDIUM |
| FR-036 | System SHALL provide AI functions to introduce NPCs (introduce_npc) | MEDIUM |

### 2.5 Status and Progress

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-040 | System SHALL provide an endpoint to check lore generation status | HIGH |
| FR-041 | System SHALL report current generation phase during processing | MEDIUM |
| FR-042 | System SHALL provide summary statistics of generated lore | MEDIUM |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | Lore generation SHOULD complete within 60 seconds for typical campaigns | MEDIUM |
| NFR-002 | Context injection MUST complete within 200ms to not impact response time | HIGH |
| NFR-003 | Lore queries (recall_lore) SHOULD respond within 100ms | MEDIUM |

### 3.2 Reliability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-010 | System MUST be idempotent - multiple triggers produce same result | HIGH |
| NFR-011 | System MUST handle AI API failures gracefully with retry logic | HIGH |
| NFR-012 | System MUST preserve partial data on failure | MEDIUM |
| NFR-013 | System MUST detect and recover from stale generation jobs | MEDIUM |

### 3.3 Data Integrity

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-020 | All lore MUST be strictly scoped to its campaign (no cross-campaign contamination) | HIGH |
| NFR-021 | Foreign key references within lore MUST be valid | HIGH |
| NFR-022 | Deleting a campaign MUST cascade delete all associated lore | HIGH |

### 3.4 Scalability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-030 | System SHOULD support concurrent generation for multiple campaigns | MEDIUM |
| NFR-031 | Database queries SHOULD use indexes for efficient filtering | MEDIUM |

---

## 4. Acceptance Criteria

### AC-001: Automatic Lore Generation
**Given** a user creates a campaign with description "A dark fantasy world where ancient evils stir beneath forgotten ruins"
**When** the campaign is saved
**Then** lore generation begins automatically
**And** the user can immediately access the campaign without waiting

### AC-002: Generation Completion
**Given** lore generation has started
**When** all 6 phases complete successfully
**Then** the campaign lore status shows "completed"
**And** all lore categories have content (NPCs > 0, factions > 0, etc.)

### AC-003: Context Injection
**Given** a campaign has completed lore generation
**And** a player is in a specific location
**When** the player takes an action
**Then** the AI context includes relevant NPCs at that location
**And** the AI context includes relevant conflicts affecting that area

### AC-004: Partial Failure Recovery
**Given** lore generation has completed phases 1-3
**When** phase 4 fails due to AI API error
**Then** phases 1-3 data is preserved
**And** regeneration attempt skips completed phases
**And** status shows "failed" with error message

### AC-005: Idempotent Triggering
**Given** lore generation is in progress for campaign X
**When** another request triggers generation for campaign X
**Then** no duplicate generation starts
**And** the existing job continues unaffected

### AC-006: Recall Lore Function
**Given** a campaign with completed lore
**When** the AI calls recall_lore("the thieves guild")
**Then** matching faction and NPC information is returned
**And** the information is added to AI context

### AC-007: NPC Introduction Tracking
**Given** an NPC "Baron Harkon" exists in lore with isRevealed=false
**When** the AI calls introduce_npc("Baron Harkon")
**Then** the NPC is marked as revealed
**And** future context injections include this NPC's full details

---

## 5. User Stories

### US-001: Campaign Creator
**As a** campaign creator
**I want** the system to automatically generate rich world lore from my description
**So that** I can start playing immediately without spending hours on world-building

### US-002: Game Master
**As a** GM playing through the campaign
**I want** the AI to naturally incorporate world lore into its narration
**So that** the world feels consistent and deep

### US-003: Player
**As a** player asking about world history
**I want** the AI to have knowledge of the world's past
**So that** my questions about lore get meaningful answers

### US-004: Campaign Manager
**As a** campaign manager
**I want** to see what lore has been generated and what players have discovered
**So that** I can track narrative progress

---

## 6. Out of Scope

The following are explicitly NOT part of this feature:

1. Visual map generation
2. NPC portrait/image generation
3. Voice lines or audio content
4. Real-time collaborative lore editing
5. Import from external world-building tools
6. Lore version history/rollback
