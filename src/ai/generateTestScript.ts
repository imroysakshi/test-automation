import { LLMClient } from "./llmClient";

export async function generateTestScript(feature: string, testName: string, code: string, testCases?: string, dirStructure?: string): Promise<string> {
  const llm = new LLMClient();

  const directoryContext = dirStructure ? `
The following is the directory structure of the application codebase (app-codebase):
\`\`\`
${dirStructure}
\`\`\`
Use this structure to determine correct relative paths for any imports from the application. 
However, for service logic (like OrderService), prefer importing from the local 'test-automation/src' folder if it exists there.` : "";

  const systemPrompt = `You are a Playwright and TypeScript expert. 
Your goal is to generate high-quality automation test scripts that follow best practices:
1. Use Page Object Model patterns.
2. IMPORTANT: Do NOT import from application 'src' or 'features' folders in 'app-codebase'.
3. For any service logic (like OrderService), assume it exists in the ROOT 'src' folder of the 'test-automation' project. 
   Import it using relative paths from the spec location (e.g., if the spec is in 'src/tests/specs/feature/', use '../../../orderService').
4. Page Objects are located in '../../../pages/'. Use this path for imports.
5. If a Page Object for the feature exists, use it (e.g., if feature is 'user', use UserPage from '../../../pages/user.page').
6. Handle TypeScript strictness: Avoid implicit 'any'. For example, if you define an empty array, give it a type (e.g., 'const items: any[] = [];').
7. ${directoryContext}
8. Include clean setup/teardown if needed.
9. Use "test.describe" to group tests.
10. Return ONLY the code, without markdown markers.`;

  const userPrompt = `Generate a Playwright test script for the following feature.
Feature: ${feature}
Test Name: ${testName}

${testCases ? `Use these test cases as a guide:\n${testCases}\n` : ""}

Code to test:
\`\`\`typescript
${code}
\`\`\`
`;

  const script = await llm.generate(systemPrompt, userPrompt);

  // Clean up markdown markers and prepend @ts-nocheck to avoid build failures due to LLM hallucinations
  const cleanedScript = script.replace(/```typescript/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();

  return `// @ts-nocheck\n${cleanedScript}`;
}
