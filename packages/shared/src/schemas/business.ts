import { z } from "zod";

export const businessTypes = [
  "makanan",
  "fashion",
  "kerajinan",
  "lainnya",
] as const;

export const paymentMethods = [
  "TRANSFER",
  "COD",
  "QRIS",
  "LAINNYA",
] as const;

export const createBusinessSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, "Nama usaha wajib diisi")
    .max(120, "Nama usaha maksimal 120 karakter"),
  jenis: z.enum(businessTypes, "Pilih jenis usaha"),
  metode_bayar: z.enum(paymentMethods),
  consent: z
    .boolean()
    .refine((value) => value, "Persetujuan kebijakan privasi wajib diberikan"),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
