import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { type CreateProductRequest } from '@pannico/shared';

/**
 * `POST /products` body.
 *
 * `category` is a plain string here and narrowed to the union in the service,
 * the same way `Slot.status` is: SQLite has no enums, so the union lives in
 * `@pannico/shared` and is checked at the boundary.
 */
export class CreateProductDto implements CreateProductRequest {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: CreateProductRequest['category'];

  /** Absent means zero: produce only what customers order. */
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;
}

/** `PATCH /products/:id` body — every field optional. */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: CreateProductRequest['category'];

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
