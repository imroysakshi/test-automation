// @ts-nocheck
import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../../pages/auth.page'; // Path from src/tests/specs/auth/
import {
  MOCK_ACCESS_TOKEN,
  MOCK_REFRESH_TOKEN,
  MOCK_USER_ID,
  MOCK_PREFERENCES,
  MOCK_SOME_OTHER_KEY,
  MOCK_THEME_PREFERENCE,
  MOCK_LAST_VISITED_PAGE,
} from '../../../constants/auth-data'; // Path from src/tests/specs/auth/

// The content of the logout function as it would exist in the application codebase
// This is executed directly in the browser context via page.evaluate
const logoutFunctionInBrowserContext = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.clear();
  window.location.href = '/login';
};

test.describe('Logout Functionality', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    // Clear storage before each test to ensure a clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('TC-001 | Successful Logout - All Authentication Data Present', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state
    await page.evaluate(
      (accessToken, refreshToken, userId, preferences, someOtherKey) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('someOtherKey', someOtherKey);
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('preferences', preferences);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN,
      MOCK_USER_ID,
      MOCK_PREFERENCES,
      MOCK_SOME_OTHER_KEY
    );

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      someOtherKey: localStorage.getItem('someOtherKey'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull();
    expect(localStorageAfterLogout.someOtherKey).toBe(MOCK_SOME_OTHER_KEY); // Other key should remain

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });

  test('TC-002 | Successful Logout - Only Access Token Present', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state
    await page.evaluate(
      (accessToken, userId, someOtherKey) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('someOtherKey', someOtherKey);
        sessionStorage.setItem('userId', userId);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_USER_ID,
      MOCK_SOME_OTHER_KEY
    );

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      someOtherKey: localStorage.getItem('someOtherKey'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull(); // Was never present, should still be null
    expect(localStorageAfterLogout.someOtherKey).toBe(MOCK_SOME_OTHER_KEY);

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });

  test('TC-003 | Successful Logout - Only Refresh Token Present', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state
    await page.evaluate(
      (refreshToken, userId, someOtherKey) => {
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('someOtherKey', someOtherKey);
        sessionStorage.setItem('userId', userId);
      },
      MOCK_REFRESH_TOKEN,
      MOCK_USER_ID,
      MOCK_SOME_OTHER_KEY
    );

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      someOtherKey: localStorage.getItem('someOtherKey'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull(); // Was never present, should still be null
    expect(localStorageAfterLogout.refreshToken).toBeNull();
    expect(localStorageAfterLogout.someOtherKey).toBe(MOCK_SOME_OTHER_KEY);

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });

  test('TC-004 | Successful Logout - No Tokens Present in Local Storage', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state (only non-auth local storage item, and session data)
    await page.evaluate(
      (userId, someOtherKey) => {
        localStorage.setItem('someOtherKey', someOtherKey);
        sessionStorage.setItem('userId', userId);
      },
      MOCK_USER_ID,
      MOCK_SOME_OTHER_KEY
    );

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      someOtherKey: localStorage.getItem('someOtherKey'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull();
    expect(localStorageAfterLogout.someOtherKey).toBe(MOCK_SOME_OTHER_KEY);

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });

  test('TC-005 | Successful Logout - Session Storage Already Empty', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial local storage state, session storage is already empty from beforeEach
    await page.evaluate(
      (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN
    );

    // Verify session storage is empty (precondition check)
    let sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull();

    sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0); // Should remain empty
  });

  test('TC-006 | Successful Logout - Both Storages Already Empty', async ({ page }) => {
    await authPage.navigateToDashboard(); // Or any page, state is independent of URL here.

    // Both storages are already empty from beforeEach

    // Verify storages are empty (precondition check)
    let localStorageLength = await page.evaluate(() => localStorage.length);
    let sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(localStorageLength).toBe(0);
    expect(sessionStorageLength).toBe(0);

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    localStorageLength = await page.evaluate(() => localStorage.length);
    sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(localStorageLength).toBe(0); // Should remain empty
    expect(sessionStorageLength).toBe(0); // Should remain empty
  });

  test('TC-007 | Redirects to Login Page when Already on Login Page', async ({ page }) => {
    await authPage.navigateToLogin(); // Navigate to login page first

    // Set initial storage state
    await page.evaluate(
      (accessToken, refreshToken, userId) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('userId', userId);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN,
      MOCK_USER_ID
    );

    // Ensure we are on the login page initially
    expect(page.url()).toContain('/login');

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    // Even if already on /login, waitForURL confirms the navigation was attempted/completed
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull();

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });

  test('TC-008 | Preserves Other Local Storage Items Not Related to Authentication', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state with auth tokens and unrelated data
    await page.evaluate(
      (accessToken, refreshToken, themePreference, lastVisitedPage) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('themePreference', themePreference);
        sessionStorage.setItem('lastVisitedPage', lastVisitedPage);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN,
      MOCK_THEME_PREFERENCE,
      MOCK_LAST_VISITED_PAGE
    );

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    const localStorageAfterLogout: Record<string, string | null> = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      themePreference: localStorage.getItem('themePreference'),
    }));
    expect(localStorageAfterLogout.accessToken).toBeNull();
    expect(localStorageAfterLogout.refreshToken).toBeNull();
    expect(localStorageAfterLogout.themePreference).toBe(MOCK_THEME_PREFERENCE); // Unrelated key should remain

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0);
  });
});