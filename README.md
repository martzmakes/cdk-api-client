# CDK API Client Generator

A comprehensive mono-repo demonstrating how to build, publish, and consume strongly-typed API clients in a TypeScript AWS CDK environment.

## Overview

This repository contains three interconnected projects that showcase a complete API development workflow:

1. **[api-constructs](./api-constructs/README.md)**: A reusable library that generates strongly-typed API clients and mocks from endpoint definitions
2. **[published-api](./published-api/README.md)**: An example API that uses the api-constructs library to publish its own client
3. **[consuming-api](./consuming-api/README.md)**: A client application that demonstrates how to consume the published API

## Project Structure

### [api-constructs](./api-constructs/README.md)

The core library that provides tooling to generate TypeScript API clients. This package:

- Generates strongly-typed API clients from endpoint definitions
- Creates mock clients for testing
- Produces contract tests to ensure API compatibility
- Handles type imports and interface generation
- Simplifies the process of publishing API clients as npm packages

The generated clients enforce API contracts through TypeScript's type system, ensuring that consumers interact with your API exactly as intended.

### [published-api](./published-api/README.md)

An example API implementation that demonstrates how to:

- Define API endpoints with proper typing (see the interfaces folder)
- Configure routes and lambdas for endpoint handlers
- Use the api-constructs library to generate a client for consumers
- Deploy the API using AWS CDK
- Publish the generated client for external consumption

This project serves as a template for creating your own APIs with automatically generated, strongly-typed clients.

### [consuming-api](./consuming-api/README.md)

A demonstration project showing how to:

- Install and import a generated API client
- Make strongly-typed API calls with proper error handling
- Take advantage of TypeScript's type system for autocomplete and validation
- Test applications that depend on external APIs using the generated mocks

## Benefits of This Approach

- **Type Safety**: Catch errors at compile time rather than runtime
- **Developer Experience**: Get autocomplete and inline documentation for API endpoints
- **Contract Testing**: Automatically verify that your API implementation matches the client expectations
- **Simplified Updates**: When API changes occur, client code immediately shows type errors where changes are needed
- **Consistent Patterns**: Standardized approach to API development and consumption

## Advanced Concepts

### Endpoint Definition

The core of this system is a strongly-typed endpoint definition. Here's a simplified example:

```typescript
// Define an endpoint
const getToppingsEndpoint: ApiEndpoint = {
  path: '/toppings',
  method: HttpMethod.GET,
  name: 'getToppings',
  responseType: 'ToppingsResponse',
  responseImport: './interfaces/ToppingsResponse'
};

// Generated client will provide type-safe methods:
const client = new ApiClient();
const toppings = await client.getToppings(); // Returns ToppingsResponse
```

### Mock Generation

The system automatically generates mock clients for testing:

```typescript
// In your tests
import { ApiClientMock } from 'generated-client';

// Setup the mock with expected responses
const clientMock = new ApiClientMock();
clientMock.getToppings.mockResolvedValue({
  toppings: [{ name: 'Cheese', description: 'Dairy goodness' }]
});

// Use in your test
const result = await clientMock.getToppings();
expect(result.toppings[0].name).toBe('Cheese');
```

### Contract Testing

The generated client includes automatic contract tests that verify your API implementation matches the expected types:

```typescript
// This is automatically generated and ensures your API
// adheres to the promised contract
it('should return proper response from getToppings endpoint', async () => {
  const response = await client.getToppings();
  expect(response).toMatchSchema(ToppingsResponseSchema);
});
```

## Getting Started

Each project contains its own README with specific setup instructions. The general workflow is:

1. Use [api-constructs](./api-constructs/README.md) to define your API structure
2. Implement your API endpoints in a project like [published-api](./published-api/README.md)
3. Generate and publish your API client
4. Consume the client in applications like [consuming-api](./consuming-api/README.md)

## Advanced Usage Examples

### Custom Client Configuration

```typescript
// Configure your API client with custom settings
const client = new ApiClient({
  baseUrl: 'https://custom-domain.example.com/api',
  headers: {
    'x-api-key': 'your-api-key'
  },
  timeout: 5000 // 5 seconds
});
```

### Error Handling

```typescript
// Type-safe error handling
try {
  const response = await client.searchToppings({ query: 'cheese' });
  // Process response
} catch (error) {
  if (error instanceof ApiClientError) {
    // Strongly-typed error handling
    console.error(`API Error (${error.statusCode}): ${error.message}`);
  } else {
    // Network or other errors
    console.error('Unexpected error:', error);
  }
}
```

## TODO / Future Improvements

### Feature Enhancements
- **DynamoDB Direct Integration**: Add support for defining endpoints that directly integrate with DynamoDB operations, allowing for automatic CRUD operation generation based on table schemas
- **OpenAPI/Swagger Generation**: Generate OpenAPI/Swagger documentation from endpoint definitions
- **Pagination Helpers**: Built-in utilities for handling paginated responses

### Testing & Quality
- **Enhanced Mock Generation**: Improve mock generation with more realistic data examples based on type definitions
- **Performance Testing**: Add tools for benchmarking API performance
- **Schema Validation**: Integrate JSON schema validation for request/response at runtime

### Deployment & Infrastructure
- **ApiHandler support**: Add ApiHandler wrappers to automatically define Input/Output types

---

*This project will be featured in a detailed blog post at [martzmakes.com](https://martzmakes.com)*