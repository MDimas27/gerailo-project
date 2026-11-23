import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import {
  formatRupiah,
  parseAliasInput,
  parseRupiah,
  productFormSchema,
  type ProductFormInput,
} from "@gerailo/shared";

import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProduct } from "@/hooks/use-product";
import { supabase } from "@/lib/supabase";

function emptyValues(): ProductFormInput {
  return {
    nama: "",
    harga_jual: "",
    stok_min: 0,
    aliases: "",
    stok_awal: 0,
    harga_beli: "",
    variants: [],
  };
}

function mapProductError(message: string): string {
  if (message.includes("PRODUK_QUOTA_TERLAMPAUI")) {
    return "Kuota paket FREE habis (100 produk aktif). Upgrade ke STARTER untuk 500 produk.";
  }

  if (message.includes("ALIAS_DUPLIKAT")) {
    return "Alias sudah dipakai produk lain. Gunakan alias yang berbeda.";
  }

  if (message.includes("HARGA_TIDAK_VALID")) {
    return "Harga jual harus lebih dari 0.";
  }

  if (message.includes("AUTH_REQUIRED") || message.includes("USAHA_TIDAK_DITEMUKAN")) {
    return "Sesi atau usaha tidak valid. Coba masuk ulang.";
  }

  return "Gagal menyimpan produk. Coba lagi sebentar.";
}

function formatMoneyInput(value: string): string {
  try {
    return formatRupiah(value);
  } catch {
    return value;
  }
}

export function ProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const product = useProduct(mode === "edit" ? id : undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ProductFormInput>({
    defaultValues: emptyValues(),
  });

  const variants = useFieldArray({
    control,
    name: "variants",
    keyName: "key",
  });

  useEffect(() => {
    if (mode !== "edit" || !product.data) {
      return;
    }

    reset({
      nama: product.data.nama,
      harga_jual: formatRupiah(product.data.harga_jual),
      stok_min: product.data.stok_min,
      aliases: product.data.aliases.map((alias) => alias.alias).join(", "),
      stok_awal: 0,
      harga_beli: "",
      variants: product.data.variants.map((variant) => ({
        id: variant.id,
        nama: variant.nama,
        selisih_harga: formatRupiah(variant.selisih_harga),
      })),
    });
  }, [mode, product.data, reset]);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  if (mode === "edit" && product.isPending) {
    return <p className="p-6 text-sm text-muted">Memuat produk...</p>;
  }

  if (mode === "edit" && (product.error || !product.data)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 px-5 py-8">
        <p role="alert" className="text-sm font-medium text-danger">
          Produk tidak ditemukan atau bukan milik usahamu.
        </p>
        <Link className="text-sm font-semibold text-primary" to="/products">
          Kembali ke daftar produk
        </Link>
      </main>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setCreatedProductId(null);

    const parsed = productFormSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (
          field === "nama" ||
          field === "harga_jual" ||
          field === "stok_min" ||
          field === "aliases" ||
          field === "stok_awal" ||
          field === "harga_beli"
        ) {
          setError(field, { message: issue.message });
        }
      }

      setFormError("Periksa kembali data produk.");
      return;
    }

    const input = parsed.data;
    const hargaJual = parseRupiah(input.harga_jual);
    const hargaBeli = input.harga_beli === "" ? null : parseRupiah(input.harga_beli);
    const aliases = parseAliasInput(input.aliases);

    setBusy(true);

    try {
      if (mode === "create") {
        const { data: productId, error } = await supabase.rpc("create_product", {
          p_business_id: business.id,
          p_nama: input.nama,
          p_harga_jual: hargaJual.toString() as unknown as number,
          p_stok_min: input.stok_min,
          p_aliases: aliases,
          p_stok_awal: input.stok_awal,
          p_harga_beli:
            hargaBeli === null
              ? undefined
              : (hargaBeli.toString() as unknown as number),
        });

        if (error) {
          setFormError(mapProductError(`${error.message} ${error.details ?? ""}`));
          return;
        }

        const rows = input.variants.map((variant) => ({
          business_id: business.id,
          product_id: productId,
          nama: variant.nama,
          selisih_harga: parseRupiah(
            variant.selisih_harga === "" ? "0" : variant.selisih_harga,
          ).toString() as unknown as number,
        }));

        if (rows.length > 0) {
          const { error: variantError } = await supabase
            .from("product_variants")
            .insert(rows);

          if (variantError) {
            setCreatedProductId(productId);
            setFormError(
              "Produk tersimpan, tetapi varian gagal disimpan. Buka edit produk untuk melengkapi.",
            );
            return;
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["products"] });
        navigate("/products", { replace: true });
        return;
      }

      if (!product.data) {
        return;
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          nama: input.nama,
          harga_jual: hargaJual.toString() as unknown as number,
          stok_min: input.stok_min,
        })
        .eq("id", product.data.id);

      if (updateError) {
        setFormError(mapProductError(updateError.message));
        return;
      }

      const currentAliases = new Map(
        product.data.aliases.map((alias) => [alias.alias.toLowerCase(), alias]),
      );
      const nextAliases = new Set(aliases.map((alias) => alias.toLowerCase()));
      const aliasesToInsert = aliases.filter(
        (alias) => !currentAliases.has(alias.toLowerCase()),
      );
      const aliasesToDelete = product.data.aliases.filter(
        (alias) => !nextAliases.has(alias.alias.toLowerCase()),
      );

      if (aliasesToInsert.length > 0) {
        const { error: aliasError } = await supabase
          .from("product_aliases")
          .insert(
            aliasesToInsert.map((alias) => ({
              business_id: business.id,
              product_id: product.data.id,
              alias,
            })),
          );

        if (aliasError) {
          setFormError(mapProductError(aliasError.message));
          return;
        }
      }

      if (aliasesToDelete.length > 0) {
        const { error: deleteAliasError } = await supabase
          .from("product_aliases")
          .delete()
          .in(
            "id",
            aliasesToDelete.map((alias) => alias.id),
          );

        if (deleteAliasError) {
          setFormError(mapProductError(deleteAliasError.message));
          return;
        }
      }

      const nextVariantIds = new Set(
        input.variants
          .map((variant) => variant.id)
          .filter((variantId): variantId is string => Boolean(variantId)),
      );

      const variantRows = input.variants.map((variant) => ({
        id: variant.id,
        business_id: business.id,
        product_id: product.data.id,
        nama: variant.nama,
        selisih_harga: parseRupiah(
          variant.selisih_harga === "" ? "0" : variant.selisih_harga,
        ).toString() as unknown as number,
      }));

      for (const row of variantRows) {
        if (row.id) {
          const { error: variantError } = await supabase
            .from("product_variants")
            .update({
              nama: row.nama,
              selisih_harga: row.selisih_harga,
              aktif: true,
            })
            .eq("id", row.id);

          if (variantError) {
            setFormError(mapProductError(variantError.message));
            return;
          }
        } else {
          const { error: variantError } = await supabase
            .from("product_variants")
            .insert({
              business_id: row.business_id,
              product_id: row.product_id,
              nama: row.nama,
              selisih_harga: row.selisih_harga,
            });

          if (variantError) {
            setFormError(mapProductError(variantError.message));
            return;
          }
        }
      }

      const removedVariantIds = product.data.variants
        .map((variant) => variant.id)
        .filter((variantId) => !nextVariantIds.has(variantId));

      if (removedVariantIds.length > 0) {
        const { error: archiveVariantError } = await supabase
          .from("product_variants")
          .update({ aktif: false })
          .in("id", removedVariantIds);

        if (archiveVariantError) {
          setFormError(mapProductError(archiveVariantError.message));
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product.data.id] });
      navigate("/products", { replace: true });
    } finally {
      setBusy(false);
    }
  });

  const archiveProduct = async () => {
    if (!product.data) {
      return;
    }

    if (!window.confirm("Arsipkan produk ini? Produk tidak muncul di daftar aktif.")) {
      return;
    }

    setBusy(true);
    const { error: archiveError } = await supabase
      .from("products")
      .update({ aktif: false })
      .eq("id", product.data.id);
    setBusy(false);

    if (archiveError) {
      setFormError(mapProductError(archiveError.message));
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["products"] });
    navigate("/products", { replace: true });
  };

  const reactivateProduct = async () => {
    if (!product.data) {
      return;
    }

    setBusy(true);
    const { error: reactivateError } = await supabase
      .from("products")
      .update({ aktif: true })
      .eq("id", product.data.id);
    setBusy(false);

    if (reactivateError) {
      setFormError(mapProductError(reactivateError.message));
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["product", product.data.id] });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/products">
          ← Katalog produk
        </Link>
        <h1 className="text-2xl font-semibold text-ink">
          {mode === "create" ? "Tambah produk" : "Edit produk"}
        </h1>
        <p className="text-sm text-muted">
          Harga disimpan sebagai rupiah bulat. Stok awal dicatat sebagai pergerakan MASUK.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Card className="flex flex-col gap-4">
          <Label>
            Nama produk
            <Input
              autoComplete="off"
              placeholder="Contoh: Sambal Cumi Pedas 200g"
              {...register("nama")}
            />
            <FieldError>{errors.nama?.message}</FieldError>
          </Label>

          <Label>
            Harga jual
            <Input
              inputMode="numeric"
              placeholder="15000"
              {...register("harga_jual", {
                onBlur: (event) =>
                  setValue("harga_jual", formatMoneyInput(event.target.value)),
              })}
            />
            <FieldError>{errors.harga_jual?.message}</FieldError>
          </Label>

          <Label>
            Stok minimum (untuk peringatan menipis)
            <Input
              inputMode="numeric"
              min={0}
              type="number"
              {...register("stok_min")}
            />
            <FieldError>{errors.stok_min?.message}</FieldError>
          </Label>

          <Label>
            Nama lain yang sering dipakai pembeli (opsional)
            <Input placeholder="daster jmb, DJ bunga" {...register("aliases")} />
            <p className="text-xs font-normal text-muted">
              Isi yang paling sering muncul saja, tidak harus semua. Contoh: daster jmb, DJ
              bunga. Pisahkan dengan koma.
            </p>
            <FieldError>{errors.aliases?.message}</FieldError>
          </Label>

          {mode === "create" ? (
            <>
              <Label>
                Stok awal (opsional)
                <Input
                  inputMode="numeric"
                  min={0}
                  type="number"
                  {...register("stok_awal")}
                />
                <FieldError>{errors.stok_awal?.message}</FieldError>
              </Label>

              <Label>
                Harga beli per unit (opsional, untuk HPP nanti)
                <Input
                  inputMode="numeric"
                  placeholder="8000"
                  {...register("harga_beli", {
                    onBlur: (event) =>
                      setValue("harga_beli", formatMoneyInput(event.target.value)),
                  })}
                />
                <FieldError>{errors.harga_beli?.message}</FieldError>
              </Label>
            </>
          ) : (
            <div className="rounded-control bg-background px-3 py-2 text-sm text-muted">
              Stok saat ini:{" "}
              <span className="font-semibold tabular-nums text-ink">
                {product.data?.saldo.toString() ?? "0"}
              </span>
              . Perubahan stok lewat penyesuaian stok (M5), bukan edit produk.
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Varian (opsional)</h2>
              <p className="text-xs text-muted">
                Nama varian + selisih harga, mis. "L" +2.000.
              </p>
            </div>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() =>
                variants.append({ nama: "", selisih_harga: "0" })
              }
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Varian
            </Button>
          </div>

          {variants.fields.length === 0 ? (
            <p className="text-xs text-muted">Belum ada varian.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {variants.fields.map((field, index) => (
                <div className="grid grid-cols-[1fr_7rem_auto] items-end gap-2" key={field.key}>
                  <Label className="text-xs">
                    Nama
                    <Input
                      className="min-h-10"
                      placeholder="L"
                      {...register(`variants.${index}.nama`)}
                    />
                  </Label>
                  <Label className="text-xs">
                    Selisih
                    <Input
                      className="min-h-10"
                      inputMode="numeric"
                      placeholder="2000"
                      {...register(`variants.${index}.selisih_harga`)}
                    />
                  </Label>
                  <Button
                    aria-label="Hapus varian"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => variants.remove(index)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {formError ? (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {formError}
          </p>
        ) : null}

        {createdProductId ? (
          <Link
            className="text-sm font-semibold text-primary"
            to={`/products/${createdProductId}/edit`}
          >
            Buka edit produk untuk melengkapi varian
          </Link>
        ) : null}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} type="submit">
            {busy ? "Menyimpan..." : "Simpan produk"}
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-ink"
            to="/products"
          >
            Batal
          </Link>
        </div>
      </form>

      {mode === "edit" && product.data ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Status produk</h2>
          <p className="text-xs text-muted">
            {product.data.aktif
              ? "Produk aktif dan bisa dipakai di pesanan."
              : "Produk diarsipkan; histori pesanan tetap menyimpan namanya."}
          </p>
          {product.data.aktif ? (
            <Button
              className="self-start"
              disabled={busy}
              type="button"
              variant="danger"
              onClick={() => void archiveProduct()}
            >
              Arsipkan produk
            </Button>
          ) : (
            <Button
              className="self-start"
              disabled={busy}
              type="button"
              variant="secondary"
              onClick={() => void reactivateProduct()}
            >
              Aktifkan lagi
            </Button>
          )}
        </Card>
      ) : null}
    </main>
  );
}
