import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Campaign API', () => {
    test('GET /api/campaign should return campaigns list', async ({ request }) => {
      const response = await request.get('/api/campaign');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('campaigns');
      expect(Array.isArray(data.campaigns)).toBe(true);
    });

    test('POST /api/campaign should create a new campaign', async ({ request }) => {
      const response = await request.post('/api/campaign', {
        data: {
          name: 'API Test Campaign',
          description: 'Created via API test',
        },
      });
      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('campaign');
      expect(data.campaign.name).toBe('API Test Campaign');
      expect(data.campaign.description).toBe('Created via API test');
      expect(data.campaign.id).toBeDefined();
    });

    test('POST /api/campaign should validate required fields', async ({ request }) => {
      const response = await request.post('/api/campaign', {
        data: {},
      });
      expect(response.status()).toBe(422);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.code).toBe('VALIDATION_FAILED');
    });

    test('GET /api/campaign/[id] should return a single campaign', async ({ request }) => {
      // First create a campaign
      const createResponse = await request.post('/api/campaign', {
        data: { name: 'Test Campaign for GET' },
      });
      const { campaign } = await createResponse.json();

      // Then fetch it
      const response = await request.get(`/api/campaign/${campaign.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.campaign.id).toBe(campaign.id);
      expect(data.campaign.name).toBe('Test Campaign for GET');
    });

    test('GET /api/campaign/[id] should return 404 for non-existent campaign', async ({ request }) => {
      const response = await request.get('/api/campaign/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(404);
    });

    test('PUT /api/campaign/[id] should update a campaign', async ({ request }) => {
      // First create a campaign
      const createResponse = await request.post('/api/campaign', {
        data: { name: 'Original Name' },
      });
      const { campaign } = await createResponse.json();

      // Update it
      const response = await request.put(`/api/campaign/${campaign.id}`, {
        data: { name: 'Updated Name', description: 'New description' },
      });
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.campaign.name).toBe('Updated Name');
      expect(data.campaign.description).toBe('New description');
    });

    test('DELETE /api/campaign/[id] should delete a campaign', async ({ request }) => {
      // First create a campaign
      const createResponse = await request.post('/api/campaign', {
        data: { name: 'Campaign to Delete' },
      });
      const { campaign } = await createResponse.json();

      // Delete it
      const deleteResponse = await request.delete(`/api/campaign/${campaign.id}`);
      expect(deleteResponse.status()).toBe(200);

      // Verify it's gone
      const getResponse = await request.get(`/api/campaign/${campaign.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Character API', () => {
    let campaignId: string;

    test.beforeAll(async ({ request }) => {
      // Create a campaign for character tests
      const response = await request.post('/api/campaign', {
        data: { name: 'Character Test Campaign' },
      });
      const { campaign } = await response.json();
      campaignId = campaign.id;
    });

    test('GET /api/character should require campaignId', async ({ request }) => {
      const response = await request.get('/api/character');
      expect(response.status()).toBe(422);
    });

    test('GET /api/character?campaignId=X should return characters list', async ({ request }) => {
      const response = await request.get(`/api/character?campaignId=${campaignId}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('characters');
      expect(Array.isArray(data.characters)).toBe(true);
    });

    test('POST /api/character should create a new character', async ({ request }) => {
      const response = await request.post('/api/character', {
        data: {
          campaignId,
          name: 'Thorin Ironforge',
          race: 'Dwarf',
          className: 'Fighter',
          level: 5,
          strength: 16,
          dexterity: 12,
          constitution: 16,
          intelligence: 10,
          wisdom: 12,
          charisma: 8,
          maxHp: 45,
          armorClass: 18,
          speed: 25,
          hitDiceType: 10,
          savingThrowProficiencies: ['strength', 'constitution'],
          skillProficiencies: ['athletics', 'perception'],
        },
      });
      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('character');
      expect(data.character.name).toBe('Thorin Ironforge');
      expect(data.character.className).toBe('Fighter');
      expect(data.character.level).toBe(5);
      expect(data.character.currentHp).toBe(45); // Should default to maxHp
    });

    test('POST /api/character should validate required fields', async ({ request }) => {
      const response = await request.post('/api/character', {
        data: {
          campaignId,
          // Missing required fields
        },
      });
      expect(response.status()).toBe(422);
    });

    test('GET /api/character/[id] should return a single character', async ({ request }) => {
      // First create a character
      const createResponse = await request.post('/api/character', {
        data: {
          campaignId,
          name: 'Test Character',
          race: 'Human',
          className: 'Wizard',
          maxHp: 20,
        },
      });
      const { character } = await createResponse.json();

      // Then fetch it
      const response = await request.get(`/api/character/${character.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.character.name).toBe('Test Character');
    });

    test('PUT /api/character/[id] should update a character', async ({ request }) => {
      // First create a character
      const createResponse = await request.post('/api/character', {
        data: {
          campaignId,
          name: 'Character to Update',
          race: 'Elf',
          className: 'Rogue',
          maxHp: 30,
          currentHp: 30,
        },
      });
      const { character } = await createResponse.json();

      // Update HP (simulating damage)
      const response = await request.put(`/api/character/${character.id}`, {
        data: { currentHp: 20 },
      });
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.character.currentHp).toBe(20);
    });

    test('DELETE /api/character/[id] should delete a character', async ({ request }) => {
      // First create a character
      const createResponse = await request.post('/api/character', {
        data: {
          campaignId,
          name: 'Character to Delete',
          race: 'Halfling',
          className: 'Bard',
          maxHp: 25,
        },
      });
      const { character } = await createResponse.json();

      // Delete it
      const deleteResponse = await request.delete(`/api/character/${character.id}`);
      expect(deleteResponse.status()).toBe(200);

      // Verify it's gone
      const getResponse = await request.get(`/api/character/${character.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Dice API', () => {
    test('POST /api/dice/roll should roll dice', async ({ request }) => {
      const response = await request.post('/api/dice/roll', {
        data: { notation: '2d6+3', reason: 'Test roll' },
      });
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result.notation).toBe('2d6+3');
      expect(data.result.rolls).toHaveLength(2);
      expect(data.result.modifier).toBe(3);
      expect(data.result.total).toBeGreaterThanOrEqual(5); // min: 1+1+3
      expect(data.result.total).toBeLessThanOrEqual(15); // max: 6+6+3
      expect(data.result.reason).toBe('Test roll');
    });

    test('POST /api/dice/roll should validate notation format', async ({ request }) => {
      const response = await request.post('/api/dice/roll', {
        data: { notation: 'invalid' },
      });
      expect(response.status()).toBe(422);
    });

    test('POST /api/dice/roll should handle various dice notations', async ({ request }) => {
      const notations = ['1d20', '4d6', '1d8+5', '2d10-2'];

      for (const notation of notations) {
        const response = await request.post('/api/dice/roll', {
          data: { notation },
        });
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.result.notation).toBe(notation);
      }
    });
  });
});
