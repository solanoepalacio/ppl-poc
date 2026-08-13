import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

/**
 * Owns the product catalog. It takes over `GET /products` from the orders
 * module, which only ever had it because the catalog had no home of its own —
 * the customer form needed the list and nothing else read it.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
