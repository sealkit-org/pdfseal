import JSZip from 'jszip';
import { triggerDownload } from './download';
import { logger } from './logger';

/**
 * Packages multiple in-memory files into a ZIP Blob entirely within browser memory.
 * Zero server uploads, completely client-side and offline capable.
 * 
 * @param {Array<{ name: string, data: Uint8Array|ArrayBuffer|Blob|string }>} files 
 * @param {Function} [onProgress] - (percent: number, currentFile?: string) => void
 * @returns {Promise<Blob>}
 */
export async function createZipBlob(files, onProgress = () => {}) {
  if (!files || files.length === 0) {
    throw new Error('No files provided for ZIP packaging');
  }

  const zip = new JSZip();

  for (const file of files) {
    if (!file.name || !file.data) continue;
    zip.file(file.name, file.data);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (typeof onProgress === 'function') {
        onProgress(Math.round(metadata.percent), metadata.currentFile);
      }
    }
  );

  return zipBlob;
}

/**
 * Creates a ZIP archive from multiple files and triggers immediate browser download.
 * 
 * @param {Array<{ name: string, data: Uint8Array|ArrayBuffer|Blob|string }>} files 
 * @param {string} [zipFileName='PDFSeal_Bundle.zip'] 
 * @param {Function} [onProgress] 
 * @returns {Promise<{ zipBlob: Blob, zipFileName: string }>}
 */
export async function createAndDownloadZip(files, zipFileName = 'PDFSeal_Bundle.zip', onProgress = () => {}) {
  let finalName = zipFileName ? zipFileName.trim() : 'PDFSeal_Bundle.zip';
  if (!finalName.toLowerCase().endsWith('.zip')) {
    finalName += '.zip';
  }

  logger.info('ZIP', `Creating in-memory ZIP bundle: "${finalName}" with ${files.length} items`);
  const zipBlob = await createZipBlob(files, onProgress);
  triggerDownload(zipBlob, finalName);
  logger.info('ZIP', `Successfully downloaded ZIP bundle: "${finalName}" (${(zipBlob.size / 1024).toFixed(1)} KB)`);

  return { zipBlob, zipFileName: finalName };
}
