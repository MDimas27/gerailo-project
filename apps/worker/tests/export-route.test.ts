import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createExportRoute } from "../src/routes/export.js";

const penggunaValid = { id: "user-1", email: "a@b.c", token: "valid" };

function buatDeps(lebih: Record<string, unknown> = {}) {
  const fetchReport = vi.fn(async () => ({
    kolom: ["produk", "saldo", "hpp", "nilai", "unit_tanpa_harga"],
    baris: [
      ['Sambal, "Pedas"\n200g', 13, 11000n, 143000n, 0],
      ["Tanpa harga", 5, 0n, null, 1],
    ],
  }));

  const deps = {
    verifyToken: async (token: string) =>
      token === "valid" ? penggunaValid : null,
    fetchReport,
    ...lebih,
  };

  const app = new Hono();
  app.route("/api", createExportRoute(deps as never));

  return { app, fetchReport };
}

describe("GET /api/export/:jenis", () => {
  it("menolak tanpa Bearer (RED probe auth)", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/export/persediaan");

    expect(respons.status).toBe(401);
    expect((await respons.json()).error).toBe("AUTH_REQUIRED");
  });

  it("menolak token salah", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/export/persediaan", {
      headers: { Authorization: "Bearer salah" },
    });

    expect(respons.status).toBe(401);
  });

  it("menolak jenis di luar whitelist (RED probe zod)", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/export/lain", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(respons.status).toBe(400);
    expect((await respons.json()).error).toBe("JENIS_EXPORT_TIDAK_VALID");
  });

  it("menolak bulan salah format", async () => {
    const { app } = buatDeps();
    const respons = await app.request("/api/export/pnl?bulan=2026-13", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(respons.status).toBe(400);
    expect((await respons.json()).error).toBe("PERIODE_TIDAK_VALID");
  });

  it("mengirim CSV dengan BOM, escaping RFC-4180, dan angka mentah", async () => {
    const { app, fetchReport } = buatDeps();
    const respons = await app.request("/api/export/persediaan", {
      headers: { Authorization: "Bearer valid" },
    });
    const body = await respons.text();

    expect(respons.status).toBe(200);
    expect(respons.headers.get("Content-Type")).toContain("text/csv");
    expect(respons.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="persediaan-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain('"Sambal, ""Pedas""\n200g",13,11000,143000,0');
    expect(body).toContain("Tanpa harga,5,0,,1");
    expect(body).not.toMatch(/Rp\d/);
    expect(fetchReport).toHaveBeenCalledWith(
      "persediaan",
      penggunaValid,
      null,
    );
  });

  it("meneruskan bulan ke fetchReport", async () => {
    const { app, fetchReport } = buatDeps();
    await app.request("/api/export/rekap-harian?bulan=2026-11", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(fetchReport).toHaveBeenCalledWith(
      "rekap-harian",
      penggunaValid,
      "2026-11",
    );
  });
});
