import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createPaymentsRoute } from "../src/routes/payments.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const providerOrderId = "GR-0123456789abcdef";
const signature = "a".repeat(128);
const headerValid = {
  Authorization: "Bearer valid",
  "Content-Type": "application/json",
};

function notifikasi(lebih: Record<string, unknown> = {}) {
  return {
    transaction_status: "settlement",
    transaction_id: "TRX-1",
    status_code: "200",
    signature_key: signature,
    order_id: providerOrderId,
    gross_amount: "30000.00",
    fraud_status: "ACCEPT",
    ...lebih,
  };
}

function buatDeps(lebih: Record<string, unknown> = {}) {
  const createIntent = vi.fn(async () => ({
    providerOrderId,
    amount: 30000n,
    orderId,
    jenis: "PELUNASAN" as const,
  }));
  const createSnapToken = vi.fn(async () => ({
    token: "snap-token",
    redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token",
  }));
  const verifySignature = vi.fn(async () => true);
  const logEvent = vi.fn(async () => undefined);
  const markVerified = vi.fn(async () => undefined);
  const applyEvent = vi.fn(async () => "POSTED");

  const deps = {
    verifyToken: async (token: string) =>
      token === "valid" ? { id: "user-1", token } : null,
    createIntent,
    createSnapToken,
    serverKey: "server-key",
    clientKey: "client-key",
    environment: "sandbox" as const,
    verifySignature,
    logEvent,
    markVerified,
    applyEvent,
    ...lebih,
  };

  const app = new Hono();
  app.route("/api", createPaymentsRoute(deps));

  return {
    app,
    createIntent,
    createSnapToken,
    verifySignature,
    logEvent,
    markVerified,
    applyEvent,
    ...lebih,
  };
}

describe("POST /api/payments/midtrans/token", () => {
  it("menolak tanpa Bearer", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("menolak order_id bukan uuid", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ order_id: "bukan-uuid" }),
    });

    expect(respons.status).toBe(400);
  });

  it("menolak bila kunci Midtrans belum diset", async () => {
    const { app } = buatDeps({ serverKey: undefined });
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ order_id: orderId }),
    });

    expect(respons.status).toBe(503);
    expect(await respons.json()).toEqual({ error: "MIDTRANS_BELUM_DISET" });
  });

  it("membuat intent server-side dan mengembalikan Snap token tanpa server key", async () => {
    const { app, createIntent, createSnapToken } = buatDeps();
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ order_id: orderId, jenis: "DP" }),
    });

    expect(respons.status).toBe(200);
    const hasil = (await respons.json()) as Record<string, string>;
    expect(hasil).toMatchObject({
      token: "snap-token",
      client_key: "client-key",
      provider_order_id: providerOrderId,
      amount: "30000",
      order_id: orderId,
      jenis: "PELUNASAN",
      environment: "sandbox",
    });
    expect(hasil).not.toHaveProperty("server_key");
    expect(createIntent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      { orderId, jenis: "DP" },
    );
    expect(createSnapToken).toHaveBeenCalledWith(
      expect.objectContaining({
        serverKey: "server-key",
        orderId: providerOrderId,
        amount: 30000n,
        environment: "sandbox",
      }),
    );
  });

  it("menerjemahkan error transisi RPC menjadi 422", async () => {
    const { app } = buatDeps({
      createIntent: vi.fn(async () => {
        throw new Error("TRANSISI_TIDAK_VALID");
      }),
    });
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ order_id: orderId }),
    });

    expect(respons.status).toBe(422);
    expect(await respons.json()).toEqual({ error: "TRANSISI_TIDAK_VALID" });
  });

  it("menerjemahkan kegagalan Snap menjadi 502", async () => {
    const { app } = buatDeps({
      createSnapToken: vi.fn(async () => {
        throw new Error("SNAP_GAGAL: 401");
      }),
    });
    const respons = await app.request("/api/payments/midtrans/token", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ order_id: orderId }),
    });

    expect(respons.status).toBe(502);
    expect(await respons.json()).toEqual({ error: "SNAP_GAGAL" });
  });
});

describe("POST /api/webhooks/payments/midtrans", () => {
  it("menolak notifikasi di luar zod", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: providerOrderId }),
    });

    expect(respons.status).toBe(400);
  });

  it("menulis raw event UNVERIFIED sebelum verifikasi dan posting", async () => {
    const urutan: string[] = [];
    const { app, logEvent, applyEvent } = buatDeps({
      logEvent: vi.fn(async () => {
        urutan.push("log");
      }),
      verifySignature: vi.fn(async () => {
        urutan.push("verify");
        return true;
      }),
      markVerified: vi.fn(async () => {
        urutan.push("mark");
      }),
      applyEvent: vi.fn(async () => {
        urutan.push("apply");
        return "POSTED";
      }),
    });

    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifikasi()),
    });

    expect(respons.status).toBe(200);
    expect(await respons.json()).toEqual({
      status: "ok",
      event_id: "TRX-1:settlement:200",
      outcome: "POSTED",
    });
    expect(urutan).toEqual(["log", "verify", "mark", "apply"]);
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "TRX-1:settlement:200",
        signatureStatus: "UNVERIFIED",
      }),
    );
    expect(applyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "TRX-1:settlement:200",
        providerOrderId,
        grossAmount: 30000n,
        transactionStatus: "settlement",
        statusCode: "200",
        fraudStatus: "ACCEPT",
      }),
    );
  });

  it("menandai INVALID dan tidak posting bila tanda tangan salah", async () => {
    const { app, markVerified, applyEvent } = buatDeps({
      verifySignature: vi.fn(async () => false),
    });
    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifikasi()),
    });

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "TANDA_TANGAN_TIDAK_VALID" });
    expect(markVerified).toHaveBeenCalledWith({
      eventId: "TRX-1:settlement:200",
      signatureStatus: "INVALID",
    });
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("menerima replay event yang sudah dicatat", async () => {
    const { app, applyEvent } = buatDeps({
      logEvent: vi.fn(async () => {
        throw new Error(
          'duplicate key value violates unique constraint "payment_events_provider_event_id_key"',
        );
      }),
    });
    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifikasi()),
    });

    expect(respons.status).toBe(200);
    expect(applyEvent).toHaveBeenCalledOnce();
  });

  it("menolak gross_amount yang bukan rupiah gateway", async () => {
    const { app, applyEvent } = buatDeps();
    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifikasi({ gross_amount: "165000.5" })),
    });

    expect(respons.status).toBe(422);
    expect(await respons.json()).toEqual({ error: "NOMINAL_TIDAK_VALID" });
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("menerjemahkan error verifikasi RPC menjadi 422", async () => {
    const { app } = buatDeps({
      applyEvent: vi.fn(async () => {
        throw new Error("NOMINAL_TIDAK_COCOK");
      }),
    });
    const respons = await app.request("/api/webhooks/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifikasi()),
    });

    expect(respons.status).toBe(422);
    expect(await respons.json()).toEqual({ error: "NOMINAL_TIDAK_COCOK" });
  });
});
