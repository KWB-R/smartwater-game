import type { LevelConfig } from "@/features/level/mappers/levelFromConfig";
import { requireLevelConfigForAssetsFolder } from "@/features/level/services/levelConfigByFolder";
import type { LichtenbergDebugLayer } from "./lichtenbergLayoutDebugLayers";
import { resolveLevelLayoutDebugAssetsFolder } from "./lichtenbergLayoutDebugLayers";

export type LichtenbergDebugSidebarGroup = {
  id: string;
  title: string;
  items: LichtenbergDebugLayer[];
};

function layerGroupId(layer: LichtenbergDebugLayer): string {
  if (layer.role === "background") {
    return "background";
  }
  if (layer.role === "end") {
    return "endAnimation";
  }
  const slash = layer.key.indexOf("/");
  return slash >= 0 ? layer.key.slice(0, slash) : layer.key;
}

function groupTitle(groupId: string, config: LevelConfig): string {
  if (groupId === "background") {
    return "Hintergrund";
  }
  if (groupId === "endAnimation") {
    return "Endanimation";
  }
  const obj = config.objects.find((o) => o.id === groupId);
  return obj?.id ?? groupId;
}

export function buildLichtenbergSidebarGroups(
  layers: LichtenbergDebugLayer[],
  assetsFolder: string = resolveLevelLayoutDebugAssetsFolder(),
): LichtenbergDebugSidebarGroup[] {
  const config = requireLevelConfigForAssetsFolder(assetsFolder);
  const byId = new Map<string, LichtenbergDebugLayer[]>();

  for (const layer of layers) {
    const id = layerGroupId(layer);
    const list = byId.get(id) ?? [];
    list.push(layer);
    byId.set(id, list);
  }

  const sortWithinGroup = (items: LichtenbergDebugLayer[]) =>
    [...items].sort((a, b) => {
      const order = (l: LichtenbergDebugLayer) => {
        if (l.role === "content") return 0;
        if (l.role === "socket") return 1;
        if (l.role === "video") return 2;
        return 3;
      };
      const d = order(a) - order(b);
      return d !== 0 ? d : a.label.localeCompare(b.label, "de");
    });

  const order = [
    "background",
    ...config.objects.map((o) => o.id),
    "endAnimation",
  ];

  const groups: LichtenbergDebugSidebarGroup[] = [];

  for (const id of order) {
    const items = byId.get(id);
    if (!items?.length) {
      continue;
    }
    groups.push({
      id,
      title: groupTitle(id, config),
      items: sortWithinGroup(items),
    });
    byId.delete(id);
  }

  for (const [id, items] of byId) {
    groups.push({
      id,
      title: groupTitle(id, config),
      items: sortWithinGroup(items),
    });
  }

  return groups;
}

export function layerKeysInGroup(
  layers: LichtenbergDebugLayer[],
  groupId: string,
): string[] {
  return layers
    .filter((l) => layerGroupId(l) === groupId)
    .map((l) => l.key);
}
