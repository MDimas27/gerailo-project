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

export type SmartPasteAiDeps = {
  verifyToken: (token: string) => Promise<SmartPasteUser | null>;
  fetchKatalog: (user: SmartPasteUser) => Promise<CatalogProduct[]>;
  extractWithAi: (
    user: SmartPasteUser,
    teks: string,
    katalog: CatalogProduct[],
  ) => Promise<{
    extraction: Extraction;
    logId: string;
    tokens: number;
  }>;
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

export function smartPasteAiHandler(deps: SmartPasteAiDeps) {
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

    const katalog = await deps.fetchKatalog(pengguna);

    try {
      const hasil = await deps.extractWithAi(
        pengguna,
        validasi.data.teks,
        katalog,
      );

      return c.json({
        extraction: jsonAman(hasil.extraction),
        log_id: hasil.logId,
        tokens: hasil.tokens,
      });
    } catch (kesalahan) {
      if (
        kesalahan instanceof Error &&
        kesalahan.message.includes("AI_QUOTA_EXCEEDED")
      ) {
        return c.json(
          {
            error: "AI_QUOTA_EXCEEDED",
            pesan:
              "Kuota AI habis bulan ini. Periksa hasil parser pola berikut.",
            parser: jsonAman(parseSmartPaste(validasi.data.teks, katalog)),
          },
          429,
        );
      }

      throw kesalahan;
    }
  };
}

export function createSmartPasteRoute(
  deps: SmartPasteDeps,
  depsAi?: SmartPasteAiDeps,
) {
  const rute = new Hono();
  rute.post("/smart-paste", smartPasteHandler(deps));

  if (depsAi) {
    rute.post("/smart-paste/ai", smartPasteAiHandler(depsAi));
  }

  return rute;
}
