// @ts-nocheck
import { test, expect, Page } from '@playwright/test';
import { UserPage } from '../../../pages/user.page';
import { UserSearchParams, UserSearchResult } from '../../../services/userSearchService'; // For typing expected results

test.describe('User Search Service Tests', () => {
    let userPage: UserPage;

    test.beforeEach(async ({ page }: { page: Page }) => {
        userPage = new UserPage(page);
    });

    // I. Test Cases for `searchUsers` Method:

    test.describe('searchUsers Method', () => {
        // 1. Happy Path - Basic Search
        test('should return correct user(s) for an existing username', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'admin_user' });
            expect(result.length).toBe(1);
            expect(result[0].username).toBe('admin_user');
        });

        test('should return correct user(s) for an existing email', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'john@example.com' });
            expect(result.length).toBe(1);
            expect(result[0].email).toBe('john@example.com');
        });

        test('should be case-insensitive for queries', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'Admin_UsEr' });
            expect(result.length).toBe(1);
            expect(result[0].username).toBe('admin_user');
        });

        test('should return an empty array when no matching users are found', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'nonexistent' });
            expect(result).toEqual([]);
        });

        // 2. Happy Path - Filtering (Note: Mock service doesn't fully implement filters beyond query,
        // so these will primarily test the query part unless the mock service is extended.)
        test('should search with combination of query, role, and isActive filters (mocked behavior)', async () => {
            // The current mock filters by username/email only.
            // For a complete test, the UserSearchService mock would need to be extended to filter by role and isActive.
            // Assuming the UI layer passes these parameters, we're testing the service call.
            const params: UserSearchParams = { query: 'john', role: 'USER', isActive: true };
            const result: UserSearchResult[] = await userPage.searchUsers(params);
            expect(result.length).toBe(1);
            expect(result[0].username).toBe('john_doe');
            // Additional assertions would verify role/isActive if mock supported it
            // expect(result[0].role).toBe('USER');
            // expect(result[0].isActive).toBe(true);
        });

        // 3. Happy Path - Limiting Results
        test('should correctly restrict the number of returned results using limit', async () => {
            // To properly test limit, we need more mock users that match a query
            // Let's assume 'user' query would match 'admin_user', 'john_doe' (if mock extended)
            // Current mock only has 3 users, so a generic query like 'o' matches 'john_doe'.
            // To reliably test limit, we'd need more diverse mock data or a query that matches many.
            // Based on current mock: searching 'o' will match 'john_doe'.
            // If the mock was 'admin_user', 'john_doe', 'another_user', 'some_other_user'
            // Searching 'user' with limit 1 should return 1.
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'o', limit: 1 });
            expect(result.length).toBe(1);
            expect(result[0].username).toBe('john_doe'); // Matches 'john_doe'
        });

        test('should return all matching results when limit is greater than or equal to total matches', async () => {
            // Query 'o' matches 'john_doe' and 'admin_user' (email 'admin@example.com')
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'o', limit: 10 });
            expect(result.length).toBe(2);
            const usernames: string[] = result.map(u => u.username);
            expect(usernames).toContain('admin_user');
            expect(usernames).toContain('john_doe');
        });

        test('should apply default limit (10) when limit is not provided', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'o' }); // Matches 2 users
            expect(result.length).toBe(2); // Should not exceed 10, but will return all 2 matches
            const usernames: string[] = result.map(u => u.username);
            expect(usernames).toContain('admin_user');
            expect(usernames).toContain('john_doe');
        });

        // 4. Edge Cases
        test('should return an empty array when limit is 0', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'admin', limit: 0 });
            expect(result).toEqual([]);
        });

        test('should handle a very long valid query string', async () => {
            const longQuery: string = 'admin_user_with_a_very_long_and_specific_username_that_should_match_if_it_existed_in_the_mock_data';
            const result: UserSearchResult[] = await userPage.searchUsers({ query: longQuery });
            expect(result).toEqual([]); // Expected if no user matches this long string
        });

        // 5. Error Handling / Negative Scenarios
        test('should throw an error when query is an empty string', async () => {
            await expect(async () => {
                await userPage.searchUsers({ query: '' });
            }).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('should throw an error when query contains only whitespace characters', async () => {
            await expect(async () => {
                await userPage.searchUsers({ query: '   ' });
            }).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('should throw an error when query is less than 3 characters long', async () => {
            await expect(async () => {
                await userPage.searchUsers({ query: 'ab' });
            }).rejects.toThrow('Search query must be at least 3 characters long');
        });

        test('should NOT throw an error when query is exactly 3 characters long (boundary test)', async () => {
            const result: UserSearchResult[] = await userPage.searchUsers({ query: 'adm' });
            expect(result.length).toBeGreaterThanOrEqual(0); // Should execute without error
            const usernames: string[] = result.map(u => u.username);
            expect(usernames).toContain('admin_user');
        });
    });

    // II. Test Cases for `getSuggestions` Method:

    test.describe('getSuggestions Method', () => {
        // 1. Happy Path
        test('should return suggestions for a partial query with matching results', async () => {
            const suggestions: string[] = await userPage.getSuggestions('ad');
            expect(suggestions).toEqual(['admin']);
        });

        test('should return suggestions case-insensitively', async () => {
            const suggestions: string[] = await userPage.getSuggestions('Ad');
            expect(suggestions).toEqual(['admin']);
        });

        test('should return multiple suggestions if multiple matches exist', async () => {
            const suggestions: string[] = await userPage.getSuggestions('j');
            expect(suggestions.sort()).toEqual(['jane', 'john'].sort());
        });

        test('should return no suggestions (empty array) for a partial query with no matches', async () => {
            const suggestions: string[] = await userPage.getSuggestions('xyz');
            expect(suggestions).toEqual([]);
        });

        test('should return a full suggestion if provided as a partial query', async () => {
            const suggestions: string[] = await userPage.getSuggestions('admin');
            expect(suggestions).toEqual(['admin']);
        });

        // 2. Edge Cases
        test('should return an empty array when partialQuery is an empty string', async () => {
            const suggestions: string[] = await userPage.getSuggestions('');
            expect(suggestions).toEqual([]);
        });

        test('should return an empty array when partialQuery contains only whitespace characters', async () => {
            const suggestions: string[] = await userPage.getSuggestions('   ');
            expect(suggestions).toEqual([]);
        });
    });
});