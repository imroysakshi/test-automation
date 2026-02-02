import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { mapCodeToTest } from "../ai/mapper";
import { generateTestScript } from "../ai/generateTestScript";
import { generateTestCases } from "../ai/generateTestCases";

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
  if (fs.existsSync(testFile)) {
    console.log(`📝 Existing test file found: ${testFile}. Reading content for merging...`);
    existingTestContent = fs.readFileSync(testFile, "utf-8");
  }

  console.log(`🧠 Analyzing ${feature}/${testName}...`);

  // 1. Generate Test Cases
  const testCases = await generateTestCases(code, {
    featureName: feature,
    codeType: "Feature Implementation",
    additionalContext: existingTestContent ? "Updating existing test suite." : "Generating new test suite."
  });

  // 2. Generate Test Script (passing existing content for incremental update)
  const testScript = await generateTestScript(feature, testName, code, testCases, dirStructure, undefined, existingTestContent);

  fs.mkdirSync(testDir, { recursive: true });

  fs.writeFileSync(
    testFile,
    testScript
  );

  console.log(`✅ Test ${existingTestContent ? 'updated' : 'generated'}: ${testFile}`);
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
