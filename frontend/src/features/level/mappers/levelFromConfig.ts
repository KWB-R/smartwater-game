import {
  resolveSmartwaterLevelAssetUrl,
  tryResolveSmartwaterLevelAssetUrl,
} from "@/features/level/services/levelAssetService";
import type {
  Level,
  PointMatrix,
  Tile,
  TilePlacementVideo,
  TilePlacementVideoPhase,
} from "@/features/level/types";
import type { StrapiMedia } from "@/types/strapi";
import type {
  LevelConfigJson,
  LevelConfigObject,
} from "@/features/level/schemas/levelConfigSchema";
import { normalizeConfigPlaybackRate } from "@/features/level/utils/videoPlaybackRate";
import {
  configPointToDesign,
  configSizeToDesign,
  DEFAULT_LEVEL_CONFIG_REFERENCE,
  type ConfigReference,
} from "@/features/level/utils/configSpace";
import { DESIGN_H, DESIGN_W } from "@/components/features/level/scene/bridge/designViewRect";
import { emptyPoints } from "@/features/level/logic/points";

export type LevelConfig = LevelConfigJson;

type MediaFactory = (url: string) => StrapiMedia;

/** Vergibt IDs innerhalb eines Levelaufbaus, unabhängig von zuvor geladenen Levels. */
function createMediaFactory(): MediaFactory {
  let nextMediaId = 4000;
  return (url) => ({ id: nextMediaId++, url });
}

function toPos(
  p: { x: number; y: number },
  ref: ConfigReference,
): { x: number; y: number } {
  return configPointToDesign(p, ref);
}

function toSize(
  s: { width: number; height: number },
  ref: ConfigReference,
): { x: number; y: number } {
  return configSizeToDesign(s, ref);
}

type ConfigMediaRef = {
  url: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  playbackRate?: number;
};

type TransparentVideoVariant = "web" | "mov";

function normalizeTransparentVideoConfigUrl(
  configUrl: string,
  variant: TransparentVideoVariant,
): string {
  const ext = variant === "web" ? ".webm" : ".mov";
  return configUrl.replace(/\.(webm|mov|mp4|m4v)$/i, ext);
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
  return rel;
}

function resolveBundledFile(
  urlMap: Map<string, string>,
  assetsFolder: string,
  file: string,
): string {
  return resolveSmartwaterLevelAssetUrl(urlMap, assetsFolder, file);
}

function resolveBundledUrl(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
): string {
  const file = configUrlToRelativeFile(configUrl, assetsFolder);
  return resolveBundledFile(urlMap, assetsFolder, file);
}

function tryResolveBundledUrl(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
): string | null {
  const file = configUrlToRelativeFile(configUrl, assetsFolder);
  return tryResolveSmartwaterLevelAssetUrl(urlMap, assetsFolder, file);
}

function tryResolveTransparentVideoUrl(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
  variant: TransparentVideoVariant,
): string | null {
  const normalized = normalizeTransparentVideoConfigUrl(configUrl, variant);
  return tryResolveBundledUrl(urlMap, assetsFolder, normalized);
}

function resolveTransparentVideoUrl(
  urlMap: Map<string, string>,
  assetsFolder: string,
  configUrl: string,
  variant: TransparentVideoVariant,
): string {
  const normalized = normalizeTransparentVideoConfigUrl(configUrl, variant);
  return resolveBundledUrl(urlMap, assetsFolder, normalized);
}

function videoRenderBox(
  ref: ConfigMediaRef | undefined,
  coordRef: ConfigReference,
): {
  renderPosition?: { x: number; y: number };
  renderSize?: { x: number; y: number };
} {
  if (!ref?.position || !ref.size) return {};
  return {
    renderPosition: toPos(ref.position, coordRef),
    renderSize: toSize(ref.size, coordRef),
  };
}

function phaseRenderFields(
  ref: ConfigMediaRef | undefined,
  coordRef: ConfigReference,
): Partial<Pick<TilePlacementVideoPhase, "renderPosition" | "renderSize">> {
  const box = videoRenderBox(ref, coordRef);
  if (!box.renderPosition || !box.renderSize) return {};
  return {
    renderPosition: box.renderPosition,
    renderSize: box.renderSize,
  };
}

function stableTileId(configId: string): number {
  let n = 0;
  for (let i = 0; i < configId.length; i++) {
    n = (Math.imul(33, n) + configId.charCodeAt(i)) >>> 0;
  }
  return (n % 900_000) + 100;
}

function placementVideoHasUrl(
  placementVideo: LevelConfigObject["placementVideo"],
): boolean {
  if (!placementVideo) return false;
  return placementVideo.loop.url.trim().length > 0;
}

function isPlaceableConfigObject(obj: LevelConfigObject): boolean {
  return Boolean(obj.socket) || placementVideoHasUrl(obj.placementVideo);
}

function buildPlacementVideo(
  obj: LevelConfigObject,
  urlMap: Map<string, string>,
  assetsFolder: string,
  coordRef: ConfigReference,
  media: MediaFactory,
): TilePlacementVideo | null {
  const pv = obj.placementVideo;
  if (!pv) {
    return null;
  }

  const introRef = pv.intro as ConfigMediaRef | undefined;
  const loopRef = pv.loop as ConfigMediaRef;
  const previewResolved = tryResolveBundledUrl(
    urlMap,
    assetsFolder,
    obj.image.url,
  );
  const renderFrom: ConfigMediaRef | undefined = introRef ?? loopRef;

  if (!loopRef.url.trim()) {
    return null;
  }

  const transparentPair = (configUrl: string) => ({
    web: tryResolveTransparentVideoUrl(urlMap, assetsFolder, configUrl, "web"),
    mov: tryResolveTransparentVideoUrl(
      urlMap,
      assetsFolder,
      configUrl,
      "mov",
    ),
  });

  const introPair = introRef?.url ? transparentPair(introRef.url) : null;
  const loopPair = transparentPair(loopRef.url);

  if (!loopPair.web && !loopPair.mov) {
    return null;
  }

  const introPlaybackRate = normalizeConfigPlaybackRate(introRef?.playbackRate);
  const loopPlaybackRate = normalizeConfigPlaybackRate(loopRef.playbackRate);

  return {
    preview: media(previewResolved ?? ""),
    ...(introPair && (introPair.web || introPair.mov)
      ? {
          intro: {
            web: media(introPair.web ?? ""),
            mov: media(introPair.mov ?? ""),
            ...phaseRenderFields(introRef, coordRef),
            ...(introPlaybackRate !== undefined
              ? { playbackRate: introPlaybackRate }
              : {}),
          },
        }
      : {}),
    loop: {
      web: media(loopPair.web ?? ""),
      mov: media(loopPair.mov ?? ""),
      ...phaseRenderFields(loopRef, coordRef),
      ...(loopPlaybackRate !== undefined ? { playbackRate: loopPlaybackRate } : {}),
    },
    ...videoRenderBox(renderFrom, coordRef),
  };
}

function buildTileFromObject(
  obj: LevelConfigObject,
  urlMap: Map<string, string>,
  assetsFolder: string,
  coordRef: ConfigReference,
  media: MediaFactory,
): Tile {
  const tileId = stableTileId(obj.id);
  const imgPos = toPos(obj.image.position ?? { x: 0, y: 0 }, coordRef);
  const imgSize = toSize(
    obj.image.size ?? {
      width: coordRef.width,
      height: coordRef.height,
    },
    coordRef,
  );
  const imageResolved = tryResolveBundledUrl(urlMap, assetsFolder, obj.image.url);

  const socket = obj.socket;
  let helper: Tile["helper"] = null;
  if (socket?.position && socket.size) {
    const sockPos = toPos(socket.position, coordRef);
    const sockSize = toSize(socket.size, coordRef);
    const socketUrl = tryResolveBundledUrl(urlMap, assetsFolder, socket.url);
    helper = {
      id: tileId + 300,
      position: imgPos,
      size: imgSize,
      placed: false,
      image: media(socketUrl ?? ""),
      imagePosition: sockPos,
      imageSize: sockSize,
    };
  }

  const placementVideo = buildPlacementVideo(
    obj,
    urlMap,
    assetsFolder,
    coordRef,
    media,
  );
  const emptyMatrix: PointMatrix = emptyPoints();
  const needsPlacementVideo = placementVideoHasUrl(obj.placementVideo);
  const libraryDisabled =
    !imageResolved || (needsPlacementVideo && placementVideo == null);

  return {
    id: tileId,
    configId: obj.id,
    name: "",
    content: null,
    image: media(imageResolved ?? ""),
    position: imgPos,
    size: imgSize,
    placed: false,
    helper,
    socket: null,
    placementVideo,
    measureEffective: true,
    pointMatrix: emptyMatrix,
    ...(libraryDisabled ? { libraryDisabled: true } : {}),
  };
}

export type LevelFromConfigOptions = {
  assetsFolder: string;
  config: LevelConfig;
};

export function buildLevelFromConfig(
  urlMap: Map<string, string>,
  options: LevelFromConfigOptions,
): Level {
  const { assetsFolder, config } = options;
  const coordRef = DEFAULT_LEVEL_CONFIG_REFERENCE;
  const media = createMediaFactory();

  const tiles: Tile[] = [];
  for (const obj of config.objects) {
    if (!isPlaceableConfigObject(obj)) continue;
    tiles.push(buildTileFromObject(obj, urlMap, assetsFolder, coordRef, media));
  }

  const backgroundUrl =
    tryResolveBundledUrl(urlMap, assetsFolder, config.background.url) ?? "";

  const maximumTileCount =
    config.maxPuzzleItems ?? computeMaximumTileCount(config);

  return {
    id: 3,
    name: config.name,
    address: "",
    geoLocation: [0, 0],
    maskot: {
      default: { id: 301, url: "" },
      winning: { id: 302, url: "" },
      losing: { id: 303, url: "" },
    },
    mission: [],
    maximumTileCount,
    background: media(backgroundUrl),
    backgroundCenter: { x: DESIGN_W / 2, y: DESIGN_H / 2 },
    coordinateReference: {
      width: coordRef.width,
      height: coordRef.height,
    },
    pointMinimum: {
      default: 3,
      cooling: 2,
      flooding: 1,
      water: 1,
      biodiversity: 2,
      quality: 1,
    },
    pointMaximum: {
      default: 8,
      cooling: 8,
      flooding: 5,
      water: 5,
      biodiversity: 9,
      quality: 7,
    },
    goalFocusWeights: {
      cooling: 2,
      biodiversity: 2,
    },
    tiles,
    quiz: [],
  };
}

export type LevelEndAnimationUrls = {
  webUrl: string;
  movUrl: string;
};

export type LevelEndAnimationSpec = LevelEndAnimationUrls & {
  configId: string;
  position: { x: number; y: number };
  size: { x: number; y: number };
  playbackRate?: number;
};

function endAnimationLayoutFromConfig(
  ref: ConfigMediaRef | undefined,
  coordRef: ConfigReference,
): { position: { x: number; y: number }; size: { x: number; y: number } } {
  const position = ref?.position
    ? toPos(ref.position, coordRef)
    : { x: 0, y: 0 };
  const size = ref?.size
    ? toSize(ref.size, coordRef)
    : { x: DESIGN_W, y: DESIGN_H };
  return { position, size };
}

function endAnimationConfigId(ref: { id?: string; url: string }): string {
  if (typeof ref.id === "string" && ref.id.trim().length > 0) {
    return ref.id.trim();
  }
  return "endAnimation";
}

function resolveEndAnimationSpecFromRef(
  ref: ConfigMediaRef & { id?: string },
  urlMap: Map<string, string>,
  assetsFolder: string,
  coordRef: ConfigReference,
): LevelEndAnimationSpec | null {
  if (!ref.url?.trim()) {
    return null;
  }
  const configUrl = ref.url.trim();
  let webUrl: string;
  let movUrl: string;
  try {
    webUrl = resolveTransparentVideoUrl(urlMap, assetsFolder, configUrl, "web");
    movUrl = resolveTransparentVideoUrl(
      urlMap,
      assetsFolder,
      configUrl,
      "mov",
    );
  } catch {
    try {
      webUrl = resolveBundledFile(urlMap, assetsFolder, "endanimation.webm");
      movUrl = resolveBundledFile(urlMap, assetsFolder, "endanimation.mov");
    } catch {
      return null;
    }
  }
  const { position, size } = endAnimationLayoutFromConfig(ref, coordRef);
  const playbackRate = normalizeConfigPlaybackRate(ref.playbackRate);
  return {
    webUrl,
    movUrl,
    configId: endAnimationConfigId(ref),
    position,
    size,
    ...(playbackRate !== undefined ? { playbackRate } : {}),
  };
}

export function getLevelEndAnimationSpecs(
  urlMap: Map<string, string>,
  assetsFolder: string,
  config: LevelConfig,
): LevelEndAnimationSpec[] {
  const coordRef = DEFAULT_LEVEL_CONFIG_REFERENCE;
  const refs = config.endAnimation ?? [];
  const specs: LevelEndAnimationSpec[] = [];
  for (const ref of refs) {
    const spec = resolveEndAnimationSpecFromRef(
      ref,
      urlMap,
      assetsFolder,
      coordRef,
    );
    if (spec) {
      specs.push(spec);
    }
  }
  return specs;
}

function computeMaximumTileCount(config: LevelConfig): number {
  return config.objects.filter(isPlaceableConfigObject).length;
}

;
