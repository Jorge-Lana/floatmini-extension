import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Copy,
  FolderArchive,
  Chrome,
  Compass,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Keyboard,
  Layers,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { generateExtensionZip, downloadBlob } from '../utils/zipGenerator';
import { SUPPORT_URL } from '../links';

export const ExtensionDownloader: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeBrowser, setActiveBrowser] = useState<'chrome' | 'edge' | 'brave' | 'opera'>('chrome');

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const zipBlob = await generateExtensionZip();
      downloadBlob(zipBlob, 'FloatMini-Extensao-AlwaysOnTop.zip');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Falha ao gerar ZIP:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Extensão Manifest V3 Pronta para Instalar</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Chrome, Edge, Brave & Opera</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Baixe a Extensão Completa do FloatMini
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            O pacote contém o código fonte pronto com <strong className="text-slate-200">manifest.json</strong>,
            service workers de segundo plano, suporte ao <strong className="text-slate-200">Document Picture-in-Picture</strong> e atalho de teclado na página do vídeo <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-blue-300 font-mono">Alt + P</kbd>.
          </p>
        </div>

        {/* 1-Click Download Button */}
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
              downloadSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Compactando arquivos (.ZIP)...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 text-white" />
                <span>Arquivo Baixado com Sucesso!</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Baixar Extensão (.ZIP)</span>
              </>
            )}
          </button>
          <span className="text-xs text-slate-400">
            Código aberto · 100% local · Chrome 116+ · Firefox 151+
          </span>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline"
          >
            ☕ Gostou? Apoie o projeto
          </a>
        </div>
      </div>

      {/* Feature Highlights Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Always on Top Real</span>
          </div>
          <p className="text-xs text-slate-400">
            Fica acima de qualquer aplicativo aberto, IDE, editor de texto ou planilha.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Layers className="w-4 h-4 text-red-400" />
            <span>YT Music (Tela Menor)</span>
          </div>
          <p className="text-xs text-slate-400">
            Mini player com capa, faixa, progresso e controles, sem gastar tela.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Volta ao Lugar ✨</span>
          </div>
          <p className="text-xs text-slate-400">
            Ao fechar a janela flutuante, o vídeo volta para a página exatamente onde estava, sem perder o ponto.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>Atalho Alt+P</span>
          </div>
          <p className="text-xs text-slate-400">
            Abra e feche a janela flutuante pelo teclado, direto na aba do vídeo.
          </p>
        </div>
      </div>

      {/* Installation Guide Tabs */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Passo a Passo de Instalação no Navegador
          </h3>

          {/* Browser Selector Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveBrowser('chrome')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeBrowser === 'chrome'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Chrome
            </button>
            <button
              onClick={() => setActiveBrowser('edge')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeBrowser === 'edge'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Microsoft Edge
            </button>
            <button
              onClick={() => setActiveBrowser('brave')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeBrowser === 'brave'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Brave / Opera
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Descompacte o ZIP</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique no botão de download acima e extraia a pasta em um local permanente (ex: <code className="text-slate-300">Documentos/FloatMini</code>).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-500">
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
              <span>Contém manifest.json e scripts</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Abra as Extensões</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Copie e cole este endereço na barra de navegação:
              </p>
              <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-mono text-blue-300">
                <span className="truncate">
                  {activeBrowser === 'edge' ? 'edge://extensions' : 'chrome://extensions'}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(activeBrowser === 'edge' ? 'edge://extensions' : 'chrome://extensions')
                  }
                  title="Copiar URL"
                  className="p-1 hover:text-white text-slate-400 ml-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              {copiedUrl ? '✓ Link copiado!' : 'Pressione Enter após colar'}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Modo Desenvolvedor</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ative a chave <strong className="text-slate-200">"Modo de desenvolvedor"</strong> (Developer mode) no canto superior direito da página.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Habilita carregar extensões locais</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-3">
                4
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Carregar sem compactação</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique em <strong className="text-slate-200">"Carregar sem compactação"</strong> (Load unpacked) e selecione a pasta extraída.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Instalação concluída!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
