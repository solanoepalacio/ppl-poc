import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { ConfirmOrderItem, ConfirmOrderRequest } from '@pannico/shared';

export class ConfirmOrderItemDto implements ConfirmOrderItem {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ConfirmOrderDto implements ConfirmOrderRequest {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConfirmOrderItemDto)
  items!: ConfirmOrderItemDto[];
}
