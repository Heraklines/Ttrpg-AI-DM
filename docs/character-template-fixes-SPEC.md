# Character and Template Fixes - Complete Specification

## 1. Overview

This specification addresses three issues in the Arcane Gamemaster application:
1. **Double-click bug**: Prevent duplicate character creation on multiple clicks
2. **Character persistence**: Fix character display on setup page
3. **Campaign templates**: Add system for saving and reusing campaign configurations

---

## 2. Requirements

### 2.1 Prevent Duplicate Character Creation

**User Story:** As a player, I want the character creation button to only create one character even if I click it multiple times.

| ID | Acceptance Criteria |
|----|---------------------|
| 1.1 | Button disables immediately on click, prevents additional submissions |
| 1.2 | Loading indicator displayed during request |
| 1.3 | Button re-enabled on error with error message |
| 1.4 | Success navigates away without allowing additional submissions |

### 2.2 Fix Character Persistence

**User Story:** As a player, I want characters I create to be saved and appear in my campaign.

| ID | Acceptance Criteria |
|----|---------------------|
| 2.1 | Character persisted to database with correct campaignId |
| 2.2 | Setup page displays all campaign characters |
| 2.3 | Adventure page displays all campaign characters |
| 2.4 | API returns complete character object with id on success |

### 2.3 Campaign Template System

**User Story:** As a DM, I want to save campaign configurations as templates for reuse.

| ID | Acceptance Criteria |
|----|---------------------|
| 3.1 | Option to save configuration as template on campaign creation |
| 3.2 | Template list displayed in campaign creation form |
| 3.3 | Selecting template pre-fills form with name pattern and description |
| 3.4 | Template name and description persisted to database |
| 3.5 | New campaign from template gets unique derived name |
| 3.6 | Template list shows name and description |
| 3.7 | Deleting template doesn't affect campaigns created from it |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
│  Character Creation Wizard │ Setup Page │ Campaigns Page        │
│  - Add useRef for submit   │ - Fix API  │ - Template selector   │
│  - Disable on click        │   calls    │ - Save as template    │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  /api/character (fix GET)  │  /api/campaign-template (new)      │
│  - Support optional        │  - GET: list templates             │
│    campaignId              │  - POST: create template           │
│                            │  - DELETE: remove template         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│  Character (existing)      │  CampaignTemplate (new)            │
│  - campaignId required     │  - id, name, description           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation

### 4.1 Character Creation Wizard Fix

**File**: `src/app/campaign/[id]/character/new/page.tsx`

```typescript
// Add ref to prevent double submission
const isSubmitting = useRef(false);

async function createCharacter() {
  // Prevent double submission
  if (isSubmitting.current || saving) return;
  isSubmitting.current = true;
  
  // ... existing validation and API call
  
  // Only reset on error (success navigates away)
  if (error) {
    isSubmitting.current = false;
  }
}
```

### 4.2 Setup Page Fix

**File**: `src/app/campaign/[id]/setup/page.tsx`

```typescript
// Current (broken):
const charsRes = await fetch('/api/character');

// Fixed:
const charsRes = await fetch(`/api/character?campaignId=${campaignId}`);
```

### 4.3 Campaign Template Database

**File**: `prisma/schema.prisma`

```prisma
model CampaignTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.4 Template API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/campaign-template | List all templates |
| POST | /api/campaign-template | Create new template |
| DELETE | /api/campaign-template/[id] | Delete template |

---

## 5. Correctness Properties

| Property | Description | Validates |
|----------|-------------|-----------|
| 1 | Rapid clicks create exactly one character | Req 1.1 |
| 2 | Created character appears in campaign fetch | Req 2.1, 2.4 |
| 3 | Campaign with N characters displays N on both pages | Req 2.2, 2.3 |
| 4 | Created template appears in template list | Req 3.4 |
| 5 | Selected template pre-fills exact values | Req 3.3 |
| 6 | N templates in DB = N templates displayed | Req 3.2 |
| 7 | Deleting template doesn't affect created campaigns | Req 3.7 |

---

## 6. Implementation Tasks

### ✅ COMPLETED

- [x] 1.1 Add useRef for submission state in character wizard
- [x] 1.2 Write property test for double-click prevention
- [x] 2.1 Fix setup page character fetching with campaignId
- [x] 2.2 Write property test for character round-trip
- [x] 2.3 Write property test for character display consistency
- [x] 4.1 Add CampaignTemplate model to Prisma
- [x] 5.1 Create GET/POST /api/campaign-template route
- [x] 5.2 Create DELETE /api/campaign-template/[id] route
- [x] 5.3-5.4 Write property tests for template operations
- [x] 6.1 Add template selector to campaign creation form
- [x] 6.2 Add "Save as template" option
- [x] 6.3 Add template management UI
- [x] 6.4-6.5 Write property tests for template UI

---

## 7. Error Handling

| Scenario | Handling |
|----------|----------|
| Character creation fails | Re-enable button, display error, reset isSubmitting |
| Template creation fails | Display error toast, keep form data |
| Template deletion fails | Display error toast, keep template in list |
| Network error | Display error message, allow retry |
