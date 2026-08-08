import { useEffect, useState } from "react";
import { apiGet } from "./api";
import type { AppInfo, AppRegistry } from "./types";

export type RegistryStatus = "loading" | "ready" | "error";

export interface Registry {
  status: RegistryStatus;
  apps: AppInfo[];
}

/**
 * Loads the shell's micro-app catalog from `GET /api/home/apps` (Mongo-backed).
 * The whole shell waits on this at boot so routing and the launcher render from
 * live data — there is no static registry in the bundle, only the id->component
 * binding in App.tsx.
 */
export function useRegistry(): Registry {
  const [status, setStatus] = useState<RegistryStatus>("loading");
  const [apps, setApps] = useState<AppInfo[]>([]);

  useEffect(() => {
    let alive = true;
    apiGet<AppRegistry>("/api/home/apps")
      .then((r) => {
        if (!alive) return;
        setApps(r.apps);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  return { status, apps };
}
