import { DESIGN_H, DESIGN_W } from "./designViewRect";

export function clientToRefSpace(
  clientX: number,
  clientY: number,
  designView: DOMRect,
): { refX: number; refY: number } {
  const relX = clientX - designView.left;
  const relY = clientY - designView.top;
  return {
    refX: relX * (DESIGN_W / designView.width),
    refY: relY * (DESIGN_H / designView.height),
  };
}
