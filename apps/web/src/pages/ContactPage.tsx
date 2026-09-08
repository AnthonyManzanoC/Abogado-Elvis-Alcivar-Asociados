import { Clock3, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export function ContactPage() {
  const { settings } = useSite();
  const whatsapp = settings.whatsapp_number.replace(/\D/g, "");
  return <>
    <section className="contact-page page-section">
      <div className="contact-title"><span className="eyebrow">Contacto</span><h1>Hablemos con claridad sobre tu situación.</h1><p>Comparte la información inicial mediante la agenda. El detalle sensible del caso se revisará de forma privada durante la consulta.</p><Link className="button button-gold" to="/agendar">Agendar una consulta</Link></div>
      <div className="contact-panel">
        <div><MapPin /><span><small>Dirección</small><strong>{settings.office_address}</strong></span></div>
        <div><Clock3 /><span><small>Horario</small><strong>{settings.office_hours_note}</strong></span></div>
        {settings.phone && <div><Phone /><span><small>Teléfono</small><a href={`tel:${settings.phone}`}>{settings.phone}</a></span></div>}
        {settings.contact_email && <div><Mail /><span><small>Correo</small><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></span></div>}
        <div><MessageCircle /><span><small>WhatsApp</small><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Iniciar conversación</a></span></div>
        <div><Instagram /><span><small>Redes</small><a href={settings.instagram_url} target="_blank" rel="noreferrer">@ab.elvisalcivar</a></span></div>
      </div>
    </section>
    <section className="map-placeholder page-section"><div><MapPin /><span>Sucre y 5 de Junio</span><strong>Babahoyo · Los Ríos</strong>{settings.maps_url ? <a className="text-link" href={settings.maps_url} target="_blank" rel="noreferrer">Abrir mapa ↗</a> : <span className="map-note">Enlace de mapa configurable desde ADMIN</span>}</div></section>
  </>;
}
