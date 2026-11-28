import { describe, expect, it } from "vitest";

import {
  angkaMentah,
  csvEscape,
  isoTanggal,
  namaFileExport,
  toCsv,
} from "./csv.js";

describe("csvEscape", () => {
  it("membiarkan nilai polos tanpa kutip", () => {
    expect(csvEscape("Sosis M7")).toBe("Sosis M7");
  });

  it("mengutip nilai berisi koma", () => {
    expect(csvEscape("Sambal, Pedas")).toBe('"Sambal, Pedas"');
  });

  it("menggandakan kutip di dalam nilai", () => {
    expect(csvEscape('Sambal "Pedas"')).toBe('"Sambal ""Pedas"""');
  });

  it("mengutip nilai berisi baris baru (LF dan CRLF)", () => {
    expect(csvEscape("baris\nkedua")).toBe('"baris\nkedua"');
    expect(csvEscape("baris\r\nkedua")).toBe('"baris\r\nkedua"');
  });
});

describe("toCsv", () => {
  it("menggabungkan baris dengan CRLF tanpa BOM bila dimatikan", () => {
    expect(
      toCsv(
        [
          ["produk", "nilai"],
          ["Sosis", 143000n],
        ],
        { bom: false },
      ),
    ).toBe("produk,nilai\r\nSosis,143000");
  });

  it("menyisipkan BOM UTF-8 di depan secara default", () => {
    const hasil = toCsv([["a"]]);
    expect(hasil.charCodeAt(0)).toBe(0xfeff);
  });

  it("menuliskan nilai kosong untuk null", () => {
    expect(toCsv([["a", null]], { bom: false })).toBe("a,");
  });
});

describe("angkaMentah", () => {
  it("menghasilkan digit mentah tanpa Rp/pemisah", () => {
    expect(angkaMentah(143000n)).toBe("143000");
    expect(angkaMentah(12000)).toBe("12000");
    expect(angkaMentah("-5000")).toBe("-5000");
  });

  it("menolak format berpemisah atau berawalan Rp", () => {
    expect(() => angkaMentah("Rp12.000")).toThrow();
    expect(() => angkaMentah("12.000")).toThrow();
    expect(() => angkaMentah("1,5")).toThrow();
  });
});

describe("isoTanggal & namaFileExport", () => {
  it("memformat tanggal ISO YYYY-MM-DD (UTC)", () => {
    expect(isoTanggal(new Date("2026-11-28T09:30:00Z"))).toBe("2026-11-28");
  });

  it("menyusun nama file <jenis>-YYYY-MM-DD.csv", () => {
    expect(namaFileExport("persediaan", new Date("2026-11-28T00:00:00Z"))).toBe(
      "persediaan-2026-11-28.csv",
    );
  });
});
