// What happened to an order insert: the code was already used (a repeated
// submit), the order row was written (false when no round is open), and the
// lines that were not written because the stock ran out.
export interface OrderInsertResult {
  isDuplicateCode: boolean;
  isOrderInserted: boolean;
  shortRoundProductIds: number[];
}
