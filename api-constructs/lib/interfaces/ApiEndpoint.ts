import { LambdaProps } from "@martzmakes/constructs/cdk/interfaces/LambdaProps";
import { HttpMethod } from "./HttpMethod";
import { InputAllowed } from "./InputAllowed";

export type ApiEndpoint<
  M extends HttpMethod,
  Input = InputAllowed<M>,
  Output = any,
  Resources = any,
> = {
  method: M;
  path: string;
  input?: Input;
  output?: Output;
} & (
  | {
      entry: string;
      lambdaGenerator: (args: Resources) => Omit<LambdaProps, "entry" | "name">;
    }
  // | {
  //     dynamoGenerator: (args: Resources) => Omit<EndpointDynamo, "method" | "path" | "requestTemplate" | "responseTemplate">;
  //     requestTemplate?: string;
  //     responseTemplate: string;
  //   }
);