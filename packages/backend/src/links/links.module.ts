import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { SlotsModule } from '../slots/slots.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [SlotsModule, ClientsModule],
  controllers: [LinksController],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
