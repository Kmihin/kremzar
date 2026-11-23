# Kmetija Kremžar website: implementation plan

Status: approved at checkpoint 0, 2026-11-23, with the decisions in section 16.
Section 9 rewritten for the redesign (M2R).
This plan decides behaviour. `CLAUDE.md` decides code style. Any deviation from
either is asked about first.

## 1. Summary

A website for Kmetija Kremžar, a small family dairy farm in Slovenia:

- **Public pages** (Slovenian) about the farm, its products, news and gallery.
- **Weekly ordering**: Kristjan opens an order round with chosen products, prices
  and quantity limits. Anyone orders through a public form. He delivers in person
  Monday to Wednesday and collects cash.
- **Private admin** for Kristjan, usable on a phone.

Runs on Cloudflare Workers Free at a `*.workers.dev` address. Cost: 0 EUR.

## 2. Fixed decisions

| Topic         | Decision                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| Products      | Milk, yogurt, cheese, bread; more later (managed in admin)                                  |
| Customers     | Anyone, public form. Name required, phone optional. No accounts                             |
| Delivery      | In person, Monday to Wednesday; Kristjan tells each customer the day                        |
| Payment       | Cash on delivery. No online payment, no shipping                                            |
| Notifications | None (no email, no SMS). Kristjan reads orders in admin                                     |
| Admin         | One user (Kristjan), one password                                                           |
| Language      | Site: Slovenian only, `lang="sl"`. Code, comments, docs: English                            |
| Hosting       | Cloudflare Workers Free, `*.workers.dev`, no domain, 0 EUR                                  |
| Assets        | No photos or logo exist: logo and illustrated SVG placeholders are designed in this project |

### Tech stack

- Astro 7.x, TypeScript strict, `output: 'server'`.
- `@astrojs/cloudflare` 14.x on Cloudflare Workers.
- Cloudflare D1 for all data, including image bytes.
- Astro sessions in Workers KV (binding `SESSION`), admin login only.
- Plain CSS: tokens in `src/styles/tokens.css`, base in `src/styles/global.css`,
  the rest in scoped component styles. Fonts self-hosted via `@fontsource-variable`.
- No UI framework or kit. Vanilla TypeScript only where interaction needs it.
- Raw SQL with D1 prepared statements. Numbered `.sql` migrations applied with
  `wrangler d1 migrations apply`.
- Vitest for logic tests, run in workerd with `@cloudflare/vitest-plugin`
  so repository tests use a real local D1.

## 3. Verified facts (checked 2026-11-23, rechecked in M0)

- Latest `astro` is 7.4.13 and needs **Node >= 22.23.4**.
- Latest `@astrojs/cloudflare` is 14.4.9 (peers: `astro ^7.4.0`, `wrangler ^4.125.0`).
  Latest `wrangler` is 4.166.0.
- Bindings and secrets: `import { env } from 'cloudflare:workers'`.
  `Astro.locals.runtime` no longer exists. Execution context: `Astro.locals.cfContext`.
- Non-secret vars and bindings in `wrangler.jsonc`. Secrets with
  `npx wrangler secret put NAME`; locally in `.dev.vars`.
- `wrangler.jsonc` `main` is `"@astrojs/cloudflare/entrypoints/server"`. No `assets` block needed.
- `astro dev` and `astro preview` run on workerd. Add `"compatibility_flags": ["nodejs_compat"]`.
  Run `wrangler types` after config or `.dev.vars` changes (scripts are prefixed with `wrangler types &&`).
- Sessions use KV automatically, default binding `SESSION`.
- **The adapter's default `imageService` is `'cloudflare-binding'` (the Images binding).**
  We set `imageService: 'passthrough'`. Nothing is processed at build time or at runtime.
- Actions: `defineAction({ accept: 'form', input })`, zod from `'astro/zod'`.
  `<form method="POST" action={actions.x}>` works without JavaScript on on-demand pages.
  Results via `Astro.getActionResult()`. Input errors via `isInputError()` and `error.fields`.
  Actions are public endpoints (`/_actions/<name>`) and must be authorized.
- Version constraints:
  - `@astrojs/check` 0.9.12 supports TypeScript `^5 || ^6` only, so **TypeScript is pinned to 6.0.3** (7.x is latest).
  - `@cloudflare/vitest-pool-workers` is deprecated (renamed to `@cloudflare/vitest-plugin`).
    We use `@cloudflare/vitest-plugin` 1.9.0 with vitest 5.1.1 (decided 2026-11-23).

Still to verify in M0 (report any surprise before building on it):

- An Astro session that is only read (no `set`) creates no cookie and no KV write.
- Session cookie options (`httpOnly`, `secure`, `sameSite`) and TTL configuration.
- What type D1 returns for a BLOB column on workerd.
- `crypto.subtle.timingSafeEqual` is available on workerd.
- Whether `wrangler deploy` auto-creates the `SESSION` KV namespace.
- `wrangler d1 export` handles BLOB columns.

## 4. Architecture

- **Request path**: page or action → service (business rules) → repository (SQL) → D1.
- **Bindings**: `DB` (D1), `SESSION` (KV).
- **Vars** (`wrangler.jsonc`): `TURNSTILE_SITE_KEY`, `SITE_URL`.
- **Secrets**: `ADMIN_PASSWORD`, `TURNSTILE_SECRET_KEY`. Local values and Turnstile
  test keys go in `.dev.vars` (git-ignored), with a committed `.dev.vars.example`.
- **Mutations**: Astro form actions for all of them, public and admin (the docs
  support this cleanly). Forms post natively. No session-based result persistence,
  because that would create sessions for public visitors. A successful order
  redirects to `/narocilo/hvala/[publicCode]`.
- **Rendering**: on demand. Pages that read no data (`/o-kmetiji`, `/kontakt`,
  `/zasebnost`, 404) are prerendered.

### Folder structure

```
migrations/            0001_init.sql, ...
docs/                  implementation-plan.md, milestones/, todo-content.md, photos.md
public/                favicon.svg, robots.txt, og-image.png
design-reference/      Lovable prototype, read-only, git-ignored (M2R)
src/
  pages/               routes (public, admin/, media/[id].ts, sitemap.xml.ts)
  layouts/             BaseLayout.astro, AdminLayout.astro
  components/          Button, Card, Field, Badge, ProductCard, ...
  actions/index.ts     all actions (public + admin namespace)
  middleware.ts        admin guard
  models/              one interface per file
  consts/              statuses, error codes, Slovenian error messages
  db/                  <name>Repository.ts, all SQL
  services/            business rules
  styles/              tokens.css, global.css
  config/site.ts       farm name, contact, socials
  assets/photos/       placeholder photos (see docs/photos.md)
tests/                 Vitest (runs in workerd via @cloudflare/vitest-plugin)
```

## 5. Data model

Conventions:

- Column names are camelCase and equal model property names. Queries return
  declared models with no mapping code.
- Money is integer cents.
- Timestamps are ISO-8601 UTC text, set in code (`new Date().toISOString()`),
  displayed in `Europe/Ljubljana` with `sl-SI`.
- SQLite has no boolean type. Flags are `INTEGER` 0/1 and typed `number` in models.
- D1 enforces foreign keys.

| Table         | Columns                                                                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product       | id INTEGER PK, slug TEXT UNIQUE, name, description, ingredients, allergens, unit TEXT (e.g. "1 l", "500 g", "kos"), priceCents INTEGER, imageId INTEGER NULL → Image, isActive INTEGER, sortOrder INTEGER |
| Round         | id, title, deliveryInfo TEXT, status TEXT CHECK IN ('draft','open','closed'), createdAt TEXT, closedAt TEXT NULL                                                                                          |
| RoundProduct  | id, roundId → Round, productId → Product, priceCents INTEGER (snapshot), stockLimit INTEGER NULL (null = unlimited), UNIQUE(roundId, productId)                                                           |
| CustomerOrder | id, publicCode TEXT UNIQUE, roundId → Round, customerName TEXT, phone TEXT NULL, status TEXT CHECK IN ('new','delivered','cancelled'), isPaid INTEGER, totalCents INTEGER, createdAt TEXT                 |
| OrderItem     | id, orderId → CustomerOrder ON DELETE CASCADE, roundProductId → RoundProduct, productName TEXT, unit TEXT, unitPriceCents INTEGER, quantity INTEGER                                                       |
| NewsPost      | id, slug TEXT UNIQUE, title, body TEXT (plain text, blank line = new paragraph), imageId NULL → Image, publishedAt TEXT NULL (null = draft)                                                               |
| GalleryPhoto  | id, imageId → Image, caption TEXT, sortOrder INTEGER                                                                                                                                                      |
| Image         | id, contentType TEXT, data BLOB, width INTEGER, height INTEGER, createdAt TEXT                                                                                                                            |

Indexes (besides the UNIQUE ones above):

- `Product(isActive, sortOrder)`
- `Round(status) WHERE status = 'open'`, a **partial unique index**, so the
  database itself allows only one open round
- `CustomerOrder(roundId, status)`
- `OrderItem(orderId)`, `OrderItem(roundProductId)`
- `NewsPost(publishedAt)`, `GalleryPhoto(sortOrder)`

### Rules

1. **One open round.** Opening a round is one `db.batch()`: close the open round
   (set `closedAt`), then open the target. The partial unique index is the safety net.
2. **Remaining stock** = `stockLimit - SUM(quantity)` over items of non-cancelled
   orders. Never stored. Shown as at least 0. `stockLimit NULL` means unlimited.
   Lowering a limit below what is already ordered shows the product as "Razprodano".
3. **No double orders.** The server generates `publicCode` (`crypto.randomUUID()`)
   when it renders the order form and posts it as a hidden field. When the form is
   re-rendered with errors it keeps the same value. On submit the code is validated
   as a UUID, then an order with that code is looked up first: if it exists, the
   customer is redirected to its confirmation page and nothing is written.
   For two simultaneous submits the UNIQUE constraint on `publicCode` is the safety
   net: the second batch fails as a whole and is redirected the same way.
   `INSERT OR IGNORE` is never used here, because the item inserts would then
   attach to the existing order.
4. **No overselling under concurrent orders:**
   1. Validate input. Look up the order by `publicCode` (rule 3). Load the open
      round's products in one query. Compute line totals and `totalCents` on the
      server from `RoundProduct.priceCents` (client prices are never trusted).
   2. One `db.batch()`:
      - `INSERT CustomerOrder ... SELECT ... WHERE` the round is still open.
      - Per item: `INSERT OrderItem ... SELECT ... WHERE` the stock limit is
        null or the remaining stock is at least the quantity (remaining =
        stockLimit minus quantities in non-cancelled orders). Items find their
        order through its `publicCode`.
   3. If the batch fails on the `publicCode` UNIQUE constraint, redirect to the
      existing order (rule 3).
   4. Check `meta.changes` of every statement. If any is 0, delete the order
      (items cascade) and show the customer which products ran out. The form keeps its values.
   - At most 3 + items queries per order, well under the 50-query limit.

## 6. Public pages

| URL                            | Content                                                                                                                                                                                      | Data |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `/`                            | Hero with order status, availability strip, "this week's offer" (open round, up to 3 cards), photo tiles (products, news, gallery), farm story band, 3-step "how ordering works" (section 9) | D1   |
| `/o-kmetiji`                   | Story, animals, how products are made                                                                                                                                                        | none |
| `/izdelki`, `/izdelki/[slug]`  | Catalogue of active products; detail with description, ingredients, allergens, unit, price                                                                                                   | D1   |
| `/narocilo`                    | Order form (section 7)                                                                                                                                                                       | D1   |
| `/narocilo/hvala/[publicCode]` | Confirmation with order summary (noindex)                                                                                                                                                    | D1   |
| `/novice`, `/novice/[slug]`    | Published news, newest first; detail                                                                                                                                                         | D1   |
| `/galerija`                    | Gallery photos by `sortOrder`                                                                                                                                                                | D1   |
| `/kontakt`                     | Phone, address, link to a map (no embed), social links                                                                                                                                       | none |
| `/zasebnost`                   | Short privacy notice: stores name, optional phone and the order; Turnstile is used on the order form                                                                                         | none |
| 404, 500                       | Slovenian error pages, no exception text                                                                                                                                                     | none |

Content rules:

- Natural Slovenian copy. Never invent facts (address, phone, history, number of
  animals, prices). Unknown facts become visible `[TODO Kristjan: ...]` markers,
  all listed in `docs/todo-content.md`.
- Site constants (farm name, contact, socials) live in `src/config/site.ts`.
- SEO: `sitemap.xml` endpoint (static pages + active products + published news),
  `robots.txt` (disallows `/admin`), title, description and OG tags on every
  public page. OG image is an illustrated PNG in `public/`.

## 7. Order flow

- One page, no cart. Lists products of the open round, each with price, unit,
  remaining stock ("Še 5 na voljo") or a "Razprodano" badge, and a quantity
  stepper. Max per product = min(remaining, 20).
- The stepper is a native `<input type="number">` with minus and plus buttons
  added by JavaScript.
- Live total with JavaScript. On mobile a sticky bar shows the total and
  "Oddaj naročilo". Without JavaScript the form still works; the total appears on
  the confirmation page.
- Fields: `name` ("Ime in priimek", required), `phone` ("Telefon", optional),
  honeypot `website` (hidden, must stay empty), `publicCode` (hidden, generated
  on render, section 5 rule 3), Turnstile token (M6). Product rows post
  `roundProductId` and `quantity` pairs; sold-out rows post nothing.
- Text explains: delivery Monday to Wednesday in person, cash on delivery, plus
  the round's `deliveryInfo`.
- Server validation (zod):
  - name trimmed, 2 to 80 characters;
  - phone optional, up to 20 characters of digits, spaces and `+ / - ( )`;
  - quantities are integers from 0 to min(remaining, 20);
  - at least one quantity above 0;
  - honeypot empty;
  - `publicCode` is a UUID;
  - Turnstile verified with `siteverify` (no IP sent).
- Errors are codes from `src/consts` mapped to friendly Slovenian messages, shown
  next to fields. The form keeps its values.
- A repeated submit (double click, back and resubmit) never creates a second
  order: it lands on the first order's confirmation page.
- No open round: the page says orders are closed and shows no form.
- Works without JavaScript except the Turnstile widget.

## 8. Admin

Slovenian UI, phone-first, noindex (meta tag and `X-Robots-Tag` header).

| Route                                                         | Purpose                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/prijava`                                              | Login                                                                                                                                |
| `/admin`                                                      | Dashboard: open round, order count, quantity per product (what to prepare), revenue (non-cancelled orders; paid vs unpaid)           |
| `/admin/krogi`, `/admin/krogi/nov`, `/admin/krogi/[id]`       | Rounds: list, create (option "copy products and limits from the previous round"), set per-product price and stock limit, open, close |
| `/admin/narocila`, `/admin/narocila/[id]`                     | Orders per round, filter by status; mark delivered, mark paid, cancel (releases stock), edit quantities                              |
| `/admin/izdelki`, `/admin/izdelki/nov`, `/admin/izdelki/[id]` | Products: create, edit, activate or deactivate, sort order, image                                                                    |
| `/admin/novice`, `/admin/novice/nov`, `/admin/novice/[id]`    | News: create, edit, publish or unpublish, delete, image                                                                              |
| `/admin/galerija`                                             | Gallery: upload, edit caption and order, delete                                                                                      |

Details:

- **Login**: compare SHA-256 of the input with SHA-256 of `ADMIN_PASSWORD` using
  `crypto.subtle.timingSafeEqual`. On success, regenerate the session and set
  `isAdmin`. Logout destroys the session. Session TTL 30 days.
  No lockout: the password is a long random string (at least 32 characters).
- **Guard** (`src/middleware.ts`): every `/admin/*` route except `/admin/prijava`,
  and every action in the `admin` namespace, requires the session flag. Otherwise
  it redirects to login (pages) or returns 403 (actions). Public requests never
  touch `Astro.session`, so no cookie and no KV traffic.
- **Rounds**: a new round starts as draft. Prices are copied from
  `Product.priceCents` (or from the previous round when copying). Price changes
  on an open round affect only new orders (items keep `unitPriceCents`).
  A closed round can be opened again. A product that already has orders in a
  round stays in that round (its order items point to it); the admin shows it
  as included and cannot untick it.
- **Order status**: new can become delivered or cancelled; delivered can go
  back to new. Cancelled is final, because its stock may already be sold
  again. Cancelling and deleting need a ticked checkbox (no JavaScript).
- **Edit quantities**: only while the order is new. Uses the same stock
  condition as ordering, without counting the line itself; a lower quantity
  always fits. Lines that do not fit keep their quantity and the other
  changes are saved. Quantity 0 removes the item, but not the last one
  (cancel the order instead). The order total is recalculated.
- **Image upload** (admin needs JavaScript here):
  1. The browser resizes on a canvas to max 1600 px on the longest side and
     encodes WebP, lowering quality until under 500 KB. If the blob the canvas
     returns is not `image/webp` (for example in Safari), it encodes JPEG under
     the same limits instead.
  2. The form posts the file plus width and height.
  3. The server accepts only `image/webp` and `image/jpeg`, checks size (500 KB
     max) and dimensions, then inserts an `Image` row. The type comes from the
     file's first bytes, not from what the browser sends.
  - On the pages: product photos fill a 4:5 frame and news photos a 3:2
    frame (cropped); gallery photos keep their shape, with the caption as
    alt text. A product without a photo keeps its placeholder.
  - Images are immutable. Replacing one creates a new row and deletes the old one.
  - `/media/[id]` serves the bytes with `Cache-Control: public, max-age=31536000, immutable`.
  - All image storage goes through `src/db/imageRepository.ts` (the R2 swap point).
  - `imageRepository` reads the bytes with `SELECT hex(data)` and decodes them
    with `Uint8Array.fromHex()`, with a one-line comment saying why: D1 returns
    a BLOB as a JS array of numbers, which costs about 5.6 ms of Worker CPU at
    500 KB; the hex read costs about 0.5 ms (measured in M0). The hex read
    stays inside `imageRepository`.

## 9. Design

Rebuilt in M2R after the first design was rejected. The reference is a
Lovable prototype for the same farm, unpacked read-only in `design-reference/`
(git-ignored, never built or imported). Its look is ported to plain CSS with
tokens; none of its text, facts, packages or extra features are used.

- **Direction**: modern rustic agrarian. Deep barn green, warm cream, harvest
  gold; large serif headings, a calm sans body, real photos, generous space.
- **Tokens** (`src/styles/tokens.css`, contrast measured on cream):

  | Token            | Value                | Use and contrast                                                                      |
  | ---------------- | -------------------- | ------------------------------------------------------------------------------------- |
  | green            | `#172c1f`            | text and dark bands; 14.4:1                                                           |
  | cream            | `#fdfcf7`            | page background; text on green 14.4:1                                                 |
  | gold             | `#bd9f66`            | wordmark (a logo) and decoration only: 2.5:1, below 3:1 even for large text           |
  | gold-ink         | `#80642b`            | all gold text: prices, the hero accent line, highlighted links; 5.4:1 (5.0:1 on tint) |
  | text-strong      | `#45564a`            | body copy on detail pages; 7.6:1                                                      |
  | text-soft        | `#5c6a60`            | secondary text and small uppercase labels; 5.6:1 (5.3:1 on tint)                      |
  | control-border   | `#8a948b`            | form control borders; 3.1:1                                                           |
  | line, line-faint | `#e1e3dd`, `#eff0ea` | decorative borders                                                                    |
  | tint             | `#f2f2ec`            | light band                                                                            |
  | on-green-soft    | `#cfd2cc`            | body text on green; 9.7:1                                                             |
  | success          | `#3b9555`            | the "orders open" dot (decoration)                                                    |

  The reference uses 60% green for small labels; that is only 4.1:1 on
  cream, so small labels use text-soft (70% green). White text on gold is
  never used.

- **Type**: Playfair Display (headings, wordmark, prices; italic for the
  accent line) and Inter (body, labels, buttons). Self-hosted with
  `@fontsource-variable/playfair-display` and `@fontsource-variable/inter`,
  latin and latin-ext. Small uppercase labels at least 0.6875rem.
- **Layout**: mobile first, content width 80rem, 1.5rem side padding. Rounded
  photos (0.75 to 1.25rem radii), pill buttons, thin green lines.
- **Components**: wordmark ("KMETIJA" green, "KREMŽAR" italic gold), sticky
  header with the no-JavaScript phone menu, availability strip (scrolling
  green band, static when the round is closed or under reduced motion),
  product card (4:5 photo, availability badge, unit, gold-ink price, details
  button; sold out: grey photo with a "Razprodano" veil), photo tiles, footer
  with wordmark, delivery and page links.
- **Home**: hero with a status line (pulsing dot and "Naročila za ta teden so
  odprta" when a round is open, otherwise a still dot and "Naročila so trenutno
  zaprta"); availability strip; "Ta teden v ponudbi" (up to 3 cards); photo
  tiles (Izdelki, Novice, Galerija); green band "Naša kmetija"; tint band
  "Kako naročiti" with three numbered steps.
- **Product page**: photo left; name, price, description, a white "Ta teden"
  panel (remaining stock, "Razprodano", "Ta teden ni v ponudbi" or
  "Naročila so zaprta") with a button to `/narocilo`; Sestavine and Alergeni
  (allergens in bold); other products below.
- **Photos**: the reference's photos in `src/assets/photos/` (listed in
  `docs/photos.md`), served as static files. A product without an uploaded
  photo shows a placeholder chosen by slug in `src/config/productPhotos.ts`.
  Kristjan replaces the files with his own under the same names.
- **Motion**: the hero text rises in once, the status dot pulses, the strip
  scrolls. All of it stops under `prefers-reduced-motion`.
- **Favicon**: the cow emblem in green (`public/favicon.svg`).
- `/narocilo` and the admin use the same tokens and components; the admin
  stays plain and functional.

## 10. Security and privacy

- Parameterised queries only. Astro escapes output; no `set:html` with user text.
  News body is split into paragraphs in code, not rendered as HTML.
- Session cookie `httpOnly`, `secure`, `sameSite=lax`. Astro's origin check for
  POSTs stays on.
- No analytics, tracking, third-party fonts or embeds. Turnstile is the only
  third-party script; the brief requires it and it loads only on `/narocilo`.
- No IP addresses stored or sent to Turnstile.
- No secrets in code or committed files. Code never logs names, phone numbers or secrets.
- Expected errors are shown by code with a Slovenian message. Never exception text.

## 11. Free-plan budget

| Limit                            | How we stay inside                                                                |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Workers 100k req/day             | Small audience; static pages prerendered; `/media` cached by browsers (immutable) |
| 10 ms CPU per request            | SHA-256 only (no bcrypt, PBKDF2 or argon); no runtime image work; small handlers  |
| D1 reads 5M/day, writes 100k/day | Indexed queries, no N+1; remaining stock is one grouped query per round           |
| D1 50 queries per request        | Order submit is at most about 25 statements                                       |
| D1 2 MB per row, 500 MB total    | Images capped at 500 KB                                                           |
| KV 1,000 writes/day              | Only admin login and logout write to KV                                           |

Image serving CPU (measured in M0, details in `docs/milestones/m0.md`): reading
a 500 KB BLOB directly costs about 5.6 ms of Worker CPU for decoding alone, so
images are read with `hex(data)` (about 0.5 ms). Whole Worker request for a
500 KB image: at most 3.9 ms locally, estimated 2 to 2.5 ms. The real CPU time
is checked in the Cloudflare dashboard after the first deploy (M7).

## 12. Deployment (exact commands in the README, M7)

1. Kristjan is already logged in to Wrangler (account Kmihin, Workers Free).
   The agent never runs `wrangler login` and never deploys.
2. `npx wrangler d1 create kremzar`, then put the database id in `wrangler.jsonc`.
3. `npx wrangler d1 migrations apply kremzar --remote`.
4. `npx wrangler secret put ADMIN_PASSWORD` and `npx wrangler secret put TURNSTILE_SECRET_KEY`.
5. Create a Turnstile widget in the Cloudflare dashboard for the `workers.dev`
   hostname and put its site key in `wrangler.jsonc`.
6. `npm run build`, then `npx wrangler deploy`.
7. Backup: `npx wrangler d1 export kremzar --remote --output=backup-YYYY-MM-DD.sql`
   (D1 Time Travel also keeps 7 days on the free plan).

## 13. Milestones

Each milestone ends with `docs/milestones/m<N>.md`, all checks passing (section 15)
and a report. Nothing is staged or committed.

| #   | Goal                                                                                                                                                                                  | Done when                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Verify docs (section 3 open checks), scaffold, `wrangler.jsonc`, local D1, first migration, tokens.css, global.css, prettier, Vitest in workerd, README skeleton                      | `astro dev` serves a blank Slovenian page on workerd; migration applies locally; all four checks pass; verification results and the measured CPU time for serving a 500 KB image recorded (above 5 ms: stop and propose options) |
| M1  | Design system, 3 logo concepts, base layout (header, footer, nav), home page with placeholders                                                                                        | **CHECKPOINT**: logo concepts plus mobile and desktop screenshots of home approved                                                                                                                                               |
| M2  | Remaining public pages (except `/narocilo` and `/zasebnost`); read-only repositories and services for products, news and gallery; the dev seed script (pulled forward from M7)        | Every public URL renders on a phone viewport from local D1 seed data; all TODOs listed in `docs/todo-content.md`                                                                                                                 |
| M2R | Redesign to the Lovable reference: tokens, fonts, photos, header, footer, product card, availability strip, home, product pages; read side of the open round                          | Home, `/izdelki` and a product page match the reference on phone and desktop; all four checks pass; **CHECKPOINT**: screenshots approved                                                                                         |
| M3  | Write side of the repositories and services, admin login, products and rounds admin, the `/admin` dashboard (decision H)                                                              | Kristjan can log in, manage products, create, copy, open and close rounds; guard blocks unauthenticated pages and actions                                                                                                        |
| M4  | Order flow with the stock and double-submit rules; Vitest tests for totals, validation, the stock rule (with a concurrent-order case) and double submit (sequential and simultaneous) | An order can be placed without JS; overselling and double orders are impossible in tests; confirmation page works                                                                                                                |
| M5  | Orders admin, news, gallery, image upload                                                                                                                                             | All admin functions in section 8 work on a phone; images upload and are served from `/media/[id]`; a test shows that an image of the maximum size (500 KB) round-trips through `imageRepository` unchanged                       |
| M6  | Turnstile, accessibility pass (WCAG AA, keyboard, labels), SEO, performance, privacy page                                                                                             | Public pages ship almost no JS; keyboard-only order works; sitemap, robots, meta and OG present                                                                                                                                  |
| M7  | Final seed script check and the final README                                                                                                                                          | README covers local run, migrations, seeding, D1 creation, secrets, deploy, backup; plan deviations and all TODOs reported                                                                                                       |

## 14. What Kristjan provides

- Facts for `[TODO Kristjan: ...]` markers: address, phone, social links, farm
  story, animals, how products are made, per product description, ingredients,
  allergens, unit and price.
- Choice of logo concept (M1 checkpoint).
- Photos later, matching the slots in `docs/photos.md`.
- Cloudflare by hand: D1 database, Turnstile widget, secrets, deploy (section 12).
- A long random admin password (for example `openssl rand -base64 32`).
- Review and commits after every milestone.

## 15. Checks before finishing any milestone

- `npm run check`, `npm run build`, `npm test`, `npx prettier --check .` pass.
- Every changed flow walked in `astro dev` on a phone-sized viewport.
- `CLAUDE.md` checklist run on the diff; every "no" fixed.
- Report: files changed and why, new config keys and secrets, what was not done.
- If a check fails: stop and report. Checks are never changed to make them pass.

## 16. Decisions taken at checkpoint 0

| #   | Decision                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | Tests run in workerd with `@cloudflare/vitest-plugin` (added to the allowed packages; replaces the deprecated `@cloudflare/vitest-pool-workers`); vitest 5.1.1                                                                  |
| O2  | `/o-kmetiji`, `/kontakt`, `/zasebnost` and 404 are prerendered                                                                                                                                                                  |
| O3  | Admin session lifetime is 30 days                                                                                                                                                                                               |
| O4  | Upload checks the canvas blob type; if not WebP, JPEG under the same limits. The server accepts only `image/webp` and `image/jpeg`                                                                                              |
| O5  | `CLAUDE.md` keeps the Workflow section and the extra checklist items                                                                                                                                                            |
| A   | Double submit never creates two orders: server-generated `publicCode` in a hidden field, lookup first, UNIQUE as safety net (section 5 rule 3)                                                                                  |
| B   | `CLAUDE.md` folder list includes `src/actions`, `src/assets` and `tests/`                                                                                                                                                       |
| C   | M0 measures the CPU time for serving a 500 KB image from D1; above 5 ms, stop and propose options                                                                                                                               |
| D   | Images are read with `SELECT hex(data)` and `Uint8Array.fromHex()`, only inside `imageRepository` (decided after M0; section 8). Fallback if it ever exceeds 5 ms: Workers KV for the image bytes                               |
| E   | SQL is allowed in `tests/` for schema checks and test data; the behaviour under test goes through services and repositories (`CLAUDE.md`)                                                                                       |
| F   | M2 builds the read side (repositories and services for products, news and gallery) and the dev seed script, so the public pages read real local D1 data; M3 adds the write side (decided at the start of M2)                    |
| G   | M2R replaces the M1 visual design with the reference look (section 9). The open round's products and remaining stock are read already in M2R for the availability strip and the product cards (decided by Kristjan, 2026-11-23) |
| H   | The `/admin` dashboard is built in M3, because it is the page shown after login. Its order figures stay at zero until orders exist (M4)                                                                                         |
