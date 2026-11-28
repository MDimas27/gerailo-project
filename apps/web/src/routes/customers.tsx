import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Plus, Search } from "lucide-react";

import { labelPelangganArsip, saringPelangganArsip } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useCustomers, useUpsertCustomer } from "@/hooks/use-customers";
import { pesanAksi } from "@/lib/form-error";

export function CustomersPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const customers = useCustomers(business?.id);
  const upsert = useUpsertCustomer();
  const [search, setSearch] = useState("");
  const [tampilkanArsip, setTampilkanArsip] = useState(false);
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    telepon: "",
    alamat: "",
    catatan: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const tersaring = saringPelangganArsip(customers.data ?? [], tampilkanArsip);

    if (needle === "") {
      return tersaring;
    }

    return tersaring.filter(
      (row) =>
        row.nama.toLowerCase().includes(needle) ||
        row.telepon.includes(needle.replace(/\D/g, "")),
    );
  }, [customers.data, search, tampilkanArsip]);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const simpan = async () => {
    setError(null);
    setFieldError({});

    if (form.nama.trim() === "") {
      setFieldError({ nama: "Nama wajib diisi" });
      return;
    }

    if (form.telepon.trim() === "") {
      setFieldError({ telepon: "Telepon wajib diisi" });
      return;
    }

    try {
      await upsert.mutateAsync(form);
      setForm({ nama: "", telepon: "", alamat: "", catatan: "" });
      setFormTerbuka(false);
    } catch (galat) {
      setError(pesanAksi(galat, "Gagal menyimpan pelanggan."));
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link className="text-xs font-semibold text-primary" to="/">
            ← Beranda
          </Link>
          <h1 className="text-2xl font-semibold text-ink">Pelanggan</h1>
          <p className="text-sm text-muted">
            Pilih pelanggan lama lebih cepat; histori & statistik otomatis.
          </p>
        </div>
        <Button
          className="shrink-0"
          type="button"
          onClick={() => setFormTerbuka((nilai) => !nilai)}
        >
          <Plus aria-hidden="true" className="size-4" />
          Tambah
        </Button>
      </div>

      {formTerbuka ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink">Pelanggan baru</h2>
          <Label>
            Nama
            <Input
              value={form.nama}
              onChange={(event) =>
                setForm((nilai) => ({ ...nilai, nama: event.target.value }))
              }
            />
            <FieldError>{fieldError.nama}</FieldError>
          </Label>
          <Label>
            Telepon (08… / +62…)
            <Input
              inputMode="tel"
              value={form.telepon}
              onChange={(event) =>
                setForm((nilai) => ({ ...nilai, telepon: event.target.value }))
              }
            />
            <FieldError>{fieldError.telepon}</FieldError>
          </Label>
          <Label>
            Alamat (opsional)
            <Input
              value={form.alamat}
              onChange={(event) =>
                setForm((nilai) => ({ ...nilai, alamat: event.target.value }))
              }
            />
          </Label>
          <Label>
            Catatan (opsional)
            <Textarea
              value={form.catatan}
              onChange={(event) =>
                setForm((nilai) => ({ ...nilai, catatan: event.target.value }))
              }
            />
          </Label>
          {error ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={upsert.isPending}
              type="button"
              onClick={() => void simpan()}
            >
              {upsert.isPending ? "Menyimpan..." : "Simpan pelanggan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormTerbuka(false)}
            >
              Batal
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="relative">
          <span className="sr-only">Cari pelanggan</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            className="pl-9"
            placeholder="Cari nama atau telepon..."
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            checked={tampilkanArsip}
            className="size-4 rounded border-border text-primary"
            type="checkbox"
            onChange={(event) => setTampilkanArsip(event.target.checked)}
          />
          Tampilkan pelanggan diarsipkan
        </label>
      </div>

      {customers.isPending ? (
        <p className="text-sm text-muted">Memuat pelanggan...</p>
      ) : customers.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat pelanggan.
        </p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <h2 className="text-base font-semibold text-ink">
            {search ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pelanggan otomatis dibuat saat order/Smart Paste, atau tambah manual.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((row) => (
            <Card className="flex flex-col gap-1" key={row.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {row.nama}
                </h2>
                <Badge variant={row.aktif ? "success" : "warning"}>
                  {labelPelangganArsip(row.aktif)}
                </Badge>
              </div>
              <p className="text-xs tabular-nums text-muted">{row.telepon}</p>
              {row.alamat ? (
                <p className="line-clamp-1 text-xs text-muted">{row.alamat}</p>
              ) : null}
              <Link
                className="mt-2 inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink"
                to={`/customers/${row.id}`}
              >
                Lihat profil
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
