# TECH-STACK.md — Stack Terkunci (ADR-10) + 6 Penyempurnaan

> Keputusan founder 19 Nov 2026: stack frontend pindah dari Next.js ke **React + Vite**
> (ADR-10), dengan alasan utama: akurasi AI agent CLI (jcode) lebih tinggi pada stack
> dengan data latih terbesar, tanpa pemisahan Server/Client Component yang rawan bug.
> Stack ini TERKUNCI — menambah/mengganti library = ADR baru + entri LESSONS-LEARNED.

## Stack final

| Lapisan | Pilihan | Peran |
|---|---|---|
| UI | React 19 + Vite + TypeScript (strict) | SPA statis; `tsc` = pagar pengaman yang bisa dibaca & diperbaiki agent sendiri |
| Komponen | Tailwind CSS + shadcn/ui | Kode komponen dimiliki lokal (di repo) — agent baca/edit tanpa tebak internal library |
| Server state | TanStack Query v5 | Loading/cache/invalidation terstruktur; pengganti `useEffect` manual (sumber bug #1 vibe coding) |
| Routing & form | react-router + react-hook-form + zod | Skema zod dipakai BERSAMA oleh klien & Worker (satu kontrak validasi) |
| PWA | vite-plugin-pwa (Workbox) | Manifest + service worker deklaratif; Web Share Target WhatsApp |
| API | Cloudflare Workers + Hono | SATU Worker: `/api/*` + menyajikan aset statis PWA (Workers Static Assets) — tanpa CORS, satu deploy |
| DB & Auth | Supabase Postgres + supabase-js | RLS, Auth, Storage; types otomatis via `supabase gen types` (agent tidak pernah salah nama kolom) |
| ORM | **TIDAK ADA** (kesengajaan, bukan kelalaian) | Migrasi = SQL murni via Supabase CLI; operasi atomik = RPC Postgres. Lebih sedikit moving parts = lebih sedikit halusinasi |
| AI | NVIDIA NIM (OpenAI-compatible), dipanggil HANYA dari Worker | `LLM_API_KEY` = wrangler secret; `LLM_BASE_URL`/`LLM_MODEL` = wrangler vars; kuota dihitung server-side |
| Billing | Midtrans/Xendit QRIS/VA (ADR-6) | Webhook → Worker (service_role), fallback transfer manual |

## 6 penyempurnaan yang terkunci bersama stack ini

1. **Satu Worker untuk semuanya** — Hono menyajikan `/api/*` DAN aset statis
   `apps/web/dist` (`not_found_handling: single-page-application`). Satu deploy,
   satu domain, tanpa konfigurasi CORS.
2. **AI terkunci di Worker** — fallback AI Smart Paste hanya lewat
   `POST /api/smart-paste/ai`; kuota & logging di server (`ai_usage_logs`);
   key tidak pernah masuk bundle browser (CI grep menolak).
3. **Tanpa ORM** — browser: supabase-js + RLS (anon key); operasi atomik: RPC Postgres
   (`create_business`, `record_stock_move`, `ship_order`, `receive_order`,
   `record_payment`, `cancel_order`; `post_journal` internal). Lihat `docs/DATA-MODEL.md` §RPC.
4. **Uang = BIGINT rupiah integer** — invariant debit=kredit dijaga GANDA:
   assertion di RPC `post_journal` + constraint trigger DEFERRED di database
   (`rules/01-accounting-safety.md`). Bug klien tidak bisa menyimpan jurnal timpang.
5. **Offline-lite** — read-cache via TanStack Query persister; antrean offline hanya
   untuk aksi order sederhana; Smart Paste wajib online.
6. **service_role key hanya di Worker** — webhook pembayaran & cron billing pakai
   service_role (secret); browser hanya anon key + RLS deny-by-default.

## Trade-off yang disadari (jangan "diperbaiki" tanpa ADR)

- **Tanpa SSR**: SEO hanya untuk landing page — dibuat HTML statis terpisah yang tetap
  disajikan Worker. Aplikasi SaaS di balik auth tidak butuh SEO; client rendering aman.
- **BIGINT → string di klien**: supabase-js mengembalikan kolom `int8` sebagai STRING.
  Semua parse/format uang lewat `packages/shared/src/money.ts` — dilarang `Number()`
  langsung di komponen.
- **Hilangnya RSC** adalah fitur, bukan kerugian, untuk proyek ini: semua fetch lewat
  TanStack Query — pola tunggal yang agent kuasai konsisten.

## Monorepo (pnpm workspaces — tanpa turborepo)

```
gerailo/
├── apps/
│   ├── web/                  # React+Vite PWA (src: routes/, features/, lib/api.ts)
│   └── worker/               # Hono (src/routes/, src/services/, src/webhooks/, wrangler.jsonc)
├── packages/
│   ├── shared/               # zod schemas + tipe + money.ts (dipakai web & worker)
│   └── supabase/             # migrations/*.sql, seed COA, types/db.ts (hasil gen types)
├── AGENTS.md · docs/ · rules/ · skills/ · commands/ · plans/   (kit ECC)
└── package.json / pnpm-workspace.yaml
```

Alasan flat & jelas: agent tidak bingung berpindah direktori; satu tempat untuk
skema (shared), satu tempat untuk SQL (supabase), dua entry point kecil (web, worker).

## Aturan tambahan

- Dependency baru di `apps/web` → pertimbangkan dulu: apakah TanStack Query/shadcn/zod
  sudah bisa? Kalau tetap perlu → catat alasan di plan sesi.
- `VITE_*` env = publik (masuk bundle); kunci rahasia TIDAK PERNAH berawalan `VITE_`.
- Semua fetch data via TanStack Query; dilarang `useEffect` + `fetch` manual untuk data.
