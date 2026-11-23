// An order line to insert, with the name, unit and price taken from the
// server's copy of the offer, never from the form.
export interface NewOrderItem {
  roundProductId: number;
  productName: string;
  unit: string;
  unitPriceCents: number;
  quantity: number;
}
