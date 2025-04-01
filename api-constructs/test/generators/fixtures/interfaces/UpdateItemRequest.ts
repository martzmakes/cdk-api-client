export interface UpdateItemRequest {
  id: string;
  name: string;
  description: string;
  count: number;
  isActive?: boolean;
}