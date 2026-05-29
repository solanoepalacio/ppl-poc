import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import type { ReplaceOrderItemsRequest } from '@pannico/shared';
import { OrderItemDto } from './order-item.dto';

/**
 * `PATCH /orders/:id/items` body: the complete desired item list. An empty
 * array is allowed and clears the order's items.
 */
export class ReplaceOrderItemsDto implements ReplaceOrderItemsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
