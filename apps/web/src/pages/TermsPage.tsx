import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export function TermsPage() {
  const { settings } = useSite();
  return <article className="policy-page page-section">
    <span className="eyebrow">Términos de uso</span>
    <h1>Información clara para usar el sitio.</h1>
    <p className="policy-intro">Este sitio pertenece a {settings.firm_name} y brinda información general sobre sus servicios profesionales.</p>
    <section><h2>Información, no asesoría automática</h2><p>El contenido de la web, publicaciones y redes tiene una finalidad informativa. No crea una relación abogado-cliente, no sustituye el análisis particular de un caso ni garantiza resultados.</p></section>
    <section><h2>Agenda</h2><p>Una reserva solicita una consulta y está sujeta a confirmación, disponibilidad y a la evaluación inicial. La persona usuaria debe proporcionar datos veraces y abstenerse de enviar información innecesariamente sensible por el formulario.</p></section>
    <section><h2>Contenido de terceros</h2><p>Los enlaces y reproductores de redes sociales pertenecen a sus respectivas plataformas. {settings.firm_name} no controla su disponibilidad ni sus condiciones de uso.</p></section>
    <section><h2>Propiedad intelectual</h2><p>La marca, textos, fotografías y demás materiales del sitio no pueden reproducirse o utilizarse comercialmente sin autorización expresa, salvo los contenidos que correspondan a terceros identificados.</p></section>
    <section><h2>Contacto</h2><p>Para consultas relacionadas con estas condiciones o el uso del sitio, utiliza los canales publicados en la página de contacto.</p></section>
    <p className="policy-back"><Link className="text-link" to="/">← Volver al inicio</Link></p>
  </article>;
}
