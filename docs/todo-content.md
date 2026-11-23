# Content Kristjan provides

Every `[TODO Kristjan: ...]` marker on the site. The markers are visible on
purpose, so nothing invented can go live unnoticed. Replace the marker text in
the listed place; the marker disappears with it.

## In the code

| Marker                                                                          | File                        | Shown on                                            |
| ------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| `[TODO Kristjan: telefonska številka]`                                          | `src/config/site.ts`        | Footer of every page, `/kontakt` (as a `tel:` link) |
| `[TODO Kristjan: naslov kmetije]`                                               | `src/config/site.ts`        | Footer of every page, `/kontakt`                    |
| `[TODO Kristjan: povezava na zemljevid]` (label and `href`)                     | `src/config/site.ts`        | `/kontakt`                                          |
| `[TODO Kristjan: Instagram]`, `[TODO Kristjan: Facebook]` (label and `href`)    | `src/config/site.ts`        | `/kontakt`                                          |
| `[TODO Kristjan: dva ali trije stavki o zgodbi kmetije]`                        | `src/pages/index.astro`     | Home, green band "Naša kmetija"                     |
| `[TODO Kristjan: kdo smo, od kdaj kmetujemo, kje je kmetija]`                   | `src/pages/o-kmetiji.astro` | `/o-kmetiji`, "Naša zgodba"                         |
| `[TODO Kristjan: koliko krav imamo, katere pasme so, kako živijo (paša, hlev)]` | `src/pages/o-kmetiji.astro` | `/o-kmetiji`, "Naše krave"                          |
| `[TODO Kristjan: od molže do prodaje]`                                          | `src/pages/o-kmetiji.astro` | `/o-kmetiji`, "Kako nastanejo izdelki", Mleko       |
| `[TODO Kristjan: kako pripravimo jogurt]`                                       | `src/pages/o-kmetiji.astro` | same section, Jogurt                                |
| `[TODO Kristjan: kako pripravimo sir in kako dolgo zori]`                       | `src/pages/o-kmetiji.astro` | same section, Sir                                   |
| `[TODO Kristjan: kako pečemo kruh]`                                             | `src/pages/o-kmetiji.astro` | same section, Kruh                                  |

## In the seed data (`seed/seed.sql`, local only)

The seed only fills the local database for development. On the live site the
same content is entered in the admin (M3 and M5).

| Marker                                                                              | Where                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| `[TODO Kristjan: opis mleka]`, `opis jogurta`, `opis sira`, `opis kruha`            | Product descriptions (`/izdelki`, detail pages) |
| `[TODO Kristjan: sestavine]`, `[TODO Kristjan: alergeni]`, `[TODO Kristjan: enota]` | Each product                                    |
| Prices are `0` (shown as 0,00 €)                                                    | Each product and the sample round               |
| `[TODO Kristjan: naslov kroga]`, `[TODO Kristjan: podatki o dostavi]`               | The draft round                                 |
| `[TODO Kristjan: besedilo prve novice]`                                             | The sample news post "Nova spletna stran"       |

## Photos

The photos are placeholders from the design reference; see `docs/photos.md`
for every file and where it is used.

## Facts the copy already uses

Confirmed by Kristjan on 2026-11-23:

- a small family farm with a few cows;
- milk, yogurt, cheese and bread, made at home;
- orders once a week, delivered in person Monday to Wednesday, the day is
  agreed with the customer;
- cash on delivery, no registration, phone number optional.
