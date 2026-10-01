import { describe, expect, it } from "vitest";
import type { Tile } from "@/features/level/types";
import { shouldShowDropTargetSocket } from "./dropTargetSocketVisibility";

function tile(partial: Partial<Tile> & Pick<Tile, "id">): Tile {
  const { id, ...rest } = partial;
  return {
    id,
    configId: "t",
    name: "",
    content: null,
    image: { id: 1, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: false,
    helper: null,
    socket: null,
    placementVideo: null,
    measureEffective: true,
    pointMatrix: {
      default: 0,
      cooling: 0,
      flooding: 0,
      water: 0,
      biodiversity: 0,
      quality: 0,
    },
    ...rest,
  };
}

describe("shouldShowDropTargetSocket", () => {
  it("hides when tile is correctly placed", () => {
    const t = tile({
      id: 1,
      helper: {
        id: 2,
        position: { x: 0, y: 0 },
        size: { x: 10, y: 10 },
        placed: false,
        image: { id: 3, url: "/socket.webp" },
      },
    });
    expect(shouldShowDropTargetSocket(t, new Set())).toBe(true);
    expect(shouldShowDropTargetSocket(t, new Set([1]))).toBe(false);
  });

  it("hides parent socket when socket child is placed", () => {
    const child = tile({ id: 2 });
    const parent = tile({
      id: 1,
      helper: {
        id: 3,
        position: { x: 0, y: 0 },
        size: { x: 10, y: 10 },
        placed: false,
        image: { id: 4, url: "/socket.webp" },
      },
      socket: [child],
    });
    expect(shouldShowDropTargetSocket(parent, new Set([2]))).toBe(false);
  });
});
