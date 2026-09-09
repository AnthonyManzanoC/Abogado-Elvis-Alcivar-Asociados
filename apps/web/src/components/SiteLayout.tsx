import { useEffect, useState } from "react";
import { CalendarDays, Instagram, Menu, MessageCircle, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { assetUrl } from "../lib/api";
import { contactMap, safeExternalUrl, whatsappUrl } from "../lib/contact";

const nav = [
  ["/servicios", "Servicios"],
  ["/perfil", "El abogado"],
  ["/vitrina", "Vitrina"],
  ["/contacto", "Contacto"]
];

export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSite();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const whatsapp = whatsappUrl(settings.whatsapp_number, settings.whatsapp_message);
  const instagram = safeExternalUrl(settings.instagram_url);
  const tiktok = safeExternalUrl(settings.tiktok_url);
  const map = contactMap(settings);

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Inicio Alcívar Legal">
          {settings.logo_url ? <span className="brand-logo"><img src={assetUrl(settings.logo_url)} alt="" /></span> : <span className="brand-mark">AL</span>}
          <span><strong>{settings.firm_name}</strong><small>Estudio jurídico · Babahoyo</small></span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Abrir menú" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "main-nav open" : "main-nav"} aria-label="Navegación principal">
          {nav.map(([href, label]) => <NavLink key={href} to={href}>{label}</NavLink>)}
          <Link className="button button-gold nav-cta" to="/agendar"><CalendarDays size={17} /> Agendar consulta</Link>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-top">
          <div><span className="eyebrow">Alcívar Legal</span><h2>Tu caso merece una estrategia clara.</h2></div>
          <Link className="button button-light" to="/agendar">Reservar consulta <span>↗</span></Link>
        </div>
        <div className="footer-grid">
          <div>{settings.logo_url ? <span className="footer-logo"><img src={assetUrl(settings.logo_url)} alt={settings.firm_name} /></span> : <p className="footer-brand">AL</p>}<p>Defensa técnica, comunicación directa y atención confidencial en Babahoyo.</p></div>
          <div><strong>Navegación</strong>{nav.map(([href, label]) => <Link key={href} to={href}>{label}</Link>)}</div>
          <div><strong>Despacho</strong><p>{settings.office_address}</p><p>{settings.office_hours_note}</p>{map.directions && <a href={map.directions} target="_blank" rel="noopener noreferrer">Cómo llegar ↗</a>}</div>
          <div><strong>Conecta</strong>{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={16} /> Instagram</a>}{tiktok && <a href={tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}</div>
        </div>
        <div className="footer-legal"><span>© {new Date().getFullYear()} {settings.firm_name}</span><span>La información del sitio no sustituye asesoría legal individual.</span><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link><Link to="/admin">Administración</Link></div>
      </footer>
      {whatsapp && <a className="floating-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp"><MessageCircle /></a>}
    </div>
  );
}
