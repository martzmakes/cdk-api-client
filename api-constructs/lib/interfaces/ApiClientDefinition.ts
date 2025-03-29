import { ApiEndpoint } from "./ApiEndpoint";

export type ApiClientDefinition<
  Endpoints extends Record<string, ApiEndpoint<any, any, any>>,
> = {
  [K in keyof Endpoints]: Endpoints[K];
};