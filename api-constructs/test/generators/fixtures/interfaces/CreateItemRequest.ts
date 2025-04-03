export interface CreateItemRequest {
  pk: string;
  sk: string;
  name: string;
  count: number;
  isActive: boolean;
  tags: string[];
}