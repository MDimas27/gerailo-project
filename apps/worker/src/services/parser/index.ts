import type {
  CatalogProduct,
  Extraction,
  Field,
  FieldSource,
  MetodeBayar,
  ParsedItem,
} from "./types.js";
import { hitungConfidence } from "./confidence.js";
import { cocokkanKatalog } from "./matching.js";
import { normalizeTelepon, parseAngka, parseQty } from "./normalize.js";
import { cariBaris, POLA } from "./rules.js";

function field<T>(value: T | null, source: FieldSource): Field<T> {
  return { value, source };
}

function metodeDariTeks(teks: string): Field<MetodeBayar> {
  if (POLA.cod.test(teks)) {
    return field("COD", "teks");
  }

  if (POLA.qris.test(teks)) {
    return field("QRIS", "teks");
  }

  if (POLA.transfer.test(teks)) {
    return field("TRANSFER", "teks");
  }

  return field<MetodeBayar>(null, "kosong");
}

function pasanganItem(teks: string): Array<{ nama: string; qty: number }> {
  const baris = teks.split(/\r?\n/).map((bagian) => bagian.trim());
  const namaLabel = cariBaris(baris, POLA.produkLabel);

  if (namaLabel) {
    const qtyLabel = cariBaris(baris, POLA.qtyLabel);
    return [{ nama: namaLabel, qty: parseQty(qtyLabel ?? "") ?? 1 }];
  }

  const hasil: Array<{ nama: string; qty: number }> = [];

  for (const cocok of teks.matchAll(POLA.item)) {
    const qty = parseQty(cocok[1] ?? "");
    const nama = (cocok[2] ?? "")
      .trim()
      .replace(/\s+(?:pcs|toples|botol|porsi|pak|unit)$/i, "");

    if (qty !== null && nama.length > 0) {
      hasil.push({ nama, qty });
    }
  }

  return hasil;
}

export function parseSmartPaste(
  teks: string,
  katalog: CatalogProduct[],
): Extraction {
  const baris = teks.split(/\r?\n/).map((bagian) => bagian.trim());
  const ongkirAngka = parseAngka(cariBaris(baris, POLA.ongkir) ?? "");
  const dpAngka = parseAngka(cariBaris(baris, POLA.dp) ?? "");
  const ongkirSumber: FieldSource = ongkirAngka !== null ? "teks" : "kosong";
  const dpSumber: FieldSource = dpAngka !== null ? "teks" : "kosong";
  const telepon = normalizeTelepon(cariBaris(baris, POLA.telepon) ?? "");

  const pelanggan: Extraction["pelanggan"] = {
    nama: field(cariBaris(baris, POLA.nama), "teks"),
    telepon: field(telepon, telepon ? "teks" : "kosong"),
    alamat: field(cariBaris(baris, POLA.alamat), "teks"),
  };

  const flags: string[] = [];
  const items = pasanganItem(teks).map(({ nama, qty }): ParsedItem => {
    const hasil = cocokkanKatalog(nama, katalog);

    if (!hasil.produk) {
      flags.push("PRODUK_TIDAK_DITEMUKAN");

      return {
        product_id: null,
        nama_produk: field(nama, "teks"),
        qty: field(qty, "teks"),
        harga_satuan: field<bigint>(null, "kosong"),
        candidates: hasil.candidates,
      };
    }

    return {
      product_id: hasil.produk.id,
      nama_produk: field(hasil.produk.nama, "katalog"),
      qty: field(qty, "teks"),
      harga_satuan: field(hasil.produk.harga_jual, "katalog"),
      candidates: hasil.candidates,
    };
  });

  const ongkir = field<bigint>(ongkirAngka ?? 0n, ongkirSumber);
  const total = items.reduce((jumlah, item) => {
    const harga = item.harga_satuan.value;
    const qty = item.qty.value;
    return harga !== null && qty !== null ? jumlah + harga * BigInt(qty) : jumlah;
  }, 0n) + (ongkir.value ?? 0n);

  return {
    sumber: "POLA",
    confidence: hitungConfidence(items, pelanggan, flags),
    pelanggan,
    items,
    ongkir,
    dp: field<bigint>(dpAngka ?? 0n, dpSumber),
    metode_bayar: metodeDariTeks(teks),
    total,
    flags,
  };
}

export type { CatalogProduct, Extraction } from "./types.js";
