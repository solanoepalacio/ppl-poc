import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ORDER_STATUSES,
  type CreateOrderRequest,
  type OrderStatus,
} from '@pannico/shared';
import { OrderItemDto } from './order-item.dto';

/**
 * `POST /orders` body. `items` and `status` are optional; the service defaults
 * an absent status to `issued` and validates items against the active catalog.
 */
export class CreateOrderDto implements CreateOrderRequest {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(ORDER_STATUSES as readonly string[])
  status?: OrderStatus;
}
