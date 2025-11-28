# Implementation Plan

- [x] 1. Fix double-click character creation bug






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

- [x] 7. Final Checkpoint - Verify all functionality




  - Ensure all tests pass, ask the user if questions arise.

