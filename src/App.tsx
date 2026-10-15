/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  MonitorPlay,
  Layers,
  Sparkles,
  Keyboard,
  ExternalLink,
  CheckCircle2,
  Tv,
  HelpCircle,
  FileCode,
  Music,
  Maximize2
} from 'lucide-react';
import { MediaTrack, PlayerSettings } from './types';
import { MEDIA_PRESETS } from './data/mediaPresets';
import { FloatingMiniPlayer } from './components/FloatingMiniPlayer';
import { PlatformPresets } from './components/PlatformPresets';
import { SettingsBar } from './components/SettingsBar';
import { ExtensionDownloader } from './components/ExtensionDownloader';
import { CodeViewer } from './components/CodeViewer';
import { MockBrowsingArea } from './components/MockBrowsingArea';
import { generateExtensionZip, downloadBlob } from './utils/zipGenerator';
import { parseMediaUrl } from './utils/mediaUrl';
import { SUPPORT_URL } from './links';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<MediaTrack>(MEDIA_PRESETS[1]); // Default to YouTube Music Tela Menor!
  const [activeTab, setActiveTab] = useState<'simulator' | 'extension' | 'code'>('simulator');
  const [shortcutFeedback, setShortcutFeedback] = useState(false);

  // Player Settings
  const [settings, setSettings] = useState<PlayerSettings>({
    width: 360,
    height: 180,
    opacity: 1.0,
    isAlwaysOnTop: true,
    volume: 85,
    isMuted: false,
    isPlaying: true,
    playbackRate: 1.0,
    isCompactMode: true,
    aspectRatio: 'compact-audio',
    repeatMode: 'all',
    isShuffle: false,
    position: {
      x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 380) : 800,
      y: typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 280) : 400
    },
    isMinimized: false,
    dockCorner: 'bottom-right',
    autoPiPOnTabChange: true,
    showControlsOnHover: true
  });

  const appContainerRef = useRef<HTMLDivElement>(null);

  // Atalho Alt+P (janela flutuante)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setShortcutFeedback(true);
        setTimeout(() => setShortcutFeedback(false), 2500);

        // Toggle minimized or trigger PiP
        setSettings(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update position on window resize if docked
  useEffect(() => {
    const handleResize = () => {
      if (settings.dockCorner === 'bottom-right') {
        setSettings(prev => ({
          ...prev,
          position: {
            x: Math.max(20, window.innerWidth - prev.width - 24),
            y: Math.max(20, window.innerHeight - prev.height - 24)
          }
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.dockCorner, settings.width, settings.height]);

  const handleUpdateSettings = (newSettings: Partial<PlayerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleSelectTrack = (track: MediaTrack) => {
    setCurrentTrack(track);

    // Auto-adjust dimensions according to platform
    if (track.platform === 'youtube-music') {
      handleUpdateSettings({
        width: 360,
        height: 180,
        aspectRatio: 'compact-audio',
        isCompactMode: true
      });
    } else if (track.platform === 'spotify') {
      handleUpdateSettings({
        width: 360,
        height: 160,
        aspectRatio: 'spotify',
        isCompactMode: true
      });
    } else {
      handleUpdateSettings({
        width: 480,
        height: 270,
        aspectRatio: '16:9',
        isCompactMode: false
      });
    }
  };

  const handleCustomTrackSubmit = (url: string) => {
    const track = parseMediaUrl(url);
    // PlatformPresets mostra a mensagem de erro quando isto lança.
    if (!track) throw new Error('URL não suportada');
    handleSelectTrack(track);
  };

  const handleQuickDownload = async () => {
    try {
      const zipBlob = await generateExtensionZip();
      downloadBlob(zipBlob, 'FloatMini-Extensao-AlwaysOnTop.zip');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      ref={appContainerRef}
      className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white relative"
    >
      {/* Visual Feedback for Alt+P Shortcut */}
      {shortcutFeedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-blue-600 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-2xl border border-blue-400 flex items-center gap-2 animate-bounce">
          <Keyboard className="w-4 h-4" />
          <span>Atalho Alt + P detectado! Alternando janela flutuante.</span>
        </div>
      )}

      {/* Persistent Floating Mini Window (Always-on-Top / PiP Simulator) */}
      <FloatingMiniPlayer
        currentTrack={currentTrack}
        onNextTrack={() => {
          if (settings.isShuffle) {
            const others = MEDIA_PRESETS.filter(p => p.id !== currentTrack.id);
            const randomPick = others[Math.floor(Math.random() * others.length)] || MEDIA_PRESETS[0];
            handleSelectTrack(randomPick);
          } else {
            const currentIndex = MEDIA_PRESETS.findIndex(p => p.id === currentTrack.id);
            const nextIndex = (currentIndex + 1) % MEDIA_PRESETS.length;
            handleSelectTrack(MEDIA_PRESETS[nextIndex]);
          }
        }}
        onPrevTrack={() => {
          if (settings.isShuffle) {
            const others = MEDIA_PRESETS.filter(p => p.id !== currentTrack.id);
            const randomPick = others[Math.floor(Math.random() * others.length)] || MEDIA_PRESETS[0];
            handleSelectTrack(randomPick);
          } else {
            const currentIndex = MEDIA_PRESETS.findIndex(p => p.id === currentTrack.id);
            const prevIndex = (currentIndex - 1 + MEDIA_PRESETS.length) % MEDIA_PRESETS.length;
            handleSelectTrack(MEDIA_PRESETS[prevIndex]);
          }
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        containerRef={appContainerRef}
      />

      {/* Main Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MonitorPlay className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">FloatMini</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Always-on-Top
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Mini janela flutuante em 1º plano para YouTube, YT Music & Spotify
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Simulador & Mídia</span>
            </button>

            <button
              onClick={() => setActiveTab('extension')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === 'extension'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Instalar Extensão</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Código Fonte (V3)</span>
            </button>
          </nav>

          {/* 1-Click Quick Action */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Alt</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">P</kbd>
            </div>
            <button
              onClick={handleQuickDownload}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Extensão (.ZIP)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Floating Window Announcement Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Janela Flutuante Ativa no Canto da Sua Tela
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Arraste pela barra de título, mude a opacidade, teste o modo <strong className="text-red-400">YouTube Music Tela Menor</strong> ou abra o <strong className="text-blue-300">Document PiP</strong> nativo do navegador para manter o vídeo por cima de qualquer aplicativo!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => handleSelectTrack(MEDIA_PRESETS[1])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-medium transition-colors"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Testar YT Music (Tela Menor)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Simulator & Media Controls */}
        {activeTab === 'simulator' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Platform & Track Presets */}
            <PlatformPresets
              currentTrack={currentTrack}
              onSelectTrack={handleSelectTrack}
              onCustomTrackSubmit={handleCustomTrackSubmit}
            />

            {/* Dimension & Opacity Tuning Bar */}
            <SettingsBar
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onTriggerPiP={() => {}}
            />

            {/* Mock Browsing Area (Shows floating player on top of scrolling content) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Área de Navegação de Teste
                  </h3>
                  <p className="text-xs text-slate-500">
                    Role a página abaixo e navegue para conferir como o player se comporta em primeiro plano durante o trabalho.
                  </p>
                </div>
              </div>
              <MockBrowsingArea />
            </div>
          </div>
        )}

        {/* Tab 2: Extension Downloader & Installation Guide */}
        {activeTab === 'extension' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <ExtensionDownloader />
          </div>
        )}

        {/* Tab 3: Source Code Inspector */}
        {activeTab === 'code' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Código Fonte da Extensão
              </h2>
              <p className="text-sm text-slate-400">
                Inspecione cada linha de código gerada para o Google Chrome, Microsoft Edge e navegadores Chromium compatíveis com o padrão Manifest V3.
              </p>
            </div>
            <CodeViewer />
          </div>
        )}

        {/* FAQ & Information Grid */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 lg:p-8">
          <div className="max-w-2xl mb-6">
            <h3 className="text-base font-bold text-white tracking-tight">
              Perguntas Frequentes & Como Funciona o Always-on-Top
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Entenda a tecnologia por trás das janelas flutuantes em navegadores web modernos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 text-sm">
                O que é o Document Picture-in-Picture?
              </h4>
              <p className="leading-relaxed">
                É uma API moderna introduzida no Chrome 111+ que permite abrir uma janela Always-on-Top no nível do sistema operacional contendo qualquer elemento HTML, não apenas tags de vídeo puras. Isso possibilita ter capas, controles e visualizadores.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 text-sm">
                Como o modo "Tela Menor" funciona no YT Music?
              </h4>
              <p className="leading-relaxed">
                No YouTube Music e no Spotify Web, a extensão abre um mini player de 360×150 pixels com capa, faixa, artista, barra de progresso e os botões de aleatório, anterior, play, próxima e repetir, controlando o player do próprio site. A música continua tocando na aba original.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 text-sm">
                Funciona com abas em segundo plano?
              </h4>
              <p className="leading-relaxed">
                Sim! Ao destacar a janela com a extensão ou com o Document PiP, o vídeo ou áudio continua tocando ininterruptamente mesmo se você minimizar o navegador principal ou trocar de aba.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 mt-16 py-8 text-center text-xs text-slate-500">
        <p>FloatMini • Extensão & Mini Janela Flutuante Always-on-Top para YouTube, YT Music & Spotify</p>
        <p className="mt-1">Padrão Chrome Extensions Manifest V3 · Document Picture-in-Picture API</p>
        <p className="mt-3">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-400 hover:text-amber-300 hover:underline"
          >
            ☕ Apoie o FloatMini no Buy Me a Coffee
          </a>
        </p>
      </footer>
    </div>
  );
}
