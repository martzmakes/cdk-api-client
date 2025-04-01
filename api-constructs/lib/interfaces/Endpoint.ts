import { ApiEndpoint } from "./ApiEndpoint";
import { HttpMethod } from "./HttpMethod";

/**
 * Type alias for endpoint definitions
 * 
 * An endpoint can be implemented in two ways:
 * 1. Lambda-based: uses a Lambda function for implementation (entry + lambdaGenerator)
 * 2. DynamoDB-based: uses direct DynamoDB integration (dynamoGenerator + requestTemplate/responseTemplate)
 *    For DynamoDB endpoints, VTL templates will be automatically generated based on input/output types
 */
export type Endpoint = ApiEndpoint<HttpMethod>;