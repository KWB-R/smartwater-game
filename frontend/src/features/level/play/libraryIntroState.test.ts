import { describe, expect, it } from "vitest";
import {
  createInitialLibraryIntroState,
  libraryIntroReducer,
  type LibraryIntroState,
} from "@/features/level/play/libraryIntroState";

function run(
  events: Parameters<typeof libraryIntroReducer>[1][],
  start: LibraryIntroState = createInitialLibraryIntroState(),
): LibraryIntroState {
  return events.reduce(libraryIntroReducer, start);
}

describe("libraryIntroReducer", () => {
  it("reset auf Initialzustand ist idempotent (kein neues Objekt)", () => {
    const initial = createInitialLibraryIntroState();
    expect(libraryIntroReducer(initial, { type: "reset" })).toBe(initial);
  });

  it("reset verwirft laufendes/fertiges Intro", () => {
    const done = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 1 },
    ]);
    const next = libraryIntroReducer(done, { type: "reset" });
    expect(next.phase).toBe("idle");
    expect(next.visibleCount).toBe(0);
    expect(next.settled).toBe(false);
  });

  it("completedImmediately überspringt das Intro und settled sofort", () => {
    const next = run([{ type: "completedImmediately", tileCount: 4 }]);
    expect(next).toMatchObject({
      phase: "done",
      visibleCount: 4,
      settled: true,
      settleMode: "immediate",
    });
  });

  it("started läuft nur aus idle", () => {
    const running = run([{ type: "started" }]);
    expect(running.phase).toBe("running");
    expect(libraryIntroReducer(running, { type: "started" })).toBe(running);
  });

  it("tileRevealed deckt gestaffelt auf und markiert das Enter-Tile", () => {
    const next = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 7, tileCount: 3 },
    ]);
    expect(next.phase).toBe("running");
    expect(next.visibleCount).toBe(1);
    expect([...next.enterTileIds]).toEqual([7]);
  });

  it("letztes Teil: done + Scroll-back-Settle bei mehrteiligem Streifen", () => {
    const next = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 2 },
      { type: "tileRevealed", tileId: 2, tileCount: 2 },
    ]);
    expect(next.phase).toBe("done");
    expect(next.visibleCount).toBe(2);
    expect(next.settled).toBe(false);
    expect(next.settleMode).toBe("afterScrollBack");
  });

  it("einzelnes Teil settled nach der Animation (kein Scroll-back)", () => {
    const next = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 1 },
    ]);
    expect(next.settleMode).toBe("afterAnim");
  });

  it("geschrumpfter Streifen (tileId null) schließt ohne Enter-Highlight ab", () => {
    const next = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 3 },
      { type: "tileRevealed", tileId: null, tileCount: 1 },
    ]);
    expect(next.phase).toBe("done");
    expect(next.enterTileIds.size).toBe(0);
  });

  it("tilesSynced passt visibleCount nur im done-Zustand an", () => {
    const running = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 3 },
    ]);
    expect(
      libraryIntroReducer(running, { type: "tilesSynced", tileCount: 5 }),
    ).toBe(running);
    const done = run([{ type: "completedImmediately", tileCount: 3 }]);
    expect(
      libraryIntroReducer(done, { type: "tilesSynced", tileCount: 5 })
        .visibleCount,
    ).toBe(5);
  });

  it("settled greift nur einmal und nur im done-Zustand", () => {
    const done = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 1, tileCount: 1 },
    ]);
    const settled = libraryIntroReducer(done, { type: "settled" });
    expect(settled.settled).toBe(true);
    expect(libraryIntroReducer(settled, { type: "settled" })).toBe(settled);
    const running = run([{ type: "started" }]);
    expect(libraryIntroReducer(running, { type: "settled" })).toBe(running);
  });

  it("enterHighlightCleared entfernt das Enter-Tile", () => {
    const next = run([
      { type: "started" },
      { type: "tileRevealed", tileId: 7, tileCount: 3 },
      { type: "enterHighlightCleared" },
    ]);
    expect(next.enterTileIds.size).toBe(0);
  });
});
