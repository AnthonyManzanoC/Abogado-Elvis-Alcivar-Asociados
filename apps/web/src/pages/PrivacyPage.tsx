import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export function PrivacyPage() {
  const { settings } = useSite();
  const contact = settings.contact_email || "el canal de contacto configurado por el despacho";
  return <article className="policy-page page-section">
    <span className="eyebrow">Información de privacidad</span>
    <h1>Tratamiento de datos para la agenda y contacto.</h1>
    <p className="policy-intro">Última actualización: {new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(new Date())}.</p>
    <section><h2>Responsable y finalidad</h2><p>{settings.firm_name}, con atención en {settings.office_address}, trata los datos que se entregan en el formulario únicamente para organizar la consulta solicitada, responder el contacto y enviar confirmaciones o recordatorios cuando esa función esté habilitada.</p></section>
    <section><h2>Datos solicitados</h2><p>La agenda solicita nombre, correo, teléfono, área de consulta, fecha/hora y una descripción inicial. No envíes documentos ni información altamente sensible por el formulario; esos antecedentes se revisan de forma confidencial durante la consulta.</p></section>
    <section><h2>Base y conservación</h2><p>Al marcar la aceptación y enviar la solicitud, autorizas el uso de esos datos para la finalidad indicada. Se conservarán solo durante el tiempo necesario para gestionar la cita, atender la relación profesional o cumplir obligaciones aplicables.</p></section>
    <section><h2>Comunicación y terceros</h2><p>Las confirmaciones pueden enviarse mediante el proveedor SMTP configurado por el despacho. El contenido de TikTok, Instagram o YouTube se carga únicamente cuando eliges reproducirlo; al hacerlo, aplican también las políticas de la plataforma respectiva.</p></section>
    <section><h2>Tus derechos</h2><p>Puedes solicitar acceso, rectificación, actualización, eliminación, oposición, portabilidad o suspensión del tratamiento, según corresponda, escribiendo a {contact}. La solicitud debe identificarte y describir el derecho que deseas ejercer.</p></section>
    <section><h2>Seguridad</h2><p>El sistema usa conexiones cifradas, control de acceso para el panel administrativo, contraseñas protegidas y credenciales SMTP cifradas en almacenamiento. Ninguna medida elimina todo riesgo; evita compartir información que no sea necesaria en el formulario público.</p></section>
    <p className="policy-back"><Link className="text-link" to="/agendar">← Volver a la agenda</Link></p>
  </article>;
}
