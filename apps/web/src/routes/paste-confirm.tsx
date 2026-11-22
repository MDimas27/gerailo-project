import { useState } from "react";
import { Link, Navigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";

import { formatRupiah, moneyMultiply, moneySubtract, parseRupiah } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import {
  bacaDraftSmartPaste,
  hapusDraftSmartPaste,
  type DraftSmartPaste,
} from "@/hooks/use-smart-paste";
import type { FieldSource, MetodeBayar } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ItemForm = {
  product_id: string;
  qty: string;
};

type FormKonfirmasi = {
  nama: string;
  telepon: string;
  alamat: string;
  items: ItemForm[];
  ongkir: string;
  dp: string;
  metode_bayar: MetodeBayar;
  catatan: string;
};

function formKosong(): FormKonfirmasi {
  return {
    nama: "",
    telepon: "",
    alamat: "",
    items: [],
    ongkir: "0",
    dp: "0",
    metode_bayar: "TRANSFER",
    catatan: "",
  };
}

function dariDraft(draft: DraftSmartPaste): FormKonfirmasi {
  const extraction = draft.extraction;

  return {
    nama: extraction.pelanggan.nama.value ?? "",
    telepon: extraction.pelanggan.telepon.value ?? "",
    alamat: extraction.pelanggan.alamat.value ?? "",
    items: extraction.items.flatMap((item) =>
      item.product_id
        ? [{ product_id: item.product_id, qty: String(item.qty.value ?? 1) }]
        : [],
    ),
    ongkir: extraction.ongkir.value ?? "0",
    dp: extraction.dp.value ?? "0",
    metode_bayar: extraction.metode_bayar.value ?? "TRANSFER",
    catatan: "",
  };
}

function uangAman(input: string): bigint {
  try {
    return parseRupiah(input.trim() === "" ? "0" : input.trim());
  } catch {
    return 0n;
  }
}

function qtyAman(input: string): number {
  const nilai = Number(input);

  if (!Number.isSafeInteger(nilai) || nilai < 1 || nilai > 1000) {
    return 0;
  }

  return nilai;
}

function penanda(source: FieldSource) {
  if (source === "katalog") {
    return { label: "Dari katalog", variant: "success" as const };
  }

  if (source === "teks") {
    return { label: "Dari chat", variant: "warning" as const };
  }

  return { label: "Perlu diisi", variant: "danger" as const };
}

function Penanda({ source }: { source: FieldSource }) {
  const info = penanda(source);

  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function pesanRpc(pesan: string): string {
  if (
    pesan.includes("PRODUK_TIDAK_DITEMUKAN") ||
    pesan.includes("PRODUK_NONAKTIF")
  ) {
    return "Ada produk yang tidak aktif. Pilih ulang dari katalog.";
  }

  if (pesan.includes("AUTH_REQUIRED") || pesan.includes("USAHA_TIDAK_DITEMUKAN")) {
    return "Sesi atau usaha tidak valid. Masuk lagi.";
  }

  if (pesan.includes("ITEM_TIDAK_VALID")) {
    return "Periksa lagi produk dan jumlah item.";
  }

  return "Gagal menyimpan pesanan. Coba lagi sebentar.";
}

export function PasteConfirmPage() {
  const [draft] = useState(bacaDraftSmartPaste);
  const [form, setForm] = useState(() => (draft ? dariDraft(draft) : formKosong()));
  const { business } = usePrimaryBusiness();
  const products = useProducts(business?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [diubah, setDiubah] = useState(false);

  if (!draft) {
    return <Navigate to="/paste" replace />;
  }

  const hargaProduk = (productId: string): string =>
    products.data?.find((product) => product.id === productId)?.harga_jual ?? "0";

  const subtotal = form.items.reduce(
    (jumlah, item) =>
      jumlah + moneyMultiply(hargaProduk(item.product_id), qtyAman(item.qty)),
    0n,
  );
  const ongkir = uangAman(form.ongkir);
  const dp = uangAman(form.dp);
  const total = subtotal + ongkir;
  const sisa = total > dp ? moneySubtract(total, dp) : 0n;

  const ubah = <K extends keyof FormKonfirmasi>(
    kunci: K,
    nilai: FormKonfirmasi[K],
  ) => {
    setForm((sebelum) => ({ ...sebelum, [kunci]: nilai }));
    setDiubah(true);
    setError(null);
  };

  const ubahItem = (indeks: number, patch: Partial<ItemForm>) => {
    setForm((sebelum) => ({
      ...sebelum,
      items: sebelum.items.map((item, posisi) =>
        posisi === indeks ? { ...item, ...patch } : item,
      ),
    }));
    setDiubah(true);
    setError(null);
  };

  const konfirmasi = async () => {
    if (!form.nama.trim() || !form.telepon.trim()) {
      setError("Nama dan telepon pembeli wajib diisi.");
      return;
    }

    if (form.items.length === 0 || form.items.some((item) => !item.product_id || qtyAman(item.qty) === 0)) {
      setError("Setiap item butuh produk dan jumlah yang valid.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("confirm_draft_order", {
        p_items: form.items.map((item) => ({
          product_id: item.product_id,
          qty: qtyAman(item.qty),
        })),
        p_ongkir: ongkir.toString() as unknown as number,
        p_dp: dp.toString() as unknown as number,
        p_nama: form.nama.trim(),
        p_telepon: form.telepon.trim(),
        p_alamat: form.alamat.trim() || undefined,
        p_catatan: form.catatan.trim() || undefined,
        p_metode_bayar: form.metode_bayar,
      });

      if (rpcError) {
        throw new Error(pesanRpc(`${rpcError.message} ${rpcError.details ?? ""}`));
      }

      setOrderId(String(data));
      hapusDraftSmartPaste();

      if (draft.logId && diubah) {
        void supabase
          .rpc("mark_extraction_corrected", { p_log_id: draft.logId })
          .then(() => undefined, () => undefined);
      }
    } catch (kesalahan) {
      setError(
        kesalahan instanceof Error ? kesalahan.message : "Gagal menyimpan pesanan.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (orderId) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
        <Card className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-ink">Pesanan tersimpan</h1>
          <p className="text-sm text-muted">
            Draft pesanan <span className="font-semibold text-ink">{orderId}</span>{" "}
            berhasil dibuat. Lanjutkan ke alur pesanan setelah modul M4 tersedia.
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
            to="/"
          >
            Kembali ke beranda
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/paste">
          ← Kembali ke hasil
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Periksa &amp; simpan pesanan</h1>
        <p className="text-sm text-muted">
          Koreksi data yang belum tepat. Harga tetap diambil dari katalog.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Data pembeli</h2>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="nama-pembeli">Nama pembeli</Label>
            <Penanda source={draft.extraction.pelanggan.nama.source} />
          </div>
          <Input
            id="nama-pembeli"
            value={form.nama}
            onChange={(event) => ubah("nama", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="telepon-pembeli">No. WhatsApp</Label>
            <Penanda source={draft.extraction.pelanggan.telepon.source} />
          </div>
          <Input
            id="telepon-pembeli"
            type="tel"
            value={form.telepon}
            onChange={(event) => ubah("telepon", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="alamat-pembeli">Alamat</Label>
            <Penanda source={draft.extraction.pelanggan.alamat.source} />
          </div>
          <Textarea
            id="alamat-pembeli"
            value={form.alamat}
            onChange={(event) => ubah("alamat", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="metode-bayar">Metode bayar</Label>
          <select
            className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm text-ink"
            id="metode-bayar"
            value={form.metode_bayar}
            onChange={(event) =>
              ubah("metode_bayar", event.target.value as MetodeBayar)
            }
          >
            <option value="TRANSFER">Transfer</option>
            <option value="COD">COD</option>
            <option value="QRIS">QRIS</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">Item pesanan</h2>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() =>
              ubah("items", [...form.items, { product_id: "", qty: "1" }])
            }
          >
            <Plus aria-hidden="true" className="size-4" />
            Tambah item
          </Button>
        </div>

        {form.items.length === 0 ? (
          <p className="text-sm text-muted">Belum ada item. Tambah produk dulu.</p>
        ) : (
          form.items.map((item, indeks) => (
            <div
              className="flex flex-col gap-2 rounded-control border border-border p-3"
              key={`${item.product_id || "baru"}-${indeks}`}
            >
              <label className="flex flex-col gap-1 text-xs text-muted">
                Produk
                <select
                  className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm text-ink"
                  value={item.product_id}
                  onChange={(event) => ubahItem(indeks, { product_id: event.target.value })}
                >
                  <option value="">Pilih produk</option>
                  {(products.data ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.nama} · {formatRupiah(product.harga_jual)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
                  Jumlah
                  <Input
                    min={1}
                    type="number"
                    value={item.qty}
                    onChange={(event) => ubahItem(indeks, { qty: event.target.value })}
                  />
                </label>
                <Button
                  aria-label={`Hapus item ${indeks + 1}`}
                  size="icon"
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    ubah(
                      "items",
                      form.items.filter((_, posisi) => posisi !== indeks),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted">
                Harga: {formatRupiah(hargaProduk(item.product_id))} / item
              </p>
            </div>
          ))
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Ringkasan</h2>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ongkir">Ongkos kirim</Label>
          <Input
            id="ongkir"
            inputMode="numeric"
            value={form.ongkir}
            onChange={(event) => ubah("ongkir", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="dp">DP yang disebut pembeli</Label>
          <Input
            id="dp"
            inputMode="numeric"
            value={form.dp}
            onChange={(event) => ubah("dp", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="catatan">Catatan</Label>
          <Textarea
            id="catatan"
            placeholder="Catatan packing atau pengiriman"
            value={form.catatan}
            onChange={(event) => ubah("catatan", event.target.value)}
          />
        </div>
        <div className="flex justify-between text-sm text-muted">
          <span>Subtotal produk</span>
          <span className="tabular-nums">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted">
          <span>Ongkos kirim</span>
          <span className="tabular-nums">{formatRupiah(ongkir)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{formatRupiah(total)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-warning">
          <span>Sisa tagihan</span>
          <span className="tabular-nums">{formatRupiah(sisa)}</span>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <Button disabled={busy} type="button" onClick={() => void konfirmasi()}>
        {busy ? "Menyimpan..." : "Konfirmasi & simpan pesanan"}
      </Button>
    </main>
  );
}
