const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("alcivar_admin_token");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error ?? "No fue posible completar la solicitud");
  return payload as T;
}

export const assetUrl = (value: string) => {
  // Uploaded files live on the API; bundled images stay on the frontend.
  return value.startsWith("/uploads/") ? `${API_URL}${value}` : value;
};

export async function downloadReceipt(id: string) {
  const response = await fetch(`${API_URL}/api/admin/receipts/${encodeURIComponent(id)}`, {headers:{Authorization:`Bearer ${sessionStorage.getItem("alcivar_admin_token") || ""}`}});
  if (!response.ok) throw new Error("No fue posible descargar el comprobante.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "comprobante." + (blob.type.includes("pdf") ? "pdf" : blob.type.includes("png") ? "png" : "jpg");
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
