/**
 * Interface for endpoint definition
 */
export interface Endpoint {
  description?: string;
  input?: any;
  method: string;
  output?: any;
  path: string;
  // Add other properties that might be in your endpoint definitions
}