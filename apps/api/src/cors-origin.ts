/**
 * The permanent production hostname is intentionally an explicit allow-list
 * entry, not a wildcard.  This keeps the public Vercel deployment available
 * if a Render environment is created before FRONTEND_URL is configured.
 */
export const canonicalProductionFrontendOrigin = "https://abogado-elvis-alcivar-asociados.vercel.app";

function normalizeConfiguredOrigin(value: string): string {
  const candidate = value.trim();
  if (!candidate) throw new Error("FRONTEND_URL contiene un origen vacío");

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`FRONTEND_URL contiene una URL inválida: ${candidate}`);
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("FRONTEND_URL solo admite orígenes HTTP o HTTPS");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("FRONTEND_URL debe contener solo el origen, sin ruta, credenciales, consulta ni fragmento");
  }

  // URL.origin removes the harmless final slash and normalizes host casing.
  return parsed.origin;
}

/**
 * Builds a strict, normalized list for CORS.  A manually configured domain is
 * added to the list; it never replaces the known production Vercel origin.
 */
export function configuredFrontendOrigins(value: string | undefined, nodeEnv: string): string[] {
  const defaults = nodeEnv === "production"
    ? [canonicalProductionFrontendOrigin]
    : ["http://localhost:5173"];
  const configured = value?.trim()
    ? value.split(",").map(normalizeConfiguredOrigin)
    : [];

  return [...new Set([...defaults, ...configured])];
}

/** Browser Origin headers are already serialized origins. Do not normalize a
 * request header: accepting paths, `null`, or malformed Origin values would
 * weaken the allow-list. Requests with no Origin are non-browser requests. */
export function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  return !origin || allowedOrigins.includes(origin);
}
