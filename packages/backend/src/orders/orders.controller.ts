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
import type {
  CreateOrderResponse,
  DayViewResponse,
  DeleteOrderResponse,
  ProductionTotalsResponse,
  ReplaceOrderItemsResponse,
  TokenValidationResponse,
  UpdateOrderStatusResponse,
} from '@pannico/shared';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReplaceOrderItemsDto } from './dto/replace-order-items.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { TokenGuard } from './token.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Back-office day view; defaults to today when `day` is omitted. */
  @Get()
  getByDay(@Query('day') day?: string): Promise<DayViewResponse> {
    return this.ordersService.getOrdersByDay(day);
  }

  /** Back-office per-item production totals for a day (defaults to today). */
  @Get('production')
  getProductionTotals(
    @Query('day') day?: string,
  ): Promise<ProductionTotalsResponse> {
    return this.ordersService.getProductionTotals(day);
  }

  /** Back-office manual order creation (order received off-channel). */
  @Post()
  create(@Body() dto: CreateOrderDto): Promise<CreateOrderResponse> {
    return this.ordersService.createOrder(dto);
  }

  /** Back-office manual status update for an order (free-form transitions). */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<UpdateOrderStatusResponse> {
    return this.ordersService.updateStatus(id, dto.status);
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

  /** Confirm the order (→ issued). Guard rejects invalid/expired/used tokens. */
  @Post('by-token/:token/confirm')
  @HttpCode(200)
  @UseGuards(TokenGuard)
  async confirm(
    @Param('token') token: string,
    @Body() dto: ConfirmOrderDto,
  ): Promise<{ status: 'issued' }> {
    await this.ordersService.confirm(token, dto.items);
    return { status: 'issued' };
  }

  /** Customer chose the WhatsApp fallback (→ denied). */
  @Post('by-token/:token/whatsapp')
  @HttpCode(200)
  @UseGuards(TokenGuard)
  async whatsapp(
    @Param('token') token: string,
  ): Promise<{ status: 'denied' }> {
    await this.ordersService.denyForWhatsapp(token);
    return { status: 'denied' };
  }
}
