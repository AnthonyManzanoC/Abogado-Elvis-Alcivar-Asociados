import type { BootstrapData } from "./types";

export const fallbackData: BootstrapData = {
  settings: {
    firm_name: "Alcívar Legal",
    logo_url: "",
    attorney_name: "Abg. Elvis Alcívar Burgos",
    professional_title: "Abogado litigante",
    tagline: "Defensa estratégica. Atención directa.",
    biography: "Abogado litigante en Babahoyo, dedicado a la defensa técnica, la preparación rigurosa de cada caso y la comunicación directa con sus clientes.",
    phone: "",
    whatsapp_number: "593988937221",
    contact_email: "",
    office_address: "Edificio Álavama, Sucre y 5 de Junio, Babahoyo",
    maps_url: "",
    instagram_url: "https://www.instagram.com/ab.elvisalcivar/",
    tiktok_url: "https://www.tiktok.com/@ab.elvisalcivar",
    timezone: "America/Guayaquil",
    consultation_minutes: 60,
    office_hours_note: "Atención con cita previa"
  },
  services: [
    { id: "1", slug: "defensa-penal", title: "Defensa penal", summary: "Estrategia y acompañamiento desde la investigación hasta la audiencia.", description: "Análisis del expediente, teoría del caso, defensa en flagrancia y representación durante el proceso penal.", icon: "shield", display_order: 1, active: true },
    { id: "2", slug: "litigio-procesal", title: "Litigio procesal", summary: "Preparación técnica para cada etapa del proceso.", description: "Patrocinio judicial, elaboración de escritos, preparación de audiencias y seguimiento claro.", icon: "scale", display_order: 2, active: true },
    { id: "3", slug: "asesoria-legal", title: "Asesoría legal", summary: "Orientación directa para tomar decisiones con claridad.", description: "Consulta confidencial, evaluación inicial de riesgos y definición de los siguientes pasos jurídicos.", icon: "briefcase", display_order: 3, active: true },
    { id: "4", slug: "familia", title: "Familia", summary: "Acompañamiento firme y humano en asuntos familiares.", description: "Asesoría responsable en situaciones de familia, priorizando soluciones y comunicación directa.", icon: "users", display_order: 4, active: true }
  ],
  publications: [
    { id: "1", slug: "defensa-con-preparacion", title: "Cada audiencia comienza mucho antes de entrar a sala", excerpt: "Preparación, evidencia y una estrategia procesal clara.", body: "El trabajo jurídico responsable parte de escuchar, revisar el expediente y construir una estrategia adaptada a los hechos.", kind: "article", platform: "website", media_url: "", thumbnail_url: "/images/elvis-desk.png", external_url: "", featured: true, legal_disclaimer: "Contenido informativo. No constituye asesoría legal ni garantiza resultados.", published_at: new Date().toISOString() },
    { id: "2", slug: "conoce-tu-defensa", title: "Conoce tus opciones antes de decidir", excerpt: "Una consulta oportuna permite ordenar hechos, riesgos y alternativas.", body: "Cada situación requiere análisis individual.", kind: "video", platform: "tiktok", media_url: "", thumbnail_url: "/images/elvis-office.png", external_url: "https://www.tiktok.com/@ab.elvisalcivar", featured: false, legal_disclaimer: "Los resultados dependen de las circunstancias particulares de cada asunto.", published_at: new Date().toISOString() },
    { id: "3", slug: "atencion-directa-babahoyo", title: "Atención directa en Babahoyo", excerpt: "Un espacio profesional para hablar de tu caso con confidencialidad.", body: "Agenda una cita y recibe la confirmación de forma inmediata.", kind: "photo", platform: "instagram", media_url: "", thumbnail_url: "/images/elvis-teal.png", external_url: "https://www.instagram.com/ab.elvisalcivar/", featured: false, legal_disclaimer: "La relación abogado-cliente se formaliza únicamente mediante acuerdo expreso.", published_at: new Date().toISOString() }
  ]
};
