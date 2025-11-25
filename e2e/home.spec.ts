import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page with title and navigation', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page.locator('h1')).toContainText('Arcane Gamemaster');

    // Check subtitle
    await expect(page.locator('text=AI-powered D&D 5e companion')).toBeVisible();

    // Check navigation buttons
    await expect(page.locator('text=Start Adventure')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate to campaigns page', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Start Adventure');

    await expect(page).toHaveURL('/campaigns');
    await expect(page.locator('h1')).toContainText('Your Campaigns');
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Settings');

    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });
});
