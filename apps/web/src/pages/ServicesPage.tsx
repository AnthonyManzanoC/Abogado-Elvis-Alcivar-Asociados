import { ArrowRight, CheckCircle2, FileSearch, MessageSquareText, Scale, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

const icons = [ShieldCheck, Scale, FileSearch, MessageSquareText];

export function ServicesPage() {
  const { services } = useSite();
  return <>
    <section className="inner-hero page-section split-title">
      <div><span className="eyebrow">Servicios legales</span><h1>Una estrategia para cada etapa.</h1></div>
      <p>El objetivo no es llenar tu caso de términos complejos, sino convertir los hechos en una ruta jurídica clara, ordenada y defendible.</p>
    </section>
    <section className="service-list page-section">
      {services.map((service, index) => {
        const Icon = icons[index % icons.length];
        return <article id={service.slug} className="service-row" key={service.id}>
          <span className="service-number">0{index + 1}</span>
          <div className="service-icon"><Icon /></div>
          <div><h2>{service.title}</h2><p className="lead">{service.summary}</p><p>{service.description}</p></div>
          <Link className="circle-link" to={`/agendar?area=${encodeURIComponent(service.title)}`} aria-label={`Consultar sobre ${service.title}`}><ArrowRight /></Link>
        </article>;
      })}
    </section>
    <section className="process-section page-section">
      <div className="section-heading"><div><span className="eyebrow">Cómo trabajamos</span><h2>Del problema a una decisión informada.</h2></div></div>
      <div className="process-grid">
        {[['01','Escuchamos','Comprendemos los hechos, el momento procesal y lo que está en riesgo.'],['02','Analizamos','Revisamos información, documentos y alternativas aplicables al caso.'],['03','Definimos','Trazamos los siguientes pasos y explicamos expectativas de forma honesta.'],['04','Actuamos','Ejecutamos la estrategia con seguimiento y comunicación directa.']].map(([n,title,copy]) => <div key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></div>)}
      </div>
    </section>
    <section className="legal-note page-section"><CheckCircle2 /><p><strong>Evaluación responsable.</strong> Ningún resultado puede garantizarse. La estrategia y viabilidad dependen de los hechos, la evidencia y la normativa aplicable a cada asunto.</p></section>
  </>;
}
