// A row of the Round table.
export interface Round {
  id: number;
  title: string;
  deliveryInfo: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
}
