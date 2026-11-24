import type { Database } from "@gerailo/supabase/types";
import { parseRupiah, toRpcAmount } from "@gerailo/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { CatalogProduct } from "../services/parser/types.js";

export type WorkerEnv = {
  APP_ENV?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
  ADMIN_EMAILS?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_SIGNATURE_SECRET_KEY?: string;
  MIDTRANS_PREVIOUS_SIGNATURE_SECRET_KEY?: string;
  MIDTRANS_ENVIRONMENT?: string;
};

export type SnapUser = {
  id: string;
  email?: string | null;
  token: string;
};

export type PaymentIntent = {
  providerOrderId: string;
  amount: bigint;
  orderId: string;
  jenis: "DP" | "PELUNASAN";
};

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [kunci: string]: Json };

export type ParserMetricRingkas = {
  sumber: "PARSER" | "AI";
  skor: string | number;
  token: number;
  model: string | null;
  dikoreksi: boolean;
  created_at: string;
};

export type ParserMetrics = {
  total: number;
  parser: number;
  ai: number;
  dikoreksi: number;
  hitRateParser: number;
  akurasiFinal: number;
  tokenAi: number;
  diambilPada: string;
  terbaru: ParserMetricRingkas[];
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

export function isAdminEmail(env: WorkerEnv, email: string | null): boolean {
  if (!email) {
    return false;
  }

  const daftar = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((satu) => satu.trim().toLowerCase())
    .filter(Boolean);

  return daftar.includes(email.toLowerCase());
}

export async function fetchParserMetrics(
  env: WorkerEnv,
  token: string,
): Promise<ParserMetrics> {
  const { data, error } = await klienDasar(env, token)
    .from("ai_usage_logs")
    .select("sumber,skor,token,model,dikoreksi,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`METRIK_GAGAL: ${error.message}`);
  }

  const logs = (data ?? []) as unknown as ParserMetricRingkas[];
  const parser = logs.filter((satu) => satu.sumber === "PARSER").length;
  const ai = logs.filter((satu) => satu.sumber === "AI").length;
  const dikoreksi = logs.filter((satu) => satu.dikoreksi).length;
  const total = logs.length;

  return {
    total,
    parser,
    ai,
    dikoreksi,
    hitRateParser: total === 0 ? 0 : parser / total,
    akurasiFinal: total === 0 ? 0 : (total - dikoreksi) / total,
    tokenAi: logs.reduce((jumlah, satu) => jumlah + (satu.token ?? 0), 0),
    diambilPada: new Date().toISOString(),
    terbaru: logs.slice(0, 20),
  };
}

function klienServiceRole(env: WorkerEnv): Klien {
  const kunci = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!kunci) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY_BELUM_DISET");
  }

  return createClient<Database>(envWajib(env, "SUPABASE_URL"), kunci, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createPaymentIntent(
  env: WorkerEnv,
  pengguna: SnapUser,
  input: { orderId: string; jenis: "DP" | "PELUNASAN" },
): Promise<PaymentIntent> {
  const { data, error } = await klienDasar(env, pengguna.token).rpc(
    "create_payment_intent",
    {
      p_order_id: input.orderId,
      p_jenis: input.jenis,
      p_expiry_minutes: 30,
    },
  );

  if (error || !data) {
    throw new Error(`INTENT_GAGAL: ${error?.message ?? "RESPON_KOSONG"}`);
  }

  const objek = data as unknown as Record<string, unknown>;

  if (
    typeof objek.provider_order_id !== "string"
    || typeof objek.amount !== "string"
    || typeof objek.order_id !== "string"
    || typeof objek.jenis !== "string"
  ) {
    throw new Error("INTENT_RESPON_TIDAK_VALID");
  }

  return {
    providerOrderId: objek.provider_order_id,
    amount: parseRupiah(objek.amount),
    orderId: objek.order_id,
    jenis: objek.jenis === "DP" ? "DP" : "PELUNASAN",
  };
}

export async function logPaymentEvent(
  env: WorkerEnv,
  input: {
    eventId: string;
    payload: Json;
    signatureStatus: "UNVERIFIED" | "VERIFIED" | "INVALID";
  },
): Promise<void> {
  const { error } = await klienServiceRole(env).rpc("log_payment_event", {
    p_provider: "MIDTRANS",
    p_event_id: input.eventId,
    p_payload: input.payload,
    p_signature_status: input.signatureStatus,
  });

  if (error) {
    throw new Error(`LOG_EVENT_GAGAL: ${error.message}`);
  }
}

export async function markPaymentEventVerified(
  env: WorkerEnv,
  input: { eventId: string; signatureStatus: "VERIFIED" | "INVALID" },
): Promise<void> {
  const { error } = await klienServiceRole(env).rpc(
    "mark_payment_event_verified",
    {
      p_event_id: input.eventId,
      p_signature_status: input.signatureStatus,
    },
  );

  if (error) {
    throw new Error(`MARK_VERIFIED_GAGAL: ${error.message}`);
  }
}

export async function applyPaymentEvent(
  env: WorkerEnv,
  input: {
    eventId: string;
    providerOrderId: string;
    grossAmount: bigint;
    transactionStatus: string;
    statusCode: string;
    fraudStatus?: string | null;
  },
): Promise<string> {
  const { data, error } = await klienServiceRole(env).rpc("apply_payment_event", {
    p_event_id: input.eventId,
    p_provider_order_id: input.providerOrderId,
    p_gross_amount: toRpcAmount(input.grossAmount) as unknown as number,
    p_transaction_status: input.transactionStatus,
    p_status_code: input.statusCode,
    p_fraud_status: input.fraudStatus ?? undefined,
  });

  if (error || typeof data !== "string") {
    throw new Error(`APPLY_GAGAL: ${error?.message ?? "RESPON_KOSONG"}`);
  }

  return data;
}
