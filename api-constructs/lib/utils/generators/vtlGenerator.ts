import { Endpoint } from "../../interfaces/Endpoint";
import { ApiEndpoint } from "../../interfaces/ApiEndpoint";
import { HttpMethod } from "../../interfaces/HttpMethod";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

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
    if (!('dynamoGenerator' in typedEndpoint)) {
      continue;
    }

    console.log(`Generating VTL templates for endpoint: ${name}`);

    // Generate response template based on output type
    if (typedEndpoint.output && typeof typedEndpoint.output === "string") {
      const outputTypeName = typedEndpoint.output;
      // Try to find the interface file
      const interfaceFile = path.join(outputDir, "interfaces", `${outputTypeName}.ts`);
      
      if (fs.existsSync(interfaceFile)) {
        // Read the interface file and analyze its structure
        const sourceText = fs.readFileSync(interfaceFile, "utf8");
        console.log(`sourceText: ${sourceText}`);
        const responseTemplate = generateResponseTemplateFromType(sourceText, outputTypeName);
        console.log(`Generated response template for ${outputTypeName}: ${responseTemplate}`);
        fs.writeFileSync(path.join(vtlDir, `${name}-response.vtl`), responseTemplate);
      } else {
        // Fall back to generic template if interface file not found
        const responseTemplate = generateBasicResponseTemplate();
        fs.writeFileSync(path.join(vtlDir, `${name}-response.vtl`), responseTemplate);
      }
    }
    
    // Generate request template based on input type and method
    if (typedEndpoint.input && typeof typedEndpoint.input === "string") {
      const inputTypeName = typedEndpoint.input;
      // Try to find the interface file
      const interfaceFile = path.join(outputDir, "interfaces", `${inputTypeName}.ts`);
      
      if (fs.existsSync(interfaceFile)) {
        // Read the interface file and analyze its structure
        const sourceText = fs.readFileSync(interfaceFile, "utf8");
        const requestTemplate = generateRequestTemplateFromType(sourceText, inputTypeName, typedEndpoint.method as HttpMethod);
        fs.writeFileSync(path.join(vtlDir, `${name}-request.vtl`), requestTemplate);
      } else {
        // Fall back to generic template if interface file not found
        const requestTemplate = generateBasicRequestTemplate(typedEndpoint.method as HttpMethod);
        fs.writeFileSync(path.join(vtlDir, `${name}-request.vtl`), requestTemplate);
      }
    }
  }
}

/**
 * Analyzes TypeScript interface and generates appropriate VTL response template
 */
function generateResponseTemplateFromType(sourceText: string, typeName: string): string {
  // Create source file from the TypeScript code
  const sourceFile = ts.createSourceFile(
    `${typeName}.ts`,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  // Start with common VTL definitions
  let template = commonVtlDefinitions;
  
  // For DynamoDB marshalled JSON response, we need to handle the Items array or Item object
  template += `
## Handle DynamoDB response format
#if($inputRoot.toString().contains("error"))
  $input.json('$')
#else
  {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "`;
  
  // Find the interface declaration in the source file
  let properties: {name: string, type: string}[] = [];
  
  ts.forEachChild(sourceFile, node => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === typeName) {
      // Process each property in the interface
      node.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
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
  
  // DynamoDB might return Items (multiple) or Item (single) based on the query
  template += `
#if($inputRoot.Items)
  {\\\"items\\\":[
  #set($itemCount = $inputRoot.Items.size())
  #foreach($item in $inputRoot.Items)
    {
      #foreach($key in $item.keySet())
        #set($obj = $item)
        #if($item[$key].S)
          #set($key="$key") $outputConditionalString
        #elseif($item[$key].N)
          #set($key="$key") $outputConditionalNumber
        #elseif($item[$key].BOOL)
          #set($key="$key") $outputConditionalBoolean
        #elseif($item[$key].NULL)
          \\\"$key\\\":null$comma
        #elseif($item[$key].L)
          \\\"$key\\\":$util.escapeJavaScript($item[$key].L.toString())$comma
        #elseif($item[$key].M)
          \\\"$key\\\":$util.escapeJavaScript($item[$key].M.toString())$comma
        #else
          \\\"$key\\\":\\\"$util.escapeJavaScript($item[$key].toString())\\\"$comma
        #end
      #end
    }
    #if($foreach.hasNext),$comma#end
  #end
  ]}
#elseif($inputRoot.Item)
  {
  #foreach($key in $inputRoot.Item.keySet())
    #set($obj = $inputRoot.Item)
    #if($inputRoot.Item[$key].S)
      #set($key="$key") $outputConditionalString
    #elseif($inputRoot.Item[$key].N)
      #set($key="$key") $outputConditionalNumber
    #elseif($inputRoot.Item[$key].BOOL)
      #set($key="$key") $outputConditionalBoolean
    #elseif($inputRoot.Item[$key].NULL)
      \\\"$key\\\":null$comma
    #elseif($inputRoot.Item[$key].L)
      \\\"$key\\\":$util.escapeJavaScript($inputRoot.Item[$key].L.toString())$comma
    #elseif($inputRoot.Item[$key].M)
      \\\"$key\\\":$util.escapeJavaScript($inputRoot.Item[$key].M.toString())$comma
    #else
      \\\"$key\\\":\\\"$util.escapeJavaScript($inputRoot.Item[$key].toString())\\\"$comma
    #end
  #end
  }
#else
  $util.escapeJavaScript($inputRoot)
#end"
  }
#end
`;
  console.log(`Generated response template for ${typeName}: ${template}`);
  return template;
}

/**
 * Generates a basic response template when type information is not available
 */
function generateBasicResponseTemplate(): string {
  return commonVtlDefinitions + `
## Handle DynamoDB response format for basic responses
#if($inputRoot.toString().contains("error"))
  $input.json('$')
#else
  {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "
#if($inputRoot.Items)
  {\\\"items\\\":[
  #set($itemCount = $inputRoot.Items.size())
  #foreach($item in $inputRoot.Items)
    {
      #foreach($key in $item.keySet())
        #set($obj = $item)
        #if($item[$key].S)
          #set($key="$key") $outputConditionalString
        #elseif($item[$key].N)
          #set($key="$key") $outputConditionalNumber
        #elseif($item[$key].BOOL)
          #set($key="$key") $outputConditionalBoolean
        #elseif($item[$key].NULL)
          \\\"$key\\\":null$comma
        #elseif($item[$key].L)
          \\\"$key\\\":$util.escapeJavaScript($item[$key].L.toString())$comma
        #elseif($item[$key].M)
          \\\"$key\\\":$util.escapeJavaScript($item[$key].M.toString())$comma
        #else
          \\\"$key\\\":\\\"$util.escapeJavaScript($item[$key].toString())\\\"$comma
        #end
      #end
    }
    #if($foreach.hasNext),$comma#end
  #end
  ]}
#elseif($inputRoot.Item)
  {
  #foreach($key in $inputRoot.Item.keySet())
    #set($obj = $inputRoot.Item)
    #if($inputRoot.Item[$key].S)
      #set($key="$key") $outputConditionalString
    #elseif($inputRoot.Item[$key].N)
      #set($key="$key") $outputConditionalNumber
    #elseif($inputRoot.Item[$key].BOOL)
      #set($key="$key") $outputConditionalBoolean
    #elseif($inputRoot.Item[$key].NULL)
      \\\"$key\\\":null$comma
    #elseif($inputRoot.Item[$key].L)
      \\\"$key\\\":$util.escapeJavaScript($inputRoot.Item[$key].L.toString())$comma
    #elseif($inputRoot.Item[$key].M)
      \\\"$key\\\":$util.escapeJavaScript($inputRoot.Item[$key].M.toString())$comma
    #else
      \\\"$key\\\":\\\"$util.escapeJavaScript($inputRoot.Item[$key].toString())\\\"$comma
    #end
  #end
  }
#else
  $util.escapeJavaScript($inputRoot)
#end"
  }
#end
`;
}

/**
 * Analyzes TypeScript interface and generates appropriate VTL request template
 */
function generateRequestTemplateFromType(sourceText: string, typeName: string, method: HttpMethod): string {
  // For request templates, we want to pass the request through without transforming it
  // This is based on the assumption that the API Gateway integration is already configured 
  // to handle requests properly
  
  switch (method) {
    case "GET":
      return generateGetRequestTemplate();
    case "POST":
      return generatePostRequestTemplate();
    case "PUT":
      return generatePutRequestTemplate();
    case "DELETE":
      return generateDeleteRequestTemplate();
    default:
      return generateBasicRequestTemplate(method);
  }
}

/**
 * Generates a GET request template
 */
function generateGetRequestTemplate(): string {
  // Simply pass through the query parameters as they are
  return `$input.json('$')`;
}

/**
 * Generates a POST request template
 */
function generatePostRequestTemplate(): string {
  // Pass through the request body as-is
  return `$input.json('$')`;
}

/**
 * Generates a PUT request template
 */
function generatePutRequestTemplate(): string {
  // Pass through the request body as-is
  return `$input.json('$')`;
}

/**
 * Generates a DELETE request template
 */
function generateDeleteRequestTemplate(): string {
  // Pass through the request parameters as-is
  return `$input.json('$')`;
}

/**
 * Generates a basic request template based on HTTP method
 */
function generateBasicRequestTemplate(method: HttpMethod): string {
  // Default to passing through the request without transformation
  return `$input.json('$')`;
}