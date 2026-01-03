/**
 * E2E tests for critical user journeys in CardVault
 * Tests the complete flow from registration to card usage
 */

import { test, expect, type Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test data generators
const generateTestUser = () => ({
  username: `testuser_${randomBytes(4).toString('hex')}`,
  password: 'TestPassword123!',
  email: `test_${randomBytes(4).toString('hex')}@example.com`
});

const generateTestCard = () => ({
  name: `Test Card ${randomBytes(2).toString('hex')}`,
  number: '4111111111111111',
  pin: '1234',
  barcode: '123456789012',
  notes: 'Test card for E2E testing'
});

// Helper functions
async function registerUser(page: Page, userData: any) {
  await page.goto('/register');
  await page.fill('input[name="username"]', userData.username);
  await page.fill('input[name="password"]', userData.password);
  await page.fill('input[name="confirmPassword"]', userData.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

async function loginUser(page: Page, userData: any) {
  await page.goto('/login');
  await page.fill('input[name="username"]', userData.username);
  await page.fill('input[name="password"]', userData.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

async function addCard(page: Page, cardData: any) {
  await page.click('button:has-text("Add Card")');
  await page.fill('input[name="cardName"]', cardData.name);
  await page.fill('input[name="cardNumber"]', cardData.number);
  await page.fill('input[name="pin"]', cardData.pin);
  await page.fill('input[name="barcode"]', cardData.barcode);
  await page.fill('textarea[name="notes"]', cardData.notes);
  await page.click('button:has-text("Save Card")');
}

test.describe('Critical User Journeys', () => {
  let testUser: any;
  let testCard: any;

  test.beforeEach(async () => {
    testUser = generateTestUser();
    testCard = generateTestCard();
  });

  test('Complete registration and login flow', async ({ page }) => {
    // Registration
    await page.goto('/');
    await page.click('a:has-text("Sign Up")');
    await expect(page).toHaveURL('/register');

    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after registration
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Login with same credentials
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    // Should be back on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text="Welcome back"')).toBeVisible();
  });

  test('Add and view loyalty card', async ({ page }) => {
    // Register and login
    await registerUser(page, testUser);

    // Add a card
    await page.click('button:has-text("Add Card")');
    await expect(page.locator('h2')).toContainText('Add New Card');

    await page.fill('input[name="cardName"]', testCard.name);
    await page.fill('input[name="cardNumber"]', testCard.number);
    await page.fill('input[name="pin"]', testCard.pin);
    await page.fill('input[name="barcode"]', testCard.barcode);
    await page.fill('textarea[name="notes"]', testCard.notes);

    // Save card
    await page.click('button:has-text("Save Card")');

    // Verify card appears in list
    await expect(page.locator(`text="${testCard.name}"`)).toBeVisible();

    // View card details
    await page.click(`text="${testCard.name}"`);

    // Verify masked card number
    await expect(page.locator('text="****1111"')).toBeVisible();

    // Reveal PIN
    await page.click('button:has-text("Show PIN")');
    await expect(page.locator(`text="${testCard.pin}"`)).toBeVisible();

    // Hide PIN
    await page.click('button:has-text("Hide PIN")');
    await expect(page.locator('text="****"')).toBeVisible();
  });

  test('Display barcode at checkout', async ({ page }) => {
    await registerUser(page, testUser);
    await addCard(page, testCard);

    // Click on card to view
    await page.click(`text="${testCard.name}"`);

    // Click show barcode
    await page.click('button:has-text("Show Barcode")');

    // Verify barcode is displayed
    const barcodeElement = await page.locator('canvas.barcode, img.barcode, svg.barcode').first();
    await expect(barcodeElement).toBeVisible();

    // Verify barcode number is shown
    await expect(page.locator(`text="${testCard.barcode}"`)).toBeVisible();

    // Test fullscreen mode
    await page.click('button:has-text("Fullscreen")');
    await expect(page.locator('.fullscreen-barcode')).toBeVisible();

    // Exit fullscreen
    await page.keyboard.press('Escape');
    await expect(page.locator('.fullscreen-barcode')).not.toBeVisible();
  });

  test('Search and filter cards', async ({ page }) => {
    await registerUser(page, testUser);

    // Add multiple cards
    const cards = [
      { ...testCard, name: 'Grocery Store Card' },
      { ...testCard, name: 'Pharmacy Rewards' },
      { ...testCard, name: 'Coffee Shop Card' }
    ];

    for (const card of cards) {
      await addCard(page, card);
      await page.waitForTimeout(500); // Brief wait between additions
    }

    // Search for specific card
    await page.fill('input[placeholder*="Search"]', 'Pharmacy');
    await expect(page.locator('text="Pharmacy Rewards"')).toBeVisible();
    await expect(page.locator('text="Grocery Store Card"')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder*="Search"]', '');
    await expect(page.locator('text="Grocery Store Card"')).toBeVisible();
    await expect(page.locator('text="Coffee Shop Card"')).toBeVisible();
  });

  test('Edit and delete card', async ({ page }) => {
    await registerUser(page, testUser);
    await addCard(page, testCard);

    // Click on card to view
    await page.click(`text="${testCard.name}"`);

    // Edit card
    await page.click('button:has-text("Edit")');
    const newName = 'Updated Card Name';
    await page.fill('input[name="cardName"]', newName);
    await page.click('button:has-text("Save Changes")');

    // Verify name updated
    await expect(page.locator(`text="${newName}"`)).toBeVisible();

    // Delete card
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm Delete")');

    // Verify card is removed
    await expect(page.locator(`text="${newName}"`)).not.toBeVisible();
    await expect(page.locator('text="No cards found"')).toBeVisible();
  });

  test('PWA offline functionality', async ({ page, context }) => {
    await registerUser(page, testUser);
    await addCard(page, testCard);

    // Wait for service worker to be ready
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Refresh page
    await page.reload();

    // Should still show cached dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    // Cards should be available from cache
    await expect(page.locator(`text="${testCard.name}"`)).toBeVisible();

    // Click on card - should work offline
    await page.click(`text="${testCard.name}"`);
    await expect(page.locator('text="****1111"')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Add new card to verify sync
    const onlineCard = { ...testCard, name: 'Online Card' };
    await addCard(page, onlineCard);
    await expect(page.locator(`text="${onlineCard.name}"`)).toBeVisible();
  });

  test('Google OAuth login', async ({ page }) => {
    await page.goto('/login');

    // Click Google Sign-In button
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();

    // Mock OAuth flow (in real test, would use test Google account)
    await page.route('**/api/auth/google', async route => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/dashboard?token=mock-jwt-token'
        }
      });
    });

    await googleButton.click();

    // Should redirect to dashboard after OAuth
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Security: XSS prevention', async ({ page }) => {
    await registerUser(page, testUser);

    // Try to add card with XSS payload
    const xssCard = {
      ...testCard,
      name: '<script>alert("XSS")</script>',
      notes: '<img src=x onerror=alert("XSS")>'
    };

    await addCard(page, xssCard);

    // Verify script is not executed
    page.on('dialog', dialog => {
      // Fail test if alert appears
      expect(dialog.message()).not.toContain('XSS');
      dialog.dismiss();
    });

    // Card name should be escaped
    await expect(page.locator('text="<script>alert("XSS")</script>"')).toBeVisible();

    // No script tags should be in DOM
    const scripts = await page.locator('script').count();
    const initialScripts = scripts;
    await page.click(`text="${xssCard.name}"`);
    const afterScripts = await page.locator('script').count();
    expect(afterScripts).toBe(initialScripts);
  });

  test('Responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await registerUser(page, testUser);
    await addCard(page, testCard);

    // Check mobile menu
    await expect(page.locator('button.mobile-menu-toggle')).toBeVisible();
    await page.click('button.mobile-menu-toggle');

    // Mobile navigation should be visible
    await expect(page.locator('nav.mobile-nav')).toBeVisible();

    // Cards should be in mobile layout
    const cardGrid = page.locator('.card-grid');
    const gridStyle = await cardGrid.evaluate(el =>
      window.getComputedStyle(el).getPropertyValue('grid-template-columns')
    );
    expect(gridStyle).toContain('1fr'); // Single column on mobile
  });

  test('Performance: Fast card loading', async ({ page }) => {
    await registerUser(page, testUser);

    // Add multiple cards
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await addCard(page, { ...testCard, name: `Card ${i}` });
    }
    const endTime = Date.now();

    // Should add 10 cards in reasonable time
    expect(endTime - startTime).toBeLessThan(15000); // 15 seconds max

    // Measure page load time
    const loadStart = Date.now();
    await page.reload();
    await page.waitForSelector('text="Card 9"');
    const loadEnd = Date.now();

    // Page should load with cards quickly
    expect(loadEnd - loadStart).toBeLessThan(3000); // 3 seconds max
  });

  test('Accessibility: Keyboard navigation', async ({ page }) => {
    await registerUser(page, testUser);
    await addCard(page, testCard);

    // Navigate using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should focus on first card
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain(testCard.name);

    // Press Enter to select card
    await page.keyboard.press('Enter');
    await expect(page.locator('text="****1111"')).toBeVisible();

    // Tab to Show PIN button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // PIN should be visible
    await expect(page.locator(`text="${testCard.pin}"`)).toBeVisible();

    // Escape to close
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Data persistence across sessions', async ({ browser }) => {
    // Create first browser context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Register and add card
    await registerUser(page1, testUser);
    await addCard(page1, testCard);
    await expect(page1.locator(`text="${testCard.name}"`)).toBeVisible();

    // Get auth token
    const cookies = await context1.cookies();
    await context1.close();

    // Create new browser context
    const context2 = await browser.newContext();
    await context2.addCookies(cookies);
    const page2 = await context2.newPage();

    // Navigate to dashboard
    await page2.goto('/dashboard');

    // Card should still be there
    await expect(page2.locator(`text="${testCard.name}"`)).toBeVisible();

    await context2.close();
  });
});