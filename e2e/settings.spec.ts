import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('should display settings page with all sections', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('h1')).toContainText('Settings');

    // Check all sections are present
    await expect(page.locator('text=AI Configuration')).toBeVisible();
    await expect(page.locator('text=Display Settings')).toBeVisible();
    await expect(page.locator('text=About')).toBeVisible();
  });

  test('should have API key input field', async ({ page }) => {
    await page.goto('/settings');

    const apiKeyInput = page.locator('input[placeholder="Enter your API key..."]');
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('should save API key to localStorage', async ({ page }) => {
    await page.goto('/settings');

    // Fill in API key
    await page.fill('input[placeholder="Enter your API key..."]', 'test-api-key-123');

    // Save it
    await page.click('button:has-text("Save API Key")');

    // Check for success message
    await expect(page.locator('text=API key saved!')).toBeVisible();

    // Verify localStorage
    const savedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(savedKey).toBe('test-api-key-123');
  });

  test('should have theme and font size selectors', async ({ page }) => {
    await page.goto('/settings');

    // Check theme selector
    const themeSelect = page.locator('select').first();
    await expect(themeSelect).toBeVisible();
    await expect(themeSelect).toHaveValue('dark');

    // Check font size selector
    const fontSelect = page.locator('select').nth(1);
    await expect(fontSelect).toBeVisible();
    await expect(fontSelect).toHaveValue('medium');
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/settings');

    await page.click('text=Back to Home');

    await expect(page).toHaveURL('/');
  });
});
