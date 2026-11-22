export type FieldSource = "katalog" | "teks" | "kosong";

export type Field<T> = {
  value: T | null;
  source: FieldSource;
};

export type Confidence = "TINGGI" | "SEDANG" | "RENDAH";

export type MetodeBayar = "TRANSFER" | "COD" | "QRIS" | "LAINNYA";

export type CatalogProduct = {
  id: string;
  nama: string;
  aliases?: string[];
  harga_jual: bigint;
  aktif?: boolean;
};

export type Candidate = {
  product_id: string;
  nama: string;
  skor: number;
};

export type ParsedItem = {
  product_id: string | null;
  nama_produk: Field<string>;
  qty: Field<number>;
  harga_satuan: Field<bigint>;
  candidates: Candidate[];
};

export type Extraction = {
  sumber: "POLA" | "AI";
  confidence: Confidence;
  pelanggan: {
    nama: Field<string>;
    telepon: Field<string>;
    alamat: Field<string>;
  };
  items: ParsedItem[];
  ongkir: Field<bigint>;
  dp: Field<bigint>;
  metode_bayar: Field<MetodeBayar>;
  total: bigint;
  flags: string[];
};
