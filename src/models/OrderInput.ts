// The posted order form after validation. roundProductId and quantity have
// one entry per product row, in the order of the form. website is the
// honeypot field and must be empty.
export interface OrderInput {
  name: string;
  phone: string;
  website: string;
  publicCode: string;
  roundProductId: number[];
  quantity: number[];
}
