import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type {
  CloseSlotResponse,
  Slot,
  SlotListResponse,
} from '@pannico/shared';
import { SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  /** All production bloques for the management view, newest first. */
  @Get()
  list(): Promise<SlotListResponse> {
    return this.slotsService.listSlots();
  }

  /** The current open bloque (used as the default selection in the back office). */
  @Get('open')
  open(): Promise<Slot> {
    return this.slotsService.getOpenSlotView();
  }

  /** Closes the current open bloque and opens a fresh one in its place. */
  @Post('close')
  @HttpCode(200)
  async close(): Promise<CloseSlotResponse> {
    const openId = await this.slotsService.getOpenSlotId();
    return this.slotsService.closeSlot(openId);
  }
}
