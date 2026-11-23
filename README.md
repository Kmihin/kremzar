# Kmetija Kremžar

Website and weekly ordering system for Kmetija Kremžar: public pages in
Slovenian, an order form for the open order round, and a private admin.

- Spec: [`docs/implementation-plan.md`](docs/implementation-plan.md)
- Code rules and review checklist: [`CLAUDE.md`](CLAUDE.md)
- Milestone notes: [`docs/milestones/`](docs/milestones/)

## Stack

Astro 7 (server output) on Cloudflare Workers via `@astrojs/cloudflare`,
Cloudflare D1 (SQLite) for all data, Workers KV for admin sessions, plain CSS,
Vitest running in workerd via `@cloudflare/vitest-plugin`.

## Requirements

- Node.js 22.23.4 or newer (required by Astro 7.4).
- Use `npm ci`, not `npm install`: the lockfile carries the binaries for every
  platform. Regenerate it only with `npm install --package-lock-only` in a
  folder without `node_modules`, otherwise npm drops the other platforms.
- npm.

## Local development

```sh
npm ci
npm run db:migrate:local   # creates the local D1 database and applies migrations
npm run db:seed:local      # sample products, a draft round and a news post (run once)
npm run dev                # http://localhost:4321
```

The admin is at `/admin`. Log in with `ADMIN_PASSWORD` from `.dev.vars`
(see Secrets).

## Working with rounds and photos

- Set prices before opening a round and do not change them while it is
  open. An order always uses the price at the moment it is submitted, so a
  customer who loaded the form before the change sees the old price in the
  running total and pays the new one (shown on the confirmation page).
- Photo upload in the admin needs JavaScript: the browser shrinks each photo
  to at most 1600 px and 500 KB before sending it.

## Scripts

| Script                     | What it does                                       |
| -------------------------- | -------------------------------------------------- |
| `npm run dev`              | Generate binding types, start Astro dev on workerd |
| `npm run build`            | Generate binding types, production build           |
| `npm run preview`          | Serve the production build locally on workerd      |
| `npm run check`            | Type and Astro checks                              |
| `npm test`                 | Vitest in workerd with a fresh local D1            |
| `npm run format`           | Format all files with Prettier                     |
| `npm run db:migrate:local` | Apply migrations to the local D1 database          |
| `npm run db:seed:local`    | Load `seed/seed.sql` into the local D1 database    |

## Database migrations

Migrations are numbered `.sql` files in `migrations/`, applied with
`wrangler d1 migrations apply`.

## Secrets

| Secret           | What it is                                                                   |
| ---------------- | ---------------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | The admin password. At least 32 random characters: `openssl rand -base64 32` |

- Locally: copy `.dev.vars.example` to `.dev.vars` and set the values.
  `.dev.vars` is git-ignored. `npm run dev` and `npm run preview` read it.
- On Cloudflare: `npx wrangler secret put ADMIN_PASSWORD` (once the Worker
  exists, see "Creating the D1 database and deploying").
- `wrangler.jsonc` lists the secret names under `secrets.required`, so the
  generated types include them without a `.dev.vars` file.
- `TURNSTILE_SECRET_KEY` follows in M6.

## Creating the D1 database and deploying

[Filled in M7.]

## Backup

[Filled in M7.]
