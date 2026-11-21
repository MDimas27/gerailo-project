import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok", service: "gerailo-worker" }));

export default app;
