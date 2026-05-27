import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  DayViewResponse,
  ProductionTotalsResponse,
  TokenValidationResponse,
  UpdateOrderStatusResponse,
} from '@pannico/shared';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
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

  /** Back-office manual status update for an order (free-form transitions). */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<UpdateOrderStatusResponse> {
    return this.ordersService.updateStatus(id, dto.status);
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
