import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { type CreateClientRequest } from '@pannico/shared';

/**
 * `POST /clients` body. No slug: it is derived from `name` by the service, and
 * accepting one would let a caller set the natural key data migrations upsert on.
 */
export class CreateClientDto implements CreateClientRequest {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Free-form as typed; the service reduces it to digits. */
  @IsOptional()
  @IsString()
  phone?: string;
}

/** `PATCH /clients/:id` body — every field optional, none of them the slug. */
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  // Nullable on purpose: `null` clears the number, where omitting the key leaves
  // it alone. `@IsString()` would reject the clear, so the type is widened and
  // the service normalizes.
  @IsOptional()
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
