import { describe, expect, it } from "vitest";

import { parseAngka } from "../../src/services/parser/normalize.js";

describe("golden #3 — format angka Indonesia", () => {
  it.each(["75.000", "75rb", "75k", "Rp 75.000", "Rp75.000"])(
    "mengubah %s menjadi BIGINT 75000",
    (input) => {
      expect(parseAngka(input), input).toBe(75_000n);
    },
  );
});
