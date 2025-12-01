# Implementation Plan

## ✅ COMPLETED PHASES

- [x] 1. Fix double-click character creation bug (COMPLETED)






  - [x] 1.1 Add useRef to track submission state in character creation wizard

    - Add `isSubmitting` ref initialized to `false`
    - Check ref at start of `createCharacter()` function
    - Set ref to `true` synchronously before any async operations
    - Only reset ref on error (success navigates away)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Write property test for double-click prevention

    - **Property 1: Double-click prevention**
    - **Validates: Requirements 1.1**

- [x] 2. Fix character persistence and display





  - [x] 2.1 Fix setup page character fetching


    - Update `/api/character` call to include `?campaignId=${campaignId}` parameter
    - Remove logic that tries to fetch characters without campaignId
    - Simplify character filtering since all fetched characters belong to campaign
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Write property test for character round-trip

    - **Property 2: Character creation round-trip**
    - **Validates: Requirements 2.1, 2.4**

  - [x] 2.3 Write property test for character display consistency

    - **Property 3: Campaign characters display consistency**
    - **Validates: Requirements 2.2, 2.3**
-

- [x] 3. Checkpoint - Verify bug fixes




  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Add campaign template database model





  - [x] 4.1 Add CampaignTemplate model to Prisma schema

    - Add model with id, name, description, createdAt, updatedAt fields
    - Run `npx prisma db push` to apply schema changes
    - _Requirements: 3.4_

- [x] 5. Create campaign template API endpoints





  - [x] 5.1 Create GET/POST /api/campaign-template route


    - Create `src/app/api/campaign-template/route.ts`
    - Implement GET to list all templates
    - Implement POST to create new template with Zod validation
    - _Requirements: 3.2, 3.4_

  - [x] 5.2 Create DELETE /api/campaign-template/[id] route

    - Create `src/app/api/campaign-template/[id]/route.ts`
    - Implement DELETE to remove template by id
    - _Requirements: 3.7_

  - [x] 5.3 Write property test for template round-trip

    - **Property 4: Template persistence round-trip**
    - **Validates: Requirements 3.4**

  - [x] 5.4 Write property test for template deletion isolation

    - **Property 7: Template deletion isolation**
    - **Validates: Requirements 3.7**
-

- [x] 6. Add template UI to campaigns page




  - [x] 6.1 Add template selector to campaign creation form


    - Fetch templates on page load
    - Add dropdown to select from existing templates
    - Pre-fill form fields when template is selected
    - _Requirements: 3.2, 3.3_
  - [x] 6.2 Add "Save as template" option


    - Add checkbox to save current configuration as template
    - Create template when checkbox is checked and campaign is created
    - _Requirements: 3.1, 3.4_
  - [x] 6.3 Add template management UI


    - Display template list with delete buttons
    - Show template name and description
    - _Requirements: 3.6, 3.7_
  - [x] 6.4 Write property test for template pre-fill


    - **Property 5: Template pre-fill accuracy**
    - **Validates: Requirements 3.3**
  - [x] 6.5 Write property test for template listing


    - **Property 6: Template listing completeness**
    - **Validates: Requirements 3.2**
-

- [x] 7. Final Checkpoint - Verify all functionality (COMPLETED)




  - Ensure all tests pass, ask the user if questions arise.

---

## 🚧 PHASE 2: Campaign World Lore Generation System

### Overview
When a player finishes describing their campaign setting, the system should automatically generate rich world lore, conflicts, NPCs, geography, and narrative hooks in the background. This generated content should be stored in a campaign-specific database and intelligently injected into the AI context during gameplay.

- [ ] 8. Design and implement CampaignLore database schema



  - [ ] 8.1 Add CampaignLore model to Prisma schema
    - Fields: id, campaignId (FK unique), generationStatus, worldHistory, factions, keyNpcs, conflicts, geography, secrets, generatedAt
    - Establish 1:1 relationship with Campaign
    - Add indexes for efficient querying

  - [ ] 8.2 Add LoreNpc model for detailed NPC storage
    - Fields: id, campaignLoreId (FK), name, role, personality, motivations, secrets, relationships, location, appearance
    
  - [ ] 8.3 Add LoreFaction model for faction tracking
    - Fields: id, campaignLoreId (FK), name, type, goals, resources, relationships, territory, influence

  - [ ] 8.4 Add LoreLocation model for geography
    - Fields: id, campaignLoreId (FK), name, locationType, description, significance, connectedLocations, secrets

  - [ ] 8.5 Add LoreConflict model for narrative tension tracking
    - Fields: id, campaignLoreId (FK), name, type, participants, stakes, currentState, possibleResolutions

- [ ] 9. Create async background lore generation service



  - [ ] 9.1 Create LoreGenerationQueue system
    - Implement job queue with status tracking (pending, processing, completed, failed)
    - Add retry logic with exponential backoff
    - Implement idempotency to prevent duplicate generation

  - [ ] 9.2 Create LoreGenerationService class
    - Implement multi-phase generation (world history → factions → NPCs → conflicts → geography)
    - Add structured prompts for each generation phase
    - Implement validation of generated content

  - [ ] 9.3 Create POST /api/campaign/[id]/generate-lore endpoint
    - Trigger async generation after campaign creation
    - Return job ID for status polling
    
  - [ ] 9.4 Create GET /api/campaign/[id]/lore-status endpoint
    - Return generation progress and partial results

- [ ] 10. Implement intelligent context injection strategy



  - [ ] 10.1 Create LoreContextManager class
    - Implement relevance scoring based on current location, NPCs mentioned, active conflicts
    - Create tiered injection (always-present, situational, on-demand)
    - Implement token budget management

  - [ ] 10.2 Integrate with StateGuardian
    - Modify generateContextInjection() to include relevant lore
    - Add lore summary to campaign intro generation
    - Create lore-aware location inference

  - [ ] 10.3 Create lore-specific AI functions
    - Add recall_lore(topic) function for AI to query lore database
    - Add reveal_secret(secret_id) function for dramatic reveals
    - Add introduce_npc(npc_id) function with full personality context

- [ ] 11. Create lore management UI



  - [ ] 11.1 Add lore generation progress indicator to campaign page
  - [ ] 11.2 Create lore browser/viewer component
  - [ ] 11.3 Add manual lore editing capability

- [ ] 12. Testing and validation



  - [ ] 12.1 Write unit tests for LoreGenerationService
  - [ ] 12.2 Write integration tests for context injection
  - [ ] 12.3 Write property tests for lore consistency

