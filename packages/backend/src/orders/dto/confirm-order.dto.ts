import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  ConfirmOrderItem,
  ConfirmOrderRequest,
  OrderMeasure,
} from '@pannico/shared';

export class ConfirmOrderItemDto implements ConfirmOrderItem {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  /**
   * What the quantity is counted in. Absent means units, so a caller that knows
   * nothing about packs keeps working; the service converts and never stores it.
   */
  @IsOptional()
  @IsIn(['unit', 'pack'])
  measure?: OrderMeasure;
}

export class ConfirmOrderDto implements ConfirmOrderRequest {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConfirmOrderItemDto)
  items!: ConfirmOrderItemDto[];
}
