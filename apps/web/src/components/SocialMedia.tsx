import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../lib/api";
import type { Publication } from "../types";

function embedUrl(post: Publication) {
  const url = post.external_url;
  if (!url) return "";
  const tiktok = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (tiktok) return `https://www.tiktok.com/player/v1/${tiktok[1]}?autoplay=0&loop=0`;
  const instagram = url.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
  if (instagram) return `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed/`;
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&#/]+)/i);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  return "";
}

export function SocialMedia({ post, interactive = false }: { post: Publication; interactive?: boolean }) {
  const embed = embedUrl(post);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const media = assetUrl(post.media_url);
  const thumb = assetUrl(post.thumbnail_url) || "/images/elvis-desk.png";

  if (interactive && media && (post.kind === "video" || /\.(mp4|webm|ogg)(\?|$)/i.test(media))) {
    return <video className="native-video" controls playsInline preload="metadata" poster={thumb}><source src={media} />Tu navegador no puede reproducir este video.</video>;
  }
  if (interactive && embed && embedLoaded) {
    return <iframe className="social-embed" src={embed} title={post.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  }
  return <div className="showcase-media"><img src={media || thumb} alt="" />{post.kind === "video" && <span className="play-badge"><Play fill="currentColor" /></span>}<span className="platform-badge">{post.platform}</span>{interactive && embed && <button className="media-external" onClick={() => setEmbedLoaded(true)}><Play fill="currentColor" /> Reproducir aquí</button>}{interactive && post.external_url && !embed && <a className="media-external" href={post.external_url} target="_blank" rel="noreferrer"><ExternalLink /> Ver en {post.platform}</a>}</div>;
}
