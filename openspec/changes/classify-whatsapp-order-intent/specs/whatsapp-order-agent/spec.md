## MODIFIED Requirements

### Requirement: A known sender is answered with their order link
The system SHALL resolve an inbound message's sender to a client by matching the
sender's number against the directory. Having resolved a client, the system SHALL
classify the message's intent, and SHALL reply with a message containing that
client's order link for the open bloque **only when the classification is that the
sender wants to place an order**.

Any other classification — that the sender does not want to order, or that no
verdict was reached — SHALL end the flow for that message: no link is created and
no reply is sent. A number the bakery reads is a staffed inbox, so a message the
agent does not answer is a message a person answers; a link sent to a customer who
was not ordering cannot be taken back, and occupies that client's slot for the
bloque.

The reply SHALL be free-form text rather than a template. The customer messaged
first, which opens the service window in which free-form replies are allowed, and
a template would need approval before it could be sent at all.

Sending the reply SHALL be best-effort with respect to the order: if the reply
cannot be delivered, the order and its link SHALL still exist, so the manager can
fall back to sharing the link by hand. A failure to send SHALL be recorded where
it can be seen.

#### Scenario: A known number asking to order gets a link
- **WHEN** an inbound message arrives from a number belonging to an active client
  and is classified as wanting to place an order
- **THEN** the system replies with a message containing an order link for that
  client in the open bloque

#### Scenario: A known number not asking to order gets nothing
- **WHEN** an inbound message arrives from a number belonging to an active client
  and is classified as not wanting to place an order
- **THEN** no order or link is created
- **AND** no reply is sent

#### Scenario: No verdict is treated as no order
- **WHEN** an inbound message from an active client produces no classification
  verdict
- **THEN** no order or link is created
- **AND** no reply is sent

#### Scenario: The link is the customer's own
- **WHEN** the reply is sent
- **THEN** the link it carries resolves to an order bound to the sender's client
- **AND** not to any other client

#### Scenario: A failed reply does not discard the link
- **WHEN** the reply cannot be delivered
- **THEN** the order and its link still exist and remain usable
- **AND** the failure is recorded

## ADDED Requirements

### Requirement: An unanswered message consumes nothing
A message that does not result in a reply SHALL NOT consume the suppression
window. The window is armed only by a reply that was actually sent, so a customer
whose message went unanswered SHALL be answered normally when they message again,
however soon that is.

A customer who greets, is not answered, and then asks to order moments later is
one customer placing one order — suppressing the second message because of the
first would turn a correct decision not to reply into silence for the rest of the
window, at exactly the moment they were finally asking for something.

The message SHALL still be recorded as processed, so a redelivery of it is not
acted on a second time. Recording that a message was handled and recording that a
reply was sent are separate facts.

#### Scenario: A greeting does not suppress the order that follows
- **WHEN** a client sends a message that produces no reply, and then within the
  suppression window sends one classified as wanting to order
- **THEN** the second message is answered with a link

#### Scenario: An unanswered message is still not reprocessed
- **WHEN** a message that produced no reply is delivered again
- **THEN** it is not acted on a second time

### Requirement: Deliveries are acknowledged before the work is done
The system SHALL acknowledge a delivery without waiting for classification or for
any reply to be sent. Acting on an inbound message SHALL NOT delay the
acknowledgement.

Classification calls a language model, whose latency is neither bounded by nor
visible to Meta. Holding the acknowledgement for it would risk Meta treating the
delivery as failed and redelivering a message already being acted on.

Nothing in the outcome of acting on a message affects the acknowledgement, which
is a constant: the endpoint already acknowledges deliveries it ignores and
deliveries whose handling failed.

#### Scenario: Acknowledgement does not wait for the model
- **WHEN** a delivery carrying an inbound message is received and classification
  is slow
- **THEN** the delivery is acknowledged without waiting for the classification

#### Scenario: A failure after acknowledgement is not redelivered
- **WHEN** acting on a message fails after the delivery was acknowledged
- **THEN** Meta is not made to retry it
- **AND** the failure is recorded

### Requirement: A confirmed order is echoed back to the customer
When a customer confirms an order from a link, the system SHALL send that customer
a message listing what they ordered, so the order they just placed is readable in
the conversation it started in.

The message SHALL be templated Spanish copy. No part of it SHALL be generated by a
language model.

The message SHALL be sent only when a free-form reply to that customer is
permitted — that is, when the customer has sent an inbound message recently enough
that the service window is still open. An order placed from a link the manager
generated by hand goes to a customer who may never have messaged the bakery, and a
free-form message to them would be rejected rather than delivered. Not sending in
that case is the expected outcome and SHALL NOT be recorded as a failure.

Sending SHALL be best-effort with respect to the order: the order SHALL be
recorded, and the customer's confirmation SHALL complete, whether or not the
message is delivered. Confirming an order SHALL NOT wait on the message being sent.

#### Scenario: A customer who messaged gets their order back
- **WHEN** a customer who messaged recently confirms an order from their link
- **THEN** they receive a message listing the products and quantities they ordered

#### Scenario: The recap is templated
- **WHEN** the confirmation message is sent
- **THEN** its wording comes from a template
- **AND** contains nothing generated by a language model

#### Scenario: No recent inbound means no message
- **WHEN** an order is confirmed for a client who has not sent an inbound message
  inside the service window
- **THEN** no message is sent
- **AND** no failure is recorded

#### Scenario: A failed recap does not undo the order
- **WHEN** the confirmation message cannot be delivered
- **THEN** the order remains confirmed
- **AND** the failure is recorded

#### Scenario: Confirming does not wait on the message
- **WHEN** a customer confirms their order
- **THEN** the confirmation completes without waiting for the message to be sent
