import type { Json } from "@gerailo/supabase/types";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";

import {
  createManualOrderSchema,
  formatRupiah,
  moneyAdd,
  moneyMultiply,
  parseRupiah,
  type MetodeBayar,
} from "@gerailo/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import { rpcAmount } from "@/lib/rpc-amount";
import { supabase } from "@/lib/supabase";

const METODE_OPSI: MetodeBayar[] = ["TRANSFER", "COD", "QRIS", "LAINNYA"];

type ItemForm = {
  kunci: number;
  product_id: string;
  qty: string;
  harga_satuan: string;
};

function itemKosong(kunci: number): ItemForm {
  return { kunci, product_id: "", qty: "1", harga_satuan: "0" };
}

function pesanError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Gagal menyimpan order. Coba lagi.";
}

export function OrderNewPage() {
  const navigate = useNavigate();
  const { business, isPending, error: businessError } = usePrimaryBusiness();
  const products = useProducts(business?.id);
  const [form, setForm] = useState({
    nama: "",
    telepon: "",
    alamat: "",
    catatan: "",
    ongkir: "0",
    dp: "0",
    due_date: "",
    metode_bayar: ["TRANSFER"] as MetodeBayar[],
  });
  const [items, setItems] = useState<ItemForm[]>([itemKosong(1)]);
  const [busy, setBusy] = useState(false);
  const [galat, setGalat] = useState("");
  const [kunciBerikut, setKunciBerikut] = useState(2);

  if (isPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (businessError) {
    return (
      <p role="alert" className="p-6 text-sm font-medium text-danger">
        Gagal memuat data usaha. Coba muat ulang halaman.
      </p>
    );
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const produkAktif = (products.data ?? []).filter((product) => product.aktif);

  function ubahItem(kunci: number, perubahan: Partial<ItemForm>) {
    setItems(( nilai ) =>
      nilai.map((item) => (item.kunci === kunci ? { ...item, ...perubahan } : item)),
    );
  }

  function pilihProduk(kunci: number, productId: string) {
    const produk = produkAktif.find((item) => item.id === productId);
    ubahItem(kunci, {
      product_id: productId,
      harga_satuan: produk?.harga_jual ?? "0",
    });
  }

  function toggleMetode(metode: MetodeBayar) {
    setForm((nilai) => ({
      ...nilai,
      metode_bayar: nilai.metode_bayar.includes(metode)
        ? nilai.metode_bayar.filter((item) => item !== metode)
        : [...nilai.metode_bayar, metode],
    }));
  }

  const subtotal = moneyAdd(
    0n,
    ...items.map((item) => {
      try {
        return moneyMultiply(item.harga_satuan || "0", Number(item.qty) || 0);
      } catch {
        return 0n;
      }
    }),
  );
  const total = (() => {
    try {
      return moneyAdd(subtotal, form.ongkir || "0");
    } catch {
      return subtotal;
    }
  })();

  async function simpan() {
    setBusy(true);
    setGalat("");

    try {
      const data = createManualOrderSchema.parse({
        nama: form.nama,
        telepon: form.telepon,
        alamat: form.alamat || undefined,
        catatan: form.catatan || undefined,
        ongkir: form.ongkir,
        dp: form.dp,
        due_date: form.due_date || undefined,
        metode_bayar: form.metode_bayar,
        items: items.map((item) => ({
          product_id: item.product_id,
          qty: item.qty,
          harga_satuan: item.harga_satuan,
        })),
      });

      const args = {
        p_items: data.items.map((item) => ({
          product_id: item.product_id,
          qty: item.qty,
          harga_satuan: rpcAmount(parseRupiah(item.harga_satuan)),
        })),
        p_ongkir: rpcAmount(parseRupiah(data.ongkir)),
        p_dp: rpcAmount(parseRupiah(data.dp)),
        p_nama: data.nama,
        p_telepon: data.telepon,
        ...(data.alamat ? { p_alamat: data.alamat } : {}),
        ...(data.catatan ? { p_catatan: data.catatan } : {}),
        p_metode_bayar: data.metode_bayar,
        ...(data.due_date
          ? { p_due_date: `${data.due_date}T23:59:59+07:00` }
          : {}),
      } as unknown as {
        p_items: Json;
        p_ongkir: number;
        p_dp: number;
        p_nama: string;
        p_telepon: string;
        p_alamat?: string;
        p_catatan?: string;
        p_metode_bayar: string[];
        p_due_date?: string;
      };

      const { data: orderId, error } = await supabase.rpc(
        "create_manual_order",
        args,
      );

      if (error) {
        throw error;
      }

      navigate(`/orders/${orderId}`);
    } catch (error) {
      setGalat(pesanError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/orders">
          ← Daftar pesanan
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Order manual</h1>
        <p className="text-sm text-muted">
          Harga di form ini boleh beda dari katalog
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">Pelanggan</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Nama</span>
            <Input
              value={form.nama}
              onChange={(event) => setForm((value) => ({ ...value, nama: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Telepon</span>
            <Input
              inputMode="tel"
              value={form.telepon}
              onChange={(event) => setForm((value) => ({ ...value, telepon: event.target.value }))}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Alamat (opsional)</span>
          <Input
            value={form.alamat}
            onChange={(event) => setForm((value) => ({ ...value, alamat: event.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Catatan (opsional)</span>
          <Textarea
            value={form.catatan}
            onChange={(event) => setForm((value) => ({ ...value, catatan: event.target.value }))}
          />
        </label>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">Item</p>
        {items.map((item) => (
          <div key={item.kunci} className="flex flex-col gap-2 rounded-control border border-border p-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Produk</span>
              <Select
                value={item.product_id}
                onChange={(event) => pilihProduk(item.kunci, event.target.value)}
              >
                <option value="">Pilih produk</option>
                {produkAktif.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nama}
                  </option>
                ))}
              </Select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Jumlah</span>
                <Input
                  inputMode="numeric"
                  value={item.qty}
                  onChange={(event) => ubahItem(item.kunci, { qty: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Harga satuan</span>
                <Input
                  inputMode="numeric"
                  value={item.harga_satuan}
                  onChange={(event) =>
                    ubahItem(item.kunci, { harga_satuan: event.target.value })
                  }
                />
              </label>
            </div>
            {items.length > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setItems((nilai) => nilai.filter((row) => row.kunci !== item.kunci))}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Hapus item
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setItems((nilai) => [...nilai, itemKosong(kunciBerikut)]);
            setKunciBerikut((nilai) => nilai + 1);
          }}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Tambah item
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">Pembayaran</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Ongkir</span>
            <Input
              inputMode="numeric"
              value={form.ongkir}
              onChange={(event) => setForm((value) => ({ ...value, ongkir: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">DP</span>
            <Input
              inputMode="numeric"
              value={form.dp}
              onChange={(event) => setForm((value) => ({ ...value, dp: event.target.value }))}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Batas pelunasan (opsional)</span>
          <Input
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((value) => ({ ...value, due_date: event.target.value }))}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Metode bayar</span>
          <div className="flex flex-wrap gap-2">
            {METODE_OPSI.map((metode) => (
              <label key={metode} className="flex min-h-9 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.metode_bayar.includes(metode)}
                  onChange={() => toggleMetode(metode)}
                />
                {metode}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{formatRupiah(total)}</span>
        </div>
      </Card>

      <Button type="button" disabled={busy} onClick={() => void simpan()}>
        Simpan order DRAFT
      </Button>

      {galat ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {galat}
        </p>
      ) : null}
    </main>
  );
}
