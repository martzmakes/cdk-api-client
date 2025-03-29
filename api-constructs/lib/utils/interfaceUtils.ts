import * as fs from "fs";
import * as path from "path";
import { Endpoint } from "../interfaces/Endpoint";

/**
 * Copies necessary interface files to the generated client directory
 */
export function copyInterfaceFiles(
  outputDir: string,
  endpointsDef: Record<string, Endpoint>
): void {
  // Create interfaces directory in output
  const interfacesDir = path.join(outputDir, "interfaces");
  if (!fs.existsSync(interfacesDir)) {
    fs.mkdirSync(interfacesDir, { recursive: true });
  }

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
