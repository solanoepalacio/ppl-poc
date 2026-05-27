import { IsIn, IsString } from 'class-validator';
import {
  ORDER_STATUSES,
  type OrderStatus,
  type UpdateOrderStatusRequest,
} from '@pannico/shared';

/**
 * `PATCH /orders/:id/status` body. `@IsIn` enforces the shared status set at
 * the edge; the service re-validates with `isOrderStatus` as the source of truth.
 */
export class UpdateOrderStatusDto implements UpdateOrderStatusRequest {
  @IsString()
  @IsIn(ORDER_STATUSES as readonly string[])
  status!: OrderStatus;
}
