import { HttpMethod } from "./HttpMethod";

export type InputAllowed<M extends HttpMethod> = M extends "GET" | "DELETE"
  ? undefined
  : any;