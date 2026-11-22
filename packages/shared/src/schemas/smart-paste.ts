import { z } from "zod";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const aiResponseSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        product_id: z.string().regex(uuid, "product_id bukan UUID"),
        qty: z.number().int().min(1).max(1000),
      }),
    )
    .min(1),
  ongkir: z.number().int().nonnegative().optional(),
  dp: z.number().int().nonnegative().optional(),
  metode_bayar: z.enum(["TRANSFER", "COD", "QRIS", "LAINNYA"]).optional(),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;

/** AI hanya boleh memilih product_id dari kandidat yang dikirim Worker.
 * Harga produk dan data pelanggan sama sekali tidak diterima dari AI. */
export function parseAiResponse(
  value: unknown,
  candidateIds: string[],
): AiResponse {
  const hasil = aiResponseSchema.parse(value);
  const izin = new Set(candidateIds);

  for (const item of hasil.items) {
    if (!izin.has(item.product_id)) {
      throw new Error("AI_PRODUK_DILUAR_KANDIDAT");
    }
  }

  return hasil;
}
