import { MediaTrack } from '../types';

export const MEDIA_PRESETS: MediaTrack[] = [
  {
    id: 'yt-lofi',
    platform: 'youtube',
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    artist: 'Lofi Girl',
    album: 'Chill Beats 2026',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=1',
    duration: 3600,
    type: 'video',
    description: 'Vídeo clássico de estudo e foco em 16:9 Always-on-Top.'
  },
  {
    id: 'ytm-midnight',
    platform: 'youtube-music',
    title: 'Midnight City (Synthwave Edition)',
    artist: 'M83 / Neon Synth',
    album: 'Hurry Up, We\'re Dreaming',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/DX3h6b7y-pQ?autoplay=1&mute=1&controls=1',
    duration: 243,
    type: 'audio',
    description: 'YouTube Music modo Tela Menor: super compacto (320x160px), barra de progresso e visualizador.'
  },
  {
    id: 'ytm-acoustic',
    platform: 'youtube-music',
    title: 'Coffee Shop Acoustic Sessions',
    artist: 'Luna Rivera',
    album: 'Quiet Mornings EP',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/5qap5aO4i9A?autoplay=1&mute=1&controls=1',
    duration: 198,
    type: 'audio',
    description: 'Modo compacto ideal para escutar enquanto escreve ou programa.'
  },
  {
    id: 'spotify-ambient',
    platform: 'spotify',
    title: 'Deep Focus & Brain Waves',
    artist: 'Spotify Studios',
    album: 'Productivity Playlist',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    embedUrl: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator&theme=0',
    duration: 310,
    type: 'audio',
    description: 'Spotify Web Player mini widget de altura reduzida (152px) fixo na tela.'
  },
  {
    id: 'custom-html5',
    platform: 'custom',
    title: 'Sintel Stream (HTML5 Video Nativo PiP)',
    artist: 'Blender Foundation',
    coverUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    embedUrl: '',
    duration: 52,
    type: 'video',
    description: 'Vídeo MP4 direto para testar o Picture-in-Picture nativo do navegador e Document PiP.'
  }
];
