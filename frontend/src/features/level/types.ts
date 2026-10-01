import type { MediaAsset } from "@/domain/media";
import type { RichTextBlocks } from "@/domain/richText";
import type { GoalFocusDimension, PointMatrix } from "@/domain/pointMatrix";

/** Kompatibilitäts-Alias: Level-Assets nutzen das Domänen-`MediaAsset`. */
export type { MediaAsset as StrapiMedia } from "@/domain/media";
export type { PointMatrix, GoalFocusDimension } from "@/domain/pointMatrix";

export type Vector2 = {
  x: number;
  y: number;
};

export type Spritesheet = {
  id: number;
  url: string;
  frameSize: Vector2;
  frameCount: number;
  gridColumns: number;
  gridRows?: number;
  frameRate: number;
  frameDuration: number;
};

type Question = {
  id: number;
  question: string;
  answers: Answer[];
};

type Answer = {
  id: number;
  answer: string;
  isCorrect: boolean;
  points: PointMatrix | null;
};

type TileHelper = {
  id: number;
  position: Vector2;
  size: Vector2;
  placed: boolean;
  image?: MediaAsset;
  imagePosition?: Vector2;
  imageSize?: Vector2;
};

export type TilePlacementVideoPhase = {
  web: MediaAsset;
  mov: MediaAsset;
  renderPosition?: Vector2;
  renderSize?: Vector2;
  playbackRate?: number;
};

export type TilePlacementVideo = {
  preview: MediaAsset;
  intro?: TilePlacementVideoPhase;
  loop: TilePlacementVideoPhase;
  /** Ersatzrechteck älterer Konfigurationen ohne getrennte Medienrechtecke. */
  renderPosition?: Vector2;
  renderSize?: Vector2;
};

export type Tile = {
  id: number;
  /** Entspricht `id` in `src/assets/<bezirk>/…/config.json` und CMS `uniqueId`. */
  configId?: string;
  name: string;
  /** Redaktioneller Text aus puzzleItem.content, zugeordnet über uniqueId. */
  content: RichTextBlocks | null;
  image: MediaAsset | Spritesheet;
  position: Vector2;
  size: Vector2;
  placed: boolean;
  helper: TileHelper | null;
  socket: Tile[] | null;
  placementVideo?: TilePlacementVideo | null;
  measureEffective: boolean;
  pointMatrix: PointMatrix;
  /** Puzzleteile mit fehlenden Medien sind im Streifen nicht ziehbar. */
  libraryDisabled?: boolean;
};

export type Level = {
  id: number;
  name: string;
  mission: RichTextBlocks;
  address: string;
  geoLocation: [number, number];
  maskot: {
    default: MediaAsset;
    winning: MediaAsset;
    losing: MediaAsset;
  };
  maximumTileCount: number;
  background: MediaAsset;
  backgroundCenter: Vector2;
  coordinateReference?: { width: number; height: number };
  tiles: Tile[];
  quiz: Question[];
  pointMinimum: PointMatrix;
  pointMaximum: PointMatrix;
  goalFocusWeights?: Partial<Record<GoalFocusDimension, number>>;
};
