import {
  midtransNotificationSchema,
  parseGatewayAmount,
  snapTokenRequestSchema,
} from "@gerailo/shared";
import { Hono, type Context } from "hono";

import { eventIdMidtrans, type SnapEnvironment } from "../lib/midtrans.js";
import type { PaymentIntent, SnapUser } from "../lib/supabase.js";

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [kunci: string]: Json };

function jsonDariNilai(nilai: unknown): Json {
  if (nilai === null || typeof nilai === "string" || typeof nilai === "boolean") {
    return nilai;
  }

  if (typeof nilai === "number") {
    return Number.isFinite(nilai) ? nilai : null;
  }

  if (Array.isArray(nilai)) {
    return nilai.map(jsonDariNilai);
  }

  if (typeof nilai === "object") {
    return Object.fromEntries(
      Object.entries(nilai as Record<string, unknown>).map(([kunci, isi]) => [
        kunci,
        jsonDariNilai(isi),
      ]),
    );
  }

  return null;
}

export type PaymentsDeps = {
  verifyToken: (token: string) => Promise<SnapUser | null>;
  createIntent: (
    pengguna: SnapUser,
    input: { orderId: string; jenis: "DP" | "PELUNASAN" },
  ) => Promise<PaymentIntent>;
  createSnapToken: (input: {
    serverKey: string;
    orderId: string;
    amount: bigint;
    environment: SnapEnvironment;
  }) => Promise<{ token: string; redirect_url: string }>;
  serverKey?: string;
  clientKey?: string;
  environment: SnapEnvironment;
};

export type WebhookDeps = {
  verifySignature: (input: {
    orderId: string;
    statusCode: string;
    grossAmount: string;
    signatureKey: string;
  }) => Promise<boolean>;
  logEvent: (input: {
    eventId: string;
    payload: Json;
    signatureStatus: "UNVERIFIED";
  }) => Promise<void>;
  markVerified: (input: {
    eventId: string;
    signatureStatus: "VERIFIED" | "INVALID";
  }) => Promise<void>;
  applyEvent: (input: {
    eventId: string;
    providerOrderId: string;
    grossAmount: bigint;
    transactionStatus: string;
    statusCode: string;
    fraudStatus?: string | null;
  }) => Promise<string>;
};

const KODE_VALIDASI = [
  "NOMINAL_TIDAK_COCOK",
  "EVENT_BELUM_VERIFIED",
  "TANDA_TANGAN_TIDAK_VALID",
  "INTENT_TIDAK_DITEMUKAN",
  "INTENT_TIDAK_AKTIF",
  "TRANSISI_TIDAK_VALID",
  "EVENT_TIDAK_DITEMUKAN",
  "ORDER_TIDAK_DITEMUKAN",
  "PEMBAYARAN_TIDAK_VALID",
  "PEMBAYARAN_MELEBIHI_TOTAL",
  "ORDER_SUDAH_LUNAS",
];

function pesanGalat(galat: unknown): string {
  return galat instanceof Error ? galat.message : String(galat);
}

function galatValidasi(pesan: string): boolean {
  return KODE_VALIDASI.some((kode) => pesan.includes(kode));
}

function galatDuplikat(pesan: string): boolean {
  return /duplicate key|23505|payment_events_provider_event_id_key/i.test(pesan);
}

export function snapTokenHandler(deps: PaymentsDeps) {
  return async (c: Context) => {
    const header = c.req.header("Authorization") ?? "";
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];

    if (!token) {
      return c.json({ error: "AUTH_REQUIRED" }, 401);
    }

    const pengguna = await deps.verifyToken(token);
    if (!pengguna) {
      return c.json({ error: "AUTH_INVALID" }, 401);
    }

    const tubuh: unknown = await c.req.json().catch(() => null);
    const validasi = snapTokenRequestSchema.safeParse(tubuh);

    if (!validasi.success) {
      return c.json(
        { error: "INPUT_TIDAK_VALID", detail: validasi.error.flatten() },
        400,
      );
    }

    const serverKey = deps.serverKey?.trim();
    const clientKey = deps.clientKey?.trim();

    if (!serverKey || !clientKey) {
      return c.json({ error: "MIDTRANS_BELUM_DISET" }, 503);
    }

    try {
      const intent = await deps.createIntent(pengguna, {
        orderId: validasi.data.order_id,
        jenis: validasi.data.jenis,
      });
      const snap = await deps.createSnapToken({
        serverKey,
        orderId: intent.providerOrderId,
        amount: intent.amount,
        environment: deps.environment,
      });

      return c.json({
        token: snap.token,
        redirect_url: snap.redirect_url,
        client_key: clientKey,
        provider_order_id: intent.providerOrderId,
        amount: intent.amount.toString(),
        order_id: intent.orderId,
        jenis: intent.jenis,
        environment: deps.environment,
      });
    } catch (galat) {
      const pesan = pesanGalat(galat);

      if (galatValidasi(pesan)) {
        return c.json({ error: pesan }, 422);
      }

      if (pesan.includes("SNAP_GAGAL")) {
        return c.json({ error: "SNAP_GAGAL" }, 502);
      }

      return c.json({ error: "TOKEN_GAGAL" }, 500);
    }
  };
}

export function midtransWebhookHandler(deps: WebhookDeps) {
  return async (c: Context) => {
    const tubuh: unknown = await c.req.json().catch(() => null);
    const validasi = midtransNotificationSchema.safeParse(tubuh);

    if (!validasi.success) {
      return c.json(
        { error: "NOTIFIKASI_TIDAK_VALID", detail: validasi.error.flatten() },
        400,
      );
    }

    const notif = validasi.data;
    const eventId = eventIdMidtrans({
      transactionId: notif.transaction_id,
      transactionStatus: notif.transaction_status,
      statusCode: notif.status_code,
    });

    try {
      await deps.logEvent({
        eventId,
        payload: jsonDariNilai(notif),
        signatureStatus: "UNVERIFIED",
      });
    } catch (galat) {
      if (!galatDuplikat(pesanGalat(galat))) {
        return c.json({ error: "LOG_EVENT_GAGAL" }, 500);
      }
    }

    let terverifikasi: boolean;
    try {
      terverifikasi = await deps.verifySignature({
        orderId: notif.order_id,
        statusCode: notif.status_code,
        grossAmount: notif.gross_amount,
        signatureKey: notif.signature_key,
      });
    } catch {
      return c.json({ error: "MIDTRANS_SIGNATURE_BELUM_DISET" }, 500);
    }

    try {
      await deps.markVerified({
        eventId,
        signatureStatus: terverifikasi ? "VERIFIED" : "INVALID",
      });
    } catch {
      return c.json({ error: "MARK_VERIFIED_GAGAL" }, 500);
    }

    if (!terverifikasi) {
      return c.json({ error: "TANDA_TANGAN_TIDAK_VALID" }, 401);
    }

    let jumlah: bigint;
    try {
      jumlah = parseGatewayAmount(notif.gross_amount);
    } catch {
      return c.json({ error: "NOMINAL_TIDAK_VALID" }, 422);
    }

    try {
      const outcome = await deps.applyEvent({
        eventId,
        providerOrderId: notif.order_id,
        grossAmount: jumlah,
        transactionStatus: notif.transaction_status,
        statusCode: notif.status_code,
        fraudStatus: notif.fraud_status,
      });

      return c.json({ status: "ok", event_id: eventId, outcome });
    } catch (galat) {
      const pesan = pesanGalat(galat);

      if (galatValidasi(pesan)) {
        return c.json({ error: pesan }, 422);
      }

      return c.json({ error: "APPLY_GAGAL" }, 500);
    }
  };
}

export function createPaymentsRoute(deps: PaymentsDeps & WebhookDeps & {
  serverKey?: string;
  clientKey?: string;
  environment: SnapEnvironment;
}) {
  const rute = new Hono();
  rute.post("/payments/midtrans/token", snapTokenHandler(deps));
  rute.post("/webhooks/payments/midtrans", midtransWebhookHandler(deps));

  return rute;
}
