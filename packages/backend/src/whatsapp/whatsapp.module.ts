import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinksModule } from '../links/links.module';
import { ORDER_NOTIFIER } from '../orders/order-notifier';
import { WhatsappConfigService } from './whatsapp.config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

/**
 * The agent, and the one thing it offers the rest of the app: it registers
 * itself as the thing that hears about confirmed orders. `order-notifier` is a
 * token and an interface with no dependencies of its own, so this import does
 * not drag the order path in here, and nothing in the order path names WhatsApp.
 * Removing the agent is deleting this folder and the import of this module.
 */
@Module({
  imports: [PrismaModule, LinksModule],
  controllers: [WhatsappController],
  providers: [
    WhatsappConfigService,
    WhatsappService,
    { provide: ORDER_NOTIFIER, useExisting: WhatsappService },
  ],
  exports: [ORDER_NOTIFIER],
})
export class WhatsappModule {}
