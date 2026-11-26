import { ZodError } from "zod";

type ZodIssueRingkas = {
  path: PropertyKey[];
  message: string;
};

const PEMETAAN_RPC: ReadonlyArray<readonly [string, string]> = [
  ["MASIH ADA SISA", "Masih ada sisa pembayaran. Catat pelunasan dulu."],
  [
    "PEMBAYARAN_MELEBIHI_TOTAL",
    "Nominal melebihi sisa tagihan. Kurangi nominal lalu coba lagi.",
  ],
  ["DP_MELEBIHI_TOTAL", "DP melebihi total order. Kurangi DP lalu coba lagi."],
  ["COD_HANYA_SAAT_KIRIM", "COD hanya bisa dicatat saat pesanan dikirim."],
  [
    "TRANSISI_TIDAK_VALID",
    "Status pesanan tidak memungkinkan aksi ini. Muat ulang lalu coba lagi.",
  ],
  ["AKSES_DITOLAK", "Pesanan ini bukan milik usaha Anda."],
  ["AUTH_REQUIRED", "Sesi berakhir. Masuk lagi lalu coba lagi."],
  ["ORDER_TIDAK_DITEMUKAN", "Pesanan tidak ditemukan."],
  ["PRODUK_TIDAK_DITEMUKAN", "Produk tidak ditemukan. Pilih produk lain."],
  ["NAMA_PELANGGAN_TIDAK_VALID", "Nama pelanggan wajib diisi."],
  ["TELEPON_TIDAK_VALID", "Nomor telepon tidak valid."],
  ["ONGKIR_TIDAK_VALID", "Ongkir tidak valid."],
  ["DP_TIDAK_VALID", "DP tidak valid."],
  ["QTY_TIDAK_VALID", "Jumlah produk tidak valid."],
  ["ITEM_KOSONG", "Pilih minimal satu produk."],
  [
    "JENIS_PEMBAYARAN_TIDAK_VALID",
    "Jenis pembayaran tidak valid. Pilih jenis yang tersedia.",
  ],
  [
    "KANAL_PEMBAYARAN_TIDAK_VALID",
    "Kanal pembayaran tidak valid. Pilih kanal yang tersedia.",
  ],
];

function daftarIssue(error: unknown): ZodIssueRingkas[] {
  if (error instanceof ZodError) {
    return error.issues as ZodIssueRingkas[];
  }

  const kandidat = error as { name?: unknown; issues?: unknown } | null;

  if (kandidat?.name === "ZodError" && Array.isArray(kandidat.issues)) {
    return kandidat.issues as ZodIssueRingkas[];
  }

  return [];
}

function teksError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  const kandidat = error as { message?: unknown } | null;

  return typeof kandidat?.message === "string" ? kandidat.message : "";
}

export function fieldErrorsFrom(error: unknown): Record<string, string> {
  const hasil: Record<string, string> = {};

  for (const issue of daftarIssue(error)) {
    const kunci = issue.path.map(String).join(".");

    if (kunci && !hasil[kunci]) {
      hasil[kunci] = issue.message;
    }
  }

  return hasil;
}

export function pesanAksi(
  error: unknown,
  fallback = "Aksi gagal. Coba lagi.",
): string {
  const issuePertama = daftarIssue(error)[0];

  if (issuePertama) {
    return issuePertama.message;
  }

  const teks = teksError(error);

  if (teks.includes("STOK_TIDAK_CUKUP")) {
    return teks;
  }

  for (const [kode, pesan] of PEMETAAN_RPC) {
    if (teks.includes(kode)) {
      return pesan;
    }
  }

  return fallback;
}
