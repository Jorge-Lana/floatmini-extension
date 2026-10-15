// Os arquivos da extensão vivem na pasta `extension/` como arquivos reais
// (dá para carregar a pasta direto em chrome://extensions). Aqui eles são
// importados como texto para o visualizador de código e para o .zip.
import { ExtensionFile } from './types';

import manifest from '../extension/manifest.json?raw';
import background from '../extension/background.js?raw';
import tabBridge from '../extension/tab-bridge.js?raw';
import content from '../extension/content.js?raw';
import popupHtml from '../extension/popup.html?raw';
import popupCss from '../extension/popup.css?raw';
import popupJs from '../extension/popup.js?raw';
import readme from '../extension/README.md?raw';

import icon16 from '../extension/icons/icon16.png?inline';
import icon32 from '../extension/icons/icon32.png?inline';
import icon48 from '../extension/icons/icon48.png?inline';
import icon128 from '../extension/icons/icon128.png?inline';

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    path: 'manifest.json',
    language: 'json',
    description: 'Configuração do Manifest V3: permissões mínimas, atalhos e sites onde a extensão roda sozinha.',
    content: manifest
  },
  {
    name: 'background.js',
    path: 'background.js',
    language: 'javascript',
    description: 'Service worker: menu do botão direito, atalhos da extensão e abertura de links em janela compacta.',
    content: background
  },
  {
    name: 'tab-bridge.js',
    path: 'tab-bridge.js',
    language: 'javascript',
    description: 'Envia comandos para a aba e injeta o content script sob demanda em sites fora da lista.',
    content: tabBridge
  },
  {
    name: 'content.js',
    path: 'content.js',
    language: 'javascript',
    description: 'Botão Flutuar, Alt+P, janela Document Picture-in-Picture, mini player de música e volume.',
    content
  },
  {
    name: 'popup.html',
    path: 'popup.html',
    language: 'html',
    description: 'Interface do popup: flutuar, controles rápidos, tamanho, abrir link e apoio ao projeto.',
    content: popupHtml
  },
  {
    name: 'popup.css',
    path: 'popup.css',
    language: 'css',
    description: 'Estilos do popup da extensão.',
    content: popupCss
  },
  {
    name: 'popup.js',
    path: 'popup.js',
    language: 'javascript',
    description: 'Lógica do popup: fala com a aba ativa e salva as preferências.',
    content: popupJs
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Como instalar, usar, atalhos, permissões e limitações.',
    content: readme
  }
];

/** Ícones PNG da extensão como data URLs (entram no .zip). */
export const EXTENSION_ICONS: { path: string; dataUrl: string }[] = [
  { path: 'icons/icon16.png', dataUrl: icon16 },
  { path: 'icons/icon32.png', dataUrl: icon32 },
  { path: 'icons/icon48.png', dataUrl: icon48 },
  { path: 'icons/icon128.png', dataUrl: icon128 }
];
