import type { SiteSettings } from "../types";

export function safeExternalUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function mapEmbedUrl(value = "") {
  const safe = safeExternalUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  if (!["www.google.com", "maps.google.com", "google.com"].includes(url.hostname) || url.port) return "";
  const valid = url.pathname === "/maps/embed" && Boolean(url.searchParams.get("pb"))
    || /^\/maps\/?$/.test(url.pathname) && url.searchParams.get("output") === "embed" && Boolean(url.searchParams.get("q"));
  return valid ? safe : "";
}

// Extract only a trusted iframe source; never render pasted HTML.
export function extractMapSource(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("<")) return trimmed;
  const source = trimmed.match(/<iframe\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
  return source ? mapEmbedUrl(source.replaceAll("&amp;", "&")) || trimmed : trimmed;
}

export function contactMap(settings: Pick<SiteSettings, "office_address" | "map_query" | "map_embed_url" | "maps_url">) {
  const query = settings.map_query?.trim() || settings.office_address.trim();
  return {
    query,
    embed: mapEmbedUrl(settings.map_embed_url) || (query ? `https://www.google.com/maps?${new URLSearchParams({ q: query, output: "embed", hl: "es" })}` : ""),
    open: safeExternalUrl(settings.maps_url) || (query ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query })}` : ""),
    directions: query ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: query })}` : ""
  };
}

export function whatsappUrl(number: string, message = "") {
  const digits = number.replace(/[\s()+-]/g, "");
  if (!/^\d{8,15}$/.test(digits)) return "";
  return `https://wa.me/${digits}${message.trim() ? `?${new URLSearchParams({ text: message.trim() })}` : ""}`;
}
