import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createAdminRoute, type AdminDeps } from "../src/routes/admin.js";
import type { ParserMetrics } from "../src/lib/supabase.js";

const metrik: ParserMetrics = {
  total: 4,
  parser: 3,
  ai: 1,
  dikoreksi: 1,
  hitRateParser: 0.75,
  akurasiFinal: 0.75,
  tokenAi: 42,
  diambilPada: "2026-11-22T00:00:00.000Z",
  terbaru: [
    {
      sumber: "PARSER",
      skor: "0.90",
      token: 0,
      model: null,
      dikoreksi: false,
      created_at: "2026-11-22T00:00:00.000Z",
    },
  ],
};

function buatApp() {
  const deps: AdminDeps = {
    verifyToken: async (token) =>
      token === "valid" ? { id: "user-1", email: "owner@gerailo.id", token } : null,
    isAdmin: (pengguna) => pengguna.email === "owner@gerailo.id",
    fetchMetrics: vi.fn(async () => metrik),
  };
  const app = new Hono();
  app.route("/api", createAdminRoute(deps));

  return { app, fetchMetrics: deps.fetchMetrics };
}

describe("GET /api/admin/parser-metrics", () => {
  it("menolak tanpa Bearer", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/admin/parser-metrics");

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("menolak JWT tidak valid", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/admin/parser-metrics", {
      headers: { Authorization: "Bearer salah" },
    });

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "AUTH_INVALID" });
  });

  it("menerima email di dalam allowlist", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/admin/parser-metrics", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(respons.status).toBe(200);
  });

  it("mengembalikan metrik tanpa teks asli", async () => {
    const { app, fetchMetrics } = buatApp();
    const respons = await app.request("/api/admin/parser-metrics", {
      headers: { Authorization: "Bearer valid" },
    });
    const hasil = (await respons.json()) as ParserMetrics;

    expect(respons.status).toBe(200);
    expect(hasil.total).toBe(4);
    expect(hasil.hitRateParser).toBe(0.75);
    expect(JSON.stringify(hasil)).not.toContain("teks_asli");
    expect(fetchMetrics).toHaveBeenCalledTimes(1);
  });
});

describe("allowlist admin", () => {
  it("hanya menerima email yang terdaftar", async () => {
    const app = new Hono();
    app.route(
      "/api",
      createAdminRoute({
        verifyToken: async (token) => ({
          id: "user-2",
          email: "pegawai@gerailo.id",
          token,
        }),
        isAdmin: () => false,
        fetchMetrics: async () => metrik,
      }),
    );
    const respons = await app.request("/api/admin/parser-metrics", {
      headers: { Authorization: "Bearer valid" },
    });

    expect(respons.status).toBe(403);
    expect(await respons.json()).toEqual({ error: "ADMIN_FORBIDDEN" });
  });
});
