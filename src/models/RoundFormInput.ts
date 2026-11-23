// The posted round form after validation. The row arrays come in the order of
// the table: productId, price and stockLimit have one entry per row;
// includedProductIds lists the ticked rows.
export interface RoundFormInput {
  roundId: number;
  title: string;
  deliveryInfo: string;
  productId: number[];
  includedProductIds: number[];
  price: string[];
  stockLimit: string[];
}
