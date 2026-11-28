import {
  exportQuerySchema,
  jenisExportSchema,
  namaFileExport,
  toCsv,
  type JenisExport,
} from "@gerailo/shared";
import { Hono, type Context } from "hono";

export type PenggunaExport = {
  id: string;
  email: string | null;
  token: string;
};

export type LaporanCsv = {
  kolom: string[];
  baris: (string | number | bigint | null)[][];
};

export type ExportDeps = {
  verifyToken: (token: string) => Promise<PenggunaExport | null>;
  fetchReport: (
    jenis: JenisExport,
    pengguna: PenggunaExport,
    bulan: string | null,
  ) => Promise<LaporanCsv>;
};

/** GET /:jenis — CSV RFC-4180 + BOM, angka mentah, tanggal ISO. */
export function exportHandler(deps: ExportDeps) {
  return async (c: Context) => {
    const auth = c.req.header("Authorization");

    if (!auth?.startsWith("Bearer ")) {
      return c.json({ error: "AUTH_REQUIRED" }, 401);
    }

    const pengguna = await deps.verifyToken(auth.slice(7).trim());

    if (!pengguna) {
      return c.json({ error: "AUTH_REQUIRED" }, 401);
    }

    const jenis = jenisExportSchema.safeParse(c.req.param("jenis"));

    if (!jenis.success) {
      return c.json({ error: "JENIS_EXPORT_TIDAK_VALID" }, 400);
    }

    const query = exportQuerySchema.safeParse({
      bulan: c.req.query("bulan") ?? undefined,
    });

    if (!query.success) {
      return c.json({ error: "PERIODE_TIDAK_VALID" }, 400);
    }

    const laporan = await deps.fetchReport(
      jenis.data,
      pengguna,
      query.data.bulan ?? null,
    );

    const csv = toCsv([laporan.kolom, ...laporan.baris]);

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="${namaFileExport(jenis.data)}"`,
    );

    return c.body(csv);
  };
}

export function createExportRoute(deps: ExportDeps) {
  const rute = new Hono();

  rute.get("/export/:jenis", exportHandler(deps));

  return rute;
}
