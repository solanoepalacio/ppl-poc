## 1. App shell + polish

- [x] 1.1 `OrderForm`: wrap the entry state in a full-height `customer-shell` (pinned header/title/search, the list as the only scroll region, pinned action bar); remove the subtitle and the "add at least one product" hint
- [x] 1.2 `globals.css`: `.customer-shell` fixed-viewport flex column (cancels `<main>` padding); `.customer-list` scroll region; `.action-bar` becomes a pinned flex child (no longer window-sticky); narrower `.customer-shell .qty-input`

## 2. Verification

- [x] 2.1 Typecheck the frontend
- [x] 2.2 Drive the customer page at 390px (empty → bar pinned; 12 items → list scrolls, header/search/bar pinned) and desktop (constrained column)
- [x] 2.3 `openspec validate customer-order-shell-polish --strict`
