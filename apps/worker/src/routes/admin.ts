import { Hono, type Context } from "hono";

import type { ParserMetrics } from "../lib/supabase.js";

export type AdminUser = {
  id: string;
  email: string | null;
  token: string;
};

export type AdminDeps = {
  verifyToken: (token: string) => Promise<AdminUser | null>;
  isAdmin: (user: AdminUser) => boolean;
  fetchMetrics: (user: AdminUser) => Promise<ParserMetrics>;
};

export function parserMetricsHandler(deps: AdminDeps) {
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

    if (!deps.isAdmin(pengguna)) {
      return c.json({ error: "ADMIN_FORBIDDEN" }, 403);
    }

    const metrik = await deps.fetchMetrics(pengguna);

    return c.json(metrik);
  };
}

export function createAdminRoute(deps: AdminDeps) {
  const rute = new Hono();
  rute.get("/admin/parser-metrics", parserMetricsHandler(deps));

  return rute;
}
