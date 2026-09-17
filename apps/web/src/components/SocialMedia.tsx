import { ChevronLeft, ChevronRight, ExternalLink, Instagram, Play } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../lib/api";
import { safeExternalUrl } from "../lib/contact";
import type { Publication } from "../types";

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
export function SocialMedia({post,interactive=false}:{post:Publication;interactive?:boolean}){
  const [loaded,setLoaded]=useState(false),[index,setIndex]=useState(0);
  const gallery=post.gallery||[];const current=gallery[index%Math.max(1,gallery.length)];
  const embed=embedUrl(post),source=safeExternalUrl(post.external_url);
  const thumb=assetUrl(post.thumbnail_url),media=assetUrl(post.media_url);
  const providerLabel=post.platform === "instagram" ? "Instagram" : post.platform === "tiktok" ? "TikTok" : post.platform === "youtube" ? "YouTube" : post.platform;
  const officialPreview = Boolean(source && embed && !current && !media);
  const sourcePreview = <button className="official-post-preview" type="button" onClick={()=>setLoaded(true)} aria-label={`Cargar publicación original de ${providerLabel}: ${post.title}`}>
    {post.platform === "instagram" ? <Instagram /> : <Play />}
    <span><strong>Publicación original de {providerLabel}</strong><small>{interactive ? "Cargar carrusel, fotos, descripción y contenido que permita la red" : "Ver la publicación original"}</small></span>
    <Play className="official-post-play" fill="currentColor" />
  </button>;
  return <div className="social-media-block">
    {interactive&&current?<div className="media-carousel" role="region" aria-label={`Galería: ${post.title}`} tabIndex={0} onKeyDown={e=>{if(e.key==="ArrowRight")setIndex(i=>(i+1)%gallery.length);if(e.key==="ArrowLeft")setIndex(i=>(i+gallery.length-1)%gallery.length);}}>
      {current.type==="video"?<video key={current.url} controls playsInline preload="metadata" src={assetUrl(current.url)} aria-label={current.alt||post.title}/>:<img src={assetUrl(current.url)} alt={current.alt||post.title} loading="lazy"/>}
      {gallery.length>1&&<div className="carousel-controls"><button aria-label="Imagen anterior" onClick={()=>setIndex(i=>(i+gallery.length-1)%gallery.length)}><ChevronLeft/></button><span aria-live="polite">{index%gallery.length+1} / {gallery.length}</span><button aria-label="Imagen siguiente" onClick={()=>setIndex(i=>(i+1)%gallery.length)}><ChevronRight/></button></div>}
    </div>:interactive&&media&&(post.kind==="video"||/\.(mp4|webm|ogg)(\?|$)/i.test(media))?<video className="native-video" controls playsInline preload="metadata" poster={thumb||undefined} src={media}/>:interactive&&officialPreview&&!loaded?sourcePreview:!(interactive&&loaded&&embed)&&<div className="showcase-media">{thumb||media?<img src={media||thumb} alt={post.title} loading="lazy"/>:sourcePreview}<span className="platform-badge">{post.platform}</span></div>}
    {interactive&&embed&&!loaded&&!officialPreview&&(current||media||thumb)&&<div className="provider-embed">{sourcePreview}</div>}
    {interactive&&embed&&loaded&&<div className="provider-embed"><iframe className="social-embed" src={embed} title={`Publicación original: ${post.title}`} loading="lazy" referrerPolicy="no-referrer" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen/></div>}
    {interactive&&source&&<a className="social-source-link" href={source} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Ver publicación y comentarios reales en {post.platform}</a>}
  </div>;
}
