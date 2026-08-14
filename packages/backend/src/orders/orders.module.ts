import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TokenService } from './token.service';
import { TokenGuard } from './token.guard';
import { SlotsModule } from '../slots/slots.module';
import { ClientsModule } from '../clients/clients.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [SlotsModule, ClientsModule, WhatsappModule],
  controllers: [OrdersController],
  providers: [OrdersService, TokenService, TokenGuard],
  exports: [TokenService],
})
export class OrdersModule {}
