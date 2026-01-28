import * as path from "path";

export function mapCodeToTest(filePath: string) {
  // Logic: Discovery & Mapping
  // 1. Import Analysis (Primary) - simplified for now, as it requires scanning all specs
  // 2. Naming Patterns (Fallback)

  const basename = path.basename(filePath, ".ts");
  const parts = filePath.split("/");

  // Default to the feature directory name and the file name
  // e.g., src/features/user/createUser.ts -> feature: user, testName: createUser
  let feature = "default";
  if (parts.length >= 3) {
    feature = parts[2];
  }

  return {
    feature: feature,
    testName: basename
  };
}
