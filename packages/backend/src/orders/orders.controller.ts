import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  DayViewResponse,
  TokenValidationResponse,
} from '@pannico/shared';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { TokenGuard } from './token.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Back-office day view; defaults to today when `day` is omitted. */
  @Get()
  getByDay(@Query('day') day?: string): Promise<DayViewResponse> {
    return this.ordersService.getOrdersByDay(day);
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
