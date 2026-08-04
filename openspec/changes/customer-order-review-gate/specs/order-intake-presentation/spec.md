## MODIFIED Requirements

### Requirement: Customer-facing copy is in Spanish
All text the customer reads on the order page SHALL be written in Spanish, including the title, the primary action label, the busy/submitting state, the review notice and the review label the primary action takes while the review pause is running, the order-summary heading and its show/hide controls, and the confirmation and invalid-link messages.

#### Scenario: Entry screen text is Spanish
- **WHEN** the order entry screen is rendered
- **THEN** the title and action labels are presented in Spanish

#### Scenario: Outcome and error text is Spanish
- **WHEN** either the order-received or invalid-link state is rendered
- **THEN** its heading and body message are presented in Spanish

### Requirement: The order screen shows the order itself, with the primary action always reachable
The order entry screen SHALL keep the primary "confirm order" action reachable
without requiring the customer to scroll the catalog to reach it, and SHALL keep a
running count of how many products are currently selected visible alongside it as
a persistent indicator. The primary action MUST be disabled while no products are
selected, while a submission is in progress, and while the review pause described
in "Confirming is gated behind a review of the order" is running.

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

## ADDED Requirements

### Requirement: Confirming is gated behind a review of the order
The customer SHALL be shown their order before it can be submitted. The first
activation of the primary confirm action SHALL NOT submit the order; instead it
SHALL put the summary on screen and mark it for review:

- The summary SHALL be expanded if it is collapsed. If it is already open it stays
  open and is not re-rendered or scrolled away.
- A notice SHALL appear with the summary, telling the customer in Spanish to
  review their order before confirming. When the summary was already open the
  notice is the only thing added, since there is nothing left to expand.
- The primary action SHALL be relabelled to name the review and SHALL be disabled
  for **5 seconds**, so the screen cannot be dismissed by a second reflexive tap
  on a control the customer's finger is already over.
- That label SHALL carry the **whole seconds remaining**, counting down until the
  action returns. A control that is merely relabelled and dead for five seconds
  reads as broken; the count is what distinguishes a wait from a fault, and it
  tells the customer how long they have rather than leaving them to guess.

When the 5 seconds elapse the primary action SHALL return to its normal confirm
label and become enabled again, and activating it SHALL submit the order exactly
as it did before this gate existed. The gate is a pause before the first
submission, not a confirmation dialog and not a second step to complete.

The gate SHALL apply **once per visit to the form**: after it has run, subsequent
activations submit directly. It leaves the summary open, so quantities changed
afterwards are visible there without the gate re-arming.

The notice SHALL be conveyed as text and announced to assistive technology, not
signalled by color or by the button's state alone.

#### Scenario: First confirm reveals the summary instead of submitting
- **WHEN** the customer has products selected, the summary is collapsed, and they
  activate the confirm action for the first time
- **THEN** the order is not submitted
- **AND** the summary is expanded with its products visible
- **AND** the review notice is shown

#### Scenario: An already-open summary only gains the notice
- **WHEN** the customer has expanded the summary and then activates the confirm
  action for the first time
- **THEN** the order is not submitted
- **AND** the summary stays open
- **AND** the review notice is shown

#### Scenario: The action is relabelled and disabled during the pause
- **WHEN** the review pause is running
- **THEN** the primary action shows the review label rather than the confirm label
- **AND** it is disabled

#### Scenario: The label counts the seconds down
- **WHEN** the review pause begins and runs to its end
- **THEN** the primary action's label shows 5 seconds remaining, then 4, 3, 2 and 1
- **AND** it is disabled throughout
- **AND** the count is gone once the confirm label returns

#### Scenario: The action returns after the pause
- **WHEN** 5 seconds have elapsed since the review pause began
- **THEN** the primary action shows the confirm label again
- **AND** it is enabled

#### Scenario: Confirming after the review submits the order
- **WHEN** the customer activates the confirm action after the pause has elapsed
- **THEN** the order is submitted with the selected products and quantities
- **AND** the page proceeds to its confirmation state as it does for any
  successful submission

#### Scenario: The gate does not run a second time
- **WHEN** the customer has already been through the review pause and activates
  the confirm action again
- **THEN** the order is submitted without a further pause or notice

#### Scenario: The notice is text and is announced
- **WHEN** the review notice appears
- **THEN** it is readable as text
- **AND** it is exposed to assistive technology as a live announcement
