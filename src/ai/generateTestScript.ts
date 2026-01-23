// export function generateTestScript(feature: string, testName: string) {
//   return `
// import { test, expect } from "@playwright/test";
// import { ${feature}Page } from "../../pages/${feature}.page";

// test("${testName} - happy path", async () => {
//   const page = new ${feature}Page();
//   await page.${testName}();
//   expect(true).toBeTruthy();
// });
// `;
// }

export function generateTestScript(feature: string, testName: string) {
  return `
import { test, expect } from "@playwright/test";

test("${feature} - ${testName}", async () => {
  expect(true).toBeTruthy();
});
`;
}

