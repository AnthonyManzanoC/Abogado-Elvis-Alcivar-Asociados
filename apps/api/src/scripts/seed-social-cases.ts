/**
 * Curated, source-linked Instagram case catalog.
 *
 * This file deliberately contains only posts whose canonical URLs were supplied
 * by the office or verified during its approved profile review. It does not scrape Instagram,
 * download media, manufacture engagement data, or turn screenshots into new
 * source URLs. The public site uses the provider's official captioned embed,
 * which is responsible for rendering every slide in an Instagram carousel.
 *
 * Safety: this script is a dry run unless called with --apply. Applying it only
 * INSERTs missing slugs; it never overwrites later changes made in ADMIN.
 *
 * Run after an authorised review:
 *   npm run catalog:cases:apply -w @alcivar/api
 */
import { pathToFileURL } from "node:url";

type SocialCase = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  externalUrl: string;
  publishedAt: string;
  featured?: boolean;
};

const instagram = (shortcode: string) => `https://www.instagram.com/p/${shortcode}/`;

/**
 * Copy is intentionally a short, attributable summary. The canonical post is
 * the source of truth and its complete caption/media remain on Instagram.
 */
export const verifiedInstagramCases: readonly SocialCase[] = [
  {
    slug: "ig-flagrancia-fin-de-semana-dynfn3aktgh",
    title: "Flagrancia ganada: libertad inmediata",
    excerpt: "La publicación informa que una defensa técnica en audiencia de flagrancia logró la libertad inmediata del patrocinado.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Consulta el embed para ver el carrusel y el texto completo publicado por la cuenta.",
    externalUrl: instagram("DYNFn3AkTGh"),
    publishedAt: "2026-05-11T12:00:00-05:00",
    featured: true
  },
  {
    slug: "ig-estado-necesidad-toque-queda-dwj5onzkRh3",
    title: "Defensa por estado de necesidad en flagrancia",
    excerpt: "El post describe una defensa relacionada con una aprehensión durante toque de queda y comunica la obtención de libertad inmediata.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. El contenido del caso, sus imágenes y cualquier detalle adicional se consultan en la publicación enlazada.",
    externalUrl: instagram("DWJ5oNZkRh3"),
    publishedAt: "2026-03-21T12:00:00-05:00"
  },
  {
    slug: "ig-flagrancia-defensa-tecnica-dyakhq7etcj",
    title: "Defensa técnica en audiencia de flagrancia",
    excerpt: "La publicación comunica que, pese a los cargos descritos por la cuenta, la defensa técnica obtuvo libertad inmediata en audiencia de flagrancia.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Abre la fuente para revisar el carrusel y la descripción íntegra que publicó la cuenta.",
    externalUrl: instagram("DYaKhq7ETCJ"),
    publishedAt: "2026-05-16T12:00:00-05:00"
  },
  {
    slug: "ig-falsificacion-firmas-dwfcweweejd",
    title: "Caso comunicado sobre falsificación de firmas",
    excerpt: "La cuenta describe una investigación previa en la que se acreditó que las firmas cuestionadas no correspondían al defendido y reporta un acuerdo de reparación integral.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. La publicación enlazada conserva el relato completo y sus imágenes oficiales.",
    externalUrl: instagram("DWFCWEwEeJD"),
    publishedAt: "2026-03-19T12:00:00-05:00",
    featured: true
  },
  {
    slug: "ig-sobreseimiento-armas-dde5cafer-t1",
    title: "Caso comunicado con auto de sobreseimiento",
    excerpt: "El post informa que, tras una defensa en un proceso relacionado con armas, se obtuvo dictamen abstentivo y posteriormente un auto de sobreseimiento.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Por tratarse de un asunto de alta sensibilidad, esta ficha no identifica a personas; revisa la fuente para el contenido que la cuenta decidió publicar.",
    externalUrl: instagram("DdE5CafERt1"),
    publishedAt: "2026-09-09T12:00:00-05:00",
    featured: true
  },
  {
    slug: "ig-estafa-acuerdo-reparacion-dbbrngqkuf4",
    title: "Caso comunicado de estafa y acuerdo de reparación",
    excerpt: "La publicación describe una investigación previa en la que se fortaleció la posición de la defendida y las partes alcanzaron un acuerdo conciliatorio de reparación integral.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. El embed oficial conserva el carrusel, la fecha y la descripción completa publicada por la cuenta.",
    externalUrl: instagram("DbbRNGqkUF4"),
    publishedAt: "2026-07-30T12:00:00-05:00"
  },
  {
    slug: "ig-flagrancia-libertad-inmediata-dyiivdi3edbm",
    title: "Flagrancia ganada con libertad inmediata",
    excerpt: "La cuenta comunica que, tras una defensa en audiencia de flagrancia, se obtuvo la libertad inmediata del patrocinado.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Consulta la fuente para el carrusel y el relato íntegro publicado por la cuenta.",
    externalUrl: instagram("DYiVDi3EdBm"),
    publishedAt: "2026-05-19T12:00:00-05:00"
  },
  {
    slug: "ig-audiencia-ganada-libertad-dw9mpv4ed9n",
    title: "Audiencia ganada: libertad durante instrucción fiscal",
    excerpt: "El post indica que, durante la instrucción fiscal, se desvanecieron los elementos que originaron la prisión preventiva y se consiguió libertad inmediata.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Los detalles completos y el material visual permanecen en la publicación oficial enlazada.",
    externalUrl: instagram("DW9mpV4Ed9N"),
    publishedAt: "2026-04-10T12:00:00-05:00"
  },
  {
    slug: "ig-sustitucion-prision-preventiva-dwo5boqkai1",
    title: "Audiencia ganada por sustitución de prisión preventiva",
    excerpt: "La publicación comunica que fue aceptada una petición de sustitución de prisión preventiva y se obtuvo la libertad inmediata del patrocinado.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. Abre el embed oficial para revisar el carrusel y el texto completo de la cuenta.",
    externalUrl: instagram("DWo5bOqkai1"),
    publishedAt: "2026-04-02T12:00:00-05:00"
  },
  {
    slug: "ig-accidente-transito-acuerdo-dt3gfirks6y",
    title: "Caso de accidente de tránsito con acuerdo extrajudicial",
    excerpt: "El post describe un caso de tránsito en el que se alcanzó un acuerdo extrajudicial para la reparación integral de los daños comunicados por la cuenta.",
    body: "Resumen atribuido a la publicación original de @ab.elvisalcivar. El contenido original, incluyendo las imágenes disponibles, se visualiza desde la publicación enlazada.",
    externalUrl: instagram("DT3gfIrkS6Y"),
    publishedAt: "2026-01-23T12:00:00-05:00"
  }
];

const disclaimer = "Resumen basado exclusivamente en una publicación pública enlazada de Instagram. No identifica a clientes ni garantiza resultados; cada caso depende de sus circunstancias.";

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) {
    console.log(`Vista previa: ${verifiedInstagramCases.length} casos verificados. No se modificó la base de datos.`);
    for (const item of verifiedInstagramCases) console.log(`- ${item.title}: ${item.externalUrl}`);
    console.log("Para insertar únicamente los registros faltantes, ejecuta este script con --apply después de la revisión autorizada.");
    return;
  }

  const { db, withTransaction } = await import("../db.js");
  try {
    const result = await withTransaction(async client => {
      // Prevent two deployment/CLI runs from interleaving their catalog inserts.
      await client.query("SELECT pg_advisory_xact_lock(8742314)");
      let inserted = 0;
      for (const item of verifiedInstagramCases) {
        const row = await client.query(
          `INSERT INTO publications
             (slug,title,excerpt,body,kind,platform,media_url,thumbnail_url,external_url,featured,status,legal_disclaimer,published_at,gallery)
           VALUES ($1,$2,$3,$4,'case','instagram','','',$5,$6,'published',$7,$8::timestamptz,'[]'::jsonb)
           ON CONFLICT (slug) DO NOTHING
           RETURNING id`,
          [item.slug, item.title, item.excerpt, item.body, item.externalUrl, Boolean(item.featured), disclaimer, item.publishedAt]
        );
        inserted += row.rowCount ?? 0;
      }
      return inserted;
    });
    console.log(`Catálogo aplicado: ${result} insertado(s), ${verifiedInstagramCases.length - result} ya existía(n).`);
  } finally {
    await db.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch(error => {
    console.error("No fue posible aplicar el catálogo de casos", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
