import { Link } from "react-router";

export function LegalPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-10">
      <Link className="text-sm font-semibold text-primary" to="/">
        Kembali
      </Link>
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-sm text-muted">{description}</p>
      <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">
        Dokumen lengkap akan tayang sebelum peluncuran. Untuk pertanyaan data
        pribadi, hubungi tim Gerailo.
      </p>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-5 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        404
      </p>
      <h1 className="text-2xl font-semibold text-ink">Halaman tidak ditemukan</h1>
      <Link className="text-sm font-semibold text-primary" to="/">
        Kembali ke beranda
      </Link>
    </main>
  );
}
