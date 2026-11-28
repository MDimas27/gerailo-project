import { z } from "zod";

/** Whitelist jenis export CSV (GATE PLAN T3). */
export const jenisExportSchema = z.enum([
  "rekap-harian",
  "pnl",
  "arus-kas",
  "piutang-ump",
  "persediaan",
]);

export type JenisExport = z.infer<typeof jenisExportSchema>;

export const exportQuerySchema = z.object({
  bulan: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode tidak valid")
    .optional(),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;
