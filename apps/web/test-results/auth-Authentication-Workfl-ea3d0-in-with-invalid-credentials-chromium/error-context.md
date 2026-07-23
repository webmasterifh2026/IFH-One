# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Workflow >> should fail login with invalid credentials
- Location: e2e\auth.spec.ts:34:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/invalid|wrong|error|failed/i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/invalid|wrong|error|failed/i).first()

```

```yaml
- status: Server is unavailable — retrying automatically…
- link "IFH One Procurement ERP":
    - /url: /
- heading "Enterprise Procurement, Simplified." [level=1]
- paragraph: End-to-end procurement management from indent to payment — tracked, audited, and governed.
- text: 22-Stage Automated Workflow Role-Based Access Control Real-Time Analytics © 2026 Intensiv-Filter Himenviro · Version v3.0.3
- navigation "Breadcrumb":
    - link "Home":
        - /url: /
    - text: Login
- heading "Welcome back" [level=2]
- paragraph: Sign in to your IFH One account
- text: Email Address
- textbox "Email Address":
    - /placeholder: you@if-himenviro.in
    - text: invalid@example.com
- text: Password
- textbox "Password":
    - /placeholder: Enter your password
    - text: wrongpassword
- button "Show password"
- checkbox "Remember me"
- text: Remember me Forgot password?
- button "Signing in..." [disabled]
- text: Need access?
- link "Contact Admin":
    - /url: mailto:admin@if-himenviro.in
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.describe('Authentication Workflow', () => {
  4  |   test('should login successfully with valid credentials', async ({ page }) => {
  5  |     // Go to the login page (or homepage if it redirects)
  6  |     await page.goto('/');
  7  |
  8  |     // Wait for network idle to ensure the page has loaded
  9  |     await page.waitForLoadState('networkidle');
  10 |
  11 |     // Sometimes there is a redirect to /login
  12 |     if (page.url().includes('/login')) {
  13 |       // Find the email and password inputs
  14 |       const emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
  15 |       const passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[type="password"]'));
  16 |
  17 |       // Enter credentials (we'll use one of the users from the rbac seed)
  18 |       await emailInput.fill('pramod.kumar@if-himenviro.in');
  19 |       await passwordInput.fill('password123'); // Assuming default password or we'll adjust later
  20 |
  21 |       // Submit the form
  22 |       const loginButton = page.getByRole('button', { name: /login|sign in/i });
  23 |       await loginButton.click();
  24 |
  25 |       // Wait for navigation to dashboard or home
  26 |       await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
  27 |     }
  28 |
  29 |     // Verify successful login (e.g., presence of a logout button or dashboard text)
  30 |     // We'll just check that we are no longer on the login page and no obvious error is shown
  31 |     expect(page.url()).not.toContain('/login');
  32 |   });
  33 |
  34 |   test('should fail login with invalid credentials', async ({ page }) => {
  35 |     await page.goto('/login');
  36 |     await page.waitForLoadState('networkidle');
  37 |
  38 |     const emailInput = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
  39 |     const passwordInput = page.getByPlaceholder(/password/i).or(page.locator('input[type="password"]'));
  40 |
  41 |     await emailInput.fill('invalid@example.com');
  42 |     await passwordInput.fill('wrongpassword');
  43 |
  44 |     const loginButton = page.getByRole('button', { name: /login|sign in/i });
  45 |     await loginButton.click();
  46 |
  47 |     // Check for error message
  48 |     const errorMessage = page.getByText(/invalid|wrong|error|failed/i).first();
> 49 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
     |                                ^ Error: expect(locator).toBeVisible() failed
  50 |   });
  51 | });
  52 |
```
