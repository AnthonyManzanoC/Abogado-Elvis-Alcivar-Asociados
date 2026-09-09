import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fallbackData } from "../data";
import { api } from "../lib/api";
import type { BootstrapData } from "../types";

type SiteContextValue = BootstrapData & { loading: boolean; refresh: () => Promise<void> };
const SiteContext = createContext<SiteContextValue>({ ...fallbackData, loading: true, refresh: async () => {} });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const next = await api<BootstrapData>("/api/public/bootstrap");
      setData({ ...next, settings: { ...fallbackData.settings, ...next.settings } });
    } catch {
      // Keep the last successfully loaded configuration during a temporary outage.
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  return <SiteContext.Provider value={{ ...data, loading, refresh }}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
