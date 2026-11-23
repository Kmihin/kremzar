# M2R: Redesign to the reference

## Goal

Rebuild the visual layer to look like the Lovable prototype
(`design-reference/`), keeping the data model, repositories, services, routes,
tests and the rest of the plan.

Done when: home, `/izdelki` and a product page match the reference on phone
and desktop, all four checks pass, and Kristjan approves the screenshots
(CHECKPOINT).

Status: built, waiting for the checkpoint.

## What changed

| Area                   | Files                                                                                                                                                                              | Why                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Reference              | `design-reference/` (unpacked zip), `.gitignore`, `.prettierignore`, `tsconfig.json` (exclude)                                                                                     | Read-only reference, never built, imported or committed                                                                            |
| Packages               | `package.json`, `package-lock.json`                                                                                                                                                | `@fontsource-variable/playfair-display` 5.3.0 and `@fontsource-variable/inter` 5.3.0 in; Fraunces and Source Sans 3 out            |
| Tokens and base        | `src/styles/tokens.css`, `src/styles/global.css`                                                                                                                                   | Reference colours, radii, fonts, motion; gold-ink; contrast-checked text tints                                                     |
| Photos                 | `src/assets/photos/*.jpg` (7 files), `src/config/productPhotos.ts`                                                                                                                 | Placeholder photos; product placeholder by slug                                                                                    |
| Open round (read side) | `src/consts/statuses.ts`, `src/db/roundRepository.ts`, `src/services/offerService.ts`, models `Round`, `Offer`, `OfferProduct`, `Availability`, `ProductCardView`, `StripItem`     | Status line, availability strip, cards and the product panel show real data; remaining stock is computed from orders, never stored |
| Products               | `src/services/productService.ts`, `src/models/ProductView.ts`                                                                                                                      | Cards and product page with this week's price and availability                                                                     |
| News                   | `src/db/newsRepository.ts`, `src/services/newsService.ts`                                                                                                                          | Home no longer lists news (a tile links to `/novice`), so the "latest news" functions went                                         |
| New components         | `Wordmark`, `AvailabilityStrip`, `ProductCard`, `ProductPhoto`, `PhotoTile`                                                                                                        | Reference components                                                                                                               |
| Restyled components    | `SiteHeader`, `SiteFooter`, `NavList`, `Button`, `Badge`, `PageSection`, `PageIntro`, `PageBody`, `EmptyState`, `BackLink`, `NewsTeaser`, `OrderSteps`, `BaseLayout`               | Reference look                                                                                                                     |
| Pages                  | `index`, `izdelki/index`, `izdelki/[slug]`, `o-kmetiji`, `kontakt`, `novice/*`, `galerija`, `404`                                                                                  | Reference layouts; our copy and TODO markers                                                                                       |
| Removed                | `src/assets/illustrations/`, `src/assets/logo/`, `src/styles/illustrations.css`, `Logo`, `LogoStamp`, `HillDivider`, `OfferList`, `ProductIllustration`, `src/models/OfferLine.ts` | Our M1 visual layer                                                                                                                |
| Tests                  | `tests/offer.test.ts`                                                                                                                                                              | Remaining stock ignores cancelled orders; availability labels (9 tests in total)                                                   |
| Docs                   | `docs/implementation-plan.md` (section 9, sections 4 and 6, M2R, decision G), `docs/photos.md`, `docs/todo-content.md`                                                             | Match the new design                                                                                                               |

No new config keys or secrets. The favicon (cow emblem in green) is unchanged.

## Decisions

- **Gold text uses gold-ink everywhere.** Plain gold (`#bd9f66`) on cream is
  2.5:1, below the 3:1 WCAG asks even for large text. So gold-ink
  (`#80642b`, 5.4:1) is used for every gold text, including the large hero
  line and the product price. Plain gold remains only in the wordmark (a logo
  is exempt) and in decoration (strip dots), plus the "Več o kmetiji" link on
  green, where it is 5.9:1.
- **Small labels use 70% green, not 60%.** 60% green on cream is 4.1:1, below
  4.5:1 for small text. `text-soft` (70%) is 5.6:1.
- **Sold-out cards** keep the reference's grey photo and "Razprodano" veil but
  do not fade the whole card to 60%, because faded text would fall below
  4.5:1. Name and price turn to text-soft instead.
- **Availability labels**: "Na voljo" for unlimited stock, "Še N" for limited
  stock, "Razprodano" at zero. The product page panel uses the longer
  "Še N na voljo", "Ta teden ni v ponudbi" (not in the open round) or
  "Naročila so zaprta" (no open round).
- **Prices**: a product in the open round shows the round's price, otherwise
  its regular price.
- **Header**: the last navigation item, "Naročilo", is gold-ink, as the
  reference highlights its last item. Order of links: Izdelki, O kmetiji,
  Novice, Galerija, Kontakt, Naročilo.
- **Photos** are plain `<img>` tags with the imported file's size, not
  Astro's `<Image>`: with the passthrough image service `<Image>` would route
  every photo through the Worker; plain files are served as static assets.
- **Astro 7 whitespace**: Astro 7 removes whitespace between elements, so the
  wordmark has an explicit `{" "}` between "KMETIJA" and "KREMŽAR".
- **Strip loop**: each half of the track is at least as wide as the screen,
  so the loop has no gap on wide screens.
- Product page "other products" heading is "Drugi izdelki" (the reference's
  copy is not used).

## Left out (as instructed)

English and the language switch, the Google Fonts link, lactose-free, eggs,
categories and filters, lead time, daily capacity, storage, shelf life, the
thumbnail row, pickup, FAQ and terms pages, the "online ordering in
preparation" note, `farm-family.jpg` and `product-eggs.jpg`, and all of the
reference's text and facts.

## Checks

- `npm run check`, `npm run build`, `npm test` (9 tests), `npx prettier --check .` pass.
- Walked at 390 px and 1280 px with the round closed (seed) and open (local
  test data only: round opened, one product at 4 left, one sold out). No
  horizontal scroll. Unknown product answers 404.

## By hand (Kristjan)

1. `npm ci` (new font packages), `npm run dev`.
2. To see the open state locally:
   `npx wrangler d1 execute kremzar --local --command "UPDATE Round SET status = 'open'"`.
   The admin will do this from M3.
3. Replace the photos in `src/assets/photos/` with your own when you have
   them (same names).
4. Review and commit. `design-reference/` stays out of git.
