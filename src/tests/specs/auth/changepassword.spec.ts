// @ts-nocheck
import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import * as path from 'path';

// Import the local service implementation for direct function testing
import { changePassword, forcePasswordChange, validatePasswordStrength } from '../../../services/authService';
import { ChangePasswordPage } from '../../../pages/auth/changePassword.page';

// Define types for the exposed functions in the browser context
declare global {
    interface Window {
        pw_changePassword: (curr: string, newP: string, confP: string) => Promise<void>;
        pw_validatePasswordStrength: (password: string) => boolean;
        pw_forcePasswordChange: () => Promise<void>;
        _redirectedTo: string | null; // Added for Playwright internal capture
    }
}

test.describe('Auth - Change Password Feature', () => {
    let changePasswordPage: ChangePasswordPage;
    let redirectedTo: string | null;
    let consoleLogs: string[];
    let consoleWarns: string[];

    // This array will capture arguments to the exposed changePassword function
    // allowing us to assert if it was called and with what arguments.
    type ChangePasswordCall = { current: string, new: string, confirm: string };
    let mockedChangePasswordCalledWith: ChangePasswordCall[];

    // Path to the simulated HTML page
    const htmlFilePath = path.resolve(__dirname, '../../html/change-password-form.html');
    const fileUrl = `file://${htmlFilePath}`;

    test.beforeEach(async ({ page }) => {
        redirectedTo = null;
        consoleLogs = [];
        consoleWarns = [];
        mockedChangePasswordCalledWith = [];

        // 1. Mock window.location.href to capture redirections in the browser context
        await page.addInitScript(() => {
            // Intercept attempts to set window.location.href
            const originalSet = Object.getOwnPropertyDescriptor(window.location, 'href')?.set;
            Object.defineProperty(window.location, 'href', {
                set(value) {
                    window._redirectedTo = value; // Store in a global variable for Playwright to read
                    console.log(`REDIRECTED_TO: ${value}`); // Log for Playwright to capture
                    // You can call the original setter if you still want the navigation to happen
                    // if (originalSet) originalSet.call(window.location, value);
                },
                get() {
                    return window._redirectedTo || ''; // Return captured value
                }
            });
            // Initialize the capture variable
            window._redirectedTo = null;
        });


        // 2. Capture console messages from the browser context
        page.on('console', (msg: ConsoleMessage) => {
            const text = msg.text();
            if (text.startsWith('REDIRECTED_TO: ')) {
                redirectedTo = text.replace('REDIRECTED_TO: ', '');
            } else if (msg.type() === 'warn') {
                consoleWarns.push(text);
            } else if (msg.type() === 'log') {
                consoleLogs.push(text);
            }
        });

        // 3. Expose local service functions to the browser context for the HTML script to use
        await page.exposeFunction('pw_changePassword', async (curr: string, newP: string, confP: string) => {
            mockedChangePasswordCalledWith.push({ current: curr, new: newP, confirm: confP });
            // Simulate async behavior for performance test, though actual function is sync
            await test.step('Simulating network delay for changePassword', async () => {
                // No actual delay here, but TC-018 uses it for UI feedback.
                // The delay will be simulated in the exposed function if required by the test.
            });
            // Call the actual local service function logic
            changePassword(curr, newP, confP); // This will execute console.log and attempt window.location.href
        });

        await page.exposeFunction('pw_validatePasswordStrength', (password: string) => {
            return validatePasswordStrength(password);
        });

        await page.exposeFunction('pw_forcePasswordChange', async () => {
            // This will execute console.warn and attempt window.location.href
            forcePasswordChange();
        });

        // Load the simulated HTML page
        await page.goto(fileUrl);
        changePasswordPage = new ChangePasswordPage(page);
    });

    // Mock global console and window for direct Node.js function tests
    let originalConsoleLog: typeof console.log;
    let originalConsoleWarn: typeof console.warn;
    let originalWindowLocation: Location;
    let nodeJsRedirectedTo: string | null;
    let nodeJsConsoleLogs: string[];
    let nodeJsConsoleWarns: string[];

    const setupNodeJsMocks = () => {
        nodeJsRedirectedTo = null;
        nodeJsConsoleLogs = [];
        nodeJsConsoleWarns = [];

        originalConsoleLog = console.log;
        originalConsoleWarn = console.warn;
        originalWindowLocation = global.window ? global.window.location : {} as Location; // Handle if global.window not defined

        global.console.log = (message: string) => { nodeJsConsoleLogs.push(message); };
        global.console.warn = (message: string) => { nodeJsConsoleWarns.push(message); };

        if (global.window) {
            Object.defineProperty(global.window, 'location', {
                writable: true,
                value: {
                    ...global.window.location,
                    href: '',
                    set: function (newHref: string) {
                        nodeJsRedirectedTo = newHref;
                    }
                }
            });
            Object.defineProperty(global.window.location, 'href', {
                set(value) { nodeJsRedirectedTo = value; },
                get() { return nodeJsRedirectedTo || ''; }
            });
        } else {
            // For environments where global.window doesn't exist (e.g., pure Node.js test runner)
            // We'll create a dummy window object.
            global.window = {
                location: {
                    href: '',
                    set: function (newHref: string) {
                        nodeJsRedirectedTo = newHref;
                    },
                    get: function() { return nodeJsRedirectedTo || ''; }
                }
            } as any; // Type assertion to allow minimal window properties
        }
    };

    const restoreNodeJsMocks = () => {
        global.console.log = originalConsoleLog;
        global.console.warn = originalConsoleWarn;
        if (global.window) {
            Object.defineProperty(global.window, 'location', {
                writable: true,
                value: originalWindowLocation
            });
        }
    };


    // TC-001 | Change Password - Happy Path - All Valid Inputs
    test('TC-001 | should change password successfully with all valid inputs', async ({ page }) => {
        await changePasswordPage.fillCurrentPassword('CurrentSecureP@ss1');
        await changePasswordPage.fillNewPassword('NewSecureP@ss1');
        await changePasswordPage.fillConfirmNewPassword('NewSecureP@ss1');
        await changePasswordPage.clickChangePasswordButton();

        await expect(mockedChangePasswordCalledWith.length).toBe(1);
        expect(mockedChangePasswordCalledWith[0]).toEqual({
            current: 'CurrentSecureP@ss1',
            new: 'NewSecureP@ss1',
            confirm: 'NewSecureP@ss1',
        });
        await expect(consoleLogs).toContain('Password changed successfully');
        await expect(redirectedTo).toBe('/password-changed');
    });

    // TC-002 | Change Password - New Password with Minimum Length (8 chars) - Valid
    test('TC-002 | should change password successfully with new password at minimum length', async ({ page }) => {
        await changePasswordPage.fillCurrentPassword('CurrentP@ss');
        await changePasswordPage.fillNewPassword('NewP@ss1');
        await changePasswordPage.fillConfirmNewPassword('NewP@ss1');
        await changePasswordPage.clickChangePasswordButton();

        await expect(mockedChangePasswordCalledWith.length).toBe(1);
        expect(mockedChangePasswordCalledWith[0]).toEqual({
            current: 'CurrentP@ss',
            new: 'NewP@ss1',
            confirm: 'NewP@ss1',
        });
        await expect(consoleLogs).toContain('Password changed successfully');
        await expect(redirectedTo).toBe('/password-changed');
    });

    // TC-003 | Change Password - Missing Current Password (Direct function call test)
    test('TC-003 | should throw error when current password is missing', async () => {
        setupNodeJsMocks();
        await expect(async () => {
            changePassword('', 'NewSecureP@ss1', 'NewSecureP@ss1');
        }).toThrow('All password fields are required');
        await expect(nodeJsConsoleLogs).not.toContain('Password changed successfully');
        await expect(nodeJsRedirectedTo).toBeNull();
        restoreNodeJsMocks();
    });

    // TC-004 | Change Password - Missing New Password (Direct function call test)
    test('TC-004 | should throw error when new password is missing', async () => {
        setupNodeJsMocks();
        await expect(async () => {
            changePassword('CurrentSecureP@ss1', '', 'NewSecureP@ss1');
        }).toThrow('All password fields are required');
        await expect(nodeJsConsoleLogs).not.toContain('Password changed successfully');
        await expect(nodeJsRedirectedTo).toBeNull();
        restoreNodeJsMocks();
    });

    // TC-005 | Change Password - Missing Confirm Password (Direct function call test)
    test('TC-005 | should throw error when confirm new password is missing', async () => {
        setupNodeJsMocks();
        await expect(async () => {
            changePassword('CurrentSecureP@ss1', 'NewSecureP@ss1', '');
        }).toThrow('All password fields are required');
        await expect(nodeJsConsoleLogs).not.toContain('Password changed successfully');
        await expect(nodeJsRedirectedTo).toBeNull();
        restoreNodeJsMocks();
    });

    // TC-006 | Change Password - New Password and Confirm Password Mismatch (Direct function call test)
    test('TC-006 | should throw error when new password and confirm password do not match', async () => {
        setupNodeJsMocks();
        await expect(async () => {
            changePassword('CurrentSecureP@ss1', 'NewSecureP@ss1', 'MismatchP@ss2');
        }).toThrow('New password and confirm password do not match');
        await expect(nodeJsConsoleLogs).not.toContain('Password changed successfully');
        await expect(nodeJsRedirectedTo).toBeNull();
        restoreNodeJsMocks();
    });

    // TC-007 | Change Password - New Password Less Than 8 Characters (Direct function call test)
    test('TC-007 | should throw error when new password is less than 8 characters', async () => {
        setupNodeJsMocks();
        await expect(async () => {
            changePassword('CurrentSecureP@ss1', 'ShortP1!', 'ShortP1!');
        }).toThrow('Password must be at least 8 characters long');
        await expect(nodeJsConsoleLogs).not.toContain('Password changed successfully');
        await expect(nodeJsRedirectedTo).toBeNull();
        restoreNodeJsMocks();
    });

    // TC-008 | Force Password Change - Successful Redirection (Direct function call test)
    test('TC-008 | should force password change and redirect to /change-password', async () => {
        setupNodeJsMocks();
        forcePasswordChange();
        await expect(nodeJsConsoleWarns).toContain('Password change required');
        await expect(nodeJsRedirectedTo).toBe('/change-password');
        restoreNodeJsMocks();
    });

    // TC-009 | Validate Password Strength - Happy Path - All Criteria Met (Direct function call test)
    test('TC-009 | validatePasswordStrength should return true for a strong password', () => {
        expect(validatePasswordStrength('StrongP@ss1')).toBe(true);
    });

    // TC-010 | Validate Password Strength - Minimum Length Only (8 chars) - All Criteria Met (Direct function call test)
    test('TC-010 | validatePasswordStrength should return true for a password at minimum length with all criteria', () => {
        expect(validatePasswordStrength('MinP@ss1')).toBe(true);
    });

    // TC-011 | Validate Password Strength - Missing Uppercase Letter (Direct function call test)
    test('TC-011 | validatePasswordStrength should return false if missing uppercase letter', () => {
        expect(validatePasswordStrength('nouppercase1@')).toBe(false);
    });

    // TC-012 | Validate Password Strength - Missing Number (Direct function call test)
    test('TC-012 | validatePasswordStrength should return false if missing number', () => {
        expect(validatePasswordStrength('NoNumbers!')).toBe(false);
    });

    // TC-013 | Validate Password Strength - Missing Special Character (Direct function call test)
    test('TC-013 | validatePasswordStrength should return false if missing special character', () => {
        expect(validatePasswordStrength('NoSpecialChar1')).toBe(false);
    });

    // TC-014 | Validate Password Strength - Less Than 8 Characters (Direct function call test)
    test('TC-014 | validatePasswordStrength should return false if less than 8 characters', () => {
        expect(validatePasswordStrength('Short1!')).toBe(false); // 7 characters
    });

    // TC-015 | Validate Password Strength - Empty String (Direct function call test)
    test('TC-015 | validatePasswordStrength should return false for an empty string', () => {
        expect(validatePasswordStrength('')).toBe(false);
    });

    // TC-016 | Validate Password Strength - Only Spaces (Direct function call test)
    test('TC-016 | validatePasswordStrength should return false for only spaces', () => {
        expect(validatePasswordStrength('        ')).toBe(false); // 8 spaces
    });

    // TC-017 | Validate Password Strength - No Uppercase, No Number, No Special Character (Direct function call test)
    test('TC-017 | validatePasswordStrength should return false if no uppercase, number, or special char', () => {
        expect(validatePasswordStrength('justlowercase')).toBe(false);
    });

    // TC-018 | Change Password - Performance Scenario (Simulated UI Latency)
    test('TC-018 | should display loading spinner during simulated delay and redirect after success', async ({ page }) => {
        // Re-expose pw_changePassword with a delay for this specific test
        await page.exposeFunction('pw_changePassword', async (curr: string, newP: string, confP: string) => {
            mockedChangePasswordCalledWith.push({ current: curr, new: newP, confirm: confP });
            // Simulate a 2-second delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            changePassword(curr, newP, confP);
        });

        await changePasswordPage.fillCurrentPassword('CurrentSecureP@ss1');
        await changePasswordPage.fillNewPassword('NewSecureP@ss1');
        await changePasswordPage.fillConfirmNewPassword('NewSecureP@ss1');

        // Click the button and immediately check for loading state
        const clickPromise = changePasswordPage.clickChangePasswordButton();
        await changePasswordPage.expectLoadingSpinnerVisible();
        await changePasswordPage.expectButtonState('disabled');

        await clickPromise; // Wait for the click action (and its exposed function call) to complete

        // After completion, assert final state
        await expect(mockedChangePasswordCalledWith.length).toBe(1);
        await expect(consoleLogs).toContain('Password changed successfully');
        await expect(redirectedTo).toBe('/password-changed');
        await changePasswordPage.expectLoadingSpinnerHidden();
        await changePasswordPage.expectButtonState('enabled');
    });

    // TC-019 | Change Password - Accessibility - Keyboard Navigation for Form Fields
    test('TC-019 | should allow keyboard navigation and submission', async ({ page }) => {
        await page.keyboard.press('Tab'); // Focus on current password
        await page.keyboard.type('CurrentSecureP@ss1');
        await page.keyboard.press('Tab'); // Focus on new password
        await page.keyboard.type('NewSecureP@ss1');
        await page.keyboard.press('Tab'); // Focus on confirm new password
        await page.keyboard.type('NewSecureP@ss1');
        await page.keyboard.press('Tab'); // Focus on Change Password button
        await page.keyboard.press('Enter'); // Activate button

        await expect(mockedChangePasswordCalledWith.length).toBe(1);
        expect(mockedChangePasswordCalledWith[0]).toEqual({
            current: 'CurrentSecureP@ss1',
            new: 'NewSecureP@ss1',
            confirm: 'NewSecureP@ss1',
        });
        await expect(consoleLogs).toContain('Password changed successfully');
        await expect(redirectedTo).toBe('/password-changed');
    });

    // TC-020 | Change Password - Integration with `validatePasswordStrength` (UI Level)
    test('TC-020 | should display password strength feedback and prevent submission for weak password', async ({ page }) => {
        // Fill valid current password
        await changePasswordPage.fillCurrentPassword('CurrentSecureP@ss1');

        // Input a weak new password (7 characters, no uppercase, no number, no special char)
        await changePasswordPage.fillNewPassword('weakpwd');
        // The oninput event in HTML should trigger checkNewPasswordStrength
        await changePasswordPage.expectNewPasswordStrengthFeedback(
            "Password must contain: at least 8 characters, an uppercase letter, a number, a special character"
        );

        // Fill confirm new password (even if weak, for full form context)
        await changePasswordPage.fillConfirmNewPassword('weakpwd');

        // Click the button - UI should prevent calling pw_changePassword
        // The HTML form's handleSubmit has client-side validation that will prevent calling pw_changePassword
        // if `validatePasswordStrength` fails, or if basic fields are mismatched/empty.
        await changePasswordPage.clickChangePasswordButton();

        // Assert that changePassword function was NOT called
        await expect(mockedChangePasswordCalledWith.length).toBe(0);
        // Assert that an error message is displayed from the UI's pre-validation
        await changePasswordPage.expectErrorMessage(
            "New password is not strong enough." // This comes from the HTML script's fallback or the strength feedback
        );
        // User remains on the page
        await expect(redirectedTo).toBeNull();
    });

    // TC-021 | Validate password strength with a password that meets minimum length and requirements exactly
    test('TC-021 | validatePasswordStrength should return true for a password exactly meeting minimum criteria', () => {
        expect(validatePasswordStrength('A1!short')).toBe(true);
    });

    // TC-022 | Validate password strength with a very long valid password
    test('TC-022 | validatePasswordStrength should return true for a very long, valid password', () => {
        const longPassword = 'VeryLongPasswordWithManyWordsAndNumbers123!AndSpecialCharacters@#$%^&*()ThisShouldBeValid';
        expect(validatePasswordStrength(longPassword)).toBe(true);
    });

    // TC-023 | Performance Test: Validate password strength with an extremely long string
    test('TC-023 | validatePasswordStrength should perform efficiently with an extremely long password', () => {
        const basePassword = 'P@ssword123!';
        let extremelyLongPassword = '';
        for (let i = 0; i < 1000; i++) { // Repeat 1000 times to get 12000 characters
            extremelyLongPassword += basePassword;
        }
        expect(extremelyLongPassword.length).toBe(12000); // Sanity check

        const startTime = performance.now();
        const isValid = validatePasswordStrength(extremelyLongPassword);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(isValid).toBe(true);
        // Assert that the function runs within an acceptable time limit (e.g., less than 50ms)
        // This threshold might need adjustment based on typical test runner machine performance.
        expect(duration).toBeLessThan(50); // Expect execution in under 50 milliseconds
        console.log(`TC-023: validatePasswordStrength for 12000 chars took ${duration.toFixed(2)} ms`);
    });
});