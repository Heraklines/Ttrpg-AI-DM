# Design Document: Character and Template Fixes

## Overview

This design addresses three issues in the Arcane Gamemaster application:
1. **Double-click bug**: Prevent duplicate character creation when users click the submit button multiple times
2. **Character persistence**: Fix the character display on the setup page by properly fetching campaign characters
3. **Campaign templates**: Add a system for saving and reusing campaign configurations

## Architecture

The changes span three layers:
- **Database**: Add a new `CampaignTemplate` model
- **API**: Modify character fetching, add template CRUD endpoints
- **UI**: Fix button state management, update setup page data fetching, add template UI

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
│                            │  - createdAt, updatedAt            │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Character Creation Wizard Fix

**File**: `src/app/campaign/[id]/character/new/page.tsx`

**Changes**:
- Add a `useRef` to track if submission is in progress
- Check the ref before allowing submission
- Set ref immediately on click (synchronous), before async operations

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

### 2. Setup Page Character Fetching Fix

**File**: `src/app/campaign/[id]/setup/page.tsx`

**Current Issue**: The page calls `/api/character` without parameters, which returns a 422 error.

**Fix**: Fetch characters using the campaign endpoint which already includes characters, or use the campaignId parameter.

```typescript
// Current (broken):
const charsRes = await fetch('/api/character');

// Fixed:
const charsRes = await fetch(`/api/character?campaignId=${campaignId}`);
```

### 3. Campaign Template System

#### 3.1 Database Schema

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

#### 3.2 API Endpoints

**File**: `src/app/api/campaign-template/route.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/campaign-template | List all templates |
| POST | /api/campaign-template | Create a new template |

**File**: `src/app/api/campaign-template/[id]/route.ts`

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | /api/campaign-template/[id] | Delete a template |

#### 3.3 UI Changes

**File**: `src/app/campaigns/page.tsx`

- Add template selector dropdown in campaign creation form
- Add "Save as template" checkbox
- Display template list for selection

## Data Models

### CampaignTemplate

```typescript
interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateTemplateRequest

```typescript
interface CreateTemplateRequest {
  name: string;
  description?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Double-click prevention
*For any* sequence of rapid clicks on the "Create Character" button, the system should create exactly one character in the database.
**Validates: Requirements 1.1**

### Property 2: Character creation round-trip
*For any* valid character data submitted through the Character_Creation_Wizard, creating the character and then fetching characters for that campaign should include the newly created character with matching data.
**Validates: Requirements 2.1, 2.4**

### Property 3: Campaign characters display consistency
*For any* campaign with N characters in the database, both the Setup_Page and Adventure_Page should display exactly N characters.
**Validates: Requirements 2.2, 2.3**

### Property 4: Template persistence round-trip
*For any* valid template data (name, description), creating a template and then listing templates should include the newly created template with matching data.
**Validates: Requirements 3.4**

### Property 5: Template pre-fill accuracy
*For any* template selected in the campaign creation form, the form fields should be populated with the template's exact name and description values.
**Validates: Requirements 3.3**

### Property 6: Template listing completeness
*For any* set of N templates in the database, the campaign creation form should display exactly N templates.
**Validates: Requirements 3.2**

### Property 7: Template deletion isolation
*For any* template that has been used to create campaigns, deleting the template should not delete or modify any of those campaigns.
**Validates: Requirements 3.7**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Character creation fails | Re-enable button, display error message, reset isSubmitting ref |
| Template creation fails | Display error toast, keep form data |
| Template deletion fails | Display error toast, keep template in list |
| Network error during fetch | Display error message, allow retry |

## Testing Strategy

### Unit Tests

Unit tests will cover:
- Template API validation (Zod schemas)
- Character API response structure
- Form state management logic

### Property-Based Tests

Property-based tests will use **fast-check** library to verify:
- Double-click prevention (Property 1)
- Character round-trip (Property 2)
- Template round-trip (Property 4)
- Template deletion isolation (Property 7)

Each property test will:
- Generate random valid inputs using fast-check arbitraries
- Execute the operation under test
- Verify the property holds for all generated inputs
- Run minimum 100 iterations per property

**Test file**: `src/lib/engine/character-template.test.ts`

**Property test format**:
```typescript
// **Feature: character-and-template-fixes, Property 1: Double-click prevention**
test.prop([fc.string(), fc.integer()], (name, clicks) => {
  // Test implementation
});
```

### Integration Tests

- E2E test for character creation flow (verify single character created)
- E2E test for template creation and usage flow

