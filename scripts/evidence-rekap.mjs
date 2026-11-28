/* eslint-disable no-undef */
/**
 * Rekap per-akun untuk evidence M7 (REST JWT, tanpa service_role).
 *
 * Menghitung ulang 4 angka dashboard dari buku:
 *  - penjualan bulan berjalan  : 4-4010 + 4-4020 (kredit - debit, filter bulan)
 *  - laba kotor bulan berjalan : penjualan - 5-5010 (bulan)
 *  - piutang + UMP saldo kini  : 1-1030 (debit - kredit) + 2-2010 (kredit - debit)
 *  - nilai persediaan          : Σ saldo > 0 × HPP rata-rata (M5)
 * Membandingkan nilai persediaan dengan Σ kolom `nilai` pada CSV `persediaan`.
 *
 * Jalankan (JANGAN pernah commit nilai env):
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_JWT=... \
 *   BUSINESS_ID=... WORKER_URL=https://... node scripts/evidence-rekap.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const JWT = process.env.SUPABASE_JWT;
const BUSINESS_ID = process.env.BUSINESS_ID;
const WORKER_URL = process.env.WORKER_URL;

if (!SUPABASE_URL || !ANON || !JWT || !BUSINESS_ID || !WORKER_URL) {
  console.error(
    "Butuh env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT, BUSINESS_ID, WORKER_URL",
  );
  process.exit(2);
}

const headers = { apikey: ANON, Authorization: `Bearer ${JWT}` };

async function get(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`REST ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const bulanDefault = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();
const BULAN = process.env.BULAN ?? bulanDefault;

const baris = await get(
  `journal_lines?select=debit,kredit,tanggal,accounts(kode)&business_id=eq.${BUSINESS_ID}`,
);

const akun = {};
let penjualanBulan = 0n;
let hppBulan = 0n;

for (const line of baris) {
  const kode = line.accounts?.kode;
  if (!kode) continue;
  const debit = BigInt(line.debit ?? 0);
  const kredit = BigInt(line.kredit ?? 0);
  const bulanLine = String(line.tanggal ?? "").slice(0, 7);

  const tambah = (key, nilai) => {
    akun[key] = (akun[key] ?? 0n) + nilai;
  };

  if (kode === "1-1010" || kode === "1-1020" || kode === "1-1030") {
    tambah(kode, debit - kredit);
  } else if (kode === "2-2010") {
    tambah(kode, kredit - debit);
  } else if (kode === "4-4010" || kode === "4-4020") {
    tambah(kode, kredit - debit);
    if (bulanLine === BULAN) penjualanBulan += kredit - debit;
  } else if (kode === "5-5010") {
    tambah(kode, debit - kredit);
    if (bulanLine === BULAN) hppBulan += debit - kredit;
  } else if (kode.startsWith("6-")) {
    tambah("beban", debit - kredit);
  }
}

const produk = await get(
  `products?select=id,hpp_rata_rata&business_id=eq.${BUSINESS_ID}`,
);
const saldo = await get(
  `v_stock_balance?select=product_id,saldo&business_id=eq.${BUSINESS_ID}`,
);
const petaSaldo = new Map(
  saldo.map((row) => [row.product_id, BigInt(row.saldo ?? 0)]),
);

let nilaiPersediaan = 0n;
let unitTanpaHarga = 0;

for (const item of produk) {
  const qty = petaSaldo.get(item.id) ?? 0n;
  const hpp = BigInt(item.hpp_rata_rata ?? 0);
  if (qty <= 0n) continue;
  if (hpp > 0n) nilaiPersediaan += qty * hpp;
  else unitTanpaHarga += 1;
}

const csvRes = await fetch(`${WORKER_URL}/api/export/persediaan`, { headers });
if (!csvRes.ok) throw new Error(`CSV ${csvRes.status}`);
const csvRows = parseCsv(await csvRes.text());
const header = csvRows.shift() ?? [];
const idxNilai = header.indexOf("nilai");
let sigmaCsv = 0n;

for (const row of csvRows) {
  const nilai = row[idxNilai];
  if (nilai && nilai.length > 0) sigmaCsv += BigInt(nilai);
}

const piutang = akun["1-1030"] ?? 0n;
const ump = akun["2-2010"] ?? 0n;

const hasil = {
  diambilPada: new Date().toISOString(),
  businessId: BUSINESS_ID,
  bulan: BULAN,
  akun: {
    kas_1_1010: (akun["1-1010"] ?? 0n).toString(),
    bank_1_1020: (akun["1-1020"] ?? 0n).toString(),
    piutang_1_1030: piutang.toString(),
    ump_2_2010: ump.toString(),
    pendapatan_4_40xx: (
      (akun["4-4010"] ?? 0n) + (akun["4-4020"] ?? 0n)
    ).toString(),
    hpp_5_5010: (akun["5-5010"] ?? 0n).toString(),
    beban_6_60xx: (akun["beban"] ?? 0n).toString(),
  },
  dashboard: {
    penjualanBulan: penjualanBulan.toString(),
    labaKotorBulan: (penjualanBulan - hppBulan).toString(),
    piutangUmp: (piutang + ump).toString(),
    nilaiPersediaan: nilaiPersediaan.toString(),
  },
  persediaan: {
    unitTanpaHarga,
    jumlahProduk: csvRows.length,
    sigmaCsv: sigmaCsv.toString(),
  },
  cocok: {
    nilaiPersediaanVsCsv: nilaiPersediaan === sigmaCsv,
  },
};

console.log(JSON.stringify(hasil, null, 2));
