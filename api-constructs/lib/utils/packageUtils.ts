import * as fs from "fs";
import * as path from "path";

/**
 * Reads the root package.json file and returns its contents
 */
function getRootPackageJson(): Record<string, any> {
  // Start from the current directory and look upward until we find package.json
  let currentDir = process.cwd();
  currentDir.includes("node_modules")
    ? (currentDir = currentDir.split("node_modules")[0])
    : currentDir;
  console.log(`Root package.json directory: ${currentDir}`);
  let rootPackagePath;

  while (currentDir !== path.parse(currentDir).root) {
    rootPackagePath = path.join(currentDir, "package.json");
    if (fs.existsSync(rootPackagePath)) {
      break;
    }
    // Move up to parent directory
    currentDir = path.dirname(currentDir);
  }

  if (!rootPackagePath || !fs.existsSync(rootPackagePath)) {
    throw new Error("Could not find root package.json");
  }

  const packageContent = fs.readFileSync(rootPackagePath, "utf-8");
  return JSON.parse(packageContent);
}

/**
 * Generates a minimal package.json for the client library
 */
export function generateClientPackageJson(projectName: string): string {
  try {
    const rootPackageJson = getRootPackageJson();

    const name = rootPackageJson.name.includes("/")
      ? rootPackageJson.name
      : `@martzmakes/${rootPackageJson.name}`;

    // Create a minimal package.json
    const clientPackageJson = {
      name,
      version: rootPackageJson.version || "1.0.0",
      description: `API client for ${projectName}`,
      main: "index.js",
      types: "index.d.ts",
      dependencies: {
        // Include only essential dependencies
        "@martzmakes/constructs":
          rootPackageJson.dependencies?.["@martzmakes/constructs"] || "latest",
      },
      peerDependencies: {
        // Include TypeScript as a peer dependency if it exists in the root package
        ...(rootPackageJson.dependencies?.typescript
          ? { typescript: rootPackageJson.dependencies.typescript }
          : {}),
      },
    };

    return JSON.stringify(clientPackageJson, null, 2);
  } catch (error) {
    console.warn("Failed to generate package.json for client:", error);
    // Fallback to a basic package.json if something goes wrong
    return JSON.stringify(
      {
        name: `@martzmakes/${projectName}-client`,
        version: "1.0.0",
        description: `API client for ${projectName}`,
        main: "index.js",
        types: "index.d.ts",
        dependencies: {
          "@martzmakes/constructs": "latest",
        },
      },
      null,
      2
    );
  }
}
