import { Hono } from "hono";

import {
  fetchKatalog,
  logExtraction,
  verifyJwt,
  type WorkerEnv,
} from "./lib/supabase.js";
import { smartPasteHandler } from "./routes/smart-paste.js";

type Env = { Bindings: WorkerEnv };

const app = new Hono<Env>();

app.get("/api/health", (c) => c.json({ status: "ok", service: "gerailo-worker" }));

app.post("/api/smart-paste", (c) =>
  smartPasteHandler({
    verifyToken: (token) => verifyJwt(c.env, token),
    fetchKatalog: (pengguna) => fetchKatalog(c.env, pengguna.token),
    logExtraction: (pengguna, skor, teks) =>
      logExtraction(c.env, pengguna.token, skor, teks),
  })(c as Parameters<ReturnType<typeof smartPasteHandler>>[0]),
);

export default app;
