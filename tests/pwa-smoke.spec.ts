import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

const baseURL = process.env.PWA_BASE_URL ?? "http://localhost:5173";
const cdpURL = process.env.CDP_URL ?? "http://127.0.0.1:9222";

let browser: Browser;
let page: Page;
const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeAll(async () => {
  browser = await chromium.connectOverCDP(cdpURL);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const response = await page.goto(baseURL, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
});

test.afterAll(async () => {
  await page?.close();
  await browser?.close();
});

test("halaman utama termuat tanpa uncaught error", async () => {
  expect(page.url()).toContain(new URL(baseURL).host);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("manifest PWA dapat diakses dan valid", async () => {
  const manifest = await page.evaluate(async () => {
    for (const path of ["/manifest.webmanifest", "/manifest.json"]) {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) {
        return { path, status: response.status, body: await response.json() };
      }
    }
    return null;
  });

  expect(manifest).not.toBeNull();
  expect(manifest?.status).toBe(200);
  expect(manifest?.body).toMatchObject({
    name: "Gerailo",
    short_name: "Gerailo",
    start_url: "/",
    display: "standalone",
  });
  expect(Array.isArray(manifest?.body.icons)).toBeTruthy();
  expect(manifest?.body.icons.length).toBeGreaterThan(0);
});

test("service worker terdaftar di origin dev server", async () => {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) {
            return null;
          }
          const registration = await navigator.serviceWorker.getRegistration();
          return registration
            ? {
                scope: registration.scope,
                ready: Boolean(registration.active || registration.installing || registration.waiting),
              }
            : null;
        }),
      { timeout: 15_000 },
    )
    .toMatchObject({ ready: true });

  const registration = await page.evaluate(async () => {
    const found = await navigator.serviceWorker.getRegistration();
    return found ? { scope: found.scope } : null;
  });
  expect(registration?.scope).toContain(new URL(baseURL).origin);
});

test("elemen React utama render di viewport mobile", async () => {
  await expect(page.locator("#root")).toBeAttached();
  await expect(page.locator("#root > *").first()).toBeVisible();
  await expect(page.locator("input, button, a").first()).toBeVisible();

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    bodyText: document.body.innerText,
  }));

  expect(viewport.width).toBeGreaterThan(300);
  expect(viewport.width).toBeLessThanOrEqual(600);
  expect(viewport.height).toBeGreaterThan(500);
  expect(viewport.bodyText).toContain("GERAILO");
});
