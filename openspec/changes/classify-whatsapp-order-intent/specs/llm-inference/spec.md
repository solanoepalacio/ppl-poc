## ADDED Requirements

### Requirement: Language-model access goes through one module
The system SHALL reach a language model through a single module, and no other
module SHALL construct a model client, hold provider credentials, or address a
provider's API directly.

The module SHALL be domain-agnostic: it takes instructions and input text and
returns the model's answer. It SHALL NOT contain vocabulary belonging to the
bakery domain — no orders, clients, bloques or WhatsApp.

#### Scenario: A caller obtains an answer without naming a provider
- **WHEN** a caller asks the module to run an inference with a system instruction
  and an input text
- **THEN** it receives the model's answer as text
- **AND** nothing in the call names a provider, a credential, or an endpoint

#### Scenario: No second door to a provider
- **WHEN** the system is inspected for outbound calls to a model provider
- **THEN** every such call originates in this module

### Requirement: Provider, model and endpoint are configuration
The provider, the model name and the endpoint SHALL be read from the environment,
not fixed in code. Changing which model answers SHALL NOT require a code change.

The system SHALL support both a self-hosted provider and a hosted one behind the
same interface, so that swapping between them is a configuration change.

#### Scenario: The model is changed without touching code
- **WHEN** the configured model name is changed and the system restarts
- **THEN** inference runs against the new model
- **AND** no code was modified

#### Scenario: The provider is changed without touching callers
- **WHEN** the configured provider is changed from one supported provider to
  another and the system restarts
- **THEN** callers of the module behave identically and require no change

### Requirement: The module is inert unless it is fully configured
The module SHALL determine at startup whether its configuration is complete, and
SHALL expose that as a single readable state. Completeness SHALL be evaluated
**per provider**: providers differ in which values they require, and a value that
is mandatory for one MAY be irrelevant to another.

A partial configuration SHALL count as no configuration. An incomplete setup that
behaved as if it were configured would fail at the first real message rather than
at startup, which is the more expensive place to discover it.

The module SHALL report its state at startup, naming any **missing variables by
name only**. It SHALL NOT log configuration values, and secrets SHALL NOT appear
in logs, traces or error messages.

The reachability of the configured endpoint SHALL NOT be part of this check.
Reachability is a runtime condition that changes without a restart, so treating it
as configuration would produce a state that is stale as soon as it is read.

#### Scenario: Complete configuration reports ready
- **WHEN** the system starts with every value the selected provider requires
- **THEN** the module reports itself configured

#### Scenario: Partial configuration is treated as none
- **WHEN** the system starts with some but not all of the values the selected
  provider requires
- **THEN** the module reports itself not configured
- **AND** names the missing variables in the startup log

#### Scenario: Only names are logged
- **WHEN** the module reports its configuration state
- **THEN** the log contains variable names
- **AND** contains no credential, key, endpoint value or model output

#### Scenario: An unreachable endpoint is not a configuration error
- **WHEN** the configuration is complete but the endpoint does not answer
- **THEN** the module still reports itself configured
- **AND** the failure surfaces on the call, not at startup

#### Scenario: Calling an unconfigured module fails predictably
- **WHEN** a caller requests an inference while the module is not configured
- **THEN** the call fails immediately with an unconfigured outcome
- **AND** no network request is attempted

### Requirement: Every inference is bounded by a timeout
Every call SHALL be bounded by a configurable timeout. When the timeout elapses,
the call SHALL end in a timeout outcome and SHALL NOT keep the caller waiting on
the provider.

#### Scenario: A slow model does not hold the caller
- **WHEN** the provider has not answered within the configured timeout
- **THEN** the call ends with a timeout outcome
- **AND** the caller is not blocked past the timeout

### Requirement: Failures are distinguishable outcomes
The module SHALL report failures in a form that lets a caller tell them apart:
at minimum an unconfigured module, a timeout, a transport failure, and a provider
error. A caller that treats them identically SHALL be able to do so, but the
distinction SHALL be preserved for the record.

#### Scenario: Failure kinds are not flattened
- **WHEN** an inference fails
- **THEN** the outcome identifies which kind of failure occurred

### Requirement: Only the answer is returned
The module SHALL return the model's answer text and SHALL NOT return the model's
reasoning output as part of it. Where a provider emits reasoning — as a separate
field or inline in the response — the module SHALL exclude it from the answer.

Reasoning-capable models SHALL be configured to omit reasoning where the provider
supports doing so, and the module SHALL allow enough output budget for reasoning
the model performs regardless. A budget sized only for the expected answer can be
exhausted by reasoning before the answer is produced, which returns an empty
answer while the model is working correctly.

#### Scenario: Reasoning is not part of the answer
- **WHEN** the configured model emits reasoning alongside its answer
- **THEN** the answer returned to the caller contains only the answer text

#### Scenario: An empty answer is a failure, not an answer
- **WHEN** the provider returns a response whose answer text is empty
- **THEN** the call ends in a failure outcome rather than returning an empty answer

### Requirement: Inference latency is not dominated by model loading
The system SHALL keep the configured model ready between calls, so that the
latency of an inference is not dominated by loading the model.

Messages arrive sparsely and unpredictably. A model that is unloaded while idle
would be cold for most real requests and warm only under the back-to-back traffic
of testing — making measured latency systematically unrepresentative of the
latency customers experience.

#### Scenario: A call after a long idle period is not a cold start
- **WHEN** an inference is requested after a long period with no inference
- **THEN** its latency is comparable to a call made immediately after another
- **AND** does not include loading the model

### Requirement: Inference is observable through an external tracing service
The system SHALL send a trace for every inference attempt to a tracing service,
enabled and configured entirely through environment variables.

A trace SHALL be produced for **failed attempts as well as successful ones**,
including attempts that produced no provider call at all — an unconfigured module
or a call abandoned at its timeout. The attempts worth inspecting are precisely
those that produced no answer, so tracing only completed calls would omit them.

When tracing is not configured, the system SHALL run normally with no tracing.
Absent tracing SHALL NOT cause an inference to fail.

#### Scenario: A successful inference is traced
- **WHEN** an inference completes and tracing is configured
- **THEN** a trace for that attempt is sent, carrying its outcome

#### Scenario: A timed-out inference is traced
- **WHEN** an inference is abandoned at its timeout
- **THEN** a trace for that attempt is still sent, recording the timeout

#### Scenario: An attempt with no provider call is traced
- **WHEN** an inference is requested while the module is not configured
- **THEN** a trace for that attempt is still sent, recording that no call was made

#### Scenario: Tracing off leaves the system working
- **WHEN** tracing is not configured
- **THEN** inference works normally
- **AND** no trace is sent
