import { useQuery } from "@tanstack/react-query";

import { parseRupiah } from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export type ProductDetail = {
  id: string;
  business_id: string;
  nama: string;
  harga_jual: string;
  harga_promo: string | null;
  stok_min: number;
  aktif: boolean;
  aliases: { id: string; alias: string }[];
  variants: { id: string; nama: string; selisih_harga: string }[];
  saldo: bigint;
};

type RawProduct = {
  id: string;
  business_id: string;
  nama: string;
  harga_jual: string | number;
  harga_promo: string | number | null;
  stok_min: number;
  aktif: boolean;
  product_aliases: { id: string; alias: string }[] | null;
  product_variants:
    | { id: string; nama: string; selisih_harga: string | number; aktif: boolean }[]
    | null;
};

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductDetail> => {
      if (!productId) {
        throw new Error("Produk tidak ditemukan");
      }

      const [productResult, balanceResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,business_id,nama,harga_jual,harga_promo,stok_min,aktif,product_aliases(id,alias),product_variants(id,nama,selisih_harga,aktif)",
          )
          .eq("id", productId)
          .single(),
        supabase
          .from("v_stock_balance")
          .select("saldo")
          .eq("product_id", productId)
          .maybeSingle(),
      ]);

      if (productResult.error) {
        throw productResult.error;
      }

      if (balanceResult.error) {
        throw balanceResult.error;
      }

      const product = productResult.data as unknown as RawProduct;

      return {
        id: product.id,
        business_id: product.business_id,
        nama: product.nama,
        harga_jual: String(product.harga_jual),
        harga_promo:
          product.harga_promo === null ? null : String(product.harga_promo),
        stok_min: product.stok_min,
        aktif: product.aktif,
        aliases: product.product_aliases ?? [],
        variants: (product.product_variants ?? [])
          .filter((variant) => variant.aktif)
          .map((variant) => ({
            id: variant.id,
            nama: variant.nama,
            selisih_harga: String(variant.selisih_harga),
          })),
        saldo: parseRupiah(balanceResult.data?.saldo ?? "0"),
      };
    },
  });
}
