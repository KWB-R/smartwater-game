import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Tile } from "@/features/level/types";
import {
  LEVEL_TILE_DETAIL_PARAM,
  parseTileDetailParam,
} from "./tileDetailSearchParam";

export function useLevelTileDetailUrl(stripTiles: Tile[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const detailTileId = parseTileDetailParam(
    searchParams.get(LEVEL_TILE_DETAIL_PARAM),
  );

  const detailTile = useMemo(() => {
    if (detailTileId == null) {
      return null;
    }
    return stripTiles.find((t) => t.id === detailTileId) ?? null;
  }, [detailTileId, stripTiles]);

  useEffect(() => {
    if (detailTileId == null || detailTile != null || stripTiles.length === 0) {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(LEVEL_TILE_DETAIL_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [detailTileId, detailTile, stripTiles.length, setSearchParams]);

  const setDetailTileParam = useCallback(
    (tile: Tile | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tile == null) {
            next.delete(LEVEL_TILE_DETAIL_PARAM);
          } else {
            next.set(LEVEL_TILE_DETAIL_PARAM, String(tile.id));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    detailTile,
    openDetail: setDetailTileParam,
    closeDetail: () => setDetailTileParam(null),
    selectDetail: setDetailTileParam,
  };
}
