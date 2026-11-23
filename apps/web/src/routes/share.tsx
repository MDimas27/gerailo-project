import { useState } from "react";
import { ArrowRight, ClipboardPaste } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function SharePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [teks, setTeks] = useState(params.get("text") ?? params.get("title") ?? "");
  const [pesan, setPesan] = useState<string | null>(null);

  const tempelDariClipboard = async () => {
    try {
      const isi = await navigator.clipboard.readText();

      if (!isi.trim()) {
        setPesan("Clipboard masih kosong. Salin chat pembeli dulu dari WhatsApp.");
        return;
      }

      setTeks(isi);
      setPesan(null);
    } catch {
      setPesan(
        "Browser tidak mengizinkan akses clipboard. Tempel manual dengan menahan kotak teks.",
      );
    }
  };

  const lanjut = () => {
    if (!teks.trim()) {
      setPesan("Tempel chat pembeli dulu ya.");
      return;
    }

    navigate("/paste", { state: { teks: teks.trim() } });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Bagikan chat ke Gerailo</h1>
        <p className="text-sm text-muted">
          Kirim pesanan dari WhatsApp lewat Berbagi, atau salin-tempel manual di sini.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <Textarea
          aria-label="Teks pesanan WhatsApp"
          className="min-h-40"
          placeholder="Tempel chat pembeli di sini..."
          value={teks}
          onChange={(event) => {
            setTeks(event.target.value);
            setPesan(null);
          }}
        />

        {pesan ? (
          <p role="alert" className="text-sm font-medium text-warning">
            {pesan}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            type="button"
            variant="secondary"
            onClick={() => void tempelDariClipboard()}
          >
            <ClipboardPaste aria-hidden="true" className="size-4" />
            Tempel dari clipboard
          </Button>
          <Button className="flex-1" type="button" onClick={lanjut}>
            Baca pesanan
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </Card>
    </main>
  );
}
