import React, { useState } from 'react';
import { FileText, Code2, Globe, Search, Star, ExternalLink, Bookmark, Sparkles, RefreshCw } from 'lucide-react';

export const MockBrowsingArea: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'article' | 'code' | 'dashboard'>('article');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Simulated Browser Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4">
        {/* Window dots */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>

        {/* Browser Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('article')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'article'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Artigo Científico & Tech</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Editor de Código (VS Code)</span>
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 max-w-sm hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span className="truncate text-slate-300">
            {activeTab === 'article' ? 'https://techreview.dev/articles/future-of-multimedia' : 'https://github.com/my-project/src/index.ts'}
          </span>
        </div>
      </div>

      {/* Simulated Scrollable Page Content */}
      <div className="p-6 md:p-8 max-h-[460px] overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed">
        {activeTab === 'article' ? (
          <article className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wide uppercase">
              <span>Tecnologia & Produtividade</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">5 min de leitura</span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              O Poder do Document Picture-in-Picture e Players Sempre no Topo
            </h1>

            <p className="text-slate-400">
              Durante longas jornadas de trabalho, navegação na web ou programação, ouvir música no <strong>YouTube Music</strong> ou assistir a tutoriais no <strong>YouTube</strong> sem precisar dividir telas pela metade transforma a produtividade.
            </p>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Como funciona na prática?</h3>
              <p className="text-xs text-slate-400">
                A extensão <strong>FloatMini</strong> utiliza a nova especificação da W3C <code>Document Picture-in-Picture API</code>. Diferente do Picture-in-Picture comum (que suportava apenas vídeos isolados), esta API permite manter elementos HTML completos — inclusive controles de YouTube Music com capa, controles de Spotify e widgets — flutuando no nível do sistema operacional.
              </p>
            </div>

            <h2 className="text-lg font-bold text-white pt-2">Vantagens do Modo Tela Menor para YouTube Music</h2>
            <p className="text-slate-400">
              O YouTube Music tradicional ocupa uma janela inteira do navegador. Com o modo "Tela Menor", a janela é compactada para apenas <strong>340 × 160 pixels</strong>, permitindo ver qual música está tocando, pausar, avançar e regular volume enquanto 95% do seu monitor permanece livre para ler, digitar ou jogar.
            </p>

            <p className="text-slate-400">
              Role esta página livremente para testar: observe como a janela flutuante no canto continua perfeitamente visível e interagível em primeiro plano!
            </p>
          </article>
        ) : (
          <div className="font-mono text-xs space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300">
            <div className="text-slate-500">// Simulação de ambiente de programação</div>
            <div className="text-blue-400">import <span className="text-white">&#123;</span> initFloatMini <span className="text-white">&#125;</span> from <span className="text-amber-300">'@floatmini/core'</span>;</div>
            <br />
            <div><span className="text-purple-400">async function</span> <span className="text-yellow-300">bootstrapPiP</span>() &#123;</div>
            <div className="pl-4 text-slate-400">// Solicita janela flutuante nativa Always-on-Top</div>
            <div className="pl-4">
              <span className="text-purple-400">const</span> pipWindow = <span className="text-purple-400">await</span> window.documentPictureInPicture.<span className="text-yellow-300">requestWindow</span>(&#123;
            </div>
            <div className="pl-8">width: <span className="text-amber-300">340</span>,</div>
            <div className="pl-8">height: <span className="text-amber-300">180</span></div>
            <div className="pl-4">&#125;);</div>
            <br />
            <div className="pl-4 text-slate-400">// Mantém em primeiro plano enquanto você codifica</div>
            <div className="pl-4">pipWindow.document.body.appendChild(playerElement);</div>
            <div>&#125;</div>
          </div>
        )}
      </div>
    </div>
  );
};
