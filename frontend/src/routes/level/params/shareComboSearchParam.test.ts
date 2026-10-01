import { describe, expect, it } from "vitest";

import {
  buildShareComboSearch,
  parseShareComboPartIds,
} from "@/routes/level/params/shareComboSearchParam";

describe("shareComboSearchParam", () => {
  it("builds and parses combo query (alphabetical)", () => {
    const search = buildShareComboSearch(["mulde", "baum", "eisdiele"]);
    expect(search).toBe("combo=baum%2Beisdiele%2Bmulde");
    expect(parseShareComboPartIds(`?${search}`)).toEqual([
      "baum",
      "eisdiele",
      "mulde",
    ]);
  });
});
