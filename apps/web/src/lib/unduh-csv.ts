import type { JenisExport } from "@gerailo/shared";

import { supabase } from "@/lib/supabase";

const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined;

export async function unduhCsv(
  jenis: JenisExport,
  bulan: string | null,
): Promise<void> {
  if (!workerUrl) {
    throw new Error("WORKER_URL_BELUM_DISET");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url = new URL(`/api/export/${jenis}`, workerUrl);

  if (bulan) {
    url.searchParams.set("bulan", bulan);
  }

  const respons = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respons.ok) {
    const body = (await respons.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `EXPORT_GAGAL_${respons.status}`);
  }

  const blob = await respons.blob();
  const disposisi = respons.headers.get("Content-Disposition") ?? "";
  const nama = /filename="([^"]+)"/.exec(disposisi)?.[1] ?? `${jenis}.csv`;
  const tautan = document.createElement("a");

  tautan.href = URL.createObjectURL(blob);
  tautan.download = nama;
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();
  URL.revokeObjectURL(tautan.href);
}
