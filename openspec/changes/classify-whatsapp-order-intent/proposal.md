## Why

What this change is really trying out is a **shared channel**: one WhatsApp
conversation that automation and a person both work in, where the automation
speaks up only when it is sure it can finish the job and otherwise stays out of
the way so the human answers — with the customer never told which of the two
they are talking to, because from their side it is the same chat either way.

Today's agent has no such reticence. It answers **every** message from a known
customer with an order link: a "gracias", a "a qué hora abren?" or a photo of
the last delivery all get the same reply. So the automation talks over the
person exactly when the person was needed, and the customer is handed a link
they did not ask for — one that, once issued, occupies their slot for the
bloque.

Intent is what tells the two apart, and deciding whether "hola, tenés facturas
para mañana?" is an order is the judgement a person makes in a second and a
keyword list never makes reliably, in a chat that is free-form Spanish with
typos, voice-note transcripts and small talk. That is inference, and it is the
first thing in this project that needs a model.

At the other end of the same flow, the customer who *does* order pays for a
review gate designed when nobody was watching: the confirm button has to be
tapped twice with a forced pause in between, and success leaves them parked on a
"pedido recibido" screen inside WhatsApp's browser with nothing to do but find
the back arrow. When the order arrives from a chat, the chat is where the
confirmation belongs.

## What Changes

- **An inbound message is classified before anything is created.** A known
  sender's message goes to an LLM that decides between two classes: *wants to
  order* / *does not want to order*. Only the first produces a link and a reply;
  the second ends the flow in silence, leaving the message to the person reading
  the inbox.
- **A new LLM module, independent of WhatsApp.** It exposes typed inference to
  the rest of the backend, uses LangChain so the concrete model is a
  configuration detail rather than a code dependency, and knows nothing about
  webhooks, clients or orders.
- **LLM calls are traced to LangWatch**, enabled and configured entirely through
  environment variables. Unset means no tracing and a working system, never a
  failed inference. Because the automation is silent both when it decides
  *not an order* and when it cannot decide at all, the trace is the **only**
  place those two are distinguishable — which is what makes LangWatch part of
  the change rather than tooling added alongside it. A failed, timed-out or
  refused inference therefore has to be traced too, not just a successful one:
  the case worth watching is exactly the one that produced no answer.
- **The model does not write.** Every outbound message stays templated Spanish
  copy; the LLM's whole output is a class.
- **A confirmed order is echoed back over WhatsApp.** When the customer confirms
  on the link, they get a message listing what they ordered — the receipt that
  today only exists on a screen they are about to close.
- **BREAKING (customer UI): the review gate is removed.** One "Confirmar pedido"
  button, one tap, no countdown and no second activation. The submission retries
  on transient failure instead of surfacing an error the customer cannot act on,
  and on success the window closes itself.
- **When in doubt, the automation says nothing.** If the LLM is unconfigured,
  unreachable, times out or answers unusably, no link is created and no reply is
  sent. Silence is not a dropped customer here — the number is a staffed inbox,
  so an unanswered message is one a person answers, which is the same outcome
  the bakery had before any of this existed. Guessing *wants to order* would
  instead put a wrong link in front of a customer and burn their slot for the
  bloque, and a person reading the thread afterwards cannot take that back.

## Capabilities

### New Capabilities
- `llm-inference`: the backend's single door to a language model — LangChain-backed
  provider/model selection from the environment, LangWatch tracing when enabled,
  timeouts, and what callers get when inference is unavailable. Domain-agnostic:
  it classifies text it is handed and has no idea what a bloque is.
- `order-intent-classification`: the classifier itself — the two classes, the
  Spanish-language input it must cope with (typos, greetings, questions,
  non-text messages), how ambiguity resolves, and the fallback when no verdict
  is available.

### Modified Capabilities
- `whatsapp-order-agent`: "a known sender is answered with their order link"
  becomes "a known sender **whose message intends an order** is answered with
  their order link"; a non-order intent ends the flow with no link, no reply and
  no suppression window burned. The agent also gains an outbound confirmation
  once the order is placed. *(Defined by the in-flight `whatsapp-order-agent`
  change, not yet in `openspec/specs/`.)*
- `order-intake-presentation`: the requirement "Confirming is gated behind a
  review of the order" is **removed** and replaced by a single-activation
  confirm that submits, retries on transient failure, and closes the window on
  success.

## Impact

- **Backend:** a new `llm/` module (LangChain + LangWatch) and a classifier that
  depends on it. `WhatsappService.handleMessage` gains a decision point between
  resolving the client and calling `LinksService`, and a new path from order
  confirmation back out to a WhatsApp send — which means the orders side needs a
  way to reach the agent without the agent's module reaching back into it.
- **Frontend:** `OrderForm` loses `REVIEW_PAUSE_SECONDS`, the countdown and the
  two-activation `confirmPressed`; it gains retry around `confirmOrder` and a
  self-close on success. The `order_review_raised` event disappears with the
  gate.
- **Config:** provider credentials and model name, plus `LANGWATCH_*`. As with
  the Meta variables, none are logged and absence degrades rather than breaks.
- **Cost and latency:** one inference per inbound message from a known customer,
  on the webhook's critical path. The webhook must still answer Meta promptly
  and must still answer 200 whatever the model does.
- **Tests:** the LLM is stubbed at the module boundary — Jest never calls a
  provider. Prompt quality is not something a unit test asserts.
- **Risk — the window may not close.** `window.close()` is only honoured for
  script-opened windows, and WhatsApp's in-app browser is not one. The
  confirmation screen therefore has to remain as the fallback rather than being
  deleted along with the gate; design decides what the customer sees when the
  close is refused.
