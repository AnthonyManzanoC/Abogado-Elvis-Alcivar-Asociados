import { Clock3, Instagram, Mail, MapPin, MessageCircle, Phone, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { OfficeMap } from "../components/OfficeMap";
import { safeExternalUrl, whatsappUrl } from "../lib/contact";

export function ContactPage() {
  const { settings } = useSite();
  const whatsapp = whatsappUrl(settings.whatsapp_number, settings.whatsapp_message);
  const instagram = safeExternalUrl(settings.instagram_url);
  const tiktok = safeExternalUrl(settings.tiktok_url);
  return <>
    <section className="contact-page page-section">
      <div className="contact-title"><span className="eyebrow">Contacto</span><h1>{settings.contact_heading}</h1><p>{settings.contact_intro}</p><Link className="button button-gold" to="/agendar">Agendar una consulta</Link></div>
      <div className="contact-panel">
        <div><MapPin /><span><small>Dirección</small><strong>{settings.office_address}</strong></span></div>
        <div><Clock3 /><span><small>Horario</small><strong>{settings.office_hours_note}</strong></span></div>
        {settings.phone && <div><Phone /><span><small>Teléfono</small><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a></span></div>}
        {settings.contact_email && <div><Mail /><span><small>Correo</small><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></span></div>}
        {whatsapp && <div><MessageCircle /><span><small>WhatsApp</small><a href={whatsapp} target="_blank" rel="noopener noreferrer">Iniciar conversación ↗</a></span></div>}
        {instagram && <div><Instagram /><span><small>Instagram</small><a href={instagram} target="_blank" rel="noopener noreferrer">Ver perfil de Instagram ↗</a></span></div>}
        {tiktok && <div><Video /><span><small>TikTok</small><a href={tiktok} target="_blank" rel="noopener noreferrer">Ver videos en TikTok ↗</a></span></div>}
      </div>
    </section>
    <OfficeMap settings={settings} />
  </>;
}
