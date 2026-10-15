import React, { useState } from 'react';
import { Youtube, Music, Radio, Tv, Link as LinkIcon, Plus, Check } from 'lucide-react';
import { MediaTrack, PlatformType } from '../types';
import { MEDIA_PRESETS } from '../data/mediaPresets';

interface PlatformPresetsProps {
  currentTrack: MediaTrack;
  onSelectTrack: (track: MediaTrack) => void;
  onCustomTrackSubmit: (url: string) => void;
}

export const PlatformPresets: React.FC<PlatformPresetsProps> = ({
  currentTrack,
  onSelectTrack,
  onCustomTrackSubmit
}) => {
  const [customInput, setCustomInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    try {
      onCustomTrackSubmit(customInput.trim());
      setCustomInput('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Insira uma URL válida do YouTube ou Spotify.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Selecione uma Mídia ou Plataforma
          </h3>
          <p className="text-xs text-slate-400">
            Experimente instantaneamente os diferentes modos da janela flutuante Always-on-Top.
          </p>
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {MEDIA_PRESETS.map((preset) => {
          const isSelected = currentTrack.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectTrack(preset)}
              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-200 group relative ${
                isSelected
                  ? 'bg-slate-800 border-blue-500/80 shadow-md ring-1 ring-blue-500/20'
                  : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              {/* Platform badge */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  {preset.platform === 'youtube' && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                      <Youtube className="w-3.5 h-3.5" />
                      <span>YouTube</span>
                    </div>
                  )}
                  {preset.platform === 'youtube-music' && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                      <Music className="w-3.5 h-3.5" />
                      <span>YT Music (Tela Menor)</span>
                    </div>
                  )}
                  {preset.platform === 'spotify' && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Spotify Web</span>
                    </div>
                  )}
                  {preset.platform === 'custom' && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                      <Tv className="w-3.5 h-3.5" />
                      <span>HTML5 Video</span>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {/* Cover and details */}
              <div className="flex items-center gap-2.5">
                <img
                  src={preset.coverUrl}
                  alt=""
                  className="w-11 h-11 rounded-lg object-cover border border-slate-700/60 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                    {preset.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{preset.artist}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-2.5 line-clamp-2">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Custom URL Input Bar */}
      <div className="pt-4 border-t border-slate-800">
        <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Cole uma URL do YouTube, YouTube Music ou link direto de vídeo..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Carregar na Janela</span>
          </button>
        </form>
        {errorMsg && <p className="text-xs text-red-400 mt-1">{errorMsg}</p>}
      </div>
    </div>
  );
};
