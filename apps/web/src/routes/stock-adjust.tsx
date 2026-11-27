import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router";

import {
  deriveT8Prefill,
  formatHppLabel,
  formatRupiah,
  parseRupiah,
  stockMoveFormSchema,
} from "@gerailo/shared";

import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrorsFrom, pesanAksi } from "@/lib/form-error";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useRecordStockMove, useStockOverview } from "@/hooks/use-stock";

type FormState = {
  product_id: string;
  jenis: "MASUK" | "PENYESUAIAN";
  qty: string;
  harga_beli: string;
  alasan: string;
};

export function StockAdjustPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const overview = useStockOverview(business?.id);
  const recordMove = useRecordStockMove();
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get("product") ?? "";

  const [form, setForm] = useState<FormState>({
    product_id: initialProduct,
    jenis: "MASUK",
    qty: "",
    harga_beli: "",
    alasan: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const products = useMemo(
    () => (overview.data?.products ?? []).filter((product) => product.aktif),
    [overview.data?.products],
  );

  const selected = products.find((product) => product.id === form.product_id);
  const prefill = useMemo(() => {
    if (!selected) {
      return null;
    }

    return deriveT8Prefill(
      (overview.data?.movements ?? []).filter(
        (movement) => movement.product_id === selected.id,
      ),
    );
  }, [overview.data?.movements, selected]);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const update = (patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSuccess(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    setFieldErrors({});

    const parsed = stockMoveFormSchema.safeParse(form);

    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error));
      setFormError("Periksa kembali data stok.");
      return;
    }

    const input = parsed.data;
    const hargaBeli =
      input.jenis === "MASUK" && input.harga_beli !== ""
        ? parseRupiah(input.harga_beli)
        : null;

    try {
      await recordMove.mutateAsync({
        productId: input.product_id,
        jenis: input.jenis,
        qty: input.qty,
        hargaBeli,
        alasan: input.alasan,
      });

      setSuccess(
        input.jenis === "MASUK"
          ? "Stok masuk tersimpan. Saldo dan HPP rata-rata sudah diperbarui."
          : "Penyesuaian tersimpan. Saldo stok sudah diperbarui.",
      );
      setForm((current) => ({
        ...current,
        qty: "",
        harga_beli: "",
        alasan: "",
      }));
    } catch (error) {
      setFormError(pesanAksi(error, "Gagal menyimpan stok. Coba lagi."));
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/stock">
          ← Stok produk
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Catat stok</h1>
        <p className="text-sm text-muted">
          Tambah pasokan masuk atau sesuaikan stok lewat opname. Stok tidak pernah
          diedit langsung.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Card className="flex flex-col gap-4">
          <Label>
            Produk
            <Select
              value={form.product_id}
              onChange={(event) => update({ product_id: event.target.value })}
            >
              <option value="">Pilih produk</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nama}
                </option>
              ))}
            </Select>
            <FieldError>{fieldErrors.product_id}</FieldError>
          </Label>

          {selected ? (
            <div className="rounded-control bg-background px-3 py-2 text-xs text-muted">
              <p>
                Saldo saat ini:{" "}
                <span className="font-semibold tabular-nums text-ink">
                  {selected.saldo.toString()} pcs
                </span>
              </p>
              <p>
                HPP rata-rata:{" "}
                <span className="font-semibold tabular-nums text-ink">
                  {formatHppLabel(selected.hpp_rata_rata)}
                </span>
              </p>
            </div>
          ) : null}

          <Label>
            Jenis
            <Select
              value={form.jenis}
              onChange={(event) =>
                update({ jenis: event.target.value as FormState["jenis"] })
              }
            >
              <option value="MASUK">Tambah stok (pembelian/pasokan)</option>
              <option value="PENYESUAIAN">Penyesuaian opname</option>
            </Select>
            <FieldError>{fieldErrors.jenis}</FieldError>
          </Label>

          <Label>
            Jumlah (pcs)
            <Input
              inputMode="numeric"
              placeholder={form.jenis === "PENYESUAIAN" ? "-2" : "10"}
              type="number"
              value={form.qty}
              onChange={(event) => update({ qty: event.target.value })}
            />
            <p className="text-xs font-normal text-muted">
              {form.jenis === "PENYESUAIAN"
                ? "Gunakan minus untuk mengurangi stok. Penyesuaian yang membuat saldo minus akan ditolak."
                : "Jumlah barang yang masuk."}
            </p>
            <FieldError>{fieldErrors.qty}</FieldError>
          </Label>

          {form.jenis === "MASUK" ? (
            <Label>
              Harga beli per unit (opsional)
              <Input
                inputMode="numeric"
                placeholder="10000"
                value={form.harga_beli}
                onChange={(event) => update({ harga_beli: event.target.value })}
              />
              <p className="text-xs font-normal text-muted">
                Kosongkan bila belum tahu harga beli. HPP tidak berubah dan
                ditampilkan "HPP belum di-set".
              </p>
              <FieldError>{fieldErrors.harga_beli}</FieldError>
            </Label>
          ) : null}

          <Label>
            Alasan (wajib)
            <Textarea
              placeholder={
                form.jenis === "MASUK"
                  ? "Contoh: restock dari supplier"
                  : "Contoh: barang rusak saat opname"
              }
              value={form.alasan}
              onChange={(event) => update({ alasan: event.target.value })}
            />
            <FieldError>{fieldErrors.alasan}</FieldError>
          </Label>
        </Card>

        {prefill ? (
          <Card className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-ink">
              Data jurnal pembelian (T8)
            </h2>
            <p className="text-xs tabular-nums text-muted">
              Masuk terakhir: {prefill.qty.toString()} pcs @{" "}
              {formatRupiah(prefill.hargaBeli)} = {formatRupiah(prefill.total)}
            </p>
            <p className="text-xs text-muted">
              Jurnal T8 dicatat manual. Bila tidak dicatat atau diedit, nilai
              persediaan di jurnal bisa berbeda dari stok fisik.
            </p>
          </Card>
        ) : null}

        {formError ? (
          <p
            className="rounded-control bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {success ? (
          <p
            className="rounded-control bg-primary-soft px-3 py-2 text-sm font-medium text-success"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={recordMove.isPending}
            type="submit"
          >
            {recordMove.isPending ? "Menyimpan..." : "Simpan stok"}
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-ink"
            to="/stock"
          >
            Kembali
          </Link>
        </div>
      </form>
    </main>
  );
}
