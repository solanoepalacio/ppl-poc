## Context

The agent today is a straight line: webhook → signature check → claim the wamid →
resolve the client → `linksForAgent` → send. Every step is deterministic and
local. This change inserts the first call to something outside the process that
can be slow, can be wrong, and can be down — on the webhook's critical path, in
a handler that must answer Meta within seconds and must answer 200 whatever
happens.

Three constraints shape everything below:

- **The proposal's fallback is closed.** No verdict → no link, no reply, and a
  person answers from the same inbox. Every failure mode therefore has the same
  landing place, which makes the error handling simple and the observability
  load-bearing: LangWatch is where *not an order* and *couldn't decide* are told
  apart, so a failed inference has to produce a trace, not just a silence.
- **The 24-hour service window.** Free-form WhatsApp messages are only allowed
  inside the window opened by the customer's own inbound message. This is what
  makes the outbound order confirmation conditional rather than automatic — see
  Decision 8.
- **PoC scale.** One bakery, a handful of messages per bloque. Nothing here
  needs a queue, a worker, or a retry table, and adding them would be the
  expensive kind of correct.

## Goals / Non-Goals

**Goals:**

- A domain-agnostic `llm/` module that is the backend's only door to a model,
  with the concrete provider and model chosen by environment variables.
- A classifier that answers *order / not order / no verdict* for a Spanish
  free-text message, and never throws at its caller.
- LangWatch traces for every classification attempt, including the ones that
  produced no answer.
- The whatsapp agent gains one decision point and one new outbound message; it
  learns nothing about models, prompts or tracing.
- The customer's confirm becomes one tap that submits, survives a flaky network,
  and gets out of the way.

**Non-Goals:**

- Letting the model write any customer-facing text. Copy stays templated.
- Transcribing audio notes or reading images. A message with no text is not
  classified (Decision 7).
- Extracting the order *contents* from the message. The link is still where the
  order is built.
- Conversation state. Each message is classified on its own, with no history.
- Evaluating prompt quality in CI. There is no labelled corpus yet; LangWatch is
  how the first one gets collected.

## Decisions

### 1. Two new modules, not one

`llm/` exposes an injectable that turns a prompt into text and knows nothing
about bloques, clients or WhatsApp. `intent/` owns the classifier: the Spanish
prompt, the label vocabulary, the parse, and the abstain rule. `whatsapp/`
imports `intent/` and never imports `llm/`.

The proposal names these as two capabilities and the split holds up in code: the
prompt is domain knowledge that will be edited often, the provider wiring is
infrastructure that should be edited rarely. Folding the classifier into
`whatsapp/` would be one fewer module but would put a prompt about bakery orders
inside the module that parses Meta's webhook envelope, and would make the second
classifier — whenever it arrives — a copy-paste.

### 2. Ollama first, provider selected by env, LangChain as the seam

Implementation and testing run against a **self-hosted Ollama**
(`@langchain/ollama`'s `ChatOllama`), with a hosted provider
(`@langchain/anthropic`'s `ChatAnthropic`) as the other supported option. Both
sit behind LangChain's `BaseChatModel`, which is the whole point of the
dependency: the classifier is written once and neither knows nor asks which one
answered.

`LLM_PROVIDER` selects the class; `LLM_MODEL` names the model; `LLM_BASE_URL`
and `LLM_API_KEY` carry the rest. Which of those matter is provider-dependent —
see Decision 5 — and that asymmetry is the reason "is the LLM configured?" is a
question the provider answers rather than a check for one variable.

Running local first is the right order for this change: a classifier is the
cheapest possible LLM workload (a few hundred input tokens, one word out), so
the interesting question is not cost but whether a small model can hold the
distinction in Argentine Spanish with typos and voice-note transcripts. That is
answerable on a laptop, and answering it locally keeps customers' WhatsApp
messages on the bakery's own hardware while we find out.

**The inference server is reachable only from the backend, and where it lives is
configuration.** `LLM_BASE_URL` names it; nothing in this design depends on what
that value is, and no other part of the system talks to it. It sits on the same
side of the trust boundary as the database — the backend calls it, and no client
ever does.

### 3. The model returns a bare label, not a tool call

The classifier asks for exactly one of two Spanish-free tokens (`PEDIDO` /
`NO_PEDIDO`) and parses the trimmed, upper-cased response against that set.
Anything else — extra prose, a third word, an empty string — is *no verdict*.

The obvious alternative is LangChain's `withStructuredOutput`, which is
implemented as a forced tool call on both providers. It buys schema validation we
do not need for a two-member enum, and it costs on both ends: hosted models
interact badly with tool-calling when thinking is disabled (the call can come
back as plain text and silently never run), and small local models are weakest
exactly at tool-calling — a 4B model that classifies well can still fail to emit
a syntactically valid call. Forcing structured output would make the *format* a
second thing that can fail, on the axis where the local model is worst, to
validate an enum a string comparison already validates.

With fail-closed in place, an unparseable answer is safe — it is an abstain, and
abstains are the thing LangWatch is watching.

### 4. Reasoning models will spend the output budget, and will write into the answer

A classifier whose entire output is one word invites a tiny token cap. On a
reasoning model that is a trap, and it springs differently on each provider:

- **Hosted (Anthropic):** thinking counts against `max_tokens`. A cap sized for
  one word truncates *inside* the thinking block and returns nothing.
- **Local (Ollama reasoning models — the `qwen3` / `deepseek-r1` family):**
  reasoning is emitted **into the response text** as a `<think>…</think>` block.
  A strict parser handed that text sees no label and abstains — on every
  message, forever, while the model is answering correctly.

Both produce the same symptom (universal abstain) for a reason that looks nothing
like a token budget, and the second would be a silent, total failure that
fail-closed renders as "the agent just never replies".

So, two rules rather than one setting: **turn reasoning off where the provider
supports it** (Ollama's `think: false`; low effort on a hosted model, leaving
thinking itself on), and **make the parser tolerant regardless** — strip a
leading think block before matching, and give the token cap room for reasoning
the model may do anyway (order of hundreds of tokens, not ten). The parser must
not depend on a provider flag having been honoured.

This is measured, not predicted. With `think: true` and
`num_predict: 512`, `qwen3.5:9b` spent 2,189 bytes on reasoning for one message
and returned **empty content** — the label never got emitted inside the budget.
Fail-closed turns that into an abstain, which is the safe outcome and an
invisible one: the model was working and the agent said nothing.

### 4b. Reasoning-off is a per-model decision, and it is not free

The same test says the "just turn reasoning off" rule cannot be applied blindly.
Seven representative Spanish messages, `think: false`, temperature 0:

| Model | Correct | Latency (warm) | Notes |
|---|---|---|---|
| `gemma4:12b-it-qat` | 7/7 | ~3–5 s | |
| `qwen3.5:9b` | 5/7 | ~0.7 s | Missed two unambiguous orders |

`qwen3.5:9b` classified *"hola necesito 3 docenas de facturas para mañana"* as
**not an order** — reproducibly, three runs out of three. Switching thinking back
on fixed that message and cost 10–15 s per classification. So for that model the
choice is between fast-and-wrong and slow-and-truncating, while `gemma4:12b-it-qat`
is simply right with reasoning off.

**Starting model: `gemma4:12b-it-qat`, `think: false`.** Seven messages is a
smoke test, not an eval — it is enough to pick a starting point and nowhere near
enough to trust one. It does establish the shape of the risk: the failures land
in the *miss a real order* direction, which fail-closed renders as silence, which
is exactly the failure LangWatch has to make visible.

### 4c. A cold model is the default state, so `keep_alive` is load-bearing

Ollama unloads an idle model after about five minutes and the host holds one
resident at a time. First call after that costs **15 s (qwen) to 30 s (gemma)**
versus 3–5 s warm.

A bakery's WhatsApp goes quiet for hours. Sparse traffic against a five-minute
idle timer means *nearly every customer message is a cold start* — the warm
numbers above would almost never be the ones customers experience. Paired with a
few-second timeout and fail-closed, the agent would be silent by default and
correct only in tests, where the messages arrive back to back.

So the classification call passes **`keep_alive: -1`**, pinning the model in VRAM
rather than paying a cold load per customer. The timeout in Decision 5 is sized
for a warm model on that assumption; if the model is evicted anyway (a second
model loaded, the host restarted), the cold call exceeds the timeout and
abstains — silence, a trace, and a person answering, which is the same landing
place as every other failure.

### 5. The classifier's contract is a three-valued verdict, and it never throws

`classify(text)` returns `'order' | 'not-order' | 'abstain'`. Every failure —
unconfigured, network error, provider error, timeout, unparseable answer — maps
to `abstain`. There is no error path out of it, because the one caller has
nothing to do with an exception that it would not also do with an abstain.

A **hard timeout** (a few seconds, configurable) bounds the call. It exists to
protect the webhook, not the model: past it, we would rather be silent and let a
person answer than keep Meta waiting.

**"Unconfigured" is a question the provider answers.** There is no single
credential to test for — Ollama needs a reachable base URL and a model name and
has no key at all, while a hosted provider needs a key and a model and defaults
its URL. So the LLM module follows the pattern `WhatsappConfigService` already
established: read the environment once at startup, decide **per provider**
whether the configuration is complete, log the verdict by variable *name* only,
and expose a single `enabled` boolean plus a `require()` that throws rather than
letting a caller forget to check. Half a configuration counts as none — a base
URL with no model is not a working classifier, and treating it as one produces a
failure at the first inbound message instead of at boot.

Reachability is deliberately **not** part of that check. Whether the inference
server answers is a runtime fact that changes without a restart; probing it at
boot would only move a timeout earlier and produce a "configured" flag that goes
stale the moment the server does. An unreachable server is a per-call failure,
which is to say an abstain with a trace attached.

### 6. LangWatch: the callback handler, plus a span the handler cannot emit

`setupObservability({ serviceName, langwatch: { apiKey } })` from
`langwatch/observability/node` runs at the top of `main.ts`, before
`NestFactory.create`, so the tracer provider exists before anything is
instantiated. Individual calls carry
`.withConfig({ callbacks: [new LangWatchCallbackHandler()] })` from
`langwatch/observability/instrumentation/langchain`.

The handler alone is not enough for what the proposal asks. It traces model
calls — so it cannot trace the cases where **no call was made**: the module
unconfigured, or the call abandoned at the timeout before a result. Those are
exactly the abstains worth seeing. So the classifier wraps each attempt in its
own span and records the verdict on it, with the model call nested inside when
there is one. The trace therefore exists for every inbound message that reached
the classifier, whatever happened next.

`LANGWATCH_API_KEY` absent means no tracing and a working classifier — the same
inert-unless-configured rule the Meta credentials already follow.

### 7. Only text is classified

`extractMessages` currently keeps `wamid` and `from`; it grows the message `type`
and, for text messages, the body. A message that carries no text — audio, image,
sticker, location, a reaction — is not sent to the model at all: it abstains
directly, which under fail-closed means silence and a person reading the chat.

Voice notes are the obvious gap and the obvious temptation. Transcription is a
second model, a second failure mode and a media download against Meta's API; it
is out of scope here and the fail-closed default degrades to exactly today's
manual handling.

### 8. The order confirmation is conditional on the service window

Outbound free-form messages are only permitted inside the 24 hours opened by the
customer's last inbound message. A back-office-generated link goes to customers
who never messaged us, and a confirmation sent to one of those would be rejected
by Meta — not a silent no-op, a failed send in the logs.

So the confirmation is sent only when the order's client has an inbound message
inside the window. `WhatsappInbound` already records `from` and `receivedAt`, so
this is a query against a table we keep, not new state. When there is no recent
inbound, nothing is sent and nothing is logged as an error — it is the expected
case, not a failure.

**Direction of dependency:** `OrdersModule` imports `WhatsappModule` and calls a
narrow `sendOrderConfirmation(orderId)`. `whatsapp/` does not import `orders/`,
so there is no cycle. An event emitter would decouple the two further, but at
PoC size it adds an indirection whose only reader is one call site.

**Timing:** fired after the confirm transaction commits, and **not awaited** —
the customer's tap should not wait on Meta's API, least of all now that a
successful confirm closes their window.

### 9. A message that is not an order consumes nothing

The suppression window exists so that "hola" / "quiero pedir" / "?" typed in a
row produce one reply, and it is armed by `markReplied` — which only runs when a
reply actually went out. A non-order verdict sends nothing, so it marks nothing:
a customer who says "gracias" and then decides to order ten seconds later is
served immediately.

This is the deliberate choice, not an accident of where the check sits. The
window is there to stop *us* answering three times, and an abstain is not an
answer. The cost is that a chatty customer produces one classification per
message; at PoC volume, against a local model, that is not a cost.

The `WhatsappInbound` row is still claimed for every message regardless of
verdict — that row is the redelivery guard, keyed on `wamid`, and it has nothing
to do with whether we replied.

### 10. The webhook acknowledges first and classifies after

The controller currently awaits `handleMessage` before returning 200. With
inference on that path, Meta waits on a model. Nothing in the outcome reaches
the response — the body is a constant and errors are already swallowed — so the
handler moves off the request path: extract the messages, return 200, process
after.

The cost is that a crash mid-processing loses that message, with no redelivery
to save it (the 200 already went out). That is survivable precisely because of
fail-closed: a lost message is an unanswered message, which is a message a person
answers.

### 11. The customer's confirm: one tap, retry, then get out of the way

`REVIEW_PAUSE_SECONDS`, the countdown, the two-activation `confirmPressed` and
the `order_review_raised` event all go. `confirmOrder` gains a bounded retry —
two attempts after the first, short backoff, **only** for network failures and
5xx. A 4xx is not retried: it will fail identically.

**The retry has a trap that has to be designed around.** If an attempt reaches
the server and succeeds but its response is lost, the order is placed and the
token is consumed; the retry then gets a 404, which the current code reads as
"link no longer valid" and shows the invalid-link screen — telling a customer who
just ordered that their link is dead. So: a 404 on a *retry* (never on the first
attempt) is treated as success. The token is single-use and bound to one order,
which is what makes that inference safe.

On success the page renders the confirmation screen and *then* attempts
`window.close()`. The order matters: `window.close()` is only honoured for
script-opened windows, and WhatsApp's in-app browser is not one, so the close
will silently do nothing for exactly the customers this change is aimed at. The
screen is not a fallback we hope not to need — it is the normal outcome there,
and the close is the bonus when the browser allows it.

## Risks / Trade-offs

- **The classifier is wrong in the "order" direction** → a customer who was not
  ordering gets a link and burns their slot for the bloque. Mitigated only by the
  prompt; the fail-closed default does not help here. This is the failure worth
  watching in LangWatch first.
- **The classifier is wrong in the "not order" direction** → a customer who
  wanted to order is met with silence. Mitigated by the shared inbox: the message
  is sitting there for a person, which is the whole premise of the change.
- **Inference latency lands on the customer's wait** → they message, and the
  reply takes as long as the model does. Mitigated by low effort and the hard
  timeout; a slow model becomes silence rather than a long pause.
- **Traces stop at the boundary of what ran** → an unconfigured LangWatch, or a
  crash before the span closes, leaves the same nothing as a message that was
  never classified. Mitigated by the explicit span (Decision 6); accepted for the
  unconfigured case, which is visible from the environment.
- **Prompt drift with no eval** → nothing in CI catches a prompt edit that
  changes behaviour. Accepted: unit tests stub the model, and the first labelled
  set will come out of LangWatch rather than being written up front.
- **`window.close()` refused** → mitigated by rendering the confirmation screen
  first (Decision 11). The customer sees a finished order either way.
- **The local model is too small to hold the distinction** → no longer
  hypothetical: `qwen3.5:9b` misses unambiguous orders (Decision 4b).
  `gemma4:12b-it-qat` did not, on seven messages. The mitigation is that the same
  classifier runs against a hosted model by changing `LLM_PROVIDER`, and that
  LangWatch makes the comparison a measurement rather than an impression.
- **The model gets evicted from VRAM** → every classification pays a 15–30 s cold
  load, exceeds the timeout, and abstains; the agent goes quiet without anything
  being broken. Mitigated by `keep_alive: -1` (Decision 4c), and visible in
  LangWatch as a run of timeouts rather than a run of *not an order*.

## Migration Plan

No schema change and no data migration. `WhatsappInbound` is read in one new way
(recent inbound for a phone) but not altered.

Rollout is by environment variable, and the two halves are independent:

- **LLM not configured** (whatever that means for the selected provider —
  Decision 5) → the classifier abstains on everything → under fail-closed the
  agent goes silent. This is a real off switch, and it is the *closed* one: it
  stops the agent replying at all, it does not fall back to today's
  reply-to-everything. Worth stating plainly because the failure looks like "the
  agent broke" to anyone who does not know the rule — which is why the startup
  log has to say, by variable name, what is missing.
- **LangWatch key absent** → no tracing, everything else unchanged.

Rollback is the same switch, plus reverting the frontend commit for the confirm
flow — the customer UI change is independent of the classifier and can be
reverted on its own.

## Open Questions

- **How long is the timeout?** Picked in implementation against a measured
  round-trip, not guessed here. It only needs to be shorter than the patience of
  someone who just sent a WhatsApp message.
- **Does the recap list quantities, or just say the order was received?** The
  proposal says "listing what they ordered"; whether that is
  `3 x medialunas` per line or a count depends on how long a real order is on a
  phone screen. Settled in the spec.
- **Is `PEDIDO` / `NO_PEDIDO` the right label pair?** The labels are Spanish for
  a Spanish-language prompt, which reads well, but nothing depends on it — they
  are internal tokens and can change with the prompt.
- **How long is the classifier's memory of being wrong?** Nothing here collects
  the messages it abstained on into anything reusable; LangWatch holds them, but
  turning that into a labelled set is manual and out of scope.
- **More models are being added to the inference server.** `gemma4:12b-it-qat` is
  the starting choice on seven messages of evidence; re-running the smoke test
  against whatever lands is cheap and worth doing before the prompt is tuned.
