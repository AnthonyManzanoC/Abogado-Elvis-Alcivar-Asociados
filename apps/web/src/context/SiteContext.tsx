import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fallbackData } from "../data";
import { api } from "../lib/api";
import type { BootstrapData } from "../types";

type SiteContextValue = BootstrapData & { loading: boolean; refresh: () => Promise<void> };
const SiteContext = createContext<SiteContextValue>({ ...fallbackData, loading: true, refresh: async () => {} });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      setData(await api<BootstrapData>("/api/public/bootstrap"));
    } catch {
      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  return <SiteContext.Provider value={{ ...data, loading, refresh }}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
