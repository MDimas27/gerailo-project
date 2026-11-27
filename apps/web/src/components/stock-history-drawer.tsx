import { useEffect } from "react";
import { X } from "lucide-react";

import { formatHppLabel } from "@gerailo/shared";

import { Button } from "@/components/ui/button";
import { useProductStockMovements, type StockMovement } from "@/hooks/use-stock";

const tanggalFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const jenisLabel: Record<StockMovement["jenis"], string> = {
  MASUK: "Stok masuk",
  KELUAR: "Stok keluar",
  PENYESUAIAN: "Penyesuaian",
};

function qtyLabel(movement: StockMovement): string {
  const nilai = movement.qty > 0 ? `+${movement.qty}` : `${movement.qty}`;
  return `${nilai} pcs`;
}

export type StockHistoryDrawerProps = {
  open: boolean;
  product: { id: string; nama: string } | null;
  onClose: () => void;
};

/**
 * Drawer riwayat pergerakan stok yang reusable.
 * Dipakai `/stock` sekarang; siap dipasang ke route `/stock/history/:productId`
 * kelak tanpa menulis ulang query/UI (Gate PREP Q3).
 */
export function StockHistoryDrawer({
  open,
  product,
  onClose,
}: StockHistoryDrawerProps) {
  const movements = useProductStockMovements(open ? product?.id : null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Tutup riwayat stok"
        className="absolute inset-0 bg-ink/40"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby="stock-history-title"
        aria-modal="true"
        className="relative flex max-h-[80dvh] w-full max-w-xl flex-col rounded-t-card bg-surface shadow-xl"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              className="truncate text-base font-semibold text-ink"
              id="stock-history-title"
            >
              Riwayat stok
            </h2>
            <p className="truncate text-sm text-muted">{product.nama}</p>
          </div>
          <Button
            aria-label="Tutup"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {movements.isPending ? (
            <p className="text-sm text-muted">Memuat riwayat...</p>
          ) : movements.error ? (
            <p className="text-sm font-medium text-danger" role="alert">
              Gagal memuat riwayat stok. Coba lagi.
            </p>
          ) : (movements.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada pergerakan stok untuk produk ini.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(movements.data ?? []).map((movement) => (
                <li
                  className="rounded-control border border-border px-3 py-2.5"
                  key={movement.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {jenisLabel[movement.jenis]}
                    </p>
                    <p
                      className={
                        movement.qty < 0
                          ? "text-sm font-semibold tabular-nums text-danger"
                          : "text-sm font-semibold tabular-nums text-success"
                      }
                    >
                      {qtyLabel(movement)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">{movement.alasan}</p>
                  {movement.harga_beli !== null ? (
                    <p className="mt-1 text-xs tabular-nums text-muted">
                      Harga beli: {formatHppLabel(movement.harga_beli)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs tabular-nums text-muted">
                    {tanggalFormat.format(new Date(movement.created_at))}
                    {movement.order_id ? " · terkait pesanan" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted">
            Total nilai persediaan mengikuti jurnal; daftar ini catatan pergerakan
            fisik. HPP rata-rata diperbarui tiap stok masuk berharga.
          </p>
        </footer>
      </section>
    </div>
  );
}
