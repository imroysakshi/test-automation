import { LLMClient } from "./llmClient";

export async function generateTestScript(feature: string, testName: string, code: string, testCases?: string): Promise<string> {
  const llm = new LLMClient();

  const systemPrompt = `You are a Playwright and TypeScript expert. 
Your goal is to generate high-quality automation test scripts that follow best practices:
1. Use Page Object Model patterns where appropriate.
2. Include clean setup/teardown if needed.
3. Use descriptive test names.
4. Ensure all assertions are relevant.
5. Use "test.describe" to group tests.
6. Return ONLY the code, without markdown markers.`;

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

  // Clean up markdown markers if the LLM included them
  return script.replace(/```typescript/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();
}

