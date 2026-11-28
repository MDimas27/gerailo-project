import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import type { JenisExport } from "@gerailo/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pesanAksi } from "@/lib/form-error";
import { unduhCsv } from "@/lib/unduh-csv";

type LaporanShellProps = {
  judul: string;
  deskripsi: string;
  jenisExport: JenisExport;
  bulan: string;
  padaBulanChange?: (bulan: string) => void;
  tampilkanFilter?: boolean;
  children: ReactNode;
};

export function LaporanShell({
  judul,
  deskripsi,
  jenisExport,
  bulan,
  padaBulanChange,
  tampilkanFilter = true,
  children,
}: LaporanShellProps) {
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const unduh = async () => {
    setSibuk(true);
    setGalat(null);

    try {
      await unduhCsv(jenisExport, bulan ?? null);
    } catch (error) {
      setGalat(pesanAksi(error, "Gagal mengunduh CSV. Coba lagi."));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-5 py-8">
      <header className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary no-print" to="/">
          ← Beranda
        </Link>
        <h1 className="text-2xl font-semibold text-ink">{judul}</h1>
        <p className="text-sm text-muted">{deskripsi}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 no-print">
        {tampilkanFilter && padaBulanChange ? (
          <Input
            aria-label="Periode bulan"
            className="w-40"
            type="month"
            value={bulan}
            onChange={(event) => padaBulanChange(event.target.value)}
          />
        ) : null}
        <Button
          disabled={sibuk}
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => void unduh()}
        >
          {sibuk ? "Mengunduh..." : "Unduh CSV"}
        </Button>
        <Button size="sm" type="button" onClick={() => window.print()}>
          Cetak / PDF
        </Button>
      </div>

      {galat ? (
        <p
          className="no-print rounded-control bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
          role="alert"
        >
          {galat}
        </p>
      ) : null}

      {children}

      <p className="mt-auto pt-4 text-xs text-muted">
        Laporan mengacu SAK EMKM · angka berasal dari jurnal double-entry.
      </p>
    </main>
  );
}

export function TabelLaporan({
  kolom,
  children,
}: {
  kolom: string[];
  children: ReactNode;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            {kolom.map((satu) => (
              <th className="px-3 py-2 font-semibold" key={satu}>
                {satu}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">{children}</tbody>
      </table>
    </Card>
  );
}
