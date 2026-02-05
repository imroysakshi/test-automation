/**
 * Utility to parse test files and extract specific test blocks for incremental updates
 */

export interface TestBlock {
  /** The full content of the test block including test.describe(...) */
  content: string;
  /** Start index in the original file */
  startIndex: number;
  /** End index in the original file */
  endIndex: number;
  /** The feature name this block tests (extracted from test.describe or inferred) */
  featureName?: string;
  /** The test name this block tests (extracted from test.describe or inferred) */
  testName?: string;
}

export interface ParsedTestFile {
  /** Content before the first test.describe block (imports, constants, etc.) */
  header: string;
  /** All test blocks found in the file */
  testBlocks: TestBlock[];
  /** Content after the last test.describe block (if any) */
  footer: string;
}

/**
 * Parses a test file and extracts test.describe blocks
 * Handles nested test.describe blocks by treating the outermost one as the main block
 */
export function parseTestFile(content: string): ParsedTestFile {
  const testBlocks: TestBlock[] = [];
  
  // Find all top-level test.describe blocks by tracking brace depth
  let i = 0;
  let headerEnd = 0;
  let footerStart = content.length;
  
  while (i < content.length) {
    // Look for test.describe(
    const describeMatch = content.indexOf('test.describe(', i);
    if (describeMatch === -1) break;
    
    // Check if this is at the top level (not inside another test.describe)
    // We'll determine this by checking if we're inside braces
    let beforeDescribe = content.substring(0, describeMatch);
    let openBraces = (beforeDescribe.match(/\{/g) || []).length;
    let closeBraces = (beforeDescribe.match(/\}/g) || []).length;
    let braceDepth = openBraces - closeBraces;
    
    // If braceDepth is 0, this is a top-level test.describe
    if (braceDepth === 0) {
      // Find the matching closing brace for this test.describe block
      let blockStart = describeMatch;
      let blockEnd = findMatchingClosingBrace(content, describeMatch);
      
      if (blockEnd > blockStart) {
        const blockContent = content.substring(blockStart, blockEnd);
        
        // Extract feature/test name from the test.describe call
        const titleMatch = blockContent.match(/test\.describe\s*\(\s*['"`]([^'"`]+)['"`]/);
        const blockTitle = titleMatch ? titleMatch[1] : undefined;
        
        testBlocks.push({
          content: blockContent,
          startIndex: blockStart,
          endIndex: blockEnd,
          featureName: extractFeatureName(blockTitle),
          testName: extractTestName(blockTitle)
        });
        
        if (testBlocks.length === 1) {
          headerEnd = blockStart;
        }
        footerStart = blockEnd;
        
        i = blockEnd;
      } else {
        i = describeMatch + 1;
      }
    } else {
      i = describeMatch + 1;
    }
  }
  
  // Calculate header and footer correctly
  const header = testBlocks.length > 0 && headerEnd > 0 ? content.substring(0, headerEnd) : '';
  // Footer is everything after the last test block
  const footer = testBlocks.length > 0 && footerStart < content.length ? content.substring(footerStart) : '';
  
  return {
    header: header.trim(),
    testBlocks,
    footer: footer.trim()
  };
}

/**
 * Finds the matching closing brace for a test.describe block starting at startIndex
 */
function findMatchingClosingBrace(content: string, startIndex: number): number {
  // Find the opening brace after test.describe(...)
  let i = startIndex;
  let parenDepth = 0;
  let foundOpeningParen = false;
  let foundOpeningBrace = false;
  let braceDepth = 0;
  
  // Skip to the opening brace
  while (i < content.length) {
    if (content[i] === '(') {
      parenDepth++;
      foundOpeningParen = true;
    } else if (content[i] === ')') {
      parenDepth--;
      if (parenDepth === 0 && foundOpeningParen) {
        // We've closed the test.describe(...) call, now look for the opening brace
        i++;
        while (i < content.length && /\s/.test(content[i])) {
          i++;
        }
        if (content[i] === '{') {
          foundOpeningBrace = true;
          braceDepth = 1;
          i++;
          break;
        }
      }
    }
    i++;
  }
  
  if (!foundOpeningBrace) {
    return -1;
  }
  
  // Now find the matching closing brace
  while (i < content.length) {
    if (content[i] === '{') {
      braceDepth++;
    } else if (content[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        return i + 1; // Include the closing brace
      }
    }
    i++;
  }
  
  return -1;
}

/**
 * Extracts feature name from a test.describe title
 * e.g., "Order Management Service" -> "order"
 * e.g., "updateOrder method" -> "order" (inferred from context)
 */
function extractFeatureName(title?: string): string | undefined {
  if (!title) return undefined;
  
  const lowerTitle = title.toLowerCase();
  
  // Common patterns
  if (lowerTitle.includes('order')) return 'order';
  if (lowerTitle.includes('user')) return 'user';
  if (lowerTitle.includes('auth') || lowerTitle.includes('login') || lowerTitle.includes('logout')) return 'auth';
  if (lowerTitle.includes('payment')) return 'payment';
  
  // Try to extract from patterns like "FeatureName Feature Tests"
  const match = title.match(/^(\w+)\s+/);
  if (match) {
    return match[1].toLowerCase();
  }
  
  return undefined;
}

/**
 * Extracts test name from a test.describe title
 * e.g., "updateOrder method" -> "updateOrder"
 */
function extractTestName(title?: string): string | undefined {
  if (!title) return undefined;
  
  // Look for method names or specific test names
  const methodMatch = title.match(/(\w+)\s+method/i);
  if (methodMatch) {
    return methodMatch[1].toLowerCase();
  }
  
  // Look for feature names that might be test names
  const featureMatch = title.match(/^(\w+)/);
  if (featureMatch) {
    return featureMatch[1].toLowerCase();
  }
  
  return undefined;
}

/**
 * Finds the test block that matches the given feature and testName
 * Returns the block if found, or undefined if no match
 */
export function findMatchingTestBlock(
  parsed: ParsedTestFile,
  feature: string,
  testName: string
): TestBlock | undefined {
  const featureLower = feature.toLowerCase();
  const testNameLower = testName.toLowerCase();
  
  // First, try exact match on both feature and testName
  for (const block of parsed.testBlocks) {
    if (block.featureName === featureLower && block.testName === testNameLower) {
      return block;
    }
  }
  
  // Try matching by testName in block title (more specific)
  for (const block of parsed.testBlocks) {
    if (block.testName === testNameLower) {
      return block;
    }
  }
  
  // Try matching by feature only
  for (const block of parsed.testBlocks) {
    if (block.featureName === featureLower) {
      return block;
    }
  }
  
  // Try matching by testName in the block content (less reliable but useful)
  for (const block of parsed.testBlocks) {
    const contentLower = block.content.toLowerCase();
    // Check if testName appears as a method name or function name
    if (contentLower.includes(`${testNameLower}(`) || 
        contentLower.includes(`${testNameLower}.`) ||
        contentLower.includes(`'${testNameLower}'`) ||
        contentLower.includes(`"${testNameLower}"`)) {
      return block;
    }
  }
  
  // If still no match and we have multiple blocks, return undefined (don't update anything)
  // If only one block exists, return it as fallback
  return parsed.testBlocks.length === 1 ? parsed.testBlocks[0] : undefined;
}

/**
 * Replaces a specific test block in the file content
 */
export function replaceTestBlock(
  originalContent: string,
  targetBlock: TestBlock,
  newBlockContent: string
): string {
  const before = originalContent.substring(0, targetBlock.startIndex);
  const after = originalContent.substring(targetBlock.endIndex);
  
  // Ensure proper spacing
  const beforeTrimmed = before.trimEnd();
  const afterTrimmed = after.trimStart();
  
  return `${beforeTrimmed}\n\n${newBlockContent}\n\n${afterTrimmed}`;
}

