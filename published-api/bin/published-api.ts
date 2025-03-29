#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PublishedApiStack } from '../lib/published-api-stack';

const app = new cdk.App();
new PublishedApiStack(app, 'PublishedApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});