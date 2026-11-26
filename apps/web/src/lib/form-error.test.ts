import { describe, expect, it } from "vitest";
import { recordPaymentSchema } from "@gerailo/shared";

import { fieldErrorsFrom, pesanAksi } from "./form-error.js";

const orderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function galatNominalKosong() {
  return recordPaymentSchema.safeParse({
    order_id: orderId,
    jenis: "DP",
    kanal: "MANUAL",
    jumlah: "",
  });
}

describe("fieldErrorsFrom", () => {
  it("memetakan error Zod ke field yang salah", () => {
    const hasil = galatNominalKosong();

    expect(hasil.success).toBe(false);
    if (hasil.success) {
      return;
    }

    expect(fieldErrorsFrom(hasil.error)).toEqual({
      jumlah: "Nominal wajib diisi",
    });
  });
});

describe("pesanAksi", () => {
  it("memakai pesan Zod yang ramah pengguna", () => {
    const hasil = galatNominalKosong();

    expect(hasil.success).toBe(false);
    if (hasil.success) {
      return;
    }

    expect(pesanAksi(hasil.error, "Pembayaran gagal dicatat. Coba lagi.")).toBe(
      "Nominal wajib diisi",
    );
  });

  it("menerjemahkan pesan RPC menjadi instruksi perbaikan", () => {
    expect(pesanAksi(new Error("MASIH ADA SISA — catat pelunasan dulu"))).toBe(
      "Masih ada sisa pembayaran. Catat pelunasan dulu.",
    );
    expect(pesanAksi(new Error("PEMBAYARAN_MELEBIHI_TOTAL: 200000 > 150000"))).toBe(
      "Nominal melebihi sisa tagihan. Kurangi nominal lalu coba lagi.",
    );
  });

  it("menampilkan pesan stok tidak cukup apa adanya", () => {
    const pesan =
      "STOK_TIDAK_CUKUP: CEK13 Stok Satu 392026 — tersedia 1, butuh 2";

    expect(pesanAksi(new Error(pesan))).toBe(pesan);
  });

  it("tidak membocorkan pesan teknis yang tidak dikenal", () => {
    expect(pesanAksi(new Error("PostgrestError: detail teknis"))).toBe(
      "Aksi gagal. Coba lagi.",
    );
  });
});
