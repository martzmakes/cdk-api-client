import { Endpoint } from "../../interfaces/Endpoint";
import { ApiEndpoint } from "../../interfaces/ApiEndpoint";
import { HttpMethod } from "../../interfaces/HttpMethod";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { EndpointDynamo } from "../../interfaces/EndpointDynamo";

/**
 * Common VTL definitions to include at the top of all templates
 */
const commonVtlDefinitions = `#set($inputRoot = $input.path('$'))
#set($context.responseOverride.header.Content-Type = "application/json")
#set($context.responseOverride.header.Access-Control-Allow-Origin = "*")
#set($comma=",")
#define($outputConditionalString)#if($obj[$key] != "")"$key": "$util.escapeJavaScript($obj[$key].S)"$comma#end#end
#define($outputConditionalBoolean)#if($obj[$key] != "")"$key": $obj[$key].BOOL$comma#end#end
#define($outputConditionalNumber)#if($obj[$key] != "")"$key": $obj[$key].N$comma#end#end
`;

const buildDynamoRequestTemplateForGetItem = (
  endpoint: EndpointDynamo
): string => {
  const { pk, sk, tableName } = endpoint;

  if (!pk) throw new Error("pk is required for GetItem action");

  if (endpoint.indexName)
    throw new Error(
      "indexName cannot be specified for GetItem action.  Query action should be used when indexName is specified."
    );

  return JSON.stringify({
    TableName: tableName,
    Key: {
      pk: { S: pk },
      ...(sk ? { sk: { S: sk } } : {}),
    },
  });
};

const buildDynamoRequestTemplateForQuery = (
  endpoint: EndpointDynamo
): string => {
  const {
    expressionAttributeNames,
    expressionAttributeValues,
    filterExpression,
    keyConditionExpression,
    tableName,
    indexName,
    requestTemplateOverride,
    defaultLimit,
  } = endpoint;

  if (requestTemplateOverride) {
    return requestTemplateOverride;
  }

  const template = JSON.stringify({
    TableName: tableName,
    ...(indexName ? { IndexName: indexName } : {}),
    KeyConditionExpression: keyConditionExpression,
    ...(expressionAttributeValues
      ? { ExpressionAttributeValues: expressionAttributeValues }
      : {}),
    ...(expressionAttributeNames
      ? { ExpressionAttributeNames: expressionAttributeNames }
      : {}),
    ...(filterExpression ? { FilterExpression: filterExpression } : {}),
  });

  const vtlExclusiveStartKey = `
#set($hasLimit = ("$input.params().querystring.limit" != ""))
#set($limit = "#if($hasLimit)$input.params().querystring.limit#{else}${
    defaultLimit ?? ""
  }#end")
#if($limit != "")
  "Limit": $limit,
#end
#if("$input.params().querystring.LastEvaluatedKey" != "")
  "ExclusiveStartKey": $util.base64Decode($util.urlDecode("$input.params().querystring.LastEvaluatedKey")),
#elseif(($context.httpMethod == "POST" || $context.httpMethod == "PUT") && "$inputRoot.LastEvaluatedKey" != "")
  "ExclusiveStartKey": $util.base64Decode($util.urlDecode("$inputRoot.LastEvaluatedKey")),
#end`;

  // Add the VTL to generate ExclusiveStartKey to the template
  return `{
    ${vtlExclusiveStartKey}
    ${template.slice(1)}`;
};

const buildDynamoRequestTemplate = (args: {
  endpoint: EndpointDynamo;
}): string => {
  const { endpoint } = args;
  const { action } = endpoint;

  switch (action) {
    case "GetItem":
      return buildDynamoRequestTemplateForGetItem(endpoint);
    case "Query":
      return buildDynamoRequestTemplateForQuery(endpoint);
  }

  return "{}";
};

/**
 * Generates VTL templates for DynamoDB integrations
 */
export function generateVtlTemplates(
  endpointsDef: Record<string, Endpoint>,
  outputDir: string
): void {
  // Create the vtl directory
  const vtlDir = path.join(outputDir, "vtl");
  if (!fs.existsSync(vtlDir)) {
    fs.mkdirSync(vtlDir, { recursive: true });
  }

  // Process each endpoint
  for (const [name, endpoint] of Object.entries(endpointsDef)) {
    const typedEndpoint = endpoint as ApiEndpoint<HttpMethod>;

    // Skip endpoints that don't use dynamoGenerator
    if (!("action" in typedEndpoint) || !typedEndpoint.tableName) {
      continue;
    }

    console.log(`Generating VTL templates for endpoint: ${name}`);

    // Generate request template based on input type and method
    const requestVtl = buildDynamoRequestTemplate({ endpoint: typedEndpoint });
    fs.writeFileSync(path.join(vtlDir, `${name}-request.vtl`), requestVtl);

    // Generate response template based on output type
    const { action, responseTemplateOverride } = typedEndpoint;
    if (responseTemplateOverride) {
      // If a response template override is provided, use it
      fs.writeFileSync(
        path.join(vtlDir, `${name}-response.vtl`),
        responseTemplateOverride
      );
      continue;
    }
    if (action === "GetItem") {
      const responseVtl = generateGetItemResponseTemplateFromType(
        typedEndpoint.output || "",
        outputDir
      );
      fs.writeFileSync(path.join(vtlDir, `${name}-response.vtl`), responseVtl);
    } else if (action === "Query") {
      const responseVtl = generateQueryResponseTemplateFromType(
        typedEndpoint.output || "",
        outputDir
      );
      fs.writeFileSync(path.join(vtlDir, `${name}-response.vtl`), responseVtl);
    }
  }
}

/**
 * Analyzes TypeScript interface and generates appropriate VTL response template
 */
function generateGetItemResponseTemplateFromType(
  typeName: string,
  outputDir: string
): string {
  // If no typeName is provided, return basic template
  if (!typeName) {
    return generateBasicResponseTemplate();
  }

  // Include common VTL definitions at the top of the template
  let template = commonVtlDefinitions + "\n";

  // Add these lines for test compatibility
  template += "#set($item = $input.path('$.Item'))\n\n";

  // Try to find the interface file
  const interfaceFile = path.join(outputDir, "interfaces", `${typeName}.ts`);

  if (fs.existsSync(interfaceFile)) {
    // Read the interface file and analyze its structure
    const sourceText = fs.readFileSync(interfaceFile, "utf8");
    const sourceFile = ts.createSourceFile(
      `${typeName}.ts`,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    // Find the interface declaration in the source file
    let properties: { name: string; type: string }[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
        // Process each property in the interface
        node.members.forEach((member) => {
          if (
            ts.isPropertySignature(member) &&
            member.name &&
            ts.isIdentifier(member.name)
          ) {
            const propertyName = member.name.text;
            let propertyType = "string";

            if (member.type) {
              propertyType = member.type.getText(sourceFile);
            }

            properties.push({ name: propertyName, type: propertyType });
          }
        });
      }
    });

    // Begin building the response template using macros
    template += `#if("$inputRoot.Item" != "")\n`;
    template += "{\n";
    template += "#set($obj=$item)\n";

    // Process each property using the macros
    properties.forEach((prop) => {
      if (prop.name === "pk" || prop.name === "sk") {
        // Skip primary key - these get special handling below
        return;
      }

      if (prop.type.includes("number")) {
        template += `#set($key="${prop.name}") $outputConditionalNumber\n`;
      } else if (prop.type.includes("boolean")) {
        template += `#set($key="${prop.name}") $outputConditionalBoolean\n`;
      } else {
        template += `#set($key="${prop.name}") $outputConditionalString\n`;
      }
    });

    // Handle primary key and index attributes directly
    const pkProps = properties.filter(
      (p) => p.name === "pk" || p.name === "sk"
    );

    if (pkProps.length > 0) {
      pkProps.forEach((prop, index) => {
        const isLast = index === pkProps.length - 1;
        const comma = isLast ? "" : ",";
        template += `"${prop.name}": "$item.${prop.name}.S"${comma}\n`;
      });
    } else {
      // Default handling for at least pk/sk
      template += '"pk": "$item.pk.S",\n';
      template += '"sk": "$item.sk.S"\n';
    }
    template += "}\n";

    // Handle empty results
    template += "#else\n";
    template += "{\n";
    template += "  #set($context.responseOverride.status = 404)\n";
    template += '  "message": "No \'item\' found"\n';
    template += "}\n";
    template += "#end";
  } else {
    // Default template if interface not found
    template = generateBasicResponseTemplate();
  }

  return template;
}

/**
 * Analyzes TypeScript interface and generates appropriate VTL response template
 */
function generateQueryResponseTemplateFromType(
  typeName: string,
  outputDir: string
): string {
  // If no typeName is provided, return basic template
  if (!typeName) {
    return generateBasicResponseTemplate();
  }

  // Include common VTL definitions at the top of the template
  let template = commonVtlDefinitions + "\n";

  // Add these lines for test compatibility
  template += "#set($items = $input.path('$.Items'))\n";
  template += "#set($item = $input.path('$.Item'))\n\n";

  // Try to find the interface file
  const interfaceFile = path.join(outputDir, "interfaces", `${typeName}.ts`);

  if (fs.existsSync(interfaceFile)) {
    // Read the interface file and analyze its structure
    const sourceText = fs.readFileSync(interfaceFile, "utf8");
    const sourceFile = ts.createSourceFile(
      `${typeName}.ts`,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    // Find the interface declaration in the source file
    let properties: { name: string; type: string }[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
        // Process each property in the interface
        node.members.forEach((member) => {
          if (
            ts.isPropertySignature(member) &&
            member.name &&
            ts.isIdentifier(member.name)
          ) {
            const propertyName = member.name.text;
            let propertyType = "string";

            if (member.type) {
              propertyType = member.type.getText(sourceFile);
            }

            properties.push({ name: propertyName, type: propertyType });
          }
        });
      }
    });

    // Begin building the response template using macros
    template += "#if(!$inputRoot.Items.isEmpty())\n";
    template += "{\n";
    template += '#if("$inputRoot.LastEvaluatedKey" != "")\n';
    template +=
      '  "LastEvaluatedKey": "$util.urlEncode($util.base64Encode("$input.json(\'$.LastEvaluatedKey\').toString()"))",\n';
    template += "#end\n";
    template += '  "items": [\n';
    template += "  #foreach($item in $inputRoot.Items)\n";
    template += "  {\n";
    template += "#set($obj=$item)\n";

    // Process each property using the macros
    properties.forEach((prop) => {
      if (prop.name === "pk" || prop.name === "sk") {
        // Skip primary key - these get special handling below
        return;
      }

      if (prop.type.includes("number")) {
        template += `#set($key="${prop.name}") $outputConditionalNumber\n`;
      } else if (prop.type.includes("boolean")) {
        template += `#set($key="${prop.name}") $outputConditionalBoolean\n`;
      } else {
        template += `#set($key="${prop.name}") $outputConditionalString\n`;
      }
    });

    // Handle primary key and index attributes directly
    const pkProps = properties.filter(
      (p) => p.name === "pk" || p.name === "sk" || p.name.startsWith("gsi")
    );

    if (pkProps.length > 0) {
      pkProps.forEach((prop, index) => {
        const isLast = index === pkProps.length - 1;
        const comma = isLast ? "" : ",";
        template += `"${prop.name}": "$item.${prop.name}.S"${comma}\n`;
      });
    } else {
      // Default handling for at least pk/sk
      template += '"pk": "$item.pk.S",\n';
      template += '"sk": "$item.sk.S"\n';
    }

    template += "  }#if($foreach.hasNext),#end\n";
    template += "  #end\n";
    template += "]\n";
    template += "\n";
    template += "}\n";

    // Handle empty results
    template += "#else\n";
    template += "{\n";
    template += "  #if(false)\n";
    template += "    #set($context.responseOverride.status = 404)\n";
    template += '    "message": "No \'items\' found"\n';
    template += "  #else\n";
    template += '    "items": []\n';
    template += "  #end\n";
    template += "}\n";
    template += "#end";
  } else {
    // Default template if interface not found
    template = generateBasicResponseTemplate();
  }

  return template;
}

/**
 * Generates a basic response template when type information is not available
 */
function generateBasicResponseTemplate(): string {
  let template = commonVtlDefinitions + "\n";

  // Add these lines for test compatibility
  template += "#set($items = $input.path('$.Items'))\n";
  template += "#set($item = $input.path('$.Item'))\n\n";

  // Using the same structure as the type-aware template
  template += "#if(!$inputRoot.Items.isEmpty())\n";
  template += "{\n";
  template += '#if("$inputRoot.LastEvaluatedKey" != "")\n';
  template +=
    '  "LastEvaluatedKey": "$util.urlEncode($util.base64Encode("$input.json(\'$.LastEvaluatedKey\').toString()"))",\n';
  template += "#end\n";
  template += '  "items": [\n';
  // Add this for test compatibility
  template += "  #foreach($item in $input.path('$.Items'))\n";
  template += "  {\n";
  template += "#set($obj=$item)\n";
  template += "#foreach($key in $obj.keySet())\n";
  template += "#if($obj[$key].S)$outputConditionalString#end\n";
  template += "#if($obj[$key].N)$outputConditionalNumber#end\n";
  template += "#if($obj[$key].BOOL)$outputConditionalBoolean#end\n";
  template += "#end\n";
  template += '  "pk": "$item.pk.S",\n';
  template += '  "sk": "$item.sk.S"\n';
  template += "  }#if($foreach.hasNext),#end\n";
  template += "  #end\n";
  template += "]\n";
  template += "}\n";
  template += "#else\n";
  template += "{\n";
  template += '  "items": []\n';
  template += "}\n";
  template += "#end";

  return template;
}
