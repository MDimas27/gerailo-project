import { useState } from "react";
import { Sparkles, WandSparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { formatRupiah } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import {
  bacaTeksSmartPaste,
  useSmartPaste,
  simpanDraftSmartPaste,
  type DraftSmartPaste,
} from "@/hooks/use-smart-paste";
import type { FieldSource, HasilEkstraksi } from "@/lib/api";

function penandaSumber(source: FieldSource) {
  if (source === "katalog") {
    return { label: "Dari katalog", variant: "success" as const };
  }

  if (source === "teks") {
    return { label: "Dari chat", variant: "warning" as const };
  }

  return { label: "Perlu diisi", variant: "danger" as const };
}

function Penanda({ source }: { source: FieldSource }) {
  const penanda = penandaSumber(source);

  return <Badge variant={penanda.variant}>{penanda.label}</Badge>;
}

function BarisNilai({
  label,
  nilai,
  sumber,
}: {
  label: string;
  nilai: string;
  sumber: FieldSource;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="break-words text-sm font-medium text-ink">{nilai}</p>
      </div>
      <Penanda source={sumber} />
    </div>
  );
}

export function PastePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const smartPaste = useSmartPaste();
  const { business } = usePrimaryBusiness();
  const products = useProducts(business?.id);
  const [teks, setTeks] = useState(
    () => params.get("teks") ?? bacaTeksSmartPaste(),
  );
  const [hasil, setHasil] = useState<HasilEkstraksi | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [aiNonaktif, setAiNonaktif] = useState(false);

  const jalankan = async (pakaiAi: boolean) => {
    if (!teks.trim()) {
      setPesan("Tempel chat pembeli dulu ya.");
      return;
    }

    setPesan(null);

    try {
      const respons = await smartPaste.mutateAsync({
        teks: teks.trim(),
        pakaiAi,
      });

      setHasil(respons);

      if (respons.pesan) {
        setPesan(respons.pesan);
      }
    } catch (kesalahan) {
      setHasil(null);
      const pesanGagal =
        kesalahan instanceof Error
          ? kesalahan.message
          : "Gagal membaca pesanan. Coba lagi.";
      if (pesanGagal === "AI tidak aktif, lanjut manual.") {
        setAiNonaktif(true);
      }
      setPesan(pesanGagal);
    }
  };

  const pilihProduk = (indeks: number, productId: string) => {
    if (!hasil) {
      return;
    }

    const produk = (products.data ?? []).find((satu) => satu.id === productId);

    if (!produk) {
      return;
    }

    const items = hasil.extraction.items.map((item, posisi) =>
      posisi === indeks
        ? {
            ...item,
            product_id: produk.id,
            nama_produk: { value: produk.nama, source: "katalog" as const },
            harga_satuan: {
              value: produk.harga_jual,
              source: "katalog" as const,
            },
          }
        : item,
    );

    setHasil({
      ...hasil,
      extraction: { ...hasil.extraction, items },
    });
  };

  const lanjutKonfirmasi = () => {
    if (!hasil) {
      return;
    }

    const draft: DraftSmartPaste = {
      teks: teks.trim(),
      extraction: hasil.extraction,
      logId: hasil.logId,
    };

    simpanDraftSmartPaste(draft);
    navigate("/paste/confirm");
  };

  const extraction = hasil?.extraction;
  const keyakinan =
    extraction?.confidence === "TINGGI"
      ? ("success" as const)
      : extraction?.confidence === "SEDANG"
        ? ("warning" as const)
        : ("danger" as const);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Smart Paste</h1>
        <p className="text-sm text-muted">
          Tempel chat WhatsApp, lalu periksa hasilnya sebelum disimpan.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-ink" htmlFor="teks-pesanan">
          Teks pesanan WhatsApp
        </label>
        <Textarea
          className="min-h-36"
          id="teks-pesanan"
          placeholder="Tempel chat pembeli di sini..."
          value={teks}
          onChange={(event) => {
            setTeks(event.target.value);
            setPesan(null);
          }}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={smartPaste.isPending}
            type="button"
            onClick={() => void jalankan(false)}
          >
            <WandSparkles aria-hidden="true" className="size-4" />
            {smartPaste.isPending ? "Membaca..." : "Baca pesanan"}
          </Button>
          <Button
            className="flex-1"
            disabled={smartPaste.isPending || aiNonaktif}
            type="button"
            variant="secondary"
            onClick={() => void jalankan(true)}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            {aiNonaktif ? "AI tidak aktif" : "Coba AI"}
          </Button>
        </div>
        {pesan ? (
          <p role="alert" className="text-sm font-medium text-warning">
            {pesan}
          </p>
        ) : null}
      </Card>

      {extraction ? (
        <>
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">Hasil deteksi</h2>
              <Badge variant={keyakinan}>
                Keyakinan {extraction.confidence.toLowerCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted">
              Sumber: {extraction.sumber} · Total sementara {formatRupiah(extraction.total)}
            </p>
            {extraction.flags.map((flag) => (
              <p key={flag} className="text-sm text-warning">
                {flag}
              </p>
            ))}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-ink">Data pembeli</h2>
            <BarisNilai
              label="Nama"
              nilai={extraction.pelanggan.nama.value ?? "Belum ditemukan"}
              sumber={extraction.pelanggan.nama.source}
            />
            <BarisNilai
              label="Telepon"
              nilai={extraction.pelanggan.telepon.value ?? "Belum ditemukan"}
              sumber={extraction.pelanggan.telepon.source}
            />
            <BarisNilai
              label="Alamat"
              nilai={extraction.pelanggan.alamat.value ?? "Belum ditemukan"}
              sumber={extraction.pelanggan.alamat.source}
            />
            <BarisNilai
              label="Metode bayar"
              nilai={extraction.metode_bayar.value ?? "Belum ditemukan"}
              sumber={extraction.metode_bayar.source}
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-ink">Item terdeteksi</h2>
            {extraction.items.length === 0 ? (
              <p className="text-sm text-muted">
                Produk belum ditemukan. Pilih manual di halaman konfirmasi.
              </p>
            ) : (
              extraction.items.map((item, indeks) => (
                <div
                  key={`${item.product_id ?? "kosong"}-${indeks}`}
                  className="flex flex-col gap-2 rounded-control border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {item.nama_produk.value ?? "Produk belum ditemukan"}
                      </p>
                      <p className="text-xs text-muted">
                        {item.qty.value ?? 0} × {formatRupiah(item.harga_satuan.value ?? "0")}
                      </p>
                    </div>
                    <Penanda source={item.nama_produk.source} />
                  </div>

                  {item.candidates.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.candidates.map((candidate) => (
                        <Button
                          key={candidate.product_id}
                          className="min-h-9"
                          size="sm"
                          type="button"
                          variant={
                            item.product_id === candidate.product_id
                              ? "primary"
                              : "secondary"
                          }
                          onClick={() => pilihProduk(indeks, candidate.product_id)}
                        >
                          {candidate.nama}
                        </Button>
                      ))}
                    </div>
                  ) : null}

                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Produk katalog
                    <select
                      className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm text-ink"
                      value={item.product_id ?? ""}
                      onChange={(event) => pilihProduk(indeks, event.target.value)}
                    >
                      <option value="">Pilih produk</option>
                      {(products.data ?? []).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.nama} · {formatRupiah(product.harga_jual)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))
            )}
          </Card>

          <Button type="button" onClick={lanjutKonfirmasi}>
            Periksa &amp; konfirmasi
          </Button>
        </>
      ) : null}
    </main>
  );
}
