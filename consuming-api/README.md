# Consuming API Project

This project demonstrates how to consume a strongly-typed API client generated from the api-constructs library. It serves as an example of best practices for integrating with APIs that provide TypeScript clients.

## Overview

The consuming-api project shows how to:

- Install and import a generated API client
- Make strongly-typed API calls with proper error handling
- Take advantage of TypeScript's type system for autocomplete and validation
- Test applications that depend on external APIs using the generated mocks

## Implementation

This project includes a simple Lambda function that consumes the published-api client to retrieve topping information. The implementation demonstrates:

- How to import and initialize the API client
- Making type-safe API calls
- Using TypeScript's type system to ensure correct parameter passing

## Benefits

- **Type Safety**: Catch errors at compile time rather than runtime
- **Developer Experience**: Get autocomplete and inline documentation for API endpoints
- **Simplified Testing**: Use the generated mock clients in test environments

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

---

This project is part of the [CDK API Client Generator](../README.md) monorepo demonstration.
