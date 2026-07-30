import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

/**
 * Owns the client directory. Exports ClientsService so the order-creation paths
 * (OrdersModule, LinksModule) can validate a submitted client before binding an
 * order to it.
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
