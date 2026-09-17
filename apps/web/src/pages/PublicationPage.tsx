import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SocialMedia } from "../components/SocialMedia";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { safeExternalUrl } from "../lib/contact";
import type { Publication } from "../types";

export function PublicationPage() {
  const { slug } = useParams();
  const [post,setPost]=useState<Publication|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);api<Publication>(`/api/public/publications/${encodeURIComponent(slug||"")}`).then(p=>{if(active)setPost(p);}).catch(()=>{if(active)setPost(null);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[slug]);
  if(loading)return <section className="page-section"><p>Cargando publicación…</p></section>;
  if (!post) return <section className="inner-hero page-section"><h1>Contenido no encontrado</h1><Link className="text-link" to="/vitrina"><ArrowLeft /> Volver a la vitrina</Link></section>;
  const sourceUrl = safeExternalUrl(post.external_url);
  return <article className="article-page page-section">
    <Link className="text-link" to="/vitrina"><ArrowLeft /> Vitrina legal</Link>
    <header><span className="eyebrow">{post.kind} · {post.platform}</span><h1>{post.title}</h1><p>{post.excerpt}</p></header>
    <div className="article-cover"><SocialMedia post={post} interactive /></div>
    <div className="article-body"><p>{post.body}</p>{sourceUrl && <a className="button button-dark" href={sourceUrl} target="_blank" rel="noreferrer">Ver publicación original <ExternalLink size={17} /></a>}<aside>{post.legal_disclaimer || "Este contenido es informativo y no constituye asesoría legal."}</aside></div>
  </article>;
}
