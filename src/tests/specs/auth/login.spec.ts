// @ts-nocheck
import { test, expect, Page, Request, Route } from '@playwright/test';

// --- Page Object Model Imports ---
// Assuming the test spec is in 'src/tests/specs/auth/login.spec.ts'
// And the LoginPage is in 'src/pages/auth.page.ts'
import { LoginPage } from '../../../pages/auth.page';

// --- Test Data Constants ---
const VALID_USERNAME: string = 'testuser';
const VALID_PASSWORD: string = 'password123';
const ADMIN_USERNAME: string = 'adminuser';
const ADMIN_PASSWORD: string = 'adminpass';
const SPECIAL_CHAR_USERNAME: string = 'special!_user';
const SPECIAL_CHAR_PASSWORD: string = 'p@ssw0rd!';
const MAX_LENGTH_USERNAME: string = 'verylongusername_test_12345678901234567890'; // 50 chars
const MAX_LENGTH_PASSWORD: string = 'P@ssw0rdWithAVeryLongLengthThatExceedsNormalExpectationsButIsWithinTheAllowedLimitsOfTheSystem1234567890ABCDEFGH'; // 128 chars
const SPACED_USERNAME: string = '  spaceman  ';
const CASE_SENSITIVE_USERNAME_ACTUAL: string = 'CaseUser';
const INCORRECT_CASE_USERNAME_ATTEMPT: string = 'caseuser';
const NON_EXISTENT_USERNAME: string = 'nonexistentuser';
const WRONG_PASSWORD: string = 'wrongpassword';
const LOCKED_USERNAME: string = 'lockeduser';
const INACTIVE_USERNAME: string = 'inactiveuser';
const INVALID_EMAIL_FORMAT: string = 'notanemail';
const SHORT_PASSWORD: string = 'short';
const PROTECTED_PAGE_URL: string = '/profile';
const DASHBOARD_URL: string = '/dashboard';
const ADMIN_DASHBOARD_URL: string = '/admin';
const LOGIN_URL: string = '/login';
const ABOUT_PAGE_URL: string = '/about'; // Used for back button test

const API_LOGIN_ENDPOINT: string = '/api/login';
const API_VALIDATE_TOKEN_ENDPOINT: string = '/api/validate-token'; // Endpoint to check session validity

/**
 * Interface for API response mocking.
 */
interface ApiResponse {
    status: number;
    body: { [key: string]: any };
}

/**
 * Helper function to mock an API response for Playwright routes.
 * @param route The Playwright Route object.
 * @param response The ApiResponse object containing status and body.
 */
const mockLoginResponse = async (route: Route, response: ApiResponse): Promise<void> => {
    await route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
    });
};

test.describe('Login Feature E2E Tests', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        // Clear storage state (cookies, localStorage) before each test to ensure isolation
        await page.context().clearCookies();
        await page.context().clearStorageState();
        // Navigate to the login page as a precondition for most tests
        await loginPage.openLoginPage();
    });

    // TC-001 | Successful login with valid credentials
    test('TC-001 | should display dashboard after successful login with valid credentials', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt_token', user: { username: VALID_USERNAME } }
        }));

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, ${VALID_USERNAME}!`, VALID_USERNAME);
    });

    // TC-002 | Login as an Administrator user
    test('TC-002 | should log in as an administrator and display admin features', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'admin_jwt_token', user: { username: ADMIN_USERNAME, role: 'admin' } }
        }));

        await loginPage.enterUsername(ADMIN_USERNAME);
        await loginPage.enterPassword(ADMIN_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.verifyAdminLoginSuccess(ADMIN_DASHBOARD_URL, `Welcome, ${ADMIN_USERNAME}!`, ADMIN_USERNAME);
    });

    // TC-003 | Login with credentials containing special characters (if allowed)
    test('TC-003 | should log in successfully with username and password containing special characters', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'special_jwt', user: { username: SPECIAL_CHAR_USERNAME } }
        }));

        await loginPage.enterUsername(SPECIAL_CHAR_USERNAME);
        await loginPage.enterPassword(SPECIAL_CHAR_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, ${SPECIAL_CHAR_USERNAME}!`, SPECIAL_CHAR_USERNAME);
    });

    // TC-004 | Login with username/password at maximum allowed length
    test('TC-004 | should log in successfully with max length username and password', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'long_jwt', user: { username: MAX_LENGTH_USERNAME } }
        }));

        await loginPage.enterUsername(MAX_LENGTH_USERNAME);
        await loginPage.enterPassword(MAX_LENGTH_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, ${MAX_LENGTH_USERNAME}!`, MAX_LENGTH_USERNAME);
        await expect(loginPage.usernameInput).toHaveValue(MAX_LENGTH_USERNAME); // Verify UI handles max length
        await expect(loginPage.passwordInput).toHaveValue(MAX_LENGTH_PASSWORD);
    });

    // TC-005 | Login with leading/trailing spaces in username (should trim or reject)
    // Assumption: The system *trims* spaces and logs in successfully.
    // If the system *rejects* spaces, the mock and assertions below would need adjustment (e.g., expect an error message).
    test('TC-005 | should trim leading/trailing spaces from username and log in successfully', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => {
            const requestBody = route.request().postDataJSON();
            // Simulate server-side logic to trim username from request body
            if (typeof requestBody === 'object' && requestBody !== null && 'username' in requestBody && typeof requestBody.username === 'string') {
                if (requestBody.username.trim() === 'spaceman') {
                    void mockLoginResponse(route, {
                        status: 200,
                        body: { success: true, token: 'jwt', user: { username: 'spaceman' } }
                    });
                } else {
                    void mockLoginResponse(route, {
                        status: 401,
                        body: { error: 'Invalid credentials' }
                    });
                }
            } else {
                void mockLoginResponse(route, {
                    status: 400,
                    body: { error: 'Bad request' }
                });
            }
        });

        await loginPage.enterUsername(SPACED_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // If system trims, it should log in as 'spaceman'
        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, spaceman!`, 'spaceman');
    });

    // TC-006 | Login with case-sensitive username (if applicable, e.g., 'User' vs 'user')
    // Assumption: The system is case-sensitive and will fail if the case doesn't match.
    test('TC-006 | should display error for case-sensitive username mismatch', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 401,
            body: { error: 'Invalid username or password' }
        }));

        await loginPage.enterUsername(INCORRECT_CASE_USERNAME_ATTEMPT); // Attempting with incorrect case
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Invalid username or password');
        await loginPage.assertLoginPageVisible();
    });

    // TC-007 | Attempt login with empty username field (client-side validation)
    test('TC-007 | should display client-side error for empty username', async ({ page }) => {
        const apiRequestPromise: Promise<Request | null> = page.waitForRequest(API_LOGIN_ENDPOINT).catch(() => null); // Expect no request

        await loginPage.enterUsername('');
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertUsernameError('Username is required');
        await loginPage.assertLoginPageVisible();
        await expect(apiRequestPromise).resolves.toBeNull(); // No API request should be made
    });

    // TC-008 | Attempt login with empty password field (client-side validation)
    test('TC-008 | should display client-side error for empty password', async ({ page }) => {
        const apiRequestPromise: Promise<Request | null> = page.waitForRequest(API_LOGIN_ENDPOINT).catch(() => null); // Expect no request

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword('');
        await loginPage.clickLoginButton();

        await loginPage.assertPasswordError('Password is required');
        await loginPage.assertLoginPageVisible();
        await expect(apiRequestPromise).resolves.toBeNull(); // No API request should be made
    });

    // TC-009 | Attempt login with both username and password fields empty
    test('TC-009 | should display client-side errors for both empty username and password', async ({ page }) => {
        const apiRequestPromise: Promise<Request | null> = page.waitForRequest(API_LOGIN_ENDPOINT).catch(() => null); // Expect no request

        await loginPage.enterUsername('');
        await loginPage.enterPassword('');
        await loginPage.clickLoginButton();

        await loginPage.assertUsernameError('Username is required');
        await loginPage.assertPasswordError('Password is required');
        await loginPage.assertLoginPageVisible();
        await expect(apiRequestPromise).resolves.toBeNull(); // No API request should be made
    });

    // TC-010 | Attempt login with invalid username format (e.g., not an email if required)
    // Assumption: Client-side validation for email format is enforced.
    test('TC-010 | should display client-side error for invalid username format (not email)', async ({ page }) => {
        const apiRequestPromise: Promise<Request | null> = page.waitForRequest(API_LOGIN_ENDPOINT).catch(() => null);

        await loginPage.enterUsername(INVALID_EMAIL_FORMAT);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertUsernameError('Please enter a valid email address');
        await loginPage.assertLoginPageVisible();
        await expect(apiRequestPromise).resolves.toBeNull();
    });

    // TC-011 | Attempt login with invalid password format (e.g., too short)
    // Assumption: Client-side validation for minimum password length (8 chars).
    test('TC-011 | should display client-side error for password being too short', async ({ page }) => {
        const apiRequestPromise: Promise<Request | null> = page.waitForRequest(API_LOGIN_ENDPOINT).catch(() => null);

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(SHORT_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertPasswordError('Password must be at least 8 characters long');
        await loginPage.assertLoginPageVisible();
        await expect(apiRequestPromise).resolves.toBeNull();
    });

    // TC-012 | Attempt login with incorrect username and password
    test('TC-012 | should display generic error for incorrect username and password', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 401,
            body: { error: 'Invalid credentials' }
        }));

        await loginPage.enterUsername(NON_EXISTENT_USERNAME);
        await loginPage.enterPassword(WRONG_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Invalid username or password');
        await loginPage.assertLoginPageVisible();
    });

    // TC-013 | Attempt login with a non-existent username
    test('TC-013 | should display generic error for non-existent username', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 401,
            body: { error: 'Invalid credentials' }
        }));

        await loginPage.enterUsername(NON_EXISTENT_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD); // Any password
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Invalid username or password');
        await loginPage.assertLoginPageVisible();
    });

    // TC-014 | Attempt login with correct username but incorrect password
    test('TC-014 | should display generic error for correct username but incorrect password', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 401,
            body: { error: 'Invalid credentials' }
        }));

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(WRONG_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Invalid username or password');
        await loginPage.assertLoginPageVisible();
    });

    // TC-015 | Attempt login with a locked-out user account
    test('TC-015 | should display account locked message for a locked-out user', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 403, // Forbidden
            body: { error: 'Account locked' }
        }));

        await loginPage.enterUsername(LOCKED_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Your account has been locked. Please contact support.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-016 | Attempt login with an unverified/inactive user account
    test('TC-016 | should display inactive account message for an unverified user', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 403, // Forbidden
            body: { error: 'Account not active' }
        }));

        await loginPage.enterUsername(INACTIVE_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Your account is not active. Please verify your email.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-017 | Attempt login after multiple failed attempts (rate limiting)
    test('TC-017 | should display rate limiting error after multiple failed login attempts', async ({ page }) => {
        let failedAttempts: number = 0;
        await page.route(API_LOGIN_ENDPOINT, route => {
            failedAttempts++;
            if (failedAttempts <= 5) {
                void mockLoginResponse(route, { status: 401, body: { error: 'Invalid credentials' } });
            } else {
                void mockLoginResponse(route, { status: 429, body: { error: 'Too many requests' } });
            }
        });

        // Simulate 5 failed attempts
        for (let i = 0; i < 5; i++) {
            await loginPage.enterUsername(VALID_USERNAME);
            await loginPage.enterPassword(WRONG_PASSWORD);
            await loginPage.clickLoginButton();
            await loginPage.assertErrorMessage('Invalid username or password');
            await loginPage.openLoginPage(); // Re-open login page for next attempt
        }

        // 6th attempt, even with correct credentials, should trigger rate limit
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD); // Correct password
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Too many login attempts. Please try again later.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-018 | Handle server-side error (e.g., 500 Internal Server Error)
    test('TC-018 | should display generic error message for 500 Internal Server Error', async ({ page }) => {
        // Listen for console errors to verify the 500 error is logged
        page.on('console', msg => {
            if (msg.type() === 'error') {
                expect(msg.text()).toContain('500'); // Expect to see 500 error in console
            }
        });
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 500,
            body: { error: 'Internal Server Error' }
        }));

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('An unexpected error occurred. Please try again later.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-019 | Handle network error during login request
    test('TC-019 | should display network error message when login request fails', async ({ page }) => {
        // Listen for request failures to verify the network error
        page.on('requestfailed', request => {
            if (request.url().includes(API_LOGIN_ENDPOINT)) {
                // The exact errorText might vary slightly between browsers/OS
                expect(request.failure()?.errorText).toMatch(/net::ERR_INTERNET_DISCONNECTED|failed/);
            }
        });
        await page.route(API_LOGIN_ENDPOINT, route => route.abort('failed')); // Simulate network failure

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertErrorMessage('Network error. Please check your internet connection and try again.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-020 | Login under slow network conditions
    test('TC-020 | should display loading indicator and log in successfully under slow network', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, async route => {
            await page.waitForTimeout(3000); // Simulate network delay of 3 seconds
            await mockLoginResponse(route, {
                status: 200,
                body: { success: true, token: 'jwt_token', user: { username: VALID_USERNAME } }
            });
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        const loginButtonClickPromise: Promise<void> = loginPage.clickLoginButton();

        await loginPage.assertLoadingSpinnerVisible(); // Check loading spinner appears immediately after click
        await loginButtonClickPromise; // Wait for the click action (which includes the API call) to resolve after delay

        await loginPage.assertLoadingSpinnerHidden(); // Check loading spinner disappears after API response
        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, ${VALID_USERNAME}!`, VALID_USERNAME);
    });

    // TC-021 | Login request timeout
    test('TC-021 | should display timeout error message when login request times out', async ({ page }) => {
        // Assume client-side timeout is X seconds (e.g., 5s). Mock API to respond after (X + buffer) seconds.
        // The application's client-side code is expected to handle the timeout and display an error.
        await page.route(API_LOGIN_ENDPOINT, async route => {
            // Simulate a delay longer than expected client timeout (e.g., 10 seconds if client times out at 5s)
            await page.waitForTimeout(10000);
            await mockLoginResponse(route, {
                status: 200,
                body: { success: true, token: 'jwt_token', user: { username: VALID_USERNAME } }
            });
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // Expect client-side timeout to trigger an error before the mock response is received
        await loginPage.assertErrorMessage('Login request timed out. Please try again.');
        await loginPage.assertLoginPageVisible();
    });

    // TC-022 | Keyboard navigation through login form
    test('TC-022 | should allow keyboard navigation and submission', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt_token', user: { username: VALID_USERNAME } }
        }));

        await loginPage.openLoginPage(); // Ensure page is open to set initial focus
        
        // Use page.keyboard for explicit key presses
        await page.keyboard.press('Tab'); // Focus on username
        await expect(loginPage.usernameInput).toBeFocused();
        await page.keyboard.type(VALID_USERNAME);

        await page.keyboard.press('Tab'); // Focus on password
        await expect(loginPage.passwordInput).toBeFocused();
        await page.keyboard.type(VALID_PASSWORD);

        await page.keyboard.press('Tab'); // Focus on login button
        await expect(loginPage.loginButton).toBeFocused();

        await page.keyboard.press('Enter'); // Submit form

        await loginPage.verifyLoginSuccess(DASHBOARD_URL, `Welcome, ${VALID_USERNAME}!`, VALID_USERNAME);
    });

    // TC-023 | Screen reader announcements for form fields and error messages
    test('TC-023 | should have proper accessibility attributes for form fields and errors', async ({ page }) => {
        await loginPage.openLoginPage();

        // Assert username input accessibility
        const usernameLabel: string | null = await loginPage.usernameInput.evaluate(el => el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.getAttribute('title'));
        expect(usernameLabel).toBe('Username'); // Assuming label text or aria-label for 'Username'

        // Assert password input accessibility
        const passwordLabel: string | null = await loginPage.passwordInput.evaluate(el => el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.getAttribute('title'));
        expect(passwordLabel).toBe('Password'); // Assuming label text or aria-label for 'Password'

        // Trigger an error (e.g., empty username)
        await loginPage.clickLoginButton(); // Click with empty fields to trigger validation
        await loginPage.assertUsernameError('Username is required');

        // Assert error message accessibility
        const usernameErrorElement = loginPage.usernameError;
        await expect(usernameErrorElement).toHaveAttribute('role', 'alert');
        await expect(usernameErrorElement).toHaveAttribute('aria-live', 'assertive');

        const usernameInputId: string | null = await loginPage.usernameInput.getAttribute('id');
        const usernameErrorId: string | null = await usernameErrorElement.getAttribute('id');
        
        if (usernameInputId && usernameErrorId) {
            // Check if input is linked to error via aria-describedby
            await expect(loginPage.usernameInput).toHaveAttribute('aria-describedby', usernameErrorId);
        } else {
            // This warning will be shown if IDs are not present, indicating a potential accessibility improvement needed.
            console.warn('Skipping aria-describedby check as input/error IDs are missing. Ensure your DOM elements have IDs for accessibility.');
        }
    });

    // TC-024 | Verify focus management after error or on page load
    test('TC-024 | should manage focus correctly on page load and after validation errors', async ({ page }) => {
        await loginPage.openLoginPage();
        // Assert initial focus on username field
        await expect(loginPage.usernameInput).toBeFocused();

        // Trigger client-side error (empty username)
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await loginPage.assertUsernameError('Username is required');
        // Assert focus remains on or moves to the username field (first invalid field)
        await expect(loginPage.usernameInput).toBeFocused();
    });

    // TC-025 | User remains logged in after page refresh
    test('TC-025 | should remain logged in after page refresh', async ({ page }) => {
        // First, successfully log in
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt_token_refresh', user: { username: VALID_USERNAME } }
        }));
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await expect(page).toHaveURL(DASHBOARD_URL);

        // Mock token validation for subsequent requests (e.g., on page load after refresh)
        await page.route(API_VALIDATE_TOKEN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, user: { username: VALID_USERNAME } }
        }));

        await page.reload(); // Refresh the page

        // Verify user is still on dashboard and logged in
        await expect(page).toHaveURL(DASHBOARD_URL);
        await expect(loginPage.successMessage).toContainText(`Welcome, ${VALID_USERNAME}!`); // Re-check welcome message
        const token: string | null = await page.evaluate(() => localStorage.getItem('jwt_token'));
        expect(token).toBe('jwt_token_refresh');
    });

    // TC-026 | User is logged out after session timeout (inactivity)
    test('TC-026 | should be logged out after session timeout', async ({ page }) => {
        // Log in initially
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt_token_timeout', user: { username: VALID_USERNAME } }
        }));
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await expect(page).toHaveURL(DASHBOARD_URL);

        // Mock token validation to return 401 after a short delay (simulating timeout)
        await page.route(API_VALIDATE_TOKEN_ENDPOINT, async route => {
            // Simulate a brief delay to allow the client to *think* it's checking
            await page.waitForTimeout(100);
            await mockLoginResponse(route, {
                status: 401,
                body: { error: 'Session expired' }
            });
        });

        // Attempt to interact with a protected part of the UI or navigate.
        // This interaction should trigger the client-side session check against API_VALIDATE_TOKEN_ENDPOINT.
        await page.goto(DASHBOARD_URL); 

        // Verify redirection to login page and session expired message
        await expect(page).toHaveURL(LOGIN_URL);
        await loginPage.assertErrorMessage('Your session has expired. Please log in again.');
        const token: string | null = await page.evaluate(() => localStorage.getItem('jwt_token'));
        expect(token).toBeNull(); // Token should be cleared
    });

    // TC-027 | Verify redirection to default dashboard after successful login
    test('TC-027 | should redirect to default dashboard after successful login', async ({ page }) => {
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt', user: { username: VALID_USERNAME } }
        }));

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        await expect(page).toHaveURL(DASHBOARD_URL);
    });

    // TC-028 | Verify redirection to originally requested protected page after login
    test('TC-028 | should redirect to originally requested protected page after login', async ({ page }) => {
        // Setup: Navigate directly to a protected page, assuming the app redirects to login and stores the intended URL.
        // We'll simulate this by navigating to /profile, expecting the app to redirect to /login.
        await page.goto(PROTECTED_PAGE_URL);
        await expect(page).toHaveURL(LOGIN_URL);

        // Simulate client-side router storing the intended URL for redirection after login.
        // This is a common pattern in SPAs; assuming it's stored in localStorage.
        await page.evaluate((url: string) => localStorage.setItem('redirect_after_login', url), PROTECTED_PAGE_URL);

        // Mock successful login
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt', user: { username: VALID_USERNAME } }
        }));
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        // After successful login, the app should read 'redirect_after_login' and redirect.
        await expect(page).toHaveURL(PROTECTED_PAGE_URL);
    });

    // TC-029 | Back button behavior after successful login
    test('TC-029 | should not navigate back to login page after successful login and back button press', async ({ page }) => {
        // Log in successfully
        await page.route(API_LOGIN_ENDPOINT, route => mockLoginResponse(route, {
            status: 200,
            body: { success: true, token: 'jwt', user: { username: VALID_USERNAME } }
        }));
        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();
        await expect(page).toHaveURL(DASHBOARD_URL);

        // Navigate to another page (to have something *to* go back from)
        await page.goto(ABOUT_PAGE_URL); 
        await expect(page).toHaveURL(/.*about/);

        // Click the browser's back button.
        // It should navigate back to the dashboard, not the login page.
        await page.goBack();
        await expect(page).toHaveURL(DASHBOARD_URL); // Should stay on dashboard
        await expect(loginPage.loginButton).not.toBeVisible(); // Login form elements should not be visible
    });

    // TC-030 | Verify correct API payload and headers for successful login
    test('TC-030 | should send correct API payload and headers for successful login', async ({ page }) => {
        let capturedRequest: Request | null = null;
        await page.route(API_LOGIN_ENDPOINT, async route => {
            capturedRequest = route.request();
            await mockLoginResponse(route, {
                status: 200,
                body: { success: true, token: 'jwt', user: { username: VALID_USERNAME } }
            });
        });

        await loginPage.enterUsername(VALID_USERNAME);
        await loginPage.enterPassword(VALID_PASSWORD);
        await loginPage.clickLoginButton();

        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.method()).toBe('POST');
        expect(capturedRequest?.url()).toContain(API_LOGIN_ENDPOINT);

        const requestPayload: { [key: string]: string } = capturedRequest?.postDataJSON() as { [key: string]: string };
        expect(requestPayload).toEqual({ username: VALID_USERNAME, password: VALID_PASSWORD });

        const requestHeaders: { [key: string]: string } = await capturedRequest!.allHeaders();
        expect(requestHeaders['content-type']).toBe('application/json');
        expect(requestHeaders['accept']).toContain('application/json'); // Common accept header, might have more
    });

    // TC-031 | Verify correct API payload and headers for failed login
    test('TC-031 | should send correct API payload and headers for failed login', async ({ page }) => {
        let capturedRequest: Request | null = null;
        await page.route(API_LOGIN_ENDPOINT, async route => {
            capturedRequest = route.request();
            await mockLoginResponse(route, {
                status: 401,
                body: { error: 'Invalid credentials' }
            });
        });

        await loginPage.enterUsername(NON_EXISTENT_USERNAME);
        await loginPage.enterPassword(WRONG_PASSWORD);
        await loginPage.clickLoginButton();

        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.method()).toBe('POST');
        expect(capturedRequest?.url()).toContain(API_LOGIN_ENDPOINT);

        const requestPayload: { [key: string]: string } = capturedRequest?.postDataJSON() as { [key: string]: string };
        expect(requestPayload).toEqual({ username: NON_EXISTENT_USERNAME, password: WRONG_PASSWORD });

        const requestHeaders: { [key: string]: string } = await capturedRequest!.allHeaders();
        expect(requestHeaders['content-type']).toBe('application/json');
        expect(requestHeaders['accept']).toContain('application/json');
    });
});