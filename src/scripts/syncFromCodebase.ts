import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { mapCodeToTest } from "../ai/mapper";
import { generateTestScript, generateTestBlock } from "../ai/generateTestScript";
import { generateTestCases } from "../ai/generateTestCases";
import { parseTestFile, findMatchingTestBlock, replaceTestBlock } from "../ai/testFileParser";

// Get the correct path based on execution environment
let CODEBASE_PATH = process.env.CODEBASE_PATH || "./app-codebase";

// Convert to absolute path if relative
if (!path.isAbsolute(CODEBASE_PATH)) {
  CODEBASE_PATH = path.resolve(process.cwd(), CODEBASE_PATH);
}

function getChangedFiles(): string[] {
  try {
    console.log(`📂 Running git diff in: ${CODEBASE_PATH}`);

    const output = execSync(
      "git diff --name-only HEAD~1 HEAD",
      { cwd: CODEBASE_PATH, encoding: "utf-8" }
    );

    console.log(`📋 Raw git diff output:\n${output}`);

    const filtered = output
      .split("\n")
      .filter(f => {
        const trimmed = f.trim();
        const isFeatureFile = trimmed.startsWith("src/features/") && trimmed.endsWith(".ts");
        console.log(`  - ${trimmed} -> ${isFeatureFile ? "✓ MATCH" : "✗ skip"}`);
        return isFeatureFile;
      });

    console.log(`\n✅ Filtered result: ${filtered.length} matching files`);
    return filtered;
  } catch (error: any) {
    console.log("⚠️ Git diff failed or no previous commit - attempting fallback");
    console.log(`Error: ${error.message}`);
    return [];
  }
}

function getDirectoryStructure(dir: string, prefix = ""): string {
  let result = "";
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === "node_modules" || item === ".git") continue;
      const fullPath = path.join(dir, item);
      const isDir = fs.statSync(fullPath).isDirectory();
      result += `${prefix}${item}${isDir ? "/" : ""}\n`;
      if (isDir) {
        result += getDirectoryStructure(fullPath, prefix + "  ");
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  return result;
}

const MANUAL_START = "/* <MANUAL_ZONE> */";
const MANUAL_END = "/* </MANUAL_ZONE> */";

function extractManualZone(content: string): string | null {
  const startIndex = content.indexOf(MANUAL_START);
  const endIndex = content.indexOf(MANUAL_END);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return content.substring(startIndex + MANUAL_START.length, endIndex).trim();
  }
  return null;
}

async function createTestFile(filePath: string, dirStructure: string) {
  const { feature, testName } = mapCodeToTest(filePath);
  const fullPath = path.join(CODEBASE_PATH, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${fullPath}`);
    return;
  }

  const code = fs.readFileSync(fullPath, "utf-8");

  const testDir = path.join(
    "src/tests/specs",
    feature
  );

  const testFile = path.join(
    testDir,
    `${testName}.spec.ts`
  );

  let existingTestContent: string | undefined = undefined;
  let manualZoneContent: string | null = null;
  let useIncrementalUpdate = false;
  let matchingBlock: any = null;
  let parsedFile: any = null;

  if (fs.existsSync(testFile)) {
    console.log(`📝 Existing test file found: ${testFile}.`);
    existingTestContent = fs.readFileSync(testFile, "utf-8");
    manualZoneContent = extractManualZone(existingTestContent);

    // Parse the existing test file to check for multiple test blocks
    parsedFile = parseTestFile(existingTestContent);

    if (parsedFile.testBlocks.length > 0) {
      // Try to find a matching test block for this feature/testName
      matchingBlock = findMatchingTestBlock(parsedFile, feature, testName);

      if (matchingBlock) {
        console.log(`🔄 Found matching test block: "${matchingBlock.featureName}/${matchingBlock.testName}". Using incremental update.`);
        useIncrementalUpdate = true;
      } else if (parsedFile.testBlocks.length > 1) {
        console.log(`ℹ️ File has ${parsedFile.testBlocks.length} test blocks, but no exact match found. Will add new block.`);
      } else {
        console.log(`ℹ️ File has 1 test block. Will update it incrementally.`);
        matchingBlock = parsedFile.testBlocks[0];
        useIncrementalUpdate = true;
      }
    }

    if (manualZoneContent) {
      console.log(`🔒 Hard Preservation: Extracted manual zone content (${manualZoneContent.length} chars).`);
    }
  }

  console.log(`🧠 Analyzing ${feature}/${testName}...`);

  // 1. Generate Test Cases
  const testCases = await generateTestCases(code, {
    featureName: feature,
    codeType: "Feature Implementation",
    additionalContext: existingTestContent ? "Updating existing test suite." : "Generating new test suite."
  });

  let testScript: string;

  if (useIncrementalUpdate && matchingBlock && parsedFile) {
    // Incremental update: Generate only the specific test block
    console.log(`🔄 Generating incremental update for specific test block...`);

    const updatedBlock = await generateTestBlock(
      feature,
      testName,
      code,
      testCases,
      dirStructure,
      undefined,
      matchingBlock.content,
      parsedFile.header
    );

    // Replace only the matching block in the file
    testScript = replaceTestBlock(existingTestContent!, matchingBlock, updatedBlock);

    // Preserve manual zone if it exists
    if (manualZoneContent && !testScript.includes(MANUAL_START)) {
      console.warn(`🚨 Manual zone was removed during block update! Re-injecting...`);
      const lines = testScript.split("\n");
      let injectIndex = lines.findIndex(l => !l.startsWith("//") && !l.startsWith("import") && l.trim() !== "");
      if (injectIndex === -1) injectIndex = lines.length;

      const manualBlock = `\n${MANUAL_START}\n${manualZoneContent}\n${MANUAL_END}\n`;
      lines.splice(injectIndex, 0, manualBlock);
      testScript = lines.join("\n");
    }
  } else {
    // Full file generation/update
    console.log(`📄 Generating full test file...`);
    testScript = await generateTestScript(
      feature,
      testName,
      code,
      testCases,
      dirStructure,
      undefined,
      existingTestContent,
      manualZoneContent || undefined
    );

    // Safety Check: If AI stripped the manual zone, re-inject it at the top
    if (manualZoneContent && !testScript.includes(MANUAL_START)) {
      console.warn(`🚨 AI stripped the manual zone! Re-injecting manually...`);
      const lines = testScript.split("\n");
      let injectIndex = lines.findIndex(l => !l.startsWith("//") && !l.startsWith("import") && l.trim() !== "");
      if (injectIndex === -1) injectIndex = lines.length;

      const manualBlock = `\n${MANUAL_START}\n${manualZoneContent}\n${MANUAL_END}\n`;
      lines.splice(injectIndex, 0, manualBlock);
      testScript = lines.join("\n");
    }
  }

  fs.mkdirSync(testDir, { recursive: true });

  fs.writeFileSync(
    testFile,
    testScript
  );

  console.log(`✅ Test ${existingTestContent ? (useIncrementalUpdate ? 'incrementally updated' : 'updated') : 'generated'}: ${testFile}`);
}

async function main() {
  console.log(`📂 Codebase path: ${CODEBASE_PATH}`);
  console.log(`📂 Working directory: ${process.cwd()}`);

  const files = getChangedFiles();

  if (files.length === 0) {
    console.log("⚠️ No new feature files detected");
    return;
  }

  console.log(`📝 Found ${files.length} changed file(s)`);

  const dirStructure = getDirectoryStructure(CODEBASE_PATH);

  for (const file of files) {
    await createTestFile(file, dirStructure);
  }
}

main().catch(err => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
