import { afterEach, describe, expect, it } from "vitest";

import {
  beginLevelPlayAssetPriority,
  endLevelPlayAssetPriority,
  isLevelPlayAssetPriorityHeld,
  waitUntilLevelPlayAssetPriorityClear,
} from "@/pwa/offlineContentSync";

afterEach(() => {
  while (isLevelPlayAssetPriorityHeld()) {
    endLevelPlayAssetPriority();
  }
});

describe("levelPlayAssetPriority", () => {
  it("hold refcount pauses until all ends", () => {
    expect(isLevelPlayAssetPriorityHeld()).toBe(false);

    beginLevelPlayAssetPriority();
    expect(isLevelPlayAssetPriorityHeld()).toBe(true);

    beginLevelPlayAssetPriority();
    expect(isLevelPlayAssetPriorityHeld()).toBe(true);

    endLevelPlayAssetPriority();
    expect(isLevelPlayAssetPriorityHeld()).toBe(true);

    endLevelPlayAssetPriority();
    expect(isLevelPlayAssetPriorityHeld()).toBe(false);
  });

  it("extra end is no-op when not held", () => {
    endLevelPlayAssetPriority();
    expect(isLevelPlayAssetPriorityHeld()).toBe(false);
  });

  it("wakes waiters when hold reaches zero", async () => {
    beginLevelPlayAssetPriority();

    const order: string[] = [];
    const waiter = waitUntilLevelPlayAssetPriorityClear().then(() => {
      order.push("woke");
    });

    order.push("before-end");
    endLevelPlayAssetPriority();
    await waiter;
    order.push("after");

    expect(order).toEqual(["before-end", "woke", "after"]);
    expect(isLevelPlayAssetPriorityHeld()).toBe(false);
  });
});
