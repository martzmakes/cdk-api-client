# API Constructs - TypeScript API Client Generator

> **Note:** These constructs are not intended for production use in their current state. Once stable, they will be moved to the `@martzmakes/constructs` library. This repository exists primarily to support a pending blog post.

A reusable library that generates strongly-typed API clients and mocks from endpoint definitions.

## Overview

This library is the core of the CDK API Client Generator project. It provides tooling to:

- Generate strongly-typed API clients from endpoint definitions
- Create mock clients for testing purposes
- Produce contract tests to ensure API compatibility
- Handle type imports and interface generation
- Simplify the process of publishing API clients as npm packages

The generated clients enforce API contracts through TypeScript's type system, ensuring that consumers interact with your API exactly as intended.

## Project Structure

- `lib/`: Core library code
  - `interfaces/`: Type definitions for API endpoints and client generation
  - `utils/`: Utility functions for file operations, interface handling, and code generation
  - `generators/`: Code generation utilities
  - `mockGenerator/`: Tools for generating mock clients and contract tests

- `bin/`: Command-line tools
  - `generateApiClientMocks.ts`: Generates mock clients for testing
  - `generateInternalApiClient.ts`: Creates API clients for internal use
  - `import-endpoints.ts`: Imports endpoint definitions

## How to Use

This library can be used to generate clients for your own APIs. A typical workflow involves:

1. Define your API endpoints with proper typing
2. Use this library to generate a strongly-typed client
3. Publish the generated client for consumers to use

For a complete example, see the "published-api" project in the root of this repository.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
