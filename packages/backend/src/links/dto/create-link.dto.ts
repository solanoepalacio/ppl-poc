import { IsNotEmpty, IsString } from 'class-validator';
import type { CreateLinkRequest } from '@pannico/shared';

export class CreateLinkDto implements CreateLinkRequest {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
