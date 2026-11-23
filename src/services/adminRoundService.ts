import { ErrorCode } from "../consts/errorCodes";
import { RoundStatus } from "../consts/statuses";
import { getRoundTotals } from "../db/orderRepository";
import {
  addActiveProducts,
  closeRound,
  copyRoundProducts,
  findLatestRound,
  findOpenRound,
  findRoundById,
  insertRound,
  listRoundLines,
  listRounds,
  openRound,
  saveRound,
} from "../db/roundRepository";
import type { Dashboard } from "../models/Dashboard";
import type { Round } from "../models/Round";
import type { RoundFormInput } from "../models/RoundFormInput";
import type { RoundLine } from "../models/RoundLine";
import type { RoundLineFormValues } from "../models/RoundLineFormValues";
import type { RoundLineInput } from "../models/RoundLineInput";
import { formatPriceInput, parsePriceToCents } from "./formatService";

export async function listRoundsForAdmin(): Promise<Round[]> {
  return listRounds();
}

export async function findRoundForAdmin(id: number): Promise<Round | null> {
  return findRoundById(id);
}

export async function listRoundLinesForAdmin(
  roundId: number,
): Promise<RoundLine[]> {
  return listRoundLines(roundId);
}

// Creates a draft round. With copyPrevious, it takes the products, prices and
// limits of the latest round; otherwise every active product at its regular
// price without a limit. Returns the new round's id.
export async function createRound(
  title: string,
  deliveryInfo: string,
  copyPrevious: boolean,
): Promise<number> {
  const previous = await findLatestRound();
  const roundId = await insertRound(
    title,
    deliveryInfo,
    new Date().toISOString(),
  );
  if (copyPrevious && previous !== null) {
    await copyRoundProducts(previous.id, roundId);
  } else {
    await addActiveProducts(roundId);
  }
  return roundId;
}

// Returns an error code, or null when the round was saved.
export async function saveRoundForm(
  input: RoundFormInput,
): Promise<string | null> {
  const round = await findRoundById(input.roundId);
  if (round === null) {
    return ErrorCode.notFound;
  }
  const lines: RoundLineInput[] = [];
  for (let i = 0; i < input.productId.length; i++) {
    const productId = input.productId[i];
    const isIncluded = input.includedProductIds.includes(productId);
    const price = input.price[i];
    if (isIncluded && price === "") {
      return ErrorCode.roundPriceMissing;
    }
    const stockLimit = input.stockLimit[i];
    lines.push({
      productId,
      isIncluded,
      priceCents: price === "" ? 0 : parsePriceToCents(price),
      stockLimit: stockLimit === "" ? null : Number(stockLimit),
    });
  }
  await saveRound(input.roundId, input.title, input.deliveryInfo, lines);
  return null;
}

// Returns an error code, or null when the round was opened. Checks the round
// first: opening a missing round would otherwise close the open one and leave
// none open.
export async function openRoundById(roundId: number): Promise<string | null> {
  if ((await findRoundById(roundId)) === null) {
    return ErrorCode.notFound;
  }
  await openRound(roundId, new Date().toISOString());
  return null;
}

// Returns an error code, or null when the round was closed.
export async function closeRoundById(roundId: number): Promise<string | null> {
  if ((await findRoundById(roundId)) === null) {
    return ErrorCode.notFound;
  }
  await closeRound(roundId, new Date().toISOString());
  return null;
}

export async function loadDashboard(): Promise<Dashboard | null> {
  const round = await findOpenRound();
  if (round === null) {
    return null;
  }
  const allLines = await listRoundLines(round.id);
  const lines = allLines.filter((line) => line.roundProductId !== null);
  const totals = await getRoundTotals(round.id);
  return { round, lines, totals };
}

export function roundStatusLabel(status: string): string {
  if (status === RoundStatus.open) {
    return "Odprt";
  }
  if (status === RoundStatus.closed) {
    return "Zaprt";
  }
  return "Osnutek";
}

export function roundLineFormValues(lines: RoundLine[]): RoundLineFormValues[] {
  return lines.map(toRoundLineFormValues);
}

// The rows as posted, to show the form again with its errors.
export function roundLineFormValuesFromForm(
  lines: RoundLine[],
  formData: FormData,
): RoundLineFormValues[] {
  const postedIds = formData.getAll("productId").map(String);
  const postedPrices = formData.getAll("price").map(String);
  const postedLimits = formData.getAll("stockLimit").map(String);
  const includedIds = formData.getAll("includedProductIds").map(String);
  const values: RoundLineFormValues[] = [];
  for (const line of lines) {
    const row = toRoundLineFormValues(line);
    const index = postedIds.indexOf(String(line.productId));
    if (index !== -1) {
      row.price = postedPrices[index] ?? row.price;
      row.stockLimit = postedLimits[index] ?? row.stockLimit;
      row.isIncluded =
        row.hasOrders || includedIds.includes(String(line.productId));
    }
    values.push(row);
  }
  return values;
}

function toRoundLineFormValues(line: RoundLine): RoundLineFormValues {
  const isIncluded = line.roundProductId !== null;
  return {
    productId: line.productId,
    productName: line.productName,
    unit: line.unit,
    isIncluded,
    hasOrders: line.hasOrderItems === 1,
    orderedQuantity: line.orderedQuantity,
    price: formatPriceInput(
      line.priceCents === null ? line.regularPriceCents : line.priceCents,
    ),
    stockLimit: line.stockLimit === null ? "" : String(line.stockLimit),
  };
}
