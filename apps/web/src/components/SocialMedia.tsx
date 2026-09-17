import { ChevronLeft, ChevronRight, ExternalLink, Instagram, Play } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../lib/api";
import { safeExternalUrl } from "../lib/contact";
import type { Publication } from "../types";

// These are first-party portraits already bundled with the site.  They make an
// honest, branded preview while the visitor decides whether to load a social
// provider.  They are deliberately not copied from Instagram or presented as
// a slide from the source post.
const CASE_PREVIEW_BACKDROPS = [
  { src: "/images/elvis-office.png", position: "center 35%" },
  { src: "/images/elvis-desk.png", position: "center 42%" },
  { src: "/images/elvis-burgundy.png", position: "center 24%" },
  { src: "/images/elvis-gray.png", position: "center 28%" },
  { src: "/images/elvis-teal.png", position: "center 25%" },
  { src: "/images/elvis-profile-new.png", position: "center 28%" }
] as const;

function casePreviewBackdrop(slug: string) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return CASE_PREVIEW_BACKDROPS[(hash >>> 0) % CASE_PREVIEW_BACKDROPS.length];
}

export function embedUrl(post: Pick<Publication,"external_url">) {
  try {
    const u=new URL(post.external_url);
    if(u.protocol!=="https:")return "";
    const host=u.hostname.replace(/^www\./,"");
    if(host==="instagram.com"){const m=u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);return m?`https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/`:"";}
    if(host==="tiktok.com"){const m=u.pathname.match(/^\/@[^/]+\/video\/(\d+)\/?$/);return m?`https://www.tiktok.com/player/v1/${m[1]}?autoplay=0`:"";}
    if(["youtube.com","m.youtube.com","youtu.be"].includes(host)){const id=host==="youtu.be"?u.pathname.slice(1):u.searchParams.get("v")||u.pathname.split("/")[2];return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}`:"";}
  }catch{/* Invalid or unsupported provider. */}
  return "";
}
type SocialMediaProps = {
  post: Publication;
  interactive?: boolean;
  /** Loads the official provider on public showcase cards, not in ADMIN. */
  autoLoadEmbed?: boolean;
};

export function SocialMedia({post,interactive=false,autoLoadEmbed=false}:SocialMediaProps){
  const [index,setIndex]=useState(0);
  const gallery=post.gallery||[];const current=gallery[index%Math.max(1,gallery.length)];
  const embed=embedUrl(post),source=safeExternalUrl(post.external_url);
  const thumb=assetUrl(post.thumbnail_url),media=assetUrl(post.media_url);
  // First-party galleries and directly hosted media always take precedence.
  // This keeps ADMIN-controlled content independent of a social provider.
  const shouldAutoLoadEmbed = interactive && autoLoadEmbed && Boolean(embed) && !current && !media;
  const [loaded,setLoaded]=useState<boolean>(shouldAutoLoadEmbed);
  const providerLabel=post.platform === "instagram" ? "Instagram" : post.platform === "tiktok" ? "TikTok" : post.platform === "youtube" ? "YouTube" : post.platform;
  const officialPreview = Boolean(source && embed && !current && !media);
  // A thumbnail supplied from ADMIN always wins.  Only social case cards that
  // do not have one receive a deterministic, local branded image.
  const fallbackBackdrop = !thumb && post.kind === "case" ? casePreviewBackdrop(post.slug) : undefined;
  const previewImage = thumb || fallbackBackdrop?.src;
  const sourcePreview = <button className={`official-post-preview${previewImage ? " has-preview-image" : ""}`} type="button" onClick={()=>setLoaded(true)} aria-label={`Cargar publicación original de ${providerLabel}: ${post.title}`}>
    {previewImage && <img className="official-post-preview-image" src={previewImage} alt="" aria-hidden="true" loading="lazy" style={fallbackBackdrop ? { objectPosition: fallbackBackdrop.position } : undefined} />}
    <span className="official-post-preview-overlay" aria-hidden="true" />
    <span className="official-post-preview-icon" aria-hidden="true">{post.platform === "instagram" ? <Instagram /> : <Play />}</span>
    <span className="official-post-preview-copy"><strong>Publicación original de {providerLabel}</strong><small>{interactive ? "Cargar carrusel, fotos, descripción y contenido que permita la red" : "Ver la publicación original"}</small></span>
    <span className="official-post-play" aria-hidden="true"><Play fill="currentColor" /></span>
  </button>;
  return <div className={`social-media-block${shouldAutoLoadEmbed ? " social-media-block--auto-embed" : ""}`}>
    {interactive&&current?<div className="media-carousel" role="region" aria-label={`Galería: ${post.title}`} tabIndex={0} onKeyDown={e=>{if(e.key==="ArrowRight")setIndex(i=>(i+1)%gallery.length);if(e.key==="ArrowLeft")setIndex(i=>(i+gallery.length-1)%gallery.length);}}>
      {current.type==="video"?<video key={current.url} controls playsInline preload="metadata" src={assetUrl(current.url)} aria-label={current.alt||post.title}/>:<img src={assetUrl(current.url)} alt={current.alt||post.title} loading="lazy"/>}
      {gallery.length>1&&<div className="carousel-controls"><button aria-label="Imagen anterior" onClick={()=>setIndex(i=>(i+gallery.length-1)%gallery.length)}><ChevronLeft/></button><span aria-live="polite">{index%gallery.length+1} / {gallery.length}</span><button aria-label="Imagen siguiente" onClick={()=>setIndex(i=>(i+1)%gallery.length)}><ChevronRight/></button></div>}
    </div>:interactive&&media&&(post.kind==="video"||/\.(mp4|webm|ogg)(\?|$)/i.test(media))?<video className="native-video" controls playsInline preload="metadata" poster={thumb||undefined} src={media}/>:interactive&&officialPreview&&!loaded?sourcePreview:!(interactive&&loaded&&embed)&&<div className="showcase-media">{thumb||media?<img src={media||thumb} alt={post.title} loading="lazy"/>:sourcePreview}<span className="platform-badge">{post.platform}</span></div>}
    {interactive&&embed&&!loaded&&!officialPreview&&(current||media||thumb)&&<div className="provider-embed">{sourcePreview}</div>}
    {interactive&&embed&&loaded&&<div className="provider-embed"><iframe className="social-embed" src={embed} title={`Publicación original: ${post.title}`} loading={shouldAutoLoadEmbed ? "eager" : "lazy"} referrerPolicy="no-referrer" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/></div>}
    {interactive&&source&&<a className="social-source-link" href={source} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Ver publicación y comentarios reales en {post.platform}</a>}
  </div>;
}
