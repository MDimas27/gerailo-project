import type { OrderStatus } from "@/hooks/use-orders";

export type WorkLane = "BARU" | "DIPROSES" | "SIAP_DIKIRIM" | "SELESAI";

export type OrderView = {
  status: OrderStatus;
  sisa: bigint;
  sudah_dibayar: bigint;
  metode_bayar: string | string[];
};

export type AksiUtama = {
  kind: "KONFIRMASI" | "BAYAR" | "SIAP_DIKIRIM" | "KIRIM" | "TERIMA" | "TIDAK_ADA";
  label: string;
  bantuan: string;
};

export type RingkasanOrder = {
  label: string;
  lane: WorkLane;
  laneLabel: string;
  pembayaran: "Belum dibayar" | "DP diterima" | "Lunas";
  aksi: AksiUtama;
};

export function labelStatus(status: OrderStatus): string {
  switch (status) {
    case "DRAFT":
      return "Menunggu konfirmasi";
    case "DIKONFIRMASI":
    case "DP_DITERIMA":
      return "Pesanan dikonfirmasi";
    case "SIAP_DIKIRIM":
      return "Siap dikirim";
    case "DIKIRIM":
      return "Dalam pengiriman";
    case "SELESAI":
      return "Selesai";
    case "BATAL":
      return "Dibatalkan";
  }
}

export function workLane(status: OrderStatus): WorkLane {
  if (status === "DRAFT") {
    return "BARU";
  }
  if (status === "SIAP_DIKIRIM") {
    return "SIAP_DIKIRIM";
  }
  if (status === "SELESAI" || status === "BATAL") {
    return "SELESAI";
  }
  return "DIPROSES";
}

export function labelWorkLane(lane: WorkLane): string {
  switch (lane) {
    case "BARU":
      return "Pesanan Baru";
    case "DIPROSES":
      return "Diproses";
    case "SIAP_DIKIRIM":
      return "Siap Dikirim";
    case "SELESAI":
      return "Selesai";
  }
}

export function labelPembayaran(order: OrderView): RingkasanOrder["pembayaran"] {
  if (order.sisa <= 0n) {
    return "Lunas";
  }
  return order.sudah_dibayar > 0n ? "DP diterima" : "Belum dibayar";
}

function aksi(
  kind: AksiUtama["kind"],
  label: string,
  bantuan: string,
): AksiUtama {
  return { kind, label, bantuan };
}

export function adalahCod(metode_bayar: string | string[]): boolean {
  return Array.isArray(metode_bayar)
    ? metode_bayar.includes("COD")
    : metode_bayar === "COD";
}

function isCod(order: OrderView): boolean {
  return adalahCod(order.metode_bayar);
}

export function nextAction(order: OrderView): AksiUtama {
  switch (order.status) {
    case "DRAFT":
      return aksi(
        "KONFIRMASI",
        "Periksa & konfirmasi",
        "Cek produk, harga, dan data pelanggan sebelum menyetujui pesanan.",
      );
    case "DIKONFIRMASI":
      if (order.sisa === 0n) {
        return aksi(
          "SIAP_DIKIRIM",
          "Tandai siap dikirim",
          "Pembayaran sudah lunas. Pesanan bisa mulai disiapkan.",
        );
      }
      if (isCod(order)) {
        return aksi(
          "SIAP_DIKIRIM",
          "Tandai siap dikirim",
          "Pesanan COD dibayar saat diterima, jadi langsung disiapkan saja.",
        );
      }
      return aksi(
        "BAYAR",
        "Catat pembayaran",
        "Catat uang yang sudah diterima. DP dan pelunasan sebagian diperbolehkan.",
      );
    case "DP_DITERIMA":
      if (order.sisa === 0n) {
        return aksi(
          "SIAP_DIKIRIM",
          "Tandai siap dikirim",
          "Pembayaran sudah lunas. Pesanan bisa mulai disiapkan.",
        );
      }
      return aksi(
        "BAYAR",
        "Catat pelunasan",
        `Masih ada sisa tagihan. Catat pembayaran sampai sisa menjadi Rp0.`,
      );
    case "SIAP_DIKIRIM":
      return aksi(
        "KIRIM",
        "Tandai dikirim",
        "Isi kurir dan nomor resi bila tersedia, lalu tandai paket dikirim.",
      );
    case "DIKIRIM":
      if (order.sisa > 0n) {
        return isCod(order)
          ? aksi(
              "BAYAR",
              "Catat COD diterima",
              "Catat uang COD yang diterima saat pesanan diserahkan.",
            )
          : aksi(
              "BAYAR",
              "Catat pelunasan",
              "Pesanan sedang dikirim dan belum lunas. Catat sisa pembayarannya.",
            );
      }
      return aksi(
        "TERIMA",
        "Tandai diterima/selesai",
        "Pesanan lunas dan sedang dikirim. Tandai selesai setelah diterima pembeli.",
      );
    case "SELESAI":
    case "BATAL":
      return aksi("TIDAK_ADA", "Tidak ada aksi", "Pesanan sudah di kondisi akhir.");
  }
}

export function ringkasOrder(order: OrderView): RingkasanOrder {
  const lane = workLane(order.status);

  return {
    label: labelStatus(order.status),
    lane,
    laneLabel: labelWorkLane(lane),
    pembayaran: labelPembayaran(order),
    aksi: nextAction(order),
  };
}
