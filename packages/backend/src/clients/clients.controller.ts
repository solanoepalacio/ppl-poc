import { Controller, Get } from '@nestjs/common';
import type { Client } from '@pannico/shared';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /** Returns the active client directory for the back-office order form. */
  @Get()
  list(): Promise<Client[]> {
    return this.clientsService.list();
  }
}
