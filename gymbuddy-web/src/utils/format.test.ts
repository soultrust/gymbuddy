import { describe, expect, it } from "vitest";
import { formatNumber, formatWeight, formatDate } from "./format";

describe("formatNumber", () => {
  it("strips trailing zeros: '4.00' -> '4'", () => {
    expect(formatNumber("4.00")).toBe("4");
  });

  it("keeps meaningful decimals: '4.50' -> '4.5'", () => {
    expect(formatNumber("4.50")).toBe("4.5");
  });

  it("preserves multi-digit decimals: '7.25' -> '7.25'", () => {
    expect(formatNumber("7.25")).toBe("7.25");
  });

  it("handles integer numbers", () => {
    expect(formatNumber(10)).toBe("10");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber("0")).toBe("0");
    expect(formatNumber("0.00")).toBe("0");
  });

  it("returns empty string for undefined", () => {
    expect(formatNumber(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatNumber("")).toBe("");
  });

  it("returns empty string for non-numeric string", () => {
    expect(formatNumber("abc")).toBe("");
  });
});

describe("formatWeight", () => {
  it("strips trailing zeros like formatNumber", () => {
    expect(formatWeight("135.00")).toBe("135");
  });

  it("keeps meaningful decimals", () => {
    expect(formatWeight("2.5")).toBe("2.5");
  });

  it("returns empty string for zero", () => {
    expect(formatWeight(0)).toBe("");
    expect(formatWeight("0")).toBe("");
    expect(formatWeight("0.00")).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatWeight(undefined)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats as MM/DD with zero-padded month and day", () => {
    expect(formatDate("2026-03-07T12:00:00")).toBe("03/07");
  });

  it("zero-pads single digit months", () => {
    expect(formatDate("2026-01-15T12:00:00")).toBe("01/15");
  });

  it("handles double-digit months", () => {
    expect(formatDate("2025-12-25T12:00:00")).toBe("12/25");
  });
});
