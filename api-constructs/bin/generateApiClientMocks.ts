/* eslint-disable @typescript-eslint/require-await */
import { generateApiClientMocks } from "../lib/utils/mockGenerator/generateApiClientMocks";
import { generateApiContractTests } from "../lib/utils/mockGenerator/generateApiContractTests";
import { importEndpoints } from "./import-endpoints";
import * as path from "path";

/**
 * Main function that runs when the script is executed directly
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: ts-node generateApiClientMocks.ts <projectName> <generatedClientDir> [--no-tests]"
    );
    process.exit(1);
  }

  const projectName = args[0];
  const generatedClientDir = args[1];
  const generateTests = !args.includes("--no-tests");

  try {
    // Generate the mock client
    generateApiClientMocks({
      apiClientPath: generatedClientDir,
      projectName,
      outputPath: generatedClientDir,
    });

    // Generate contract tests if not disabled
    if (generateTests) {
      // We need to determine the endpoints path to load endpoint definitions
      // Typically, this would be derived from the project structure
      // For simplicity, we'll look for apiClient.ts in the same directory
      const apiClientPath = path.join(generatedClientDir, "apiClient.ts");
      
      // Import the endpoints from the API client
      try {
        const endpointsDef = importEndpoints(apiClientPath);
        
        // Generate the contract tests
        generateApiContractTests({
          endpointsDef,
          projectName,
          outputDir: generatedClientDir,
        });
      } catch (error) {
        console.error("Error generating API contract tests:", error);
        console.error("The mock client was generated, but tests could not be created.");
      }
    }
  } catch (error) {
    console.error("Error generating API client mocks:", error);
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
