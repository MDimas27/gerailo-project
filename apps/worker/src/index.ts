import { Hono } from "hono";

import {
  applyPaymentEvent,
  claimAiQuota,
  createPaymentIntent,
  fetchKatalog,
  fetchParserMetrics,
  isAdminEmail,
  logExtraction,
  logPaymentEvent,
  markPaymentEventVerified,
  verifyJwt,
  type WorkerEnv,
} from "./lib/supabase.js";
import { createSnapToken, verifyMidtransSignature, type SnapEnvironment } from "./lib/midtrans.js";
import { parserMetricsHandler } from "./routes/admin.js";
import { exportHandler } from "./routes/export.js";
import { fetchExportReport } from "./lib/supabase.js";
import {
  midtransWebhookHandler,
  snapTokenHandler,
} from "./routes/payments.js";
import {
  smartPasteAiHandler,
  smartPasteHandler,
} from "./routes/smart-paste.js";
import { createLlmCompleter, extractWithAi } from "./services/parser/llm.js";

type Env = { Bindings: WorkerEnv };

const app = new Hono<Env>();

app.get("/api/health", (c) => c.json({ status: "ok", service: "gerailo-worker" }));

app.get("/api/admin/parser-metrics", (c) =>
  parserMetricsHandler({
    verifyToken: (token) => verifyJwt(c.env, token),
    isAdmin: (pengguna) => isAdminEmail(c.env, pengguna.email),
    fetchMetrics: (pengguna) => fetchParserMetrics(c.env, pengguna.token),
  })(c as Parameters<ReturnType<typeof parserMetricsHandler>>[0]),
);

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
    aiTersedia: Boolean(c.env.LLM_API_KEY?.trim() && c.env.LLM_BASE_URL?.trim()),
    extractWithAi: (pengguna, teks, katalog) =>
      extractWithAi(teks, katalog, {
        model: c.env.LLM_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b",
        complete: createLlmCompleter(c.env),
        claimQuota: (input) => claimAiQuota(c.env, pengguna.token, input),
      }),
  })(c as Parameters<ReturnType<typeof smartPasteAiHandler>>[0]),
);

function snapEnvironment(env: WorkerEnv): SnapEnvironment {
  return env.MIDTRANS_ENVIRONMENT?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

function paymentDeps(env: WorkerEnv) {
  return {
    verifyToken: (token: string) => verifyJwt(env, token),
    createIntent: (
      pengguna: Parameters<typeof createPaymentIntent>[1],
      input: Parameters<typeof createPaymentIntent>[2],
    ) => createPaymentIntent(env, pengguna, input),
    createSnapToken,
    serverKey: env.MIDTRANS_SERVER_KEY,
    clientKey: env.MIDTRANS_CLIENT_KEY,
    environment: snapEnvironment(env),
    verifySignature: (input: {
      orderId: string;
      statusCode: string;
      grossAmount: string;
      signatureKey: string;
    }) =>
      verifyMidtransSignature({
        ...input,
        signatureSecretKey: env.MIDTRANS_SIGNATURE_SECRET_KEY,
        previousSignatureSecretKey: env.MIDTRANS_PREVIOUS_SIGNATURE_SECRET_KEY,
      }),
    logEvent: (input: Parameters<typeof logPaymentEvent>[1]) =>
      logPaymentEvent(env, input),
    markVerified: (input: Parameters<typeof markPaymentEventVerified>[1]) =>
      markPaymentEventVerified(env, input),
    applyEvent: (input: Parameters<typeof applyPaymentEvent>[1]) =>
      applyPaymentEvent(env, input),
  };
}

app.post("/api/payments/midtrans/token", (c) =>
  snapTokenHandler(paymentDeps(c.env))(
    c as Parameters<ReturnType<typeof snapTokenHandler>>[0],
  ),
);

app.post("/api/webhooks/payments/midtrans", (c) =>
  midtransWebhookHandler(paymentDeps(c.env))(
    c as Parameters<ReturnType<typeof midtransWebhookHandler>>[0],
  ),
);

app.get("/api/export/:jenis", (c) =>
  exportHandler({
    verifyToken: (token) => verifyJwt(c.env, token),
    fetchReport: (jenis, pengguna, bulan) =>
      fetchExportReport(c.env, pengguna.token, jenis, bulan),
  })(c as Parameters<ReturnType<typeof exportHandler>>[0]),
);

export default app;
