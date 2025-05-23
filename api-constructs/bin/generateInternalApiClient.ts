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
import { generateClientReadme } from "../lib/utils/generators/readmeGenerator";
import { generateApiClientMocks } from "../lib/utils/mockGenerator/generateApiClientMocks";
import { generateApiContractTests } from "../lib/utils/mockGenerator/generateApiContractTests";
import { generateVtlTemplates } from "../lib/utils/generators/vtlGenerator";

/**
 * Creates an API client based on the endpoint definitions and generates static files
 * @param projectName The projectName for API requests
 * @param endpointsPath Path to the file containing endpoint definitions
 * @param outputDir Directory where the generated client should be saved
 * @param generateMocks Whether to generate mock clients for testing
 * @param generateTests Whether to generate contract tests between handlers and mocks
 * @param generateVtl Whether to generate VTL templates for DynamoDB endpoints
 */
export async function generateApiClient({
  projectName,
  endpointsPath,
  outputDir = path.resolve(process.cwd(), "generatedClient"),
  generateMocks = true,
  generateTests = true,
  generateVtl = true,
}: {
  projectName: string;
  endpointsPath: string;
  outputDir?: string;
  generateMocks?: boolean;
  generateTests?: boolean;
  generateVtl?: boolean;
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

  // Extract handler entry paths to enable type checking in tests
  const endpointEntries: Record<string, string> = {};
  for (const [name, endpoint] of Object.entries(endpointsDef)) {
    // If endpoint has an entry property (typical for Lambda handlers)
    if ((endpoint as any).entry) {
      endpointEntries[name] = (endpoint as any).entry;
    }
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
  const packageName = JSON.parse(packageJsonContent).name;

  // Generate README.md for the client - now passing the full endpoint definitions
  const readmeContent = generateClientReadme({
    projectName,
    packageName,
    endpoints: endpointsDef,
    hasMocks: generateMocks,
  });
  fs.writeFileSync(path.join(outputDir, "README.md"), readmeContent);
  console.log(
    `Generated README.md for client library with ${
      Object.keys(endpointsDef).length
    } documented endpoints`
  );

  // Generate VTL templates for endpoints that use dynamoGenerator
  if (generateVtl) {
    try {
      generateVtlTemplates(endpointsDef, outputDir);
      console.log(`Generated VTL templates for DynamoDB endpoints in ${outputDir}/vtl`);
    } catch (error) {
      console.error("Error generating VTL templates:", error);
    }
  }

  const gitIgnoreContent = `*.ts
  *.js`;
  fs.writeFileSync(path.join(outputDir, ".gitignore"), gitIgnoreContent);
  console.log(`Generated .gitignore for client library`);

  console.log(`API client generated successfully in ${outputDir}`);

  // Write endpoint entries to a file for tests to use
  const endpointEntriesJson = JSON.stringify(endpointEntries, null, 2);
  fs.writeFileSync(
    path.join(outputDir, "endpointEntries.json"),
    endpointEntriesJson
  );
  console.log(`Generated endpoint entries mapping for tests`);

  // Generate a Jest setup file that will load the endpoint entries
  const jestSetupContent = `
// This file is automatically generated - do not edit
// It loads endpoint entries to enable verification tests
import * as fs from 'fs';
import * as path from 'path';

// Load endpoint entries from the generated file
try {
  const entriesPath = path.resolve(__dirname, './endpointEntries.json');
  if (fs.existsSync(entriesPath)) {
    const entriesContent = fs.readFileSync(entriesPath, 'utf8');
    process.env.ENDPOINT_ENTRIES = entriesContent;
    console.log('Loaded endpoint entries for handler tests');
  } else {
    console.warn('Endpoint entries file not found - handler type tests will be limited');
  }
} catch (error) {
  console.error('Error loading endpoint entries:', error);
}
`;
  fs.writeFileSync(path.join(outputDir, "jest.setup.ts"), jestSetupContent);
  console.log(`Generated Jest setup file for handler type tests`);

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

  // Generate contract tests if requested
  if (generateTests && generateMocks) {
    try {
      generateApiContractTests({
        endpointsDef,
        projectName,
        outputDir,
      });
    } catch (error) {
      console.error("Error generating API contract tests:", error);
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
      "Usage: npx @martzmakes/api-constructs generateInternalApiClient <projectName> <endpointsPath> [outputDir] [--no-mocks] [--no-tests] [--no-vtl]"
    );
    process.exit(1);
  }

  const projectName = args[offset];
  const endpointsPath = args[offset + 1];
  const outputDir =
    args[offset + 2] || path.resolve(process.cwd(), "generatedClient");
  const generateMocks = !args.includes("--no-mocks");
  const generateTests = !args.includes("--no-tests");
  const generateVtl = !args.includes("--no-vtl");

  try {
    await generateApiClient({
      projectName,
      endpointsPath,
      outputDir,
      generateMocks,
      generateTests,
      generateVtl,
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
