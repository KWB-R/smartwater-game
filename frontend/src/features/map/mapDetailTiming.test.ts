import { describe, expect, it } from "vitest";
import {
  MAP_DETAIL_SHEET_ENTER_DURATION_MS,
  MAP_DETAIL_SHEET_OPEN_DELAY_MS,
} from "./mapDetailTiming";

describe("mapDetailTiming", () => {
  it("sheet opens immediately with its own enter duration", () => {
    expect(MAP_DETAIL_SHEET_OPEN_DELAY_MS).toBe(0);
    expect(MAP_DETAIL_SHEET_ENTER_DURATION_MS).toBeGreaterThan(0);
  });
});
