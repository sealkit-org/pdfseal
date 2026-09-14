import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

export async function executeOrganizeNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const standardizeSize = params.standardizeSize || 'none';
  const forceOrientation = params.forceOrientation || 'none';
  const rotateAll = params.rotateAll !== 'none' && params.rotateAll ? Number(params.rotateAll) : 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `Normalizing document [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const doc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      let finalDoc = doc;

      const pages = doc.getPages();
      for (const page of pages) {
        // 1. Blind Rotation
        if (rotateAll !== 0) {
          const currentRotation = page.getRotation().angle || 0;
          page.setRotation(degrees((currentRotation + rotateAll + 360) % 360));
        }

        // 2. Force Orientation in place
        if (forceOrientation !== 'none') {
          const { angle } = page.getRotation(); 
          const sz = page.getSize();
          const isPortrait = sz.width <= sz.height;

          if (forceOrientation === 'portrait' && !isPortrait) {
            page.setRotation(degrees((angle || 0) + 90));
          } else if (forceOrientation === 'landscape' && isPortrait) {
            page.setRotation(degrees((angle || 0) + 90));
          }
        }
      }

      // 2. Standardize to A4
      if (standardizeSize === 'a4') {
        const pages = finalDoc.getPages();
        for (const page of pages) {
          const sz = page.getSize();
          const isLandscape = sz.width > sz.height;
          const a4Width = isLandscape ? PageSizes.A4[1] : PageSizes.A4[0];
          const a4Height = isLandscape ? PageSizes.A4[0] : PageSizes.A4[1];

          const scale = Math.min(a4Width / sz.width, a4Height / sz.height);
          const scaledWidth = sz.width * scale;
          const scaledHeight = sz.height * scale;
          const x = (a4Width - scaledWidth) / 2;
          const y = (a4Height - scaledHeight) / 2;

          page.setSize(a4Width, a4Height);
          page.translateContent(x, y);
          page.scaleContent(scale, scale);
        }
      }

      const outBytes = await finalDoc.save();
      const newName = item.name.replace(/\.pdf$/i, '') + '_Normalized.pdf';

      result.push({
        id: item.id,
        name: newName,
        data: outBytes
      });
      logger.info('ORGANIZE', `Successfully normalized ${item.name}`);

    } catch (err) {
      logger.error('ORGANIZE_FAIL', `Failed to normalize ${item.name}: ${err.message}`);
      throw new Error(`Error processing ${item.name}: ${err.message}`);
    }
  }

  onProgress(100, 'Page normalization complete');
  return result;
}
