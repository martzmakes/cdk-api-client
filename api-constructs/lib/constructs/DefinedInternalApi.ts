import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  RestApiProps,
  RestApi,
  AuthorizationType,
  EndpointType,
  LogGroupLogDestination,
  AccessLogFormat,
  MethodLoggingLevel,
  Resource,
  LambdaIntegration,
  AwsIntegration,
  Method,
} from "aws-cdk-lib/aws-apigateway";
import {
  PolicyDocument,
  PolicyStatement,
  Effect,
  AccountPrincipal,
  IRole,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { LogGroup, LogGroupProps, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { ApiClientDefinition, ApiEndpoint } from "../interfaces";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Lambda } from "@martzmakes/constructs/cdk/constructs/lambda";

/**
 * Properties for creating a DefinedInternalApi
 * @interface DefinedInternalApiProps
 */
export interface DefinedInternalApiProps {
  /** 
   * API client definition containing endpoint configurations
   */
  apiClientDefinition: ApiClientDefinition<any>;
  /**
   * Resources to be passed to the endpoint lambda generators
   */
  endpointResources: any;
  /**
   * Optional properties to override default LogGroup settings
   */
  logGroupOverrides?: LogGroupProps;
  /**
   * Optional properties to override default RestApi settings
   */
  restApiOverrides?: RestApiProps;
}

/**
 * A CDK construct that creates an internal API Gateway with lambda integrations based on an API definition.
 * Supports both direct lambda integrations and SQS queue backed endpoints.
 * 
 * @export
 * @class DefinedInternalApi
 * @extends {Construct}
 */
export class DefinedInternalApi extends Construct {
  /** IAM role used for API Gateway integrations */
  credentialsRole?: IRole;
  /** Map of lambda functions created for each endpoint */
  lambdas: Record<string, Lambda> = {};
  /** Map of API Gateway methods created for each endpoint */
  methods: Record<string, Method> = {};
  /** Map of API Gateway resources created for the API paths */
  resources: Record<string, Resource> = {};
  /** The main REST API instance */
  restApi: RestApi;

  /**
   * Creates an instance of DefinedInternalApi.
   * Sets up the API Gateway with proper logging, security, and endpoints based on the provided definition.
   * 
   * @param {Construct} scope - The parent CDK construct
   * @param {string} id - The construct ID
   * @param {DefinedInternalApiProps} props - Configuration properties
   * @memberof DefinedInternalApi
   */
  constructor(scope: Construct, id: string, props: DefinedInternalApiProps) {
    super(scope, id);

    const logs = new LogGroup(this, `/${id}ApiLogs`, {
      logGroupName: `/${id}Api`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
      ...props.logGroupOverrides,
    });

    this.restApi = new RestApi(this, `${id}Api`, {
      description: `API for ${id}`,
      defaultMethodOptions: { authorizationType: AuthorizationType.IAM },
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["execute-api:Invoke"],
            effect: Effect.ALLOW,
            principals: [new AccountPrincipal(Stack.of(this).account)],
          }),
        ],
      }),
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      deployOptions: {
        dataTraceEnabled: true,
        tracingEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new LogGroupLogDestination(logs),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: MethodLoggingLevel.INFO,
      },
      ...props.restApiOverrides,
    });

    Object.entries(props.apiClientDefinition).forEach(([name, apiEndpoint]) => {
      const apiResource = this.createEndpointPath({ path: apiEndpoint.path });
      if (apiEndpoint.lambdaGenerator) {
        this.addLambdaDefinition({
          apiResource,
          apiEndpoint,
          endpointResources: props.endpointResources,
          name,
        });
      }
    });
  }

  /**
   * Creates API Gateway resources for the given path.
   * Handles nested paths by creating intermediate resources as needed.
   * 
   * @param {Object} params - Parameters object
   * @param {string} params.path - The path to create resources for
   * @returns {Resource} The created API Gateway resource
   * @memberof DefinedInternalApi
   */
  createEndpointPath({ path }: { path: string }): Resource {
    const pathParts = path.split("/");
    let currentPath = "";
    pathParts.forEach((pathPart, ind) => {
      if (pathPart) {
        if (ind === 0) {
          currentPath = pathPart;
          if (!this.resources[currentPath]) {
            this.resources[currentPath] =
              this.restApi.root.addResource(pathPart);
          }
        } else {
          currentPath += `${ind !== 0 ? "/" : ""}${pathPart}`;
          if (!this.resources[currentPath]) {
            this.resources[currentPath] =
              this.resources[
                currentPath.substring(0, currentPath.lastIndexOf("/"))
              ].addResource(pathPart);
          }
        }
      }
    });
    return this.resources[path];
  }

  /**
   * Gets or creates the IAM role used for API Gateway integrations
   * 
   * @returns {IRole} The credentials role for API Gateway integrations
   * @memberof DefinedInternalApi
   */
  getCredentialsRole() {
    if (!this.credentialsRole) {
      this.credentialsRole = new Role(this, "integration-role", {
        assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
      });
    }

    return this.credentialsRole;
  }

  /**
   * Adds a lambda integration to the API Gateway.
   * Can create either a direct lambda integration or an SQS queue backed endpoint.
   * 
   * @param {Object} params - Parameters object
   * @param {ApiEndpoint<any, any, any>} params.apiEndpoint - The API endpoint configuration
   * @param {Resource} params.apiResource - The API Gateway resource to attach to
   * @param {any} params.endpointResources - Resources to pass to the lambda generator
   * @param {string} params.name - Name of the endpoint
   * @memberof DefinedInternalApi
   */
  addLambdaDefinition({
    apiEndpoint,
    apiResource,
    endpointResources,
    name,
  }: {
    apiEndpoint: ApiEndpoint<any, any, any>;
    apiResource: Resource;
    endpointResources: any;
    name: string;
  }) {
    const { lambdaGenerator, ...endpointProps } = apiEndpoint;
    const endpoint = {
      name,
      ...endpointProps,
      ...lambdaGenerator(endpointResources),
    };
    const lambda = new Lambda(this, `${name}Fn`, endpoint);
    this.lambdas[name] = lambda;
    const { fn } = lambda;
    if (endpoint.queue) {
      const queue = new Queue(this, `queue-${endpoint.name}`, {
        visibilityTimeout: Duration.seconds(31),
      });
      queue.grantSendMessages(this.getCredentialsRole());
      const sendMessageIntegration = new AwsIntegration({
        service: "sqs",
        path: `${Stack.of(this).account}/${queue.queueName}`,
        integrationHttpMethod: "POST",
        options: {
          credentialsRole: this.getCredentialsRole(),
          requestParameters: {
            "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
          },
          requestTemplates: {
            "application/json": `Action=SendMessage&MessageBody=#set($allParams = $input.params())
{
  "body": $util.urlEncode($input.body),
  "params": {
    #foreach($type in $allParams.keySet())
      #set($params = $allParams.get($type))
      "$type": {
        #foreach($paramName in $params.keySet())
          "$paramName": "$util.escapeJavaScript($params.get($paramName))"#if($foreach.hasNext),#end
        #end
      }#if($foreach.hasNext),#end
    #end
  }
}`,
          },
          integrationResponses: [
            {
              statusCode: "202", // Note use of 202 Accepted here vs 200
            },
            {
              statusCode: "400",
            },
            {
              statusCode: "500",
            },
          ],
        },
      });
      const method = apiResource.addMethod("POST", sendMessageIntegration, {
        methodResponses: [
          {
            statusCode: "202", // Note use of 202 Accepted here vs 200
          },
          {
            statusCode: "400",
          },
          {
            statusCode: "500",
          },
        ],
      });
      this.methods[endpoint.name] = method;
      
      const eventSource = new SqsEventSource(queue, {
        batchSize: 10,
        reportBatchItemFailures: true,
        maxConcurrency: 10,
        maxBatchingWindow: Duration.seconds(1),
      });
      fn.addEventSource(eventSource);
    } else {
      const method = apiResource.addMethod(
        endpoint.method,
        new LambdaIntegration(fn),
        {
          authorizationType: AuthorizationType.IAM,
        }
      );
      this.methods[endpoint.name] = method;
    }
  }
}
