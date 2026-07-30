import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import type { ConfirmOrderItem } from '@pannico/shared';

/**
 * A single product line shared by the back-office create/edit-items DTOs:
 * a catalog `productId` with a positive integer `quantity`. The service
 * re-validates the productId against the active catalog as the source of truth.
 */
export class OrderItemDto implements ConfirmOrderItem {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
