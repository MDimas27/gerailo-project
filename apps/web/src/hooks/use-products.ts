import { useQuery } from "@tanstack/react-query";

import { parseRupiah } from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export type ProductListItem = {
  id: string;
  nama: string;
  harga_jual: string;
  harga_promo: string | null;
  stok_min: number;
  aktif: boolean;
  created_at: string;
  aliases: string[];
  saldo: bigint;
};

type RawProduct = {
  id: string;
  nama: string;
  harga_jual: string | number;
  harga_promo: string | number | null;
  stok_min: number;
  aktif: boolean;
  created_at: string;
  product_aliases: { alias: string }[] | null;
};

export function useProducts(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["products", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<ProductListItem[]> => {
      if (!businessId) {
        return [];
      }

      const [productsResult, balancesResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,nama,harga_jual,harga_promo,stok_min,aktif,created_at,product_aliases(alias)",
          )
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("v_stock_balance")
          .select("product_id,saldo")
          .eq("business_id", businessId),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (balancesResult.error) {
        throw balancesResult.error;
      }

      const balances = new Map(
        (balancesResult.data ?? []).map((row) => [
          row.product_id,
          parseRupiah(row.saldo ?? "0"),
        ]),
      );

      return ((productsResult.data ?? []) as unknown as RawProduct[]).map(
        (product) => ({
          id: product.id,
          nama: product.nama,
          harga_jual: String(product.harga_jual),
          harga_promo:
            product.harga_promo === null ? null : String(product.harga_promo),
          stok_min: product.stok_min,
          aktif: product.aktif,
          created_at: product.created_at,
          aliases: (product.product_aliases ?? []).map((alias) => alias.alias),
          saldo: balances.get(product.id) ?? 0n,
        }),
      );
    },
  });
}
