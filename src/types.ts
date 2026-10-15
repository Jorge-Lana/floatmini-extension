export type PlatformType = 'youtube' | 'youtube-music' | 'spotify' | 'twitch' | 'custom';

export interface MediaTrack {
  id: string;
  platform: PlatformType;
  title: string;
  artist: string;
  album?: string;
  coverUrl: string;
  videoUrl?: string;
  embedUrl: string;
  duration: number; // in seconds
  type: 'video' | 'audio';
  description?: string;
}

export interface PlayerSettings {
  width: number;
  height: number;
  opacity: number; // 0.2 to 1.0
  isAlwaysOnTop: boolean;
  volume: number; // 0 to 100
  isMuted: boolean;
  isPlaying: boolean;
  playbackRate: number;
  isCompactMode: boolean;
  aspectRatio: '16:9' | 'compact-audio' | 'spotify' | '4:3' | 'square';
  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  position: { x: number; y: number };
  isMinimized: boolean;
  dockCorner: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | 'custom';
  autoPiPOnTabChange: boolean;
  showControlsOnHover: boolean;
}

export interface ExtensionFile {
  name: string;
  path: string;
  language: 'json' | 'javascript' | 'html' | 'css' | 'markdown';
  content: string;
  description: string;
}
