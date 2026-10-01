import { useMemo } from "react";

import { fetchMissionBonusCatalog } from "@/api/services/missionService";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { MissionBonusCatalog } from "@/types/mission";

const EMPTY_CATALOG: MissionBonusCatalog = new Map();

export function useMissionBonusCatalog(): {
  catalog: MissionBonusCatalog;
  status: "idle" | "loading" | "success" | "error";
} {
  const resource = useAsyncResource(fetchMissionBonusCatalog, []);

  const data = resource.status === "success" ? resource.data : null;
  const catalog = useMemo(() => {
    return data ?? EMPTY_CATALOG;
  }, [data]);

  return { catalog, status: resource.status };
}
