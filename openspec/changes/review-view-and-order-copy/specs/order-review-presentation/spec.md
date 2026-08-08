## REMOVED Requirements

### Requirement: The review view keeps itself current and cycles when it overflows
**Reason**: half the requirement — the cycling — is being removed, and two of its
scenarios exist only to describe it. Replaced by *The review view keeps itself
current*, which keeps the refresh behaviour word for word.

## ADDED Requirements

### Requirement: The review view keeps itself current
The view is shown on screens nobody touches, so it SHALL NOT depend on anyone
refreshing it.

It SHALL re-read the bloque periodically, so orders placed after the screen was
opened appear on their own. It SHALL do so without reloading the page, so the
scroll position and anything else on screen survive the update, and it SHALL NOT
poll while the view is not visible, refreshing instead when it becomes visible
again so nobody returns to figures from before they left.

The view SHALL NOT scroll itself. Unlike the production views, this one is looked
*up* in: someone is reading a particular client's row, and a page that moves under
them while they read costs more than reaching the bottom of a long list by hand.
A list longer than the screen is scrolled by whoever is reading it.

#### Scenario: A new order appears without anyone touching the screen
- **WHEN** an order is placed after the view was opened
- **THEN** the view shows it within its refresh interval
- **AND** the page is not reloaded to do so

#### Scenario: The view never scrolls on its own
- **WHEN** the bloque holds more clients than fit on the screen
- **THEN** the view stays where the reader left it
- **AND** does not move through the list on its own
