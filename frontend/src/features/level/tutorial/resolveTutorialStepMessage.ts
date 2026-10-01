import { createElement, type ReactNode } from "react";
import type { LevelPlayTutorialStepConfig } from "@/features/level/tutorial/types";

export function resolveTutorialStepMessage(
  step: LevelPlayTutorialStepConfig,
  maxPuzzleItems: number,
): string {
  const count = Math.max(1, Math.floor(maxPuzzleItems));
  return step.message
    .replace(/\{\{maxPuzzleItems\}\}/g, String(count))
    .replace(/\*\*/g, "");
}

const BOLD_SEGMENT = /\*\*(.+?)\*\*/g;

export function resolveTutorialStepMessageContent(
  step: LevelPlayTutorialStepConfig,
  maxPuzzleItems: number,
): ReactNode {
  const count = Math.max(1, Math.floor(maxPuzzleItems));
  const text = step.message.replace(/\{\{maxPuzzleItems\}\}/g, String(count));
  if (!text.includes("**")) {
    return text;
  }
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(BOLD_SEGMENT)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      createElement(
        "strong",
        { key: index, className: "font-bold" },
        match[1],
      ),
    );
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length === 1 ? nodes[0] : nodes;
}
