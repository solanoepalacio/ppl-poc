import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinksModule } from '../links/links.module';
import { WhatsappConfigService } from './whatsapp.config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [PrismaModule, LinksModule],
  controllers: [WhatsappController],
  providers: [WhatsappConfigService, WhatsappService],
})
export class WhatsappModule {}
