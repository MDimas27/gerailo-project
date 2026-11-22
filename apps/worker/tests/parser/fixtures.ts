export const PRODUK_SOSIS = "11111111-1111-4111-8111-111111111111";
export const PRODUK_CUMI = "22222222-2222-4222-8222-222222222222";

export const katalogSiti = [
  {
    id: PRODUK_SOSIS,
    nama: "Sosis",
    aliases: ["sosis", "sos"],
    harga_jual: 75_000n,
    aktif: true,
  },
  {
    id: PRODUK_CUMI,
    nama: "Sambal Cumi Pedas",
    aliases: ["sambal cumi", "cumi pedas"],
    harga_jual: 50_000n,
    aktif: true,
  },
];

export const katalogCod = katalogSiti.map((produk) =>
  produk.id === PRODUK_SOSIS ? { ...produk, harga_jual: 25_000n } : produk,
);

export function field<T>(value: T, source: "katalog" | "teks" | "kosong") {
  return { value, source };
}
