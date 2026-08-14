## ADDED Requirements

### Requirement: A message is classified as intending an order or not
The system SHALL classify a customer message into exactly two intents: that the
sender **wants to place an order**, or that they **do not**. There SHALL be no
third intent and no confidence score in the result the caller acts on.

Classification SHALL consider only the message it is given. It SHALL NOT use
conversation history, and SHALL NOT carry state between messages.

#### Scenario: An order request is recognised
- **WHEN** a message asks to order, to be sent the form, or names products and
  quantities for a bloque
- **THEN** the classification is that the sender wants to order

#### Scenario: A message that is not an order request is recognised
- **WHEN** a message is a greeting, a question about hours, a thank-you, a
  complaint, or any other message that does not ask to place an order
- **THEN** the classification is that the sender does not want to order

#### Scenario: Each message is judged alone
- **WHEN** the same message text is classified twice, once after unrelated
  messages from the same sender and once with no preceding messages
- **THEN** the classification does not depend on what preceded it

### Requirement: The classifier answers with a verdict or abstains, and never raises
The classifier SHALL return one of exactly three verdicts: **wants to order**,
**does not want to order**, or **no verdict**. It SHALL NOT raise an error to its
caller under any condition.

Every failure SHALL resolve to **no verdict**: the inference module unconfigured,
the provider unreachable, the call timed out, the provider returning an error, or
an answer that cannot be read as one of the two intents.

A verdict of *no verdict* is distinct in the record from *does not want to order*,
even though a caller MAY act on both the same way. The two are indistinguishable
in what the customer sees, so the record is the only place they can be told apart.

#### Scenario: An unavailable model produces no verdict
- **WHEN** the inference module is not configured, or the provider cannot be
  reached, or the call times out
- **THEN** the classifier returns no verdict
- **AND** does not raise

#### Scenario: A provider error produces no verdict
- **WHEN** the provider returns an error
- **THEN** the classifier returns no verdict
- **AND** does not raise

#### Scenario: The two silent outcomes stay distinguishable
- **WHEN** one message is classified as not wanting to order and another produces
  no verdict
- **THEN** the two are recorded distinguishably

### Requirement: Only text is classified
Classification SHALL be attempted only on a message that carries text. A message
with no text — audio, image, sticker, location, reaction, or any other non-text
type — SHALL produce **no verdict** without an inference being attempted.

The system SHALL NOT transcribe audio and SHALL NOT interpret images in order to
classify them.

#### Scenario: A voice note is not classified
- **WHEN** a message carries an audio recording and no text
- **THEN** the classifier returns no verdict
- **AND** no inference is attempted
- **AND** no transcription is attempted

#### Scenario: An image is not classified
- **WHEN** a message carries an image and no text
- **THEN** the classifier returns no verdict
- **AND** no inference is attempted

#### Scenario: An empty text message is not classified
- **WHEN** a message's text is empty or only whitespace
- **THEN** the classifier returns no verdict
- **AND** no inference is attempted

### Requirement: The model's answer is read strictly
The classifier SHALL define a fixed answer vocabulary of exactly two values, one
per intent, and SHALL accept an answer only by matching it against that
vocabulary. Matching SHALL ignore surrounding whitespace and letter case.

An answer that does not match SHALL produce **no verdict**. This includes an
answer containing extra prose, more than one of the values, a value not in the
vocabulary, or an empty answer.

The classifier SHALL tolerate a reasoning preamble in the answer: where a model
emits reasoning before its answer, that preamble SHALL be discarded before
matching. The classifier SHALL NOT depend on any provider setting having
suppressed reasoning, because a setting that is ignored would otherwise turn every
message into *no verdict* while the model answers correctly.

#### Scenario: A clean answer is accepted
- **WHEN** the model answers with exactly one of the two values, in any letter
  case and with surrounding whitespace
- **THEN** it is read as the corresponding intent

#### Scenario: An answer outside the vocabulary produces no verdict
- **WHEN** the model answers with a word that is not one of the two values
- **THEN** the classifier returns no verdict

#### Scenario: An explanatory answer produces no verdict
- **WHEN** the model answers with a sentence rather than one of the two values
- **THEN** the classifier returns no verdict

#### Scenario: A reasoning preamble is discarded
- **WHEN** the model's answer contains a reasoning passage followed by one of the
  two values
- **THEN** the reasoning is discarded and the value is read as its intent

#### Scenario: An empty answer produces no verdict
- **WHEN** the model returns an empty answer
- **THEN** the classifier returns no verdict

### Requirement: Classification is written for the messages customers actually send
The classifier's instructions SHALL be written in Spanish, for messages written in
Spanish, and SHALL account for how customers write in a chat: misspellings,
missing punctuation and accents, abbreviations, greetings attached to requests,
and several sentences in one message.

The classifier SHALL classify a message that both greets and requests as wanting
to order, since the greeting does not change what is being asked.

#### Scenario: A misspelt request is still a request
- **WHEN** a message asks to order with misspellings and no accents
- **THEN** it is classified as wanting to order

#### Scenario: A greeting attached to a request does not mask it
- **WHEN** a message opens with a greeting and then asks to order
- **THEN** it is classified as wanting to order

### Requirement: The model classifies and does not write
The model SHALL produce only a classification. No text the model generates SHALL
be sent to a customer, and every customer-facing message SHALL remain templated.

#### Scenario: Model output never reaches a customer
- **WHEN** a message is classified and a reply is subsequently sent
- **THEN** the reply's text comes from a template
- **AND** contains nothing generated by the model

### Requirement: Every classification attempt is traced
Every classification attempt SHALL produce a trace recording its verdict,
including attempts that end in **no verdict** without an inference being made —
a non-text message, or an unconfigured inference module.

Because a *does not want to order* verdict and a *no verdict* are both silent to
the customer, the trace is the only place the difference is visible, and an
untraced abstain is indistinguishable from a working classifier deciding not to
reply.

#### Scenario: A verdict is traced
- **WHEN** a message is classified
- **THEN** a trace records the attempt and its verdict

#### Scenario: An abstain without an inference is traced
- **WHEN** a message produces no verdict without an inference being attempted
- **THEN** a trace records the attempt and the reason it produced no verdict
