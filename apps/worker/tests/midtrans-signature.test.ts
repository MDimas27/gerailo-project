import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createSnapToken,
  eventIdMidtrans,
  verifyMidtransSignature,
} from "../src/lib/midtrans.js";

const rahasia = "MIDTRANS-SIGNATURE-RAHASIA";
const serverKey = "SB-Mid-server-rahasia";

function tandaTangan(dasar: string, kunci: string): string {
  return createHash("sha512").update(`${dasar}${kunci}`).digest("hex");
}

describe("verifyMidtransSignature", () => {
  const dasar = "GR-12320030000.00";

  it("menerima tanda tangan dengan Signature Secret Key", async () => {
    const tanda = tandaTangan(dasar, rahasia);

    expect(
      await verifyMidtransSignature({
        orderId: "GR-123",
        statusCode: "200",
        grossAmount: "30000.00",
        signatureKey: tanda,
        signatureSecretKey: rahasia,
      }),
    ).toBe(true);
  });

  it("menolak tanda tangan dari Server Key yang sudah berbeda", async () => {
    const tanda = tandaTangan(dasar, "SB-Mid-server-lain");

    expect(
      await verifyMidtransSignature({
        orderId: "GR-123",
        statusCode: "200",
        grossAmount: "30000.00",
        signatureKey: tanda,
        signatureSecretKey: rahasia,
      }),
    ).toBe(false);
  });

  it("menerima kunci lama saat rotasi", async () => {
    const tanda = tandaTangan(dasar, "kunci-lama");

    expect(
      await verifyMidtransSignature({
        orderId: "GR-123",
        statusCode: "200",
        grossAmount: "30000.00",
        signatureKey: tanda,
        signatureSecretKey: rahasia,
        previousSignatureSecretKey: "kunci-lama",
      }),
    ).toBe(true);
  });

  it("menolak panjang hex yang salah dan gagal bila secret kosong", async () => {
    expect(
      await verifyMidtransSignature({
        orderId: "GR-123",
        statusCode: "200",
        grossAmount: "30000.00",
        signatureKey: "abc",
        signatureSecretKey: rahasia,
      }),
    ).toBe(false);

    await expect(
      verifyMidtransSignature({
        orderId: "GR-123",
        statusCode: "200",
        grossAmount: "30000.00",
        signatureKey: tandaTangan(dasar, rahasia),
      }),
    ).rejects.toThrow("BELUM_DISET");
  });
});

describe("eventIdMidtrans", () => {
  it("stabil untuk kombinasi transaksi yang sama", () => {
    expect(
      eventIdMidtrans({
        transactionId: "trx-1",
        transactionStatus: "settlement",
        statusCode: "200",
      }),
    ).toBe("trx-1:settlement:200");
  });
});

describe("createSnapToken", () => {
  it("mengirim order_id dan gross_amount server ke Snap dengan Basic auth", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            token: "snap-token",
            redirect_url: "https://sandbox.example/snap",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
    );

    const hasil = await createSnapToken(
      {
        serverKey,
        orderId: "GR-123",
        amount: 165_000n,
        environment: "sandbox",
      },
      fetchImpl as unknown as typeof fetch,
    );

    expect(hasil).toEqual({
      token: "snap-token",
      redirect_url: "https://sandbox.example/snap",
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(init.headers).toMatchObject({
      Authorization: `Basic ${btoa(`${serverKey}:`)}`,
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      transaction_details: { order_id: "GR-123", gross_amount: 165000 },
    });
    expect(JSON.stringify(hasil)).not.toContain(serverKey);
  });

  it("menolak order_id di luar aturan Midtrans", async () => {
    await expect(
      createSnapToken({
        serverKey,
        orderId: "GR 123",
        amount: 165_000n,
      }),
    ).rejects.toThrow("ORDER_ID_MIDTRANS_TIDAK_VALID");
  });

  it("menggagalkan ketika Snap menolak", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("denied", { status: 401 }),
    );

    await expect(
      createSnapToken(
        { serverKey, orderId: "GR-123", amount: 165_000n },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow("SNAP_GAGAL: 401");
  });
});
