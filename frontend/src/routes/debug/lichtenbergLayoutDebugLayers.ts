import type { LevelConfig } from "@/features/level/mappers/levelFromConfig";
import {
  listLevelConfigAssetFolders,
  requireLevelConfigForAssetsFolder,
} from "@/features/level/services/levelConfigByFolder";
import {
  buildSmartwaterAssetsUrlMap,
  resolveSmartwaterLevelAssetUrl,
} from "@/features/level/services/levelAssetService";
import { DEFAULT_LEVEL_CONFIG_REFERENCE } from "@/features/level/utils/configSpace";
import { pickTransparentVideoPlaybackUrlSync } from "@/features/level/utils/videoPlaybackUrl";

const FILE_ALIASES: Record<string, string> = {
  "baum_intro_cropped.webm": "baum_intro.webm",
};

type LichtenbergDebugLayerRole =
  | "background"
  | "content"
  | "socket"
  | "video"
  | "end";

export type LichtenbergDebugLayer = {
  key: string;
  label: string;
  configSource: string;
  configUrl: string;
  assetUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  usedConfigDefaults: boolean;
  gameUsageNote: string | null;
  mediaKind: "raster" | "video";
  videoWebUrl: string | null;
  videoMovUrl: string | null;
  role: LichtenbergDebugLayerRole;
};

type ConfigMediaRef = {
  url: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
};

const LEVEL_LAYOUT_DEBUG_REFERENCE = DEFAULT_LEVEL_CONFIG_REFERENCE;

export function resolveLevelLayoutDebugAssetsFolder(): string {
  return listLevelConfigAssetFolders()[0] ?? "";
}

function configUrlToRelativeFile(
  configUrl: string,
  assetsFolder: string,
): string {
  const trimmed = configUrl.trim().replace(/^\/+/, "");
  const levelPrefix = `${assetsFolder}/`;
  let rel = trimmed.startsWith(levelPrefix)
    ? trimmed.slice(levelPrefix.length)
    : trimmed;
  const bezirkPrefix = assetsFolder.split("/")[0];
  if (bezirkPrefix && rel.startsWith(`${bezirkPrefix}/`)) {
    rel = rel.slice(`${bezirkPrefix}/`.length);
  }
  return FILE_ALIASES[rel] ?? rel;
}

function resolveAssetUrl(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
): string | null {
  try {
    const file = configUrlToRelativeFile(configUrl, assetsFolder);
    return resolveSmartwaterLevelAssetUrl(urlMap, assetsFolder, file);
  } catch {
    return null;
  }
}

function isRasterPath(url: string): boolean {
  return /\.(webp|png|jpe?g|gif|svg)$/i.test(url);
}

function isVideoPath(url: string): boolean {
  return /\.(webm|mov|m4v|mp4)$/i.test(url);
}

function resolveVideoPlaybackUrls(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
): { web: string | null; mov: string | null } {
  const file = configUrlToRelativeFile(configUrl, assetsFolder);
  const webmFile = file.replace(/\.mov$/i, ".webm");
  const movFile = file.replace(/\.webm$/i, ".mov");

  let web: string | null = null;
  let mov: string | null = null;
  try {
    web = resolveSmartwaterLevelAssetUrl(urlMap, assetsFolder, webmFile);
  } catch {
    web = null;
  }
  try {
    mov = resolveSmartwaterLevelAssetUrl(urlMap, assetsFolder, movFile);
  } catch {
    mov = null;
  }
  return { web, mov };
}

function pushMedia(
  layers: LichtenbergDebugLayer[],
  urlMap: Map<string, string>,
  assetsFolder: string,
  key: string,
  label: string,
  configSource: string,
  ref: ConfigMediaRef,
  role: LichtenbergDebugLayerRole,
  options?: { gameUsageNote?: string | null },
): void {
  if (!ref.url?.trim()) {
    return;
  }
  const usedConfigDefaults = ref.position == null || ref.size == null;
  const pos = ref.position ?? { x: 0, y: 0 };
  const size = ref.size ?? {
    width: LEVEL_LAYOUT_DEBUG_REFERENCE.width,
    height: LEVEL_LAYOUT_DEBUG_REFERENCE.height,
  };
  const raster = isRasterPath(ref.url);
  const video = isVideoPath(ref.url);
  const playback = video
    ? resolveVideoPlaybackUrls(urlMap, assetsFolder, ref.url)
    : { web: null, mov: null };

  layers.push({
    key,
    label,
    configSource,
    configUrl: ref.url,
    assetUrl: raster
      ? resolveAssetUrl(urlMap, assetsFolder, ref.url)
      : pickTransparentVideoPlaybackUrlSync(playback.web, playback.mov),
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
    usedConfigDefaults,
    gameUsageNote: options?.gameUsageNote ?? null,
    mediaKind: video ? "video" : "raster",
    videoWebUrl: playback.web,
    videoMovUrl: playback.mov,
    role,
  });
}

function levelPlacementVideoRenderSource(
  obj: LevelConfig["objects"][number],
): string | null {
  const pv = obj.placementVideo;
  if (pv?.intro?.url && pv?.loop?.url) {
    return `objects.${obj.id}.placementVideo.intro`;
  }
  if (pv?.loop?.url) {
    return `objects.${obj.id}.placementVideo.loop`;
  }
  if (pv?.intro?.url) {
    return `objects.${obj.id}.placementVideo.intro`;
  }
  return null;
}

export function buildLichtenbergLayoutDebugLayers(
  assetsFolder: string = resolveLevelLayoutDebugAssetsFolder(),
  config: LevelConfig = requireLevelConfigForAssetsFolder(assetsFolder),
): LichtenbergDebugLayer[] {
  const urlMap = buildSmartwaterAssetsUrlMap();
  const layers: LichtenbergDebugLayer[] = [];

  pushMedia(
    layers,
    urlMap,
    assetsFolder,
    "background",
    "Hintergrund",
    "background",
    {
      url: config.background.url,
      position: { x: 0, y: 0 },
      size: {
        width: LEVEL_LAYOUT_DEBUG_REFERENCE.width,
        height: LEVEL_LAYOUT_DEBUG_REFERENCE.height,
      },
    },
    "background",
    {
      gameUsageNote:
        "Kein Rect in der Config — Debug nutzt 0,0 und Referenz 2048×2048 (wie Pixi-Skalierung auf coordinateReference).",
    },
  );

  const pixiRenderSource = levelPlacementVideoRenderSource;

  for (const obj of config.objects) {
    const imageSource = `objects.${obj.id}.image`;
    pushMedia(
      layers,
      urlMap,
      assetsFolder,
      `${obj.id}/image`,
      `${obj.id} — Bild`,
      imageSource,
      obj.image,
      "content",
      {
        gameUsageNote:
          "Tile position/size im Spiel (Design-Raum skaliert aus diesen Werten).",
      },
    );

    if (obj.socket) {
      pushMedia(
        layers,
        urlMap,
        assetsFolder,
        `${obj.id}/socket`,
        `${obj.id} — Socket`,
        `objects.${obj.id}.socket`,
        obj.socket,
        "socket",
        {
          gameUsageNote:
            "Socket-Grafik: helper.imagePosition/imageSize. Ablagezone = objects.*.image (nicht socket).",
        },
      );
    }

    const pv = obj.placementVideo;
    const levelRenderSrc = pixiRenderSource(obj);
    if (pv && typeof pv === "object") {
      for (const phase of ["intro", "loop"] as const) {
        const mediaRef = pv[phase];
        if (!mediaRef?.position || !mediaRef.size) {
          continue;
        }
        const fieldSource = `objects.${obj.id}.placementVideo.${phase}`;
        let gameUsageNote: string | null = null;
        if (levelRenderSrc === fieldSource) {
          gameUsageNote =
            phase === "intro"
              ? "Dieses Rect = Intro-Renderbox im Level (Intro-Phase)."
              : "Dieses Rect = Loop-Renderbox im Level (nach Intro bzw. allein).";
        } else if (levelRenderSrc != null && phase === "loop") {
          gameUsageNote =
            "Dieses Rect = Loop-Renderbox im Level (nach Intro bzw. allein).";
        }
        pushMedia(
          layers,
          urlMap,
          assetsFolder,
          `${obj.id}/placementVideo/${phase}`,
          `${obj.id} — ${phase}`,
          fieldSource,
          mediaRef,
          "video",
          { gameUsageNote },
        );
      }
    }
  }

  if (config.endAnimation?.length) {
    config.endAnimation.forEach((entry, index) => {
      pushMedia(
        layers,
        urlMap,
        assetsFolder,
        entry.id ? `endAnimation/${entry.id}` : `endAnimation/${index}`,
        entry.id ? `Endanimation — ${entry.id}` : `Endanimation ${index + 1}`,
        "endAnimation",
        entry,
        "end",
      );
    });
  }

  return layers;
}

/** @deprecated LEVEL_LAYOUT_DEBUG_REFERENCE verwenden. */
export const LICHTENBERG_DEBUG_REF = LEVEL_LAYOUT_DEBUG_REFERENCE;
