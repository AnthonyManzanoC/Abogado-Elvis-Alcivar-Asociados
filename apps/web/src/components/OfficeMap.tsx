import { useState } from "react";
import { ExternalLink, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { contactMap } from "../lib/contact";
import type { SiteSettings } from "../types";

export type MapSettings = Pick<SiteSettings, "firm_name" | "office_address" | "office_directions" | "maps_url" | "map_enabled" | "map_embed_url" | "map_query" | "map_load_on_click">;

export function OfficeMap({ settings, preview = false }: { settings: MapSettings; preview?: boolean }) {
  const map = contactMap(settings);
  const [consentedTo, setConsentedTo] = useState("");
  const [failedSource, setFailedSource] = useState("");
  const visible = settings.map_enabled && Boolean(map.embed);
  const loaded = !settings.map_load_on_click || consentedTo === map.embed;
  if (!settings.map_enabled && !preview) return null;

  return <section className={preview ? "office-map office-map-preview" : "office-map page-section"} aria-label={preview ? "Vista previa del mapa" : "Ubicación del despacho"}>
    <div className="office-map-heading"><div><span className="eyebrow">{preview ? "Vista previa · aún sin publicar" : "Encuéntranos"}</span><h2>{preview ? "Así se verá tu ubicación" : "Una conversación, en el lugar indicado."}</h2></div>{map.directions && <a className="button button-dark" href={map.directions} target="_blank" rel="noopener noreferrer"><Navigation size={18} /> Cómo llegar</a>}</div>
    <div className="office-map-frame">
      {visible && loaded && failedSource !== map.embed ? <iframe key={map.embed} src={map.embed} title={`Mapa de ${settings.firm_name}: ${settings.office_address}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen onError={() => setFailedSource(map.embed)} /> : <div className="office-map-gate">
        <MapPin size={32} aria-hidden="true" /><h3>{settings.firm_name}</h3><p>{settings.office_address || "Añade la dirección del despacho para mostrar el mapa."}</p>
        {visible && failedSource !== map.embed ? <><button type="button" className="button button-gold" onClick={() => setConsentedTo(map.embed)}>Ver mapa interactivo <ExternalLink size={17} /></button><small><ShieldCheck size={15} /> Al abrir el mapa te conectas con Google Maps.</small></> : <p>{settings.map_enabled ? "Puedes consultar la ubicación con el enlace de abajo." : "El mapa está oculto en la página pública."}</p>}
      </div>}
    </div>
    <div className="office-map-caption"><div><strong><MapPin size={17} /> {settings.office_address}</strong>{settings.office_directions && <p>{settings.office_directions}</p>}</div>{map.open && <a className="text-link" href={map.open} target="_blank" rel="noopener noreferrer">Abrir en Google Maps <ExternalLink size={16} /></a>}</div>
    <p className="map-service-note">Mapa proporcionado por Google Maps. Si no aparece, usa el enlace externo.{!settings.map_embed_url && " Ubicación de referencia basada en la dirección indicada."}</p>
  </section>;
}
