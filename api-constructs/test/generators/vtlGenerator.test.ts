import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateVtlTemplates } from '../../lib/utils/generators/vtlGenerator';
import { HttpMethod } from '../../lib/interfaces/HttpMethod';
import { Endpoint } from '../../lib/interfaces/Endpoint';
import { ApiEndpoint } from '../../lib/interfaces/ApiEndpoint';
import { EndpointDynamo } from '../../lib/interfaces/EndpointDynamo';

let tempDir: string;

// Set up temporary directory for test files
beforeEach(() => {
  // Create a temp directory for test output
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtl-test-'));

  console.log(`Temporary directory created at: ${tempDir}`);
  
  // Create interfaces directory within temp dir
  fs.mkdirSync(path.join(tempDir, 'interfaces'), { recursive: true });
  
  // Copy test interface files to the temporary directory
  const testInterfacesDir = path.join(__dirname, 'fixtures', 'interfaces');
  if (fs.existsSync(testInterfacesDir)) {
    const files = fs.readdirSync(testInterfacesDir);
    files.forEach(file => {
      fs.copyFileSync(
        path.join(testInterfacesDir, file),
        path.join(tempDir, 'interfaces', file)
      );
    });
  }
});

// Clean up after tests
afterEach(() => {
  // Clean up temp directory after each test
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('generates GET request VTL template for simple ID interface', () => {
  // Define test endpoint with the test interface
  const endpoints: Record<string, Endpoint> = {
    'getItem': {
      path: '/items/{id}',
      method: "GET" as HttpMethod,
      input: 'TestRequest',
      output: 'TestResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL file was created
  const vtlFilePath = path.join(tempDir, 'vtl', 'getItem-request.vtl');
  expect(fs.existsSync(vtlFilePath)).toBeTruthy();

  // Check content of VTL file
  const vtlContent = fs.readFileSync(vtlFilePath, 'utf8');
  // Snapshot test for GET request template
  expect(vtlContent).toMatchSnapshot('GET request VTL template');
  expect(vtlContent).toContain('TableName');
  expect(vtlContent).toContain('KeyConditionExpression');
  expect(vtlContent).toContain('"#pk": "id"');
  expect(vtlContent).toContain('$input.params(\'id\')');
});

test('generates POST request VTL template for complex interface', () => {
  // Define test endpoint with the test interface
  const endpoints: Record<string, Endpoint> = {
    'createItem': {
      path: '/items',
      method: "POST" as HttpMethod,
      input: 'CreateItemRequest',
      output: 'TestResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL file was created
  const vtlFilePath = path.join(tempDir, 'vtl', 'createItem-request.vtl');
  expect(fs.existsSync(vtlFilePath)).toBeTruthy();

  // Check content of VTL file
  const vtlContent = fs.readFileSync(vtlFilePath, 'utf8');
  expect(vtlContent).toContain('TableName');
  expect(vtlContent).toContain('Item');
  expect(vtlContent).toContain('"id": {');
  expect(vtlContent).toContain('"S": $input.json(\'$.id\')');
  expect(vtlContent).toContain('"count": {');
  expect(vtlContent).toContain('"N": $input.json(\'$.count\')');
  expect(vtlContent).toContain('"isActive": {');
  expect(vtlContent).toContain('"BOOL": $input.json(\'$.isActive\')');
  expect(vtlContent).toContain('"tags":');
  expect(vtlContent).toContain('$util.dynamodb.toDynamoDBJson($input.json(\'$.tags\'))');
  
  // Snapshot test for POST request template
  expect(vtlContent).toMatchSnapshot('POST request VTL template');
});

test('generates PUT request VTL template', () => {
  // Define test endpoint with the test interface
  const endpoints: Record<string, Endpoint> = {
    'updateItem': {
      path: '/items/{id}',
      method: "PUT" as HttpMethod,
      input: 'UpdateItemRequest',
      output: 'TestResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL file was created
  const vtlFilePath = path.join(tempDir, 'vtl', 'updateItem-request.vtl');
  expect(fs.existsSync(vtlFilePath)).toBeTruthy();

  // Check content of VTL file
  const vtlContent = fs.readFileSync(vtlFilePath, 'utf8');
  expect(vtlContent).toContain('TableName');
  expect(vtlContent).toContain('Key');
  expect(vtlContent).toContain('UpdateExpression');
  expect(vtlContent).toContain('ExpressionAttributeNames');
  expect(vtlContent).toContain('ExpressionAttributeValues');
  expect(vtlContent).toContain('"#name": "name"');
  expect(vtlContent).toContain('"#description": "description"');
  
  // Snapshot test for PUT request template
  expect(vtlContent).toMatchSnapshot('PUT request VTL template');
});

test('generates DELETE request VTL template', () => {
  // Define test endpoint with the test interface
  const endpoints: Record<string, Endpoint> = {
    'deleteItem': {
      path: '/items/{id}',
      method: "DELETE" as HttpMethod,
      input: 'DeleteItemRequest',
      output: 'TestResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL file was created
  const vtlFilePath = path.join(tempDir, 'vtl', 'deleteItem-request.vtl');
  expect(fs.existsSync(vtlFilePath)).toBeTruthy();

  // Check content of VTL file
  const vtlContent = fs.readFileSync(vtlFilePath, 'utf8');
  expect(vtlContent).toContain('TableName');
  expect(vtlContent).toContain('Key');
  expect(vtlContent).toContain('"id": {');
  expect(vtlContent).toContain('"S": "$input.params(\'id\')"');
  
  // Snapshot test for DELETE request template
  expect(vtlContent).toMatchSnapshot('DELETE request VTL template');
});

test('generates response VTL template', () => {
  // Define test endpoint with the test interface
  const endpoints: Record<string, Endpoint> = {
    'getItem': {
      path: '/items/{id}',
      method: "GET" as HttpMethod,
      output: 'TestResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL file was created
  const vtlFilePath = path.join(tempDir, 'vtl', 'getItem-response.vtl');
  expect(fs.existsSync(vtlFilePath)).toBeTruthy();

  // Check content of VTL file
  const vtlContent = fs.readFileSync(vtlFilePath, 'utf8');
  // Snapshot test for response template
  expect(vtlContent).toMatchSnapshot('Response VTL template');

  
  expect(vtlContent).toContain('#set($inputRoot = $input.path(\'$\'))');
  expect(vtlContent).toContain('"statusCode": 200');
  expect(vtlContent).toContain('"Content-Type": "application/json"');
  expect(vtlContent).toContain('\\"id\\":#if($inputRoot.id)\\"$util.escapeJavaScript($inputRoot.id)\\"#elsenull#end');
  expect(vtlContent).toContain('\\"count\\":#if($inputRoot.count)$inputRoot.count#else0#end');
  expect(vtlContent).toContain('\\"isActive\\":#if($inputRoot.isActive)$inputRoot.isActive#else false#end');
  expect(vtlContent).toContain('\\"tags\\":#if($inputRoot.tags)$util.escapeJavaScript($input.json(\'$.tags\'))#else[]#end');
});

test('uses basic templates when interface files not found', () => {
  // Define test endpoint without actual interface files
  const endpoints: Record<string, Endpoint> = {
    'missingInterfaceGet': {
      path: '/items/{id}',
      method: "GET" as HttpMethod,
      input: 'MissingRequest',
      output: 'MissingResponse',
      dynamoGenerator: () => ({
        tableName: 'TestTable'
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Check that VTL files were created with basic templates
  const requestVtlPath = path.join(tempDir, 'vtl', 'missingInterfaceGet-request.vtl');
  const responseVtlPath = path.join(tempDir, 'vtl', 'missingInterfaceGet-response.vtl');
  
  expect(fs.existsSync(requestVtlPath)).toBeTruthy();
  expect(fs.existsSync(responseVtlPath)).toBeTruthy();

  // Verify basic template content
  const requestVtl = fs.readFileSync(requestVtlPath, 'utf8');
  const responseVtl = fs.readFileSync(responseVtlPath, 'utf8');
  
  expect(requestVtl).toContain('"pk": "pk"');
  expect(responseVtl).toContain('$input.json(\'$\')');
  
  // Snapshot tests for fallback templates
  expect(requestVtl).toMatchSnapshot('Fallback request VTL template');
  expect(responseVtl).toMatchSnapshot('Fallback response VTL template');
});

test('skips endpoints without dynamoGenerator', () => {
  // Define test endpoint without dynamoGenerator
  const endpoints: Record<string, Endpoint> = {
    'nonDynamoEndpoint': {
      path: '/items',
      method: "GET" as HttpMethod,
      input: 'TestRequest',
      output: 'TestResponse',
      entry: 'some/path/to/lambda.ts',
      lambdaGenerator: () => ({
        environment: {}
      })
    } as ApiEndpoint<HttpMethod>,
  };

  // Create vtl directory to verify no files are created there
  fs.mkdirSync(path.join(tempDir, 'vtl'), { recursive: true });

  // Generate VTL templates
  generateVtlTemplates(endpoints, tempDir);

  // Verify no VTL files were created
  const files = fs.readdirSync(path.join(tempDir, 'vtl'));
  expect(files.length).toBe(0);
});