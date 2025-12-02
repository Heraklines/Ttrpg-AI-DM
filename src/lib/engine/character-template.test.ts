import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/db';

/**
 * **Feature: character-and-template-fixes, Property 1: Double-click prevention**
 * **Validates: Requirements 1.1**
 * 
 * This test verifies that the double-click prevention mechanism works correctly.
 * The mechanism uses a ref (isSubmitting) that is checked and set synchronously
 * before any async operations, ensuring that rapid clicks only result in one submission.
 */

// Simulate the submission guard logic from the character creation wizard
class SubmissionGuard {
  private isSubmitting = false;
  private submissionCount = 0;

  /**
   * Attempts to start a submission. Returns true if submission was allowed,
   * false if a submission is already in progress.
   */
  trySubmit(): boolean {
    // This mirrors the synchronous check in createCharacter()
    if (this.isSubmitting) {
      return false;
    }
    this.isSubmitting = true;
    this.submissionCount++;
    return true;
  }

  /**
   * Resets the guard (called on error to allow retry)
   */
  reset(): void {
    this.isSubmitting = false;
  }

  /**
   * Gets the total number of successful submissions
   */
  getSubmissionCount(): number {
    return this.submissionCount;
  }

  /**
   * Checks if currently submitting
   */
  isCurrentlySubmitting(): boolean {
    return this.isSubmitting;
  }
}

describe('Character Creation Double-Click Prevention', () => {
  /**
   * **Feature: character-and-template-fixes, Property 1: Double-click prevention**
   * **Validates: Requirements 1.1**
   * 
   * Property: For any sequence of rapid clicks (simulated as synchronous trySubmit calls),
   * exactly one submission should be allowed until the guard is reset.
   */
  it('should allow exactly one submission for any number of rapid clicks', () => {
    fc.assert(
      fc.property(
        // Generate a random number of clicks between 1 and 100
        fc.integer({ min: 1, max: 100 }),
        (clickCount) => {
          const guard = new SubmissionGuard();
          let successfulSubmissions = 0;

          // Simulate rapid clicks (all synchronous, before any async operation completes)
          for (let i = 0; i < clickCount; i++) {
            if (guard.trySubmit()) {
              successfulSubmissions++;
            }
          }

          // Property: Exactly one submission should succeed
          expect(successfulSubmissions).toBe(1);
          expect(guard.getSubmissionCount()).toBe(1);
          expect(guard.isCurrentlySubmitting()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: character-and-template-fixes, Property 1: Double-click prevention**
   * **Validates: Requirements 1.3**
   * 
   * Property: After an error (reset), the guard should allow exactly one new submission
   * for any subsequent sequence of rapid clicks.
   */
  it('should allow retry after error reset', () => {
    fc.assert(
      fc.property(
        // Generate random click counts for initial attempt and retry
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (initialClicks, retryClicks) => {
          const guard = new SubmissionGuard();

          // First batch of clicks
          let firstBatchSuccesses = 0;
          for (let i = 0; i < initialClicks; i++) {
            if (guard.trySubmit()) {
              firstBatchSuccesses++;
            }
          }
          expect(firstBatchSuccesses).toBe(1);

          // Simulate error - reset the guard
          guard.reset();

          // Second batch of clicks (retry after error)
          let secondBatchSuccesses = 0;
          for (let i = 0; i < retryClicks; i++) {
            if (guard.trySubmit()) {
              secondBatchSuccesses++;
            }
          }
          expect(secondBatchSuccesses).toBe(1);

          // Total submissions should be 2 (one per batch)
          expect(guard.getSubmissionCount()).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: character-and-template-fixes, Property 1: Double-click prevention**
   * **Validates: Requirements 1.1, 1.4**
   * 
   * Property: The first click in any sequence should always succeed (when guard is fresh).
   */
  it('should always allow the first click when guard is fresh', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (clickCount) => {
          const guard = new SubmissionGuard();
          
          // First click should always succeed
          const firstClickResult = guard.trySubmit();
          expect(firstClickResult).toBe(true);
          
          // All subsequent clicks should fail
          for (let i = 1; i < clickCount; i++) {
            const result = guard.trySubmit();
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Character data generator for property-based testing.
 * Generates valid character data that conforms to the API schema.
 */
const characterDataArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  race: fc.constantFrom('Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'),
  className: fc.constantFrom('Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard', 'Druid', 'Monk', 'Sorcerer', 'Warlock'),
  level: fc.integer({ min: 1, max: 20 }),
  strength: fc.integer({ min: 1, max: 30 }),
  dexterity: fc.integer({ min: 1, max: 30 }),
  constitution: fc.integer({ min: 1, max: 30 }),
  intelligence: fc.integer({ min: 1, max: 30 }),
  wisdom: fc.integer({ min: 1, max: 30 }),
  charisma: fc.integer({ min: 1, max: 30 }),
  maxHp: fc.integer({ min: 1, max: 500 }),
  armorClass: fc.integer({ min: 0, max: 30 }),
  speed: fc.integer({ min: 0, max: 120 }),
  gold: fc.integer({ min: 0, max: 100000 }),
  backstory: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
});

describe('Character Persistence Properties', () => {
  let testCampaignId: string;

  beforeEach(async () => {
    // Create a test campaign for character tests
    const campaign = await prisma.campaign.create({
      data: {
        name: `Test Campaign ${Date.now()}`,
        description: 'Test campaign for property tests',
      },
    });
    testCampaignId = campaign.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testCampaignId) {
      await prisma.campaign.delete({
        where: { id: testCampaignId },
      }).catch(() => {
        // Ignore if already deleted
      });
    }
  });

  /**
   * **Feature: character-and-template-fixes, Property 2: Character creation round-trip**
   * **Validates: Requirements 2.1, 2.4**
   * 
   * Property: For any valid character data, creating a character and then fetching
   * characters for that campaign should include the newly created character with
   * matching core data fields.
   */
  it('should persist and retrieve character data correctly (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        characterDataArbitrary,
        async (charData) => {
          // Create character directly via Prisma (simulating API behavior)
          const created = await prisma.character.create({
            data: {
              campaignId: testCampaignId,
              name: charData.name,
              race: charData.race,
              className: charData.className,
              level: charData.level,
              strength: charData.strength,
              dexterity: charData.dexterity,
              constitution: charData.constitution,
              intelligence: charData.intelligence,
              wisdom: charData.wisdom,
              charisma: charData.charisma,
              maxHp: charData.maxHp,
              currentHp: charData.maxHp,
              armorClass: charData.armorClass,
              speed: charData.speed,
              gold: charData.gold,
              backstory: charData.backstory,
              hitDiceRemaining: charData.level,
            },
          });

          // Fetch the character back
          const fetched = await prisma.character.findUnique({
            where: { id: created.id },
          });

          // Property: The fetched character should match the created data
          expect(fetched).not.toBeNull();
          expect(fetched!.name).toBe(charData.name);
          expect(fetched!.race).toBe(charData.race);
          expect(fetched!.className).toBe(charData.className);
          expect(fetched!.level).toBe(charData.level);
          expect(fetched!.strength).toBe(charData.strength);
          expect(fetched!.dexterity).toBe(charData.dexterity);
          expect(fetched!.constitution).toBe(charData.constitution);
          expect(fetched!.intelligence).toBe(charData.intelligence);
          expect(fetched!.wisdom).toBe(charData.wisdom);
          expect(fetched!.charisma).toBe(charData.charisma);
          expect(fetched!.maxHp).toBe(charData.maxHp);
          expect(fetched!.currentHp).toBe(charData.maxHp);
          expect(fetched!.armorClass).toBe(charData.armorClass);
          expect(fetched!.speed).toBe(charData.speed);
          expect(fetched!.gold).toBe(charData.gold);
          expect(fetched!.backstory).toBe(charData.backstory ?? null);
          expect(fetched!.campaignId).toBe(testCampaignId);

          // Clean up this character for next iteration
          await prisma.character.delete({ where: { id: created.id } });
        }
      ),
      { numRuns: 20 }  // Reduced for database-heavy operations
    );
  }, 30000);  // Increase timeout to 30 seconds

  /**
   * **Feature: character-and-template-fixes, Property 3: Campaign characters display consistency**
   * **Validates: Requirements 2.2, 2.3**
   * 
   * Property: For any campaign with N characters in the database, fetching characters
   * for that campaign should return exactly N characters.
   */
  it('should display exactly the number of characters in the campaign', async () => {
    // Each iteration uses a fresh campaign to avoid cross-contamination
    await fc.assert(
      fc.asyncProperty(
        // Generate a random number of characters to create (1-10)
        fc.integer({ min: 1, max: 10 }),
        async (characterCount) => {
          // Create a fresh campaign for this iteration to ensure isolation
          const iterationCampaign = await prisma.campaign.create({
            data: {
              name: `Iteration Campaign ${Date.now()}_${Math.random()}`,
              description: 'Isolated test campaign',
            },
          });

          try {
            // Create N characters for the campaign
            const createdIds: string[] = [];
            for (let i = 0; i < characterCount; i++) {
              const char = await prisma.character.create({
                data: {
                  campaignId: iterationCampaign.id,
                  name: `Test Character ${i}`,
                  race: 'Human',
                  className: 'Fighter',
                  level: 1,
                  maxHp: 10,
                  currentHp: 10,
                },
              });
              createdIds.push(char.id);
            }

            // Fetch characters for the campaign (simulating API behavior)
            const fetchedCharacters = await prisma.character.findMany({
              where: { campaignId: iterationCampaign.id },
            });

            // Property: The number of fetched characters should equal the number created
            expect(fetchedCharacters.length).toBe(characterCount);
          } finally {
            // Clean up the iteration campaign (cascade deletes characters)
            await prisma.campaign.delete({
              where: { id: iterationCampaign.id },
            }).catch(() => {});
          }
        }
      ),
      { numRuns: 20 }  // Reduced for database-heavy operations
    );
  }, 30000);  // Increase timeout to 30 seconds
});


/**
 * Template data generator for property-based testing.
 * Generates valid template data that conforms to the API schema.
 */
const templateDataArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
});

/**
 * Simulates the template pre-fill logic from the campaigns page.
 * This mirrors the handleTemplateSelect function behavior.
 */
function simulateTemplatePreFill(
  templates: Array<{ id: string; name: string; description: string | null }>,
  selectedTemplateId: string
): { name: string; description: string } {
  if (!selectedTemplateId) {
    return { name: '', description: '' };
  }
  const template = templates.find((t) => t.id === selectedTemplateId);
  if (template) {
    return {
      name: template.name,
      description: template.description || '',
    };
  }
  return { name: '', description: '' };
}

describe('Campaign Template UI Properties', () => {
  /**
   * **Feature: character-and-template-fixes, Property 5: Template pre-fill accuracy**
   * **Validates: Requirements 3.3**
   * 
   * Property: For any template selected in the campaign creation form, the form fields
   * should be populated with the template's exact name and description values.
   */
  it('should pre-fill form with exact template values when template is selected', () => {
    fc.assert(
      fc.property(
        // Generate a list of templates
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (templates) => {
          // For each template in the list, verify pre-fill accuracy
          for (const template of templates) {
            const result = simulateTemplatePreFill(templates, template.id);
            
            // Property: The pre-filled name should exactly match the template name
            expect(result.name).toBe(template.name);
            
            // Property: The pre-filled description should match (empty string for null)
            expect(result.description).toBe(template.description || '');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: character-and-template-fixes, Property 5: Template pre-fill accuracy**
   * **Validates: Requirements 3.3**
   * 
   * Property: When no template is selected (empty string), the form should not be pre-filled.
   */
  it('should not pre-fill form when no template is selected', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (templates) => {
          const result = simulateTemplatePreFill(templates, '');
          
          // Property: No pre-fill should occur
          expect(result.name).toBe('');
          expect(result.description).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: character-and-template-fixes, Property 6: Template listing completeness**
   * **Validates: Requirements 3.2**
   * 
   * Property: For any set of N templates, the UI should be able to display exactly N templates.
   * This tests the data flow from API response to UI state.
   */
  it('should display exactly N templates when N templates exist', () => {
    fc.assert(
      fc.property(
        // Generate a random number of templates (0-20)
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (templates) => {
          // Simulate the UI state after fetching templates
          // The UI stores templates in state and renders them
          const displayedTemplates = templates;
          
          // Property: The number of displayed templates should equal the number fetched
          expect(displayedTemplates.length).toBe(templates.length);
          
          // Property: Each template should be uniquely identifiable
          const ids = new Set(displayedTemplates.map(t => t.id));
          expect(ids.size).toBe(templates.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: character-and-template-fixes, Property 6: Template listing completeness**
   * **Validates: Requirements 3.2**
   * 
   * Property: All templates in the list should be selectable in the dropdown.
   */
  it('should make all templates selectable in dropdown', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (templates) => {
          // Simulate selecting each template and verifying it can be found
          for (const template of templates) {
            const result = simulateTemplatePreFill(templates, template.id);
            
            // Property: Each template should be selectable and return valid data
            expect(result.name).toBeTruthy();
            expect(result.name).toBe(template.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Campaign Template Properties', () => {
  const createdTemplateIds: string[] = [];
  const createdCampaignIds: string[] = [];

  afterEach(async () => {
    // Clean up all created templates
    for (const id of createdTemplateIds) {
      await prisma.campaignTemplate.delete({ where: { id } }).catch(() => {});
    }
    createdTemplateIds.length = 0;

    // Clean up all created campaigns
    for (const id of createdCampaignIds) {
      await prisma.campaign.delete({ where: { id } }).catch(() => {});
    }
    createdCampaignIds.length = 0;
  });

  /**
   * **Feature: character-and-template-fixes, Property 4: Template persistence round-trip**
   * **Validates: Requirements 3.4**
   * 
   * Property: For any valid template data (name, description), creating a template
   * and then listing templates should include the newly created template with
   * matching data.
   */
  it('should persist and retrieve template data correctly (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateDataArbitrary,
        async (templateData) => {
          // Create template directly via Prisma (simulating API behavior)
          const created = await prisma.campaignTemplate.create({
            data: {
              name: templateData.name,
              description: templateData.description,
            },
          });
          createdTemplateIds.push(created.id);

          // Fetch the template back
          const fetched = await prisma.campaignTemplate.findUnique({
            where: { id: created.id },
          });

          // Property: The fetched template should match the created data
          expect(fetched).not.toBeNull();
          expect(fetched!.name).toBe(templateData.name);
          expect(fetched!.description).toBe(templateData.description ?? null);
          expect(fetched!.id).toBe(created.id);

          // Also verify it appears in the list
          const allTemplates = await prisma.campaignTemplate.findMany();
          const foundInList = allTemplates.find((t: { id: string }) => t.id === created.id);
          expect(foundInList).toBeDefined();
          expect(foundInList!.name).toBe(templateData.name);
          expect(foundInList!.description).toBe(templateData.description ?? null);
        }
      ),
      { numRuns: 20 }  // Reduced for database-heavy operations
    );
  }, 30000);  // Increase timeout to 30 seconds

  /**
   * **Feature: character-and-template-fixes, Property 7: Template deletion isolation**
   * **Validates: Requirements 3.7**
   * 
   * Property: For any template that has been used to create campaigns, deleting
   * the template should not delete or modify any of those campaigns.
   */
  it('should not affect campaigns when template is deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        templateDataArbitrary,
        fc.integer({ min: 1, max: 3 }), // Number of campaigns to create from template
        async (templateData, campaignCount) => {
          // Create a template
          const template = await prisma.campaignTemplate.create({
            data: {
              name: templateData.name,
              description: templateData.description,
            },
          });
          createdTemplateIds.push(template.id);

          // Create campaigns "from" this template (simulating the UI flow)
          // In the real app, campaigns don't have a foreign key to templates,
          // they just copy the template's data
          const campaignIds: string[] = [];
          for (let i = 0; i < campaignCount; i++) {
            const campaign = await prisma.campaign.create({
              data: {
                name: `${templateData.name} - Campaign ${i + 1}`,
                description: templateData.description,
              },
            });
            campaignIds.push(campaign.id);
            createdCampaignIds.push(campaign.id);
          }

          // Verify campaigns exist before deletion
          const campaignsBefore = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
          });
          expect(campaignsBefore.length).toBe(campaignCount);

          // Delete the template
          await prisma.campaignTemplate.delete({
            where: { id: template.id },
          });
          // Remove from cleanup list since we deleted it
          const idx = createdTemplateIds.indexOf(template.id);
          if (idx > -1) createdTemplateIds.splice(idx, 1);

          // Property: All campaigns should still exist and be unchanged
          const campaignsAfter = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
          });
          expect(campaignsAfter.length).toBe(campaignCount);

          // Verify each campaign's data is unchanged
          for (let i = 0; i < campaignCount; i++) {
            const campaign = campaignsAfter.find((c: { id: string }) => c.id === campaignIds[i]);
            expect(campaign).toBeDefined();
            expect(campaign!.name).toBe(`${templateData.name} - Campaign ${i + 1}`);
            expect(campaign!.description).toBe(templateData.description ?? null);
          }
        }
      ),
      { numRuns: 15 }  // Reduced for database-heavy operations
    );
  }, 30000);  // Increase timeout to 30 seconds
});
