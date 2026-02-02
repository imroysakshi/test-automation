// @ts-nocheck
import { test, expect, Page, Request } from '@playwright/test';
import { LoginPage } from '../../../pages/login.page'; // Assuming src/pages/login.page.ts exists

// --- Test Data (separated from test logic) ---
const VALID_USERNAME: string = 'testuser';
const VALID_PASSWORD: string = 'password123';
const INVALID_USERNAME: string = 'nonexistentuser';
const INVALID_PASSWORD: string = 'wrongpassword';
const LOCKED_USERNAME: string = 'lockeduser';
const EMPTY_USERNAME: string = '';
const EMPTY_PASSWORD: string = '';
const LONG_USERNAME: string = 'a'.repeat(50); // Assuming max length 50 for username
const LONG_PASSWORD: string = 'a'.repeat(100); // Assuming max length 100 for password
const SPECIAL_CHAR_USERNAME: string = 'user!@#$%^&*';
const SPECIAL_CHAR_PASSWORD: string = 'p@ssw0rd!_';
const TRIM_USERNAME: string = '  testuser  ';
const TRIM_PASSWORD: string = '  password123  ';

const SUCCESS_LOGIN_RESPONSE = {
    status: 200,
    body: JSON.stringify({ token: 'mock-jwt-token', user: { id: 1, username: VALID_USERNAME } })
};

const INVALID_CREDENTIALS_RESPONSE = {
    status: 401,
    body: JSON.stringify({ message: 'Invalid username or password' })
};

const LOCKED_ACCOUNT_RESPONSE = {
    status: 403,
    body: JSON.stringify({ message: 'Your account has been locked. Please contact support.' })
};

const SERVER_ERROR_RESPONSE = {
    status: 500,
    body: JSON.stringify({ message: 'An unexpected error occurred. Please try again later.' })
};

// --- Test Suite ---
test.describe('Login Feature Tests', () => {
    let loginPage: LoginPage;

    // Helper function to mock API response for /api/login
    const mockLoginApiResponse = async (page: Page, response: { status: number; body: string }) => {
        await page.route('/api/login', async (route) => {
            await route.fulfill({
                status: response.status,
                contentType: 'application/json',
                body: response.body,
            });
        });
    };

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        // Default mock for successful login for tests that don't override it
        await mockLoginApiResponse(page, SUCCESS_LOGIN_RESPONSE);
        await loginPage.openLoginPage();
    });

    // TC-001 | Successful Login with Valid Credentials
    test('TC-001 | should successfully log in with valid credentials', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    // TC-002 | Display Login Page Correctly
    test('TC-002 | should display the login page correctly with required elements', async () => {
        await loginPage.verifyLoginPageElements();
        await expect(loginPage.usernameField).toBeEnabled();
        await expect(loginPage.passwordField).toBeEnabled();
        // Assuming login button is initially disabled until input
        // This will be specifically tested in TC-019
        // For this test, just verify visibility
        await expect(loginPage.loginButton).toBeVisible();
    });

    // TC-003 | Login with Invalid Username
    test('TC-003 | should display error message for invalid username', async ({ page }) => {
        await mockLoginApiResponse(page, INVALID_CREDENTIALS_RESPONSE); // Override default mock
        await loginPage.enterUsername(INVALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login'); // User remains on login page
        const errorMessage: string | null = await loginPage.getErrorMessage();
        expect(errorMessage).toContain('Invalid username or password');
    });

    // TC-004 | Login with Invalid Password
    test('TC-004 | should display error message for invalid password', async ({ page }) => {
        await mockLoginApiResponse(page, INVALID_CREDENTIALS_RESPONSE); // Override default mock
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(INVALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        const errorMessage: string | null = await loginPage.getErrorMessage();
        expect(errorMessage).toContain('Invalid username or password');
    });

    // TC-005 | Login with Empty Username and Password
    test('TC-005 | should display validation errors for empty username and password', async () => {
        await loginPage.enterUsername(EMPTY_USERNAME);
        await loginPage.enterPassword(EMPTY_PASSWORD);
        await loginPage.clickLoginButton(); // Click even if button might be disabled to check client-side validation messages

        await expect(loginPage.page).toHaveURL('/login'); // User remains on login page
        await loginPage.verifyUsernameRequiredError();
        await loginPage.verifyPasswordRequiredError();
        await expect(loginPage.loginButton).toBeDisabled(); // Assuming client-side validation disables the button
    });

    // TC-006 | Login with Empty Username, Valid Password
    test('TC-006 | should display validation error for empty username', async () => {
        await loginPage.enterUsername(EMPTY_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        await loginPage.verifyUsernameRequiredError();
        await expect(loginPage.passwordField).toHaveValue(VALID_PASSWORD); // Password field should retain its value
        await expect(loginPage.requiredPasswordError).not.toBeVisible(); // Only username error should be visible
        await expect(loginPage.loginButton).toBeDisabled(); // Assuming button stays disabled
    });

    // TC-007 | Login with Valid Username, Empty Password
    test('TC-007 | should display validation error for empty password', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(EMPTY_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        await loginPage.verifyPasswordRequiredError();
        await expect(loginPage.usernameField).toHaveValue(VALID_USERNAME); // Username field should retain its value
        await expect(loginPage.requiredUsernameError).not.toBeVisible(); // Only password error should be visible
        await expect(loginPage.loginButton).toBeDisabled(); // Assuming button stays disabled
    });

    // TC-008 | Login with Locked Account
    test('TC-008 | should display error message for a locked account', async ({ page }) => {
        await mockLoginApiResponse(page, LOCKED_ACCOUNT_RESPONSE); // Override default mock
        await loginPage.enterUsername(LOCKED_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        const errorMessage: string | null = await loginPage.getErrorMessage();
        expect(errorMessage).toContain('Your account has been locked. Please contact support.');
    });

    // TC-009 | Login with Username at Max Length
    test('TC-009 | should successfully log in with username at maximum length', async () => {
        await loginPage.enterUsername(LONG_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    // TC-010 | Login with Password at Max Length
    test('TC-010 | should successfully log in with password at maximum length', async () => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(LONG_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    // TC-011 | Login with Username and Password Containing Special Characters
    test('TC-011 | should successfully log in with username and password containing special characters', async () => {
        await loginPage.enterUsername(SPECIAL_CHAR_USERNAME);
        await loginPage.enterPassword(SPECIAL_CHAR_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
    });

    // TC-012 | Login with Username and Password with Leading/Trailing Spaces
    test('TC-012 | should successfully log in with trimmed username and password', async () => {
        await loginPage.enterUsername(TRIM_USERNAME);
        await loginPage.enterPassword(TRIM_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();
        // Optionally, assert that the username/password fields, if re-rendered, would show trimmed values.
        // This depends on the specific app's implementation, generally backend handles trimming.
    });

    // TC-013 | Server Error During Login Attempt (500 Internal Server Error)
    test('TC-013 | should display a generic error message on 500 internal server error', async ({ page }) => {
        await mockLoginApiResponse(page, SERVER_ERROR_RESPONSE); // Override default mock
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        const errorMessage: string | null = await loginPage.getErrorMessage();
        expect(errorMessage).toContain('An unexpected error occurred. Please try again later.');
    });

    // TC-014 | Network Timeout During Login Request
    test('TC-014 | should display a timeout error message during network timeout', async ({ page }) => {
        // Intercept and abort the request to simulate a network failure or timeout
        await page.route('/api/login', async (route) => {
            route.abort('failed'); // Simulates a network error/timeout immediately.
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        const errorMessage: string | null = await loginPage.getErrorMessage();
        // The exact message depends on the frontend's error handling for network failures.
        expect(errorMessage).toMatch(/network|timed out|failed|unexpected error/i);
    });

    // TC-015 | Login Page Accessibility - Keyboard Navigation
    test('TC-015 | should allow keyboard navigation through login page elements', async ({ page }) => {
        await page.goto('/login'); // Ensure we are on the page
        await loginPage.usernameField.focus(); // Start focus on username field

        await expect(loginPage.usernameField).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(loginPage.passwordField).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(loginPage.loginButton).toBeFocused();

        // Navigate backward
        await page.keyboard.press('Shift+Tab');
        await expect(loginPage.passwordField).toBeFocused();
    });

    // TC-016 | Login Page Accessibility - Screen Reader Compatibility
    test('TC-016 | should have screen reader compatible elements on the login page', async () => {
        await loginPage.openLoginPage(); // Ensure page is open

        // Verify presence of accessible labels for input fields
        await expect(loginPage.usernameField).toHaveAccessibleName('Username');
        await expect(loginPage.passwordField).toHaveAccessibleName('Password');

        // Verify button has accessible name/role
        await expect(loginPage.loginButton).toHaveAccessibleName('Login');
        await expect(loginPage.loginButton).toHaveRole('button');

        // Note: Full screen reader compatibility testing often requires dedicated accessibility tools like axe-core.
        // This test only verifies the presence of expected accessible attributes.
    });

    // TC-017 | State Management - User Remains Logged In After Page Refresh
    test('TC-017 | should keep user logged in after page refresh', async ({ page }) => {
        // Precondition: User is successfully logged in (using beforeEach + TC-001 steps)
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();

        // Steps: Refresh the page
        await page.reload();

        // Expected Result: User remains logged in
        await expect(loginPage.page).toHaveURL('/dashboard');
        await expect(loginPage.dashboardTitle).toBeVisible();
    });

    // TC-018 | State Management - Access Protected Page After Login, Then Navigate Back
    test('TC-018 | should maintain login state after navigating to protected page and back', async ({ page }) => {
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess();

        // Navigate to another protected page (mock this if needed)
        // For simplicity, assuming /profile is also handled by the same login session check.
        await page.route('/profile', (route) => route.fulfill({ status: 200, body: '<h1>Profile Page</h1>' }));
        await page.goto('/profile');
        await expect(page).toHaveURL('/profile');
        await expect(page.locator('h1')).toHaveText('Profile Page');

        // Navigate back to the previous page (dashboard)
        await page.goBack();
        await expect(loginPage.page).toHaveURL('/dashboard');
        await expect(loginPage.dashboardTitle).toBeVisible();
    });

    // TC-019 | Verify Login Button Disabled Until Valid Input
    test('TC-019 | should enable login button only when both username and password have input', async ({ page }) => {
        await page.goto('/login'); // Ensure starting from a fresh page load

        await expect(loginPage.loginButton).toBeDisabled();

        await loginPage.enterUsername(VALID_USERNAME);
        await expect(loginPage.loginButton).toBeDisabled(); // Should still be disabled if password is empty

        await loginPage.enterPassword(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();

        // Test with emptying one field
        await loginPage.enterUsername(EMPTY_USERNAME);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    // TC-020 | Login with API Gateway Error (e.g., 403 Forbidden without specific auth details)
    test('TC-020 | should display a generic access denied message on API Gateway 403 error', async ({ page }) => {
        await mockLoginApiResponse(page, {
            status: 403,
            body: JSON.stringify({ message: 'Access denied. Please contact support.' })
        });
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(loginPage.page).toHaveURL('/login');
        const errorMessage: string | null = await loginPage.getErrorMessage();
        expect(errorMessage).toContain('Access denied. Please contact support.');
    });

    // TC-021 | Login with Slow Network Conditions
    test('TC-021 | should show loading indicator and eventually log in successfully under slow network', async ({ page }) => {
        // Emulate slow network conditions: 100ms latency, 100kbps download, 50kbps upload
        await page.emulateNetworkConditions({
            offline: false,
            latency: 100,
            download: 100 * 1024, // 100 KB/s
            upload: 50 * 1024,    // 50 KB/s
        });

        // Mock a login response with a simulated network delay
        await page.route('/api/login', async (route: Request) => {
            // Simulate a delay on the server side
            await page.waitForTimeout(2000);
            await route.fulfill(SUCCESS_LOGIN_RESPONSE);
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // Verify a loading indicator is displayed (assuming the app has one, e.g., a spinner with class .loading-spinner)
        const loadingIndicator = page.locator('.loading-spinner');
        await expect(loadingIndicator).toBeVisible();

        // Wait for login to complete and loading indicator to disappear
        await loginPage.verifyLoginSuccess();
        await expect(loadingIndicator).not.toBeVisible();

        // Reset network conditions after the test
        await page.emulateNetworkConditions(null);
    });

    // TC-022 | Attempt to Log in While Already Logged In (Redirect)
    test('TC-022 | should redirect to dashboard if attempting to access login page while already logged in', async ({ page }) => {
        // First, successfully log in
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await loginPage.verifyLoginSuccess(); // User is on /dashboard

        // Now, attempt to navigate directly to the login page again
        await page.goto('/login');

        // Expected: User is redirected back to the dashboard, not showing the login form
        await expect(page).toHaveURL('/dashboard');
        await expect(loginPage.dashboardTitle).toBeVisible();
        await expect(loginPage.usernameField).not.toBeVisible(); // Login form elements should not be visible
    });
});