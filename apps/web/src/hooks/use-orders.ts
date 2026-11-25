import { useQuery } from "@tanstack/react-query";

import { moneyAdd, parseRupiah } from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

export type OrderStatus =
  | "DRAFT"
  | "DIKONFIRMASI"
  | "DP_DITERIMA"
  | "SIAP_DIKIRIM"
  | "DIKIRIM"
  | "SELESAI"
  | "BATAL";

export type OrderItem = {
  id: string;
  product_id: string;
  qty: number;
  harga_satuan: bigint;
  subtotal: bigint;
};

export type OrderPayment = {
  id: string;
  jenis: string;
  jumlah: bigint;
  kanal: string;
  bukti_path: string | null;
  created_at: string;
};

export type OrderRecord = {
  id: string;
  nomor: string;
  status: OrderStatus;
  created_at: string;
  due_date: string | null;
  customer_id: string;
  nama_pelanggan: string;
  telepon_pelanggan: string;
  ongkir: bigint;
  dp: bigint;
  kurir_nama: string | null;
  nomor_resi: string | null;
  total: bigint;
  sudah_dibayar: bigint;
  metode_bayar: string | string[];
  items: OrderItem[];
  payments: OrderPayment[];
};

type RawOrder = {
  id: string;
  nomor: string;
  status: OrderStatus;
  created_at: string;
  due_date: string | null;
  customer_id: string;
  ongkir: string | number;
  dp: string | number;
  kurir_nama: string | null;
  nomor_resi: string | null;
  metode_bayar: string | string[];
};

type RawCustomer = {
  id: string;
  nama: string;
  telepon: string;
};

type RawItem = {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  harga_satuan: string | number;
};

type RawPayment = {
  id: string;
  order_id: string;
  jenis: string;
  jumlah: string | number;
  kanal: string;
  bukti_path: string | null;
  created_at: string;
};

function assemble(
  orders: RawOrder[],
  customers: RawCustomer[],
  items: RawItem[],
  payments: RawPayment[],
): OrderRecord[] {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return orders.map((order) => {
    const orderItems = items
      .filter((item) => item.order_id === order.id)
      .map((item) => {
        const harga_satuan = parseRupiah(item.harga_satuan);
        return {
          id: item.id,
          product_id: item.product_id,
          qty: item.qty,
          harga_satuan,
          subtotal: harga_satuan * BigInt(item.qty),
        };
      });
    const orderPayments = payments
      .filter((payment) => payment.order_id === order.id)
      .map((payment) => ({
        id: payment.id,
        jenis: payment.jenis,
        jumlah: parseRupiah(payment.jumlah),
        kanal: payment.kanal,
        bukti_path: payment.bukti_path,
        created_at: payment.created_at,
      }));
    const ongkir = parseRupiah(order.ongkir);
    const customer = customerMap.get(order.customer_id);

    return {
      id: order.id,
      nomor: order.nomor,
      status: order.status,
      created_at: order.created_at,
      due_date: order.due_date,
      customer_id: order.customer_id,
      nama_pelanggan: customer?.nama ?? "Pelanggan",
      telepon_pelanggan: customer?.telepon ?? "-",
      ongkir,
      dp: parseRupiah(order.dp),
      kurir_nama: order.kurir_nama,
      nomor_resi: order.nomor_resi,
      total: moneyAdd(ongkir, ...orderItems.map((item) => item.subtotal)),
      sudah_dibayar: moneyAdd(0n, ...orderPayments.map((payment) => payment.jumlah)),
      metode_bayar: order.metode_bayar,
      items: orderItems,
      payments: orderPayments,
    };
  });
}

export function usePaymentProofUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["payment-proof", path ?? null],
    enabled: Boolean(path),
    staleTime: 9 * 60 * 1000,
    queryFn: async () => {
      if (!path) {
        return null;
      }

      const { data, error } = await supabase.storage
        .from("bukti-pembayaran")
        .createSignedUrl(path, 10 * 60);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    },
  });
}

type UseOrdersOptions = {
  status?: OrderStatus | "SEMUA";
  orderId?: string;
};

export function useOrders(
  businessId: string | null | undefined,
  options: UseOrdersOptions = {},
) {
  const { status = "SEMUA", orderId } = options;

  return useQuery({
    queryKey: ["orders", businessId, status, orderId ?? null],
    enabled: Boolean(businessId),
    queryFn: async (): Promise<OrderRecord[]> => {
      if (!businessId) {
        return [];
      }

      let orderQuery = supabase
        .from("orders")
        .select(
          "id,nomor,status,created_at,due_date,customer_id,ongkir,dp,metode_bayar,kurir_nama,nomor_resi",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (status !== "SEMUA") {
        orderQuery = orderQuery.eq("status", status);
      }

      if (orderId) {
        orderQuery = orderQuery.eq("id", orderId);
      }

      const [ordersResult, customersResult, itemsResult, paymentsResult] =
        await Promise.all([
          orderQuery,
          supabase
            .from("customers")
            .select("id,nama,telepon")
            .eq("business_id", businessId),
          supabase
            .from("order_items")
            .select("id,order_id,product_id,qty,harga_satuan")
            .eq("business_id", businessId),
          supabase
            .from("payments")
            .select("id,order_id,jenis,jumlah,kanal,bukti_path,created_at")
            .eq("business_id", businessId),
        ]);

      if (ordersResult.error) {
        throw ordersResult.error;
      }
      if (customersResult.error) {
        throw customersResult.error;
      }
      if (itemsResult.error) {
        throw itemsResult.error;
      }
      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      return assemble(
        (ordersResult.data ?? []) as unknown as RawOrder[],
        (customersResult.data ?? []) as unknown as RawCustomer[],
        (itemsResult.data ?? []) as unknown as RawItem[],
        (paymentsResult.data ?? []) as unknown as RawPayment[],
      );
    },
  });
}
