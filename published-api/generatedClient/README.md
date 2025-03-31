# PublishedApi API Client

## Overview
This package provides a TypeScript client for the PublishedApi API. It was automatically generated and includes TypeScript types for request and response objects.

## Installation

```bash
npm install --save @martzmakes/published-api
```

## Usage

### Importing the client

```typescript
import { PublishedApiApiClient, createPublishedApiApiClient } from '@martzmakes/published-api';

// Initialize the client using the factory function
const client = createPublishedApiApiClient();

// Or create an instance directly
const clientInstance = new PublishedApiApiClient();
```

### Making API calls
This client includes 3 endpoints with full TypeScript type safety. All request and response objects are properly typed based on the API contract.

## API Endpoints

This client provides the following API endpoints:

### `getToppingByName`

- **Path**: `toppings/{toppingName}`
- **HTTP Method**: GET
- **Input Type**: None
- **Output Type**: `Topping`


#### Usage Example:
```typescript
// Example for getToppingByName endpoint
const getToppingByNameResponse = await client.getToppingByName({
  toppingName: 'sample-toppingName'
});
```

### `getToppings`

- **Path**: `institutions/{institutionName}/cards`
- **HTTP Method**: GET
- **Input Type**: None
- **Output Type**: `ToppingsResponse`


#### Usage Example:
```typescript
// Example for getToppings endpoint
const getToppingsResponse = await client.getToppings({
  institutionName: 'sample-institutionName'
});
```

### `searchToppings`

- **Path**: `toppings`
- **HTTP Method**: POST
- **Input Type**: None
- **Output Type**: None


#### Usage Example:
```typescript
// Example for searchToppings endpoint
const searchToppingsResponse = await client.searchToppings({

});
```

## API Contract

This client implements a strict API contract defined in TypeScript interfaces. The contract ensures:

- Type safety for all API requests and responses
- Validation of required path parameters
- Properly structured request bodies and query parameters
- Consistent error handling

## Testing

### Using the mock client
This package includes a mock client for testing that implements the same interface as the real client:

```typescript
import { ApiClientMock } from '@martzmakes/published-api/apiClientMock';

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
```

### Contract Tests
This package includes contract tests that verify the implementation of the API client matches the API contract. These tests ensure that both the real client and mock client conform to the same interface.

## Generated Code
This client was automatically generated from API definitions. Please do not modify the generated files directly as changes will be overwritten when the client is regenerated.
