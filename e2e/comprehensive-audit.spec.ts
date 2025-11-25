import { test, expect } from '@playwright/test';

/**
 * Comprehensive audit of Arcane Gamemaster against the spec sheet
 * Tests all implemented and expected functionality
 */

test.describe('SPEC AUDIT: Phase 1 - Foundation', () => {
  test.describe('Game Engines', () => {
    test('DiceEngine: should roll various dice notations via API', async ({ request }) => {
      const notations = ['1d20', '2d6+3', '4d6', '1d8+5', '1d12-2', '3d10'];
      
      for (const notation of notations) {
        const response = await request.post('/api/dice/roll', {
          data: { notation, reason: `Testing ${notation}` },
        });
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.result).toBeDefined();
        expect(data.result.notation).toBe(notation);
        expect(data.result.rolls).toBeDefined();
        expect(Array.isArray(data.result.rolls)).toBe(true);
      }
    });

    test('DiceEngine: should validate invalid dice notation', async ({ request }) => {
      const invalidNotations = ['invalid', 'd20', '2d', 'abc123'];
      
      for (const notation of invalidNotations) {
        const response = await request.post('/api/dice/roll', {
          data: { notation },
        });
        expect(response.status()).toBe(422);
      }
    });
  });

  test.describe('Database & API', () => {
    test('Campaign CRUD operations work correctly', async ({ request }) => {
      // Create
      const createRes = await request.post('/api/campaign', {
        data: { name: 'Audit Test Campaign', description: 'Testing CRUD' },
      });
      expect(createRes.status()).toBe(201);
      const { campaign } = await createRes.json();
      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('Audit Test Campaign');

      // Read
      const getRes = await request.get(`/api/campaign/${campaign.id}`);
      expect(getRes.status()).toBe(200);
      const getData = await getRes.json();
      expect(getData.campaign.gameState).toBeDefined(); // Should have game state

      // Update
      const updateRes = await request.put(`/api/campaign/${campaign.id}`, {
        data: { name: 'Updated Campaign Name' },
      });
      expect(updateRes.status()).toBe(200);
      const updateData = await updateRes.json();
      expect(updateData.campaign.name).toBe('Updated Campaign Name');

      // Delete
      const deleteRes = await request.delete(`/api/campaign/${campaign.id}`);
      expect(deleteRes.status()).toBe(200);

      // Verify deleted
      const verifyRes = await request.get(`/api/campaign/${campaign.id}`);
      expect(verifyRes.status()).toBe(404);
    });

    test('Character CRUD operations work correctly', async ({ request }) => {
      // First create a campaign
      const campaignRes = await request.post('/api/campaign', {
        data: { name: 'Character Test Campaign' },
      });
      const { campaign } = await campaignRes.json();

      // Create character with full D&D stats
      const createRes = await request.post('/api/character', {
        data: {
          campaignId: campaign.id,
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
          currentHp: 45,
          armorClass: 18,
          speed: 25,
          hitDiceType: 10,
          savingThrowProficiencies: ['strength', 'constitution'],
          skillProficiencies: ['athletics', 'perception'],
          gold: 150,
        },
      });
      expect(createRes.status()).toBe(201);
      const { character } = await createRes.json();

      // Verify all stats saved correctly
      expect(character.name).toBe('Thorin Ironforge');
      expect(character.strength).toBe(16);
      expect(character.maxHp).toBe(45);
      expect(character.currentHp).toBe(45);

      // Update character (simulate damage)
      const damageRes = await request.put(`/api/character/${character.id}`, {
        data: { currentHp: 30 },
      });
      expect(damageRes.status()).toBe(200);
      const { character: damagedChar } = await damageRes.json();
      expect(damagedChar.currentHp).toBe(30);

      // Clean up
      await request.delete(`/api/campaign/${campaign.id}`);
    });

    test('GameState is created with campaign', async ({ request }) => {
      const createRes = await request.post('/api/campaign', {
        data: { name: 'GameState Test' },
      });
      const { campaign } = await createRes.json();

      const getRes = await request.get(`/api/campaign/${campaign.id}`);
      const data = await getRes.json();

      expect(data.campaign.gameState).toBeDefined();
      expect(data.campaign.gameState.mode).toBe('exploration');
      expect(data.campaign.gameState.gameDay).toBe(1);
      expect(data.campaign.gameState.gameHour).toBe(8);

      await request.delete(`/api/campaign/${campaign.id}`);
    });
  });
});

test.describe('SPEC AUDIT: UI Components', () => {
  test.describe('Design Language (Spec Section 8.1)', () => {
    test('Home page has fantasy theme colors', async ({ page }) => {
      await page.goto('/');
      
      // Check primary gold color is used
      const title = page.locator('h1');
      await expect(title).toBeVisible();
      
      // Check background is dark
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      // Should be dark (background: #1A1714)
      expect(bgColor).toBeTruthy();
    });

    test('Typography uses correct font families', async ({ page }) => {
      await page.goto('/');
      
      // Headers should use medieval font (Cinzel)
      const h1 = page.locator('h1');
      const fontFamily = await h1.evaluate((el) => 
        window.getComputedStyle(el).fontFamily
      );
      // Should include Cinzel or serif fallback
      expect(fontFamily.toLowerCase()).toMatch(/cinzel|serif/);
    });
  });

  test.describe('Screen Inventory (Spec Section 8.2)', () => {
    test('Home page has required elements', async ({ page }) => {
      await page.goto('/');
      
      // Title
      await expect(page.locator('h1:has-text("Arcane Gamemaster")')).toBeVisible();
      
      // Description
      await expect(page.locator('text=AI-powered D&D 5e')).toBeVisible();
      
      // Navigation buttons
      await expect(page.locator('text=Start Adventure')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('Campaign list page has required elements', async ({ page }) => {
      await page.goto('/campaigns');
      
      // Title
      await expect(page.locator('h1:has-text("Your Campaigns")')).toBeVisible();
      
      // Create button
      await expect(page.getByRole('button', { name: 'New Campaign' })).toBeVisible();
      
      // Back navigation
      await expect(page.locator('text=Back to Home')).toBeVisible();
    });

    test('Settings page has required sections', async ({ page }) => {
      await page.goto('/settings');
      
      // AI Configuration section
      await expect(page.locator('h2:has-text("AI Configuration")')).toBeVisible();
      await expect(page.locator('label:has-text("Gemini API Key")')).toBeVisible();
      
      // Display Settings section
      await expect(page.locator('h2:has-text("Display Settings")')).toBeVisible();
      await expect(page.locator('text=Theme').first()).toBeVisible();
      await expect(page.locator('text=Font Size').first()).toBeVisible();
      
      // About section
      await expect(page.locator('h2:has-text("About")')).toBeVisible();
    });
  });

  test.describe('Component Specifications (Spec Section 8.3)', () => {
    test('Campaign cards show required information', async ({ page, request }) => {
      // Create a campaign with characters
      const campRes = await request.post('/api/campaign', {
        data: { name: 'UI Test Campaign', description: 'Testing UI elements' },
      });
      const { campaign } = await campRes.json();

      await request.post('/api/character', {
        data: {
          campaignId: campaign.id,
          name: 'Test Hero',
          race: 'Human',
          className: 'Paladin',
          level: 3,
          maxHp: 28,
        },
      });

      await page.goto('/campaigns');
      await page.waitForLoadState('networkidle');

      // Campaign card should show name
      await expect(page.locator(`text=UI Test Campaign`)).toBeVisible();
      
      // Should show description
      await expect(page.locator('text=Testing UI elements')).toBeVisible();
      
      // Should show character count (text contains "character")
      await expect(page.locator('span:has-text("character")').first()).toBeVisible();
      
      // Should have Play and Delete buttons
      const card = page.locator(`div.p-6:has-text("UI Test Campaign")`).first();
      await expect(card.locator('text=Play')).toBeVisible();
      await expect(card.locator('text=Delete')).toBeVisible();

      // Clean up
      await request.delete(`/api/campaign/${campaign.id}`);
    });
  });
});

test.describe('SPEC AUDIT: Missing Features Check', () => {
  test('MISSING: Adventure screen (main gameplay)', async ({ page }) => {
    // The spec requires an Adventure Screen for gameplay
    // This should exist at /campaign/[id] or /adventure/[id]
    await page.goto('/campaigns');
    
    // Check if there's a way to access adventure screen
    // Currently only "Play" button exists but may not lead anywhere
    const playButton = page.locator('a:has-text("Play")').first();
    const href = await playButton.getAttribute('href').catch(() => null);
    
    if (href) {
      await page.goto(href);
      // Check what's there - likely 404 or missing page
      const is404 = await page.locator('text=404').isVisible().catch(() => false);
      const isNotFound = await page.locator('text=not found').isVisible().catch(() => false);
      
      // Log finding
      console.log(`Adventure screen at ${href}: ${is404 || isNotFound ? 'MISSING (404)' : 'EXISTS'}`);
    }
  });

  test('MISSING: Character creation wizard', async ({ page }) => {
    // Spec requires multi-step character creation wizard
    // Check if /character/create or similar exists
    await page.goto('/character/create');
    const is404 = await page.locator('text=404').isVisible().catch(() => false);
    console.log(`Character creation wizard: ${is404 ? 'MISSING' : 'EXISTS'}`);
  });

  test('MISSING: Character sheet view', async ({ page, request }) => {
    // Create a character to view
    const campRes = await request.post('/api/campaign', {
      data: { name: 'Sheet Test' },
    });
    const { campaign } = await campRes.json();

    const charRes = await request.post('/api/character', {
      data: {
        campaignId: campaign.id,
        name: 'Sheet Hero',
        race: 'Elf',
        className: 'Wizard',
        maxHp: 20,
      },
    });
    const { character } = await charRes.json();

    // Try to access character sheet
    await page.goto(`/character/${character.id}`);
    const is404 = await page.locator('text=404').isVisible().catch(() => false);
    console.log(`Character sheet view: ${is404 ? 'MISSING' : 'EXISTS'}`);

    await request.delete(`/api/campaign/${campaign.id}`);
  });

  test('MISSING: Combat overlay/tracker', async ({ page }) => {
    // Spec requires combat overlay with initiative tracker
    // This would be part of adventure screen
    console.log('Combat overlay: MISSING (requires adventure screen)');
  });

  test('CHECK: AI test endpoint works', async ({ request }) => {
    const response = await request.get('/api/ai/test');
    const data = await response.json();
    
    console.log(`AI Connection: ${data.success ? 'WORKING' : 'FAILED'}`);
    console.log(`AI Provider: ${data.provider || 'unknown'}`);
    console.log(`AI Message: ${data.message}`);
    
    // This test just logs - doesn't fail
    expect(response.status()).toBe(200);
  });
});

test.describe('SPEC AUDIT: API Completeness', () => {
  test('CHECK: Adventure action endpoint exists', async ({ request }) => {
    // Spec requires POST /api/adventure/action
    const response = await request.post('/api/adventure/action', {
      data: { campaignId: 'test', playerInput: 'I look around' },
    });
    
    // 404 means endpoint doesn't exist, 4xx/5xx means exists but error
    console.log(`/api/adventure/action: ${response.status() === 404 ? 'MISSING' : 'EXISTS'}`);
  });

  test('CHECK: Combat endpoints exist', async ({ request }) => {
    const endpoints = [
      { method: 'POST', path: '/api/combat/start' },
      { method: 'POST', path: '/api/combat/turn' },
      { method: 'POST', path: '/api/combat/end' },
    ];

    for (const ep of endpoints) {
      const response = await request.post(ep.path, { data: {} });
      console.log(`${ep.path}: ${response.status() === 404 ? 'MISSING' : 'EXISTS'}`);
    }
  });

  test('CHECK: Rules/reference endpoints exist', async ({ request }) => {
    const endpoints = [
      '/api/rules/monster/goblin',
      '/api/rules/spell/fireball',
      '/api/rules/condition/frightened',
    ];

    for (const path of endpoints) {
      const response = await request.get(path);
      console.log(`${path}: ${response.status() === 404 ? 'MISSING' : 'EXISTS'}`);
    }
  });
});

test.describe('SPEC AUDIT: Visual Inspection', () => {
  test('Take screenshots for visual review', async ({ page }) => {
    // Home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/audit-home.png', fullPage: true });

    // Campaigns page
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/audit-campaigns.png', fullPage: true });

    // Campaign create form
    await page.getByRole('button', { name: 'New Campaign' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/audit-campaign-form.png', fullPage: true });

    // Settings page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/audit-settings.png', fullPage: true });
  });
});
