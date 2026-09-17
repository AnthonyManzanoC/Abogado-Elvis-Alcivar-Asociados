import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";

type Tool={name:string;description:string;inputSchema:object;annotations?:object;execute:(input:Record<string,unknown>)=>Promise<unknown>};
type ModelContext={registerTool:(tool:Tool,options?:{signal:AbortSignal})=>void|Promise<void>;unregisterTool?:(name:string)=>void};
export function WebMCP(){
  const {settings,services}=useSite();const navigate=useNavigate();
  useEffect(()=>{
    if(settings.assistant_enabled===false)return;
    // Current draft uses Document; early Chrome implementations used Navigator.
    const context=(document as Document&{modelContext?:ModelContext}).modelContext||(navigator as Navigator&{modelContext?:ModelContext}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();const registered:string[]=[];
    const empty={type:"object",properties:{},additionalProperties:false};
    const tools:Tool[]=[
      {name:"alcivar_services",description:"List the law office's published services. Informational only; no legal advice.",inputSchema:empty,annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async()=>({services:services.map(({title,summary})=>({title,summary}))})},
      {name:"alcivar_contact",description:"Get public office contact information and hours.",inputSchema:empty,annotations:{readOnlyHint:true},execute:async()=>({name:settings.firm_name,address:settings.office_address,hours:settings.office_hours_note,phone:settings.phone,email:settings.contact_email})},
      {name:"alcivar_availability",description:"Read available appointment slots for a date in Ecuador. Does not book.",inputSchema:{type:"object",properties:{date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$"}},required:["date"],additionalProperties:false},annotations:{readOnlyHint:true},execute:async input=>{if(typeof input.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new Error("Fecha inválida");return api(`/api/public/availability?date=${encodeURIComponent(input.date)}`);}},
      {name:"alcivar_prepare_appointment",description:"Open the booking form. The user must choose a slot, enter personal data and explicitly confirm. Does not create an appointment or send email.",inputSchema:{type:"object",properties:{area:{type:"string",maxLength:100}},additionalProperties:false},execute:async input=>{const area=typeof input.area==="string"?input.area.slice(0,100):"";navigate("/agendar?area="+encodeURIComponent(area));return {status:"requires_user_confirmation",message:"Booking form opened. Nothing has been booked."};}},
      {name:"alcivar_prepare_consultation",description:"Open a private consultation form for the user to complete and submit. Does not send a consultation or email.",inputSchema:empty,execute:async()=>{navigate("/consultar");return {status:"requires_user_confirmation"};}}
    ];
    for(const tool of tools){try{const result=context.registerTool(tool,{signal:controller.signal});registered.push(tool.name);Promise.resolve(result).catch(()=>{/* Unsupported draft feature: normal site remains functional. */});}catch{/* Browser does not support this draft. */}}
    return()=>{controller.abort();for(const name of registered){try{context.unregisterTool?.(name);}catch{/* Already unregistered. */}}};
  },[settings,services,navigate]);
  return null;
}
