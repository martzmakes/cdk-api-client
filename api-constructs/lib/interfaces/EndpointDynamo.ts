/**
 * Interface for endpoint definition
 */
export interface EndpointDynamo {
  action?: string;
  defaultLimit?: number;
  description?: string;
  expressionAttributeNames?: Record<string, any>;
  expressionAttributeValues?: Record<string, any>;
  filterExpression?: string;
  indexName?: string;
  input?: any;
  keyConditionExpression?: string;
  method: string;
  output?: any;
  path: string;
  pk?: string;
  requestTemplateOverride?: string;
  responseKey?: string;
  responseTemplateOverride?: string;
  responseTemplateDisableItemNotFoundHandler?: boolean;
  sk?: string;
  tableName: string;
}
