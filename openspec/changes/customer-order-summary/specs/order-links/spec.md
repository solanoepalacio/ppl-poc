## MODIFIED Requirements

### Requirement: Order tokens are single-use
Each token SHALL be usable to act on its order at most once. A token MUST be treated as valid only while its order has not yet been consumed; once the customer has confirmed the order, the token MUST be treated as invalid.

#### Scenario: Token whose order has not been consumed
- **WHEN** a token is validated and its order has not yet been consumed
- **THEN** the system treats the token as valid

#### Scenario: Token whose order has already been consumed
- **WHEN** a token is validated and its order has already been consumed
- **THEN** the system treats the token as invalid
