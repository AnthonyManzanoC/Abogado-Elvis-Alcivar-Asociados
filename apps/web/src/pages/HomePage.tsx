import { ArrowRight, Check, ChevronRight, MapPin, Play, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { assetUrl } from "../lib/api";

const iconFor = (icon: string) => icon === "shield" ? ShieldCheck : Scale;

export function HomePage() {
  const { settings, services, publications } = useSite();
  const featured = [...publications.filter((post) => post.kind === "case"), ...publications.filter((post) => post.kind !== "case")].slice(0, 3);
  return <>
    <section className="hero page-section">
      <div className="hero-copy">
        <span className="eyebrow"><span className="live-dot" /> Atención legal en Babahoyo</span>
        <h1>Defensa que se<br />prepara. <em>Resultados</em><br />que se trabajan.</h1>
        <p>{settings.tagline} Acompañamiento legal con análisis riguroso, comunicación clara y presencia firme en cada etapa.</p>
        <div className="hero-actions">
          <Link className="button button-gold" to="/agendar">Evaluar mi caso <ArrowRight size={18} /></Link>
          <Link className="text-link" to="/perfil">Conocer al abogado <ChevronRight size={17} /></Link>
        </div>
        <div className="hero-proof">
          <div><ShieldCheck /><span><strong>Atención confidencial</strong><small>Información protegida</small></span></div>
          <div><Sparkles /><span><strong>Trato directo</strong><small>Sin intermediarios</small></span></div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-frame"><img src={assetUrl(settings.hero_image_url || "/images/elvis-burgundy.png")} alt="Abg. Elvis Alcívar Burgos" /></div>
        <div className="hero-name-card"><span>{settings.professional_title}</span><strong>Elvis<br />Alcívar Burgos</strong><small>Babahoyo · Los Ríos</small></div>
        <div className="hero-seal"><Scale /><span>Defensa<br />estratégica</span></div>
      </div>
    </section>

    <section className="trust-strip"><p><Check /> Consulta organizada</p><p><Check /> Seguimiento claro</p><p><Check /> Estrategia personalizada</p><p><Check /> Atención directa</p></section>

    <section className="page-section services-preview">
      <div className="section-heading"><div><span className="eyebrow">Áreas de práctica</span><h2>Claridad jurídica cuando más importa.</h2></div><Link className="text-link" to="/servicios">Ver todos los servicios <ArrowRight size={17} /></Link></div>
      <div className="service-grid">
        {services.slice(0, 4).map((service, index) => {
          const Icon = iconFor(service.icon);
          return <article className="service-card" key={service.id}>
            <span className="card-index">0{index + 1}</span><Icon /><h3>{service.title}</h3><p>{service.summary}</p><Link aria-label={`Ver ${service.title}`} to={`/servicios#${service.slug}`}><ArrowRight /></Link>
          </article>;
        })}
      </div>
    </section>

    <section className="about-band">
      <div className="about-image"><img src={assetUrl(settings.profile_image_url || "/images/elvis-profile-new.png")} alt="Retrato profesional del abogado Elvis Alcívar" /><span className="image-caption">Preparación · Criterio · Presencia</span></div>
      <div className="about-copy"><span className="eyebrow">El abogado</span><h2>Tu defensa, en manos de quien escucha antes de actuar.</h2><p className="lead">{settings.biography}</p><p>Cada asunto comienza con una conversación honesta: qué ocurrió, qué está en riesgo y qué opciones existen. Desde ahí se construye una ruta jurídica comprensible y responsable.</p><Link className="button button-dark" to="/perfil">Conoce su perfil <ArrowRight size={18} /></Link></div>
    </section>

    <section className="page-section showcase-preview">
      <div className="section-heading"><div><span className="eyebrow">Vitrina legal</span><h2>{settings.results_phrase || "Resultados de tener una defensa técnica y eficaz"}</h2></div><Link className="text-link" to="/vitrina">Explorar contenido <ArrowRight size={17} /></Link></div>
      <div className="publication-grid">
        {featured.map((post, index) => <article className={index === 0 ? "publication-card featured" : "publication-card"} key={post.id}>
          <div className="publication-image">{post.thumbnail_url ? <img src={assetUrl(post.thumbnail_url)} alt="" /> : <div className="publication-source-preview"><span>{post.platform}</span><strong>Publicación original</strong></div>}{post.kind === "video" && <span className="play-badge"><Play fill="currentColor" /></span>}<span className="platform-badge">{post.platform}</span></div>
          <div className="publication-body"><span>{post.kind === "case" ? "Caso publicado" : post.kind === "article" ? "Criterio legal" : "Desde el despacho"}</span><h3>{post.title}</h3><p>{post.excerpt}</p><Link className="text-link" to={`/vitrina/${post.slug}`}>Ver en vitrina <ArrowRight size={16} /></Link></div>
        </article>)}
      </div>
    </section>

    <section className="contact-ribbon page-section">
      <div><MapPin /><span><small>Atención presencial</small><strong>{settings.office_address}</strong></span></div>
      <div className="contact-ribbon-copy"><span className="eyebrow">Primer paso</span><h2>Cuéntanos brevemente qué sucede.</h2><p>El asistente de agenda te ayudará a encontrar un horario disponible y dejará listo el mensaje para WhatsApp.</p></div>
      <Link className="button button-gold" to="/agendar">Iniciar consulta <ArrowRight size={18} /></Link>
    </section>
  </>;
}
