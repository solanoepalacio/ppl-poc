import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import type {
  CloseSlotResponse,
  SetExistenceRequest,
  Slot,
  SlotExistenceResponse,
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

  /** The manually-entered existencia recorded for a bloque. */
  @Get(':id/existence')
  getExistence(@Param('id') id: string): Promise<SlotExistenceResponse> {
    return this.slotsService.getExistence(id);
  }

  /** Replaces a bloque's existencia (open bloque only). */
  @Put(':id/existence')
  setExistence(
    @Param('id') id: string,
    @Body() body: SetExistenceRequest,
  ): Promise<SlotExistenceResponse> {
    return this.slotsService.setExistence(id, body.items ?? []);
  }
}
