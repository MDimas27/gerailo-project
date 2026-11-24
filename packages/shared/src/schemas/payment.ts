import { z } from "zod";

import { parseRupiah } from "../money.js";

function isRupiah(value: string): boolean {
  try {
    parseRupiah(value);
    return true;
  } catch {
    return false;
  }
}

function isPositiveRupiah(value: string): boolean {
  return isRupiah(value) && parseRupiah(value) > 0n;
}

function isNonNegativeRupiah(value: string): boolean {
  return isRupiah(value) && parseRupiah(value) >= 0n;
}

export const rupiahSchema = z
  .string()
  .trim()
  .min(1, "Nominal wajib diisi")
  .refine(isRupiah, "Nominal tidak valid");

export const positiveRupiahSchema = rupiahSchema.refine(
  isPositiveRupiah,
  "Nominal harus lebih dari 0",
);

export const nonNegativeRupiahSchema = rupiahSchema.refine(
  isNonNegativeRupiah,
  "Nominal tidak boleh negatif",
);

export const orderStatusSchema = z.enum([
  "DRAFT",
  "DIKONFIRMASI",
  "DP_DITERIMA",
  "SIAP_DIKIRIM",
  "DIKIRIM",
  "SELESAI",
  "BATAL",
]);

export const paymentJenisSchema = z.enum(["DP", "PELUNASAN", "COD"]);
export const paymentKanalSchema = z.enum([
  "MANUAL",
  "COD",
  "QRIS",
  "VA",
  "E_WALLET",
  "MIDTRANS",
  "LAINNYA",
]);
export const metodeBayarSchema = z.enum([
  "TRANSFER",
  "COD",
  "QRIS",
  "LAINNYA",
]);

export const manualOrderItemSchema = z.object({
  product_id: z.uuid("Produk tidak valid"),
  qty: z.coerce
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1")
    .max(1000, "Jumlah maksimal 1000"),
  harga_satuan: positiveRupiahSchema,
});

export const createManualOrderSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, "Nama pelanggan wajib diisi")
    .max(120, "Nama pelanggan maksimal 120 karakter"),
  telepon: z
    .string()
    .trim()
    .regex(/^[0-9+\s().-]{8,20}$/, "Nomor telepon tidak valid"),
  alamat: z.string().trim().max(200, "Alamat maksimal 200 karakter").optional(),
  catatan: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
  ongkir: nonNegativeRupiahSchema,
  dp: nonNegativeRupiahSchema,
  metode_bayar: z
    .array(metodeBayarSchema)
    .min(1, "Pilih minimal satu metode bayar")
    .max(4, "Maksimal empat metode bayar")
    .refine((values) => new Set(values).size === values.length, "Metode bayar duplikat"),
  due_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal jatuh tempo tidak valid")
    .optional(),
  items: z
    .array(manualOrderItemSchema)
    .min(1, "Tambah minimal satu produk")
    .max(50, "Maksimal 50 produk per order"),
});

export const recordPaymentSchema = z.object({
  order_id: z.uuid("Order tidak valid"),
  jenis: paymentJenisSchema,
  jumlah: positiveRupiahSchema,
  kanal: paymentKanalSchema,
  bukti_path: z.string().trim().max(500, "Path bukti terlalu panjang").optional(),
});

export const orderActionSchema = z.object({
  order_id: z.uuid("Order tidak valid"),
});

export const completeOrderSchema = orderActionSchema.extend({
  kurir_nama: z.string().trim().max(80, "Nama kurir maksimal 80 karakter").optional(),
  nomor_resi: z.string().trim().max(80, "Nomor resi maksimal 80 karakter").optional(),
});

export const setShippingSchema = orderActionSchema.extend({
  kurir: z.string().trim().min(1, "Nama kurir wajib diisi").max(80, "Nama kurir maksimal 80 karakter"),
  resi: z.string().trim().min(1, "Nomor resi wajib diisi").max(80, "Nomor resi maksimal 80 karakter"),
});

export const intentJenisSchema = z.enum(["DP", "PELUNASAN"]);

export const snapTokenRequestSchema = z.object({
  order_id: z.uuid("Order tidak valid"),
  jenis: intentJenisSchema.default("PELUNASAN"),
});

export const midtransNotificationSchema = z
  .object({
    transaction_time: z.string().optional(),
    transaction_status: z.string().trim().min(1),
    transaction_id: z.string().trim().min(1),
    status_message: z.string().optional(),
    status_code: z.string().trim().min(1),
    signature_key: z.string().trim().length(128),
    payment_type: z.string().optional(),
    order_id: z.string().trim().min(1).max(50),
    merchant_id: z.string().optional(),
    gross_amount: z.string().trim().min(1),
    fraud_status: z.string().nullable().optional(),
    currency: z.string().optional(),
  })
  .passthrough();

export type PaymentJenis = z.infer<typeof paymentJenisSchema>;
export type PaymentKanal = z.infer<typeof paymentKanalSchema>;
export type MetodeBayar = z.infer<typeof metodeBayarSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
export type ManualOrderItemInput = z.infer<typeof manualOrderItemSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type IntentJenis = z.infer<typeof intentJenisSchema>;
export type SnapTokenRequest = z.infer<typeof snapTokenRequestSchema>;
export type MidtransNotification = z.infer<typeof midtransNotificationSchema>;
