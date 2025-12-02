# Requirements Document

## Introduction

This document specifies the requirements for an automated Campaign World Generation system that enriches campaign descriptions with deep, interconnected lore, NPCs, conflicts, geography, and narrative hooks. When a player finishes describing their campaign setting, the system asynchronously generates rich world content using an LLM, stores it in campaign-specific database tables, and intelligently injects relevant context into the adventure AI's prompts to create a coherent, immersive experience.

## Glossary

- **World Generation Engine**: The subsystem responsible for orchestrating LLM calls to generate campaign lore, NPCs, locations, factions, and conflicts from a campaign description.
- **Campaign Lore**: Background information about the world including history, mythology, magic systems, and cultural details tied to a specific campaign.
- **NPC (Non-Player Character)**: A character in the game world controlled by the AI DM, with defined personality, motivations, relationships, and secrets.
- **Faction**: An organized group within the campaign world with goals, resources, relationships to other factions, and influence over locations.
- **Conflict**: A tension, dispute, or struggle within the world that creates narrative opportunities—can be between factions, NPCs, or environmental/supernatural forces.
- **Geography Node**: A location in the campaign world with description, connections to other locations, associated NPCs, and narrative significance.
- **Context Injection**: The process of selecting and formatting relevant world data to include in AI prompts during gameplay.
- **Relevance Scoring**: An algorithm that determines which world elements are most pertinent to the current game situation.
- **Generation Job**: An async background task that processes world generation, tracking progress and allowing the player to continue other activities.

## Requirements

### Requirement 1

**User Story:** As a player, I want the system to automatically generate rich world details from my campaign description, so that I have a deep, coherent setting without manual worldbuilding effort.

#### Acceptance Criteria

1. WHEN a player saves a campaign with a description of at least 50 characters THEN the World Generation Engine SHALL initiate an asynchronous generation job within 2 seconds
2. WHEN the generation job starts THEN the system SHALL create a Generation Job record with status "pending" and store the campaign ID reference
3. WHEN the LLM generates world content THEN the system SHALL parse the structured output and create database records for each generated element (lore entries, NPCs, factions, locations, conflicts)
4. WHEN generation completes successfully THEN the system SHALL update the Generation Job status to "completed" and store a timestamp
5. IF the LLM call fails or times out THEN the system SHALL update the Generation Job status to "failed", store the error message, and allow manual retry
6. WHEN a generation job is in progress THEN the system SHALL provide a progress indicator showing approximate completion percentage

### Requirement 2

**User Story:** As a player, I want generated NPCs to have distinct personalities, motivations, and secrets, so that interactions feel meaningful and characters are memorable.

#### Acceptance Criteria

1. WHEN generating NPCs THEN the World Generation Engine SHALL create at least 5 NPCs with unique names, roles, and personality traits
2. WHEN an NPC is generated THEN the NPC record SHALL include: name, role/occupation, physical description, personality traits (array), motivations (array), secrets (array), relationships to other NPCs (array of references), and associated location ID
3. WHEN generating NPC relationships THEN the system SHALL ensure bidirectional consistency (if NPC A is enemy of NPC B, NPC B references NPC A as enemy)
4. WHEN an NPC has secrets THEN at least one secret SHALL be narratively actionable (can trigger quests or revelations)
5. WHEN generating NPCs THEN the system SHALL distribute them across generated locations proportionally

### Requirement 3

**User Story:** As a player, I want the generated world to have interconnected factions with competing goals, so that political intrigue and alliance opportunities emerge naturally.

#### Acceptance Criteria

1. WHEN generating factions THEN the World Generation Engine SHALL create at least 3 factions with distinct ideologies and goals
2. WHEN a faction is generated THEN the faction record SHALL include: name, description, goals (array), resources/strengths, weaknesses, leader NPC reference, member NPCs (array), controlled locations (array), and relationships to other factions (ally/neutral/rival/enemy)
3. WHEN generating faction relationships THEN the system SHALL ensure at least one pair of factions has a "rival" or "enemy" relationship to create inherent conflict
4. WHEN a faction controls a location THEN that location record SHALL reference the controlling faction

### Requirement 4

**User Story:** As a player, I want generated locations to form a coherent geography with logical connections, so that travel and exploration feel grounded in a real world.

#### Acceptance Criteria

1. WHEN generating locations THEN the World Generation Engine SHALL create at least 8 distinct locations with varied types (settlement, wilderness, dungeon, landmark)
2. WHEN a location is generated THEN the location record SHALL include: name, type, description, notable features (array), connected locations (array with travel descriptions), present NPCs (array), controlling faction (optional), and danger level (1-5)
3. WHEN generating location connections THEN the system SHALL ensure the location graph is connected (every location reachable from every other location)
4. WHEN generating locations THEN the system SHALL include at least one location of each type: safe haven, dangerous area, and mystery/unexplored area
5. WHEN a location is generated THEN the description SHALL include sensory details (sights, sounds, smells) for immersive narration

### Requirement 5

**User Story:** As a player, I want the generated world to contain conflicts and tensions at multiple scales, so that there are always narrative hooks and stakes.

#### Acceptance Criteria

1. WHEN generating conflicts THEN the World Generation Engine SHALL create at least 4 conflicts of varying scope (personal, local, regional, world-threatening)
2. WHEN a conflict is generated THEN the conflict record SHALL include: name, description, scope (personal/local/regional/world), involved parties (NPC and faction references), current status (brewing/active/climax/resolved), potential resolutions (array), and consequences of inaction
3. WHEN generating conflicts THEN the system SHALL ensure at least one conflict directly involves a player-accessible location
4. WHEN conflicts reference NPCs or factions THEN those entities SHALL have corresponding references back to the conflict

### Requirement 6

**User Story:** As a player, I want generated lore to include history, mythology, and cultural details, so that the world feels ancient and lived-in.

#### Acceptance Criteria

1. WHEN generating lore THEN the World Generation Engine SHALL create entries for: world history (at least 3 historical events), mythology/religion (at least 2 belief systems), and cultural practices (at least 2 distinct cultures)
2. WHEN a lore entry is generated THEN the lore record SHALL include: title, category (history/mythology/culture/magic/other), content text, related entities (NPC/faction/location references), and common knowledge flag (boolean indicating if NPCs would freely share this)
3. WHEN generating historical events THEN the system SHALL ensure events have consequences visible in the current world state (ruined locations, faction grudges, NPC backstories)
4. WHEN generating mythology THEN the system SHALL tie at least one belief system to an active faction or NPC motivation

### Requirement 7

**User Story:** As a DM AI, I want relevant world context injected into my prompts based on the current game situation, so that my narration is consistent with established lore and NPCs.

#### Acceptance Criteria

1. WHEN the adventure AI processes a player action THEN the Context Injection system SHALL query the campaign's world data and include relevant elements in the prompt
2. WHEN the party is at a specific location THEN the Context Injection system SHALL include: the location's full description, present NPCs with their personalities and current motivations, active conflicts at that location, and controlling faction details
3. WHEN an NPC is mentioned or interacted with THEN the Context Injection system SHALL include: the NPC's full profile, their relationships, their secrets (marked as DM-only knowledge), and relevant lore they would know
4. WHEN a faction is relevant to the current scene THEN the Context Injection system SHALL include: faction goals, their stance toward the party (if established), and current faction-related conflicts
5. WHEN injecting context THEN the system SHALL limit total injected content to 2000 tokens to avoid prompt bloat, prioritizing by relevance score

### Requirement 8

**User Story:** As a system architect, I want world data stored in normalized, campaign-scoped database tables, so that data is isolated between campaigns and efficiently queryable.

#### Acceptance Criteria

1. WHEN world data is stored THEN each record (NPC, faction, location, conflict, lore) SHALL include a campaignId foreign key referencing the owning campaign
2. WHEN a campaign is deleted THEN all associated world data records SHALL be cascade deleted
3. WHEN querying world data THEN the system SHALL always filter by campaignId to prevent cross-campaign data leakage
4. WHEN storing NPC relationships THEN the system SHALL use a junction table pattern to support many-to-many relationships with relationship type metadata
5. WHEN storing entity references in JSON fields THEN the system SHALL use entity IDs (not names) to maintain referential integrity

### Requirement 9

**User Story:** As a player, I want to be able to view and optionally edit generated world content, so that I can customize the world to my preferences.

#### Acceptance Criteria

1. WHEN generation completes THEN the system SHALL provide an API endpoint to retrieve all generated world data for a campaign
2. WHEN retrieving world data THEN the API SHALL return structured JSON with NPCs, factions, locations, conflicts, and lore organized by category
3. WHEN a player updates a generated entity THEN the system SHALL persist the changes and mark the entity as "player_modified" to prevent regeneration overwrites
4. WHEN a player requests regeneration THEN the system SHALL only regenerate entities not marked as "player_modified"

### Requirement 10

**User Story:** As a developer, I want the world generation to use structured LLM output with validation, so that parsing is reliable and data integrity is maintained.

#### Acceptance Criteria

1. WHEN calling the LLM for world generation THEN the system SHALL provide a JSON schema defining the expected output structure
2. WHEN the LLM returns content THEN the system SHALL validate the response against the schema before database insertion
3. IF the LLM response fails schema validation THEN the system SHALL attempt one retry with an error correction prompt
4. WHEN parsing LLM output THEN the system SHALL handle missing optional fields gracefully with sensible defaults
5. WHEN the LLM generates entity references THEN the system SHALL resolve temporary IDs to database IDs after all entities are created

