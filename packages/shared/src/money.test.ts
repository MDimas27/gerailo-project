import { describe, expect, it } from "vitest";

import {
  formatRupiah,
  moneyAdd,
  moneyMultiply,
  moneySubtract,
  parseRupiah,
  toRpcAmount,
} from "./money.js";

describe("parseRupiah", () => {
  it("menerima integer desimal biasa", () => {
    expect(parseRupiah("15000")).toBe(15_000n);
    expect(parseRupiah("0")).toBe(0n);
  });

  it("menerima pemisah ribuan titik dan awalan Rp", () => {
    expect(parseRupiah("15.000")).toBe(15_000n);
    expect(parseRupiah("Rp 1.500.000")).toBe(1_500_000n);
    expect(parseRupiah("rp1.500.000")).toBe(1_500_000n);
  });

  it("menerima bigint dan number integer aman", () => {
    expect(parseRupiah(15_000n)).toBe(15_000n);
    expect(parseRupiah(15_000)).toBe(15_000n);
  });

  it("menjaga presisi string BIGINT di luar Number.MAX_SAFE_INTEGER", () => {
    expect(parseRupiah("9007199254740993")).toBe(9_007_199_254_740_993n);
  });

  it("menerima nilai negatif untuk koreksi jurnal", () => {
    expect(parseRupiah("-5.000")).toBe(-5_000n);
    expect(parseRupiah("-Rp 5.000")).toBe(-5_000n);
  });

  it("menolak pecahan, format ribuan salah, dan teks", () => {
    expect(() => parseRupiah(1_500.5)).toThrow();
    expect(() => parseRupiah("15.00")).toThrow();
    expect(() => parseRupiah("1,5")).toThrow();
    expect(() => parseRupiah("")).toThrow();
    expect(() => parseRupiah("abc")).toThrow();
  });
});

describe("formatRupiah", () => {
  it("memformat tanpa desimal dan tanpa spasi setelah Rp", () => {
    expect(formatRupiah(0n)).toBe("Rp0");
    expect(formatRupiah(15_000n)).toBe("Rp15.000");
    expect(formatRupiah("1500000")).toBe("Rp1.500.000");
  });

  it("memformat nilai negatif dengan tanda di depan", () => {
    expect(formatRupiah(-5_000n)).toBe("-Rp5.000");
  });

  it("membulatkan tidak dilakukan: input pecahan ditolak", () => {
    expect(() => formatRupiah(1_500.5)).toThrow();
  });
});

describe("aritmetika uang", () => {
  it("menjumlah dan mengurangi tanpa kehilangan presisi", () => {
    expect(moneyAdd(15_000n, "2.500", 500)).toBe(18_000n);
    expect(moneySubtract(20_000n, 18_000)).toBe(2_000n);
  });

  it("mengalikan dengan kuantitas integer", () => {
    expect(moneyMultiply(12_500n, 3)).toBe(37_500n);
    expect(moneyMultiply("12.500", 2n)).toBe(25_000n);
  });

  it("menolak kuantitas pecahan", () => {
    expect(() => moneyMultiply(1_000n, 1.5)).toThrow();
  });
});

describe("toRpcAmount", () => {
  it("menghasilkan string digit BIGINT tanpa Number()", () => {
    expect(toRpcAmount("Rp 1.500.000")).toBe("1500000");
    expect(toRpcAmount("9007199254740993")).toBe("9007199254740993");
  });

  it("menolak pecahan", () => {
    expect(() => toRpcAmount(1_500.5)).toThrow();
  });
});
