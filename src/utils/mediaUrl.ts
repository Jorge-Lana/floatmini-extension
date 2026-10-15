import { MediaTrack, PlatformType } from '../types';

const DIRECT_VIDEO_RE = /\.(mp4|webm|ogv|ogg|m4v)(\?|#|$)/i;
const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80';

function youTubeVideoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (host !== 'youtube.com' && host !== 'music.youtube.com' && host !== 'youtube-nocookie.com') return null;
  const v = url.searchParams.get('v');
  if (v) return v;
  const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
  return match ? match[1] : null;
}

/**
 * Converte um link colado pelo usuário em algo que pode ser exibido num iframe.
 * Páginas normais do YouTube, YouTube Music e Spotify bloqueiam iframes, então
 * só as versões "embed" funcionam. Retorna null para links não suportados.
 */
export function parseMediaUrl(raw: string): MediaTrack | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const base = { id: `custom-${Date.now()}`, artist: 'URL do Usuário', coverUrl: FALLBACK_COVER, duration: 300 };
  const isMusic = url.hostname === 'music.youtube.com';

  const videoId = youTubeVideoId(url);
  const playlistId = url.searchParams.get('list');
  if (videoId || playlistId) {
    const embedUrl = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1`;
    const platform: PlatformType = isMusic ? 'youtube-music' : 'youtube';
    return {
      ...base,
      platform,
      title: isMusic ? 'YouTube Music (Tela Menor)' : `YouTube: ${videoId || playlistId}`,
      embedUrl,
      type: isMusic ? 'audio' : 'video'
    };
  }

  if (url.hostname === 'open.spotify.com') {
    // Aceita /track/ID e /intl-pt/track/ID
    const parts = url.pathname.split('/').filter((p) => p && !p.startsWith('intl-') && p !== 'embed');
    const [kind, id] = parts;
    if (kind && id && SPOTIFY_TYPES.has(kind)) {
      return {
        ...base,
        platform: 'spotify',
        title: 'Spotify Web Player',
        embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
        type: 'audio'
      };
    }
    return null;
  }

  if (DIRECT_VIDEO_RE.test(url.pathname)) {
    return {
      ...base,
      platform: 'custom',
      title: decodeURIComponent(url.pathname.split('/').pop() || 'Vídeo'),
      embedUrl: '',
      videoUrl: url.href,
      type: 'video'
    };
  }

  return null;
}
