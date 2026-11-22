import type { Database } from "@gerailo/supabase/types";
import { parseRupiah } from "@gerailo/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProduct } from "../services/parser/types.js";

export type WorkerEnv = {
  APP_ENV?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_ENDPOINT?: string;
  ADMIN_EMAILS?: string;
};

type Klien = SupabaseClient<Database>;

function envWajib(
  env: WorkerEnv,
  nama: "SUPABASE_URL" | "SUPABASE_ANON_KEY",
): string {
  const nilai = env[nama];

  if (!nilai) {
    throw new Error(`${nama}_BELUM_DISET`);
  }

  return nilai;
}

function klienDasar(env: WorkerEnv, token?: string): Klien {
  return createClient<Database>(
    envWajib(env, "SUPABASE_URL"),
    envWajib(env, "SUPABASE_ANON_KEY"),
    {
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function verifyJwt(
  env: WorkerEnv,
  token: string,
): Promise<{ id: string; email: string | null; token: string } | null> {
  const { data, error } = await klienDasar(env).auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    token,
  };
}

export async function fetchKatalog(
  env: WorkerEnv,
  token: string,
): Promise<CatalogProduct[]> {
  const klien = klienDasar(env, token);
  const { data: produk, error } = await klien
    .from("products")
    .select("id,nama,harga_jual,aktif")
    .eq("aktif", true);

  if (error) {
    throw new Error(`KATALOG_GAGAL: ${error.message}`);
  }

  const daftar = produk ?? [];
  const petaAlias = new Map<string, string[]>();

  if (daftar.length > 0) {
    const { data: alias, error: aliasError } = await klien
      .from("product_aliases")
      .select("product_id,alias")
      .in(
        "product_id",
        daftar.map((satu) => satu.id),
      );

    if (aliasError) {
      throw new Error(`ALIAS_GAGAL: ${aliasError.message}`);
    }

    for (const satu of alias ?? []) {
      const saat = petaAlias.get(satu.product_id) ?? [];
      saat.push(satu.alias);
      petaAlias.set(satu.product_id, saat);
    }
  }

  return daftar.map((satu): CatalogProduct => ({
    id: satu.id,
    nama: satu.nama,
    aliases: petaAlias.get(satu.id) ?? [],
    harga_jual: parseRupiah(String(satu.harga_jual)),
    aktif: satu.aktif,
  }));
}

export async function logExtraction(
  env: WorkerEnv,
  token: string,
  skor: number,
  teks: string,
): Promise<void> {
  const { error } = await klienDasar(env, token).rpc(
    "log_parser_extraction",
    { p_skor: skor, p_teks_asli: teks },
  );

  if (error) {
    throw new Error(`LOG_GAGAL: ${error.message}`);
  }
}

export async function claimAiQuota(
  env: WorkerEnv,
  token: string,
  input: {
    model: string;
    tokens: number;
    skor: number;
    teks: string;
  },
): Promise<string> {
  const { data, error } = await klienDasar(env, token).rpc("claim_ai_quota", {
    p_model: input.model,
    p_tokens: input.tokens,
    p_skor: input.skor,
    p_teks_asli: input.teks,
  });

  if (error) {
    if (error.message.includes("AI_QUOTA_EXCEEDED")) {
      throw new Error("AI_QUOTA_EXCEEDED");
    }

    throw new Error(`KUOTA_GAGAL: ${error.message}`);
  }

  return String(data);
}
