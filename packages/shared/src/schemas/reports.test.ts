import { describe, expect, it } from "vitest";

import { exportQuerySchema, jenisExportSchema } from "./reports.js";

describe("jenisExportSchema", () => {
  it("menerima hanya jenis yang di-whitelist", () => {
    for (const jenis of [
      "rekap-harian",
      "pnl",
      "arus-kas",
      "piutang-ump",
      "persediaan",
    ]) {
      expect(jenisExportSchema.safeParse(jenis).success).toBe(true);
    }
  });

  it("menolak jenis di luar whitelist", () => {
    expect(jenisExportSchema.safeParse("lain").success).toBe(false);
    expect(jenisExportSchema.safeParse("").success).toBe(false);
  });
});

describe("exportQuerySchema", () => {
  it("menerima bulan opsional format YYYY-MM", () => {
    expect(exportQuerySchema.safeParse({}).success).toBe(true);
    expect(exportQuerySchema.safeParse({ bulan: "2026-11" }).success).toBe(true);
  });

  it("menolak bulan salah format", () => {
    expect(exportQuerySchema.safeParse({ bulan: "2026-13" }).success).toBe(false);
    expect(exportQuerySchema.safeParse({ bulan: "2026-1" }).success).toBe(false);
  });
});
