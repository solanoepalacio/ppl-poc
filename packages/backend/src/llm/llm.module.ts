import { Module } from '@nestjs/common';
import { LlmConfigService } from './llm.config';
import { LlmService } from './llm.service';

/**
 * The backend's only door to a language model.
 */
@Module({
  providers: [LlmConfigService, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
