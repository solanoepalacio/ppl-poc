## MODIFIED Requirements

### Requirement: Confirming is gated behind a review of the order
The customer SHALL be shown their order before it can be submitted. The first
activation of the primary confirm action SHALL NOT submit the order; instead it
SHALL put the summary on screen and mark it for review:

- The summary SHALL be expanded if it is collapsed. If it is already open it stays
  open and is not re-rendered or scrolled away.
- A notice SHALL already be on the summary, telling the customer in Spanish to
  review their order before confirming — it is part of the summary rather than
  something the confirm raises, so it is read while the order is still being
  built rather than after the customer has decided. It SHALL be presented in the
  same alert treatment as the by-unit notice in the header, so the two read as
  the same kind of instruction.
- The primary action SHALL be relabelled to name the review and SHALL be disabled
  for **3 seconds**, so the screen cannot be dismissed by a second reflexive tap
  on a control the customer's finger is already over. Three rather than five: the
  notice is no longer the first the customer hears of it, so the pause has less
  to buy.
- That label SHALL carry the **whole seconds remaining**, counting down until the
  action returns. A control that is merely relabelled and dead reads as broken; the count is what distinguishes a wait from a fault, and it
  tells the customer how long they have rather than leaving them to guess.

When the 3 seconds elapse the primary action SHALL return to its normal confirm
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
- **AND** the review notice is still shown, as it was before the confirm

#### Scenario: The action is relabelled and disabled during the pause
- **WHEN** the review pause is running
- **THEN** the primary action shows the review label rather than the confirm label
- **AND** it is disabled

#### Scenario: The label counts the seconds down
- **WHEN** the review pause begins and runs to its end
- **THEN** the primary action's label shows 3 seconds remaining, then 2 and 1
- **AND** it is disabled throughout
- **AND** the count is gone once the confirm label returns

#### Scenario: The action returns after the pause
- **WHEN** 3 seconds have elapsed since the review pause began
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

#### Scenario: The notice is on the summary before any confirm
- **WHEN** the customer opens the summary without having activated the confirm
  action
- **THEN** the review notice is already shown with it
