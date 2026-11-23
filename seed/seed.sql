-- Sample data for local development. Run once on an empty database:
--   npm run db:seed:local
-- Every unknown fact is a visible [TODO Kristjan: ...] marker. Prices are 0
-- (TODO Kristjan: real prices are entered in the admin).

INSERT INTO Product (slug, name, description, ingredients, allergens, unit, priceCents, isActive, sortOrder)
VALUES
  ('mleko', 'Mleko', '[TODO Kristjan: opis mleka]', '[TODO Kristjan: sestavine]', '[TODO Kristjan: alergeni]', '[TODO Kristjan: enota]', 0, 1, 1),
  ('jogurt', 'Jogurt', '[TODO Kristjan: opis jogurta]', '[TODO Kristjan: sestavine]', '[TODO Kristjan: alergeni]', '[TODO Kristjan: enota]', 0, 1, 2),
  ('sir', 'Sir', '[TODO Kristjan: opis sira]', '[TODO Kristjan: sestavine]', '[TODO Kristjan: alergeni]', '[TODO Kristjan: enota]', 0, 1, 3),
  ('kruh', 'Kruh', '[TODO Kristjan: opis kruha]', '[TODO Kristjan: sestavine]', '[TODO Kristjan: alergeni]', '[TODO Kristjan: enota]', 0, 1, 4);

INSERT INTO Round (title, deliveryInfo, status, createdAt)
VALUES ('[TODO Kristjan: naslov kroga]', '[TODO Kristjan: podatki o dostavi]', 'draft', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT INTO RoundProduct (roundId, productId, priceCents, stockLimit)
SELECT Round.id, Product.id, Product.priceCents, 10
FROM Round, Product
WHERE Round.status = 'draft';

INSERT INTO NewsPost (slug, title, body, publishedAt)
VALUES (
  'nova-spletna-stran',
  'Nova spletna stran',
  'Izdelke s kmetije lahko zdaj naročite kar na tej strani.

[TODO Kristjan: besedilo prve novice]',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
