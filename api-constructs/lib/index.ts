// import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface ApiConstructsProps {
  // Define construct properties here
}

export class ApiConstructs extends Construct {

  constructor(scope: Construct, id: string, props: ApiConstructsProps = {}) {
    super(scope, id);

    // Define construct contents here

    // example resource
    // const queue = new sqs.Queue(this, 'ApiConstructsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
