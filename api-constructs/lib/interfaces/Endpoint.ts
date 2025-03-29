/**
 * Interface for endpoint definition
 */
export interface Endpoint {
  path: string;
  method: string;
  input?: any;
  output?: any;
  // Add other properties that might be in your endpoint definitions
}