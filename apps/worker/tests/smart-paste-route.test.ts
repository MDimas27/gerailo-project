import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import {
  createSmartPasteRoute,
  type SmartPasteDeps,
} from "../src/routes/smart-paste.js";
import { katalogSiti } from "./parser/fixtures.js";

function buatApp() {
  const logExtraction = vi.fn(async () => undefined);
  const deps: SmartPasteDeps = {
    verifyToken: async (token) =>
      token === "valid" ? { id: "user-1", token } : null,
    fetchKatalog: async () => katalogSiti,
    logExtraction,
  };
  const app = new Hono();
  app.route("/api", createSmartPasteRoute(deps));

  return { app, logExtraction };
}

const headerValid = {
  Authorization: "Bearer valid",
  "Content-Type": "application/json",
};

describe("POST /api/smart-paste", () => {
  it("menolak tanpa Bearer", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/smart-paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teks: "Pesan 1 sosis" }),
    });

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("menolak JWT tidak valid", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/smart-paste", {
      method: "POST",
      headers: {
        Authorization: "Bearer salah",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teks: "Pesan 1 sosis" }),
    });

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ error: "AUTH_INVALID" });
  });

  it("menolak body di luar zod", async () => {
    const { app } = buatApp();
    const respons = await app.request("/api/smart-paste", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ teks: "" }),
    });

    expect(respons.status).toBe(400);
  });

  it("mengembalikan ekstraksi BIGINT sebagai string dan mencatat log", async () => {
    const { app, logExtraction } = buatApp();
    const respons = await app.request("/api/smart-paste", {
      method: "POST",
      headers: headerValid,
      body: JSON.stringify({ teks: "Pesan 1 sosis" }),
    });

    expect(respons.status).toBe(200);
    const hasil = (await respons.json()) as {
      total: string;
      items: Array<{ harga_satuan: { value: string } }>;
    };
    expect(hasil.total).toBe("75000");
    expect(hasil.items[0]?.harga_satuan.value).toBe("75000");
    expect(logExtraction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      0.6,
      "Pesan 1 sosis",
    );
  });
});
