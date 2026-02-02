import { generateTestScript } from "../ai/generateTestScript";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config();

async function test() {
    const feature = "user";
    const testName = "profile";

    console.log("🚀 Scenario 1: First-time generation");
    const initialCode = `
export class UserProfile {
  async getName() { return "John Doe"; }
}
    `;

    const initialScript = await generateTestScript(feature, testName, initialCode, "Basic coverage");
    console.log("--- Initial Script ---");
    console.log(initialScript);

    console.log("\n🚀 Scenario 2: Incremental update (preserving manual changes)");

    // Simulate manual intervention by the user
    const existingScriptWithManualChanges = initialScript + "\n// MANUAL: This is a custom test case added by the QA engineer\n" +
        `test("manual test", async ({ page }) => {
      console.log("Checking something custom...");
    });`;

    const updatedCode = `
export class UserProfile {
  async getName() { return "John Doe"; }
  async getEmail() { return "john@example.com"; } // NEW METHOD
}
    `;

    const updatedScript = await generateTestScript(
        feature,
        testName,
        updatedCode,
        "Added getEmail coverage",
        undefined,
        undefined,
        existingScriptWithManualChanges
    );

    console.log("--- Updated Script (Merged) ---");
    console.log(updatedScript);

    if (updatedScript.includes("MANUAL: This is a custom test case")) {
        console.log("\n✅ SUCCESS: Manual changes were preserved!");
    } else {
        console.log("\n❌ FAILURE: Manual changes were lost!");
    }

    if (updatedScript.includes("getEmail")) {
        console.log("✅ SUCCESS: New method test was added!");
    } else {
        console.log("❌ FAILURE: New method test was missing!");
    }
}

test().catch(console.error);
