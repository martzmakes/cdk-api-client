export interface UpdateItemRequest {
  pk: string;
  sk: string;
  name: string;
  description: string;
  count: number;
  isActive?: boolean;
}