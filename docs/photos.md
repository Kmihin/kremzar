# Photos

Placeholder photos taken from the design reference
(`design-reference/src/assets/`). They are stock-style pictures, not photos of
our farm. Replace each file in `src/assets/photos/` with your own photo
under the same name; nothing else needs to change. Keep roughly the same
aspect ratio: the pages crop with `object-fit: cover`, so the centre of the
photo stays visible.

| File                 | Size (px)   | Ratio | Used on                                                                                      | Shown as                  |
| -------------------- | ----------- | ----- | -------------------------------------------------------------------------------------------- | ------------------------- |
| `hero-pasture.jpg`   | 1200 × 1504 | 4:5   | `/` hero; `/o-kmetiji`, first photo                                                          | 4:5 on home, 3:2 on about |
| `product-milk.jpg`   | 800 × 1000  | 4:5   | Placeholder for the product `mleko` (cards, product page)                                    | 4:5                       |
| `product-yogurt.jpg` | 800 × 1000  | 4:5   | Placeholder for the product `jogurt`                                                         | 4:5                       |
| `product-skuta.jpg`  | 800 × 1000  | 4:5   | Placeholder for the product `sir`                                                            | 4:5                       |
| `product-bread.jpg`  | 800 × 1000  | 4:5   | Placeholder for the product `kruh`; `/` tile "Izdelki"                                       | 4:5 on cards, 3:2 on tile |
| `cow-portrait.jpg`   | 900 × 900   | 1:1   | `/` tile "Galerija"; `/o-kmetiji`, "Naše krave"                                              | 3:2                       |
| `process-dairy.jpg`  | 1200 × 800  | 3:2   | `/` tile "Novice"; `/o-kmetiji`, "Kako nastanejo izdelki"; placeholder for any other product | 3:2, or 4:5 on cards      |

Which placeholder a product gets is set in `src/config/productPhotos.ts`
(by product slug). From M5 an uploaded product photo replaces the placeholder
for that product.

## Uploaded photos (admin, M5)

Product, news and gallery photos uploaded in the admin are stored in D1 and
served from `/media/[id]`. The browser resizes them to at most 1600 px on the
longest side and saves WebP (JPEG where the browser cannot encode WebP),
under 500 KB.

| Slot          | Shown on                           | Ratio                       |
| ------------- | ---------------------------------- | --------------------------- |
| Product photo | Product cards and the product page | 4:5                         |
| News photo    | `/novice/[slug]`                   | 3:2                         |
| Gallery photo | `/galerija`                        | any; shown at its own ratio |
