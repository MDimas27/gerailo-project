import { toGatewayAmount } from "@gerailo/shared";

export type SnapEnvironment = "sandbox" | "production";

export type SnapTokenInput = {
  serverKey: string;
  orderId: string;
  amount: bigint;
  environment?: SnapEnvironment;
};

export type SnapTokenResult = {
  token: string;
  redirect_url: string;
};

const SNAP_ENDPOINT: Record<SnapEnvironment, string> = {
  sandbox: "https://app.sandbox.midtrans.com/snap/v1/transactions",
  production: "https://app.midtrans.com/snap/v1/transactions",
};

const ORDER_ID_PATTERN = /^[A-Za-z0-9._~-]{1,50}$/;

async function sha512Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-512", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  const kiri = a.toLowerCase();
  const kanan = b.toLowerCase();

  if (!/^[0-9a-f]{128}$/.test(kiri) || !/^[0-9a-f]{128}$/.test(kanan)) {
    return false;
  }

  let beda = 0;
  for (let indeks = 0; indeks < kiri.length; indeks += 1) {
    beda |= kiri.charCodeAt(indeks) ^ kanan.charCodeAt(indeks);
  }

  return beda === 0;
}

export async function verifyMidtransSignature(input: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  signatureSecretKey?: string;
  previousSignatureSecretKey?: string;
}): Promise<boolean> {
  const kunci = [
    input.signatureSecretKey?.trim(),
    input.previousSignatureSecretKey?.trim(),
  ].filter((nilai): nilai is string => Boolean(nilai));

  if (kunci.length === 0) {
    throw new Error("MIDTRANS_SIGNATURE_SECRET_KEY_BELUM_DISET");
  }

  const dasar = `${input.orderId}${input.statusCode}${input.grossAmount}`;

  for (const rahasia of kunci) {
    const diharapkan = await sha512Hex(`${dasar}${rahasia}`);

    if (constantTimeEqual(input.signatureKey, diharapkan)) {
      return true;
    }
  }

  return false;
}

export function eventIdMidtrans(input: {
  transactionId: string;
  transactionStatus: string;
  statusCode: string;
}): string {
  return `${input.transactionId}:${input.transactionStatus}:${input.statusCode}`;
}

export async function createSnapToken(
  input: SnapTokenInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SnapTokenResult> {
  const serverKey = input.serverKey.trim();

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY_BELUM_DISET");
  }

  if (!ORDER_ID_PATTERN.test(input.orderId)) {
    throw new Error("ORDER_ID_MIDTRANS_TIDAK_VALID");
  }

  const environment = input.environment ?? "sandbox";
  const respons = await fetchImpl(SNAP_ENDPOINT[environment], {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${serverKey}:`)}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: toGatewayAmount(input.amount),
      },
      credit_card: { secure: true },
    }),
  });

  if (!respons.ok) {
    throw new Error(`SNAP_GAGAL: ${respons.status}`);
  }

  const hasil: unknown = await respons.json().catch(() => null);

  if (!hasil || typeof hasil !== "object") {
    throw new Error("SNAP_RESPON_TIDAK_VALID");
  }

  const objek = hasil as Record<string, unknown>;

  if (typeof objek.token !== "string" || typeof objek.redirect_url !== "string") {
    throw new Error("SNAP_RESPON_TIDAK_VALID");
  }

  return { token: objek.token, redirect_url: objek.redirect_url };
}
