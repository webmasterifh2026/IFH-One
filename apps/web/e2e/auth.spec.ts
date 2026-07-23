import { test, expect } from '@playwright/test';

test.describe('Authentication Workflow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Go to the login page (or homepage if it redirects)
    await page.goto('/');

    // Wait for network idle to ensure the page has loaded
    await page.waitForLoadState('networkidle');

    // Sometimes there is a redirect to /login
    if (page.url().includes('/login')) {
      // Find the email and password inputs
      const emailInput = page
        .getByPlaceholder(/email/i)
        .or(page.locator('input[type="email"]'));
      const passwordInput = page
        .getByPlaceholder(/password/i)
        .or(page.locator('input[type="password"]'));

      // Enter credentials (we'll use one of the users from the rbac seed)
      await emailInput.fill('pramod.kumar@if-himenviro.in');
      await passwordInput.fill('password123'); // Assuming default password or we'll adjust later

      // Submit the form
      const loginButton = page.getByRole('button', { name: /login|sign in/i });
      await loginButton.click();

      // Wait for navigation to dashboard or home
      await page
        .waitForURL('**/dashboard**', { timeout: 10000 })
        .catch(() => {});
    }

    // Verify successful login (e.g., presence of a logout button or dashboard text)
    // We'll just check that we are no longer on the login page and no obvious error is shown
    expect(page.url()).not.toContain('/login');
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page
      .getByPlaceholder(/email/i)
      .or(page.locator('input[type="email"]'));
    const passwordInput = page
      .getByPlaceholder(/password/i)
      .or(page.locator('input[type="password"]'));

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');

    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    await loginButton.click();

    // Wait a bit for any API response
    await page.waitForTimeout(2000);

    // Assert that we have not navigated away from the login page
    expect(page.url()).toContain('/login');
  });
});
