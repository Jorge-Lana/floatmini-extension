import React from 'react';
import {
  Maximize2,
  Sliders,
  Eye,
  Shield,
  CornerDownRight,
  CornerDownLeft,
  CornerUpRight,
  CornerUpLeft,
  Keyboard,
  Sparkles
} from 'lucide-react';
import { PlayerSettings } from '../types';

interface SettingsBarProps {
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: Partial<PlayerSettings>) => void;
  onTriggerPiP: () => void;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  settings,
  onUpdateSettings,
  onTriggerPiP
}) => {
  const dimensionPresets = [
    { label: 'YT Music (Tela Menor)', w: 340, h: 160, ratio: 'compact-audio' as const },
    { label: 'Mini (320x180)', w: 320, h: 180, ratio: '16:9' as const },
    { label: 'Médio (480x270)', w: 480, h: 270, ratio: '16:9' as const },
    { label: 'Spotify (360x152)', w: 360, h: 152, ratio: 'spotify' as const },
    { label: 'Grande (640x360)', w: 640, h: 360, ratio: '16:9' as const },
  ];

  const corners = [
    { id: 'bottom-right' as const, label: 'Inferior Direito', icon: CornerDownRight, x: () => window.innerWidth - settings.width - 24, y: () => window.innerHeight - settings.height - 24 },
    { id: 'bottom-left' as const, label: 'Inferior Esquerdo', icon: CornerDownLeft, x: () => 24, y: () => window.innerHeight - settings.height - 24 },
    { id: 'top-right' as const, label: 'Superior Direito', icon: CornerUpRight, x: () => window.innerWidth - settings.width - 24, y: () => 80 },
    { id: 'top-left' as const, label: 'Superior Esquerdo', icon: CornerUpLeft, x: () => 24, y: () => 80 },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Size Presets */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Tamanho da Janela Flutuante</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {dimensionPresets.map((preset) => {
              const isActive =
                settings.width === preset.w && settings.height === preset.h;
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    onUpdateSettings({
                      width: preset.w,
                      height: preset.h,
                      aspectRatio: preset.ratio
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Opacity Slider */}
        <div className="space-y-2 lg:max-w-xs w-full">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Opacidade / Transparência</span>
            </div>
            <span className="font-mono text-slate-200">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="1.0"
            step="0.05"
            value={settings.opacity}
            onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-950 accent-blue-500 rounded cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Mais Translúcido</span>
            <span>100% Opaco</span>
          </div>
        </div>

        {/* Right: Quick Corner Positioning */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
            <span>Posicionar no Canto</span>
          </div>
          <div className="flex gap-1.5">
            {corners.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    onUpdateSettings({
                      position: { x: c.x(), y: c.y() },
                      dockCorner: c.id
                    })
                  }
                  title={`Fixar no canto ${c.label}`}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
