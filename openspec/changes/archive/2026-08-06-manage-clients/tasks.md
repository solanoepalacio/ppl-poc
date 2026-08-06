## 1. Schema

- [ ] 1.1 `schema.prisma`: `name String @unique`, `phone String? @unique` on
  `Client`. Update the model's doc comment, which states the directory has no
  management UI.
- [ ] 1.2 `prisma migrate dev` and read the generated SQL before applying it —
  SQLite rebuilds the table for a constraint change, and the rebuild is where a
  column silently loses its data.
- [ ] 1.3 Confirm against the live directory that no name collides before the
  unique lands (done: 61 clients, no duplicates exact or case/space-insensitive).
  Existing rows take `phone = NULL`.

## 2. Contract

- [ ] 2.1 `@pannico/shared`: `Client` gains `phone: string | null`.
- [ ] 2.2 `ManagedClient` — a `Client` plus `orderCount` — for the management
  view, so the row can say whether removal deletes or retires.
- [ ] 2.3 `CreateClientRequest` (`name`, optional `phone`) and
  `UpdateClientRequest` (optional `name`, `phone`, `active`).

## 3. Backend

- [ ] 3.1 `slugify` in `@pannico/shared` or `common/`: lowercase, strip accents,
  non-alphanumerics to single dashes, trimmed. Reuse the normalization
  `normalizeForSearch` already applies rather than inventing a second one.
- [ ] 3.2 `normalizePhone`: digits only; empty → `null`.
- [ ] 3.3 `ClientsService.list(includeInactive)`: unchanged default (active only,
  by name); with the flag, every client plus its `orderCount`.
- [ ] 3.4 `create`: derive the slug, normalize the phone, reject a duplicate
  name, slug or phone with a message naming **which** collided.
- [ ] 3.5 `update`: name, phone and active only. Never the slug — renaming keeps
  the client's identity so its orders still resolve.
- [ ] 3.6 `remove`: delete when `orderCount === 0`, otherwise set `active: false`
  and report which it did, so the UI does not have to guess.
- [ ] 3.7 Controller: `GET /clients?includeInactive=`, `POST`, `PATCH /:id`,
  `DELETE /:id`. DTOs with `class-validator`; the global pipe already whitelists.
- [ ] 3.8 Tests: create with and without phone; each of the three collisions
  reported distinctly; rename leaves slug and id; remove deletes vs retires;
  reinstate; the list flag.

## 4. Frontend

- [ ] 4.1 `Sidebar.tsx`: a fourth entry, **Clientes** → `/clientes`, with a glyph
  in the same style as the others.
- [ ] 4.2 `lib/api.ts`: `getManagedClients`, `createClient`, `updateClient`,
  `deleteClient`.
- [ ] 4.3 `(backoffice)/clientes/page.tsx`: an async server component fetching
  the whole directory, like the other views.
- [ ] 4.4 Add form pinned at the top: name, phone, **Agregar**. Disabled until
  there is a name; the error from a collision is shown next to the form, since
  that is where the correction happens.
- [ ] 4.5 The list: name, phone, and per row an edit control, a removal control
  labelled for what it will do (**Eliminar** with no orders, **Desactivar** with
  some), and for a retired client a **Reactivar** control.
- [ ] 4.6 Inactive rows visually muted, and not by colour alone — a retired
  client also reads as retired in text, since colour is not enough for the
  accessibility bar the rest of the back office holds.
- [ ] 4.7 Editing in place on the row rather than in a modal: the manager fixes a
  typo in one field, and a dialog for two inputs is more ceremony than the task.
- [ ] 4.8 `globals.css`: styles for the new view, following the existing
  `.bo-content` / table conventions rather than a new visual language.

## 5. At archive time

- [ ] 5.0 Edit `openspec/specs/client-directory/spec.md`'s `## Purpose` **by hand**
  when archiving. Deltas cannot reach it — verified on a dry-run copy, where it
  survives still saying "loaded via Prisma data migrations with no management UI",
  which the archived change makes false. Nothing warns about this.

## 6. Verify

- [ ] 5.1 Backend `lint` + `test`; frontend `lint`.
- [ ] 5.2 Drive the page: add a client, rename it, give it a phone, delete it
  (no orders → gone). Restore anything touched.
- [ ] 5.3 Drive the retire path against a client that **has** orders — check it
  deactivates instead of deleting, disappears from the Agregar pedido combobox,
  its existing orders still show its name, and Reactivar brings it back. Use a
  client of Pablo's only if it can be fully restored; otherwise create one, give
  it an order, and clean both up.
- [ ] 5.4 Drive the three collisions and confirm each names the right conflict.
- [ ] 5.5 Confirm the nav shows four entries and marks Clientes active.
