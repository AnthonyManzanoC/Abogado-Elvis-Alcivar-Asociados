import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, LoaderCircle, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";

type Slot = { time: string; label: string };
type Result = { reference: string; startsAt: string; whatsappUrl: string };

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function AppointmentPage() {
  const { services, settings } = useSite();
  const [searchParams] = useSearchParams();
  const initialArea = searchParams.get("area") ?? "";
  const [step, setStep] = useState(1);
  const [area, setArea] = useState(initialArea);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const minDate = useMemo(() => isoDate(new Date()), []);
  const maxDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 60); return isoDate(d); }, []);

  useEffect(() => {
    if (!date) { setSlots([]); return; }
    setLoadingSlots(true); setTime(""); setError("");
    api<{ slots: Slot[] }>(`/api/public/availability?date=${date}`)
      .then((response) => setSlots(response.slots))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await api<Result>("/api/public/appointments", {
        method: "POST",
        body: JSON.stringify({
          clientName: form.get("clientName"), clientEmail: form.get("clientEmail"), clientPhone: form.get("clientPhone"),
          practiceArea: area, date, time, reason: form.get("reason"), privacyAccepted: form.get("privacyAccepted") === "on", website: form.get("website")
        })
      });
      setResult(response);
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible agendar"); }
    finally { setSubmitting(false); }
  };

  if (result) return <section className="booking-success page-section"><div className="success-icon"><Check /></div><span className="eyebrow">Solicitud registrada</span><h1>Tu cita quedó agendada.</h1><p>Conserva este código para cualquier consulta:</p><strong className="reference-code">{result.reference}</strong><p>Enviamos la confirmación por correo cuando el servicio SMTP está activo. Puedes avisar al abogado ahora mismo por WhatsApp.</p>{result.whatsappUrl && <a className="button whatsapp-button" href={result.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Abrir WhatsApp</a>}<small>La reserva no crea por sí sola una relación abogado-cliente.</small></section>;

  return <section className="booking-page page-section">
    <aside className="booking-aside"><span className="eyebrow">Asistente de agenda</span><h1>Encuentra el mejor momento para conversar.</h1><p>Te guiaremos en tres pasos. Solo pedimos la información necesaria para organizar la consulta.</p><div className="booking-trust"><div><ShieldCheck /><span><strong>Confidencial</strong><small>Datos tratados con reserva</small></span></div><div><Clock3 /><span><strong>{settings.consultation_minutes} minutos</strong><small>Duración estimada</small></span></div><div><MessageCircle /><span><strong>WhatsApp listo</strong><small>Mensaje automático al finalizar</small></span></div></div><img src="/images/elvis-desk.png" alt="Preparación jurídica en Alcívar Legal" /></aside>
    <div className="booking-card">
      <div className="stepper">{[1,2,3].map((item) => <div className={step >= item ? "active" : ""} key={item}><span>{step > item ? <Check /> : item}</span><small>{item === 1 ? "Motivo" : item === 2 ? "Horario" : "Tus datos"}</small></div>)}</div>
      {step === 1 && <div className="booking-step"><span className="assistant-label">01 · Para orientarte mejor</span><h2>¿Sobre qué necesitas conversar?</h2><div className="option-grid">{services.map((service) => <button className={area === service.title ? "selected" : ""} onClick={() => setArea(service.title)} key={service.id}><span>{area === service.title && <Check />}</span><strong>{service.title}</strong><small>{service.summary}</small></button>)}<button className={area === "Otro asunto" ? "selected" : ""} onClick={() => setArea("Otro asunto")}><span>{area === "Otro asunto" && <Check />}</span><strong>Otro asunto</strong><small>Lo revisamos durante la evaluación inicial.</small></button></div><button className="button button-dark next-button" disabled={!area} onClick={() => setStep(2)}>Elegir horario <ArrowRight /></button></div>}
      {step === 2 && <div className="booking-step"><span className="assistant-label">02 · Disponibilidad real</span><h2>Elige fecha y hora.</h2><label className="field"><span>Fecha preferida</span><input type="date" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} /></label>{loadingSlots ? <div className="loading-line"><LoaderCircle className="spin" /> Consultando agenda...</div> : date && <><span className="field-label">Horarios disponibles</span><div className="slot-grid">{slots.map((slot) => <button className={time === slot.time ? "selected" : ""} onClick={() => setTime(slot.time)} key={slot.time}>{slot.label}</button>)}</div>{!slots.length && <p className="form-hint">No hay horarios para esta fecha. Prueba otro día hábil.</p>}</>}<div className="step-actions"><button className="text-link" onClick={() => setStep(1)}><ArrowLeft /> Atrás</button><button className="button button-dark" disabled={!date || !time} onClick={() => setStep(3)}>Continuar <ArrowRight /></button></div></div>}
      {step === 3 && <form className="booking-step" onSubmit={submit}><span className="assistant-label">03 · Confirmación</span><h2>¿A nombre de quién reservamos?</h2><div className="form-grid"><label className="field full"><span>Nombre completo</span><input name="clientName" required minLength={3} autoComplete="name" /></label><label className="field"><span>Correo electrónico</span><input type="email" name="clientEmail" required autoComplete="email" /></label><label className="field"><span>Teléfono / WhatsApp</span><input name="clientPhone" required minLength={7} autoComplete="tel" /></label><label className="field full"><span>Breve contexto del caso</span><textarea name="reason" required minLength={10} maxLength={1500} rows={5} placeholder="Evita incluir aquí documentos o información extremadamente sensible." /></label><label className="honeypot" aria-hidden="true">No completar<input name="website" tabIndex={-1} autoComplete="off" /></label><label className="privacy-check full"><input type="checkbox" name="privacyAccepted" required /><span><CheckCircle2 /> Acepto el tratamiento de mis datos para gestionar esta solicitud, conforme al <Link to="/privacidad" target="_blank">aviso de privacidad</Link>.</span></label></div>{error && <p className="form-error">{error}</p>}<div className="step-actions"><button type="button" className="text-link" onClick={() => setStep(2)}><ArrowLeft /> Atrás</button><button className="button button-gold" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> Agendando...</> : <>Confirmar cita <CalendarDays /></>}</button></div><p className="secure-note"><LockKeyhole /> La información viaja cifrada hacia el sistema de agenda.</p></form>}
      {error && step !== 3 && <p className="form-error">{error}</p>}
    </div>
  </section>;
}
