import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { SlotsModule } from '../slots/slots.module';

@Module({
  imports: [SlotsModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
