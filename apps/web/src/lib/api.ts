import { supabase } from "@/lib/supabase";

const workerUrl = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, "") ?? "";

export type FieldSource = "katalog" | "teks" | "kosong";
export type Confidence = "TINGGI" | "SEDANG" | "RENDAH";
export type MetodeBayar = "TRANSFER" | "COD" | "QRIS" | "LAINNYA";

export type Field<T> = {
  value: T | null;
  source: FieldSource;
};

export type Candidate = {
  product_id: string;
  nama: string;
  skor: number;
};

export type ItemEkstraksi = {
  product_id: string | null;
  nama_produk: Field<string>;
  qty: Field<number>;
  harga_satuan: Field<string>;
  candidates: Candidate[];
};

export type ExtractionWire = {
  sumber: "POLA" | "AI";
  confidence: Confidence;
  pelanggan: {
    nama: Field<string>;
    telepon: Field<string>;
    alamat: Field<string>;
  };
  items: ItemEkstraksi[];
  ongkir: Field<string>;
  dp: Field<string>;
  metode_bayar: Field<MetodeBayar>;
  total: string;
  flags: string[];
};

export type HasilEkstraksi = {
  extraction: ExtractionWire;
  logId?: string;
  tokens?: number;
  pesan?: string;
};

function sebagaiObjek(nilai: unknown): Record<string, unknown> | null {
  if (typeof nilai !== "object" || nilai === null || Array.isArray(nilai)) {
    return null;
  }

  return nilai as Record<string, unknown>;
}

function pesanError(kode: string): string {
  if (kode === "AUTH_REQUIRED" || kode === "AUTH_INVALID") {
    return "Sesi berakhir. Masuk lagi untuk memakai Smart Paste.";
  }

  if (kode === "INPUT_TIDAK_VALID") {
    return "Teks pesanan tidak valid. Periksa lagi.";
  }

  if (kode.startsWith("LLM")) {
    return "AI sedang tidak tersedia. Coba Baca pesanan dengan pola.";
  }

  return "Gagal membaca pesanan. Coba lagi sebentar.";
}

async function kirimKeWorker(
  jalur: string,
  teks: string,
): Promise<{ status: number; data: unknown }> {
  if (!workerUrl) {
    throw new Error("VITE_WORKER_URL belum diisi di .env.local");
  }

  const { data: sesi } = await supabase.auth.getSession();
  const token = sesi.session?.access_token;

  if (!token) {
    throw new Error("Sesi berakhir. Masuk lagi untuk memakai Smart Paste.");
  }

  const respons = await fetch(`${workerUrl}${jalur}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teks }),
  });

  return { status: respons.status, data: await respons.json().catch(() => null) };
}

export async function ekstrakChat(teks: string, pakaiAi = false): Promise<HasilEkstraksi> {
  const { status, data } = await kirimKeWorker(
    pakaiAi ? "/api/smart-paste/ai" : "/api/smart-paste",
    teks,
  );
  const objek = sebagaiObjek(data);

  if (!responsBerhasil(status)) {
    if (status === 429 && objek?.parser) {
      return {
        extraction: objek.parser as ExtractionWire,
        pesan:
          typeof objek.pesan === "string"
            ? objek.pesan
            : "Kuota AI habis bulan ini.",
      };
    }

    throw new Error(
      pesanError(typeof objek?.error === "string" ? objek.error : "PARSER_GAGAL"),
    );
  }

  if (pakaiAi) {
    if (!objek?.extraction) {
      throw new Error("Respons AI tidak valid. Coba lagi.");
    }

    return {
      extraction: objek.extraction as ExtractionWire,
      logId: typeof objek.log_id === "string" ? objek.log_id : undefined,
      tokens: typeof objek.tokens === "number" ? objek.tokens : undefined,
    };
  }

  if (!objek) {
    throw new Error("Respons parser tidak valid. Coba lagi.");
  }

  return { extraction: objek as unknown as ExtractionWire };
}

function responsBerhasil(status: number): boolean {
  return status >= 200 && status < 300;
}
