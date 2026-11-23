import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ambilMetrikParser } from "@/lib/api";

function persentase(nilai: number): string {
  return `${Math.round(nilai * 100)}%`;
}

export function AdminParserPage() {
  const metrik = useQuery({
    queryKey: ["admin", "parser-metrics"],
    queryFn: ambilMetrikParser,
    retry: false,
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/">
          ← Beranda
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Metrik Smart Paste</h1>
        <p className="text-sm text-muted">
          Ringkasan internal akurasi parser dan pemakaian AI. Teks chat tidak ditampilkan.
        </p>
      </div>

      {metrik.isPending ? (
        <p className="text-sm text-muted">Memuat metrik...</p>
      ) : metrik.error ? (
        <Card role="alert">
          <p className="text-sm font-medium text-danger">
            {metrik.error instanceof Error
              ? metrik.error.message
              : "Gagal memuat metrik."}
          </p>
        </Card>
      ) : metrik.data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="p-3">
              <p className="text-xs text-muted">Total ekstraksi</p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {metrik.data.total}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Parser</p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {metrik.data.parser}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">AI</p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {metrik.data.ai}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Koreksi</p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {metrik.data.dikoreksi}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Hit rate</p>
              <p className="text-xl font-semibold tabular-nums text-success">
                {persentase(metrik.data.hitRateParser)}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted">Token AI</p>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {metrik.data.tokenAi}
              </p>
            </Card>
          </div>

          <Card className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Akurasi final {persentase(metrik.data.akurasiFinal)}
            </p>
            <p className="text-xs text-muted">
              Diambil {new Date(metrik.data.diambilPada).toLocaleString("id-ID")}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-ink">Aktivitas terbaru</h2>
            {metrik.data.terbaru.length === 0 ? (
              <p className="text-sm text-muted">Belum ada ekstraksi.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {metrik.data.terbaru.map((log, indeks) => (
                  <div
                    className="flex items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
                    key={`${log.created_at}-${indeks}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{log.sumber}</p>
                      <p className="text-xs text-muted">
                        {new Date(log.created_at).toLocaleString("id-ID")} · skor{" "}
                        {persentase(Number(log.skor))}
                      </p>
                      <p className="break-all text-xs text-muted">
                        {log.sumber === "AI"
                          ? (log.model ?? "model tidak tercatat")
                          : "parser pola"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.dikoreksi ? (
                        <Badge variant="warning">Dikoreksi</Badge>
                      ) : (
                        <Badge variant="success">Asli</Badge>
                      )}
                      <span className="text-xs tabular-nums text-muted">
                        {log.token} token
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </main>
  );
}
