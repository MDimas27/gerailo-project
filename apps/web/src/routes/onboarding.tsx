import { createBusinessSchema, type CreateBusinessInput, parseAliasInput, parseRupiah, productFormSchema } from "@gerailo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";

import { useBusinesses } from "@/hooks/use-businesses";
import { useProducts } from "@/hooks/use-products";
import { supabase } from "@/lib/supabase";

const fieldClass =
  "min-h-12 rounded-control border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const businesses = useBusinesses();
  const products = useProducts(businesses.data?.[0]?.id ?? null);

  // Step state
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 1: Profil usaha
  const {
    register: register1,
    handleSubmit: handleSubmit1,
    setError: setError1,
    formState: { errors: errors1, isSubmitting: isSubmitting1 },
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
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setStep(2);
    },
  });

  // Step 2: Tambah produk pertama
  const [form2, setForm2] = useState<{
    nama: string;
    harga_jual: string;
    stok_min: number;
    aliases: string;
    stok_awal: number;
    harga_beli: string;
  }>({
    nama: "",
    harga_jual: "",
    stok_min: 0,
    aliases: "",
    stok_awal: 0,
    harga_beli: "",
  });

  const onSubmitStep2 = async (values: typeof form2) => {
    const parsed = productFormSchema.safeParse(values);
    if (!parsed.success) {
      setStepError(parsed.error.issues[0]?.message || "Periksa kembali data produk");
      return;
    }

    const hargaJual = parseRupiah(parsed.data.harga_jual);
    const aliases = parseAliasInput(parsed.data.aliases);
    const hargaBeli = parsed.data.harga_beli === ""
      ? null
      : parseRupiah(parsed.data.harga_beli);

    try {
      const { data: productId, error } = await supabase.rpc("create_product", {
        p_business_id: businesses.data![0].id,
        p_nama: parsed.data.nama,
        p_harga_jual: hargaJual.toString() as unknown as number,
        p_stok_min: parsed.data.stok_min,
        p_aliases: aliases,
        p_stok_awal: parsed.data.stok_awal,
        p_harga_beli: hargaBeli === null ? undefined : (hargaBeli.toString() as unknown as number),
      });

      if (error) {
        setStepError(error.message || "Gagal membuat produk");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      setStep(3);
    } catch (e: any) {
      setStepError(e.message || "Gagal membuat produk");
    }
  };

  // Step 3: Demo Smart Paste
  const chatSiti = "Halo kak Rena, saya mau pesan Sambal Cumi Pedas 2 toples sama Sambal Roa 1 toples yaa. Kirim ke Jl. Melati No. 45 Kemang, Jakarta Selatan atas nama Maya Anggraini (0812-8899-7766). Pakai SiCepat Regular kak. Sudah saya transfer DP Rp100.000 ya kak.";
  const [parsedChat, setParsedChat] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (step === 3 && !parsedChat && !isParsing) {
      parseChat();
    }
  }, [step, parsedChat, isParsing]);

  const parseChat = async () => {
    setIsParsing(true);
    try {
      setParsedChat({
        products: [
          { nama: "Sambal Cumi Pedas", harga: 45000, qty: 2 },
          { nama: "Sambal Roa", harga: 55000, qty: 1 },
        ],
        customer: "Maya Anggraini",
        phone: "0812-8899-7766",
        alamat: "Jl. Melati No. 45 Kemang, Jakarta Selatan",
        ongkir: 15000,
        dp: 100000,
        total: 160000,
      });
    } catch (e: any) {
      setParsedChat(null);
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmitStep3 = () => {
    navigate("/", { replace: true });
  };

  // Check for existing business
  if (businesses.data && businesses.data.length > 0) {
    if (step === 1 && businesses.data[0].onboarding_selesai) {
      return <Navigate to="/" replace />;
    }
  }

  if (step === 1) {
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
            void createBusiness.mutate(form1);
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Nama usaha
            <input
              type="text"
              autoComplete="organization"
              placeholder="Contoh: Dapur Bu Siti"
              className={fieldClass}
              {...register1("nama")}
            />
            {errors1.nama ? (
              <span className="text-xs font-medium text-danger">
                {errors1.nama.message}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Jenis usaha
            <select className={fieldClass} {...register1("jenis")}>
              <option value="makanan">Makanan / minuman</option>
              <option value="fashion">Fashion</option>
              <option value="kerajinan">Kerajinan</option>
              <option value="lainnya">Lainnya</option>
            </select>
            {errors1.jenis ? (
              <span className="text-xs font-medium text-danger">
                {errors1.jenis.message}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Metode pembayaran utama
            <select className={fieldClass} {...register1("metode_bayar")}>
              <option value="TRANSFER">Transfer bank</option>
              <option value="COD">COD</option>
              <option value="QRIS">QRIS</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
            {errors1.metode_bayar ? (
              <span className="text-xs font-medium text-danger">
                {errors1.metode_bayar.message}
              </span>
            ) : null}
          </label>

          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-5 rounded border-border text-primary"
              {...register1("consent")}
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
          {errors1.consent ? (
            <span className="text-xs font-medium text-danger">
              {errors1.consent.message}
            </span>
          ) : null}

          {createBusiness.error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              Gagal membuat usaha. Coba lagi sebentar.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting1 || createBusiness.isPending}
            className="min-h-12 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {createBusiness.isPending ? "Menyiapkan buku usaha..." : "Simpan dan lanjut"}
          </button>
        </form>
      </main>
    );
  }

  if (step === 2) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            <span>Langkah 2 dari 3</span>
            <span className="text-primary">Produk pertama</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-1/3 rounded-full bg-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Tambah produk pertama</h1>
          <p className="text-sm text-muted">
            Produk ini akan tersedia di katalog dan bisa dipakai saat pelanggan
            memesan melalui WhatsApp.
          </p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmitStep2(form2);
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Nama produk
            <input
              autoComplete="off"
              placeholder="Contoh: Sambal Cumi Pedas 200g"
              className={fieldClass}
              value={form2.nama}
              onChange={(e) => setForm2({ ...form2, nama: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Harga jual
            <input
              inputMode="numeric"
              placeholder="15000"
              className={fieldClass}
              value={form2.harga_jual}
              onChange={(e) => setForm2({ ...form2, harga_jual: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Stok minimum (untuk peringatan menipis)
            <input
              inputMode="numeric"
              min={0}
              type="number"
              className={fieldClass}
              value={form2.stok_min}
              onChange={(e) => setForm2({ ...form2, stok_min: Number(e.target.value) || 0 })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Alias untuk Smart Paste (pisahkan dengan koma)
            <input
              placeholder="daster jmb, DJ motif"
              className={fieldClass}
              value={form2.aliases}
              onChange={(e) => setForm2({ ...form2, aliases: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Stok awal (opsional)
            <input
              inputMode="numeric"
              min={0}
              type="number"
              className={fieldClass}
              value={form2.stok_awal}
              onChange={(e) => setForm2({ ...form2, stok_awal: Number(e.target.value) || 0 })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Harga beli per unit (opsional, untuk HPP nanti)
            <input
              inputMode="numeric"
              placeholder="8000"
              className={fieldClass}
              value={form2.harga_beli}
              onChange={(e) => setForm2({ ...form2, harga_beli: e.target.value })}
            />
          </label>

          {stepError ? (
            <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {stepError}
            </p>
          ) : null}

          <button
            type="submit"
            className="min-h-12 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:opacity-60"
          >
            Simpan produk dan lanjut
          </button>

          <button
            onClick={() => setStep(1)}
            className="min-h-12 rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink disabled:opacity-60"
          >
            Kembali
          </button>
        </form>
      </main>
    );
  }

  if (step === 3) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            <span>Langkah 3 dari 3</span>
            <span className="text-success">Smart Paste</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full w-1/3 rounded-full bg-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Demo Smart Paste</h1>
          <p className="text-sm text-muted">
            Salin teks order dari chat WhatsApp pelanggan untuk membuat draf pesanan
            otomatis.
          </p>
        </div>

        <div className="bg-surface rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">
            Contoh chat pembeli
          </h2>

          <div className="bg-background rounded-lg p-4 mb-4">
            <textarea
              className="w-full bg-transparent font-body-sm text-body-sm text-on-surface focus:outline-none resize-none leading-relaxed"
              rows="3"
              readonly
            >
{chatSiti}
</textarea>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={parseChat}
              disabled={isParsing}
              className="flex items-center gap-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-lg flex items-center justify-center gap-2 py-2 shadow-sm active:bg-primary transition-all"
            >
              <span className="material-symbols-outlined">psychology</span>
              <span>Baca & Ekstraksi</span>
            </button>
            <button
              onClick={parseChat}
              className="flex items-center gap-2 rounded-lg bg-surface hover:bg-surface-bright text-text-secondary font-label-md text-label-md flex items-center justify-center gap-2 py-2 transition-all"
            >
              <span className="material-symbols-outlined">refresh</span>
              <span>Reset</span>
            </button>
          </div>

          {parsedChat && (
            <div className="bg-secondary-container/60 rounded-xl p-4 mb-4">
              <h3 className="font-label-md text-label-md text-on-secondary-container mb-3">
                Hasil Ekstraksi
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-status-success">
                    verified
                  </span>
                  <div>
                    <span className="font-label-md text-label-md text-on-surface">
                      Item teridentifikasi
                    </span>
                    <span className="font-body-sm text-body-sm text-text-secondary">
                      2/2 terpetakan
                    </span>
                  </div>
                </div>

                {parsedChat.products.map((p: any, idx: number) => (
                  <div key={idx} className="bg-surface-bright rounded-xl p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container relative">
                      <img
                        className="w-full h-full object-cover"
                        alt={p.nama}
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf_PKlKOLB3mfPXkCdH-6jwymfKDoKyusHQlk1idIJfqcUUVysUal5Q-DkAa2vjYFRiDrOTqsUwKW33Ov3jFz6KIlD7_EdhQ6VzMsm788wDHN21Zo0CuP3x82p9DNNfTHijw99yVG5JGHpMeY492WVT8QX3_Aw71rqeZkwnmvF9CNZAmCq36zPzvCKov9uqOHpQG-PDA_NwYkz3O-mD9iWnNKbyVDC4seReion6Dc"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-label-lg text-label-lg text-on-surface truncate">
                        {p.nama}
                      </h4>
                      <div className="flex items-center gap-2 text-text-secondary">
                        <span className="font-currency-body text-currency-body text-on-surface">
                          Rp{p.harga.toLocaleString("id-ID")}
                        </span>
                        <span className="font-body-sm text-body-sm">
                          × {p.qty} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-text-secondary font-body-sm">
                    <span>Subtotal Produk</span>
                    <span className="font-currency-display text-on-surface">
                      Rp{parsedChat.products.reduce((sum: number, p: any) => sum + p.harga * p.qty, 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary font-body-sm">
                    <span>Ongkos Kirim</span>
                    <span className="font-currency-display text-on-surface" id="displayOngkir">
                      Rp{parsedChat.ongkir.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-lg text-label-lg text-on-surface">
                      Total
                    </span>
                    <span className="font-currency-display text-primary" id="displayTotal">
                      Rp{parsedChat.total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm text-text-secondary">
              3 informasi cocok otomatis: nama produk, harga, dan qty. 1 butir
              (alamat lengkap) perlu verifikasi sebelum konfirmasi.
            </p>
            <p className="text-xs text-text-secondary/60 mt-1">
              Pengirim: {parsedChat?.customer || "Maya Anggraini"} |{" "}
              {parsedChat?.phone || "0812-8899-7766"}
            </p>
          </div>
        </div>

        <button
          onClick={onSubmitStep3}
          disabled={isParsing}
          className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:bg-primary transition-all"
        >
          {isParsing ? "Menganalisis..." : "Konfirmasi & Simpan Pesanan"}
        </button>

        <button
          onClick={() => setStep(2)}
          className="my-4 min-h-12 rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink transition-all"
        >
          Kembali ke produk
        </button>
      </main>
    );
  }

  return null;
}