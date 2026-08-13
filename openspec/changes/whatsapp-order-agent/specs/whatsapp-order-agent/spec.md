## ADDED Requirements

### Requirement: The webhook answers Meta's verification handshake
The system SHALL expose an endpoint the Meta Cloud API can register as a webhook.
On a verification request it SHALL check the challenge's verify token against the
configured one and, only when they match, echo the challenge back as the plain
response body. A mismatched or absent token SHALL be rejected without echoing
anything, since echoing is what proves ownership of the endpoint.

#### Scenario: Verification with the right token
- **WHEN** the endpoint receives a verification request whose verify token matches
  the configured one
- **THEN** it responds with the challenge value as the body

#### Scenario: Verification with a wrong token
- **WHEN** the verify token does not match
- **THEN** the request is rejected and the challenge is not echoed

### Requirement: Deliveries are authenticated before they are acted on
Every delivery SHALL carry a signature over its raw body, and the system SHALL
verify it against the configured app secret before interpreting the payload,
using a comparison that does not leak by timing. A delivery whose signature is
absent or does not match SHALL be rejected and SHALL cause nothing to be created
or sent.

The endpoint is reachable without a session — it must be, for Meta to call it —
so the signature is the only thing standing between the public internet and an
endpoint that mints order links. It SHALL be checked against the **raw** body:
a signature verified against a re-serialised payload proves nothing.

#### Scenario: An unsigned or wrongly signed delivery is rejected
- **WHEN** a delivery arrives with a missing or invalid signature
- **THEN** it is rejected
- **AND** no order, token or reply is produced

#### Scenario: A correctly signed delivery is processed
- **WHEN** a delivery's signature matches the configured app secret
- **THEN** its payload is processed

### Requirement: Only inbound customer messages are acted on
A delivery MAY carry inbound messages, status updates for messages the system
itself sent, or neither. The system SHALL act only on inbound messages.

Status updates SHALL be ignored. They arrive on the same webhook and describe the
system's own replies, so treating one as an inbound message would have the agent
answer itself for as long as each answer produced another status.

The system SHALL ignore a message it has already acted on, identified by the
message id Meta assigns it. Meta retries a delivery until it is acknowledged, for
up to seven days, so the same message arriving twice is expected rather than
exceptional, and without this each retry would be another link.

#### Scenario: A status update produces nothing
- **WHEN** a delivery carries only status updates for messages the system sent
- **THEN** no reply is sent and nothing is created

#### Scenario: A redelivered message is acted on once
- **WHEN** the same inbound message is delivered more than once
- **THEN** it is acted on the first time only

#### Scenario: Deliveries are acknowledged even when nothing is done
- **WHEN** a delivery is ignored, or acting on it fails
- **THEN** the endpoint still acknowledges it successfully
- **AND** Meta is not made to retry it

### Requirement: The reply offers a way out to a person
The reply carrying the order link SHALL also offer the customer two choices: to
**speak to a person**, and to say their **order has been sent**. A customer who
does not want to deal with a form has to be able to say so without knowing a
magic word, and guessing that intent from free text is a worse bet than asking.

The link SHALL stay in the body of the message. A reply choice returns an
identifier, it does not open a URL, so the two cannot be the same control.

Choosing *order sent* SHALL do nothing beyond being accepted: no reply, and
nothing created. Doing nothing has to be implemented rather than assumed — left
to fall through, the choice would be answered with another link, which is the
opposite of nothing.

#### Scenario: The link message offers both choices
- **WHEN** the agent replies to a known sender
- **THEN** the message contains the order link
- **AND** offers a choice to speak to a person and a choice to say the order was sent

#### Scenario: Saying the order was sent is answered with silence
- **WHEN** the customer chooses that their order has been sent
- **THEN** no reply is sent
- **AND** no order or link is created

### Requirement: Asking for a person hands the conversation over
When the customer chooses to speak to a person, the agent SHALL acknowledge it
once and then stay out of the conversation, so whoever takes it over is not
talking over a bot.

The acknowledgement SHALL be the last thing the agent says. It exists because the
alternative is silence the customer cannot distinguish from not having been heard.

For as long as the handover holds, the agent SHALL ignore everything from that
customer: no link, no courtesy reply, nothing. The handover SHALL be scoped to
that customer alone and SHALL NOT affect anyone else's conversation.

The handover SHALL last for a period of **inactivity**, not a fixed span from
when it began: every further message from that customer SHALL extend it. A
conversation with a person runs longer than any span worth hard-coding, and one
that ends on a clock would have the agent start answering in the middle of it —
the exact thing the handover exists to prevent. Silence is what says the
conversation is over.

Once the handover has lapsed, the agent SHALL behave exactly as it did before it:
the next message is answered with a link as usual.

#### Scenario: Asking for a person is acknowledged once
- **WHEN** the customer chooses to speak to a person
- **THEN** the agent replies once saying somebody will answer shortly

#### Scenario: The agent says nothing more while the handover holds
- **WHEN** the customer sends further messages while the handover holds
- **THEN** the agent does not reply to any of them
- **AND** creates no order or link

#### Scenario: Each message extends the handover
- **WHEN** the customer sends a message while the handover holds
- **THEN** the handover is extended from that message

#### Scenario: The handover lapses after the customer goes quiet
- **WHEN** the customer sends nothing for the whole handover period and then writes again
- **THEN** the agent answers with an order link as it did before

#### Scenario: A handover belongs to one conversation
- **WHEN** one customer's conversation has been handed over
- **THEN** another customer writing in is answered normally

### Requirement: An open handover can be ended by hand
Waiting out the inactivity period is the handover's floor, not its only exit. The
bakery SHALL be able to end one deliberately, because the person who had the
conversation is the only one who knows it is over — the silence that ends it on
its own is a guess made from the outside, and while it runs the customer cannot
get a link even by asking.

The back office SHALL show which conversations are currently handed over and, for
each, who it is with and since when, and SHALL offer to end any of them. A
handover that has already lapsed SHALL NOT be shown: it is not something anyone
can act on.

What is shown is a snapshot — one can open, lapse, or be ended by somebody else
while it is on screen — so it SHALL be possible to read it again without closing
it. It SHALL NOT refresh itself: this is opened to act on rather than left up on
a wall, and a list that reshuffles under the cursor is worse than one that is
honestly out of date.

Ending SHALL take effect at once — the customer's next message is answered with a
link as usual — and SHALL be scoped to that conversation alone.

At once means the suppression window SHALL NOT outlive the handover either. That
window is measured from the last reply sent, and the last reply was the
handover's own acknowledgement, so leaving it in place would meet the customer
with more silence for up to its whole length right after the conversation was
handed back — the exact thing ending it was meant to stop.

Ending SHALL tell the customer the advisory is over, and SHALL do so only when
there was a handover to end — somebody who is not in one must never be told that
theirs finished. The notice closes a conversation that was opened with a promise
that a person would answer; without it the customer is left unable to tell an
advisory that ended from one still under way.

The notice SHALL NOT count as a reply for the purposes of the suppression window.
That window has just been cleared precisely so the customer can write back at
once, and counting this would put it straight back.

Ending a handover that is already gone — lapsed, or ended from somewhere else —
SHALL NOT be an error. Two people reaching the same conclusion is the expected
case, and the outcome they both wanted is the one that already holds.

#### Scenario: Open handovers are listed with who and since when
- **WHEN** the back office asks for the conversations currently handed over
- **THEN** it gets each one with the client it is with and when it began

#### Scenario: The list can be read again without closing it
- **WHEN** the back office asks for the list again while it is on screen
- **THEN** it shows what is open at that moment

#### Scenario: A lapsed handover is not offered
- **WHEN** a handover's inactivity period has run out
- **THEN** it is not among the ones shown

#### Scenario: A handover with a number nobody claims is still listed
- **WHEN** a handed-over number matches no client in the directory
- **THEN** it is still listed, identified by its number

#### Scenario: Ending gives the customer back to the agent
- **WHEN** a handover is ended from the back office
- **AND** that customer writes again
- **THEN** the agent answers with an order link as it did before the handover

#### Scenario: The customer is not left waiting out the suppression window
- **WHEN** a handover is ended moments after the agent acknowledged it
- **AND** that customer writes straight away
- **THEN** they are answered rather than suppressed

#### Scenario: The customer is told the advisory ended
- **WHEN** an open handover is ended
- **THEN** the customer is sent a notice saying the advisory is over

#### Scenario: Nothing is sent when there was nothing to end
- **WHEN** ending is asked for a customer whose handover had already lapsed or been ended
- **THEN** no notice is sent

#### Scenario: Ending one leaves the others alone
- **WHEN** one of several open handovers is ended
- **THEN** the rest keep holding

#### Scenario: Ending an already-gone handover is not an error
- **WHEN** the back office ends a handover that has already lapsed or been ended
- **THEN** the request succeeds and reports that there was nothing to end

### Requirement: A known sender is answered with their order link
The system SHALL resolve an inbound message's sender to a client by matching the
sender's number against the directory, and SHALL reply with a message containing
that client's order link for the open bloque.

The reply SHALL be free-form text rather than a template. The customer messaged
first, which opens the service window in which free-form replies are allowed, and
a template would need approval before it could be sent at all.

Sending the reply SHALL be best-effort with respect to the order: if the reply
cannot be delivered, the order and its link SHALL still exist, so the manager can
fall back to sharing the link by hand. A failure to send SHALL be recorded where
it can be seen.

#### Scenario: A known number gets a link
- **WHEN** an inbound message arrives from a number belonging to an active client
- **THEN** the system replies with a message containing an order link for that
  client in the open bloque

#### Scenario: The link is the customer's own
- **WHEN** the reply is sent
- **THEN** the link it carries resolves to an order bound to the sender's client
- **AND** not to any other client

#### Scenario: A failed reply does not discard the link
- **WHEN** the reply cannot be delivered
- **THEN** the order and its link still exist and remain usable
- **AND** the failure is recorded

### Requirement: One link per client per bloque, not one per message
An inbound message from a client who already has an unconsumed order link for the
open bloque SHALL NOT create another. The existing link SHALL be what the reply
carries.

This is the rule that keeps the agent from turning a conversation into a pile of
orders: a customer typing "hola", "quiero pedir" and "?" is one customer with one
order to place, and a link minted per message would leave the bakery three
pending orders for them and three tokens that each still work.

Beyond reusing the link, the system SHALL suppress repeated replies to the same
sender within a short window, so that several messages in quick succession are
answered once rather than once each. The window SHALL be measured from the last
reply sent to that sender.

A client whose link for the bloque has already been used SHALL be treated as a
new request: their order is placed, and a further message is a further order.

#### Scenario: A second message reuses the outstanding link
- **WHEN** a client with an unconsumed link for the open bloque sends another
  message after the suppression window
- **THEN** no new order is created
- **AND** the reply carries the link they already had

#### Scenario: Several messages in quick succession are answered once
- **WHEN** a client sends several messages inside the suppression window
- **THEN** exactly one reply is sent

#### Scenario: A client who already ordered can order again
- **WHEN** a client whose link for the open bloque has already been used sends a
  message
- **THEN** a new order and link are created for them

#### Scenario: Each bloque is its own conversation
- **WHEN** a client who had a link in a closed bloque sends a message while a new
  bloque is open
- **THEN** they are given a link for the open bloque
- **AND** the closed bloque's link is not reused, since it no longer works

### Requirement: A confirmed order is sent back as a summary
When a customer confirms an order, the system SHALL send them what they
confirmed: each product with its quantity, listed in the order they entered
them, so the message reads back the screen they just left rather than
re-sorting it.

It SHALL go to the number on the client's record. A client with no number on
file SHALL simply not be sent one — that is a state the directory allows, not a
failure.

Sending SHALL NOT be part of confirming. The order is recorded and its link
consumed first, and the summary is attempted afterwards without the customer
waiting on it: the confirmation is what they are waiting for, the summary is a
courtesy, and no failure to deliver a courtesy SHALL turn a recorded order into
an error.

The summary is a free-form message and SHALL therefore be governed by the
service window like any other. A customer who reached the form through a link
shared by hand has never written to the number, so no window is open and the
message SHALL be refused — the order stands regardless, and the refusal SHALL be
recorded where it can be seen.

The order path SHALL NOT name a messaging channel. It SHALL announce that an
order was confirmed, and whatever carries that to a customer SHALL register
itself to hear it, so that removing the agent removes the message and changes
nothing about confirming an order.

#### Scenario: The customer gets back what they confirmed
- **WHEN** a customer confirms an order and their client record has a number
- **THEN** they are sent a summary listing each product and quantity

#### Scenario: The summary reads in the order the products were entered
- **WHEN** the summary is built
- **THEN** its lines follow the order the customer added the products in

#### Scenario: A client with no number is not sent one
- **WHEN** the confirming client has no number on file
- **THEN** no message is attempted
- **AND** the order is confirmed as usual

#### Scenario: A failed summary does not fail the order
- **WHEN** the summary cannot be delivered, for any reason
- **THEN** the order stays confirmed and its link consumed
- **AND** the customer's confirmation still succeeds

#### Scenario: An order confirms with nothing listening
- **WHEN** no messaging channel is registered
- **THEN** confirming an order behaves exactly as it did before

### Requirement: An unknown sender is answered without creating anything
An inbound message from a number that matches no active client SHALL NOT create
an order, a token or a client. The system SHALL reply telling the sender to leave
their order in the chat and that a person will take it, so that a customer the
bakery has not registered is not met with silence.

The directory is maintained by the manager, and a number arriving unannounced is
as likely to be a wrong number as a customer. Registering it automatically would
let anyone with the bakery's number add themselves to the directory.

#### Scenario: An unknown number gets the courtesy reply
- **WHEN** an inbound message arrives from a number matching no active client
- **THEN** the system replies asking them to leave the order in the chat
- **AND** no order, token or client is created

#### Scenario: A retired client's number is treated as unknown
- **WHEN** an inbound message arrives from the number of a client that has been
  retired
- **THEN** it is handled as an unknown sender

### Requirement: The agent is inert unless it is fully configured
The verify token, the app secret, the access token and the sending phone number
SHALL come from the environment and SHALL NOT appear in the repository. With any
of them missing the agent SHALL be inert: it SHALL NOT attempt to verify
signatures it cannot check or send messages it cannot authenticate, and it SHALL
NOT present an endpoint that answers Meta with errors.

None of these values SHALL be written to logs, and neither SHALL the contents of
an inbound message beyond what is needed to act on it.

#### Scenario: Missing configuration disables the agent
- **WHEN** any required credential is absent from the environment
- **THEN** the agent does not process deliveries
- **AND** its state is discoverable at startup rather than at the first delivery

#### Scenario: Credentials never reach the logs
- **WHEN** the agent processes or rejects a delivery
- **THEN** no credential appears in any log line
