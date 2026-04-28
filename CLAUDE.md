# CLAUDE.md — architecture & extension guide

This file is the entry point for any future Claude Code session working on this
repo. Read it first.

## Big picture

One **Listing** → many **Destinations** → many **PushAttempts**.

- `Listing` is the canonical record Angela enters. It contains the SUPERSET of
  fields any destination might want.
- `Destination` is a configured place a listing can be pushed to. Each
  destination is implemented as an **adapter** (`src/destinations/<key>/adapter.ts`)
  and registered in `src/destinations/index.ts`.
- `PushAttempt` records each time a listing was pushed to a destination, with
  status, payload, and result/error.

## Architectural decisions worth knowing

1. **Field registry is code, not DB.** `src/fields/registry.ts` is the single
   source of truth for which fields exist, their type, validation, and which
   subtypes they apply to. The form, the API, the schema, and adapter mappings
   all derive from it conceptually. We did not put this in DB rows because (a)
   it's small, (b) it changes via PR, not via UI.
2. **Subtype-specific fields go in `listings.subtype_fields` jsonb.** Top-level
   columns hold the universal commercial fields. Anything subtype-specific
   (office class, retail anchor tenant, multifamily unit count, etc.) lives in
   the jsonb column. This avoids 50-column-wide tables and lets us iterate on
   per-subtype fields without migrations.
3. **Mappings are per-destination TypeScript files.** Each adapter folder has
   `mapping.ts` that lists which Listing fields map to which destination
   fields, with optional `transform` functions and `defaultValue`. This lets us
   read what each destination expects in one place.
4. **Adapters share an interface.** All adapters implement
   `DestinationAdapter` (`src/destinations/types.ts`): `key`, `displayName`,
   `buildPayload(listing)`, `push(listing)`, `preview(listing)`. The review
   screen renders `preview()`. The push API route calls `push()`. v1 push
   handlers all return `{ status: "success", stubbed: true }`.
5. **Paragon is a destination but its `push()` is a no-op.** Paragon (CMLS) is
   manual entry; the value is the formatted copy-paste helper at
   `/listings/[id]/paragon`. Treating it as a destination keeps the review UI
   uniform.
6. **Photos & documents are URL references in v1.** No upload pipeline yet —
   `listing_photos` / `listing_documents` just hold strings. Replace with a
   real uploader (S3 / Railway volume / etc.) when we get there.
7. **No auth in v1.** Single-user app. Add NextAuth or similar before this
   leaves Angela's machine / a private URL.

## How to add a new destination

1. `mkdir src/destinations/<key>/`
2. Create `mapping.ts` listing fields + transforms (see `crexi/mapping.ts` as
   template).
3. Create `adapter.ts` exporting a `DestinationAdapter` (see any existing one).
   Implement `buildPayload`, `preview`, and `push`. For now `push` can just
   `logger.info` the payload and return success.
4. Import + add to the array in `src/destinations/index.ts`.
5. Run `npm run db:seed` — the seed script upserts the destination row.

That's it. The dashboard, review screen, and listing detail page all iterate
over `destinationAdapters`, so they pick it up automatically.

## How to add a new field

**Common field (applies to all subtypes):**

1. Add a column in `src/db/schema.ts` (the `listings` table).
2. Run `npm run db:generate` to create a migration, then `npm run db:migrate`.
3. Append a row to `FIELD_REGISTRY` in `src/fields/registry.ts` with the
   appropriate `section`. The form picks it up automatically.
4. Add the field to `createSchema` in `src/app/api/listings/route.ts` and
   include it in the insert.
5. Decide which destination mappings consume it; add lines to those
   `mapping.ts` files and surface in the adapter's `preview()`.

**Subtype-specific field (applies only to e.g. Office):**

1. Append a row to `FIELD_REGISTRY` with `appliesToSubtypes: ["office"]` and
   `jsonField: true`. **Do NOT add a column** — it goes into
   `listings.subtype_fields`.
2. Wire it through the form (the form will need a small extension to render
   subtype-specific fields and merge them into the `subtype_fields` JSON on
   submit — currently the slot is a TODO placeholder).
3. Update the relevant adapter `mapping.ts` (subtype mapping section) and
   surface in `preview()`.

## How the field registry works

`FIELD_REGISTRY` is a flat array of `FieldDef`. Each entry has:

- `key` — matches a Drizzle column for top-level fields, or a JSON key inside
  `subtype_fields` if `jsonField: true`.
- `kind` — `text | textarea | number | currency | select | enum_listing_type | enum_lease_type`
- `appliesToSubtypes` — empty/missing means "all subtypes". A subset like
  `["office", "industrial"]` restricts visibility.
- `section` — `identity | address | pricing | physical | agent | subtype` —
  drives form section grouping.

Helpers:
- `fieldsForSubtype(subtype)` — filtered by subtype.
- `fieldsBySection(subtype)` — same, grouped by section. Used by the form.

## Database

Migrations are generated by `drizzle-kit` from `schema.ts`. Initial migration
is generated at first run (`npm run db:generate`) — there's no migration
committed yet. After any schema change: `npm run db:generate` then
`npm run db:migrate`.

Seed script (`npm run db:seed`) upserts the four destinations into the
`destinations` registry table. Idempotent, run it any time the adapter list
changes.

## File conventions

- Server-only code (DB, adapters, logger, secrets) stays out of files marked
  `"use client"`. Pages are server components by default.
- Client interactivity (forms, copy buttons, push triggers) lives in dedicated
  client component files (`*.tsx` with `"use client"` at top).
- API routes live under `src/app/api/...`. Adapters are NEVER called from
  client code directly — always through an API route, so we can add auth /
  rate-limiting / queue offloading later.

## What NOT to do

- Don't add a destinations DB row + handler-in-DB pattern. Adapters are code.
- Don't store mapping configs in DB. Code.
- Don't bypass the API route to push directly from a server component (server
  actions would also work, but for v1 we use POST endpoints uniformly so future
  CLI / cron / mobile clients work the same way).
- Don't add subtype-specific top-level columns. JSON in `subtype_fields`.
