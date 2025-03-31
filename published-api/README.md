# Published API Example

This project demonstrates how to create and publish a strongly-typed API using the AWS CDK and the api-constructs library.

## Overview

The Published API project showcases:
- Defining API endpoints with proper TypeScript interfaces
- Configuring routes and lambda handlers for API endpoints
- Generating a strongly-typed client for API consumers
- Deploying the API using AWS CDK
- Publishing the generated client for external consumption

## Project Structure

- `lib/interfaces/` - TypeScript interfaces defining the API contract
- `lib/lambda/` - Lambda handlers for API endpoints
- `lib/routes/` - API route definitions
- `generatedClient/` - **Auto-generated** API client code (DO NOT MODIFY)

## Important Note

**The `generatedClient/` folder should not be modified manually!** 
This folder is automatically generated using `npm run build` or `npm run generateApi`. Any manual changes will be overwritten during the next build.

## The DefinedInternalApi Construct

This project utilizes the `DefinedInternalApi` construct from the api-constructs library, which automates the creation of API Gateway resources, Lambda integrations, and client generation.

### Key Features

- **Automated API Gateway Setup**: Automatically creates RESTful API endpoints based on your defined routes
- **Lambda Integration**: Maps each endpoint to its corresponding Lambda handler
- **Strong Typing**: Maintains TypeScript interfaces throughout the entire stack
- **Client Generation**: Produces strongly-typed client code ready for consumption

### Usage Example

The `DefinedInternalApi` construct is used in `published-api-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { endpoints } from './routes/internal';
import { DefinedInternalApi } from "@martzmakes/api-constructs/lib/constructs/DefinedInternalApi";

export class PublishedApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DefinedInternalApi(this, 'PublishedApi', {
      apiClientDefinition: endpoints,
      endpointResources: {
        // Add any resources needed by the endpoints here
      },
    });
  }
}
```

### Configuration Options

The `DefinedInternalApi` construct accepts the following properties:

- **apiClientDefinition**: The API endpoint definitions (from your routes file)
- **endpointResources**: Resources to be passed to endpoint lambda generators (like DynamoDB tables, etc.)
- **logGroupOverrides** (optional): Properties to override default LogGroup settings
- **restApiOverrides** (optional): Properties to override default RestApi settings

## Getting Started

1. Install dependencies: `npm install`
2. Generate the API client: `npm run generateApi`
3. Build the project: `npm run build`
4. Deploy to AWS: `npx cdk deploy`

## Useful Commands

* `npm run build`         Compile TypeScript to JS and generate API client
* `npm run watch`         Watch for changes and compile
* `npm run test`          Perform the jest unit tests
* `npm run generateApi`   Generate the API client code only
* `npx cdk deploy`        Deploy this stack to your default AWS account/region
* `npx cdk diff`          Compare deployed stack with current state
* `npx cdk synth`         Emits the synthesized CloudFormation template

This project is part of a larger demonstration of how to build, publish, and consume strongly-typed API clients in a TypeScript AWS CDK environment. See the root README for more information on the overall architecture.
