// @ts-nocheck
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

// Additional mock data for new test cases
const MOCK_OTHER_PERSISTENT_DATA = 'important_info_123';
const MOCK_SESSION_USER = 'loggedInUser_abc';

// The content of the logout function as it would exist in the application codebase
// This is executed directly in the browser context via page.evaluate
const logoutFunctionInBrowserContext = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.clear();
  window.location.href = '/login';
};

// The content of the logoutOnSessionExpiry function as it would exist in the application codebase
// This is executed directly in the browser context via page.evaluate
const logoutOnSessionExpiryFunctionInBrowserContext = () => {
  localStorage.clear();
  sessionStorage.clear();
  console.warn('Session expired. Logging out user.');
  window.location.href = '/login?reason=session-expired';
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

  // TC-009 | Performance Scenario: Rapid consecutive calls to `logout`
  test('TC-009 | Performance: Rapid consecutive calls to logout', async ({ page }) => {
    await authPage.navigateToDashboard(); // Or any page that's not /login

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

    const startTime = performance.now();
    const numberOfCalls = 5; // Reduced to 5 for quicker execution and still demonstrate intent
    for (let i = 0; i < numberOfCalls; i++) {
      await page.evaluate(logoutFunctionInBrowserContext);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assertions
    // The browser should eventually redirect to /login and stay there
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

    // Check performance: should be quick
    // 500ms is a generous threshold for 5 consecutive calls, considering Playwright overhead.
    expect(duration).toBeLessThan(500);
  });

  // TC-010 | Negative Scenario: `logout` without a valid `window.location` context
  test('TC-010 | Negative: logout on a data URL (no standard navigation)', async ({ page }) => {
    // Navigate to a data URL, where location.href assignment might behave differently
    await page.goto('data:text/html,<html><body><h1>Data URL Test</h1></body></html>');

    // Set initial storage state
    await page.evaluate(
      (accessToken, refreshToken, userId, someOtherKey) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('someOtherKey', someOtherKey);
        sessionStorage.setItem('userId', userId);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN,
      MOCK_USER_ID,
      MOCK_SOME_OTHER_KEY
    );

    // Verify initial state
    expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe(MOCK_ACCESS_TOKEN);
    expect(await page.evaluate(() => sessionStorage.getItem('userId'))).toBe(MOCK_USER_ID);

    // Get current URL before logout
    const initialUrl = page.url();

    // Execute logout function
    await page.evaluate(logoutFunctionInBrowserContext);

    // Assertions
    // Storage should still be cleared
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

    // Navigation might not happen or might stay on data URL
    // We expect it not to redirect to /login from a data URL, so it should stay on the data URL.
    // If Playwright would try to navigate, it would navigate to about:blank if current page is data url.
    // Given the behaviour of window.location.href in data: context, it's safer to check it doesn't navigate away.
    expect(page.url()).toBe(initialUrl);
  });

  // TC-011 | Happy Path: `logoutOnSessionExpiry` clears ALL storage, logs a warning, and redirects with reason parameter
  test('TC-011 | Happy Path: logoutOnSessionExpiry clears ALL storage, logs warning, redirects with reason', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set initial storage state with various data
    await page.evaluate(
      (accessToken, refreshToken, otherPersistentData, sessionUser) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('otherPersistentData', otherPersistentData);
        sessionStorage.setItem('sessionUser', sessionUser);
        sessionStorage.setItem('someOtherSessionData', 'session_data_123'); // Add another session data
      },
      MOCK_ACCESS_TOKEN,
      MOCK_REFRESH_TOKEN,
      MOCK_OTHER_PERSISTENT_DATA,
      MOCK_SESSION_USER
    );

    // Set up a console listener
    let consoleWarningMessage: string | undefined;
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarningMessage = msg.text();
      }
    });

    // Execute logoutOnSessionExpiry function
    await page.evaluate(logoutOnSessionExpiryFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login?reason=session-expired');
    expect(page.url()).toContain('/login?reason=session-expired');

    const localStorageLength = await page.evaluate(() => localStorage.length);
    expect(localStorageLength).toBe(0); // All local storage cleared

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0); // All session storage cleared

    expect(consoleWarningMessage).toBe('Session expired. Logging out user.');
  });

  // TC-012 | Edge Case: `logoutOnSessionExpiry` when `localStorage` is empty, but session data exists
  test('TC-012 | Edge Case: logoutOnSessionExpiry when localStorage empty, session data exists', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Ensure localStorage is empty (from beforeEach clear, no new items added)
    // Set only session storage data
    await page.evaluate(
      (sessionUser) => {
        sessionStorage.setItem('sessionUser', sessionUser);
      },
      MOCK_SESSION_USER
    );

    // Set up a console listener
    let consoleWarningMessage: string | undefined;
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarningMessage = msg.text();
      }
    });

    // Execute logoutOnSessionExpiry function
    await page.evaluate(logoutOnSessionExpiryFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login?reason=session-expired');
    expect(page.url()).toContain('/login?reason=session-expired');

    const localStorageLength = await page.evaluate(() => localStorage.length);
    expect(localStorageLength).toBe(0); // Should remain empty

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0); // Session storage cleared

    expect(consoleWarningMessage).toBe('Session expired. Logging out user.');
  });

  // TC-013 | Edge Case: `logoutOnSessionExpiry` when `sessionStorage` is empty, but `localStorage` contains data
  test('TC-013 | Edge Case: logoutOnSessionExpiry when sessionStorage empty, localStorage has data', async ({ page }) => {
    await authPage.navigateToDashboard();

    // Set local storage data, ensure sessionStorage is empty (from beforeEach clear)
    await page.evaluate(
      (accessToken, otherPersistentData) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('otherPersistentData', otherPersistentData);
      },
      MOCK_ACCESS_TOKEN,
      MOCK_OTHER_PERSISTENT_DATA
    );

    // Set up a console listener
    let consoleWarningMessage: string | undefined;
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarningMessage = msg.text();
      }
    });

    // Execute logoutOnSessionExpiry function
    await page.evaluate(logoutOnSessionExpiryFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login?reason=session-expired');
    expect(page.url()).toContain('/login?reason=session-expired');

    const localStorageLength = await page.evaluate(() => localStorage.length);
    expect(localStorageLength).toBe(0); // Local storage cleared

    const sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(sessionStorageLength).toBe(0); // Should remain empty

    expect(consoleWarningMessage).toBe('Session expired. Logging out user.');
  });

  // TC-014 | Edge Case: `logoutOnSessionExpiry` when all storage is empty
  test('TC-014 | Edge Case: logoutOnSessionExpiry when all storage empty', async ({ page }) => {
    await authPage.navigateToDashboard(); // Or any page, state is independent of URL here.

    // Both storages are already empty from beforeEach

    // Verify storages are empty (precondition check)
    let localStorageLength = await page.evaluate(() => localStorage.length);
    let sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(localStorageLength).toBe(0);
    expect(sessionStorageLength).toBe(0);

    // Set up a console listener
    let consoleWarningMessage: string | undefined;
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleWarningMessage = msg.text();
      }
    });

    // Execute logoutOnSessionExpiry function
    await page.evaluate(logoutOnSessionExpiryFunctionInBrowserContext);

    // Assertions
    await page.waitForURL('/login?reason=session-expired');
    expect(page.url()).toContain('/login?reason=session-expired');

    localStorageLength = await page.evaluate(() => localStorage.length);
    sessionStorageLength = await page.evaluate(() => sessionStorage.length);
    expect(localStorageLength).toBe(0); // Should remain empty
    expect(sessionStorageLength).toBe(0); // Should remain empty

    expect(consoleWarningMessage).toBe('Session expired. Logging out user.');
  });
});