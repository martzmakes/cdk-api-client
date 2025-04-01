export interface CreateItemRequest {
  id: string;
  name: string;
  count: number;
  isActive: boolean;
  tags: string[];
}