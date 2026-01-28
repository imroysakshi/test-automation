import { generateTestCases } from "./ai/generateTestCases";
import { generateTestScript } from "./ai/generateTestScript";

async function verify() {
    const mockCode = `
export class UserPage {
  async login(username: string, password: string) {
    await this.page.fill("#username", username);
    await this.page.fill("#password", password);
    await this.page.click("#login-button");
  }

  async logout() {
    await this.page.click("#logout-button");
  }
}
  `;

    console.log("🚀 Starting verification...");

    try {
        console.log("\n--- Step 1: Generating Test Cases ---");
        const testCases = await generateTestCases(mockCode);
        console.log(testCases);

        console.log("\n--- Step 2: Generating Test Script ---");
        const testScript = await generateTestScript("user", "loginFlow", mockCode, testCases);
        console.log(testScript);

        console.log("\n✅ Verification complete!");
    } catch (error: any) {
        console.error("❌ Verification failed:", error.message);
    }
}

verify();
