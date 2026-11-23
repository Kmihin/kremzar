// An order to insert. The round is the one that is open at insert time.
export interface NewOrder {
  publicCode: string;
  customerName: string;
  phone: string | null;
  totalCents: number;
  createdAt: string;
}
