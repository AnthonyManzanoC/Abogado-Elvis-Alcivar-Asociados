export type SiteSettings = {
  hero_image_url?: string;
  profile_image_url?: string;
  results_phrase?: string;
  rights_phrase?: string;
  assistant_enabled?: boolean;
  virtual_enabled?: boolean;
  virtual_fee?: number | string;
  payment_instructions?: string;
  payments_test_mode?: boolean;
  firm_name: string;
  logo_url: string;
  attorney_name: string;
  professional_title: string;
  tagline: string;
  biography: string;
  phone: string;
  whatsapp_number: string;
  contact_email: string;
  office_address: string;
  maps_url: string;
  map_enabled: boolean;
  map_embed_url: string;
  map_query: string;
  map_load_on_click: boolean;
  office_directions: string;
  contact_heading: string;
  contact_intro: string;
  whatsapp_message: string;
  instagram_url: string;
  tiktok_url: string;
  timezone: string;
  consultation_minutes: number;
  office_hours_note: string;
};

export type Service = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  icon: string;
  display_order: number;
  active: boolean;
};

export type Publication = {
  gallery?: { url: string; type: "image" | "video"; alt: string }[];
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  kind: "article" | "case" | "video" | "photo" | "news";
  platform: "website" | "instagram" | "tiktok" | "youtube" | "facebook";
  media_url: string;
  thumbnail_url: string;
  external_url: string;
  featured: boolean;
  status?: "draft" | "published" | "archived";
  legal_disclaimer: string;
  published_at: string;
};

export type BootstrapData = {
  settings: SiteSettings;
  services: Service[];
  publications: Publication[];
};

export type Appointment = {
  id: string;
  reference_code: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  starts_at: string;
  duration_minutes: number;
  practice_area: string;
  reason: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  internal_notes: string;
  created_at: string;
};
