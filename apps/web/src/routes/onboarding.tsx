import { createBusinessSchema, type CreateBusinessInput } from "@gerailo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";

import { useBusinesses } from "@/hooks/use-businesses";
import { supabase } from "@/lib/supabase";

const fieldClass =
  "min-h-12 rounded-control border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const businesses = useBusinesses();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessInput>({
    defaultValues: {
      nama: "",
      jenis: "makanan",
      metode_bayar: "TRANSFER",
      consent: false,
    },
  });

  const createBusiness = useMutation({
    mutationFn: async (input: CreateBusinessInput) => {
      const { data, error } = await supabase.rpc("create_business", {
        p_nama: input.nama,
        p_jenis: input.jenis,
        p_metode_bayar: input.metode_bayar,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      navigate("/", { replace: true });
    },
  });

  if (businesses.data && businesses.data.length > 0) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit((values) => {
    const parsed = createBusinessSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (
          field === "nama" ||
          field === "jenis" ||
          field === "metode_bayar" ||
          field === "consent"
        ) {
          setError(field, { message: issue.message });
        }
      }

      return;
    }

    createBusiness.mutate(parsed.data);
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
          <span>Langkah 1 dari 3</span>
          <span className="text-primary">Profil usaha</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-ink">Kenalkan usahamu</h1>
        <p className="text-sm text-muted">
          Data ini dipakai untuk menyiapkan buku usaha dan laporanmu. Bisa
          diubah nanti di Pengaturan.
        </p>
      </div>

      <form
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Nama usaha
          <input
            type="text"
            autoComplete="organization"
            placeholder="Contoh: Dapur Bu Siti"
            className={fieldClass}
            {...register("nama")}
          />
          {errors.nama ? (
            <span className="text-xs font-medium text-danger">
              {errors.nama.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Jenis usaha
          <select className={fieldClass} {...register("jenis")}>
            <option value="makanan">Makanan / minuman</option>
            <option value="fashion">Fashion</option>
            <option value="kerajinan">Kerajinan</option>
            <option value="lainnya">Lainnya</option>
          </select>
          {errors.jenis ? (
            <span className="text-xs font-medium text-danger">
              {errors.jenis.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Metode pembayaran utama
          <select className={fieldClass} {...register("metode_bayar")}>
            <option value="TRANSFER">Transfer bank</option>
            <option value="COD">COD</option>
            <option value="QRIS">QRIS</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </label>

        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-5 rounded border-border text-primary"
            {...register("consent")}
          />
          <span>
            Saya setuju dengan{" "}
            <Link className="font-semibold text-primary" to="/privasi">
              Kebijakan Privasi
            </Link>{" "}
            dan{" "}
            <Link className="font-semibold text-primary" to="/syarat">
              Syarat Layanan
            </Link>
            .
          </span>
        </label>
        {errors.consent ? (
          <span className="text-xs font-medium text-danger">
            {errors.consent.message}
          </span>
        ) : null}

        {createBusiness.error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            Gagal membuat usaha. Coba lagi sebentar.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || createBusiness.isPending}
          className="min-h-12 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {createBusiness.isPending ? "Menyiapkan buku usaha..." : "Simpan dan lanjut"}
        </button>
      </form>
    </main>
  );
}
