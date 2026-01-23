// import fs from "fs";
// import path from "path";
// import { mapCodeToTest } from "../ai/mapper";
// import { generateTestScript } from "../ai/generateTestScript";

// export function createTestFile(filePath: string) {
//   const { feature, testName } = mapCodeToTest(filePath);

//   const testDir = path.join(
//     "tests/specs",
//     feature
//   );

//   fs.mkdirSync(testDir, { recursive: true });

//   const testFilePath = path.join(
//     testDir,
//     `${testName}.spec.ts`
//   );

//   fs.writeFileSync(
//     testFilePath,
//     generateTestScript(feature, testName)
//   );
// }


import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { mapCodeToTest } from "../ai/mapper";
import { generateTestScript } from "../ai/generateTestScript";

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

function createTestFile(filePath: string) {
  const { feature, testName } = mapCodeToTest(filePath);

  const testDir = path.join(
    "src/tests/specs",
    feature
  );

  fs.mkdirSync(testDir, { recursive: true });

  const testFile = path.join(
    testDir,
    `${testName}.spec.ts`
  );

  fs.writeFileSync(
    testFile,
    generateTestScript(feature, testName)
  );

  console.log(`✅ Test generated: ${testFile}`);
}

function main() {
  console.log(`📂 Codebase path: ${CODEBASE_PATH}`);
  console.log(`📂 Working directory: ${process.cwd()}`);
  
  const files = getChangedFiles();

  if (files.length === 0) {
    console.log("⚠️ No new feature files detected");
    return;
  }

  console.log(`📝 Found ${files.length} changed file(s)`);
  files.forEach(createTestFile);
}

main();
