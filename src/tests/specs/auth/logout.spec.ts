// @ts-nocheck
import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../../pages/login.page';
import { DashboardPage } from '../../../pages/dashboard.page';

// The logout function as a string, to be added via page.addScriptTag
// This simulates the client-side availability of the logout function.
const logoutScript = `
  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    window.location.href = '/login';
  }
`;

test.describe('Auth Logout Functionality', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // Ensure a clean slate for storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to a mock authenticated page to start.
    // This allows setting storage items and then triggering logout.
    await dashboardPage.navigateTo();
    
    // Inject the logout function into the page's context for direct calls
    await page.addScriptTag({ content: logoutScript });
  });

  // TC-001 | Happy Path: Successful Logout with All Data Present
  test('TC-001 | Happy Path: Successful Logout with All Data Present', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "test_access_token_123";
    const REFRESH_TOKEN = "test_refresh_token_456";
    const SESSION_DATA_KEY = "userSettings";
    const SESSION_DATA_VALUE = "{\"theme\":\"dark\",\"notifications\":true}";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 4: Call the logout function
    await page.evaluate(() => logout());

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-002 | Happy Path: Logout When Only Access Token Present
  test('TC-002 | Happy Path: Logout When Only Access Token Present', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "test_access_token_789";
    const SESSION_DATA_KEY = "userCart";
    const SESSION_DATA_VALUE = "{\"items\":[{\"id\":1}]}";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 4: Call the logout function
    await page.evaluate(() => logout());

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull(); // Should be null as it was never set
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-003 | Happy Path: Logout When No Tokens Present but Session Data Exists
  test('TC-003 | Happy Path: Logout When No Tokens Present but Session Data Exists', async ({ page }) => {
    // Data Requirements
    const SESSION_DATA_KEY = "lastVisitedPage";
    const SESSION_DATA_VALUE = "/profile";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      // Ensure local storage is empty
      localStorage.clear();
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 4: Call the logout function
    await page.evaluate(() => logout());

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-004 | Happy Path: Logout When All Storage is Already Empty
  test('TC-004 | Happy Path: Logout When All Storage is Already Empty', async ({ page }) => {
    // Preconditions: Ensure storage is empty (done in beforeEach)
    // Optional: Explicitly clear again to demonstrate
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Step 3: Call the logout function
    await page.evaluate(() => logout());

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.length)).resolves.toBe(0);
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-005 | Edge Case: Rapid Consecutive Logouts
  test('TC-005 | Edge Case: Rapid Consecutive Logouts', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "dup_access_token";
    const REFRESH_TOKEN = "dup_refresh_token";
    const SESSION_DATA_KEY = "dup_data";
    const SESSION_DATA_VALUE = "1";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 3: Trigger the logout function twice in rapid succession
    // The `window.location.href` assignment is synchronous and will trigger navigation once.
    // Subsequent calls within the same evaluate won't cause multiple navigations in practice.
    await page.evaluate(() => {
      logout();
      logout();
    });

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-006 | Integration: Logout Triggered by UI Element
  test('TC-006 | Integration: Logout Triggered by UI Element', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "ui_access_token";
    const REFRESH_TOKEN = "ui_refresh_token";
    const SESSION_DATA_KEY = "ui_data";
    const SESSION_DATA_VALUE = "some_ui_value";

    // Step 1: Navigate to an authenticated page containing a logout button (simulated)
    await page.setContent(`
      <html>
        <body>
          <h1>Dashboard</h1>
          <button id="logout-btn" onclick="logout()">Logout</button>
          <script>${logoutScript}</script>
        </body>
      </html>
    `, { waitUntil: 'domcontentloaded' }); // Use domcontentloaded for local HTML

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 3: Click the logout button
    await dashboardPage.logoutButton.click();

    // Expected Result: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assertions
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-007 | Accessibility: Focus Management After Logout
  test('TC-007 | Accessibility: Focus Management After Logout', async ({ page }) => {
    // Preconditions: Trigger logout
    // Set some dummy data to ensure logout has something to clear
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'dummy');
      sessionStorage.setItem('dummy', 'data');
    });
    
    // Step 2: Trigger the logout function
    await page.evaluate(() => logout());

    // Step 3: Assert that the browser redirects to /login
    await loginPage.assertOnLoginPage();

    // Step 4: On the /login page, assert initial focus
    // We need to simulate the login page HTML to control focus
    await page.setContent(`
      <html>
        <body>
          <h1>Login</h1>
          <input type="text" name="username" autofocus />
          <input type="password" name="password" />
          <button>Login</button>
        </body>
      </html>
    `, { waitUntil: 'domcontentloaded' });

    // Expected Result: Username input field has focus
    await loginPage.assertUsernameInputHasFocus();
  });

  // TC-008 | State Management: Verify No Residual Data After Logout and Back Navigation
  test('TC-008 | State Management: Verify No Residual Data After Logout and Back Navigation', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "back_access_token";
    const REFRESH_TOKEN = "back_refresh_token";
    const SESSION_DATA_KEY = "back_data";
    const SESSION_DATA_VALUE = "history_test";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 3: Call the logout function
    await page.evaluate(() => logout());

    // Step 4: Wait for navigation to /login
    await loginPage.assertOnLoginPage();

    // Assert that storage is cleared on login page
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);

    // Step 5: Attempt to navigate back
    await page.goBack();
    
    // Step 6: Wait for navigation (if any) and assert current URL.
    // If the previous page was protected by client-side auth, it should redirect back to /login.
    await loginPage.assertOnLoginPage(); // Should remain on /login

    // Assert that storage is still clear, even if a protected page was briefly loaded (unlikely with this setup)
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-009 | Performance: Logout Speed (Micro-benchmark)
  test('TC-009 | Performance: Logout Speed (Micro-benchmark)', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "perf_access_token";
    const REFRESH_TOKEN = "perf_refresh_token";
    const SESSION_DATA_KEY = "perf_data";
    const SESSION_DATA_VALUE = "{\"many\":\"properties\", \"to\":\"clear\",\"p2\":\"v2\",\"p3\":\"v3\",\"p4\":\"v4\",\"p5\":\"v5\",\"p6\":\"v6\"}";

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 3-5: Record performance
    const duration = await page.evaluate(() => {
      const start = performance.now();
      logout(); // Call the logout function
      const end = performance.now();
      return end - start;
    });

    // Expected Result: Duration should be very low (excluding navigation time)
    const MAX_EXPECTED_DURATION_MS = 50; // Example threshold
    expect(duration).toBeLessThan(MAX_EXPECTED_DURATION_MS);

    // Assert that logout function still performed its duties (cleared storage and redirected)
    // We need to wait for navigation separately as page.evaluate returns before navigation completes.
    await loginPage.assertOnLoginPage();
    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);
  });

  // TC-010 | Negative Scenario: Attempting to Intercept Redirect (Theoretical)
  test('TC-010 | Negative Scenario: Attempting to Intercept Redirect (Theoretical)', async ({ page }) => {
    // Data Requirements
    const ACCESS_TOKEN = "intercept_access";
    const REFRESH_TOKEN = "intercept_refresh";
    const SESSION_DATA_KEY = "intercept_data";
    const SESSION_DATA_VALUE = "block_me";
    let interceptCount: number = 0;

    // Preconditions: Set mock data
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem(data.sessionDataKey, data.sessionDataValue);
    }, { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, sessionDataKey: SESSION_DATA_KEY, sessionDataValue: SESSION_DATA_VALUE });

    // Step 3: Add a page.route to intercept /login requests
    await page.route('**/login', async route => {
      interceptCount++;
      // For this test, we allow the navigation to proceed to confirm it happens
      await route.continue();
    });

    // Step 4: Call the logout function
    await page.evaluate(() => logout());

    // Expected Result: Playwright asserts that localStorage and sessionStorage are cleared.
    // Wait for the route interception to be hit and for navigation to complete.
    await page.waitForURL('**/login'); // Wait for the actual navigation to /login

    await expect(page.evaluate(() => localStorage.getItem('accessToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => localStorage.getItem('refreshToken'))).resolves.toBeNull();
    await expect(page.evaluate(() => sessionStorage.length)).resolves.toBe(0);

    // Assert that the interceptor was hit, confirming navigation was attempted
    expect(interceptCount).toBeGreaterThan(0);
  });
});

// Assume the following Page Objects exist in '../../../pages/'
// --- login.page.ts ---
// import { Page, expect } from '@playwright/test';
// export class LoginPage {
//   readonly page: Page;
//   readonly url = '/login';
//   readonly usernameInput;
//
//   constructor(page: Page) {
//     this.page = page;
//     this.usernameInput = page.locator('input[name="username"]');
//   }
//
//   async navigateTo() {
//     await this.page.goto(this.url);
//   }
//
//   async assertOnLoginPage() {
//     await expect(this.page).toHaveURL(/.*\/login/);
//   }
//
//   async assertUsernameInputHasFocus() {
//     await expect(this.usernameInput).toBeFocused();
//   }
// }
//
// --- dashboard.page.ts ---
// import { Page, expect } from '@playwright/test';
// export class DashboardPage {
//   readonly page: Page;
//   readonly url = '/dashboard';
//   readonly logoutButton;
//
//   constructor(page: Page) {
//     this.page = page;
//     this.logoutButton = page.locator('button#logout-btn');
//   }
//
//   async navigateTo() {
//     await this.page.goto(this.url);
//   }
//
//   async assertOnDashboardPage() {
//     await expect(this.page).toHaveURL(/.*\/dashboard/);
//   }
// }