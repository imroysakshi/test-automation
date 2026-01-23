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

const CODEBASE_PATH = "../app-codebase";

function getChangedFiles(): string[] {
  const output = execSync(
    "git diff --name-only HEAD~1 HEAD",
    { cwd: CODEBASE_PATH }
  ).toString();

  return output
    .split("\n")
    .filter(f => f.startsWith("src/features/") && f.endsWith(".ts"));
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
  const files = getChangedFiles();

  if (files.length === 0) {
    console.log("⚠️ No new feature files detected");
    return;
  }

  files.forEach(createTestFile);
}

main();
