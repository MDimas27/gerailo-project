import { parseAiResponse, type AiResponse } from "@gerailo/shared";

import type { WorkerEnv } from "../../lib/supabase.js";
import { hitungConfidence } from "./confidence.js";
import { hitungTotal, parseSmartPaste } from "./index.js";
import type { CatalogProduct, Extraction, ParsedItem } from "./types.js";

export type AiDeps = {
  model?: string;
  complete: (prompt: string) => Promise<string>;
  claimQuota: (input: {
    model: string;
    tokens: number;
    skor: number;
    teks: string;
  }) => Promise<string>;
};

export type HasilAi = {
  extraction: Extraction;
  logId: string;
  tokens: number;
};

export class AiQuotaError extends Error {
  constructor() {
    super("AI_QUOTA_EXCEEDED");
    this.name = "AiQuotaError";
  }
}

function promptKandidat(teks: string, katalog: CatalogProduct[]): string {
  const kandidat = katalog
    .filter((produk) => produk.aktif !== false)
    .map((produk) => ({
      product_id: produk.id,
      nama: produk.nama,
      aliases: produk.aliases ?? [],
    }));

  return `Kamu hanya boleh memilih product_id dari kandidat katalog ini:
${JSON.stringify(kandidat)}

Aturan:
- Jangan mengarang produk, harga, atau pelanggan.
- product_id harus salah satu ID di atas.
- qty bilangan bulat 1..1000.
- Dilarang mengembalikan field harga, total, atau pelanggan.
- Balas HANYA JSON: {"items":[{"product_id":"...","qty":1}],"ongkir":0,"dp":0,"metode_bayar":"TRANSFER"}

Teks chat:
${teks}`;
}

function dariAi(ai: AiResponse, katalog: CatalogProduct[]): ParsedItem[] {
  return ai.items.map((item): ParsedItem => {
    const produk = katalog.find((satu) => satu.id === item.product_id);

    if (!produk) {
      throw new Error("AI_PRODUK_DILUAR_KANDIDAT");
    }

    return {
      product_id: produk.id,
      nama_produk: { value: produk.nama, source: "katalog" },
      qty: { value: item.qty, source: "teks" },
      harga_satuan: { value: produk.harga_jual, source: "katalog" },
      candidates: [],
    };
  });
}

export async function extractWithAi(
  teks: string,
  katalog: CatalogProduct[],
  deps: AiDeps,
): Promise<HasilAi> {
  const kandidatIds = katalog
    .filter((produk) => produk.aktif !== false)
    .map((produk) => produk.id);
  const prompt = promptKandidat(teks, katalog);
  const tokens = Math.max(1, Math.ceil(prompt.length / 4));
  const model = deps.model ?? "mock";
  const skor = 0.7;

  let logId: string;
  try {
    logId = await deps.claimQuota({ model, tokens, skor, teks });
  } catch (kesalahan) {
    if (
      kesalahan instanceof Error &&
      kesalahan.message.includes("AI_QUOTA_EXCEEDED")
    ) {
      throw new AiQuotaError();
    }

    throw kesalahan;
  }

  const mentah = await deps.complete(prompt);
  let json: unknown;

  try {
    json = JSON.parse(mentah);
  } catch {
    throw new Error("AI_OUTPUT_TIDAK_VALID");
  }

  const ai = parseAiResponse(json, kandidatIds);
  const dasar = parseSmartPaste(teks, katalog);
  const items = dariAi(ai, katalog);

  const ongkirNilai =
    ai.ongkir !== undefined ? BigInt(ai.ongkir) : (dasar.ongkir.value ?? 0n);
  const dpNilai = ai.dp !== undefined ? BigInt(ai.dp) : (dasar.dp.value ?? 0n);
  const produkAiLengkap =
    items.length > 0 && items.every((item) => item.product_id !== null);
  const flags = produkAiLengkap
    ? dasar.flags.filter((flag) => flag !== "PRODUK_TIDAK_DITEMUKAN")
    : dasar.flags;

  const extraction: Extraction = {
    sumber: "AI",
    confidence: hitungConfidence(items, dasar.pelanggan, flags, "AI"),
    pelanggan: dasar.pelanggan,
    items,
    ongkir: {
      value: ongkirNilai,
      source: ai.ongkir !== undefined ? "teks" : dasar.ongkir.source,
    },
    dp: {
      value: dpNilai,
      source: ai.dp !== undefined ? "teks" : dasar.dp.source,
    },
    metode_bayar:
      ai.metode_bayar !== undefined
        ? { value: ai.metode_bayar, source: "teks" }
        : dasar.metode_bayar,
    total: hitungTotal(items, ongkirNilai),
    flags,
  };

  return { extraction, logId, tokens };
}

export function createLlmCompleter(env: WorkerEnv) {
  return async (prompt: string): Promise<string> => {
    if (!env.LLM_API_KEY?.trim()) {
      throw new Error("LLM_API_KEY_BELUM_DISET");
    }

    if (!env.LLM_BASE_URL?.trim()) {
      throw new Error("LLM_BASE_URL_BELUM_DISET");
    }

    const titikAkhir = `${env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`;
    const model = env.LLM_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b";
    const respons = await fetch(titikAkhir, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1024,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!respons.ok) {
      throw new Error(`LLM_GAGAL_${respons.status}`);
    }

    const data = (await respons.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const isi = data.choices?.[0]?.message?.content;

    if (!isi?.trim()) {
      throw new Error("LLM_OUTPUT_KOSONG");
    }

    return isi;
  };
}
