import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function useBusinesses() {
  return useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,nama,jenis,metode_bayar")
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data;
    },
  });
}
