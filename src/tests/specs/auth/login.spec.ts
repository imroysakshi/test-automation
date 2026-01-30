// @ts-nocheck
import { test, expect, BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../../../pages/login.page';
import {
    VALID_USERNAME,
    VALID_PASSWORD,
    INVALID_USERNAME,
    INVALID_PASSWORD,
    SPACED_USERNAME,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_PASSWORD,
    OVERFLOW_USERNAME,
    OVERFLOW_PASSWORD,
    INCORRECT_CASE_USERNAME,
    SPECIAL_CHAR_PASSWORD,
    LOCKED_ACCOUNT_USERNAME,
    LOCKED_ACCOUNT_PASSWORD,
    UNACTIVATED_USERNAME,
    UNACTIVATED_PASSWORD,
    MOCKED_USERNAME,
    MOCKED_PASSWORD,
    LOGIN_API_URL,
    DASHBOARD_URL,
    FORGOT_PASSWORD_URL,
    REGISTER_URL
} from '../../../test-data/auth.data';

test.describe('Login Feature', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.openLoginPage();
    });

    test('TC-001 | Successful Login with Valid Credentials', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    test('TC-002 | Login with Invalid Username', async () => {
        await loginPage.enterUsername(INVALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Invalid username or password');
    });

    test('TC-003 | Login with Invalid Password', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(INVALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Invalid username or password');
    });

    test('TC-004 | Login with Empty Username Field', async () => {
        // Don't enter username
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton(); // Attempt to submit

        await loginPage.verifyUsernameRequiredError('Username is required');
        await expect(loginPage.page).toHaveURL(/login/); // Should remain on login page
    });

    test('TC-005 | Login with Empty Password Field', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        // Don't enter password
        await loginPage.clickLoginButton(); // Attempt to submit

        await loginPage.verifyPasswordRequiredError('Password is required');
        await expect(loginPage.page).toHaveURL(/login/); // Should remain on login page
    });

    test('TC-006 | Login with Empty Username and Password Fields', async () => {
        // Don't enter username or password
        await loginPage.clickLoginButton(); // Attempt to submit

        await loginPage.verifyUsernameRequiredError('Username is required');
        await loginPage.verifyPasswordRequiredError('Password is required');
        await expect(loginPage.page).toHaveURL(/login/); // Should remain on login page
    });

    test('TC-007 | Login with Username Containing Leading/Trailing Spaces', async () => {
        await loginPage.enterUsername(SPACED_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess(); // Assuming backend trims spaces
    });

    test('TC-008 | Login with Max Length Username and Password', async () => {
        await loginPage.enterUsername(MAX_LENGTH_USERNAME);
        await loginPage.enterPassword(MAX_LENGTH_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    test('TC-009 | Login with Too Long Username/Password (Overflow)', async () => {
        // Browser might truncate or prevent submission.
        // Assuming server-side validation error if submitted.
        await loginPage.enterUsername(OVERFLOW_USERNAME);
        await loginPage.enterPassword(OVERFLOW_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Username or password too long'); // Generic error for this scenario
    });

    test('TC-010 | Login with Case-Sensitive Username', async () => {
        await loginPage.enterUsername(INCORRECT_CASE_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Invalid username or password'); // Assuming case-sensitive
    });

    test('TC-011 | Login with Special Characters in Password', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(SPECIAL_CHAR_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    test('TC-012 | Login with Account Locked', async ({ page }) => {
        await page.route(LOGIN_API_URL, async route => {
            await route.fulfill({
                status: 403, // Forbidden, often used for locked accounts
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Your account is locked. Please contact support.' }),
            });
        });

        await loginPage.enterUsername(LOCKED_ACCOUNT_USERNAME);
        await loginPage.enterPassword(LOCKED_ACCOUNT_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Your account is locked. Please contact support.');
    });

    test('TC-013 | Login with Unactivated Account', async ({ page }) => {
        await page.route(LOGIN_API_URL, async route => {
            await route.fulfill({
                status: 403, // Forbidden, or custom status
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Your account is not activated. Please check your email for activation link.' }),
            });
        });

        await loginPage.enterUsername(UNACTIVATED_USERNAME);
        await loginPage.enterPassword(UNACTIVATED_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Your account is not activated. Please check your email for activation link.');
    });

    test('TC-014 | Login with Server Error (500 Internal Server Error)', async ({ page }) => {
        await page.route(LOGIN_API_URL, async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'An unexpected error occurred. Please try again later.' }),
            });
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('An unexpected error occurred. Please try again later.');
    });

    test('TC-015 | Login with Network Offline', async ({ page, context }) => {
        await context.setOffline(true); // Set network to offline

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // Expect network error, which might manifest as browser's default offline page
        // or a specific app error message. Let's wait for a navigation error or a specific element.
        // The error message locator should capture network related errors if the app handles it.
        await expect(loginPage.errorMessage).toBeVisible();
        await expect(loginPage.errorMessage).toContainText(/network|connection|offline/i); // Generic check
    });

    test('TC-016 | Login Persistence Across Browser Session', async ({ browser }) => {
        const context1: BrowserContext = await browser.newContext();
        const page1: Page = await context1.newPage();
        const loginPage1: LoginPage = new LoginPage(page1);

        await loginPage1.openLoginPage();
        await loginPage1.enterUsername(VALID_USERNAME);
        await loginPage1.enterPassword(VALID_PASSWORD);
        await loginPage1.clickLoginButton();
        await loginPage1.verifyLoginSuccess();

        // Save authentication state
        const storageState = await context1.storageState();
        await context1.close(); // Close the first context

        const context2: BrowserContext = await browser.newContext({ storageState: storageState });
        const page2: Page = await context2.newPage();
        const loginPage2: LoginPage = new LoginPage(page2);

        // Navigate directly to a protected page
        await loginPage2.gotoDashboard();
        await loginPage2.verifyLoginSuccess(); // Should still be logged in

        await context2.close();
    });

    test('TC-017 | Login Persistence After Logout', async ({ browser, page }) => {
        // Perform successful login
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();

        // Perform logout
        await loginPage.clickLogoutButton();
        await loginPage.verifyLoggedOut();

        // Attempt to navigate directly to a protected page
        await loginPage.gotoDashboard();
        // Expect redirection back to login or login page elements visible
        await expect(loginPage.page).toHaveURL(/login/);
        await expect(loginPage.usernameInput).toBeVisible();
    });

    test('TC-018 | Keyboard Navigation for Login Form', async ({ page }) => {
        // Focus should be on username after page load, or use page.focus()
        await loginPage.usernameInput.focus();
        await expect(loginPage.usernameInput).toBeFocused();

        await page.keyboard.type(VALID_USERNAME);
        await page.keyboard.press('Tab'); // Move to password
        await expect(loginPage.passwordInput).toBeFocused();

        await page.keyboard.type(VALID_PASSWORD);
        await page.keyboard.press('Tab'); // Move to login button
        await expect(loginPage.loginButton).toBeFocused();

        await page.keyboard.press('Enter'); // Submit the form
        await loginPage.verifyLoginSuccess();
    });

    test('TC-019 | Screen Reader Accessibility for Login Form', async ({ page }) => {
        const accessibilityTree = await page.accessibility.snapshot();
        expect(accessibilityTree).toBeDefined();

        // Basic check for username input:
        const usernameNode = accessibilityTree?.children?.find(node => node.role === 'textbox' && node.name === 'Username');
        expect(usernameNode).toBeDefined();
        expect(usernameNode?.role).toBe('textbox');
        expect(usernameNode?.name).toBe('Username');

        // Basic check for password input:
        const passwordNode = accessibilityTree?.children?.find(node => node.role === 'textbox' && node.name === 'Password');
        expect(passwordNode).toBeDefined();
        expect(passwordNode?.role).toBe('textbox');
        expect(passwordNode?.name).toBe('Password');

        // Basic check for login button:
        const loginButtonNode = accessibilityTree?.children?.find(node => node.role === 'button' && node.name === 'Login');
        expect(loginButtonNode).toBeDefined();
        expect(loginButtonNode?.role).toBe('button');
        expect(loginButtonNode?.name).toBe('Login');

        // Note: More robust accessibility testing would involve axe-core integration
        // and checking for specific aria attributes on error messages, etc.
    });

    test('TC-020 | Performance: Login Under Slow Network Conditions', async ({ page, context }) => {
        // Simulate a "DSL" network profile: 750ms latency, 1Mbps throughput
        await context.setThrottlingProfile('DSL');

        const startTime = Date.now();
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
        const endTime = Date.now();

        const duration = endTime - startTime;
        // Expect login to take longer, e.g., more than a typical fast login (e.g., > 1 second given 750ms latency)
        expect(duration).toBeGreaterThan(1000); // Adjust threshold based on baseline performance
        // You might also assert for loading indicators here, but for this test, successful login is the primary.
    });

    test('TC-021 | Performance: Login with Delayed API Response', async ({ page }) => {
        const delayMs = 5000; // 5 seconds delay

        await page.route(LOGIN_API_URL, async route => {
            await new Promise(f => setTimeout(f, delayMs)); // Introduce artificial delay
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: 'mock_jwt_token', user: { id: 1, username: VALID_USERNAME } }),
            });
        });

        const startTime = Date.now();
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        // Here you would typically expect a loading spinner to appear
        // await expect(loginPage.loadingSpinner).toBeVisible(); // If a spinner exists

        await loginPage.verifyLoginSuccess(); // This will wait for navigation
        const endTime = Date.now();

        const duration = endTime - startTime;
        expect(duration).toBeGreaterThanOrEqual(delayMs);
        // await expect(loginPage.loadingSpinner).not.toBeVisible(); // Spinner should disappear
    });

    test('TC-022 | Integration: Mock Successful Login API Response', async ({ page }) => {
        await page.route(LOGIN_API_URL, async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: 'mock_jwt_token', user: { id: 1, username: MOCKED_USERNAME } }),
            });
        });

        await loginPage.enterUsername(MOCKED_USERNAME); // Any credentials will trigger the mock
        await loginPage.enterPassword(MOCKED_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    test('TC-023 | Integration: Mock Failed Login API Response (Invalid Credentials)', async ({ page }) => {
        await page.route(LOGIN_API_URL, async route => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Invalid username or password' }),
            });
        });

        await loginPage.enterUsername(MOCKED_USERNAME);
        await loginPage.enterPassword(MOCKED_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Invalid username or password');
    });

    test('TC-024 | Integration: Verify Login API Request Payload', async ({ page }) => {
        let requestPayload: { username?: string; password?: string } | null = null;

        await page.route(LOGIN_API_URL, async route => {
            requestPayload = route.request().postDataJSON();
            // Fulfill with a successful response to allow the test to continue
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: 'mock_jwt_token', user: { id: 1, username: VALID_USERNAME } }),
            });
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // Wait for the response corresponding to the intercepted request
        await loginPage.page.waitForResponse(resp => resp.url().includes(LOGIN_API_URL) && resp.status() === 200);

        expect(requestPayload).toEqual({ username: VALID_USERNAME, password: VALID_PASSWORD });
    });

    test('TC-025 | Multiple Failed Login Attempts (Rate Limiting)', async ({ page }) => {
        let failedAttempts = 0;
        const maxAttemptsBeforeLock = 3;

        await page.route(LOGIN_API_URL, async route => {
            const requestBody = route.request().postDataJSON() as { username?: string; password?: string };
            if (requestBody.username === VALID_USERNAME && requestBody.password === INVALID_PASSWORD) {
                failedAttempts++;
                if (failedAttempts >= maxAttemptsBeforeLock) {
                    await route.fulfill({
                        status: 429, // Too Many Requests
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Too many failed attempts. Account temporarily locked.' }),
                    });
                } else {
                    await route.fulfill({
                        status: 401,
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Invalid username or password' }),
                    });
                }
            } else if (requestBody.username === VALID_USERNAME && requestBody.password === VALID_PASSWORD && failedAttempts >= maxAttemptsBeforeLock) {
                // If account is locked, even valid credentials fail
                await route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Account is locked. Please try again later.' }),
                });
            } else {
                // Default success for other cases or valid credentials before lock
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ token: 'mock_jwt_token', user: { id: 1, username: VALID_USERNAME } }),
                });
            }
        });

        // 3 failed attempts
        for (let i = 0; i < maxAttemptsBeforeLock; i++) {
            await loginPage.enterUsername(VALID_USERNAME);
            await loginPage.enterPassword(INVALID_PASSWORD);
            await loginPage.clickLoginButton();
            await loginPage.verifyLoginFailure('Invalid username or password');
            // Reload page to clear any client-side state of failed attempts if necessary
            // In a real scenario, this might not be needed if state is purely server-side
            await loginPage.page.reload();
            await loginPage.page.waitForLoadState('domcontentloaded');
        }

        // 4th attempt with valid credentials - should fail due to lock
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginFailure('Account is locked. Please try again later.');
    });

    test('TC-026 | "Forgot Password" Link Visibility and Navigation', async () => {
        await expect(loginPage.forgotPasswordLink).toBeVisible();
        await loginPage.forgotPasswordLink.click();
        await expect(loginPage.page).toHaveURL(new RegExp(FORGOT_PASSWORD_URL));
    });

    test('TC-027 | "Create Account" or "Sign Up" Link Visibility and Navigation', async () => {
        await expect(loginPage.createAccountLink).toBeVisible();
        await loginPage.createAccountLink.click();
        await expect(loginPage.page).toHaveURL(new RegExp(REGISTER_URL));
    });
});