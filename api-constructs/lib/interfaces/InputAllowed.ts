import { HttpMethod } from "./HttpMethod";

export type InputAllowed<M extends HttpMethod, InputType = any> = M extends "GET" | "DELETE"
  ? undefined
  : InputType;