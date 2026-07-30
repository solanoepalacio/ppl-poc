import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  isProductCategory,
  type CreateOrderResponse,
  type DeleteOrderResponse,
  type ProductionTotalsResponse,
  type ReplaceOrderItemsResponse,
  type SlotOrdersResponse,
  type TokenValidationResponse,
} from '@pannico/shared';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReplaceOrderItemsDto } from './dto/replace-order-items.dto';
import { TokenGuard } from './token.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Back-office bloque view; defaults to the open bloque when `slotId` is omitted. */
  @Get()
  getBySlot(@Query('slotId') slotId?: string): Promise<SlotOrdersResponse> {
    return this.ordersService.getOrdersBySlot(slotId);
  }

  /**
   * Back-office per-item production totals for a bloque (defaults to the open one).
   * An optional `category` scopes the totals to one production line (salados /
   * dulces); unknown values are ignored and yield the unscoped totals.
   */
  @Get('production')
  getProductionTotals(
    @Query('slotId') slotId?: string,
    @Query('category') category?: string,
  ): Promise<ProductionTotalsResponse> {
    const scoped = isProductCategory(category) ? category : undefined;
    return this.ordersService.getProductionTotals(slotId, scoped);
  }

  /** Back-office manual order creation (order received off-channel). */
  @Post()
  create(@Body() dto: CreateOrderDto): Promise<CreateOrderResponse> {
    return this.ordersService.createOrder(dto);
  }

  /** Back-office item edit: replaces the order's whole item list. */
  @Patch(':id/items')
  replaceItems(
    @Param('id') id: string,
    @Body() dto: ReplaceOrderItemsDto,
  ): Promise<ReplaceOrderItemsResponse> {
    return this.ordersService.replaceItems(id, dto.items);
  }

  /** Back-office order deletion (removes the order and its items). */
  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string): Promise<DeleteOrderResponse> {
    return this.ordersService.deleteOrder(id);
  }

  /** Customer form bootstrap: token validity + catalog when valid. */
  @Get('by-token/:token')
  validate(@Param('token') token: string): Promise<TokenValidationResponse> {
    return this.ordersService.validateToken(token);
  }

  /** Confirm the order. Guard rejects invalid/closed-bloque/used tokens. */
  @Post('by-token/:token/confirm')
  @HttpCode(200)
  @UseGuards(TokenGuard)
  async confirm(
    @Param('token') token: string,
    @Body() dto: ConfirmOrderDto,
  ): Promise<void> {
    await this.ordersService.confirm(token, dto.items);
  }

  /** Customer chose the WhatsApp fallback (consumes the link). */
  @Post('by-token/:token/whatsapp')
  @HttpCode(200)
  @UseGuards(TokenGuard)
  async whatsapp(@Param('token') token: string): Promise<void> {
    await this.ordersService.denyForWhatsapp(token);
  }
}
