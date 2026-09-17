import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BarChart3, CalendarDays, Check, ChevronRight, Eye, FileText, ImagePlus, LayoutDashboard, LoaderCircle, LogOut, Mail, Menu, Plus, Save, Settings, ShieldCheck, Trash2, Upload, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { AdminPublications } from "../components/AdminPublications";
import { ExperienceSettings } from "../components/ExperienceSettings";
import { ClientManagement } from "../components/ClientManagement";
import { SettingsView } from "../components/AdminSettingsView";
import type { Appointment, Publication, Service } from "../types";

type Dashboard = {
  totals: { upcoming: number; this_month: number; completed: number };
  upcoming: Appointment[];
  recentEmails: { event_type: string; recipient: string; status: string; created_at: string }[];
};


const formatDate = (value: string) => new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guayaquil" }).format(new Date(value));
const statusLabels: Record<string, string> = { scheduled: "Agendada", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    if (!sessionStorage.getItem("alcivar_admin_token")) return setAuthenticated(false);
    api("/api/admin/me").then(() => setAuthenticated(true)).catch(() => { sessionStorage.removeItem("alcivar_admin_token"); setAuthenticated(false); });
  }, []);
  if (authenticated === null) return <div className="admin-loader"><LoaderCircle className="spin" /> Verificando sesión...</div>;
  return authenticated ? <AdminShell onLogout={() => { sessionStorage.removeItem("alcivar_admin_token"); setAuthenticated(false); }} /> : <AdminLogin onLogin={() => setAuthenticated(true)} />;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setLoading(true); const data = new FormData(event.currentTarget);
    try {
      const response = await api<{ token: string }>("/api/admin/login", { method: "POST", body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      sessionStorage.setItem("alcivar_admin_token", response.token); onLogin();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible ingresar"); }
    finally { setLoading(false); }
  };
  return <main className="admin-login"><section className="login-brand"><Link to="/" className="brand"><span className="brand-mark">AL</span><span><strong>Alcívar Legal</strong><small>Panel privado</small></span></Link><div><span className="eyebrow">Administración segura</span><h1>Todo el despacho, en un solo lugar.</h1><p>Gestiona agenda, publicaciones, servicios, contacto y notificaciones sin tocar código.</p></div><small>Acceso exclusivo para personal autorizado.</small></section><section className="login-form-wrap"><form onSubmit={submit}><ShieldCheck /><span className="eyebrow">Bienvenido</span><h2>Iniciar sesión</h2><p>Usa las credenciales privadas del administrador.</p><label className="field"><span>Correo</span><input name="email" type="email" required autoComplete="username" /></label><label className="field"><span>Contraseña</span><input name="password" type="password" required autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button className="button button-gold" disabled={loading}>{loading ? <><LoaderCircle className="spin" /> Ingresando...</> : <>Ingresar <ChevronRight /></>}</button><Link className="text-link" to="/">← Volver al sitio</Link></form></section></main>;
}

const sections = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { id: "appointments", label: "Agenda", icon: CalendarDays },
  { id: "content", label: "Vitrina", icon: FileText },
  { id: "services", label: "Servicios", icon: BarChart3 },
  { id: "experience", label: "Imagen y Brevo", icon: Mail },
  { id: "consultations", label: "Consultas", icon: Users },
  { id: "settings", label: "Configuración", icon: Settings }
];

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState("dashboard"); const [mobileNav, setMobileNav] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const canLeaveSettings = () => !settingsDirty || window.confirm("Tienes cambios sin guardar en Configuración. ¿Quieres salir y descartarlos?");
  return <div className="admin-shell">
    <aside className={mobileNav ? "admin-sidebar open" : "admin-sidebar"}><div className="admin-brand"><span>AL</span><div><strong>Alcívar Legal</strong><small>ADMIN</small></div><button onClick={() => setMobileNav(false)}><X /></button></div><nav>{sections.map(({ id, label, icon: Icon }) => <button className={section === id ? "active" : ""} onClick={() => { if (id !== section && !canLeaveSettings()) return; setSection(id); setMobileNav(false); }} key={id}><Icon />{label}</button>)}</nav><div className="sidebar-bottom"><Link to="/" target="_blank"><Eye /> Ver sitio público</Link><button onClick={() => { if (canLeaveSettings()) onLogout(); }}><LogOut /> Cerrar sesión</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="admin-menu" onClick={() => setMobileNav(true)}><Menu /></button><div><span>Panel de gestión</span><strong>{sections.find((item) => item.id === section)?.label}</strong></div><div className="admin-user"><span>AL</span><div><strong>Administrador</strong><small>Sesión protegida</small></div></div></header>
      <div className="admin-content">{section === "dashboard" && <DashboardView />}{section === "appointments" && <ClientManagement kind="appointments" />}{section === "consultations" && <ClientManagement kind="consultations" />}{section === "experience" && <ExperienceSettings onDirtyChange={setSettingsDirty} />}{section === "content" && <AdminPublications />}{section === "services" && <ServicesView />}{section === "settings" && <SettingsView onDirtyChange={setSettingsDirty} />}</div>
    </main>
  </div>;
}

function PageTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="admin-page-title"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</div>;
}

function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => { api<Dashboard>("/api/admin/dashboard").then(setData); }, []);
  if (!data) return <div className="admin-loader"><LoaderCircle className="spin" /> Cargando resumen...</div>;
  return <><PageTitle eyebrow="Hoy en el despacho" title="Resumen general" /><div className="metric-grid"><article><div><span>Próximas citas</span><CalendarDays /></div><strong>{data.totals.upcoming}</strong><small>Agendadas o confirmadas</small></article><article><div><span>Nuevas este mes</span><Users /></div><strong>{data.totals.this_month}</strong><small>Solicitudes registradas</small></article><article><div><span>Atenciones cerradas</span><Check /></div><strong>{data.totals.completed}</strong><small>Marcadas como completadas</small></article></div><div className="admin-two-cols"><section className="admin-panel"><header><div><span>Agenda</span><h2>Próximas citas</h2></div></header><div className="compact-list">{data.upcoming.map((item) => <div key={item.id}><span className="date-tile"><strong>{new Date(item.starts_at).toLocaleDateString("es-EC", { day: "2-digit", timeZone: "America/Guayaquil" })}</strong><small>{new Date(item.starts_at).toLocaleDateString("es-EC", { month: "short", timeZone: "America/Guayaquil" })}</small></span><div><strong>{item.client_name}</strong><small>{formatDate(item.starts_at)} · {item.practice_area}</small></div><span className={`status ${item.status}`}>{statusLabels[item.status]}</span></div>)}{!data.upcoming.length && <p className="admin-empty">No hay citas próximas.</p>}</div></section><section className="admin-panel"><header><div><span>Automatización</span><h2>Correos recientes</h2></div></header><div className="email-list">{data.recentEmails.map((item, index) => <div key={index}><span className={`mail-dot ${item.status}`} /><div><strong>{item.event_type.replaceAll("_", " ")}</strong><small>{item.recipient}</small></div><span>{item.status}</span></div>)}{!data.recentEmails.length && <p className="admin-empty">Los envíos aparecerán aquí.</p>}</div></section></div></>;
}

const emptyService = { id:"",slug:"",title:"",summary:"",description:"",icon:"scale",display_order:0,active:true } as Service;

function ServicesView() {
  const [items,setItems]=useState<Service[]>([]); const [editing,setEditing]=useState<Service|null>(null); const load=useCallback(()=>api<Service[]>("/api/admin/services").then(setItems),[]); useEffect(()=>{load();},[load]);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!editing)return;const form=new FormData(event.currentTarget);const body={title:form.get("title"),slug:form.get("slug"),summary:form.get("summary"),description:form.get("description"),icon:form.get("icon"),displayOrder:Number(form.get("displayOrder")),active:form.get("active")==="on"};await api(editing.id?`/api/admin/services/${editing.id}`:"/api/admin/services",{method:editing.id?"PUT":"POST",body:JSON.stringify(body)});setEditing(null);await load();};
  const remove=async(id:string)=>{if(!window.confirm("¿Eliminar este servicio?"))return;await api(`/api/admin/services/${id}`,{method:"DELETE"});load();};
  return <><PageTitle eyebrow="Oferta profesional" title="Servicios legales" action={<button className="button button-dark" onClick={()=>setEditing({...emptyService})}><Plus /> Nuevo servicio</button>} /><div className="content-layout"><section className="admin-panel content-list service-admin-list">{items.map(item=><article key={item.id}><div className="service-small-icon"><BarChart3 /></div><div><strong>{item.title}</strong><span>{item.summary}</span><small className={`status ${item.active?"published":"archived"}`}>{item.active?"visible":"oculto"}</small></div><button onClick={()=>setEditing(item)}>Editar</button><button className="icon-danger" onClick={()=>void remove(item.id)}><Trash2 /></button></article>)}</section>{editing&&<form className="admin-panel editor-panel" onSubmit={save}><header><div><span>Editor</span><h2>{editing.id?"Editar servicio":"Nuevo servicio"}</h2></div><button type="button" onClick={()=>setEditing(null)}><X /></button></header><label className="field"><span>Nombre</span><input name="title" required defaultValue={editing.title}/></label><label className="field"><span>Resumen</span><textarea name="summary" required defaultValue={editing.summary}/></label><label className="field"><span>Descripción</span><textarea name="description" rows={5} defaultValue={editing.description}/></label><div className="form-grid"><label className="field"><span>Ícono</span><select name="icon" defaultValue={editing.icon}><option value="scale">Balanza</option><option value="shield">Escudo</option><option value="briefcase">Maletín</option><option value="users">Personas</option></select></label><label className="field"><span>Orden</span><input type="number" name="displayOrder" defaultValue={editing.display_order}/></label></div><input type="hidden" name="slug" defaultValue={editing.slug}/><label className="toggle-line"><input type="checkbox" name="active" defaultChecked={editing.active}/><span>Visible en el sitio</span></label><button className="button button-gold"><Save/> Guardar servicio</button></form>}</div></>;
}
