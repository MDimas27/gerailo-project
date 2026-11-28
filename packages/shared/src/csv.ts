/**
 * Utilitas CSV (RFC 4180) untuk export laporan M7.
 * Angka dikirim mentah (digit BIGINT, tanpa `Rp`/pemisah ribuan) agar
 * Excel/Sheets tidak merusak nilai; tanggal memakai ISO `YYYY-MM-DD`.
 */

const PERLU_KUTIP = /[\n\r",]/;

export function csvEscape(value: string): string {
  return PERLU_KUTIP.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function angkaMentah(value: bigint | number | string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError("Angka CSV harus integer");
    }

    return String(value);
  }

  const text = value.trim();

  if (!/^-?\d+$/.test(text)) {
    throw new TypeError("Angka CSV harus mentah tanpa pemisah");
  }

  return text;
}

export function isoTanggal(tanggal: Date = new Date()): string {
  return tanggal.toISOString().slice(0, 10);
}

export function namaFileExport(
  jenis: string,
  tanggal: Date = new Date(),
): string {
  return `${jenis}-${isoTanggal(tanggal)}.csv`;
}

type CsvCell = string | number | bigint | null;

export function toCsv(
  rows: readonly CsvCell[][],
  options: { bom?: boolean } = {},
): string {
  const bom = options.bom ?? true;

  const lines = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null) {
          return "";
        }

        if (typeof cell === "bigint" || typeof cell === "number") {
          return angkaMentah(cell);
        }

        return csvEscape(cell);
      })
      .join(","),
  );

  const body = lines.join("\r\n");

  return bom ? `\uFEFF${body}` : body;
}
