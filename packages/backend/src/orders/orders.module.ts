import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';
import { TokenService } from './token.service';
import { TokenGuard } from './token.guard';

@Module({
  controllers: [OrdersController, ProductsController],
  providers: [OrdersService, TokenService, TokenGuard],
  exports: [TokenService],
})
export class OrdersModule {}
