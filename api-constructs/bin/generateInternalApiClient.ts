#!/usr/bin/env node

/* eslint-disable @typescript-eslint/require-await */
import { importEndpoints } from "./import-endpoints";
import * as fs from "fs";
import * as path from "path";
import { Endpoint } from "../lib/interfaces/Endpoint";
import { ensureDirectoryExists } from "../lib/utils/fileUtils";
import { copyInterfaceFiles } from "../lib/utils/interfaceUtils";
import { generateClientPackageJson } from "../lib/utils/packageUtils";
import { generateClientCode } from "../lib/utils/generators/clientCodeGenerator";
import { generateApiClientMocks } from "../lib/utils/mockGenerator/generateApiClientMocks";

/**
 * Creates an API client based on the endpoint definitions and generates static files
 * @param projectName The projectName for API requests
 * @param endpointsPath Path to the file containing endpoint definitions
 * @param outputDir Directory where the generated client should be saved
 * @param generateMocks Whether to generate mock clients for testing
 */
export async function generateApiClient({
  projectName,
  endpointsPath,
  outputDir = path.resolve(process.cwd(), "generatedClient"),
  generateMocks = true,
}: {
  projectName: string;
  endpointsPath: string;
  outputDir?: string;
  generateMocks?: boolean;
}): Promise<void> {
  const endpointsDef = importEndpoints(endpointsPath) as Record<
    string,
    Endpoint
  >;
  console.log(`Endpoints loaded from ${endpointsPath}:`, endpointsDef);

  if (!endpointsDef) {
    throw new Error(`Failed to load endpoints from ${endpointsPath}`);
  }

  // Debug output to check endpoint inputs
  for (const [name, endpoint] of Object.entries(endpointsDef)) {
    console.log(`Endpoint ${name}:`, {
      method: endpoint.method,
      input: endpoint.input,
      output: endpoint.output,
    });
  }

  // clean directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }

  // Ensure the output directory exists
  ensureDirectoryExists(outputDir);

  // Generate the client code
  const clientCode = generateClientCode(endpointsDef, projectName);

  // Write the generated client to a file without transpiling
  // This preserves all TypeScript types and interfaces
  fs.writeFileSync(path.join(outputDir, "apiClient.ts"), clientCode);

  // Copy necessary interface files
  copyInterfaceFiles(outputDir, endpointsDef);

  // Generate index.ts to export everything
  const indexContent = `
export * from './apiClient';
`;
  fs.writeFileSync(path.join(outputDir, "index.ts"), indexContent);

  // Generate package.json for the client
  const packageJsonContent = generateClientPackageJson(projectName);
  fs.writeFileSync(path.join(outputDir, "package.json"), packageJsonContent);
  console.log(`Generated package.json for client library`);

  const gitIgnoreContent = `*.ts
  *.js`;
  fs.writeFileSync(path.join(outputDir, ".gitignore"), gitIgnoreContent);
  console.log(`Generated .gitignore for client library`);

  console.log(`API client generated successfully in ${outputDir}`);

  // Generate mock clients if requested
  if (generateMocks) {
    try {
      generateApiClientMocks({
        apiClientPath: outputDir,
        projectName,
        outputPath: outputDir,
      });
    } catch (error) {
      console.error("Error generating API client mocks:", error);
    }
  }
}

/**
 * Main function that runs when the script is executed directly
 */
async function main() {
  // Use yargs or process.argv for parsing command line arguments
  const args = process.argv.slice(2);
  const offset = args[0] === "generateInternalApiClient" ? 1 : 0; // Adjust for command name

  // Simple argument parsing (projectName and endpointsPath are required)
  if (args.length < 2 + offset) {
    console.error(
      "Usage: npx @martzmakes/api-constructs generateInternalApiClient <projectName> <endpointsPath> [outputDir] [--no-mocks]"
    );
    process.exit(1);
  }

  const projectName = args[offset];
  const endpointsPath = args[offset + 1];
  const outputDir = args[offset + 2] || path.resolve(process.cwd(), "generatedClient");
  const generateMocks = !args.includes("--no-mocks");

  try {
    await generateApiClient({
      projectName,
      endpointsPath,
      outputDir,
      generateMocks,
    });
  } catch (error) {
    console.error("Error generating API client:", error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
