import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { WhatsappConfigService } from './whatsapp.config';
import {
  WhatsappService,
  type InboundMessage,
  type RecordedMessage,
} from './whatsapp.service';

/** Express with the raw body kept (see `rawBody: true` in main.ts). */
type RawRequest = Request & { rawBody?: Buffer };

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger('WhatsappWebhook');

  constructor(
    private readonly config: WhatsappConfigService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /**
   * Meta's registration handshake: echo the challenge, but only for the right
   * verify token — echoing is what proves we own the endpoint.
   *
   * 404 when the agent is not configured, so an unconfigured deployment looks
   * like no endpoint at all rather than a broken one.
   */
  @Get('webhook')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    if (!this.config.enabled) throw new NotFoundException();
    const echo = this.whatsapp.verifyChallenge(mode, token, challenge);
    if (echo === null) {
      this.logger.warn('Verification rejected: wrong mode or verify token.');
      throw new ForbiddenException();
    }
    return echo;
  }

  /**
   * Inbound deliveries.
   *
   * Answers 200 for everything it manages to write down, whatever becomes of it
   * afterwards. Meta retries a delivery until it is acknowledged, for up to
   * seven days, so returning an error over a message we recorded but could not
   * act on buys a week of the same message arriving again — and the record is
   * already there to act on at leisure.
   *
   * Two deliveries do not get a 200. A bad signature, because that is not a
   * delivery we failed to process but a request we have no reason to believe
   * came from Meta. And a message we could not record at all, because that one
   * leaves nothing behind: no row to inspect, nothing for a later pass to pick
   * up, and redelivery is the only thing that can bring it back.
   */
  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Req() req: RawRequest,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<string> {
    if (!this.config.enabled) throw new NotFoundException();

    const raw = req.rawBody;
    if (!raw) {
      // Without the raw bytes the signature cannot be checked honestly, and
      // checking it against a re-serialisation would be theatre.
      this.logger.error('Raw body unavailable; refusing to process.');
      throw new ForbiddenException();
    }
    if (!this.whatsapp.verifySignature(raw, signature)) {
      this.logger.warn('Delivery rejected: bad or missing signature.');
      throw new ForbiddenException();
    }

    // Recorded first, on the request path, then acted on after the response.
    //
    // Recording is a read and an insert, so the acknowledgement stays prompt,
    // and it is the half worth making Meta wait for: it is what turns a
    // redelivery into a no-op, and it is the only part whose failure they can do
    // anything about. Acting is the half that must not be waited on — it calls a
    // language model, whose latency is neither bounded by nor visible to Meta,
    // and Meta reads a slow acknowledgement as a failed delivery and sends the
    // message again, so waiting would risk redelivering a message already being
    // acted on. Nothing in the outcome reaches the response either way: the body
    // is a constant.
    //
    // What a crash mid-processing costs is now the *work* rather than the
    // message. The row is there, with its text and no verdict on it, which is
    // the shape a sweep would look for. Nothing does that sweep today — the
    // message still waits on a person — but the record it would need exists.
    const { recorded, unrecorded } = await this.record(
      this.whatsapp.extractMessages(req.body),
    );
    void this.process(recorded);

    if (unrecorded > 0) {
      // Not acknowledged, so Meta brings the delivery back. Whatever did land
      // dedupes itself away on the way through, so the second pass costs only
      // the messages that are actually missing.
      throw new ServiceUnavailableException();
    }
    return 'EVENT_RECEIVED';
  }

  /**
   * Writes down every message in the delivery, and reports which of them are
   * ours to act on.
   *
   * A message already recorded is dropped here rather than passed on: it is
   * being handled, or was handled, by whoever recorded it first.
   */
  private async record(messages: InboundMessage[]): Promise<{
    recorded: RecordedMessage[];
    unrecorded: number;
  }> {
    const recorded: RecordedMessage[] = [];
    let unrecorded = 0;
    for (const message of messages) {
      try {
        const intake = await this.whatsapp.recordMessage(message);
        if (intake.kind === 'duplicate') {
          this.logger.log(`${message.wamid}: ya registrado, ignorado`);
          continue;
        }
        recorded.push(intake.message);
      } catch (e) {
        unrecorded += 1;
        this.logger.error(
          `${message.wamid}: no se pudo registrar — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return { recorded, unrecorded };
  }

  /** Acts on the recorded messages after the delivery has been acknowledged. */
  private async process(messages: RecordedMessage[]): Promise<void> {
    for (const message of messages) {
      try {
        const outcome = await this.whatsapp.processMessage(message);
        this.logger.log(`${message.wamid}: ${describe(outcome)}`);
      } catch (e) {
        // Swallowed on purpose: the delivery is acknowledged and there is no
        // response left to fail, so this log is the only place it can surface.
        // The row survives it, unlike the outcome.
        this.logger.error(
          `${message.wamid}: failed — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
}

const describe = (o: Awaited<ReturnType<WhatsappService['processMessage']>>) => {
  switch (o.kind) {
    case 'agent-disabled':
      return 'agente deshabilitado, mensaje registrado sin responder';
    case 'suppressed':
      return 'suprimido (respuesta reciente al mismo remitente)';
    case 'unknown-sender':
      return 'remitente desconocido, sin respuesta';
    // The two classified silences, kept apart. Both leave the message to a
    // person, but only one of them means the agent is working: a run of `sin
    // veredicto` is the shape a broken or unreachable model takes in this log.
    case 'not-order':
      return `no es un pedido (${o.clientName}), sin respuesta`;
    case 'abstain':
      return `sin veredicto (${o.clientName}, ${o.reason}), sin respuesta`;
    case 'replied':
      return `link enviado a ${o.clientName}${o.reused ? ' (reusado)' : ' (nuevo)'}`;
  }
};
