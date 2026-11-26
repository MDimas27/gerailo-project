import { describe, expect, it } from "vitest";

import {
  labelPembayaran,
  labelStatus,
  labelWorkLane,
  nextAction,
  pembayaranEfektif,
  ringkasOrder,
  workLane,
  type OrderView,
} from "./order-presentation.js";

function view(
  status: OrderView["status"],
  sisa: bigint,
  sudah_dibayar: bigint,
  metode_bayar: OrderView["metode_bayar"] = "TRANSFER",
): OrderView {
  return { status, sisa, sudah_dibayar, metode_bayar };
}

describe("labelStatus", () => {
  it("memakai bahasa seller, bukan enum internal", () => {
    expect(labelStatus("DRAFT")).toBe("Menunggu konfirmasi");
    expect(labelStatus("DP_DITERIMA")).toBe("Pesanan dikonfirmasi");
    expect(labelStatus("DIKIRIM")).toBe("Dalam pengiriman");
    expect(labelStatus("BATAL")).toBe("Dibatalkan");
  });
});

describe("workLane", () => {
  it("mengelompokkan sesuai pekerjaan seller", () => {
    expect(workLane("DRAFT")).toBe("BARU");
    expect(workLane("DIKONFIRMASI")).toBe("DIPROSES");
    expect(workLane("DP_DITERIMA")).toBe("DIPROSES");
    expect(workLane("DIKIRIM")).toBe("DIPROSES");
    expect(workLane("SIAP_DIKIRIM")).toBe("SIAP_DIKIRIM");
    expect(workLane("SELESAI")).toBe("SELESAI");
    expect(workLane("BATAL")).toBe("SELESAI");
    expect(labelWorkLane("DIPROSES")).toBe("Diproses");
  });
});

describe("labelPembayaran", () => {
  it("membedakan belum bayar, DP, dan lunas", () => {
    expect(labelPembayaran(view("DIKONFIRMASI", 100000n, 0n))).toBe("Belum dibayar");
    expect(labelPembayaran(view("DP_DITERIMA", 50000n, 50000n))).toBe("DP diterima");
    expect(labelPembayaran(view("DP_DITERIMA", 0n, 100000n))).toBe("Lunas");
  });
});

describe("nextAction", () => {
  it("Fase A: prepaid lunas → siap dikirim → kirim → terima → terminal", () => {
    expect(nextAction(view("DRAFT", 100000n, 0n)).kind).toBe("KONFIRMASI");
    expect(nextAction(view("DIKONFIRMASI", 100000n, 0n)).label).toBe("Catat pembayaran");
    expect(nextAction(view("DP_DITERIMA", 0n, 100000n)).kind).toBe("SIAP_DIKIRIM");
    expect(nextAction(view("SIAP_DIKIRIM", 0n, 100000n)).kind).toBe("KIRIM");
    expect(nextAction(view("DIKIRIM", 0n, 100000n)).kind).toBe("TERIMA");
    expect(nextAction(view("SELESAI", 0n, 100000n)).kind).toBe("TIDAK_ADA");
  });

  it("Fase B: COD belum bayar tidak menawarkan terima", () => {
    const hasil = nextAction(view("DIKIRIM", 100000n, 0n, "COD"));
    expect(hasil.kind).toBe("BAYAR");
    expect(hasil.label).toBe("Catat COD diterima");
  });

  it("mengenali COD dari metode bayar array Supabase", () => {
    expect(nextAction(view("DIKIRIM", 100000n, 0n, ["COD"])).label).toBe(
      "Catat COD diterima",
    );
    expect(nextAction(view("DIKONFIRMASI", 100000n, 0n, ["COD"])).kind).toBe(
      "SIAP_DIKIRIM",
    );
  });

  it("Fase C: COD auto-SELESAI terjadi di RPC; UI tidak punya jalur lain", () => {
    expect(nextAction(view("DIKIRIM", 0n, 100000n, "COD")).kind).toBe("TERIMA");
    expect(nextAction(view("SELESAI", 0n, 100000n, "COD")).kind).toBe("TIDAK_ADA");
  });

  it("Fase D: DRAFT dan SIAP_DIKIRIM tidak punya aksi terima", () => {
    expect(nextAction(view("DRAFT", 100000n, 0n)).kind).not.toBe("TERIMA");
    expect(nextAction(view("SIAP_DIKIRIM", 100000n, 0n)).kind).not.toBe("TERIMA");
  });

  it("COD di DIKONFIRMASI langsung disiapkan tanpa meminta DP", () => {
    expect(nextAction(view("DIKONFIRMASI", 100000n, 0n, "COD")).kind).toBe(
      "SIAP_DIKIRIM",
    );
  });

  it("DP parsial meminta pelunasan", () => {
    expect(nextAction(view("DP_DITERIMA", 70000n, 30000n)).label).toBe(
      "Catat pelunasan",
    );
  });

  it("BATAL terminal", () => {
    expect(nextAction(view("BATAL", 100000n, 0n)).kind).toBe("TIDAK_ADA");
  });
});

describe("pembayaranEfektif", () => {
  it("mengunci COD ke jenis dan kanal COD", () => {
    expect(
      pembayaranEfektif(view("DIKIRIM", 100000n, 0n, ["COD"]), {
        jenis: "DP",
        kanal: "MANUAL",
      }),
    ).toEqual({ jenis: "COD", kanal: "COD" });
  });

  it("memilih pelunasan saat DIKIRIM masih ada sisa", () => {
    expect(
      pembayaranEfektif(view("DIKIRIM", 70000n, 30000n), {
        jenis: "DP",
        kanal: "QRIS",
      }),
    ).toEqual({ jenis: "PELUNASAN", kanal: "QRIS" });
  });

  it("tidak memaksa pelunasan saat DP masih diperbolehkan", () => {
    expect(
      pembayaranEfektif(view("DIKONFIRMASI", 100000n, 0n), {
        jenis: "DP",
        kanal: "MANUAL",
      }),
    ).toEqual({ jenis: "DP", kanal: "MANUAL" });
  });
});

describe("ringkasOrder", () => {
  it("menyatukan label, lane, badge bayar, dan aksi utama", () => {
    expect(ringkasOrder(view("DIKIRIM", 0n, 100000n))).toEqual({
      label: "Dalam pengiriman",
      lane: "DIPROSES",
      laneLabel: "Diproses",
      pembayaran: "Lunas",
      aksi: expect.objectContaining({ kind: "TERIMA" }),
    });
  });
});
