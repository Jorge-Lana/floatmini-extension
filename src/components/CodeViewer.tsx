import React, { useState } from 'react';
import { Copy, Check, FileCode, Terminal, FileText, Code2, Sparkles } from 'lucide-react';
import { EXTENSION_FILES } from '../extensionCode';
import { ExtensionFile } from '../types';

export const CodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(EXTENSION_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Bar with File Tabs */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Arquivos da Extensão (Manifest V3)
          </span>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copiar Arquivo</span>
            </>
          )}
        </button>
      </div>

      {/* File Navigation Tabs */}
      <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 flex items-center gap-1 overflow-x-auto py-2">
        {EXTENSION_FILES.map((file) => {
          const isSelected = selectedFile.name === file.name;
          return (
            <button
              key={file.name}
              onClick={() => setSelectedFile(file)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {file.name.endsWith('.json') && <FileCode className="w-3.5 h-3.5 text-amber-400" />}
              {file.name.endsWith('.js') && <Code2 className="w-3.5 h-3.5 text-yellow-400" />}
              {file.name.endsWith('.html') && <FileCode className="w-3.5 h-3.5 text-orange-400" />}
              {file.name.endsWith('.css') && <FileCode className="w-3.5 h-3.5 text-sky-400" />}
              {file.name.endsWith('.md') && <FileText className="w-3.5 h-3.5 text-slate-400" />}
              <span>{file.name}</span>
            </button>
          );
        })}
      </div>

      {/* File Description Header */}
      <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <p className="text-slate-400">
          <strong className="text-slate-200 font-mono">{selectedFile.path}:</strong>{' '}
          {selectedFile.description}
        </p>
        <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
          {selectedFile.content.split('\n').length} linhas
        </span>
      </div>

      {/* Code Area */}
      <div className="relative p-5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[460px]">
        <pre className="text-slate-300 leading-relaxed">
          <code>
            {selectedFile.content.split('\n').map((line, idx) => (
              <div key={idx} className="flex">
                <span className="w-10 select-none text-slate-600 text-right pr-4 shrink-0 font-mono">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
