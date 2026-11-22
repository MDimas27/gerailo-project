import { Hono } from "hono";

import {
  claimAiQuota,
  fetchKatalog,
  logExtraction,
  verifyJwt,
  type WorkerEnv,
} from "./lib/supabase.js";
import {
  smartPasteAiHandler,
  smartPasteHandler,
} from "./routes/smart-paste.js";
import { createLlmCompleter, extractWithAi } from "./services/parser/llm.js";

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

app.post("/api/smart-paste/ai", (c) =>
  smartPasteAiHandler({
    verifyToken: (token) => verifyJwt(c.env, token),
    fetchKatalog: (pengguna) => fetchKatalog(c.env, pengguna.token),
    extractWithAi: (pengguna, teks, katalog) =>
      extractWithAi(teks, katalog, {
        model: c.env.LLM_MODEL ?? "gpt-4o-mini",
        complete: createLlmCompleter(c.env),
        claimQuota: (input) => claimAiQuota(c.env, pengguna.token, input),
      }),
  })(c as Parameters<ReturnType<typeof smartPasteAiHandler>>[0]),
);

export default app;
