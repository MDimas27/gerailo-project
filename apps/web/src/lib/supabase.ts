import type { Database } from "@gerailo/supabase/types";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi di .env.local",
  );
}

export const supabase = createClient<Database>(url, anonKey);
