/* eslint-disable @typescript-eslint/require-await */
import { generateApiClientMocks } from "../lib/utils/mockGenerator/generateApiClientMocks";

/**
 * Main function that runs when the script is executed directly
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: ts-node generateApiClientMocks.ts <projectName> <generatedClientDir>"
    );
    process.exit(1);
  }

  const projectName = args[0];
  const generatedClientDir = args[1];

  try {
    generateApiClientMocks({
      apiClientPath: generatedClientDir,
      projectName,
      outputPath: generatedClientDir,
    });
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
