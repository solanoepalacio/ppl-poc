import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinksModule } from '../links/links.module';
import { IntentModule } from '../intent/intent.module';
import { WhatsappConfigService } from './whatsapp.config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [PrismaModule, LinksModule, IntentModule],
  controllers: [WhatsappController],
  providers: [WhatsappConfigService, WhatsappService],
  // Exported for `OrdersModule`, which calls `sendOrderConfirmation` once an
  // order is confirmed. The dependency runs that way round on purpose:
  // `whatsapp/` must not import `orders/`, or the two close a cycle.
  exports: [WhatsappService],
})
export class WhatsappModule {}
