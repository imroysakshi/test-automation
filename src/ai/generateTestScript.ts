import { LLMClient } from "./llmClient";

/**
 * Generates only a specific test.describe block for incremental updates
 * This is used when updating an existing test file that has multiple test blocks
 */
export async function generateTestBlock(
  feature: string,
  testName: string,
  code: string,
  testCases?: string,
  dirStructure?: string,
  devRepoStatus?: string,
  existingBlockContent?: string,
  fileHeader?: string
): Promise<string> {
  const llm = new LLMClient();

  const directoryContext = dirStructure ? `
IMPORTANT: The following is the EXACT directory structure of the application codebase (app-codebase). 
DO NOT assume the location of any files. Use this map to determine the precise relative paths for any imports from the application:
\`\`\`
${dirStructure}
\`\`\`
However, for service logic (like OrderService), ALWAYS prioritize importing from the local 'test-automation/src' folder if the class exists there.` : "";

  const blockUpdateInstruction = existingBlockContent ? `
*INCREMENTAL BLOCK UPDATE MODE*:
- You are updating ONLY a specific test.describe block within a larger test file.
- The file header (imports, constants, etc.) is provided for context but DO NOT include it in your response.
- You MUST return ONLY the test.describe block content (starting with 'test.describe(' and ending with the matching closing brace).
- DO NOT remove or modify existing tests within this block unless they are clearly broken by the new code changes.
- Add NEW test cases for new methods or logic found in the 'Development Code Reference'.
- Maintain the same coding style and POM patterns already present in the existing block.
- If the existing block has nested test.describe blocks, preserve their structure.

*EXISTING BLOCK CONTENT TO UPDATE*:
\`\`\`typescript
${existingBlockContent}
\`\`\`

*FILE HEADER FOR CONTEXT (DO NOT INCLUDE IN RESPONSE)*:
\`\`\`typescript
${fileHeader || ''}
\`\`\`
` : "";

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

*Block Update Instructions*:
${blockUpdateInstruction || "This is a new test block generation."}

*Test Quality Standards*:
- Descriptive names: "should display error message when form is submitted without required fields".
- Proper grouping with test.describe().
- Comprehensive assertions.
- Include clean setup/teardown for test isolation.
- No hardcoded selectors (use page objects).

CRITICAL: Return ONLY the test.describe block code (TypeScript), without markdown markers. Do NOT include imports, constants, or any content outside the test.describe block.`;

  const userPrompt = `Generate/Update a Playwright test.describe block for a multi-repo environment.

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
3. Import needed mocks and constants (but remember: imports go in the file header, not in the block - so just reference them as if they exist).
4. Assert on behavior and state changes.
5. Ensure the block is ready for execution in the test repository.
6. Return ONLY the test.describe block, starting with 'test.describe(' and ending with the matching closing brace.

Generate the complete test.describe block code.`;

  const script = await llm.generate(systemPrompt, userPrompt);

  // Clean up markdown markers
  let cleanedScript = script.replace(/```typescript/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();
  
  // Ensure we only have the test.describe block (remove any stray imports or comments at the start)
  // Find the first test.describe( and start from there
  const describeIndex = cleanedScript.indexOf('test.describe(');
  if (describeIndex > 0) {
    cleanedScript = cleanedScript.substring(describeIndex);
  }
  
  // Ensure it ends with a closing brace (find the matching closing brace for the outermost test.describe)
  // This is a simple approach - count braces to find the end
  let braceCount = 0;
  let startCounting = false;
  let endIndex = cleanedScript.length;
  
  for (let i = 0; i < cleanedScript.length; i++) {
    if (cleanedScript[i] === 't' && cleanedScript.substring(i).startsWith('test.describe(')) {
      startCounting = true;
      // Skip past 'test.describe('
      i += 'test.describe('.length - 1;
      continue;
    }
    if (startCounting) {
      if (cleanedScript[i] === '{') braceCount++;
      if (cleanedScript[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }
  
  cleanedScript = cleanedScript.substring(0, endIndex).trim();
  
  return cleanedScript;
}

export async function generateTestScript(
  feature: string,
  testName: string,
  code: string,
  testCases?: string,
  dirStructure?: string,
  devRepoStatus?: string,
  existingTestContent?: string,
  manualZoneContent?: string
): Promise<string> {
  const llm = new LLMClient();

  const directoryContext = dirStructure ? `
IMPORTANT: The following is the EXACT directory structure of the application codebase (app-codebase). 
DO NOT assume the location of any files. Use this map to determine the precise relative paths for any imports from the application:
\`\`\`
${dirStructure}
\`\`\`
However, for service logic (like OrderService), ALWAYS prioritize importing from the local 'test-automation/src' folder if the class exists there.` : "";

  const mergeInstruction = existingTestContent ? `
*INCREMENTAL UPDATE MODE*:
- You are provided with the EXISTING test file content.
- DO NOT remove or modify existing tests unless they are clearly broken by the new code changes.
${manualZoneContent ? `- IMPORTANT: A MANUAL ZONE exists. DO NOT touch the code between '/* <MANUAL_ZONE> */' and '/* </MANUAL_ZONE> */'. You MUST include this block exactly as it is in your response.` : ""}
- Add NEW test cases for new methods or logic found in the 'Development Code Reference'.
- Maintain the same coding style and POM patterns already present in the existing file.
- Ensure all necessary imports are added if you use new page objects or services.
- If the existing file already has a 'test.describe' block for this feature, add new tests INSIDE that block.

${manualZoneContent ? `*PRESERVED MANUAL ZONE (DO NOT EDIT)*:
/* <MANUAL_ZONE> */
${manualZoneContent}
/* </MANUAL_ZONE> */` : ""}

*EXISTING TEST CONTENT FOR CONTEXT*:
\`\`\`typescript
${existingTestContent}
\`\`\`
` : "";

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

*Incremental Update & Hard Preservation*:
${mergeInstruction || "This is a new test script generation."}

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
