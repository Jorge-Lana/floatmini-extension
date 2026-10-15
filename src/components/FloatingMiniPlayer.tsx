import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ExternalLink,
  Move,
  Layers,
  Music,
  Video,
  X,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Sliders,
  CheckCircle2,
  MonitorPlay,
  Gauge,
  ShieldAlert
} from 'lucide-react';
import { MediaTrack, PlayerSettings } from '../types';

interface FloatingMiniPlayerProps {
  currentTrack: MediaTrack;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  currentTrack,
  onNextTrack,
  onPrevTrack,
  settings,
  onUpdateSettings,
  containerRef
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(18);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDocPipSupported, setIsDocPipSupported] = useState(false);
  const [docPipActive, setDocPipActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerCardRef = useRef<HTMLDivElement>(null);

  // Check Document Picture-in-Picture capability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      setIsDocPipSupported(true);
    }
  }, []);

  // Sync video play/pause and playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = settings.playbackRate || 1.0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack, settings.playbackRate]);

  // Audio/video timer simulation when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentTrack.duration) {
            // Track finished! Check repeat mode
            if (settings.repeatMode === 'one') {
              if (videoRef.current) videoRef.current.currentTime = 0;
              return 0;
            } else if (settings.repeatMode === 'all') {
              onNextTrack();
              return 0;
            } else {
              setIsPlaying(false);
              return currentTrack.duration;
            }
          }
          return prev + 1;
        });
      }, 1000 / (settings.playbackRate || 1.0));
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack.duration, settings.repeatMode, settings.playbackRate, onNextTrack]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3200);
  };

  // Skip 10 seconds (Backward or Forward)
  const handleSkipSeconds = (deltaSeconds: number) => {
    setCurrentTime(prev => {
      const nextTime = Math.max(0, Math.min(currentTrack.duration, prev + deltaSeconds));
      if (videoRef.current) {
        videoRef.current.currentTime = nextTime;
      }
      return nextTime;
    });

    const label = deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`;
    setSkipFeedback(label);
    setTimeout(() => setSkipFeedback(null), 900);
    showToast(deltaSeconds > 0 ? 'Avançou 10 segundos' : 'Voltou 10 segundos');
  };

  // Toggle Repeat Mode: off -> all -> one -> off
  const handleCycleRepeat = () => {
    const current = settings.repeatMode || 'off';
    let next: 'off' | 'all' | 'one' = 'all';
    let label = '';

    if (current === 'off') {
      next = 'all';
      label = 'Repetir Playlist: Ativado 🔁';
    } else if (current === 'all') {
      next = 'one';
      label = 'Repetir Música Atual: Ativado 🔂';
    } else {
      next = 'off';
      label = 'Repetição: Desativada';
    }

    onUpdateSettings({ repeatMode: next });
    showToast(label);
  };

  // Toggle Shuffle
  const handleToggleShuffle = () => {
    const nextState = !settings.isShuffle;
    onUpdateSettings({ isShuffle: nextState });
    showToast(nextState ? 'Ordem Aleatória (Shuffle): Ativado 🔀' : 'Ordem Aleatória: Desativado');
  };

  // Cycle playback speed
  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const current = settings.playbackRate || 1.0;
    const nextIndex = (speeds.indexOf(current) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    onUpdateSettings({ playbackRate: nextSpeed });
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
    showToast(`Velocidade: ${nextSpeed}x`);
  };

  // Launch Native Document Picture-in-Picture (Real OS-level Always-on-Top!)
  const handleOpenDocumentPiP = async () => {
    if ('documentPictureInPicture' in window) {
      try {
        // @ts-ignore
        if (window.documentPictureInPicture.window) {
          // @ts-ignore
          window.documentPictureInPicture.window.close();
          setDocPipActive(false);
          return;
        }

        // @ts-ignore
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: settings.aspectRatio === 'compact-audio' ? 340 : 440,
          height: settings.aspectRatio === 'compact-audio' ? 190 : 260
        });

        setDocPipActive(true);
        showToast('Janela Always-on-Top nativa aberta! Permanece sobre outros apps.');

        // Setup PiP window styling & DOM
        const pipDoc = pipWindow.document;
        const style = pipDoc.createElement('style');
        style.textContent = `
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { background: #0b1120; color: #f8fafc; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #0f172a; font-size: 11px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .media-box { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden; position: relative; }
          .controls { padding: 8px 10px; background: #0f172a; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 6px; }
          .row { display: flex; align-items: center; justify-content: space-between; }
          .track-title { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
          .track-sub { font-size: 9px; color: #94a3b8; }
          .btn-group { display: flex; align-items: center; gap: 4px; }
          .btn { background: #1e293b; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 3px 7px; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 3px; font-weight: 600; }
          .btn:hover { background: #334155; color: #fff; }
          .btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; }
          .badge { background: #2563eb; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
        `;
        pipDoc.head.appendChild(style);

        const isVideo = currentTrack.platform === 'youtube' || currentTrack.type === 'video';

        pipDoc.body.innerHTML = `
          <div class="header">
            <span>FloatMini • Always on Top</span>
            <span class="badge">NATIVO OS</span>
          </div>
          <div class="media-box">
            ${currentTrack.videoUrl ? `
              <video id="pip-video-el" src="${currentTrack.videoUrl}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>
            ` : `
              <div style="text-align:center; padding:12px;">
                <img src="${currentTrack.coverUrl}" style="width:64px; height:64px; border-radius:8px; object-fit:cover; margin-bottom:6px;" />
                <div class="track-title">${currentTrack.title}</div>
                <div class="track-sub">${currentTrack.artist}</div>
              </div>
            `}
          </div>
          <div class="controls">
            <div class="row">
              <div>
                <div class="track-title">${currentTrack.title}</div>
                <div class="track-sub">${currentTrack.platform === 'youtube-music' ? 'YT Music (Tela Menor)' : currentTrack.platform}</div>
              </div>
              <button id="pip-close-btn" class="btn" style="background:#ef4444; color:#fff; border:none;">✕</button>
            </div>
            
            <div class="row" style="justify-content: center; gap: 6px;">
              ${isVideo ? `
                <button id="pip-back-10" class="btn" title="Voltar 10s">⏪ -10s</button>
                <button id="pip-play-btn" class="btn" style="background:#2563eb; color:#fff; padding:4px 12px;">⏯ Play/Pause</button>
                <button id="pip-fwd-10" class="btn" title="Avançar 10s">⏩ +10s</button>
              ` : `
                <button id="pip-shuffle-btn" class="btn ${settings.isShuffle ? 'active' : ''}">🔀 Shuffle</button>
                <button id="pip-play-btn" class="btn" style="background:#2563eb; color:#fff; padding:4px 12px;">⏯ Play/Pause</button>
                <button id="pip-repeat-btn" class="btn ${settings.repeatMode !== 'off' ? 'active' : ''}">
                  ${settings.repeatMode === 'one' ? '🔂 Música' : settings.repeatMode === 'all' ? '🔁 Playlist' : '🔁 Repetir'}
                </button>
              `}
            </div>
          </div>
        `;

        const closeBtn = pipDoc.getElementById('pip-close-btn');
        if (closeBtn) closeBtn.onclick = () => pipWindow.close();

        const videoEl = pipDoc.getElementById('pip-video-el') as HTMLVideoElement;
        const playBtn = pipDoc.getElementById('pip-play-btn');
        if (playBtn && videoEl) {
          playBtn.onclick = () => {
            if (videoEl.paused) videoEl.play(); else videoEl.pause();
          };
        }

        const back10 = pipDoc.getElementById('pip-back-10');
        if (back10 && videoEl) {
          back10.onclick = () => { videoEl.currentTime = Math.max(0, videoEl.currentTime - 10); };
        }

        const fwd10 = pipDoc.getElementById('pip-fwd-10');
        if (fwd10 && videoEl) {
          fwd10.onclick = () => { videoEl.currentTime = Math.min(videoEl.duration || 9999, videoEl.currentTime + 10); };
        }

        pipWindow.addEventListener('pagehide', () => {
          setDocPipActive(false);
        });

      } catch (err) {
        console.warn('Erro Document PiP:', err);
        showToast('Document PiP requer permissão ou navegador Chrome/Edge atualizado.');
      }
    } else {
      showToast('Document PiP suportado nativamente no Chrome e Edge.');
    }
  };

  // Launch HTML5 Video Picture-in-Picture
  const handleOpenVideoPiP = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
          showToast('Vídeo destacado em Picture-in-Picture nativo!');
        }
      } catch (err) {
        console.warn('Erro Video PiP:', err);
        showToast('Picture-in-Picture ativado para o player.');
      }
    } else {
      showToast('Este player é de áudio/embed.');
    }
  };

  // Launch Popup Window
  const handleOpenPopupWindow = () => {
    const w = settings.aspectRatio === 'compact-audio' ? 360 : 440;
    const h = settings.aspectRatio === 'compact-audio' ? 190 : 260;
    const left = window.screen.width - w - 40;
    const top = 60;
    
    const popup = window.open(
      currentTrack.embedUrl || currentTrack.videoUrl || 'about:blank',
      'FloatMiniWindow',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,alwaysOnTop=yes`
    );
    if (popup) {
      showToast('Janela popup independente criada no canto da tela!');
    } else {
      showToast('Permita popups no navegador para abrir a janela.');
    }
  };

  // Dragging logic for in-app dock
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - settings.position.x,
      y: e.clientY - settings.position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = Math.max(10, Math.min(window.innerWidth - settings.width - 20, e.clientX - dragOffset.x));
      const newY = Math.max(10, Math.min(window.innerHeight - settings.height - 20, e.clientY - dragOffset.y));

      onUpdateSettings({
        position: { x: newX, y: newY },
        dockCorner: 'custom'
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, settings.width, settings.height, onUpdateSettings]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isYouTubeMusicMode = currentTrack.platform === 'youtube-music' || settings.aspectRatio === 'compact-audio';
  const isSpotifyMode = currentTrack.platform === 'spotify' || settings.aspectRatio === 'spotify';
  const isVideoMode = currentTrack.platform === 'youtube' || currentTrack.type === 'video';

  return (
    <>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 bg-slate-900/95 text-slate-100 border border-blue-500/40 px-4 py-2.5 rounded-lg shadow-xl backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Floating Mini Window Container */}
      <div
        ref={playerCardRef}
        style={{
          transform: `translate3d(${settings.position.x}px, ${settings.position.y}px, 0)`,
          width: settings.isMinimized ? '280px' : `${settings.width}px`,
          opacity: settings.opacity,
          transition: isDragging ? 'none' : 'width 0.2s ease, opacity 0.15s ease'
        }}
        className={`fixed top-0 left-0 z-50 select-none rounded-xl overflow-hidden shadow-2xl border transition-shadow duration-300 ${
          settings.isAlwaysOnTop
            ? 'border-blue-500/60 ring-2 ring-blue-500/20 shadow-blue-500/10'
            : 'border-slate-800'
        } bg-slate-950/95 backdrop-blur-xl flex flex-col group`}
      >
        {/* Title Bar / Drag Header */}
        <div
          onMouseDown={handleMouseDown}
          className={`h-9 px-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-slate-800/80 transition-colors ${
            settings.isAlwaysOnTop ? 'bg-slate-900/90 text-slate-200' : 'bg-slate-950 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-semibold tracking-tight text-slate-200 truncate">
                {currentTrack.platform === 'youtube-music'
                  ? 'YT Music • Tela Menor'
                  : currentTrack.platform === 'spotify'
                  ? 'Spotify Mini'
                  : 'FloatMini'}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-mono px-1 py-0.2 text-blue-400 bg-blue-500/10 rounded">
                Always on Top
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1 interactive-control">
            {/* Real Document PiP Button */}
            <button
              onClick={handleOpenDocumentPiP}
              title="Abrir em Janela Flutuante Nativa do Navegador (OS Always-on-Top)"
              className={`p-1 rounded text-slate-400 hover:text-white transition-colors ${
                docPipActive ? 'text-blue-400 bg-blue-500/20' : 'hover:bg-slate-800'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
            </button>

            {/* Video PiP Button if video element available */}
            {currentTrack.videoUrl && (
              <button
                onClick={handleOpenVideoPiP}
                title="Destacar Vídeo em Picture-in-Picture Nativo"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Popup Window */}
            <button
              onClick={handleOpenPopupWindow}
              title="Abrir Janela Popup Independente"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Minimize toggle */}
            <button
              onClick={() => onUpdateSettings({ isMinimized: !settings.isMinimized })}
              title={settings.isMinimized ? 'Expandir' : 'Minimizar para micro-barra'}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {settings.isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Content Body: Hidden if minimized */}
        {!settings.isMinimized && (
          <div className="flex flex-col flex-1">
            {/* Media Area */}
            <div
              className={`relative bg-black flex items-center justify-center overflow-hidden ${
                isYouTubeMusicMode
                  ? 'h-[110px]'
                  : isSpotifyMode
                  ? 'h-[135px]'
                  : 'h-[185px]'
              }`}
            >
              {/* Skip Feedback Flash Indicator */}
              {skipFeedback && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in zoom-in-95 pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white font-bold text-sm tracking-wide border border-blue-500/50 shadow-2xl flex items-center gap-1.5">
                    <span>{skipFeedback}</span>
                  </div>
                </div>
              )}


              {/* If YouTube standard embed or direct video */}
              {currentTrack.videoUrl ? (
                <video
                  ref={videoRef}
                  src={currentTrack.videoUrl}
                  autoPlay
                  loop
                  muted={settings.isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : isSpotifyMode ? (
                <iframe
                  src={currentTrack.embedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={currentTrack.embedUrl}
                  width="100%"
                  height="100%"
                  title={currentTrack.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full pointer-events-auto"
                />
              )}

              {/* YouTube Music Compact Overlay Layout */}
              {isYouTubeMusicMode && (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60 p-3 flex items-center gap-3">
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-16 h-16 rounded-lg object-cover shadow-lg border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold mb-0.5">
                      <Music className="w-3 h-3" />
                      <span>YouTube Music • Tela Menor</span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{currentTrack.artist}</p>

                    {/* Animated audio wave bars */}
                    <div className="flex items-end gap-0.5 h-3.5 mt-1.5">
                      {[12, 20, 8, 16, 24, 14, 18, 10, 22, 15].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            height: isPlaying ? `${Math.sin((currentTime + i) * 1.5) * 8 + 12}px` : '4px'
                          }}
                          className="w-1 bg-red-500 rounded-full transition-all duration-150"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Playback Bar & Progress */}
            <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800/80">
              {/* Track Title Info (for regular mode) */}
              {!isYouTubeMusicMode && !isSpotifyMode && (
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">{currentTrack.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatTime(currentTime)} / {formatTime(currentTrack.duration)}
                  </span>
                </div>
              )}

              {/* Progress Scrubber */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const newTime = Math.floor(ratio * currentTrack.duration);
                  setCurrentTime(newTime);
                  if (videoRef.current) {
                    videoRef.current.currentTime = newTime;
                  }
                }}
                className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer group/bar interactive-control mb-2"
              >
                <div
                  style={{ width: `${(currentTime / currentTrack.duration) * 100}%` }}
                  className={`h-full transition-all ${
                    currentTrack.platform === 'spotify'
                      ? 'bg-emerald-500'
                      : currentTrack.platform === 'youtube-music'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  } group-hover/bar:brightness-125`}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between interactive-control">
                {/* Left controls: Playback & Navigation */}
                <div className="flex items-center gap-1.5">
                  {/* Prev Track */}
                  <button
                    onClick={onPrevTrack}
                    title="Faixa Anterior"
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  {/* YouTube Video Specific Controls: Jump -10s */}
                  {isVideoMode && (
                    <button
                      onClick={() => handleSkipSeconds(-10)}
                      title="Voltar 10 segundos (-10s)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-all border border-slate-700/60"
                    >
                      <RotateCcw className="w-3 h-3 text-blue-400" />
                      <span>-10s</span>
                    </button>
                  )}

                  {/* Play / Pause button */}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isPlaying
                        ? currentTrack.platform === 'youtube-music'
                          ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                          : currentTrack.platform === 'spotify'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  {/* YouTube Video Specific Controls: Jump +10s */}
                  {isVideoMode && (
                    <button
                      onClick={() => handleSkipSeconds(10)}
                      title="Avançar 10 segundos (+10s)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-all border border-slate-700/60"
                    >
                      <span>+10s</span>
                      <RotateCw className="w-3 h-3 text-blue-400" />
                    </button>
                  )}

                  {/* Next Track */}
                  <button
                    onClick={onNextTrack}
                    title="Próxima Faixa"
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  {/* YouTube Music & Spotify Specific Controls: Shuffle & Repeat! */}
                  {(isYouTubeMusicMode || isSpotifyMode) && (
                    <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-800">
                      {/* Shuffle Button */}
                      <button
                        onClick={handleToggleShuffle}
                        title={
                          settings.isShuffle
                            ? 'Ordem Aleatória (Shuffle): Ativado'
                            : 'Ordem Aleatória (Shuffle): Desativado (Clique para ativar)'
                        }
                        className={`p-1.5 rounded transition-all ${
                          settings.isShuffle
                            ? currentTrack.platform === 'spotify'
                              ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                              : 'text-red-400 bg-red-500/20 border border-red-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>

                      {/* Repeat Mode Button: off -> all (repetir playlist) -> one (repetir música atual) */}
                      <button
                        onClick={handleCycleRepeat}
                        title={
                          settings.repeatMode === 'one'
                            ? 'Repetir Música Atual: Ativado (Clique para desativar)'
                            : settings.repeatMode === 'all'
                            ? 'Repetir Playlist: Ativado (Clique para repetir música atual)'
                            : 'Repetição: Desativada (Clique para repetir playlist)'
                        }
                        className={`p-1.5 rounded relative transition-all ${
                          settings.repeatMode !== 'off'
                            ? currentTrack.platform === 'spotify'
                              ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                              : 'text-red-400 bg-red-500/20 border border-red-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {settings.repeatMode === 'one' ? (
                          <Repeat1 className="w-3.5 h-3.5" />
                        ) : (
                          <Repeat className="w-3.5 h-3.5" />
                        )}
                        {/* Mini indicator badge for playlist vs track */}
                        {settings.repeatMode === 'all' && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 ring-1 ring-slate-900" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Volume Control */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={() => onUpdateSettings({ isMuted: !settings.isMuted })}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      {settings.isMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.isMuted ? 0 : settings.volume}
                      onChange={(e) =>
                        onUpdateSettings({ volume: Number(e.target.value), isMuted: false })
                      }
                      className="w-12 h-1 accent-blue-500 bg-slate-700 rounded cursor-pointer"
                    />
                  </div>

                </div>

                {/* Right controls: Speed, Opacity & Corner Jump */}
                <div className="flex items-center gap-1 text-[10px]">
                  {/* Video Playback Speed Toggle */}
                  {isVideoMode && (
                    <button
                      onClick={handleCycleSpeed}
                      title="Velocidade de Reprodução"
                      className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-[9px]"
                    >
                      {settings.playbackRate || 1.0}x
                    </button>
                  )}

                  {/* Opacity selector */}
                  <select
                    value={settings.opacity}
                    onChange={(e) => onUpdateSettings({ opacity: Number(e.target.value) })}
                    title="Nível de transparência para ver telas de código ou textos por baixo"
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer"
                  >
                    <option value={1}>100%</option>
                    <option value={0.85}>85%</option>
                    <option value={0.7}>70%</option>
                    <option value={0.5}>50%</option>
                  </select>

                  {/* Corner Dock Quick Jump */}
                  <button
                    onClick={() => {
                      const w = settings.width;
                      const h = settings.height;
                      onUpdateSettings({
                        position: { x: window.innerWidth - w - 24, y: window.innerHeight - h - 30 },
                        dockCorner: 'bottom-right'
                      });
                    }}
                    title="Fixar no canto inferior direito"
                    className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Minimized Pill Bar Mode */}
        {settings.isMinimized && (
          <div className="px-3 py-2 bg-slate-900/90 flex items-center justify-between interactive-control">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="w-7 h-7 rounded object-cover shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Skip 10s if video in minimized mode */}
              {isVideoMode && (
                <button
                  onClick={() => handleSkipSeconds(10)}
                  title="Avançar 10s"
                  className="p-1 text-slate-400 hover:text-white text-[10px] font-mono"
                >
                  +10s
                </button>
              )}
              {/* Shuffle button if music in minimized mode */}
              {(isYouTubeMusicMode || isSpotifyMode) && (
                <button
                  onClick={handleToggleShuffle}
                  className={`p-1 text-slate-400 hover:text-white ${settings.isShuffle ? 'text-emerald-400' : ''}`}
                >
                  <Shuffle className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
              </button>
              <button
                onClick={() => onUpdateSettings({ isMinimized: false })}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
