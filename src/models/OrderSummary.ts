// An order with its round's title and delivery info, for the confirmation page.
export interface OrderSummary {
  id: number;
  publicCode: string;
  customerName: string;
  status: string;
  totalCents: number;
  createdAt: string;
  roundTitle: string;
  deliveryInfo: string;
}
