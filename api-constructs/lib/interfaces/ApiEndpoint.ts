import { LambdaProps } from "@martzmakes/constructs/cdk/interfaces/LambdaProps";
import { HttpMethod } from "./HttpMethod";
import { InputAllowed } from "./InputAllowed";
import { EndpointDynamo } from "./EndpointDynamo";

export type ApiEndpoint<
  M extends HttpMethod,
  Input = InputAllowed<M>,
  Output = any,
  Resources = any
> = {
  description?: string;
  input?: Input;
  method: M;
  output?: Output;
  path: string;
} & (
  | {
      entry: string;
      queue?: boolean;
      lambdaGenerator: (
        args: Resources
      ) => Omit<LambdaProps, "entry" | "name" | "queue" | "description">;
    }
  | EndpointDynamo
);
