import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function readLinkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get("error_code") ?? query.get("error_code");
  const description =
    hash.get("error_description") ?? query.get("error_description");

  if (!code && !description) {
    return null;
  }

  if (code === "otp_expired") {
    return "Tautan masuk sudah kedaluwarsa atau sudah dipakai. Minta tautan baru.";
  }

  return description?.replaceAll("+", " ") ?? "Tautan masuk tidak valid.";
}

export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(() => readLinkError());

  useEffect(() => {
    if (error) {
      return;
    }

    if (session) {
      navigate("/", { replace: true });
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          window.clearInterval(timer);
          navigate("/", { replace: true });
          return;
        }

        if (attempts >= 20) {
          window.clearInterval(timer);
          setError(
            "Tautan tidak valid atau sudah dipakai. Minta tautan baru dari halaman masuk.",
          );
        }
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [error, navigate, session]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        Gerailo
      </p>
      <h1 className="text-2xl font-semibold text-ink">
        {error ? "Tautan tidak bisa dipakai" : "Memproses tautan masuk..."}
      </h1>
      {error ? (
        <>
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <p className="text-sm text-muted">
            Tautan masuk hanya bisa dipakai sekali dan harus dibuka di browser
            yang sama dengan tempat kamu memintanya.
          </p>
          <Link
            className="min-h-12 rounded-control bg-primary px-4 text-center text-base font-semibold leading-[3rem] text-white"
            to="/auth/login"
          >
            Kembali ke halaman masuk
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted">
          {loading ? "Memuat sesi..." : "Menyiapkan sesi dan buku usaha..."}
        </p>
      )}
    </main>
  );
}
