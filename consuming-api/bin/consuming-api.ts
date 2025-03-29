#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ConsumingApiStack } from '../lib/consuming-api-stack';

const app = new cdk.App();
new ConsumingApiStack(app, 'ConsumingApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});