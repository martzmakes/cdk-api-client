import * as fs from "fs";
import * as ts from "typescript";
import { EndpointMock } from "../../interfaces/EndpointMock";
import { TypeImport } from "../../interfaces/TypeImport";

/**
 * Parses a TypeScript file and extracts API client method information
 */
export function parseApiClientFile({
  titleCaseProjectName,
  filePath,
}: {
  titleCaseProjectName: string;
  filePath: string;
}): {
  endpoints: EndpointMock[];
  imports: TypeImport[];
} {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const endpoints: EndpointMock[] = [];
  const imports: TypeImport[] = [];

  // Function to recursively visit nodes
  function visit(node: ts.Node) {
    // Collect import statements
    if (ts.isImportDeclaration(node)) {
      const importPath = (node.moduleSpecifier as ts.StringLiteral).text;

      // Process named imports
      if (
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        node.importClause.namedBindings.elements.forEach((element) => {
          const typeName = element.name.text;
          imports.push({ typeName, importPath });
        });
      }
    }

    // Looking for method declarations inside the ApiClient class
    if (
      ts.isMethodDeclaration(node) &&
      node.parent &&
      ts.isClassDeclaration(node.parent) &&
      node.parent.name?.text === `${titleCaseProjectName}ApiClient`
    ) {
      const methodName = node.name.getText(sourceFile);

      // Skip constructor
      if (methodName === "constructor") {
        return;
      }

      // Get parameter type
      let paramType = "any";
      if (node.parameters.length > 0 && node.parameters[0].type) {
        paramType = node.parameters[0].type.getText(sourceFile);
      }

      // Get return type
      let returnType = "any";
      if (node.type) {
        returnType = node.type.getText(sourceFile);
        // Remove Promise wrapper if present
        if (returnType.startsWith("Promise<") && returnType.endsWith(">")) {
          returnType = returnType.substring(8, returnType.length - 1);
        }
      }

      endpoints.push({
        name: methodName,
        paramType,
        returnType,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { endpoints, imports };
}
