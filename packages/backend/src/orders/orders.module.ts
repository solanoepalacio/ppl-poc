import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';
import { TokenService } from './token.service';
import { TokenGuard } from './token.guard';
import { SlotsModule } from '../slots/slots.module';
import { ClientsModule } from '../clients/clients.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

/**
 * `WhatsappModule` is imported for the `ORDER_NOTIFIER` it provides, and for
 * nothing else — `OrdersService` knows only the token and its interface. It is
 * the single line to delete along with the agent.
 */
@Module({
  imports: [SlotsModule, ClientsModule, WhatsappModule],
  controllers: [OrdersController, ProductsController],
  providers: [OrdersService, TokenService, TokenGuard],
  exports: [TokenService],
})
export class OrdersModule {}
