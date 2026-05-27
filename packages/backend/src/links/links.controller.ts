import { Body, Controller, Post } from '@nestjs/common';
import type { CreateLinkResponse } from '@pannico/shared';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto): Promise<CreateLinkResponse> {
    return this.linksService.createLink(dto.phone);
  }
}
