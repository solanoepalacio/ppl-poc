import { Injectable, Logger } from '@nestjs/common';

/** Everything the agent needs from the environment. Absent means "not set up". */
export type WhatsappConfig = {
  verifyToken: string;
  appSecret: string;
  accessToken: string;
  phoneNumberId: string;
  /** Fully-qualified, version included — every Graph call hangs off this. */
  graphBaseUrl: string;
};

/**
 * Reads the agent's credentials from the environment, once, and reports whether
 * it is configured at all.
 *
 * The agent is **inert** unless every value is present. Half a configuration is
 * worse than none: an endpoint that answers Meta's verification but cannot check
 * a signature, or accepts deliveries but cannot reply, looks alive while doing
 * the wrong thing. Reported at startup rather than at the first delivery, so
 * "the agent did nothing" is answerable without reproducing a message.
 *
 * Nothing here is ever logged. `describe()` exists so the state can be seen
 * without any caller reaching for the values to print them.
 */
@Injectable()
export class WhatsappConfigService {
  private readonly logger = new Logger('WhatsappConfig');
  private readonly config: WhatsappConfig | null;

  constructor() {
    // Named META_* rather than WHATSAPP_* so one .env can serve this and the
    // other project already talking to the same API.
    const verifyToken = process.env.META_VERIFY_TOKEN?.trim();
    const appSecret = process.env.META_APP_SECRET?.trim();
    const accessToken = process.env.META_ACCESS_TOKEN?.trim();
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID?.trim();

    this.config =
      verifyToken && appSecret && accessToken && phoneNumberId
        ? {
            verifyToken,
            appSecret,
            accessToken,
            phoneNumberId,
            // The version is pinned rather than floating: when Meta ships a new
            // one and changes a field, this keeps working until we choose to
            // move. The host is overridable only so a test can point at a mock.
            graphBaseUrl: `${
              process.env.META_GRAPH_BASE_URL?.trim() ||
              'https://graph.facebook.com'
            }/${process.env.META_API_VERSION?.trim() || 'v21.0'}`,
          }
        : null;

    // Names only — never values.
    const missing = (
      [
        ['META_VERIFY_TOKEN', verifyToken],
        ['META_APP_SECRET', appSecret],
        ['META_ACCESS_TOKEN', accessToken],
        ['META_PHONE_NUMBER_ID', phoneNumberId],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([name]) => name);

    if (this.config) this.logger.log('WhatsApp agent configured and listening.');
    else
      this.logger.warn(
        `WhatsApp agent inert — missing: ${missing.join(', ')}.`,
      );
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  /** Throws rather than returning null, so callers cannot forget to check. */
  require(): WhatsappConfig {
    if (!this.config) {
      throw new Error('WhatsApp agent is not configured.');
    }
    return this.config;
  }
}
