import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { SlotsController } from './slots.controller';

/**
 * Owns the production-bloque lifecycle. Exports SlotsService so the order-
 * creation paths (OrdersModule, LinksModule) can stamp new orders with the open
 * bloque.
 */
@Module({
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
