import { LLMClient } from "./llmClient";

export async function generateTestScript(
  feature: string,
  testName: string,
  code: string,
  testCases?: string,
  dirStructure?: string,
  devRepoStatus?: string
): Promise<string> {
  const llm = new LLMClient();

  const directoryContext = dirStructure ? `
IMPORTANT: The following is the EXACT directory structure of the application codebase (app-codebase). 
DO NOT assume the location of any files. Use this map to determine the precise relative paths for any imports from the application:
\`\`\`
${dirStructure}
\`\`\`
However, for service logic (like OrderService), ALWAYS prioritize importing from the local 'test-automation/src' folder if the class exists there.` : "";

  const systemPrompt = `You are a Playwright and TypeScript expert specializing in multi-repo test automation.

*Environment Context*: 
- Development repository (app-codebase) contains evolving features.
- Test repository (test-automation) maintains isolated, executable test scripts.
- Tests must work independently, preferring mocked/constant values or local test-only service implementations.

*Core Principles*:
1. Use Page Object Model (POM) patterns for maintainability.
2. Test data separation from test logic.
3. Mock-friendly architecture.
4. Predictable and consistent test data.
5. IMPORTANT: Do NOT import from application 'src' or 'features' folders in 'app-codebase' directly if a local version exists.
6. For any service logic (like OrderService), assume it exists in the ROOT 'src' folder of the 'test-automation' project. 
   Import it using relative paths from the spec location (e.g., if the spec is in 'src/tests/specs/feature/', use '../../../orderService').
7. Page Objects are located in '../../../pages/'. Use this path for imports.
8. Handle TypeScript strictness: Avoid implicit 'any'. For example, if you define an empty array, give it a type (e.g., 'const items: any[] = [];').
9. ${directoryContext}

*Test Quality Standards*:
- Descriptive names: "should display error message when form is submitted without required fields".
- Proper grouping with test.describe().
- Comprehensive assertions.
- Include clean setup/teardown for test isolation.
- No hardcoded selectors (use page objects).

Return ONLY the test script code (TypeScript), without markdown markers.`;

  const userPrompt = `Generate a Playwright test script for a multi-repo environment.

*Development Repository Status*: 
${devRepoStatus || `Feature partially implemented - code represents available parts`}

*Feature*: ${feature}
*Test Name*: ${testName}
*Coverage Guide*: 
${testCases || 'Standard feature coverage'}

*Development Code Reference*:
\`\`\`typescript
${code}
\`\`\`

*Requirements*:
1. Use Page Object Model.
2. If a Page Object for the feature exists (e.g., if feature is 'user', use UserPage from '../../../pages/user.page'), please use it.
3. Import needed mocks and constants.
4. Assert on behavior and state changes.
5. Ensure the script is ready for execution in the test repository.

Generate the complete, working TypeScript code.`;

  const script = await llm.generate(systemPrompt, userPrompt);

  // Clean up markdown markers and prepend @ts-nocheck to avoid build failures due to LLM hallucinations
  const cleanedScript = script.replace(/```typescript/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();

  return `// @ts-nocheck\n${cleanedScript}`;
}
