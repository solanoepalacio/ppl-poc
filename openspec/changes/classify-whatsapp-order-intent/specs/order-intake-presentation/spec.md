## REMOVED Requirements

### Requirement: Confirming is gated behind a review of the order
**Reason**: The gate was designed for a customer arriving at the form unprompted,
where a mistaken order was expensive to catch. It costs every customer a second
activation and a forced pause on the one action they came to perform, and it is
paid on a phone, inside a chat, by someone who has already decided. The summary
remains available on demand, with its notice, for customers who want to check
their order before confirming — what goes is the compulsion, not the ability.

**Migration**: The primary action submits on its first activation. No consumer of
the form depends on the pause: the review it forced was a client-side interaction
with no server-side or contractual effect, and the order payload is unchanged. The
`order_review_raised` analytics event disappears with the gate; `order_confirmed`
is unaffected and remains the count of orders placed.

## MODIFIED Requirements

### Requirement: The order screen shows the order itself, with the primary action always reachable
The order entry screen SHALL keep the primary "confirm order" action reachable
without requiring the customer to scroll the catalog to reach it, and SHALL keep a
running count of how many products are currently selected visible alongside it as
a persistent indicator. The primary action MUST be disabled while no products are
selected and while a submission is in progress.

Beyond the count, the screen SHALL be able to show **the order itself**: a summary
listing every product with a quantity above zero, each with its name and its
quantity, under a heading naming it as the customer's order summary. Products with
no quantity SHALL NOT appear.

The summary SHALL be ordered by **when each product was added to the order** —
earliest first — and MUST NOT be sorted alphabetically or by any other property of
the product. Checking a summary means matching it against the sequence the
customer just performed, so the list has to read back in that sequence. A product
whose quantity returns to zero leaves the order and therefore the summary; giving
it a quantity again SHALL place it at the end, as a new entry. This governs the
summary only: the catalog list the customer scrolls stays alphabetical, since it
is a reference that has to be findable by name.

Because the screen is read on a phone, the summary SHALL be **collapsed by
default** and revealed by an explicit control, so it costs no screen height until
the customer asks for it. Once expanded it SHALL offer a control at the end of the
list to collapse it again, so a long summary does not have to be scrolled back
past to dismiss.

#### Scenario: Running count reflects the current selection
- **WHEN** the customer has one or more products selected
- **THEN** a running count of selected products is visible without expanding the
  summary

#### Scenario: Primary action reachable without scrolling the catalog
- **WHEN** the catalog is long enough to require scrolling
- **THEN** the primary confirm action remains reachable via a pinned action bar

#### Scenario: Primary action disabled when nothing is selected
- **WHEN** no product has a quantity above zero
- **THEN** the confirm action is disabled

#### Scenario: Primary action disabled during submission
- **WHEN** a confirmation is in progress
- **THEN** the confirm action is disabled and shows a busy/submitting label

#### Scenario: Summary is collapsed until asked for
- **WHEN** the order screen is rendered
- **THEN** the itemised summary is not shown
- **AND** a control is offered to reveal it

#### Scenario: Expanding shows each selected product and its quantity
- **WHEN** the customer reveals the summary having selected 3 of product P and 1
  of product Q
- **THEN** the summary lists P with 3 and Q with 1 under its heading

#### Scenario: Unselected products are absent from the summary
- **WHEN** the summary is shown and product R has no quantity
- **THEN** R does not appear in it

#### Scenario: The summary can be collapsed from its end
- **WHEN** the summary is expanded
- **THEN** a control at the end of the list collapses it again

#### Scenario: The summary tracks the selection while open
- **WHEN** the summary is expanded and the customer changes a product's quantity
- **THEN** the summary reflects the change without being closed and reopened

#### Scenario: The count stays visible whether or not the summary is open
- **WHEN** the summary is expanded or collapsed
- **THEN** the running count remains visible in the action bar

#### Scenario: Summary lists products in the order they were added
- **WHEN** the customer gives a quantity to product Z, then to product A, then to
  product M, and reveals the summary
- **THEN** the summary lists Z first, then A, then M
- **AND** does not reorder them alphabetically

#### Scenario: Changing a quantity does not move its product
- **WHEN** the summary is open and the customer changes the quantity of a product
  already on it
- **THEN** that product keeps its position in the list
- **AND** only its quantity changes

#### Scenario: A re-added product goes to the end
- **WHEN** a product on the summary has its quantity cleared to zero and is then
  given a positive quantity again
- **THEN** it appears at the end of the summary rather than at its former position

### Requirement: Confirmation and invalid-link states are branded and reassuring
After a successful order confirmation the page SHALL display a branded, prominent
success state confirming the order was received. The invalid-link state SHALL
likewise be branded and explain that a fresh link is needed. The page SHALL reach
the invalid-link state both when it is opened with an already-invalid token and
when an in-progress confirmation is **first** rejected because the link is no
longer valid — for example, because the order's bloque was closed while the
customer was filling out the form. Neither state changes order behavior; they
re-present the existing outcomes.

The success state SHALL remain the page's outcome even when the page also attempts
to close itself, and SHALL be what the customer is left looking at whenever that
attempt does not succeed.

A rejection that arrives on a **retry** of a submission SHALL NOT reach the
invalid-link state — see "A submission that fails in transit is retried". A link
is consumed by the very submission that succeeded, so a rejection after an earlier
attempt is evidence the order was placed, not that the link was never valid.

#### Scenario: Branded success state after confirmation
- **WHEN** the order is confirmed successfully
- **THEN** the page shows a branded success state confirming the order was
  received and indicating no further steps are needed

#### Scenario: Branded invalid-link state on load
- **WHEN** the page is opened with an invalid token
- **THEN** it shows a branded state explaining the link is no longer valid and to
  request a fresh link

#### Scenario: Link becomes invalid while the customer is on the form
- **WHEN** the customer submits their order and the first attempt is rejected
  because the link is no longer valid — e.g. its bloque was closed after the form
  was opened but before the action completed
- **THEN** the page transitions to the branded invalid-link state explaining a
  fresh link is needed
- **AND** does not leave the customer on the form with no feedback

#### Scenario: The success state survives a refused close
- **WHEN** the order is confirmed and the page's attempt to close itself does not
  succeed
- **THEN** the customer is left on the branded success state

## ADDED Requirements

### Requirement: Confirming takes one activation
The primary confirm action SHALL submit the order on its **first** activation.
There SHALL be no second activation, no enforced pause, and no intermediate state
between deciding and submitting.

The order summary SHALL remain available on demand, with its review notice, for a
customer who wants to check their order before confirming. What is removed is the
requirement to look, not the ability.

#### Scenario: The first activation submits
- **WHEN** the customer has products selected and activates the confirm action for
  the first time
- **THEN** the order is submitted

#### Scenario: No countdown or relabelled wait
- **WHEN** the confirm action is activated
- **THEN** it does not enter a counting-down or temporarily-disabled review state

#### Scenario: The summary is still available
- **WHEN** the customer reveals the order summary before confirming
- **THEN** it is shown with its review notice, as before

### Requirement: A submission that fails in transit is retried
The page SHALL retry a submission that fails for a transient reason — the request
never reached the server, or the server answered with a server-side error —
automatically, a bounded number of times, before the customer is shown anything.

A submission rejected for a reason that will not change on repetition SHALL NOT be
retried.

**A rejection stating the link is no longer valid SHALL be treated as success when
it arrives on a retry**, and only then. The link is single-use and bound to one
order, so once a first attempt has been made, that rejection is the signature of a
submission that succeeded and whose response was lost. Treating it as a failure
would tell a customer who has just ordered that their link is dead, and would
invite them to order again.

The customer SHALL be shown a retryable error only once the attempts are
exhausted, and SHALL be able to submit again from that state.

#### Scenario: A dropped request is retried and succeeds
- **WHEN** the first submission attempt fails to reach the server and a subsequent
  attempt succeeds
- **THEN** the page proceeds to its success state
- **AND** the customer sees no error

#### Scenario: A server error is retried
- **WHEN** a submission attempt is answered with a server-side error
- **THEN** it is retried

#### Scenario: A rejected order is not retried
- **WHEN** a submission is rejected because it is invalid — for example it carries
  no items, or a product outside the catalog
- **THEN** it is not retried

#### Scenario: An invalid-link rejection on a retry counts as success
- **WHEN** a first attempt is made and a retry is rejected because the link is no
  longer valid
- **THEN** the page proceeds to its success state
- **AND** does not show the invalid-link state

#### Scenario: An invalid-link rejection on the first attempt does not
- **WHEN** the first attempt is rejected because the link is no longer valid
- **THEN** the page shows the invalid-link state

#### Scenario: Exhausted retries surface an error the customer can act on
- **WHEN** every attempt fails transiently
- **THEN** the customer is shown a retryable error
- **AND** can submit again

### Requirement: A confirmed order closes the window
After a successful confirmation the page SHALL attempt to close itself, so a
customer who arrived from a chat is returned to it without having to find their
way back.

The attempt SHALL be made **after** the success state is rendered, and its failure
SHALL have no consequence beyond the window staying open. Closing is not permitted
in every browser — notably not for a window the page did not itself open, which
includes the in-app browser a customer arrives in from a chat — so a refused close
is an ordinary outcome rather than an error, and SHALL NOT be reported to the
customer.

#### Scenario: The window closes after a successful order
- **WHEN** the order is confirmed and the browser permits the page to close itself
- **THEN** the window closes

#### Scenario: A refused close is silent
- **WHEN** the order is confirmed and the browser does not permit the page to
  close itself
- **THEN** the window stays open on the success state
- **AND** no error is shown

#### Scenario: Nothing closes before the order is placed
- **WHEN** a submission has not succeeded
- **THEN** no attempt is made to close the window
