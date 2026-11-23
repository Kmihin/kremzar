const priceFormat = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
});

const dateFormat = new Intl.DateTimeFormat("sl-SI", {
  dateStyle: "long",
  timeZone: "Europe/Ljubljana",
});

export function formatPrice(cents: number): string {
  return priceFormat.format(cents / 100);
}

export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate));
}

// Plain text where a blank line starts a new paragraph.
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

// "2,50" or "2.50" to 250. The format is validated before this is called.
export function parsePriceToCents(text: string): number {
  return Math.round(Number(text.replace(",", ".")) * 100);
}

// 250 to "2,50", for a price input field.
export function formatPriceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// "Domači jogurt" to "domaci-jogurt", for URLs.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
