// A row of the CustomerOrder table.
export interface CustomerOrder {
  id: number;
  publicCode: string;
  roundId: number;
  customerName: string;
  phone: string | null;
  status: string;
  isPaid: number;
  totalCents: number;
  createdAt: string;
}
