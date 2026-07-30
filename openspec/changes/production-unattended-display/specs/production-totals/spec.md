## ADDED Requirements

### Requirement: Production views refresh their totals automatically
Each production view SHALL re-read the open bloque's production totals on its
own every two minutes while it is open, so orders that arrive after the view was
opened are reflected without anyone reloading the page. The refresh SHALL
replace the displayed figures in place, preserving the viewer's scroll position
and presenting no spinner, flash, or other visible interruption. This composes
with the existing load-time behavior, which is unchanged: the view still shows
the open bloque's current totals whenever it is loaded.

#### Scenario: A new order appears without reloading
- **WHEN** an order is added to the open bloque while a production view is left
  open
- **THEN** that order's quantities are reflected in the view's totals within
  two minutes
- **AND** the viewer took no action to make that happen

#### Scenario: Refreshing does not disturb the view
- **WHEN** an automatic refresh occurs
- **THEN** the figures update in place
- **AND** the scroll position is preserved and no spinner or flash is shown

#### Scenario: Totals that have not changed stay as they are
- **WHEN** an automatic refresh occurs and no order in the bloque has changed
- **THEN** the displayed totals remain the same

### Requirement: Automatic refreshing pauses while the view is not visible
A production view SHALL stop its automatic refreshing while its tab or window is
hidden, and SHALL resume when it becomes visible again. On becoming visible the
view SHALL refresh immediately rather than waiting for the next interval, so a
returning viewer is never shown totals from before they left. A view that is
navigated away from SHALL stop refreshing altogether.

#### Scenario: A hidden tab stops polling
- **WHEN** the tab or window showing a production view becomes hidden
- **THEN** the view stops re-reading the totals until it is visible again

#### Scenario: Returning to the tab shows current totals at once
- **WHEN** a hidden tab showing a production view becomes visible again
- **THEN** the view refreshes its totals immediately
- **AND** does not wait for the next interval

#### Scenario: Leaving the view stops its refreshing
- **WHEN** the manager navigates from a production view to another view
- **THEN** that view's automatic refreshing stops

### Requirement: Production views scroll themselves when the list does not fit
When a production view's content is taller than the screen, the view SHALL cycle
through it on its own so every product becomes visible without anyone touching
the display. The cycle SHALL be: hold still for a settling period, scroll
gradually to the bottom, hold there for the same period, scroll gradually back
to the top, hold again, and repeat for as long as the view is open. The movement
SHALL be gradual rather than a jump, so the list stays readable while it moves.

A view whose content fits on the screen SHALL NOT scroll at all — there is
nothing to reveal, and movement with no purpose is a distraction on a display
people glance at.

#### Scenario: A long list cycles on its own
- **WHEN** a production view's content is taller than the screen and it is left
  open
- **THEN** the view scrolls to the bottom on its own, and later back to the top
- **AND** the viewer took no action to make that happen

#### Scenario: The movement is gradual
- **WHEN** the view scrolls itself
- **THEN** it moves progressively rather than jumping straight to the end

#### Scenario: A short list does not move
- **WHEN** a production view's content fits within the screen
- **THEN** the view never scrolls itself

#### Scenario: Self-scrolling pauses while the view is not visible
- **WHEN** the tab or window showing a production view becomes hidden
- **THEN** the view stops scrolling itself until it is visible again

#### Scenario: Leaving the view stops its scrolling
- **WHEN** the manager navigates from a production view to another view
- **THEN** that view's self-scrolling stops
