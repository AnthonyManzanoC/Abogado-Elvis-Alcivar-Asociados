import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, CalendarDays, MessageCircle, Scale, X } from "lucide-react";
import { useSite } from "../context/SiteContext";
import { whatsappUrl } from "../lib/contact";
type Reply={text:string;href?:string;label?:string};
export function LegalAssistant(){
  const {settings,services}=useSite();const [open,setOpen]=useState(false),[input,setInput]=useState("");
  const [messages,setMessages]=useState<{who:"assistant"|"user";reply:Reply}[]>([{who:"assistant",reply:{text:"Hola, soy el asistente del despacho. Puedo orientarte sobre servicios, citas y seguimiento. ¿Qué necesitas hacer?"}}]);
  const end=useRef<HTMLDivElement>(null),field=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open)field.current?.focus();},[open]);
  useEffect(()=>{if(open)end.current?.scrollIntoView({block:"nearest"});},[messages,open]);
  function answer(text:string):Reply{
    const q=text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(/comprobante|pago|virtual|precio|costo/.test(q))return {text:settings.virtual_enabled?`La consulta virtual tiene un valor ${settings.payments_test_mode?"de ejemplo ":""}de USD ${Number(settings.virtual_fee).toFixed(2)}. ${settings.payments_test_mode?"Está en modo de prueba: NO transfieras dinero. ":""}Después de reservar puedes adjuntar el comprobante en tu seguimiento. El despacho revisa y confirma la reunión.`:"Puedes consultar al despacho los valores y modalidades disponibles.",href:"/agendar",label:"Ver modalidades y agenda"};
    if(/seguimiento|estado|enlace|respuesta/.test(q))return {text:"Abre el enlace privado de tu correo. Si lo perdiste, recupéralo con tu correo y referencia. Por privacidad, no muestro datos de expedientes en este chat.",href:"/seguimiento",label:"Mi seguimiento"};
    if(/cita|agend|reserv|horario/.test(q))return {text:`${settings.office_hours_note}. La agenda muestra horarios reales; eliges uno, completas tus datos y confirmas personalmente.`,href:"/agendar",label:"Agendar mi cita"};
    if(/direccion|ubicacion|contact|donde|mapa|telefono/.test(q))return {text:`${settings.office_address}. ${settings.office_hours_note}.`,href:"/contacto",label:"Ver mapa y contacto"};
    if(/servicio|penal|civil|familia|laboral|defensa/.test(q))return {text:`Áreas del despacho: ${services.map(s=>s.title).join(", ")}. El abogado debe evaluar los hechos de cada caso antes de emitir un criterio.`,href:"/servicios",label:"Explorar servicios"};
    if(/caso ganado|vitrina|publicacion|resultado/.test(q))return {text:"Puedes conocer publicaciones y casos compartidos por el despacho. Los resultados previos no garantizan un resultado similar.",href:"/vitrina",label:"Abrir vitrina"};
    if(/abogado|elvis|perfil|experiencia/.test(q))return {text:`${settings.attorney_name}. ${settings.biography}`,href:"/perfil",label:"Conocer su perfil"};
    return {text:"Puedo ayudarte a navegar el sitio y organizar una solicitud; no soy abogado ni emito asesoría jurídica. Para que el despacho revise tu situación, envía una consulta o agenda una cita. Evita datos sensibles en este chat.",href:"/consultar",label:"Enviar una consulta privada"};
  }
  function send(text:string){if(!text.trim())return;setMessages(m=>[...m.slice(-18),{who:"user",reply:{text}},{who:"assistant",reply:answer(text)}]);setInput("");}
  if(settings.assistant_enabled===false)return null;
  const whatsapp=whatsappUrl(settings.whatsapp_number,settings.whatsapp_message);
  return <div className="legal-assistant">{open&&<section className="assistant-panel" aria-label="Asistente de Alcívar Legal" onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}}><header><span className="assistant-mark"><Scale/></span><div><strong>Asistente del despacho</strong><small>Orientación y agenda · sin asesoría automática</small></div><button aria-label="Cerrar asistente" onClick={()=>setOpen(false)}><X/></button></header><div className="assistant-messages" aria-live="polite">{messages.map((m,i)=><div key={i} className={`assistant-bubble ${m.who}`}><p>{m.reply.text}</p>{m.reply.href&&<Link to={m.reply.href} onClick={()=>setOpen(false)}>{m.reply.label} ↗</Link>}</div>)}<div ref={end}/></div><div className="assistant-shortcuts">{["Agendar cita","Servicios","Seguimiento"].map(t=><button key={t} onClick={()=>send(t)}>{t}</button>)}</div><form onSubmit={(e:FormEvent)=>{e.preventDefault();send(input);}}><input ref={field} aria-label="Pregunta al asistente" placeholder="¿En qué podemos orientarte?" maxLength={500} value={input} onChange={e=>setInput(e.target.value)}/><button aria-label="Enviar pregunta" disabled={!input.trim()}><ArrowUp/></button></form><footer><Link to="/consultar" onClick={()=>setOpen(false)}>Consulta privada</Link>{whatsapp&&<a href={whatsapp} target="_blank" rel="noreferrer">Hablar por WhatsApp</a>}</footer></section>}<button className="assistant-launcher" aria-expanded={open} aria-label={open?"Cerrar asistente":"Abrir asistente del despacho"} onClick={()=>setOpen(v=>!v)}>{open?<X/>:<MessageCircle/>}<span>{open?"Cerrar":"¿Te orientamos?"}</span>{!open&&<CalendarDays size={16}/>}</button></div>;
}
