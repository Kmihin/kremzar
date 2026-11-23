// Status values stored in the database (see the CHECK constraints in migrations).
export const RoundStatus = {
  draft: "draft",
  open: "open",
  closed: "closed",
} as const;

export const OrderStatus = {
  new: "new",
  delivered: "delivered",
  cancelled: "cancelled",
} as const;
