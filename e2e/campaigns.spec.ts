import { test, expect } from '@playwright/test';

test.describe('Campaigns Page', () => {
  test('should display campaigns page with create button', async ({ page }) => {
    await page.goto('/campaigns');

    await expect(page.locator('h1')).toContainText('Your Campaigns');
    await expect(page.locator('text=New Campaign')).toBeVisible();
  });

  test('should show create campaign form when clicking new campaign', async ({ page }) => {
    await page.goto('/campaigns');

    await page.click('text=New Campaign');

    await expect(page.locator('text=Create New Campaign')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter campaign name..."]')).toBeVisible();
    await expect(page.locator('textarea[placeholder="Describe your campaign..."]')).toBeVisible();
  });

  test('should create a new campaign via API and see it in list', async ({ page, request }) => {
    // Create campaign via API first
    const uniqueName = `E2E Create ${Date.now()}`;
    const apiResponse = await request.post('/api/campaign', {
      data: { name: uniqueName, description: 'A test adventure' },
    });
    expect(apiResponse.status()).toBe(201);

    // Now visit the page and verify it shows up
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // The campaign should be visible in the list
    await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should delete a campaign via UI', async ({ page, request }) => {
    // Create campaign via API first to ensure it exists
    const uniqueName = `ToDelete ${Date.now()}`;
    const createResponse = await request.post('/api/campaign', {
      data: { name: uniqueName },
    });
    expect(createResponse.status()).toBe(201);
    const { campaign } = await createResponse.json();

    // Visit the page
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Find the campaign
    await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 10000 });

    // Find and click delete button for this campaign
    const campaignCard = page.locator(`div.p-6:has-text("${uniqueName}")`).first();
    const deleteButton = campaignCard.locator('button:has-text("Delete")');

    // Delete it (handle confirmation dialog)
    page.on('dialog', (dialog) => dialog.accept());
    await deleteButton.click();

    // Wait for it to be gone
    await expect(page.locator(`text=${uniqueName}`)).not.toBeVisible({ timeout: 10000 });

    // Also verify via API that it's gone
    const getResponse = await request.get(`/api/campaign/${campaign.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should display campaigns list or empty state', async ({ page }) => {
    await page.goto('/campaigns');

    // Either we see campaigns or the empty state - both are valid states
    // Wait for either condition to be true
    await page.waitForLoadState('networkidle');
    
    const emptyState = page.locator('text=No campaigns yet');
    const campaignsList = page.locator('h3.font-medieval');

    // At least one should be visible or exist
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasCampaigns = await campaignsList.count() > 0;

    expect(isEmpty || hasCampaigns).toBeTruthy();
  });
});
