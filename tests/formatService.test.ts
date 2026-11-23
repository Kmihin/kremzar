import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatPrice,
  formatPriceInput,
  parsePriceToCents,
  slugify,
  splitParagraphs,
} from "../src/services/formatService";

describe("formatPrice", () => {
  it("formats cents as euros in Slovenian style", () => {
    expect(formatPrice(250)).toBe("2,50\u00a0€");
    // Slovenian groups thousands only from five digits on.
    expect(formatPrice(123456)).toBe("1234,56\u00a0€");
    expect(formatPrice(1234567)).toBe("12.345,67\u00a0€");
  });
});

describe("formatDate", () => {
  it("formats in the Europe/Ljubljana time zone", () => {
    // 23:30 UTC on 31 December is already 1 January in Ljubljana.
    expect(formatDate("2026-12-31T23:30:00.000Z")).toBe("1. januar 2027");
  });
});

describe("splitParagraphs", () => {
  it("starts a new paragraph at a blank line and trims each one", () => {
    const text = "Prvi odstavek.\nŠe vedno prvi.\n\n  Drugi odstavek.  \n\n\n";
    expect(splitParagraphs(text)).toEqual([
      "Prvi odstavek.\nŠe vedno prvi.",
      "Drugi odstavek.",
    ]);
  });
});

describe("parsePriceToCents", () => {
  it("accepts a comma or a dot and rounds to whole cents", () => {
    expect(parsePriceToCents("2,50")).toBe(250);
    expect(parsePriceToCents("2.5")).toBe(250);
    expect(parsePriceToCents("8")).toBe(800);
    expect(parsePriceToCents("0,29")).toBe(29);
    expect(parsePriceToCents("1,15")).toBe(115);
  });
});

describe("formatPriceInput", () => {
  it("shows cents as a price the form accepts again", () => {
    expect(formatPriceInput(250)).toBe("2,50");
    expect(formatPriceInput(5)).toBe("0,05");
    expect(parsePriceToCents(formatPriceInput(1999))).toBe(1999);
  });
});

describe("slugify", () => {
  it("makes a lowercase address part without diacritics", () => {
    expect(slugify("Domači jogurt z medom")).toBe("domaci-jogurt-z-medom");
    expect(slugify("  Čaj, Šipek & Žajbelj! ")).toBe("caj-sipek-zajbelj");
    expect(slugify("Đuveč")).toBe("duvec");
  });
});
