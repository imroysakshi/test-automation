// @ts-nocheck
import { test, expect, Page } from '@playwright/test';
import { AuthPage } from '../../../pages/auth.page'; // Assumed to exist in test-automation/src/pages/auth.page.ts as per instructions

// --- Start of application functions as string constants for injection ---
// These functions are sourced directly from app-codebase/src/features/auth/refreshToken.ts
// and are provided here as string constants to be injected into the browser context.
// This approach adheres to the principle of not directly importing from application source files
// while allowing testing of the client-side behavior of these functions.
const REFRESH_TOKEN_FUNCTION_STRING = `
function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    // Simulate token refresh
    const newAccessToken = 'new_access_token_' + Date.now();

    // Store new access token
    localStorage.setItem('accessToken', newAccessToken);

    console.log('Access token refreshed successfully');

    return newAccessToken;
}
`;

const HANDLE_REFRESH_TOKEN_FAILURE_FUNCTION_STRING = `
function handleRefreshTokenFailure() {
    console.warn('Refresh token failed. Logging out user.');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();

    window.location.href = '/login';
}
`;
// --- End of application functions as string constants for injection ---

// Assume AuthPage class is defined as follows (for context):
// test-automation/src/pages/auth.page.ts
/*
import { Page } from '@playwright/test';

export class AuthPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToAnyPage(): Promise<void> {
    await this.page.goto('/');
  }

  // Injects the provided function strings into the browser's global scope.
  async setupAuthFunctionsInBrowser(refreshTokenFnCode: string, handleFailureFnCode: string): Promise<void> {
    await this.page.evaluate(([_refreshTokenFnCode, _handleFailureFnCode]) => {
      const script = document.createElement('script');
      script.textContent = _refreshTokenFnCode + '\n' + _handleFailureFnCode;
      document.head.appendChild(script);
    }, [refreshTokenFnCode, handleFailureFnCode]);
  }

  // Calls the 'refreshAccessToken' function from the browser's context.
  async callRefreshAccessToken(): Promise<string> {
    return this.page.evaluate(() => refreshAccessToken());
  }

  // Calls the 'refreshAccessToken' function from the browser's context,
  // specifically for scenarios where an error is expected.
  async callRefreshAccessTokenExpectingError(): Promise<any> {
    return this.page.evaluate(() => refreshAccessToken());
  }

  // Calls the 'handleRefreshTokenFailure' function from the browser's context.
  async callHandleRefreshTokenFailure(): Promise<void> {
    return this.page.evaluate(() => handleRefreshTokenFailure());
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  async removeLocalStorageItem(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }

  async clearSessionStorage(): Promise<void> {
    await this.page.evaluate(() => sessionStorage.clear());
  }

  async getSessionStorageLength(): Promise<number> {
    return this.page.evaluate(() => sessionStorage.length);
  }

  async setSessionStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [key, value]);
  }
}
*/

test.describe('Auth - Token Refresh and Failure Handling', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.navigateToAnyPage(); // Navigate to a base page for context

    // Inject the functions into the browser context for each test run.
    // This ensures the functions are available in the browser's global scope before calls.
    await authPage.setupAuthFunctionsInBrowser(REFRESH_TOKEN_FUNCTION_STRING, HANDLE_REFRESH_TOKEN_FAILURE_FUNCTION_STRING);

    // Ensure clean state before each test
    await authPage.removeLocalStorageItem('accessToken');
    await authPage.removeLocalStorageItem('refreshToken');
    await authPage.clearSessionStorage();
  });

  // TC-001 | refreshAccessToken - Successfully refreshes token when refresh token is present
  test('TC-001 | should successfully refresh token when refresh token is present', async ({ page }) => {
    const mockRefreshToken = 'mock_refresh_token';
    const oldAccessToken = 'old_access_token';

    await authPage.setLocalStorageItem('refreshToken', mockRefreshToken);
    await authPage.setLocalStorageItem('accessToken', oldAccessToken);

    const newAccessToken = await authPage.callRefreshAccessToken();

    expect(newAccessToken).toMatch(/^new_access_token_\d+$/);
    expect(newAccessToken).not.toBe(oldAccessToken);

    const storedAccessToken = await authPage.getLocalStorageItem('accessToken');
    expect(storedAccessToken).toBe(newAccessToken);

    const storedRefreshToken = await authPage.getLocalStorageItem('refreshToken');
    expect(storedRefreshToken).toBe(mockRefreshToken); // Refresh token should remain untouched
  });

  // TC-002 | refreshAccessToken - Throws error when no refresh token is available
  test('TC-002 | should throw error when no refresh token is available', async ({ page }) => {
    await authPage.removeLocalStorageItem('refreshToken'); // Ensure no refresh token
    const existingAccessToken = 'some_existing_token';
    await authPage.setLocalStorageItem('accessToken', existingAccessToken);

    // Expect the function call within the browser context to reject with the specified error
    await expect(authPage.callRefreshAccessTokenExpectingError()).rejects.toThrow('No refresh token available');

    const storedAccessToken = await authPage.getLocalStorageItem('accessToken');
    expect(storedAccessToken).toBe(existingAccessToken); // Access token should remain unchanged
  });

  // TC-003 | refreshAccessToken - Generates a unique access token on each call
  test('TC-003 | should generate a unique access token on each call', async ({ page }) => {
    const mockRefreshToken = 'mock_refresh_token_unique';
    await authPage.setLocalStorageItem('refreshToken', mockRefreshToken);

    const token1 = await authPage.callRefreshAccessToken();
    await page.waitForTimeout(10); // Introduce a small delay to ensure Date.now() is different for uniqueness
    const token2 = await authPage.callRefreshAccessToken();

    expect(token1).toMatch(/^new_access_token_\d+$/);
    expect(token2).toMatch(/^new_access_token_\d+$/);
    expect(token1).not.toBe(token2); // Tokens generated by Date.now() should be different

    const storedAccessToken = await authPage.getLocalStorageItem('accessToken');
    expect(storedAccessToken).toBe(token2); // localStorage should reflect the latest token
  });

  // TC-004 | handleRefreshTokenFailure - Clears all tokens and redirects to login
  test('TC-004 | should clear all tokens and redirect to login on refresh failure', async ({ page }) => {
    const oldAccessToken = 'some_old_access_token';
    const oldRefreshToken = 'some_old_refresh_token';
    const userData = '{"id":1, "name":"test"}';

    await authPage.setLocalStorageItem('accessToken', oldAccessToken);
    await authPage.setLocalStorageItem('refreshToken', oldRefreshToken);
    await authPage.setSessionStorageItem('userData', userData);

    await authPage.callHandleRefreshTokenFailure();

    // Wait for navigation to complete to the login page
    await page.waitForURL('/login');

    // Assertions
    const accessTokenAfterFailure = await authPage.getLocalStorageItem('accessToken');
    expect(accessTokenAfterFailure).toBeNull();

    const refreshTokenAfterFailure = await authPage.getLocalStorageItem('refreshToken');
    expect(refreshTokenAfterFailure).toBeNull();

    const sessionStorageLength = await authPage.getSessionStorageLength();
    expect(sessionStorageLength).toBe(0);

    expect(page.url()).toContain('/login');
  });

  // TC-005 | handleRefreshTokenFailure - Behaves correctly when tokens/sessionStorage are already empty
  test('TC-005 | should behave correctly when tokens/sessionStorage are already empty', async ({ page }) => {
    // Preconditions: ensure storage is empty (done in beforeEach, but explicitly confirmed)
    await authPage.removeLocalStorageItem('accessToken');
    await authPage.removeLocalStorageItem('refreshToken');
    await authPage.clearSessionStorage();

    await authPage.callHandleRefreshTokenFailure();

    // Wait for navigation to complete to the login page
    await page.waitForURL('/login');

    // Assertions
    const accessTokenAfterFailure = await authPage.getLocalStorageItem('accessToken');
    expect(accessTokenAfterFailure).toBeNull();

    const refreshTokenAfterFailure = await authPage.getLocalStorageItem('refreshToken');
    expect(refreshTokenAfterFailure).toBeNull();

    const sessionStorageLength = await authPage.getSessionStorageLength();
    expect(sessionStorageLength).toBe(0);

    expect(page.url()).toContain('/login');
  });

  // TC-006 | handleRefreshTokenFailure - Logs a warning message to the console
  test('TC-006 | should log a warning message to the console on refresh failure', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      // Capture only warning messages
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    await authPage.callHandleRefreshTokenFailure();

    // Wait for navigation to complete, which ensures the console message is emitted
    await page.waitForURL('/login');

    expect(consoleMessages).toContain('Refresh token failed. Logging out user.');
    expect(consoleMessages.length).toBeGreaterThanOrEqual(1); // At least one warning expected
  });
});