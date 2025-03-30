import { handler } from '../lib/lambda/consumer';
import { createApiPublishedApiClientMock } from '@martzmakes/published-api';

// Mock the API client module
jest.mock('@martzmakes/published-api', () => {
  const mockClient = {
    getToppingByName: jest.fn(),
  };
  return {
    createPublishedApiApiClient: jest.fn(() => mockClient),
    createApiPublishedApiClientMock: jest.fn(() => mockClient),
  };
});

describe('Consumer Lambda', () => {
  let apiClientMock: any;

  beforeEach(() => {
    // Get the mock implementation
    apiClientMock = createApiPublishedApiClientMock();
    
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it('should return topping from the API client', async () => {
    // Setup mock response
    const mockTopping = {
      name: 'Pepperoni',
      description: 'Spicy Italian sausage',
      price: 1.99,
    };
    
    apiClientMock.getToppingByName.mockResolvedValue(mockTopping);

    // Call the handler
    const result = await handler();

    // Verify the handler called the API client with the correct parameters
    expect(apiClientMock.getToppingByName).toHaveBeenCalledWith({
      toppingName: 'Pepperoni',
    });
    
    // Verify the result
    expect(result).toEqual(mockTopping);
  });

  it('should handle API client errors', async () => {
    // Setup mock to throw an error
    const error = new Error('API error');
    apiClientMock.getToppingByName.mockRejectedValue(error);

    // Call the handler and expect it to throw
    await expect(handler()).rejects.toThrow('API error');
    
    // Verify the API client was called
    expect(apiClientMock.getToppingByName).toHaveBeenCalledWith({
      toppingName: 'Pepperoni',
    });
  });
});