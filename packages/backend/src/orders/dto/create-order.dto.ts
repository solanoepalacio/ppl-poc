import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { type CreateOrderRequest } from '@pannico/shared';
import { OrderItemDto } from './order-item.dto';

/**
 * `POST /orders` body. `items` is optional; the service validates items against
 * the active catalog.
 */
export class CreateOrderDto implements CreateOrderRequest {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  message?: string;
}
