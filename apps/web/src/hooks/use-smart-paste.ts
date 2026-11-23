import { useMutation } from "@tanstack/react-query";

import { ekstrakChat, type ExtractionWire } from "@/lib/api";

const KUNCI_TEKS_LAMA = "gerailo-smart-paste-teks";
const KUNCI_DRAFT = "gerailo-smart-paste-draft";

export type DraftSmartPaste = {
  teks: string;
  extraction: ExtractionWire;
  logId?: string;
};

export function simpanDraftSmartPaste(draft: DraftSmartPaste): void {
  sessionStorage.setItem(KUNCI_DRAFT, JSON.stringify(draft));
}

export function bacaDraftSmartPaste(): DraftSmartPaste | null {
  const mentah = sessionStorage.getItem(KUNCI_DRAFT);

  if (!mentah) {
    return null;
  }

  try {
    return JSON.parse(mentah) as DraftSmartPaste;
  } catch {
    return null;
  }
}

export function hapusDraftSmartPaste(): void {
  sessionStorage.removeItem(KUNCI_TEKS_LAMA);
  sessionStorage.removeItem(KUNCI_DRAFT);
}

export function useSmartPaste() {
  return useMutation({
    mutationFn: ({ teks, pakaiAi }: { teks: string; pakaiAi?: boolean }) =>
      ekstrakChat(teks, pakaiAi),
  });
}
