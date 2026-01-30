import { LLMClient } from "./llmClient";

export async function generateTestCases(code: string, context: { codeType?: string; featureName?: string; devStatus?: string; dependencyStatus?: string; knownLimitations?: string; additionalContext?: string } = {}): Promise<string> {
  const llm = new LLMClient();

  const systemPrompt = `You are an expert QA Engineer specialized in Playwright and TypeScript testing.
Your task is to analyze provided code and generate comprehensive, actionable test cases.

*Test Case Generation Standards*:
1. Happy Path Scenarios - Normal, expected user flows
2. Edge Cases - Boundary conditions, unusual but valid inputs
3. Error Handling - Exception scenarios, error states
4. Negative Scenarios - Invalid inputs, failed operations
5. Performance Scenarios - Load, timeout, slow network
6. Accessibility - Keyboard navigation, screen reader compatibility
7. State Management - State transitions, data persistence
8. Integration Points - API calls, external dependencies, mocking strategies

*Output Format*:
Each test case should include:
- Test ID (TC-XXX)
- Title (clear, specific action)
- Preconditions (setup required)
- Steps (numbered, detailed actions)
- Expected Result (specific assertion)
- Data Requirements (mocks/constants needed)
- Notes (special considerations, known issues)

*For Multi-Repo Environment*:
- Identify which test data/mocks are needed
- Note what parts are under development
- Suggest mock implementations if code is incomplete
- Mark dependencies clearly

Return ONLY the structured test cases without explanations.`;

  const userPrompt = `Analyze the following code and generate comprehensive test cases:

*Code Type*: ${context.codeType || 'Feature/Page Object'}
*Feature Name*: ${context.featureName || 'Not specified'}
*Development Status*: ${context.devStatus || 'Complete'}
${context.dependencyStatus ? `**Dependencies**: ${context.dependencyStatus}` : ''}
${context.knownLimitations ? `**Known Limitations**: ${context.knownLimitations}` : ''}

\`\`\`typescript
${code}
\`\`\`

${context.additionalContext ? `**Additional Context**:\n${context.additionalContext}\n` : ''}

Generate test cases in this exact format:

*TC-[ID] | [Test Title]*
Preconditions: [Setup required]
Steps:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected Result: [Specific assertion]
Data Requirements: [Mocks/Constants needed]
Notes: [Special considerations]

---

Generate comprehensive test cases covering all scenarios.`;

  return await llm.generate(systemPrompt, userPrompt);
}
