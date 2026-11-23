// A row of the OrderItem table.
export interface OrderItem {
  id: number;
  orderId: number;
  roundProductId: number;
  productName: string;
  unit: string;
  unitPriceCents: number;
  quantity: number;
}
