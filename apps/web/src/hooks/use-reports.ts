import { useQuery } from "@tanstack/react-query";

import {
  nilaiPersediaan,
  parseRupiah,
  type PnlBulan,
} from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export function bulanBerjalan(): string {
  const sekarang = new Date();
  return `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`;
}

export type PnlBulanRow = PnlBulan & { bulan: string };

type RawPnl = {
  business_id: string;
  bulan: string;
  pendapatan: string | number;
  hpp: string | number;
  beban: string | number;
  laba_kotor: string | number;
};

export type RekapHarianRow = {
  tanggal: string;
  pendapatan: bigint;
  hpp: bigint;
  laba_kotor: bigint;
  kas_masuk: bigint;
  piutang: bigint;
  uang_muka: bigint;
  beban: bigint;
};

export type ArusKasRow = {
  tanggal: string;
  akun_kode: string;
  akun_nama: string;
  masuk: bigint;
  keluar: bigint;
};

export type PiutangUmpRow = {
  order_id: string;
  nomor: string;
  status: string;
  customer_nama: string | null;
  customer_telepon: string | null;
  total: bigint;
  piutang: bigint;
  uang_muka: bigint;
  created_at: string;
};

export type PersediaanBarisUi = {
  product_id: string;
  nama: string;
  saldo: bigint;
  hpp_rata_rata: bigint;
};

export function usePnlBulan(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["pnl-bulan", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<PnlBulanRow[]> => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase
        .from("v_pnl_bulan")
        .select("business_id,bulan,pendapatan,hpp,beban,laba_kotor")
        .eq("business_id", businessId)
        .order("bulan", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown as RawPnl[]).map((row) => ({
        bulan: row.bulan,
        pendapatan: parseRupiah(row.pendapatan ?? "0"),
        hpp: parseRupiah(row.hpp ?? "0"),
        beban: parseRupiah(row.beban ?? "0"),
        laba_kotor: parseRupiah(row.laba_kotor ?? "0"),
      }));
    },
  });
}

export function useRekapHarian(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["rekap-harian", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<RekapHarianRow[]> => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase
        .from("v_rekap_harian")
        .select(
          "business_id,tanggal,pendapatan,hpp,laba_kotor,kas_masuk,piutang,uang_muka,beban",
        )
        .eq("business_id", businessId)
        .order("tanggal", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown as Record<string, string | number | null>[])
        .map((row) => ({
          tanggal: String(row.tanggal ?? ""),
          pendapatan: parseRupiah(row.pendapatan ?? "0"),
          hpp: parseRupiah(row.hpp ?? "0"),
          laba_kotor: parseRupiah(row.laba_kotor ?? "0"),
          kas_masuk: parseRupiah(row.kas_masuk ?? "0"),
          piutang: parseRupiah(row.piutang ?? "0"),
          uang_muka: parseRupiah(row.uang_muka ?? "0"),
          beban: parseRupiah(row.beban ?? "0"),
        }));
    },
  });
}

export function useArusKas(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["arus-kas", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<ArusKasRow[]> => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase
        .from("v_arus_kas")
        .select("business_id,tanggal,akun_kode,akun_nama,masuk,keluar")
        .eq("business_id", businessId)
        .order("tanggal", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown as Record<string, string | number | null>[])
        .map((row) => ({
          tanggal: String(row.tanggal ?? ""),
          akun_kode: String(row.akun_kode ?? ""),
          akun_nama: String(row.akun_nama ?? ""),
          masuk: parseRupiah(row.masuk ?? "0"),
          keluar: parseRupiah(row.keluar ?? "0"),
        }));
    },
  });
}

export function usePiutangUmp(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["piutang-ump", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<PiutangUmpRow[]> => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase
        .from("v_piutang_ump")
        .select(
          "business_id,order_id,nomor,status,created_at,customer_nama,customer_telepon,total,piutang,uang_muka",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown as Record<string, string | number | null>[])
        .map((row) => ({
          order_id: String(row.order_id),
          nomor: String(row.nomor),
          status: String(row.status),
          customer_nama:
            row.customer_nama === null ? null : String(row.customer_nama),
          customer_telepon:
            row.customer_telepon === null
              ? null
              : String(row.customer_telepon),
          total: parseRupiah(row.total ?? "0"),
          piutang: parseRupiah(row.piutang ?? "0"),
          uang_muka: parseRupiah(row.uang_muka ?? "0"),
          created_at: String(row.created_at),
        }));
    },
  });
}

export function usePersediaan(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["persediaan", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      if (!businessId) {
        return { baris: [] as PersediaanBarisUi[], nilai: 0n, unitTanpaHarga: 0 };
      }

      const [produkRes, saldoRes] = await Promise.all([
        supabase
          .from("products")
          .select("id,nama,hpp_rata_rata")
          .eq("business_id", businessId)
          .eq("aktif", true)
          .order("nama"),
        supabase
          .from("v_stock_balance")
          .select("product_id,saldo")
          .eq("business_id", businessId),
      ]);

      if (produkRes.error) {
        throw produkRes.error;
      }

      if (saldoRes.error) {
        throw saldoRes.error;
      }

      const saldo = new Map(
        ((saldoRes.data ?? []) as { product_id: string; saldo: string | number }[]).map(
          (row) => [row.product_id, parseRupiah(row.saldo ?? "0")],
        ),
      );

      const baris: PersediaanBarisUi[] = (
        (produkRes.data ?? []) as { id: string; nama: string; hpp_rata_rata: string | number }[]
      ).map((produk) => ({
        product_id: produk.id,
        nama: produk.nama,
        saldo: saldo.get(produk.id) ?? 0n,
        hpp_rata_rata: parseRupiah(produk.hpp_rata_rata ?? "0"),
      }));

      const agregat = nilaiPersediaan(
        baris.map((row) => ({
          saldo: row.saldo,
          hpp_rata_rata: row.hpp_rata_rata,
        })),
      );

      return { baris, ...agregat };
    },
  });
}
