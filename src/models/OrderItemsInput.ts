// The posted quantity form of an order: one itemId and quantity per line.
export interface OrderItemsInput {
  orderId: number;
  itemId: number[];
  quantity: number[];
}
