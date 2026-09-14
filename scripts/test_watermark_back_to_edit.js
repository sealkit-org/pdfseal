import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(ROOT_DIR, 'temp_e2e_test');

async function main() {
  console.log('🧪 Testing Watermark "返回调整" Preview Canvas Verification...');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Create sample pdf
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawText('Sample Document for Watermark Return Test', {
    x: 50,
    y: 750,
    size: 20,
    color: rgb(0.1, 0.1, 0.1)
  });
  const pdfBytes = await pdfDoc.save();
  const samplePdfPath = path.join(SCREENSHOT_DIR, 'watermark_back_test.pdf');
  fs.writeFileSync(samplePdfPath, pdfBytes);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pageTab = await browser.newPage();
  await pageTab.setViewport({ width: 1440, height: 900 });

  try {
    await pageTab.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Navigate to watermark tool
    await pageTab.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button'));
      const moreBtn = buttons.find(b => (b.textContent || '').includes('更多') || (b.textContent || '').includes('More'));
      if (moreBtn) moreBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await pageTab.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.absolute button, header button'));
      const wmBtn = buttons.find(b => (b.textContent || '').includes('水印') || (b.textContent || '').includes('Watermark'));
      if (wmBtn) wmBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Upload PDF
    const fileInput = await pageTab.$('input[type="file"]');
    await fileInput.uploadFile(samplePdfPath);
    await new Promise(r => setTimeout(r, 1200));

    // Check canvas before stamp
    const canvasBefore = await pageTab.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { found: false };
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100)).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) nonZero++;
      }
      return {
        found: true,
        width: canvas.width,
        height: canvas.height,
        nonZeroPixels: nonZero
      };
    });
    console.log('  Canvas before stamp:', canvasBefore);

    // Click stamp and download
    const downloadBtn = await pageTab.$('[data-testid="wm-download-btn"]');
    await downloadBtn.click();

    // Wait for ResultDeliveryView
    await pageTab.waitForFunction(() => {
      return document.querySelector('[data-testid="delivery-back-to-edit"]') !== null;
    }, { timeout: 15000 });
    console.log('  ✓ Reached ResultDeliveryView');
    await new Promise(r => setTimeout(r, 500));

    // Click "返回调整"
    const backBtn = await pageTab.$('[data-testid="delivery-back-to-edit"]');
    await backBtn.click();
    console.log('  ✓ Clicked "返回调整"');
    await new Promise(r => setTimeout(r, 800));

    // Verify Canvas after back to edit
    const canvasAfter = await pageTab.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { found: false };
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100)).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) nonZero++;
      }
      return {
        found: true,
        width: canvas.width,
        height: canvas.height,
        nonZeroPixels: nonZero,
        styleWidth: canvas.clientWidth,
        styleHeight: canvas.clientHeight
      };
    });
    console.log('  Canvas after back to edit:', canvasAfter);

    const screenshotPath = path.join(SCREENSHOT_DIR, 'watermark_back_to_edit_fixed.png');
    await pageTab.screenshot({ path: screenshotPath });
    console.log('  📷 Screenshot saved:', screenshotPath);

    if (!canvasAfter.found || canvasAfter.width === 0 || canvasAfter.height === 0 || canvasAfter.nonZeroPixels === 0) {
      throw new Error(`Canvas is still blank! details: ${JSON.stringify(canvasAfter)}`);
    }

    console.log('🎉 [SUCCESS] Watermark preview canvas is fully restored and NOT blank on "返回调整"!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
