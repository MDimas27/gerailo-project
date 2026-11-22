import type { Candidate, CatalogProduct } from "./types.js";

function normalisasiNama(nama: string): string {
  return nama.toLowerCase().replace(/\s+/g, " ").trim();
}

function trigram(teks: string): Set<string> {
  const bersih = `  ${normalisasiNama(teks).replace(/[^a-z0-9]/g, " ")} `;
  const hasil = new Set<string>();

  for (let indeks = 0; indeks < bersih.length - 2; indeks += 1) {
    hasil.add(bersih.slice(indeks, indeks + 3));
  }

  return hasil;
}

export function similarity(a: string, b: string): number {
  const ga = trigram(a);
  const gb = trigram(b);

  if (ga.size === 0 || gb.size === 0) {
    return 0;
  }

  let irisan = 0;
  for (const g of ga) {
    if (gb.has(g)) {
      irisan += 1;
    }
  }

  return irisan / (ga.size + gb.size - irisan);
}

type HasilCocok = {
  produk: CatalogProduct | null;
  candidates: Candidate[];
  exact: boolean;
};

export function cocokkanKatalog(
  nama: string,
  katalog: CatalogProduct[],
): HasilCocok {
  const target = normalisasiNama(nama);
  const aktif = katalog.filter((produk) => produk.aktif !== false);

  const persis = aktif.find(
    (produk) => normalisasiNama(produk.nama) === target,
  );
  if (persis) {
    return { produk: persis, candidates: [], exact: true };
  }

  const alias = aktif.find((produk) =>
    (produk.aliases ?? []).some(
      (satu) => normalisasiNama(satu) === target,
    ),
  );
  if (alias) {
    return { produk: alias, candidates: [], exact: true };
  }

  const mendekati = aktif
    .map((produk) => {
      const skor = Math.max(
        similarity(target, produk.nama),
        ...(produk.aliases ?? []).map((satu) => similarity(target, satu)),
      );

      return { produk, skor };
    })
    .filter(({ skor }) => skor >= 0.8)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 2);

  if (mendekati.length === 1 && mendekati[0]) {
    return {
      produk: mendekati[0].produk,
      candidates: [],
      exact: false,
    };
  }

  if (mendekati.length > 1) {
    return {
      produk: null,
      candidates: mendekati.map(({ produk, skor }) => ({
        product_id: produk.id,
        nama: produk.nama,
        skor,
      })),
      exact: false,
    };
  }

  return { produk: null, candidates: [], exact: false };
}
