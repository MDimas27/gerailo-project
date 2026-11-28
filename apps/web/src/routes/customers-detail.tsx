import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { formatRupiah, labelPelangganArsip } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import {
  statistikDariOrders,
  useCustomer,
  useCustomerOrders,
  useHapusCustomer,
  useSetCustomerAktif,
  useUpdateCustomer,
} from "@/hooks/use-customers";
import { pesanAksi } from "@/lib/form-error";
import { labelStatus } from "@/lib/order-presentation";

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const customer = useCustomer(id);
  const orders = useCustomerOrders(business?.id, id);
  const update = useUpdateCustomer(id ?? "");
  const setAktif = useSetCustomerAktif(id ?? "");
  const hapus = useHapusCustomer(id ?? "");

  const [draft, setDraft] = useState<{
    nama: string;
    telepon: string;
    alamat: string;
    catatan: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [sukses, setSukses] = useState<string | null>(null);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  if (customer.isPending) {
    return <p className="p-6 text-sm text-muted">Memuat pelanggan...</p>;
  }

  if (customer.error || !customer.data) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 px-5 py-8">
        <p className="text-sm font-medium text-danger" role="alert">
          Pelanggan tidak ditemukan atau bukan milik usahamu.
        </p>
        <Link className="text-sm font-semibold text-primary" to="/customers">
          Kembali ke daftar pelanggan
        </Link>
      </main>
    );
  }

  const data = customer.data;
  const form = draft ?? {
    nama: data.nama,
    telepon: data.telepon,
    alamat: data.alamat ?? "",
    catatan: data.catatan ?? "",
  };
  const stat = statistikDariOrders(orders.data ?? []);

  const simpan = async () => {
    setError(null);
    setFieldError({});
    setSukses(null);

    if (form.nama.trim() === "") {
      setFieldError({ nama: "Nama wajib diisi" });
      return;
    }

    if (form.telepon.trim() === "") {
      setFieldError({ telepon: "Telepon wajib diisi" });
      return;
    }

    try {
      await update.mutateAsync(form);
      setDraft(null);
      setSukses("Profil pelanggan tersimpan.");
    } catch (galat) {
      setError(pesanAksi(galat, "Gagal menyimpan pelanggan."));
    }
  };

  const ubahArsip = async (aktif: boolean) => {
    setError(null);
    setSukses(null);

    try {
      await setAktif.mutateAsync(aktif);
      setSukses(aktif ? "Pelanggan diaktifkan lagi." : "Pelanggan diarsipkan.");
    } catch (galat) {
      setError(pesanAksi(galat, "Gagal mengubah status pelanggan."));
    }
  };

  const hapusPelanggan = async () => {
    if (!window.confirm("Hapus pelanggan ini? Hanya pelanggan tanpa pesanan.")) {
      return;
    }

    setError(null);
    setSukses(null);

    try {
      await hapus.mutateAsync();
      navigate("/customers", { replace: true });
    } catch (galat) {
      setError(pesanAksi(galat, "Gagal menghapus pelanggan."));
    }
  };

  const punyaOrder = (orders.data ?? []).length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/customers">
          â† Pelanggan
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-ink">{data.nama}</h1>
          <Badge variant={data.aktif ? "success" : "warning"}>
            {labelPelangganArsip(data.aktif)}
          </Badge>
        </div>
        <p className="text-sm tabular-nums text-muted">{data.telepon}</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted">Total belanja</p>
          <p className="text-base font-semibold tabular-nums text-ink">
            {formatRupiah(stat.totalBelanja)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Frekuensi</p>
          <p className="text-base font-semibold tabular-nums text-ink">
            {stat.frekuensi}Ã—
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Terakhir</p>
          <p className="text-base font-semibold tabular-nums text-ink">
            {stat.tanggalTerakhir
              ? tanggal.format(new Date(stat.tanggalTerakhir))
              : "-"}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Profil</h2>
        <Label>
          Nama
          <Input
            value={form.nama}
            onChange={(event) =>
              setDraft((nilai) => ({ ...(nilai ?? form), nama: event.target.value }))
            }
          />
          <FieldError>{fieldError.nama}</FieldError>
        </Label>
        <Label>
          Telepon
          <Input
            inputMode="tel"
            value={form.telepon}
            onChange={(event) =>
              setDraft((nilai) => ({ ...(nilai ?? form), telepon: event.target.value }))
            }
          />
          <FieldError>{fieldError.telepon}</FieldError>
        </Label>
        <Label>
          Alamat
          <Input
            value={form.alamat}
            onChange={(event) =>
              setDraft((nilai) => ({ ...(nilai ?? form), alamat: event.target.value }))
            }
          />
        </Label>
        <Label>
          Catatan
          <Textarea
            value={form.catatan}
            onChange={(event) =>
              setDraft((nilai) => ({ ...(nilai ?? form), catatan: event.target.value }))
            }
          />
        </Label>
        {error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {sukses ? (
          <p className="text-sm font-medium text-success" role="status">
            {sukses}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={update.isPending}
            type="button"
            onClick={() => void simpan()}
          >
            {update.isPending ? "Menyimpan..." : "Simpan profil"}
          </Button>
          <Button
            disabled={setAktif.isPending}
            type="button"
            variant="secondary"
            onClick={() => void ubahArsip(!data.aktif)}
          >
            {data.aktif ? "Arsipkan" : "Aktifkan lagi"}
          </Button>
          {!punyaOrder && !orders.isPending ? (
            <Button
              disabled={hapus.isPending}
              type="button"
              variant="danger"
              onClick={() => void hapusPelanggan()}
            >
              Hapus
            </Button>
          ) : null}
        </div>
        {punyaOrder ? (
          <p className="text-xs text-muted">
            Pelanggan ini punya pesanan, jadi tidak bisa dihapus. Gunakan
            Arsipkan agar riwayat jurnal tetap utuh.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-ink">Histori pesanan</h2>
        {orders.isPending ? (
          <p className="text-sm text-muted">Memuat pesanan...</p>
        ) : orders.error ? (
          <p className="text-sm font-medium text-danger" role="alert">
            Gagal memuat pesanan.
          </p>
        ) : (orders.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">Belum ada pesanan.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(orders.data ?? []).map((order) => (
              <li
                className="flex items-center justify-between gap-2 rounded-control border border-border px-3 py-2"
                key={order.id}
              >
                <div className="min-w-0">
                  <Link
                    className="text-sm font-semibold text-primary"
                    to={`/orders/${order.id}`}
                  >
                    {order.nomor}
                  </Link>
                  <p className="text-xs text-muted">
                    {labelStatus(order.status as never)} Â·{" "}
                    {tanggal.format(new Date(order.created_at))}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatRupiah(order.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
