import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseRupiah, toRpcAmount } from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export type StockProduct = {
  id: string;
  nama: string;
  harga_jual: string;
  hpp_rata_rata: bigint;
  stok_min: number;
  aktif: boolean;
  saldo: bigint;
};

export type StockMovement = {
  id: string;
  product_id: string;
  jenis: "MASUK" | "KELUAR" | "PENYESUAIAN";
  qty: number;
  harga_beli: bigint | null;
  alasan: string;
  order_id: string | null;
  created_at: string;
};

export type StockOverview = {
  products: StockProduct[];
  movements: StockMovement[];
};

type RawProduct = {
  id: string;
  nama: string;
  harga_jual: string | number;
  hpp_rata_rata: string | number;
  stok_min: number;
  aktif: boolean;
};

type RawBalance = {
  product_id: string;
  saldo: string | number;
};

type RawMovement = {
  id: string;
  product_id: string;
  jenis: "MASUK" | "KELUAR" | "PENYESUAIAN";
  qty: number;
  harga_beli: string | number | null;
  alasan: string;
  order_id: string | null;
  created_at: string;
};

function toMovement(row: RawMovement): StockMovement {
  return {
    id: row.id,
    product_id: row.product_id,
    jenis: row.jenis,
    qty: row.qty,
    harga_beli:
      row.harga_beli === null ? null : parseRupiah(row.harga_beli),
    alasan: row.alasan,
    order_id: row.order_id,
    created_at: row.created_at,
  };
}

export function useStockOverview(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["stock-overview", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<StockOverview> => {
      if (!businessId) {
        return { products: [], movements: [] };
      }

      const [productsResult, balancesResult, movementsResult] =
        await Promise.all([
          supabase
            .from("products")
            .select("id,nama,harga_jual,hpp_rata_rata,stok_min,aktif")
            .eq("business_id", businessId)
            .order("nama", { ascending: true }),
          supabase
            .from("v_stock_balance")
            .select("product_id,saldo")
            .eq("business_id", businessId),
          supabase
            .from("stock_movements")
            .select("id,product_id,jenis,qty,harga_beli,alasan,order_id,created_at")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
        ]);

      if (productsResult.error) {
        throw productsResult.error;
      }
      if (balancesResult.error) {
        throw balancesResult.error;
      }
      if (movementsResult.error) {
        throw movementsResult.error;
      }

      const balances = new Map(
        ((balancesResult.data ?? []) as unknown as RawBalance[]).map((row) => [
          row.product_id,
          parseRupiah(row.saldo ?? "0"),
        ]),
      );

      return {
        products: ((productsResult.data ?? []) as unknown as RawProduct[]).map(
          (product) => ({
            id: product.id,
            nama: product.nama,
            harga_jual: String(product.harga_jual),
            hpp_rata_rata: parseRupiah(product.hpp_rata_rata ?? "0"),
            stok_min: product.stok_min,
            aktif: product.aktif,
            saldo: balances.get(product.id) ?? 0n,
          }),
        ),
        movements: ((movementsResult.data ?? []) as unknown as RawMovement[]).map(
          toMovement,
        ),
      };
    },
  });
}

export function useProductStockMovements(
  productId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["stock-movements", productId ?? null],
    enabled: Boolean(productId),
    queryFn: async (): Promise<StockMovement[]> => {
      if (!productId) {
        return [];
      }

      const { data, error } = await supabase
        .from("stock_movements")
        .select("id,product_id,jenis,qty,harga_beli,alasan,order_id,created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown as RawMovement[]).map(toMovement);
    },
  });
}

export type RecordStockMoveInput = {
  productId: string;
  jenis: "MASUK" | "PENYESUAIAN";
  qty: number;
  hargaBeli: bigint | null;
  alasan: string;
};

export function useRecordStockMove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordStockMoveInput) => {
      const { data, error } = await supabase.rpc("record_stock_move", {
        p_product_id: input.productId,
        p_type: input.jenis,
        p_qty: input.qty,
        p_unit_price:
          input.hargaBeli === null
            ? undefined
            : toRpcAmount(input.hargaBeli) as unknown as number,
        p_reason: input.alasan,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
