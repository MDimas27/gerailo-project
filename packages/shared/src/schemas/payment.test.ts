import { describe, expect, it } from "vitest";

import { formatRupiah } from "../money.js";
import {
  createManualOrderSchema,
  midtransNotificationSchema,
  recordPaymentSchema,
  snapTokenRequestSchema,
} from "./payment.js";

const productId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const orderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("recordPaymentSchema", () => {
  it("menerima rupiah terformat", () => {
    const parsed = recordPaymentSchema.parse({
      order_id: orderId,
      jenis: "DP",
      jumlah: "Rp 50.000",
      kanal: "MANUAL",
    });

    expect(parsed.jumlah).toBe("Rp 50.000");
    expect(formatRupiah(parsed.jumlah)).toBe("Rp50.000");
  });

  it("menolak nominal desimal, negatif, dan kosong", () => {
    const base = { order_id: orderId, jenis: "DP", kanal: "MANUAL" };

    expect(recordPaymentSchema.safeParse({ ...base, jumlah: "50000.5" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...base, jumlah: "-50000" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...base, jumlah: "" }).success).toBe(false);
  });
});

describe("createManualOrderSchema", () => {
  const base = {
    nama: "Siti",
    telepon: "0812-8899-7766",
    ongkir: "15.000",
    dp: "100.000",
    metode_bayar: ["TRANSFER"],
    items: [{ product_id: productId, qty: "2", harga_satuan: "75.000" }],
  };

  it("menerima order manual dengan harga beda katalog", () => {
    expect(createManualOrderSchema.safeParse(base).success).toBe(true);
  });

  it("menolak item kosong dan metode duplikat", () => {
    expect(createManualOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(
      createManualOrderSchema.safeParse({
        ...base,
        metode_bayar: ["TRANSFER", "TRANSFER"],
      }).success,
    ).toBe(false);
  });
});

describe("schema Midtrans", () => {
  it("menerima permintaan token dengan jenis default", () => {
    const parsed = snapTokenRequestSchema.parse({ order_id: orderId });

    expect(parsed.jenis).toBe("PELUNASAN");
  });

  it("menolak notifikasi tanpa signature 128 hex", () => {
    const dasar = {
      transaction_status: "settlement",
      transaction_id: "trx-1",
      status_code: "200",
      order_id: "GR-123",
      gross_amount: "30000.00",
    };

    expect(
      midtransNotificationSchema.safeParse({ ...dasar, signature_key: "abc" }).success,
    ).toBe(false);
    expect(
      midtransNotificationSchema.safeParse({ ...dasar, signature_key: "a".repeat(128) })
        .success,
    ).toBe(true);
  });
});
