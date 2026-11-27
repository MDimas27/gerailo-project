/**
 * Satu-satunya tempat parse/format nilai uang Gerailo.
 *
 * Aturan proyek (AGENTS.md, rules/00):
 * - Uang disimpan sebagai BIGINT rupiah integer, tanpa pecahan.
 * - supabase-js mengembalikan BIGINT sebagai STRING, jadi string harus
 *   diparse tanpa lewat Number() agar presisi di atas 2^53 tetap utuh.
 * - Komponen web dilarang memanggil Number() untuk uang; gunakan fungsi di sini.
 */

export type MoneyInput = bigint | string | number;

const INT8_MIN = -9_223_372_036_854_775_808n;
const INT8_MAX = 9_223_372_036_854_775_807n;

const THOUSANDS_PATTERN = /^\d{1,3}(\.\d{3})*$|^\d+$/;
const RP_PREFIX = /^rp\s*/i;

function assertInt8(value: bigint): bigint {
  if (value < INT8_MIN || value > INT8_MAX) {
    throw new RangeError("Nilai uang melewati batas BIGINT Postgres (int8)");
  }

  return value;
}

function assertSafeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError("Nilai uang harus integer rupiah, bukan pecahan");
  }

  return value;
}

/**
 * Parse input uang menjadi bigint rupiah.
 *
 * Menerima: bigint, number integer aman, dan string dari database/form
 * ("15000", "15.000", "Rp 1.500.000", "-5.000").
 * Menolak: pecahan, format ribuan yang salah, dan teks lain.
 */
export function parseRupiah(input: MoneyInput): bigint {
  if (typeof input === "bigint") {
    return assertInt8(input);
  }

  if (typeof input === "number") {
    return assertInt8(BigInt(assertSafeInteger(input)));
  }

  let text = input.trim();

  if (text.length === 0) {
    throw new TypeError("Nilai uang tidak boleh kosong");
  }

  let negative = false;

  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1).trim();
  } else if (text.startsWith("+")) {
    text = text.slice(1).trim();
  }

  text = text.replace(RP_PREFIX, "").trim();

  if (!THOUSANDS_PATTERN.test(text)) {
    throw new TypeError(`Format uang tidak dikenali: "${input}"`);
  }

  const value = BigInt(text.replace(/\./g, ""));

  return assertInt8(negative ? -value : value);
}

/** Format rupiah untuk tampilan: "Rp1.500.000", "-Rp5.000", "Rp0". */
export function formatRupiah(input: MoneyInput): string {
  const value = parseRupiah(input);
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${negative ? "-" : ""}Rp${grouped}`;
}

/** Jumlahkan beberapa nilai uang tanpa kehilangan presisi. */
export function moneyAdd(...amounts: MoneyInput[]): bigint {
  const total = amounts.reduce<bigint>(
    (sum, amount) => sum + parseRupiah(amount),
    0n,
  );

  return assertInt8(total);
}

/** Kurangi dua nilai uang. */
export function moneySubtract(a: MoneyInput, b: MoneyInput): bigint {
  return assertInt8(parseRupiah(a) - parseRupiah(b));
}

/** Kalikan nilai uang dengan kuantitas integer (mis. harga x jumlah barang). */
export function moneyMultiply(
  amount: MoneyInput,
  quantity: number | bigint,
): bigint {
  const factor =
    typeof quantity === "bigint"
      ? quantity
      : BigInt(assertSafeInteger(quantity));

  return assertInt8(parseRupiah(amount) * factor);
}

/** Ubah uang ke string digit untuk argumen RPC BIGINT supabase-js. */
export function toRpcAmount(input: MoneyInput): string {
  return parseRupiah(input).toString();
}

function toStockQty(value: number | bigint): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new TypeError("Kuantitas stok tidak boleh negatif");
    }

    return value;
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Kuantitas stok harus integer non-negatif");
  }

  return BigInt(value);
}

/**
 * Rata-rata bergerak HPP per produk (docs/ACCOUNTING-RULES.md, M5).
 *
 * Rumus: (stok_lama x hpp_lama + qty_masuk x harga_beli) / (stok_lama + qty_masuk).
 * **Pembulatan half-up, aritmetika integer aman** — tanpa float dan tanpa
 * `Number()`, sehingga hasilnya identik dengan `round(numeric)` Postgres untuk
 * nilai non-negatif (mis. `1@10.000 + 1@11.001 → 10.501`).
 */
export function calculateMovingAverageHpp(
  stokLama: number | bigint,
  hppLama: MoneyInput,
  qtyMasuk: number | bigint,
  hargaBeli: MoneyInput,
): bigint {
  const oldQty = toStockQty(stokLama);
  const inQty = toStockQty(qtyMasuk);
  const harga = parseRupiah(hargaBeli);

  if (inQty === 0n) {
    return parseRupiah(hppLama);
  }

  const totalQty = oldQty + inQty;

  if (oldQty === 0n) {
    return assertInt8(harga);
  }

  const hpp = parseRupiah(hppLama);
  const totalNilai = oldQty * hpp + inQty * harga;

  return assertInt8((totalNilai + totalQty / 2n) / totalQty);
}

/** Label HPP untuk UI: 0 berarti belum di-set, selain itu rupiah. */
export function formatHppLabel(input: MoneyInput): string {
  const value = parseRupiah(input);

  return value <= 0n ? "HPP belum di-set" : formatRupiah(value);
}

const GATEWAY_AMOUNT_PATTERN = /^\d+(\.00)?$/;

/** Parse `gross_amount` gateway yang hanya boleh integer rupiah atau `.00`. */
export function parseGatewayAmount(input: string): bigint {
  const text = input.trim();

  if (!GATEWAY_AMOUNT_PATTERN.test(text)) {
    throw new TypeError(`Format gross_amount gateway tidak dikenali: "${input}"`);
  }

  return assertInt8(BigInt(text.split(".")[0] ?? text));
}

/** Ubah uang ke number aman untuk field JSON `gross_amount` gateway. */
export function toGatewayAmount(input: MoneyInput): number {
  const value =
    typeof input === "string" && GATEWAY_AMOUNT_PATTERN.test(input.trim())
      ? parseGatewayAmount(input)
      : parseRupiah(input);

  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("gross_amount gateway melewati batas presisi number");
  }

  return Number(value);
}
