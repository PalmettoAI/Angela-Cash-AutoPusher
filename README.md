# Angela Cash Listing Push Hub

Single-entry web app for commercial real estate listings. Angela enters a listing
once, reviews how it'll appear on each destination (Crexi, LoopNet, angelacash.com,
Paragon paste view), approves, and pushes everywhere.

This repo is the **scaffold**. All destination push handlers are stubs that log
the payload they would have sent. Real Crexi/LoopNet/site integrations are
incremental follow-up work.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Postgres + Drizzle ORM
- Tailwind + shadcn/ui (primitives only — no CLI install needed)
- react-hook-form + zod
- pino logging
- Railway deploy via `Dockerfile.web`

## Quick start

```bash
cp .env.example .env
docker-compose up -d            # local Postgres
npm install
npm run db:generate             # generate initial migration from schema
npm run db:migrate              # apply migrations
npm run db:seed                 # insert the four destinations
npm run dev                     # http://localhost:3000
```

End-to-end you should be able to:

1. Create a commercial listing at `/listings/new` (pick a subtype, fill common fields)
2. Hit Review (`/listings/[id]/review`) and see four destination preview cards
3. "Publish to all" — each destination logs a stubbed push and writes a
   `push_attempts` row with `status = success`
4. Open `/listings/[id]/paragon` for the copy-paste helper view

## Layout

```
src/
  app/                       Next.js App Router pages + API routes
    api/listings/            POST create
    api/listings/[id]/push/[destinationKey]   POST push (or "all")
    listings/new/            master form
    listings/[id]/           detail + history
    listings/[id]/review/    per-destination preview + approve
    listings/[id]/paragon/   copy-paste helper
  components/                ListingForm + shadcn/ui primitives
  db/                        Drizzle schema, client, migrate, seed
  destinations/              one folder per destination
    angela-site/             internal API push (stubbed)
    crexi/                   Playwright push (stubbed)
    loopnet/                 Playwright push (stubbed)
    paragon-paste/           manual entry — push() is no-op
  fields/                    field registry (single source of truth)
  lib/                       logger, utils
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture decisions and how to add a new
destination or field.

## Deploy (Railway)

The `Dockerfile.web` builds a Next.js standalone output. The Railway service
should:

1. Build from this Dockerfile (`Dockerfile.web` set as the Dockerfile path)
2. Have a `DATABASE_URL` env var pointing to a Railway Postgres add-on
3. Run `npm run db:migrate && npm run db:seed` once after first deploy
   (Railway "Custom Start Command" or a one-off shell)

## Roadmap

v1 (this scaffold):
- ✅ Master form + review/approve flow + Paragon paste view + 4 stubbed destinations

v2 (next, one at a time):
- Crexi Playwright push (record session, persist auth, fill form)
- LoopNet Playwright push
- angelacash.com internal API push
- Subtype-specific field schemas (inventory each portal's actual form)
- Photo upload pipeline (currently URL refs only)

Out of scope for v1: auth, edit/sync, FB/IG, email/SMS notifications.
