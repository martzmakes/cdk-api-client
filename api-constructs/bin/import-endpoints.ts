import * as ts from 'typescript';
import * as fs from 'fs';

/**
 * Extracts endpoint definitions from a TypeScript file
 * @param filePath Path to the TypeScript file containing endpoint definitions
 * @returns A record of endpoint definitions
 */
export function importEndpoints(filePath: string): Record<string, any> {
  // Create a TypeScript program to analyze the file
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS
  });
  
  const sourceFile = program.getSourceFile(filePath);
  
  if (!sourceFile) {
    throw new Error(`Could not find source file: ${filePath}`);
  }
  
  // Find the endpoints export declaration
  let endpointsObj: Record<string, any> = {};
  
  // Visit all nodes in the source file
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && 
        node.name && 
        ts.isIdentifier(node.name) && 
        node.name.text === 'endpoints') {
      
      // Found the endpoints variable declaration
      if (node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        for (const prop of node.initializer.properties) {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const endpointName = prop.name.text;
            const endpointObj: any = {};
            
            if (ts.isObjectLiteralExpression(prop.initializer)) {
              for (const endpointProp of prop.initializer.properties) {
                if (ts.isPropertyAssignment(endpointProp) && 
                    ts.isIdentifier(endpointProp.name)) {
                    
                  const propName = endpointProp.name.text;
                  
                  if (propName === 'path' || propName === 'method') {
                    if (ts.isStringLiteral(endpointProp.initializer)) {
                      endpointObj[propName] = endpointProp.initializer.text;
                    }
                  }
                }
              }
            }
            
            // Manually extract input/output types from the source code
            if (sourceFile) {
              endpointObj.input = extractInputType(sourceFile.text, endpointName);
              endpointObj.output = extractOutputType(sourceFile.text, endpointName);
            }
            
            endpointsObj[endpointName] = endpointObj;
          }
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  ts.forEachChild(sourceFile, visit);
  
  // If we couldn't extract endpoints through the TypeScript API, try a more direct approach
  if (Object.keys(endpointsObj).length === 0) {
    endpointsObj = extractEndpointsManually(filePath);
  }
  
  return endpointsObj;
}

/**
 * Extract input type from the source code by looking for ApiEndpoint<METHOD, INPUT, OUTPUT>
 */
function extractInputType(sourceText: string, endpointName: string): string | undefined {
  // Look for the generic type pattern for this endpoint in the source code
  const genericPattern = new RegExp(`${endpointName}: ApiEndpoint<["']([A-Z]+)["'],\\s*([a-zA-Z0-9_]+|never),`);
  const match = sourceText.match(genericPattern);
  
  if (match && match[2] && match[2] !== 'never') {
    return match[2];
  }
  
  return undefined;
}

/**
 * Extract output type from the source code by looking for ApiEndpoint<METHOD, INPUT, OUTPUT>
 */
function extractOutputType(sourceText: string, endpointName: string): string | undefined {
  // Look for the generic type pattern for this endpoint in the source code
  const genericPattern = new RegExp(`${endpointName}: ApiEndpoint<["']([A-Z]+)["'],\\s*([a-zA-Z0-9_]+|never),\\s*([a-zA-Z0-9_]+)`);
  const match = sourceText.match(genericPattern);
  
  if (match && match[3]) {
    return match[3];
  }
  
  return undefined;
}

/**
 * Extract endpoints by manually parsing the file if the TypeScript API doesn't work
 */
function extractEndpointsManually(filePath: string): Record<string, any> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, any> = {};
  
  // First find the endpoints definition to extract the endpoint names and their types
  const apiClientDefMatch = content.match(/ApiClientDefinition<\{([^}]+)\}>/s);
  if (apiClientDefMatch && apiClientDefMatch[1]) {
    const endpointTypes = apiClientDefMatch[1];
    
    // Extract each endpoint and its generic types
    const endpointTypeRegex = /(\w+): ApiEndpoint<["']([A-Z]+)["'],\s*([a-zA-Z0-9_]+|never),\s*([a-zA-Z0-9_]+)/g;
    let match;
    
    while ((match = endpointTypeRegex.exec(endpointTypes)) !== null) {
      const [_, name, method, input, output] = match;
      
      // Now look for the actual endpoint definition
      const endpointDefRegex = new RegExp(`${name}:\\s*\\{([^}]+)\\}`, 's');
      const endpointMatch = content.match(endpointDefRegex);
      
      if (endpointMatch && endpointMatch[1]) {
        const endpointDef = endpointMatch[1];
        
        // Extract path
        const pathMatch = endpointDef.match(/path:\s*["']([^"']+)["']/);
        const path = pathMatch ? pathMatch[1] : '';
        
        // Create the endpoint object
        result[name] = {
          path,
          method,
          input: input !== 'never' ? input : undefined,
          output: output !== 'never' ? output : undefined
        };
      }
    }
  }
  
  return result;
}