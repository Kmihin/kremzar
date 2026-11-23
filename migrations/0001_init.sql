-- Initial schema. Column names equal the model property names (camelCase).
-- Money is integer cents. Timestamps are ISO-8601 UTC text. Flags are 0/1.

CREATE TABLE Image (
  id INTEGER PRIMARY KEY,
  contentType TEXT NOT NULL,
  data BLOB NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE Product (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  ingredients TEXT NOT NULL,
  allergens TEXT NOT NULL,
  unit TEXT NOT NULL,
  priceCents INTEGER NOT NULL CHECK (priceCents >= 0),
  imageId INTEGER REFERENCES Image (id),
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_Product_isActive_sortOrder ON Product (isActive, sortOrder);

CREATE TABLE Round (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  deliveryInfo TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
  createdAt TEXT NOT NULL,
  closedAt TEXT
);

-- The database itself allows at most one open round.
CREATE UNIQUE INDEX idx_Round_oneOpen ON Round (status) WHERE status = 'open';

CREATE TABLE RoundProduct (
  id INTEGER PRIMARY KEY,
  roundId INTEGER NOT NULL REFERENCES Round (id),
  productId INTEGER NOT NULL REFERENCES Product (id),
  priceCents INTEGER NOT NULL CHECK (priceCents >= 0),
  stockLimit INTEGER CHECK (stockLimit >= 0),
  UNIQUE (roundId, productId)
);

CREATE TABLE CustomerOrder (
  id INTEGER PRIMARY KEY,
  publicCode TEXT NOT NULL UNIQUE,
  roundId INTEGER NOT NULL REFERENCES Round (id),
  customerName TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('new', 'delivered', 'cancelled')),
  isPaid INTEGER NOT NULL DEFAULT 0 CHECK (isPaid IN (0, 1)),
  totalCents INTEGER NOT NULL CHECK (totalCents >= 0),
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_CustomerOrder_roundId_status ON CustomerOrder (roundId, status);

CREATE TABLE OrderItem (
  id INTEGER PRIMARY KEY,
  orderId INTEGER NOT NULL REFERENCES CustomerOrder (id) ON DELETE CASCADE,
  roundProductId INTEGER NOT NULL REFERENCES RoundProduct (id),
  productName TEXT NOT NULL,
  unit TEXT NOT NULL,
  unitPriceCents INTEGER NOT NULL CHECK (unitPriceCents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_OrderItem_orderId ON OrderItem (orderId);
CREATE INDEX idx_OrderItem_roundProductId ON OrderItem (roundProductId);

CREATE TABLE NewsPost (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  imageId INTEGER REFERENCES Image (id),
  publishedAt TEXT
);

CREATE INDEX idx_NewsPost_publishedAt ON NewsPost (publishedAt);

CREATE TABLE GalleryPhoto (
  id INTEGER PRIMARY KEY,
  imageId INTEGER NOT NULL REFERENCES Image (id),
  caption TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_GalleryPhoto_sortOrder ON GalleryPhoto (sortOrder);
