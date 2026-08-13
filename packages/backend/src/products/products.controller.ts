import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  DeleteProductResponse,
  ManagedProduct,
  Product,
} from '@pannico/shared';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * The active catalog by default — this is what the customer form reads, so a
   * retired product must not appear here. The whole catalog, retired products
   * and order counts included, is behind the flag, for the Productos view.
   */
  @Get()
  list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<Product[] | ManagedProduct[]> {
    return includeInactive === 'true'
      ? this.productsService.listManaged()
      : this.productsService.list();
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, dto);
  }

  /** Deletes the product, or retires it when orders reference it. */
  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteProductResponse> {
    return this.productsService.remove(id);
  }
}
