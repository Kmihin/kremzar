// A new quantity for an order line. 0 removes the line.
export interface ItemQuantityChange {
  itemId: number;
  quantity: number;
}
