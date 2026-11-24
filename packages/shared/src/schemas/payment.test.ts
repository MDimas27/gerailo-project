import { describe, expect, it } from "vitest";

import { formatRupiah } from "../money.js";
import {
  createManualOrderSchema,
  recordPaymentSchema,
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
