import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  parseRupiah,
  statistikPelanggan,
  type OrderPelanggan,
} from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export type CustomerRow = {
  id: string;
  nama: string;
  telepon: string;
  alamat: string | null;
  catatan: string | null;
  aktif: boolean;
  created_at: string;
};

type RawCustomer = {
  id: string;
  nama: string;
  telepon: string;
  alamat: string | null;
  catatan: string | null;
  aktif: boolean;
  created_at: string;
};

export type CustomerOrderRow = {
  id: string;
  nomor: string;
  status: string;
  created_at: string;
  total: bigint;
};

export function useCustomers(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["customers", businessId],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<CustomerRow[]> => {
      if (!businessId) {
        return [];
      }

      const { data, error } = await supabase
        .from("customers")
        .select("id,nama,telepon,alamat,catatan,aktif,created_at")
        .eq("business_id", businessId)
        .order("nama", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as unknown as RawCustomer[];
    },
  });
}

export function useCustomer(customerId: string | null | undefined) {
  return useQuery({
    queryKey: ["customer", customerId ?? null],
    enabled: Boolean(customerId),
    queryFn: async (): Promise<CustomerRow | null> => {
      if (!customerId) {
        return null;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("id,nama,telepon,alamat,catatan,aktif,created_at")
        .eq("id", customerId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as unknown as RawCustomer) ?? null;
    },
  });
}

export function useCustomerOrders(
  businessId: string | null | undefined,
  customerId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["customer-orders", businessId, customerId ?? null],
    enabled: Boolean(businessId && customerId),
    queryFn: async (): Promise<CustomerOrderRow[]> => {
      if (!businessId || !customerId) {
        return [];
      }

      const ordersRes = await supabase
        .from("orders")
        .select("id,nomor,status,ongkir,created_at")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (ordersRes.error) {
        throw ordersRes.error;
      }

      const orders = (ordersRes.data ?? []) as unknown as {
        id: string;
        nomor: string;
        status: string;
        ongkir: string | number;
        created_at: string;
      }[];

      const ids = orders.map((row) => row.id);
      let items: { order_id: string; qty: number; harga_satuan: string | number }[] = [];

      if (ids.length > 0) {
        const itemsRes = await supabase
          .from("order_items")
          .select("order_id,qty,harga_satuan")
          .in("order_id", ids);

        if (itemsRes.error) {
          throw itemsRes.error;
        }

        items = (itemsRes.data ?? []) as unknown as typeof items;
      }

      return orders.map((order) => {
        const subtotal = items
          .filter((item) => item.order_id === order.id)
          .reduce(
            (sum, item) => sum + parseRupiah(item.harga_satuan) * BigInt(item.qty),
            0n,
          );

        return {
          id: order.id,
          nomor: order.nomor,
          status: order.status,
          created_at: order.created_at,
          total: subtotal + parseRupiah(order.ongkir),
        };
      });
    },
  });
}

export function statistikDariOrders(orders: readonly CustomerOrderRow[]) {
  const input: OrderPelanggan[] = orders.map((order) => ({
    status: order.status,
    total: order.total,
    created_at: order.created_at,
  }));

  return statistikPelanggan(input);
}

export type CustomerInput = {
  nama: string;
  telepon: string;
  alamat?: string;
  catatan?: string;
};

async function invalidateCustomers(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: ["customers"] });
  await queryClient.invalidateQueries({ queryKey: ["customer-orders"] });

  if (customerId) {
    await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
  }
}

export function useUpsertCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data, error } = await supabase.rpc("upsert_customer", {
        p_nama: input.nama,
        p_telepon: input.telepon,
        p_alamat: input.alamat?.trim() ? input.alamat : undefined,
        p_catatan: input.catatan?.trim() ? input.catatan : undefined,
      });

      if (error) {
        throw error;
      }

      return data as string;
    },
    onSuccess: async (id) => {
      await invalidateCustomers(queryClient, id);
    },
  });
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { error } = await supabase.rpc("update_customer", {
        p_customer_id: customerId,
        p_nama: input.nama,
        p_telepon: input.telepon,
        p_alamat: input.alamat?.trim() ? input.alamat : undefined,
        p_catatan: input.catatan?.trim() ? input.catatan : undefined,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await invalidateCustomers(queryClient, customerId);
    },
  });
}

export function useSetCustomerAktif(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aktif: boolean) => {
      const { error } = await supabase.rpc("set_customer_aktif", {
        p_customer_id: customerId,
        p_aktif: aktif,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await invalidateCustomers(queryClient, customerId);
    },
  });
}

export function useHapusCustomer(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("hapus_customer", {
        p_customer_id: customerId,
      });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await invalidateCustomers(queryClient, customerId);
    },
  });
}
