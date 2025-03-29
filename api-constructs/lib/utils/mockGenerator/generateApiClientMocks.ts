import * as fs from "fs";
import * as path from "path";
import { parseApiClientFile } from "./parseApiClientFile";
import { generateMockClientCode } from "./generateMockClientCode";

/**
 * Generates a mock API client based on the generated API client
 */
export function generateApiClientMocks({
  apiClientPath,
  projectName,
  outputPath,
}: {
  apiClientPath: string;
  projectName: string;
  outputPath: string;
}): void {
  console.log(`Generating API client mocks from ${apiClientPath}...`);

  // Parse the API client file
  const { endpoints, imports } = parseApiClientFile({
    titleCaseProjectName:
      projectName.charAt(0).toUpperCase() + projectName.slice(1),
    filePath: path.join(apiClientPath, "apiClient.ts"),
  });

  if (endpoints.length === 0) {
    console.warn("No endpoints found in the API client.");
    return;
  }

  console.log(`Found ${endpoints.length} endpoints to mock.`);

  // Generate mock client code
  const mockCode = generateMockClientCode({
    endpoints,
    imports,
    titleCaseProjectName:
      projectName.charAt(0).toUpperCase() + projectName.slice(1),
  });

  // Write the generated mock to a file
  fs.writeFileSync(path.join(outputPath, "apiClientMock.ts"), mockCode);

  // Update index.ts to export the mock
  const indexPath = path.join(outputPath, "index.ts");
  let indexContent = fs.readFileSync(indexPath, "utf8");

  if (!indexContent.includes("apiClientMock")) {
    indexContent += `export * from './apiClientMock';\n`;
    fs.writeFileSync(indexPath, indexContent);
  }

  console.log(`API client mocks generated successfully in ${outputPath}`);
}
