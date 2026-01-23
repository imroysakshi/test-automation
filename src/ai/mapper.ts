export function mapCodeToTest(filePath: string) {
  const parts = filePath.split("/");
  return {
    feature: parts[2],               // user
    testName: parts[3].replace(".ts", "") // createUser
  };
}

