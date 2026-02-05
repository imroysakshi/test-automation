// @ts-nocheck
// This test script assumes the following helper files are created in the `test-automation` project:
// 1. `test-automation/src/utils/authFunctions.ts`: Contains the `refreshAccessToken` and `handleRefreshTokenFailure` functions as provided in the "Development Code Reference".
// 2. `test-automation/src/tests/pages/auth.page.ts`: Contains the `AuthPage` class as defined below, encapsulating browser interactions related to authentication.

// --- Start of assumed file: `test-automation/src/utils/authFunctions.ts` ---
// This content is based on the "Development Code Reference" and is assumed to be
// placed in `src/utils/authFunctions.ts` within the `test-automation` project.

/**
 * Refresh the access token using a refresh token.
 */
export function refreshAccessToken() {
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

/**
 * Clear tokens when refresh fails
 */
export function handleRefreshTokenFailure() {
    console.warn('Refresh token failed. Logging out user.');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();

    window.location.href = '/login';
}
// --- End of assumed file: `test-automation/src/utils/authFunctions.ts` ---


// --- Start of assumed file: `test-automation/src/tests/pages/auth.page.ts` ---
// This content is assumed to be placed in `src/tests/pages/auth.page.ts`
// within the `test-automation` project.

import { Page } from '@playwright/test';
import { refreshAccessToken, handleRefreshTokenFailure } from '../../utils/authFunctions'; // Path from src/tests/pages to src/utils

export class AuthPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Executes the refreshAccessToken function within the browser context.
     * @returns The new access token, or throws an error if the refresh token is missing.
     */
    async refreshAccessTokenInBrowser(): Promise<string> {
        return this.page.evaluate(refreshAccessToken);
    }

    /**
     * Executes the handleRefreshTokenFailure function within the browser context.
     */
    async handleRefreshTokenFailureInBrowser(): Promise<void> {
        return this.page.evaluate(handleRefreshTokenFailure);
    }

    /**
     * Sets a refresh token in localStorage.
     * @param token The refresh token to set.
     */
    async setRefreshToken(token: string): Promise<void> {
        await this.page.evaluate((t) => localStorage.setItem('refreshToken', t), token);
    }

    /**
     * Sets an access token in localStorage.
     * @param token The access token to set.
     */
    async setAccessToken(token: string): Promise<void> {
        await this.page.evaluate((t) => localStorage.setItem('accessToken', t), token);
    }

    /**
     * Clears all items from localStorage.
     */
    async clearLocalStorage(): Promise<void> {
        await this.page.evaluate(() => localStorage.clear());
    }

    /**
     * Clears all items from sessionStorage.
     */
    async clearSessionStorage(): Promise<void> {
        await this.page.evaluate(() => sessionStorage.clear());
    }

    /**
     * Gets an item from localStorage.
     * @param key The key of the item to retrieve.
     * @returns The value of the item, or null if not found.
     */
    async getLocalStorageItem(key: string): Promise<string | null> {
        return this.page.evaluate((k) => localStorage.getItem(k), key);
    }

    /**
     * Gets the length of sessionStorage.
     * @returns The number of items in sessionStorage.
     */
    async getSessionStorageLength(): Promise<number> {
        return this.page.evaluate(() => sessionStorage.length);
    }

    /**
     * Measures the performance of the refreshAccessToken function in the browser context.
     * @param iterations The number of times to execute the function.
     * @param refreshToken A refresh token to ensure the function doesn't throw due to missing token.
     * @returns The total execution time in milliseconds.
     */
    async measureRefreshAccessTokenPerformance(iterations: number, refreshToken: string): Promise<number> {
        return this.page.evaluate((params: [typeof refreshAccessToken, number, string]) => {
            const [fn, iters, rt] = params;
            localStorage.setItem('refreshToken', rt); // Ensure token is present for the function to execute successfully
            const start = performance.now();
            for (let i = 0; i < iters; i++) {
                fn(); // Execute the serialized function
            }
            return performance.now() - start;
        }, [refreshAccessToken, iterations, refreshToken]); // Pass the actual function and arguments as an array
    }

    /**
     * Measures the performance of the handleRefreshTokenFailure function in the browser context.
     * Temporarily overrides `window.location.href` setter to prevent actual navigation during performance measurement.
     * @param iterations The number of times to execute the function.
     * @returns The total execution time in milliseconds.
     */
    async measureHandleRefreshTokenFailurePerformance(iterations: number): Promise<number> {
        return this.page.evaluate((params: [typeof handleRefreshTokenFailure, number]) => {
            const [fn, iters] = params;
            const start = performance.now();
            for (let i = 0; i < iters; i++) {
                // Temporarily disable navigation to avoid multiple page loads during performance test
                const originalLocationHref = window.location.href;
                Object.defineProperty(window.location, 'href', {
                    get: () => originalLocationHref,
                    set: (val) => { /* do nothing */ }
                });
                fn(); // Execute the serialized function
                // Restore original behavior after the loop.
                Object.defineProperty(window.location, 'href', {
                    value: originalLocationHref,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            }
            return performance.now() - start;
        }, [handleRefreshTokenFailure, iterations]); // Pass the actual function and arguments as an array
    }
}
// --- End of assumed file: `test-automation/src/tests/pages/auth.page.ts` ---


// --- Start of main test script: `test-automation/src/tests/specs/auth/refreshToken.spec.ts` ---
import { test, expect, ConsoleMessage } from '@playwright/test';
import { AuthPage } from '../pages/auth.page'; // Path from src/tests/specs/auth to src/tests/pages

test.describe('Auth Refresh Token Feature', () => {
    let authPage: AuthPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        // Ensure a clean state for each test by navigating to a blank page
        // and clearing all storage before each test.
        await page.goto('about:blank');
        await authPage.clearLocalStorage();
        await authPage.clearSessionStorage();
    });

    test('TC-001 | refreshAccessToken: Successfully refreshes access token when refresh token is present', async ({ page }) => {
        await authPage.setRefreshToken('mock_refresh_token');

        const newAccessToken = await authPage.refreshAccessTokenInBrowser();

        expect(newAccessToken).toMatch(/^new_access_token_\d+$/);
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBe(newAccessToken);
    });

    test('TC-002 | refreshAccessToken: Throws error when refresh token is missing', async ({ page }) => {
        // localStorage is already clear from beforeEach, ensuring no refresh token is present.
        await expect(authPage.getLocalStorageItem('refreshToken')).resolves.toBeNull();

        // Expect the Page Object method to reject with the specified error.
        await expect(authPage.refreshAccessTokenInBrowser()).rejects.toThrow('No refresh token available');
        // Ensure no access token was set in localStorage.
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBeNull();
    });

    test('TC-003 | handleRefreshTokenFailure: Successfully clears tokens and redirects to login', async ({ page }) => {
        // Set up initial state: navigate to a dashboard, set tokens, and session data.
        await page.goto('http://localhost:3000/dashboard');
        await authPage.setAccessToken('mock_access_token');
        await authPage.setRefreshToken('mock_refresh_token');
        await page.evaluate(() => sessionStorage.setItem('sessionData', 'some_value'));

        // Execute the function
        await authPage.handleRefreshTokenFailureInBrowser();

        // Wait for the expected URL redirection.
        await page.waitForURL('**/login');

        // Assert localStorage and sessionStorage are cleared.
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBeNull();
        await expect(authPage.getLocalStorageItem('refreshToken')).resolves.toBeNull();
        await expect(authPage.getSessionStorageLength()).resolves.toBe(0);
        // Assert the final URL.
        expect(page.url()).toMatch(/\/login$/);
    });

    test('TC-004 | handleRefreshTokenFailure: Clears tokens and redirects when tokens/session are already empty', async ({ page }) => {
        // Set up initial state: navigate to a dashboard.
        // localStorage and sessionStorage are already clear from beforeEach.
        await page.goto('http://localhost:3000/dashboard');

        // Execute the function when storage is already empty.
        await authPage.handleRefreshTokenFailureInBrowser();

        // Wait for the expected URL redirection.
        await page.waitForURL('**/login');

        // Assert localStorage and sessionStorage remain empty.
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBeNull();
        await expect(authPage.getLocalStorageItem('refreshToken')).resolves.toBeNull();
        await expect(authPage.getSessionStorageLength()).resolves.toBe(0);
        // Assert the final URL.
        expect(page.url()).toMatch(/\/login$/);
    });

    test('TC-005 | handleRefreshTokenFailure: Verify console warning message', async ({ page }) => {
        const consoleMessages: string[] = [];
        // Set up a listener for console messages, specifically for warnings.
        page.on('console', (msg: ConsoleMessage) => {
            if (msg.type() === 'warn') {
                consoleMessages.push(msg.text());
            }
        });

        // Execute the function.
        await authPage.handleRefreshTokenFailureInBrowser();
        // Wait for redirection, indicating the function has completed execution.
        await page.waitForURL('**/login');

        // Assert that the expected console warning message was captured.
        expect(consoleMessages).toContain('Refresh token failed. Logging out user.');
    });

    test('TC-006 | Integration: `refreshAccessToken` and `handleRefreshTokenFailure` don\'t interfere with each other\'s expected successful state', async ({ page }) => {
        // Set initial state for the sequence: dashboard URL, tokens, and session data.
        await page.goto('http://localhost:3000/dashboard');
        await authPage.setRefreshToken('mock_refresh_token_integration');
        await authPage.setAccessToken('initial_access_token_integration');
        await page.evaluate(() => sessionStorage.setItem('sessionData', 'some_value_integration'));

        // Step 1: Execute refreshAccessToken() and verify its outcome.
        const firstNewAccessToken = await authPage.refreshAccessTokenInBrowser();
        expect(firstNewAccessToken).toMatch(/^new_access_token_\d+$/);
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBe(firstNewAccessToken);
        await expect(authPage.getLocalStorageItem('refreshToken')).resolves.toBe('mock_refresh_token_integration'); // Refresh token should remain unchanged

        // Step 2: Now, execute handleRefreshTokenFailure() and verify its outcome.
        await authPage.handleRefreshTokenFailureInBrowser();
        await page.waitForURL('**/login');

        // Assert localStorage and sessionStorage are cleared, and redirection occurred.
        await expect(authPage.getLocalStorageItem('accessToken')).resolves.toBeNull();
        await expect(authPage.getLocalStorageItem('refreshToken')).resolves.toBeNull();
        await expect(authPage.getSessionStorageLength()).resolves.toBe(0);
        expect(page.url()).toMatch(/\/login$/);
    });

    test('TC-007 | Performance: Minimal overhead for synchronous operations', async ({ page }) => {
        const ITERATIONS = 1000;
        const MAX_EXPECTED_MS = 50; // A reasonable upper bound for simple, synchronous client-side operations

        // Measure refreshAccessToken performance.
        const refreshTime = await authPage.measureRefreshAccessTokenPerformance(ITERATIONS, 'temp_refresh_token_for_perf');
        expect(refreshTime).toBeLessThan(MAX_EXPECTED_MS);
        console.log(`Performance Test: refreshAccessToken (${ITERATIONS}x): ${refreshTime.toFixed(2)} ms`);

        // Reset page state (clear storage, navigate) before measuring the next function to ensure isolation.
        await page.goto('about:blank');
        await authPage.clearLocalStorage();
        await authPage.clearSessionStorage();

        // Measure handleRefreshTokenFailure performance.
        const handleFailureTime = await authPage.measureHandleRefreshTokenFailurePerformance(ITERATIONS);
        expect(handleFailureTime).toBeLessThan(MAX_EXPECTED_MS);
        console.log(`Performance Test: handleRefreshTokenFailure (${ITERATIONS}x): ${handleFailureTime.toFixed(2)} ms`);
    });

    test('TC-008 | Security: Ensure no sensitive data is leaked via URLs or console after failure', async ({ page }) => {
        const SENSITIVE_REFRESH_TOKEN = 'sensitive_refresh_token_secret_123';
        const consoleMessages: string[] = [];

        // Set up console listener to capture all messages.
        page.on('console', (msg: ConsoleMessage) => {
            consoleMessages.push(msg.text());
        });

        // Set up initial state: navigate to a dashboard and set a sensitive refresh token.
        await page.goto('http://localhost:3000/dashboard');
        await authPage.setRefreshToken(SENSITIVE_REFRESH_TOKEN);

        // Execute the function.
        await authPage.handleRefreshTokenFailureInBrowser();
        // Wait for redirection, indicating the function has completed execution.
        await page.waitForURL('**/login');

        // Verify the final URL does not contain the sensitive token.
        expect(page.url()).not.toContain(SENSITIVE_REFRESH_TOKEN);
        expect(page.url()).toMatch(/\/login$/); // Ensure it redirected to the login page

        // Verify no sensitive tokens are present in captured console logs.
        const sensitiveTokenFoundInConsole = consoleMessages.some(msg => msg.includes(SENSITIVE_REFRESH_TOKEN));
        expect(sensitiveTokenFoundInConsole).toBeFalsy();
    });
});
// --- End of main test script: `test-automation/src/tests/specs/auth/refreshToken.spec.ts` ---