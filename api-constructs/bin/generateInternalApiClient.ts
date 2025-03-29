#!/usr/bin/env node

/* eslint-disable @typescript-eslint/require-await */
import { importEndpoints } from "./import-endpoints";
import * as fs from "fs";
import * as path from "path";
// Add import for the mock generator
import { generateApiClientMocks } from "./generateApiClientMocks";
import { Endpoint } from "../lib/interfaces/Endpoint";

/**
 * Ensures a directory exists, creating it if necessary
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copies necessary interface files to the generated client directory
 */
function copyInterfaceFiles(
  outputDir: string,
  endpointsDef: Record<string, Endpoint>
): void {
  // Create interfaces directory in output
  const interfacesDir = path.join(outputDir, "interfaces");
  ensureDirectoryExists(interfacesDir);

  // Collect all interface files that need to be copied
  const interfaceFiles = new Set<string>();
  const endpointSourceDir = path.dirname(path.resolve(process.cwd(), process.argv[3] || ''));
  
  console.log(`Endpoint source directory: ${endpointSourceDir}`);
  
  // Base directories to search for interface files, prioritizing the endpoint source directory
  const baseSearchDirs = [
    endpointSourceDir,
    path.join(endpointSourceDir, 'interfaces'),
    path.join(endpointSourceDir, 'types'),
    path.join(endpointSourceDir, 'models'),
    path.join(process.cwd(), 'src', 'interfaces'),
    path.join(process.cwd(), 'src', 'types'),
    path.join(process.cwd(), 'lib', 'interfaces'),
  ];
  
  console.log('Base search directories for interfaces:');
  baseSearchDirs.forEach(dir => console.log(`- ${dir}`));

  // Scan endpoints for specific interface types
  for (const [endpointName, endpoint] of Object.entries(endpointsDef)) {
    const typedEndpoint = endpoint as Endpoint;
    console.log(`Scanning endpoint ${endpointName} for interfaces`);

    // Check if output references a named type
    if (typedEndpoint.output && typeof typedEndpoint.output === "string" && 
        typedEndpoint.output !== "any" && typedEndpoint.output !== "void") {
      const outputType = typedEndpoint.output as string;
      console.log(`Found output type: ${outputType}`);
      
      // Try to find the file containing this interface in various locations
      findAndAddInterfaceFile(outputType, baseSearchDirs, interfaceFiles);
    }

    // Also check input types
    if (typedEndpoint.input && typeof typedEndpoint.input === "string" && 
        typedEndpoint.input !== "never" && typedEndpoint.input !== "any") {
      const inputType = typedEndpoint.input as string;
      console.log(`Found input type: ${inputType}`);
      
      // Try to find the file containing this interface
      findAndAddInterfaceFile(inputType, baseSearchDirs, interfaceFiles);
    }
  }

  console.log(`Found ${interfaceFiles.size} interface files to copy:`);
  interfaceFiles.forEach((file) => {
    console.log(`- ${file}`);
  });

  // Copy all identified interface files
  for (const file of interfaceFiles) {
    const fileName = path.basename(file);
    const destination = path.join(interfacesDir, fileName);
    fs.copyFileSync(file, destination);
    console.log(`Copied interface file: ${fileName}`);
  }

  // Copy common.ts if it exists (contains base types)
  const commonFile = path.join(endpointSourceDir, "common.ts");
  if (fs.existsSync(commonFile)) {
    const destination = path.join(outputDir, "common.ts");
    fs.copyFileSync(commonFile, destination);
    console.log("Copied common.ts");
  }
}

/**
 * Helper function to find interface files across multiple directories
 */
function findAndAddInterfaceFile(
  typeName: string, 
  searchDirs: string[], 
  interfaceFiles: Set<string>
): void {
  // Try various naming patterns
  const fileVariants = [
    `${typeName}.ts`,
    `${typeName.toLowerCase()}.ts`,
    `${typeName}Interface.ts`,
    `I${typeName}.ts`,
    `${typeName}Type.ts`
  ];
  
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    // First try direct file match
    for (const fileVariant of fileVariants) {
      const filePath = path.join(dir, fileVariant);
      if (fs.existsSync(filePath)) {
        console.log(`Found interface file for ${typeName}: ${filePath}`);
        interfaceFiles.add(filePath);
        return; // Stop after finding the first match
      }
    }
    
    // Then try searching through the directory for files that might contain the interface
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.ts')) continue;
        
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for interface or type declaration with the exact name
        if (
          content.includes(`interface ${typeName}`) ||
          content.includes(`type ${typeName}`) ||
          content.includes(`export interface ${typeName}`) || 
          content.includes(`export type ${typeName}`)
        ) {
          console.log(`Found interface for ${typeName} in file: ${filePath}`);
          interfaceFiles.add(filePath);
          return; // Stop after finding the first match
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${dir}:`, error);
    }
  }
  
  console.warn(`Could not find interface file for type: ${typeName}`);
}

/**
 * Reads the root package.json file and returns its contents
 */
function getRootPackageJson(): Record<string, any> {
  // Start from the current directory and look upward until we find package.json
  let currentDir = path.resolve(__dirname);
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
function generateClientPackageJson(projectName: string): string {
  try {
    const rootPackageJson = getRootPackageJson();

    // Create a minimal package.json
    const clientPackageJson = {
      name: `@martzmakes/${rootPackageJson.name}`,
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

/**
 * Generates TypeScript code for the API client
 */
function generateClientCode(
  endpointsDef: Record<string, Endpoint>,
  projectName: string
): string {
  const titleCaseProjectName =
    projectName.charAt(0).toUpperCase() + projectName.slice(1);

  // Collect all unique input and output types for imports
  const typeImports = new Set<string>();

  // Analyze endpoints for input/output types
  for (const [_, endpoint] of Object.entries(endpointsDef)) {
    const typedEndpoint = endpoint as Endpoint;

    // Add output type if it's a string (named type)
    if (
      typedEndpoint.output &&
      typeof typedEndpoint.output === "string" &&
      typedEndpoint.output !== "any" &&
      typedEndpoint.output !== "void"
    ) {
      typeImports.add(typedEndpoint.output);
    }

    // Add input type if it's a string (named type)
    if (
      typedEndpoint.input &&
      typeof typedEndpoint.input === "string" &&
      typedEndpoint.input !== "any" &&
      typedEndpoint.input !== "never"
    ) {
      typeImports.add(typedEndpoint.input);
    }
  }

  // Start building client code with imports
  let clientCode = `
/**
 * Auto-generated API client
 * Do not edit this file directly
 */
import { iamRequest } from '@martzmakes/constructs/lambda/iamRequest';
`;

  // Add imports for the collected types
  if (typeImports.size > 0) {
    clientCode += `
// Import types for inputs/outputs
`;
    typeImports.forEach((type) => {
      clientCode += `import { ${type} } from './interfaces/${type}';\n`;
    });
  }

  // Generate interfaces for the client
  clientCode += `
/**
 * Base parameters interface that all endpoint methods extend
 */
interface BaseParams {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  [key: string]: any; // Add index signature to allow string indexing
}

`;

  // Generate types for each endpoint
  for (const [name, endpoint] of Object.entries(endpointsDef)) {
    const typedEndpoint = endpoint as Endpoint;

    // Extract path parameters
    const curlyParams = typedEndpoint.path.match(/{([a-zA-Z0-9_]+)}/g) || [];

    // Extract parameter names
    const pathParamNames = [
      ...curlyParams.map((param) => param.substring(1, param.length - 1)),
    ];

    // Determine the input type based on the endpoint definition
    let baseInterface = "BaseParams";

    // Create interface for this endpoint's parameters
    clientCode += `
/**
 * Parameters for ${name} endpoint
 */
export interface ${name.charAt(0).toUpperCase() + name.slice(1)}Params extends ${baseInterface} {
${pathParamNames.map((param) => `  ${param}: string | number;`).join("\n")}`;

    // Add body property for non-GET requests if there's an input type
    if (
      typedEndpoint.method !== "GET" &&
      typedEndpoint.input &&
      typedEndpoint.input !== "never"
    ) {
      const bodyType =
        typeof typedEndpoint.input === "string" ? typedEndpoint.input : "any";
      clientCode += `
  body: ${bodyType};`;
    }
    // Add query property for GET requests if there's an input type
    else if (
      typedEndpoint.method === "GET" &&
      typedEndpoint.input &&
      typedEndpoint.input !== "never"
    ) {
      const queryType =
        typeof typedEndpoint.input === "string" ? typedEndpoint.input : "any";
      clientCode += `
  query?: ${queryType};`;
    }

    clientCode += `
}

`;
  }

  // Create the API client class
  clientCode += `
/**
 * Generated API client
 */
export class ${titleCaseProjectName}ApiClient {
  private projectName: string;

  constructor(projectName: string = '${projectName}') {
    this.projectName = projectName;
  }

`;

  // Generate methods for each endpoint
  for (const [name, endpoint] of Object.entries(endpointsDef)) {
    const typedEndpoint = endpoint as Endpoint;

    // Determine the output type for the endpoint
    const outputType =
      typedEndpoint.output && typedEndpoint.output !== "any"
        ? typeof typedEndpoint.output === "string"
          ? typedEndpoint.output
          : "any"
        : "any";

    // Determine if endpoint has an input type
    const hasInputType =
      !!typedEndpoint.input && typedEndpoint.input !== "never";

    // Method implementation
    clientCode += `
  /**
   * ${name} API method
   * @path ${typedEndpoint.path}
   * @method ${typedEndpoint.method}
   */
  async ${name}(params: ${name.charAt(0).toUpperCase() + name.slice(1)}Params): Promise<${outputType}> {
    const { path, method } = ${JSON.stringify({ path: typedEndpoint.path, method: typedEndpoint.method })};
    
    // Replace path parameters with values from params
    let finalPath = path;
    
    // Handle curly bracket parameters
    const curlyPathParams = path.match(/{([a-zA-Z0-9_]+)}/g) || [];
    for (const param of curlyPathParams) {
      const paramName = param.substring(1, param.length - 1); // Remove curly braces
      if (params[paramName] === undefined) {
        throw new Error(\`Missing required path parameter: \${paramName}\`);
      }
      finalPath = finalPath.replace(param, encodeURIComponent(String(params[paramName])));
    }
    
    // Extract query parameters
    const query = params.query || (method === 'GET' ? {} : undefined);
    `;

    // Only include body code for non-GET requests that have an input type
    if (typedEndpoint.method !== "GET" && hasInputType) {
      clientCode += `
    // Extract body from params
    const body = params.body;
    `;
    }

    clientCode += `
    // Make the request using iamRequest
    const response = await iamRequest<${outputType}>({
      domain: process.env[this.projectName]!,
      path: finalPath,
      method,
      query,`;

    // Only include body in the request parameters if it's needed
    if (typedEndpoint.method !== "GET" && hasInputType) {
      clientCode += `
      body: JSON.stringify(body),`;
    }

    clientCode += `
      headers: params.headers || {
        'Content-Type': 'application/json',
      },
    });

    // Check if response is an empty object and throw error if it is
    if (response && typeof response === 'object' && 
        Object.keys(response).length === 0 && 
        Object.getPrototypeOf(response) === Object.prototype) {
      throw new Error('Received empty response from iamRequest');
    }

    return response as ${outputType};
  }
`;
  }

  // Close the class
  clientCode += `
}

/**
 * Creates and returns a configured API client
 */
export function create${titleCaseProjectName}ApiClient(projectName: string = '${projectName}'): ${titleCaseProjectName}ApiClient {
  return new ${titleCaseProjectName}ApiClient(projectName);
}
`;

  return clientCode;
}

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
