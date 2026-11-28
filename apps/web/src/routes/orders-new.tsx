import type { Json } from "@gerailo/supabase/types";
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Plus, Trash2 } from "lucide-react";

import {
  createManualOrderSchema,
  formatRupiah,
  moneyAdd,
  moneyMultiply,
  parseRupiah,
  labelPelangganArsip,
  saringPelangganArsip,
  type MetodeBayar,
} from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/use-customers";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import { fieldErrorsFrom, pesanAksi } from "@/lib/form-error";
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

export function OrderNewPage() {
  const navigate = useNavigate();
  const { business, isPending, error: businessError } = usePrimaryBusiness();
  const products = useProducts(business?.id);
  const customers = useCustomers(business?.id);
  const [tampilkanArsipPelanggan, setTampilkanArsipPelanggan] = useState(false);
  const [pelangganDipilih, setPelangganDipilih] = useState<string | null>(null);
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
  const [galatField, setGalatField] = useState<Record<string, string>>({});
  const [kunciBerikut, setKunciBerikut] = useState(2);

  const saranPelanggan = useMemo(() => {
    const namaNeedle = form.nama.trim().toLowerCase();
    const teleponNeedle = form.telepon.replace(/\D/g, "");

    if (namaNeedle.length < 2 && teleponNeedle.length < 3) {
      return [];
    }

    return saringPelangganArsip(customers.data ?? [], tampilkanArsipPelanggan)
      .filter(
        (row) =>
          (namaNeedle.length >= 2 &&
            row.nama.toLowerCase().includes(namaNeedle)) ||
          (teleponNeedle.length >= 3 && row.telepon.includes(teleponNeedle)),
      )
      .slice(0, 5);
  }, [customers.data, form.nama, form.telepon, tampilkanArsipPelanggan]);

  const pelangganTerpilih =
    (customers.data ?? []).find((row) => row.id === pelangganDipilih) ?? null;

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
    setGalatField({});

    try {
      const hasilValidasi = createManualOrderSchema.safeParse({
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

      if (!hasilValidasi.success) {
        setGalatField(fieldErrorsFrom(hasilValidasi.error));
        setGalat("Periksa kembali data order.");
        return;
      }

      const data = hasilValidasi.data;
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
        setGalat(pesanAksi(error, "Gagal menyimpan order. Coba lagi."));
        return;
      }

      navigate(`/orders/${orderId}`);
    } catch (error) {
      setGalat(pesanAksi(error, "Gagal menyimpan order. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/orders">
          â† Daftar pesanan
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
            <FieldError>{galatField.nama}</FieldError>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Telepon</span>
            <Input
              inputMode="tel"
              value={form.telepon}
              onChange={(event) => setForm((value) => ({ ...value, telepon: event.target.value }))}
            />
            <FieldError>{galatField.telepon}</FieldError>
          </label>
        </div>

        <div className="rounded-control border border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted">
              Pilih pelanggan lama
            </p>
            <label className="flex items-center gap-1 text-[11px] text-muted">
              <input
                checked={tampilkanArsipPelanggan}
                className="size-3.5 rounded border-border text-primary"
                type="checkbox"
                onChange={(event) =>
                  setTampilkanArsipPelanggan(event.target.checked)
                }
              />
              Tampilkan arsip
            </label>
          </div>

          {saranPelanggan.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted">
              Ketik nama (≥2 huruf) atau telepon (≥3 angka).
            </p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1">
              {saranPelanggan.map((row) => (
                <li key={row.id}>
                  <button
                    className="flex w-full items-center justify-between gap-2 rounded-control px-2 py-1 text-left hover:bg-background"
                    type="button"
                    onClick={() => {
                      setForm((value) => ({
                        ...value,
                        nama: row.nama,
                        telepon: row.telepon,
                        alamat: row.alamat ?? value.alamat,
                      }));
                      setPelangganDipilih(row.id);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">
                        {row.nama}
                      </span>
                      <span className="block text-[11px] tabular-nums text-muted">
                        {row.telepon}
                      </span>
                    </span>
                    {!row.aktif ? (
                      <Badge variant="warning">
                        {labelPelangganArsip(row.aktif)}
                      </Badge>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pelangganTerpilih && !pelangganTerpilih.aktif ? (
            <p className="mt-1 text-[11px] text-warning">
              Pelanggan ini diarsipkan; order tetap terhubung.{" "}
              <Link
                className="font-semibold underline"
                to={`/customers/${pelangganTerpilih.id}`}
              >
                Aktifkan lagi
              </Link>
            </p>
          ) : null}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Alamat (opsional)</span>
          <Input
            value={form.alamat}
            onChange={(event) => setForm((value) => ({ ...value, alamat: event.target.value }))}
          />
          <FieldError>{galatField.alamat}</FieldError>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Catatan (opsional)</span>
          <Textarea
            value={form.catatan}
            onChange={(event) => setForm((value) => ({ ...value, catatan: event.target.value }))}
          />
          <FieldError>{galatField.catatan}</FieldError>
        </label>
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm font-semibold text-ink">Item</p>
        {items.map((item, indeks) => (
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
              <FieldError>{galatField[`items.${indeks}.product_id`]}</FieldError>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Jumlah</span>
                <Input
                  inputMode="numeric"
                  value={item.qty}
                  onChange={(event) => ubahItem(item.kunci, { qty: event.target.value })}
                />
                <FieldError>{galatField[`items.${indeks}.qty`]}</FieldError>
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
                <FieldError>{galatField[`items.${indeks}.harga_satuan`]}</FieldError>
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
            <FieldError>{galatField.ongkir}</FieldError>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">DP</span>
            <Input
              inputMode="numeric"
              value={form.dp}
              onChange={(event) => setForm((value) => ({ ...value, dp: event.target.value }))}
            />
            <FieldError>{galatField.dp}</FieldError>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Batas pelunasan (opsional)</span>
          <Input
            type="date"
            value={form.due_date}
            onChange={(event) => setForm((value) => ({ ...value, due_date: event.target.value }))}
          />
          <FieldError>{galatField.due_date}</FieldError>
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
          <FieldError>{galatField.metode_bayar}</FieldError>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{formatRupiah(total)}</span>
        </div>
      </Card>

      <Button type="button" disabled={busy} onClick={() => void simpan()}>
        Simpan pesanan
      </Button>

      {galat ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {galat}
        </p>
      ) : null}
    </main>
  );
}
