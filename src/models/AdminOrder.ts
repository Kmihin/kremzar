// An order with its round's title, for the admin order page.
export interface AdminOrder {
  id: number;
  roundId: number;
  roundTitle: string;
  customerName: string;
  phone: string | null;
  status: string;
  isPaid: number;
  totalCents: number;
  createdAt: string;
}
