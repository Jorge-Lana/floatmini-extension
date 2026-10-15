import JSZip from 'jszip';
import { EXTENSION_FILES, EXTENSION_ICONS } from '../extensionCode';

export async function generateExtensionZip(): Promise<Blob> {
  const zip = new JSZip();

  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  for (const icon of EXTENSION_ICONS) {
    const base64 = icon.dataUrl.split(',')[1];
    if (!base64) throw new Error(`Ícone inválido: ${icon.path}`);
    zip.file(icon.path, base64, { base64: true });
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
