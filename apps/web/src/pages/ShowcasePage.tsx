import { ArrowRight, Instagram, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";
import { safeExternalUrl } from "../lib/contact";
import { SocialMedia, embedUrl } from "../components/SocialMedia";
import type { Publication } from "../types";

const filters = ["Todo", "Artículo", "Caso", "Video", "Foto"];
const kindMap: Record<string, string> = { Artículo: "article", Caso: "case", Video: "video", Foto: "photo" };

export function ShowcasePage() {
  const { settings } = useSite();
  const [filter, setFilter] = useState("Todo");
  const [items, setItems] = useState<Publication[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const loadingRef = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const kind = filter === "Todo" ? "" : kindMap[filter];

  const loadMore = async (reset = false) => {
    if (loadingRef.current || (!reset && !hasMore)) return;
    loadingRef.current = true; setLoading(true); setFeedError("");
    const currentOffset = reset ? 0 : offset;
    try {
      const response = await api<{ items: Publication[]; nextOffset: number; hasMore: boolean }>(`/api/public/publications/feed?limit=6&offset=${currentOffset}${kind ? `&kind=${kind}` : ""}`);
      setItems((current) => reset ? response.items : [...current, ...response.items.filter((next) => !current.some((item) => item.id === next.id))]);
      setOffset(response.nextOffset); setHasMore(response.hasMore);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "No fue posible cargar la vitrina");
      setHasMore(false);
    } finally { loadingRef.current = false; setLoading(false); }
  };

  useEffect(() => { setItems([]); setOffset(0); setHasMore(true); void loadMore(true); }, [filter]);
  useEffect(() => {
    const node = sentinel.current; if (!node) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMore(); }, { rootMargin: "500px" });
    observer.observe(node); return () => observer.disconnect();
  }, [offset, hasMore, loading, filter]);
  return <>
    <section className="inner-hero page-section split-title showcase-hero"><div><span className="eyebrow">Vitrina legal</span><h1>{settings.results_phrase || "Resultados de tener una defensa técnica y eficaz"}</h1></div><p>Contenido educativo y una mirada al trabajo del despacho. Los casos se comparten respetando la confidencialidad y sin prometer resultados.</p></section>
    <section className="showcase-toolbar page-section">
      <div className="filter-tabs" role="group" aria-label="Filtrar publicaciones">{filters.map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
      <div className="social-actions"><a href={settings.instagram_url} target="_blank" rel="noreferrer"><Instagram /> Instagram</a><a href={settings.tiktok_url} target="_blank" rel="noreferrer">TikTok ↗</a></div>
    </section>
    <section className="showcase-grid page-section">
      {items.map((post, index) => { const sourceUrl = safeExternalUrl(post.external_url); const providerFirst = Boolean(embedUrl(post)) && !post.gallery?.length && !post.media_url; const cardClass = `${index === 0 ? "showcase-card wide" : "showcase-card"}${providerFirst ? " showcase-card--social-embed" : ""}`; return <article className={cardClass} key={post.id}>
        <SocialMedia post={post} interactive autoLoadEmbed />
        <div className="showcase-copy"><span>{post.kind}</span><h2>{post.title}</h2><p>{post.excerpt}</p><Link className="text-link" to={`/vitrina/${post.slug}`}>Ver historia completa <ArrowRight /></Link>{sourceUrl ? <a className="text-link" href={sourceUrl} target="_blank" rel="noreferrer">Abrir en {post.platform} <ArrowRight /></a> : <Link className="text-link" to={`/vitrina/${post.slug}`}>Leer contenido <ArrowRight /></Link>}</div>
      </article>; })}
      {!items.length && !loading && <div className="empty-state"><h2>Aún no hay publicaciones aquí.</h2><p>El nuevo contenido aparecerá cuando se publique desde el panel administrativo.</p></div>}
    </section>
    <div className="feed-sentinel page-section" ref={sentinel}>{loading && <span><LoaderCircle className="spin" /> Cargando más contenido...</span>}{feedError && <button className="text-link" onClick={() => { setHasMore(true); void loadMore(items.length === 0); }}>Reintentar carga <ArrowRight /></button>}{!feedError && !hasMore && items.length > 0 && <span>Has llegado al final de la vitrina.</span>}</div>
    <section className="content-disclaimer page-section"><strong>Nota importante</strong><p>El contenido tiene fines informativos y no reemplaza una consulta legal. Los resultados anteriores no garantizan resultados futuros.</p></section>
  </>;
}
