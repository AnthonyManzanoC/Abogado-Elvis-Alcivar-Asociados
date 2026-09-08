import { ArrowRight, BookOpen, Compass, Handshake, Quote, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export function ProfilePage() {
  const { settings } = useSite();
  return <>
    <section className="profile-hero page-section">
      <div className="profile-portrait"><img src="/images/elvis-gray.png" alt={settings.attorney_name} /><div className="portrait-monogram">EA</div></div>
      <div className="profile-intro"><span className="eyebrow">Perfil profesional</span><h1>Elvis<br /><em>Alcívar Burgos</em></h1><p className="profile-role">{settings.professional_title} · Babahoyo</p><p>{settings.biography}</p><Link className="button button-gold" to="/agendar">Conversar sobre mi caso <ArrowRight size={18} /></Link></div>
    </section>
    <section className="profile-quote page-section"><Quote /><blockquote>“Una defensa sólida comienza escuchando con atención y preparando cada decisión con criterio.”</blockquote></section>
    <section className="profile-story page-section">
      <div><span className="eyebrow">Enfoque de trabajo</span><h2>Rigor técnico con una comunicación que puedas entender.</h2></div>
      <div><p>Un proceso legal puede sentirse incierto. Por eso, además de la preparación jurídica, el trabajo exige explicar qué sucede, qué viene después y por qué se toma cada decisión.</p><p>La atención es directa y confidencial. Cada consulta se analiza según sus propios hechos; no se ofrecen respuestas automáticas ni promesas de resultados.</p></div>
    </section>
    <section className="values-grid page-section">
      {[{icon:BookOpen,title:'Preparación',copy:'Revisión metódica del expediente, la evidencia y el contexto procesal.'},{icon:Compass,title:'Estrategia',copy:'Decisiones ordenadas por prioridad, riesgo y objetivo jurídico.'},{icon:Handshake,title:'Cercanía',copy:'Trato directo, lenguaje claro y seguimiento de los pasos relevantes.'},{icon:Scale,title:'Integridad',copy:'Expectativas honestas y actuación profesional responsable.'}].map(({icon:Icon,title,copy}) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}
    </section>
    <section className="office-feature">
      <div className="office-copy"><span className="eyebrow">El despacho</span><h2>Un espacio para estudiar tu caso con calma y confidencialidad.</h2><p>Atención presencial con cita previa en el centro de Babahoyo.</p><Link className="text-link" to="/contacto">Ver ubicación <ArrowRight size={17} /></Link></div>
      <img src="/images/elvis-office.png" alt="Despacho de Alcívar Legal en Babahoyo" />
    </section>
  </>;
}
