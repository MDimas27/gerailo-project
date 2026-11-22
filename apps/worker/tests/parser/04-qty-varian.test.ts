import { describe, expect, it } from "vitest";

import { parseQty } from "../../src/services/parser/normalize.js";

describe("golden #4 — format qty", () => {
  it.each(["x3", "3 pcs", "3x", "3"])("mengubah %s menjadi 3", (input) => {
    expect(parseQty(input), input).toBe(3);
  });
});
