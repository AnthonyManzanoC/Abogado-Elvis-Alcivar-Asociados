import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SocialMedia } from "../components/SocialMedia";
import { useSite } from "../context/SiteContext";

export function PublicationPage() {
  const { slug } = useParams();
  const { publications } = useSite();
  const post = publications.find((item) => item.slug === slug);
  if (!post) return <section className="inner-hero page-section"><h1>Contenido no encontrado</h1><Link className="text-link" to="/vitrina"><ArrowLeft /> Volver a la vitrina</Link></section>;
  return <article className="article-page page-section">
    <Link className="text-link" to="/vitrina"><ArrowLeft /> Vitrina legal</Link>
    <header><span className="eyebrow">{post.kind} · {post.platform}</span><h1>{post.title}</h1><p>{post.excerpt}</p></header>
    <div className="article-cover"><SocialMedia post={post} interactive /></div>
    <div className="article-body"><p>{post.body}</p>{post.external_url && <a className="button button-dark" href={post.external_url} target="_blank" rel="noreferrer">Ver publicación original <ExternalLink size={17} /></a>}<aside>{post.legal_disclaimer || "Este contenido es informativo y no constituye asesoría legal."}</aside></div>
  </article>;
}
