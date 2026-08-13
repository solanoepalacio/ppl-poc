import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  Client,
  ClientByPhoneResponse,
  DeleteClientResponse,
  ManagedClient,
} from '@pannico/shared';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/create-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * The active directory for the back-office order form by default; the whole
   * directory, retired clients and order counts included, for the Clientes view.
   */
  @Get()
  list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Client[] | ManagedClient[]> {
    return includeInactive === 'true'
      ? this.clientsService.listManaged()
      : this.clientsService.list();
  }

  /**
   * Resolves an inbound message's phone number to its client, so an automated
   * caller can discard messages from numbers the directory does not know.
   *
   * An unknown number answers `{ found: false }` at 200 rather than 404: it is
   * the expected outcome for a stranger, not a failure, and the read-only token
   * validation endpoint already reports "no match" in its body for the same
   * reason. Declared before any `:id` route would be, so a literal `by-phone`
   * cannot be swallowed as an id.
   */
  @Get('by-phone/:phone')
  findByPhone(@Param('phone') phone: string): Promise<ClientByPhoneResponse> {
    return this.clientsService.findByPhone(phone);
  }

  @Post()
  create(@Body() dto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(id, dto);
  }

  /** Deletes the client, or retires it when orders reference it. */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteClientResponse> {
    return this.clientsService.remove(id);
  }
}
