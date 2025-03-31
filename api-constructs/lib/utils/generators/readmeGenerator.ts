/**
 * Utility to generate README.md for the generated API client
 */
import { Endpoint } from "../../interfaces/Endpoint";

/**
 * Generates a usage example for a specific endpoint
 * @param name The endpoint name
 * @param endpoint The endpoint definition
 * @returns Code sample for using the endpoint
 */
function generateEndpointSample(name: string, endpoint: Endpoint): string {
  const hasInput = !!endpoint.input && endpoint.input !== "never";
  const titleCaseName = name.charAt(0).toUpperCase() + name.slice(1);

  // Extract path parameters to create a sample params object
  const pathParams = endpoint.path.match(/{([a-zA-Z0-9_]+)}/g) || [];
  const pathParamNames = pathParams.map((param) =>
    param.substring(1, param.length - 1)
  );

  let sampleParams = "";

  // Add path parameters
  if (pathParamNames.length > 0) {
    sampleParams += pathParamNames
      .map((param) => `  ${param}: 'sample-${param}'`)
      .join(",\n");
  }

  // Add body for non-GET requests with input
  if (endpoint.method !== "GET" && hasInput) {
    if (pathParamNames.length > 0) sampleParams += ",\n";
    sampleParams += "  body: {\n    // Your request body here\n  }";
  }

  // Add query for GET requests with input
  if (endpoint.method === "GET" && hasInput) {
    if (pathParamNames.length > 0) sampleParams += ",\n";
    sampleParams += "  query: {\n    // Your query parameters here\n  }";
  }

  return `
// Example for ${name} endpoint
const ${name}Response = await client.${name}({
${sampleParams}
});`;
}

/**
 * Generates documentation for a single endpoint
 * @param name The endpoint name
 * @param endpoint The endpoint definition
 * @returns Formatted endpoint documentation
 */
function generateEndpointDocs(name: string, endpoint: Endpoint): string {
  const method = endpoint.method.toUpperCase();
  const inputType = endpoint.input ? `\`${endpoint.input}\`` : "None";
  const outputType = endpoint.output ? `\`${endpoint.output}\`` : "None";
  const pathWithParams = endpoint.path;

  // Generate a code sample for this endpoint
  const codeSample = generateEndpointSample(name, endpoint);

  return `
### \`${name}\`

- **Path**: \`${pathWithParams}\`
- **HTTP Method**: ${method}
- **Input Type**: ${inputType}
- **Output Type**: ${outputType}
${endpoint.description ? `- **Description**: ${endpoint.description}` : ""}

#### Usage Example:
\`\`\`typescript${codeSample}
\`\`\``;
}

/**
 * Generates README content for the API client package
 * @param packageName The name of the project/API
 * @param endpoints The endpoint definitions
 * @param hasMocks Whether the client includes mock capabilities
 * @returns Formatted README.md content
 */
export function generateClientReadme({
  projectName,
  packageName,
  endpoints,
  hasMocks = true,
}: {
  projectName: string;
  packageName: string;
  endpoints: Record<string, Endpoint>;
  hasMocks?: boolean;
}): string {
  const formattedName = projectName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const titleCaseProjectName =
    projectName.charAt(0).toUpperCase() + projectName.slice(1);
  const endpointCount = Object.keys(endpoints).length;

  // Generate documentation for each endpoint
  const endpointDocs = Object.entries(endpoints)
    .map(([name, endpoint]) => generateEndpointDocs(name, endpoint))
    .join("\n");

  return `# ${formattedName} API Client

## Overview
This package provides a TypeScript client for the ${formattedName} API. It was automatically generated and includes TypeScript types for request and response objects.

## Installation

\`\`\`bash
npm install --save ${packageName}
\`\`\`

## Usage

### Importing the client

\`\`\`typescript
import { ${titleCaseProjectName}ApiClient, create${titleCaseProjectName}ApiClient } from '${packageName}';

// Initialize the client using the factory function
const client = create${titleCaseProjectName}ApiClient();

// Or create an instance directly
const clientInstance = new ${titleCaseProjectName}ApiClient();
\`\`\`

### Making API calls
This client includes ${endpointCount} endpoint${
    endpointCount !== 1 ? "s" : ""
  } with full TypeScript type safety. All request and response objects are properly typed based on the API contract.

## API Endpoints

This client provides the following API endpoints:
${endpointDocs}

## API Contract

This client implements a strict API contract defined in TypeScript interfaces. The contract ensures:

- Type safety for all API requests and responses
- Validation of required path parameters
- Properly structured request bodies and query parameters
- Consistent error handling

${
  hasMocks
    ? `## Testing

### Using the mock client
This package includes a mock client for testing that implements the same interface as the real client:

\`\`\`typescript
import { ApiClientMock } from '${packageName}/apiClientMock';

// Initialize the mock client
const mockClient = new ApiClientMock();

// Configure mock responses for specific endpoints
mockClient.someEndpoint.mockResolvedValue({
  // Your mocked response data
});

// Or configure to reject with an error
mockClient.someEndpoint.mockRejectedValue(new Error('Mock error'));

// Use in tests - maintains the same API as the real client
const response = await mockClient.someEndpoint({
  // Your test parameters
});
\`\`\`

### Contract Tests
This package includes contract tests that verify the implementation of the API client matches the API contract. These tests ensure that both the real client and mock client conform to the same interface.`
    : ""
}

## Generated Code
This client was automatically generated from API definitions. Please do not modify the generated files directly as changes will be overwritten when the client is regenerated.
`;
}
