## 1. Dependencies and configuration

- [x] 1.1 Add `@langchain/core`, `@langchain/ollama`, `@langchain/anthropic` and `langwatch` to `packages/backend/package.json`; install and confirm `yarn workspace @pannico/backend run lint` still passes
- [x] 1.2 Create `src/llm/llm.config.ts` — an `LlmConfigService` modelled on `WhatsappConfigService`: reads `LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TIMEOUT_MS` once at construction, decides completeness **per provider**, exposes `enabled` and a throwing `require()`, and logs missing variables by name only
- [x] 1.3 Add the LangWatch keys (`LANGWATCH_API_KEY`, and the endpoint override if the deployment needs one) to the same config surface, with absence meaning "no tracing" rather than "not configured"
- [x] 1.4 Document every new variable in `.env.example` and the README, including that an incomplete LLM configuration silences the agent rather than falling back to replying
- [x] 1.5 Pass the new variables through `docker-compose.yml` to the backend service, and confirm the backend container can reach the configured `LLM_BASE_URL`

## 2. LLM module

- [x] 2.1 Create `src/llm/llm.module.ts` exporting an `LlmService`, with no import of `whatsapp/`, `orders/` or `links/`
- [x] 2.2 Build the chat model from config: `ChatOllama` or `ChatAnthropic` behind `BaseChatModel`, selected by `LLM_PROVIDER`, with the model name from `LLM_MODEL`
- [x] 2.3 Configure the provider to omit reasoning where it supports it (`think: false` on Ollama; low effort on the hosted provider) and set an output budget with room for reasoning the model performs anyway
- [x] 2.4 Pass `keep_alive: -1` on Ollama calls so an idle model is not unloaded between messages
- [x] 2.5 Define the result type: a success carrying the answer text, or a failure carrying a distinguishable kind (`unconfigured` / `timeout` / `transport` / `provider-error` / `empty-answer`)
- [x] 2.6 Enforce the configurable timeout around every call, and return the `timeout` failure rather than propagating an abort
- [x] 2.7 Return only the answer text: strip a provider's separate reasoning field, and treat an empty answer as `empty-answer` rather than returning `''`
- [x] 2.8 Call `setupObservability` at the top of `src/main.ts`, before `NestFactory.create`, guarded so an absent LangWatch key leaves the app working
- [x] 2.9 Attach `LangWatchCallbackHandler` to model calls via `.withConfig({ callbacks: [...] })`
- [x] 2.10 Wrap each call in its own span carrying the outcome, so an attempt that never reached the provider (unconfigured, timed out) still produces a trace
- [x] 2.11 Unit-test `LlmConfigService`: complete config per provider, partial config reported as unconfigured, missing names logged, no values logged

## 3. Intent classifier

- [x] 3.1 Create `src/intent/` with an `OrderIntentClassifier` that depends on `LlmModule` and nothing else; export it from an `IntentModule`
- [x] 3.2 Define the verdict type — `'order' | 'not-order' | 'abstain'` — and the two-value answer vocabulary
- [x] 3.3 Write the Spanish system prompt: two labels, one-word answer, no explanation, written for chat messages with typos, missing accents, greetings attached to requests, and several sentences per message
- [x] 3.4 Implement the strict parse: trim, upper-case, discard a leading reasoning block, match against the vocabulary, and return `abstain` for anything else
- [x] 3.5 Map every `LlmService` failure kind to `abstain`; ensure `classify` cannot throw
- [x] 3.6 Return `abstain` without calling the model when the input has no usable text
- [x] 3.7 Emit a span per classification recording the verdict, including abstains where no inference was attempted, and record the abstain *reason* so it is distinguishable from `not-order`
- [x] 3.8 Unit-test the classifier against a stubbed `LlmService`: each vocabulary value, unknown word, sentence answer, empty answer, reasoning preamble, and each failure kind

## 4. WhatsApp agent: gating the reply

- [x] 4.1 Extend `extractMessages` in `whatsapp.service.ts` to carry the message `type` and, for text messages, the body — keeping the existing `statuses` guard intact
- [x] 4.2 Insert the classification between resolving the client and calling `linkForAgent`; create and send only on an `order` verdict
- [x] 4.3 Extend `InboundOutcome` with the new endings (`not-order`, `abstain` with its reason) and update the controller's `describe` so the log distinguishes them
- [x] 4.4 Confirm the suppression window is untouched by an unanswered message: `markReplied` stays tied to a sent reply, while the `WhatsappInbound` row is still claimed for every message
- [x] 4.5 Move handling off the request path in `whatsapp.controller.ts` so the delivery is acknowledged without waiting for classification, keeping the existing swallow-and-log behaviour
- [x] 4.6 Update `whatsapp.service.spec.ts`: order verdict replies, non-order and abstain verdicts create nothing and send nothing, a non-order message does not suppress the next one, and a redelivery is still ignored

## 5. WhatsApp agent: the order confirmation

- [x] 5.1 Add `sendOrderConfirmation(orderId)` to `WhatsappService`: load the order with its client and items, build the templated Spanish recap, send it
- [x] 5.2 Gate the send on an inbound message from that client's phone inside the service window, querying `WhatsappInbound` by phone and `receivedAt`; skip silently when there is none
- [x] 5.3 Import `WhatsappModule` into `OrdersModule` and call the notifier after the confirm transaction commits, without awaiting it, so the customer's confirm does not wait on Meta
- [x] 5.4 Verify no module cycle is introduced (`whatsapp/` must not import `orders/`) and that the backend still boots with the agent unconfigured
- [x] 5.5 Test: recap sent for a client with a recent inbound, nothing sent and no error for a client without one, a failed send leaves the order confirmed

## 6. Customer confirm flow

- [x] 6.1 Remove the gate from `OrderForm.tsx`: `REVIEW_PAUSE_SECONDS`, `secondsLeft`, the countdown effect, `startReview`, the `reviewing`/`reviewed` states and the `order_review_raised` event; `confirmPressed` submits directly
- [x] 6.2 Keep the summary and its review notice available on demand, and keep the confirm disabled while nothing is selected and while a submission is in progress
- [x] 6.3 Add bounded retry around `confirmOrder` for transport failures and 5xx only, leaving other 4xx un-retried
- [x] 6.4 Treat a 404 as success when it arrives on a retry, and only then — a first-attempt 404 still reaches the invalid-link view
- [x] 6.5 On success, render the success state and then attempt `window.close()`, ignoring a refusal without surfacing anything to the customer
- [x] 6.6 Check the copy in `COPY` for strings left behind by the gate, and confirm the remaining Spanish reads correctly
- [x] 6.7 Manually verify on a phone-sized viewport: one tap submits, and the success state is what remains when the browser refuses to close

## 7. Verification

- [x] 7.1 `yarn workspace @pannico/backend run lint` and `yarn workspace @pannico/backend run test` pass — 232 tests, 8 suites
- [x] 7.2 Typecheck the frontend and the shared package
- [ ] 7.3 Re-run the classifier smoke test against the configured model with a handful of real-shaped Spanish messages, and confirm the verdicts and their traces appear in LangWatch
  - Model half **done**: 11 real-shaped Spanish messages (typos, no accents, greetings glued to
    requests) through the built `OrderIntentClassifier`. `qwen3:32b` with `think: false`:
    **11/11 correct, ~1 s warm, 51 s on the first call after a cold load** — which is Decision 4c
    measured rather than predicted. `keep_alive: -1` confirmed holding (`/api/ps` reports the model
    pinned with no expiry). `.env.example` and the README now name `qwen3:32b`; the design's starting
    choice `gemma4:12b-it-qat` is not on this inference server, which is the re-run its Open
    Questions asked for.
  - `gpt-oss:20b` returned `provider-error` on every message — the host could not load it while
    `qwen3:32b` was pinned. Not a defect: it is the one-resident-model trade-off `keep_alive: -1`
    buys, and it surfaced as an abstain rather than a crash.
  - **LangWatch half blocked**: no `LANGWATCH_API_KEY` available, so no trace has been seen in the
    product. The tracing code path runs unexercised (spans are created against a no-op provider).
- [ ] 7.4 End-to-end against the test number: an ordering message returns a link, a non-ordering message returns silence, and confirming the order sends the recap back to the chat
  - **Blocked**: needs the Meta test number and a real inbound message. Not attempted — the local
    equivalent sends real WhatsApp messages to a real number.
- [x] 7.5 Confirm the closed default holds — with the LLM unconfigured, an inbound message creates nothing and sends nothing, and the startup log names what is missing
  - Verified against a running backend with a signed webhook delivery from a known client:
    `sin veredicto (Alo Bar, unconfigured), sin respuesta`, **zero** outbound send attempts, and the
    delivery acknowledged in 33 ms (which is also 4.5 observed rather than asserted).
    Startup log: `LLM inert — missing: LLM_PROVIDER, LLM_MODEL. …it does not fall back to replying.`
- [x] 7.6 `openspec validate --changes` passes for this change
  - `✓ change/classify-whatsapp-order-intent`. The run as a whole reports one failure, in the
    unrelated in-flight `whatsapp-order-agent` change (three ADDED requirements missing SHALL/MUST).
    Pre-existing — committed in c0758a7 and untouched here.
