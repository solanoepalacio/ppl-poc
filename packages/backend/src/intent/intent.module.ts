import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { OrderIntentClassifier } from './order-intent.classifier';

/**
 * Where the bakery's own judgement about a message lives.
 *
 * Depends on `LlmModule` and nothing else. The split from `llm/` is deliberate:
 * the prompt here is domain knowledge that will be edited often, the provider
 * wiring there is infrastructure that should be edited rarely.
 */
@Module({
  imports: [LlmModule],
  providers: [OrderIntentClassifier],
  exports: [OrderIntentClassifier],
})
export class IntentModule {}
