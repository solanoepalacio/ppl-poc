import { Controller, Get } from '@nestjs/common';
import type { Product } from '@pannico/shared';
import { OrdersService } from './orders.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Returns the active product catalog. */
  @Get()
  getCatalog(): Promise<Product[]> {
    return this.ordersService.getCatalog();
  }
}
