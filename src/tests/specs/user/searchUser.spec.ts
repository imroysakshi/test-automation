// @ts-nocheck
import { test, expect, Page } from '@playwright/test';
import { UserPage } from '../../../../../pages/user.page'; // Path from src/tests/specs/feature/user/ to pages/
import { UserSearchResult } from '../../../../../src/userSearchService'; // Path from src/tests/specs/feature/user/ to src/

let userPage: UserPage;

test.describe('User Search Service Tests', () => {

    test.beforeEach(async ({ page }) => {
        userPage = new UserPage(page);
        // This is a conceptual navigation for a service-level test.
        // In a real UI test, this would navigate to the actual search page.
        await userPage.navigateToUserSearch();
    });

    // --- UserSearchService.searchUsers() ---

    test.describe('UserSearchService.searchUsers() - Happy Paths', () => {
        test('1. Search with exact query (username) returns the correct user', async () => {
            const results = await userPage.searchUsers({ query: 'john_doe' });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('john_doe');
            expect(results[0].email).toBe('john@example.com');
        });

        test('1. Search with exact query (email) returns the correct user', async () => {
            const results = await userPage.searchUsers({ query: 'admin@example.com' });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('admin_user');
            expect(results[0].email).toBe('admin@example.com');
        });

        test('2. Search with partial query (username) finds matching users', async () => {
            const results = await userPage.searchUsers({ query: 'john' });
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some(user => user.username === 'john_doe')).toBeTruthy();
        });

        test('3. Search with partial query (email) finds matching users', async () => {
            const results = await userPage.searchUsers({ query: 'example.com' });
            expect(results.length).toBeGreaterThanOrEqual(5); // Accounts for multiple users from mock data
            const expectedEmails = ['admin@example.com', 'john@example.com', 'jane@example.com', 'test1@example.com', 'test2@example.com', 'guest@example.com', 'long.name@example.com'];
            expectedEmails.forEach(email => {
                expect(results.some(user => user.email === email)).toBeTruthy();
            });
        });

        test('4. Case-insensitive search (username) returns correct users', async () => {
            const results = await userPage.searchUsers({ query: 'JOHN_DOE' });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('john_doe');
        });

        test('4. Case-insensitive search (email) returns correct users', async () => {
            const results = await userPage.searchUsers({ query: 'ADMIN@EXAMPLE.COM' });
            expect(results.length).toBe(1);
            expect(results[0].email).toBe('admin@example.com');
        });

        test('5. No matching users returns an empty array', async () => {
            const results = await userPage.searchUsers({ query: 'nonexistentuser123' });
            expect(results).toEqual([]);
        });

        test('6. Default limit (10) is applied when limit is not provided', async () => {
            // For this test to be meaningful, ensure there are more than 10 matches for 'user'
            // based on the mock data.
            const allPossibleMatchesForUser = await userPage.searchUsers({ query: 'user', limit: 100 });
            test.skip(allPossibleMatchesForUser.length <= 10, 'Skipping default limit test as less than 10 users match "user"');

            const results = await userPage.searchUsers({ query: 'user' });
            expect(results.length).toBe(10);
            expect(results.every(r => r.username.toLowerCase().includes('user') || r.email.toLowerCase().includes('user'))).toBeTruthy();
        });

        test('7. Custom limit (fewer than available) correctly restricts results', async () => {
            const results = await userPage.searchUsers({ query: 'user', limit: 3 });
            expect(results.length).toBe(3);
            expect(results.every(r => r.username.toLowerCase().includes('user') || r.email.toLowerCase().includes('user'))).toBeTruthy();
        });

        test('8. Custom limit (more than available) returns all available matches', async () => {
            const results = await userPage.searchUsers({ query: 'john_doe', limit: 100 });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('john_doe');
        });

        test('9. Custom limit (equal to available) returns all available matches', async () => {
            const results = await userPage.searchUsers({ query: 'john_doe', limit: 1 });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('john_doe');
        });
    });

    test.describe('UserSearchService.searchUsers() - Edge Cases', () => {
        test('10. Query with minimum length (3 characters) works correctly', async () => {
            const results = await userPage.searchUsers({ query: 'adm' });
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some(user => user.username === 'admin_user')).toBeTruthy();
        });

        test('11. Query with leading/trailing spaces is trimmed and works', async () => {
            const results = await userPage.searchUsers({ query: '  john  ' });
            expect(results.length).toBe(1);
            expect(results[0].username).toBe('john_doe');
        });

        test('12. Multiple matches for a common query returns all relevant users within limit', async () => {
            const results = await userPage.searchUsers({ query: 'user' });
            // Based on mock data, there are many users with 'user' in username/email.
            expect(results.length).toBe(10); // Default limit
            expect(results.some(user => user.username === 'admin_user')).toBeTruthy();
            expect(results.some(user => user.username === 'john_doe')).toBeTruthy();
            expect(results.some(user => user.username === 'jane_smith')).toBeTruthy();
        });

        test('13. Search for common parts of username/email (underscore) works', async () => {
            const results = await userPage.searchUsers({ query: '_' });
            expect(results.length).toBeGreaterThanOrEqual(5); // admin_user, john_doe, jane_smith, test_user_1, test_user_2, super_admin, guest_user, user_with_long_name, dev_user, qa_user
            expect(results.some(user => user.username === 'admin_user')).toBeTruthy();
            expect(results.some(user => user.username === 'john_doe')).toBeTruthy();
        });

        test('13. Search for common parts of username/email (domain part) works', async () => {
            const results = await userPage.searchUsers({ query: '@example.com' });
            expect(results.length).toBeGreaterThanOrEqual(5);
            expect(results.some(user => user.email === 'admin@example.com')).toBeTruthy();
            expect(results.some(user => user.email === 'john@example.com')).toBeTruthy();
        });

        test('14. Limit of 0 returns an empty array, even if there are matches', async () => {
            const results = await userPage.searchUsers({ query: 'user', limit: 0 });
            expect(results).toEqual([]);
        });
    });

    test.describe('UserSearchService.searchUsers() - Error Handling / Negative Scenarios', () => {
        test('15. Empty query string throws "Search query must be at least 3 characters long" error', async () => {
            await expect(userPage.searchUsers({ query: '' })).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('16. Query with only spaces throws "Search query must be at least 3 characters long" error', async () => {
            await expect(userPage.searchUsers({ query: '   ' })).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('17. Query too short (less than 3 characters) throws "Search query must be at least 3 characters long" error', async () => {
            await expect(userPage.searchUsers({ query: 'ab' })).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('18. Missing query parameter (simulating null/undefined runtime) throws error', async () => {
            // TypeScript prevents `query` from being undefined/null at compile time for UserSearchParams,
            // so we cast to `any` to simulate a runtime scenario or a less strict API input.
            await expect(userPage.searchUsers({ query: null as any })).rejects.toThrow('Search query must be at least 3 characters long');
            await expect(userPage.searchUsers({ query: undefined as any })).rejects.toThrow('Search query must be at least 3 characters long');
        });
    });

    test.describe('UserSearchService.searchUsers() - Feature Gaps / Implementation Discrepancies', () => {
        const commonQuery = 'user'; // Query expected to match multiple users of different types

        test('19. `role` filter is ignored by the current mock implementation', async () => {
            const resultsWithoutRoleFilter = await userPage.searchUsers({ query: commonQuery, limit: 100 }); // Get all matches
            const resultsWithAdminRoleFilter = await userPage.searchUsers({ query: commonQuery, role: 'ADMIN', limit: 100 });

            // Expect the number of results to be the same, indicating no filtering by role
            expect(resultsWithAdminRoleFilter.length).toBe(resultsWithoutRoleFilter.length);
            // Verify that a user not matching the filtered role is still present
            expect(resultsWithAdminRoleFilter.some(u => u.username === 'john_doe' && u.role === 'USER')).toBeTruthy();
        });

        test('20. `isActive` filter is ignored by the current mock implementation', async () => {
            const resultsWithoutIsActiveFilter = await userPage.searchUsers({ query: 'jane', limit: 100 });
            const resultsWithIsActiveFilter = await userPage.searchUsers({ query: 'jane', isActive: true, limit: 100 });

            // Expect the number of results to be the same. 'jane_smith' has isActive: false
            expect(resultsWithIsActiveFilter.length).toBe(resultsWithoutIsActiveFilter.length);
            expect(resultsWithIsActiveFilter.some(u => u.username === 'jane_smith' && u.isActive === false)).toBeTruthy();
        });

        test('21. Both `role` and `isActive` filters are ignored', async () => {
            const resultsWithoutFilters = await userPage.searchUsers({ query: commonQuery, limit: 100 });
            const resultsWithBothFilters = await userPage.searchUsers({ query: commonQuery, role: 'ADMIN', isActive: false, limit: 100 });

            // Expect the number of results to be the same, confirming both filters are ignored
            expect(resultsWithBothFilters.length).toBe(resultsWithoutFilters.length);
            // Verify that users not matching the filters are still present (e.g., john_doe: USER, isActive: true)
            expect(resultsWithBothFilters.some(u => u.username === 'john_doe' && u.role === 'USER' && u.isActive === true)).toBeTruthy();
            // Verify that users matching the filters if they were applied are also present (e.g., admin_user: ADMIN, isActive: true)
            expect(resultsWithBothFilters.some(u => u.username === 'admin_user' && u.role === 'ADMIN' && u.isActive === true)).toBeTruthy();
        });
    });

    // --- UserSearchService.getSuggestions() ---

    test.describe('UserSearchService.getSuggestions() - Happy Paths', () => {
        test('22. Valid partial query with matches returns expected suggestions', async () => {
            const suggestions = await userPage.getSearchSuggestions('ad');
            expect(suggestions).toEqual(['admin_user', 'admin']);
        });

        test('23. Valid partial query with multiple matches returns all relevant suggestions', async () => {
            const suggestions = await userPage.getSearchSuggestions('j');
            expect(suggestions).toEqual(['john_doe', 'jane_smith', 'john', 'jane']);
        });

        test('24. Case-insensitive matching for partial queries', async () => {
            const suggestions = await userPage.getSearchSuggestions('AD');
            expect(suggestions).toEqual(['admin_user', 'admin']);
        });

        test('25. No matching suggestions returns an empty array', async () => {
            const suggestions = await userPage.getSearchSuggestions('xyz');
            expect(suggestions).toEqual([]);
        });

        test('26. Exact match for a suggestion returns only that suggestion (and others that start with it)', async () => {
            const suggestions = await userPage.getSearchSuggestions('admin');
            expect(suggestions).toEqual(['admin_user', 'admin']);
        });
    });

    test.describe('UserSearchService.getSuggestions() - Edge Cases', () => {
        test('27. Single character partial query returns all suggestions starting with that character', async () => {
            const suggestions = await userPage.getSearchSuggestions('a');
            const expectedSuggestions: string[] = ['admin_user', 'another_user', 'admin'];
            expect(suggestions).toEqual(expect.arrayContaining(expectedSuggestions));
            expect(suggestions.every(s => s.startsWith('a'))).toBeTruthy();
        });

        test('28. Partial query matching beginning of suggestion, not middle', async () => {
            const suggestionsForAdmin = await userPage.getSearchSuggestions('admin');
            expect(suggestionsForAdmin).toEqual(['admin_user', 'admin']);

            const suggestionsForMin = await userPage.getSearchSuggestions('min');
            expect(suggestionsForMin).toEqual([]); // 'admin' does not start with 'min'
        });

        test('29. Longer partial query (subset of a suggestion) returns correct matches', async () => {
            const suggestions = await userPage.getSearchSuggestions('admin_u');
            expect(suggestions).toEqual(['admin_user']);
        });
    });

    test.describe('UserSearchService.getSuggestions() - Negative Scenarios', () => {
        test('30. Empty partial query string returns an empty array', async () => {
            const suggestions = await userPage.getSearchSuggestions('');
            expect(suggestions).toEqual([]);
        });

        test('31. Partial query with leading/trailing spaces returns an empty array (due to startsWith behavior)', async () => {
            const suggestions = await userPage.getSearchSuggestions(' ad');
            expect(suggestions).toEqual([]);
        });

        test('32. Partial query with special characters not present in suggestions returns an empty array', async () => {
            const suggestions = await userPage.getSearchSuggestions('!@#');
            expect(suggestions).toEqual([]);
        });
    });
});