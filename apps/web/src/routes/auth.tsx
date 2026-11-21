import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const sendCode = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      setError("Email wajib diisi.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: mode === "register" },
    });

    if (sendError) {
      const message = sendError.message.toLowerCase();
      setError(
        message.includes("signups not allowed") || message.includes("user not found")
          ? "Email belum terdaftar. Silakan daftar dulu."
          : message.includes("rate limit") || message.includes("too many")
            ? "Terlalu banyak percobaan. Coba lagi beberapa saat."
            : "Gagal mengirim kode. Periksa email lalu coba lagi.",
      );
    } else {
      setStage("code");
      setNotice(`Tautan masuk dikirim ke ${trimmed}. Cek inbox (Mailpit saat lokal).`);
    }

    setBusy(false);
  };

  const verifyCode = async () => {
    const token = code.trim();

    if (token.length < 6) {
      setError("Masukkan 6 digit kode dari email.");
      return;
    }

    setBusy(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (verifyError) {
      setError("Kode tidak valid atau kedaluwarsa. Coba kirim ulang.");
      setBusy(false);
      return;
    }

    navigate("/", { replace: true });
  };

  const title = mode === "login" ? "Masuk ke Gerailo" : "Buat akun Gerailo";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Gerailo
        </p>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-muted">
          {stage === "email"
            ? "Kami mengirim tautan masuk sekali pakai ke emailmu, tanpa password."
            : "Cek email: klik tautan masuk, atau masukkan kode 6 digit bila tercantum."}
        </p>
      </div>

      <form
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void (stage === "email" ? sendCode() : verifyCode());
        }}
      >
        {stage === "email" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              className="min-h-12 rounded-control border border-border bg-surface px-3 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Kode verifikasi
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="min-h-12 rounded-control border border-border bg-surface px-3 text-base font-normal tracking-[0.3em] outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </label>
            <button
              type="button"
              className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setStage("email");
                setCode("");
                setError(null);
              }}
            >
              Ganti email
            </button>
          </>
        )}

        {notice ? (
          <p className="rounded-control bg-primary-soft px-3 py-2 text-sm text-ink">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy
            ? "Memproses..."
            : stage === "email"
              ? "Kirim kode"
              : "Verifikasi dan masuk"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Belum punya akun?{" "}
            <Link className="font-semibold text-primary" to="/auth/register">
              Daftar
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link className="font-semibold text-primary" to="/auth/login">
              Masuk
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
