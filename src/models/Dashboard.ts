import type { Round } from "./Round";
import type { RoundLine } from "./RoundLine";
import type { RoundTotals } from "./RoundTotals";

// What the admin home page shows about the open round.
export interface Dashboard {
  round: Round;
  lines: RoundLine[];
  totals: RoundTotals;
}
