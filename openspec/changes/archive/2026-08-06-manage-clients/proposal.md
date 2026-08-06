## Why

The client directory is loaded exclusively by Prisma data migrations, with no
management UI — a deliberate PoC constraint, written into `client-directory` as a
requirement. It has outlived its usefulness. Adding one bakery client means
authoring a migration, and retiring one means authoring another; the manager, who
is the only person who knows the clients, cannot do either.

The WhatsApp agent makes it acute. That feature needs a phone number per client
to resolve an inbound message to a client, and `Client` has no contact field at
all — so ~60 numbers have to be collected. Through a migration that is a
hand-written SQL file per correction; through a screen it is a normal afternoon's
data entry.

## What Changes

- **A Clientes view** in the back office at `/clientes`, reached from a fourth
  navigation entry. Its top region adds a client; below it the directory is
  listed, each row editable and removable.
- **The directory becomes manager-managed.** `client-directory`'s
  no-management-UI requirement is removed outright rather than amended — the
  concept inverts — and replaced by one that specifies creating, editing,
  retiring and reinstating a client from the back office. Data migrations keep
  working and stay the way clients are seeded.
- **`Client` gains an optional `phone`.** Nullable, unique when present, stored
  as digits only so a number is one value rather than however it was typed. It is
  what the WhatsApp agent will match an inbound `wa_id` against.
- **`name` becomes unique.** Verified against the live directory first: none of
  its 61 clients collide, by exact match or ignoring case and surrounding space.
- **Removing a client is two different operations, named honestly.** A client
  with no orders is **deleted**; a client with orders is **deactivated**, because
  `Order.clientId` has no cascade and closed bloques are history. The row shows
  which one its control will do, rather than one button that silently means
  different things.
- **Inactive clients stay listed**, visually muted, with a control to reinstate
  them — otherwise a mis-click is unrecoverable from the UI.

## Capabilities

### Modified Capabilities
- `client-directory`: the fixed-directory requirement is removed and replaced by
  a managed-directory one; the selectable-clients requirement is amended for the
  new phone field and for listing the full directory to the management view.
- `back-office-navigation`: a fourth destination, **Clientes**.

## Impact

- **Schema:** `Client.name` gains `@unique`, `Client.phone String? @unique` is
  added. One migration; no data rewritten. Existing rows get `phone = NULL`.
- **Backend:** `clients/` grows `POST`, `PATCH` and `DELETE`, plus an
  `includeInactive` filter on the list. `assertActive` is unchanged, so nothing
  about attaching an order to a client changes.
- **Frontend:** a new route group entry, `Sidebar.tsx`, `lib/api.ts`, and the new
  view's components and styles.
- **The slug stays derived and uneditable.** It is the natural key data
  migrations upsert on; letting it change would make the next migration insert a
  duplicate instead of matching. It is computed from the name on create and left
  alone afterwards — so renaming a client keeps its identity, which is what the
  orders pointing at it require.
- **Two clients whose names differ only by case or punctuation** produce the same
  slug and are rejected by the slug's uniqueness, not the name's. The message has
  to say so, or the manager sees "already exists" for a name they cannot find.
- **Phone normalization is provisional.** Digits only is enough to make the
  unique constraint meaningful and to match a `wa_id`; whether numbers are stored
  in full E.164 (country code included) is a decision the WhatsApp agent change
  should make, when there is a real inbound payload to match against.
