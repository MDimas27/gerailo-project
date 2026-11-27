import { z } from "zod";

import { parseRupiah } from "../money.js";

function isOptionalRupiah(value: string): boolean {
  if (value.trim() === "") {
    return true;
  }

  try {
    return parseRupiah(value) >= 0n;
  } catch {
    return false;
  }
}

/** Hanya dua jenis mutasi yang boleh dibuat dari klien. KELUAR via ship_order. */
export const stockMoveJenisSchema = z.enum(["MASUK", "PENYESUAIAN"]);

export const stockMoveFormSchema = z
  .object({
    product_id: z.uuid("Produk tidak valid"),
    jenis: stockMoveJenisSchema,
    qty: z.coerce
      .number()
      .int("Jumlah harus bilangan bulat")
      .refine((value) => value !== 0, "Jumlah tidak boleh 0"),
    harga_beli: z
      .string()
      .trim()
      .refine(isOptionalRupiah, "Harga beli tidak valid")
      .default(""),
    alasan: z
      .string()
      .trim()
      .min(1, "Alasan wajib diisi")
      .max(200, "Alasan maksimal 200 karakter"),
  })
  .superRefine((value, ctx) => {
    if (value.jenis === "MASUK" && value.qty < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["qty"],
        message: "Jumlah masuk harus lebih dari 0",
      });
    }
  });

export type StockMoveFormInput = z.infer<typeof stockMoveFormSchema>;

export type StockLevel = "HABIS" | "MENIPIS" | "TERSEDIA";

/** Klasifikasi stok UI-only; tidak menambah status DB. */
export function getStockLevelStatus(input: {
  saldo: bigint;
  stok_min: number;
}): StockLevel {
  if (input.saldo <= 0n) {
    return "HABIS";
  }

  if (input.saldo <= BigInt(input.stok_min)) {
    return "MENIPIS";
  }

  return "TERSEDIA";
}

export type StockMovementLike = {
  id: string;
  jenis: string;
  qty: number | string;
  harga_beli: string | number | null;
  created_at: string;
};

export type T8Prefill = {
  movementId: string;
  qty: bigint;
  hargaBeli: bigint;
  total: bigint;
};

/**
 * Prefill jurnal T8 manual dari movement MASUK berharga terbaru.
 * T8 TIDAK diposting otomatis; UI wajib menampilkan risiko divergensi
 * ledger-vs-stok (docs/MODULES/M5-STOCK.md, Gate PREP Q2).
 */
export function deriveT8Prefill(
  movements: readonly StockMovementLike[],
): T8Prefill | null {
  let terbaru: StockMovementLike | null = null;
  let waktuTerbaru = Number.NEGATIVE_INFINITY;

  for (const movement of movements) {
    if (movement.jenis !== "MASUK" || movement.harga_beli === null) {
      continue;
    }

    const waktu = Date.parse(movement.created_at);

    if (!Number.isFinite(waktu)) {
      continue;
    }

    if (waktu >= waktuTerbaru) {
      terbaru = movement;
      waktuTerbaru = waktu;
    }
  }

  if (!terbaru) {
    return null;
  }

  const qty =
    typeof terbaru.qty === "bigint"
      ? terbaru.qty
      : BigInt(Math.trunc(Number(terbaru.qty)));
  const hargaBeli = parseRupiah(terbaru.harga_beli);

  return {
    movementId: terbaru.id,
    qty,
    hargaBeli,
    total: qty * hargaBeli,
  };
}
