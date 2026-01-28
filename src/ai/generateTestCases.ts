import { LLMClient } from "./llmClient";

export async function generateTestCases(code: string): Promise<string> {
  const llm = new LLMClient();

  const systemPrompt = `You are an expert QA Engineer specialized in Playwright and TypeScript.
Your task is to analyze the provided Page Object or feature code and generate a comprehensive list of high-level test cases.
Focus on:
1. Happy paths
2. Edge cases
3. Error handling
4. Negative scenarios

Return only the list of test cases in a clear, numbered format.`;

  const userPrompt = `Analyze the following code and generate test cases:

\`\`\`typescript
${code}
\`\`\`
`;

  return await llm.generate(systemPrompt, userPrompt);
}
