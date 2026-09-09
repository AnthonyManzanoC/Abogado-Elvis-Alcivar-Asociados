import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Mail, Save, ShieldCheck, Upload } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import { completeWeek, settingsPayload, type AdminSettings, type Availability } from "../lib/admin-settings";
import { extractMapSource, mapEmbedUrl, whatsappUrl } from "../lib/contact";
import { fallbackData } from "../data";
import { useSite } from "../context/SiteContext";
import { OfficeMap, type MapSettings } from "./OfficeMap";

type Field = { key: string; label: string; max?: number; required?: boolean; full?: boolean; rows?: number; type?: string; min?: number; hint?: string };
const identityFields: Field[] = [
  { key: "firm_name", label: "Nombre del estudio", required: true, max: 120 },
  { key: "attorney_name", label: "Nombre del abogado", required: true, max: 150 },
  { key: "professional_title", label: "Título profesional verificado", required: true, max: 150 },
  { key: "tagline", label: "Frase principal", required: true, max: 180 },
  { key: "biography", label: "Biografía", rows: 5, full: true, max: 10000 }
];
const contactFields: Field[] = [
  { key: "contact_heading", label: "Título de la página Contacto", required: true, max: 180, full: true },
  { key: "contact_intro", label: "Presentación de contacto", rows: 3, max: 1200, full: true },
  { key: "phone", label: "Teléfono", type: "tel", max: 40 },
  { key: "whatsapp_number", label: "WhatsApp (con código de país)", type: "tel", max: 30, hint: "Ejemplo de formato: +593 seguido del número, sin el cero inicial." },
  { key: "contact_email", label: "Correo del abogado", type: "email", max: 180 },
  { key: "office_hours_note", label: "Horario visible", max: 300 },
  { key: "whatsapp_message", label: "Mensaje inicial de WhatsApp", rows: 2, max: 500, full: true, hint: "Se usa en Contacto y en el botón flotante. La confirmación de cita conserva sus propios detalles." },
  { key: "instagram_url", label: "Instagram", type: "url", max: 2000 },
  { key: "tiktok_url", label: "TikTok", type: "url", max: 2000 }
];
const locationFields: Field[] = [
  { key: "office_address", label: "Dirección pública", max: 300, full: true },
  { key: "office_directions", label: "Indicaciones para encontrar la oficina", rows: 2, max: 1000, full: true, hint: "Añade piso, número de oficina o una referencia real. Se mostrará debajo del mapa." },
  { key: "map_query", label: "Dirección o coordenadas para el mapa", max: 300, full: true, hint: "Opcional. Si lo dejas vacío se usa la dirección pública. También determina el destino de Cómo llegar." },
  { key: "maps_url", label: "Enlace externo de Google Maps", type: "url", max: 2000, full: true, hint: "Opcional. Aquí sí puedes pegar un enlace corto para Abrir en Google Maps." }
];
const smtpFields: Field[] = [
  { key: "smtp_host", label: "Host SMTP", max: 300 }, { key: "smtp_port", label: "Puerto", type: "number", min: 1, max: 65535 },
  { key: "smtp_user", label: "Usuario SMTP", max: 300 }, { key: "smtp_from_email", label: "Correo remitente", type: "email", max: 180 },
  { key: "smtp_from_name", label: "Nombre remitente", max: 200 }
];

export function SettingsView({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { refresh } = useSite();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const [next, hours] = await Promise.all([api<AdminSettings>("/api/admin/settings"), api<Availability[]>("/api/admin/availability")]);
      setSettings({ ...fallbackData.settings, ...next }); setAvailability(completeWeek(hours)); setDirty(false);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "No fue posible cargar la configuración"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (loading) return <div className="admin-loader"><LoaderCircle className="spin" /> Cargando configuración…</div>;
  if (loadError || !settings) return <div className="settings-load-error"><p className="form-error" role="alert">{loadError}</p><button className="button button-dark" onClick={() => void load()}>Volver a intentar</button></div>;
  const value = (key: string) => String(settings[key] ?? "");
  const set = (key: string, val: string | number | boolean) => { setSettings(previous => previous ? { ...previous, [key]: val } : previous); setDirty(true); setNotice(null); };
  const embedError = value("map_embed_url") && !mapEmbedUrl(value("map_embed_url")) ? "Usa el mapa de Compartir → Insertar un mapa. Un enlace corto funciona solo en el campo de enlace externo." : "";
  const mapSettings: MapSettings = {
    firm_name: value("firm_name"), office_address: value("office_address"), office_directions: value("office_directions"),
    maps_url: value("maps_url"), map_enabled: Boolean(settings.map_enabled), map_embed_url: value("map_embed_url"), map_query: value("map_query"), map_load_on_click: Boolean(settings.map_load_on_click)
  };
  const fields = (items: Field[]) => <div className="form-grid">{items.map(field => <label className={`field${field.full ? " full" : ""}`} key={field.key}><span>{field.label}</span>{field.rows ? <textarea name={field.key} rows={field.rows} value={value(field.key)} maxLength={field.max} required={field.required} onChange={e => set(field.key, e.target.value)} /> : <input name={field.key} type={field.type ?? "text"} value={value(field.key)} maxLength={field.type !== "number" ? field.max : undefined} min={field.min} max={field.type === "number" ? field.max : undefined} required={field.required} onChange={e => set(field.key, field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />}{field.hint && <small className="settings-hint">{field.hint}</small>}</label>)}</div>;
  const toggle = (key: string, label: string) => <label className="toggle-line" key={key}><input type="checkbox" name={key} checked={Boolean(settings[key])} onChange={e => set(key, e.target.checked)} /><span>{label}</span></label>;
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy || embedError) return;
    setBusy(true); setNotice(null);
    try {
      const next = await api<AdminSettings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(settingsPayload(settings, availability, smtpPassword)) });
      setSettings(next); setSmtpPassword(""); setDirty(false);
      await refresh(); setNotice({ text: "Configuración y horarios guardados. El sitio público ya usa los cambios." });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : "No fue posible guardar. Tus cambios siguen en el formulario.", error: true }); }
    finally { setBusy(false); }
  };
  const uploadLogo = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setNotice({ text: "Elige un logo PNG, JPG o WebP de hasta 5 MB.", error: true }); return; }
    setBusy(true);
    try { const data = new FormData(); data.append("file", file); const result = await api<{ url: string }>("/api/admin/uploads", { method: "POST", body: data }); set("logo_url", result.url); setNotice({ text: "Logo cargado. Guarda los cambios para publicarlo." }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "No fue posible cargar el logo", error: true }); }
    finally { setBusy(false); }
  };
  const testSmtp = async () => {
    if (dirty) { setNotice({ text: "Guarda los cambios antes de probar SMTP para usar la configuración nueva.", error: true }); return; }
    const recipient = window.prompt("¿A qué correo enviamos la prueba?", value("contact_email")); if (!recipient) return;
    setBusy(true);
    try { await api("/api/admin/settings/test-smtp", { method: "POST", body: JSON.stringify({ recipient }) }); setNotice({ text: "Correo de prueba enviado." }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "No fue posible enviar", error: true }); }
    finally { setBusy(false); }
  };

  return <>
    <div className="admin-page-title"><div><span>Control central</span><h1>Configuración del sistema</h1></div><a className="text-link" href="/contacto" target="_blank" rel="noopener noreferrer">Ver contacto público ↗</a></div>
    <form onSubmit={save} className="settings-form settings-enhanced">
      <fieldset className="settings-fields" disabled={busy}>
        <section className="admin-panel settings-section"><header><div><span>Identidad</span><h2>Perfil del despacho</h2></div></header>
          <div className="logo-manager"><div className="logo-preview">{value("logo_url") ? <img src={assetUrl(value("logo_url"))} alt="Vista previa del logo" /> : <span>AL</span>}</div><div><strong>Logo principal</strong><p>PNG, JPG o WebP. Hasta 5 MB.</p><label className="upload-field"><Upload /> Subir logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadLogo(file); e.target.value = ""; }} /></label>{value("logo_url") && <button type="button" className="text-link remove-logo" onClick={() => set("logo_url", "")}>Quitar logo de la web</button>}</div></div>{fields(identityFields)}
        </section>
        <section className="admin-panel settings-section"><header><div><span>Contacto</span><h2>Textos y canales de atención</h2></div></header>{fields(contactFields)}{whatsappUrl(value("whatsapp_number"), value("whatsapp_message")) && <p className="settings-hint"><a className="text-link" href={whatsappUrl(value("whatsapp_number"), value("whatsapp_message"))} target="_blank" rel="noopener noreferrer">Probar mensaje de WhatsApp ↗</a></p>}</section>
        <section className="admin-panel settings-section"><header><div><span>Ubicación</span><h2>Mapa del despacho</h2></div></header>{fields(locationFields)}
          <div className="form-grid"><label className="field full"><span>Mapa exacto de Google (opcional)</span><textarea rows={3} maxLength={8000} value={value("map_embed_url")} aria-invalid={Boolean(embedError)} aria-describedby="map-embed-help" onChange={e => set("map_embed_url", extractMapSource(e.target.value))} placeholder="https://www.google.com/maps/embed?pb=…" /><small id="map-embed-help" className="settings-hint">En Google Maps: Compartir → Insertar un mapa → Copiar HTML. Puedes pegar ese código aquí: solo se guarda la dirección segura del mapa. Si lo dejas vacío, se busca la dirección indicada.</small>{embedError && <small className="form-error" role="alert">{embedError}</small>}</label></div>
          <div className="toggle-grid">{toggle("map_enabled", "Mostrar mapa en la página de Contacto")}{toggle("map_load_on_click", "Cargar Google Maps solo cuando el visitante pulse Ver mapa")}</div>
          <p className="settings-hint">Si desactivas la carga con clic, Google Maps se cargará automáticamente al acercarse el visitante al mapa. Verifica que el marcador y el destino de Cómo llegar correspondan a tu oficina.</p>
          <OfficeMap settings={mapSettings} preview />
        </section>
        <section className="admin-panel settings-section"><header><div><span>Agenda</span><h2>Disponibilidad semanal</h2></div></header>{fields([{ key: "consultation_minutes", label: "Duración de consulta (minutos)", type: "number", min: 15, max: 240, required: true }])}<div className="schedule-list settings-schedule">{availability.map((item, index) => {
          const day = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][item.day_of_week];
          const change = (key: keyof Availability, val: string | boolean) => { setAvailability(previous => previous.map((row, i) => i === index ? { ...row, [key]: val } : row)); setDirty(true); };
          return <div key={index}><strong>{day}</strong><label><span>Desde</span><input aria-label={`${day}: hora inicial, intervalo ${index + 1}`} type="time" required value={item.start_time.slice(0, 5)} onChange={e => change("start_time", e.target.value)} /></label><label><span>Hasta</span><input aria-label={`${day}: hora final, intervalo ${index + 1}`} type="time" required value={item.end_time.slice(0, 5)} onChange={e => change("end_time", e.target.value)} /></label><label className="toggle-line"><input type="checkbox" checked={item.active} onChange={e => change("active", e.target.checked)} /><span>Activo</span></label></div>;
        })}</div></section>
        <section className="admin-panel settings-section"><header><div><span>Notificaciones</span><h2>Servidor SMTP</h2></div><button type="button" className="text-link" onClick={() => void testSmtp()}><Mail /> Probar SMTP</button></header><p className="settings-hint">La contraseña se cifra antes de guardarse. Déjala vacía para conservar la actual.</p>{fields(smtpFields)}<div className="form-grid"><label className="field"><span>Contraseña SMTP {settings.smtpPasswordConfigured ? "(configurada)" : ""}</span><input type="password" autoComplete="new-password" maxLength={500} value={smtpPassword} onChange={e => { setSmtpPassword(e.target.value); setDirty(true); }} /></label></div><div className="toggle-grid">{toggle("smtp_secure", "Conexión segura SSL/TLS")}{toggle("notify_attorney", "Avisar al abogado")}{toggle("notify_client", "Confirmar al cliente")}{toggle("reminders_enabled", "Recordatorio 24 h antes")}</div></section>
      </fieldset>
      <div className="settings-save settings-save-bar"><div aria-live="polite">{notice ? <p className={notice.error ? "settings-feedback-error" : "settings-feedback-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p> : <span>{dirty ? "Tienes cambios sin guardar" : "Configuración al día"}</span>}</div><button className="button button-gold" disabled={busy || Boolean(embedError)}>{busy ? <LoaderCircle className="spin" /> : <Save />} {busy ? "Procesando…" : "Guardar cambios"}</button></div>
    </form>
    <PasswordPanel />
  </>;
}

function PasswordPanel() {
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element);
    if (form.get("newPassword") !== form.get("confirmPassword")) { setNotice({ text: "Las contraseñas nuevas no coinciden", error: true }); return; }
    setSaving(true); setNotice(null);
    try { await api("/api/admin/password", { method: "PUT", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) }); element.reset(); setNotice({ text: "Contraseña actualizada correctamente" }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "No fue posible actualizarla", error: true }); }
    finally { setSaving(false); }
  };
  return <form className="admin-panel settings-section password-panel" onSubmit={submit}><header><div><span>Seguridad</span><h2>Cambiar contraseña ADMIN</h2></div></header>{notice && <p className={notice.error ? "form-error" : "admin-message"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}<div className="form-grid"><label className="field"><span>Contraseña actual</span><input type="password" name="currentPassword" required autoComplete="current-password" disabled={saving} /></label><span /><label className="field"><span>Nueva contraseña</span><input type="password" name="newPassword" minLength={12} required autoComplete="new-password" disabled={saving} /></label><label className="field"><span>Confirmar nueva contraseña</span><input type="password" name="confirmPassword" minLength={12} required autoComplete="new-password" disabled={saving} /></label></div><button className="button button-dark" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <ShieldCheck />} Actualizar contraseña</button></form>;
}
