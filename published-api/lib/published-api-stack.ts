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
