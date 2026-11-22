import { smartPasteRequestSchema } from "@gerailo/shared";
import { Hono, type Context } from "hono";

import { parseSmartPaste } from "../services/parser/index.js";
import type { CatalogProduct, Extraction } from "../services/parser/types.js";

export type SmartPasteUser = {
  id: string;
  email?: string | null;
  token: string;
};

export type SmartPasteDeps = {
  verifyToken: (token: string) => Promise<SmartPasteUser | null>;
  fetchKatalog: (user: SmartPasteUser) => Promise<CatalogProduct[]>;
  logExtraction: (
    user: SmartPasteUser,
    skor: number,
    teks: string,
  ) => Promise<void>;
};

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [kunci: string]: Json };

const SKOR: Record<Extraction["confidence"], number> = {
  TINGGI: 0.9,
  SEDANG: 0.6,
  RENDAH: 0.2,
};

function jsonAman(nilai: unknown): Json {
  if (typeof nilai === "bigint") {
    return nilai.toString();
  }

  if (nilai === null || typeof nilai === "string" || typeof nilai === "boolean") {
    return nilai;
  }

  if (typeof nilai === "number") {
    return Number.isFinite(nilai) ? nilai : null;
  }

  if (Array.isArray(nilai)) {
    return nilai.map(jsonAman);
  }

  if (typeof nilai === "object") {
    return Object.fromEntries(
      Object.entries(nilai as Record<string, unknown>).map(([kunci, isi]) => [
        kunci,
        jsonAman(isi),
      ]),
    );
  }

  return null;
}

export function smartPasteHandler(deps: SmartPasteDeps) {
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
    const validasi = smartPasteRequestSchema.safeParse(tubuh);

    if (!validasi.success) {
      return c.json(
        { error: "INPUT_TIDAK_VALID", detail: validasi.error.flatten() },
        400,
      );
    }

    const hasil = parseSmartPaste(validasi.data.teks, await deps.fetchKatalog(pengguna));

    await deps.logExtraction(
      pengguna,
      SKOR[hasil.confidence],
      validasi.data.teks,
    );

    return c.json(jsonAman(hasil));
  };
}

export function createSmartPasteRoute(deps: SmartPasteDeps) {
  const rute = new Hono();
  rute.post("/smart-paste", smartPasteHandler(deps));

  return rute;
}
