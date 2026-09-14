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
  console.log('🧪 Testing Page Number "返回调整" Preview Canvas Verification...');

  // Create sample pdf
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawText('Sample Document for Page Number Return Test', {
    x: 50,
    y: 750,
    size: 20,
    color: rgb(0.1, 0.1, 0.1)
  });
  const pdfBytes = await pdfDoc.save();
  const samplePdfPath = path.join(SCREENSHOT_DIR, 'page_number_back_test.pdf');
  fs.writeFileSync(samplePdfPath, pdfBytes);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pageTab = await browser.newPage();
  await pageTab.setViewport({ width: 1440, height: 900 });

  try {
    await pageTab.goto('http://localhost:5173/page-number', { waitUntil: 'networkidle2' });

    // Upload PDF
    const fileInput = await pageTab.$('input[type="file"]');
    await fileInput.uploadFile(samplePdfPath);
    await new Promise(r => setTimeout(r, 1200));

    // Click download
    const downloadBtn = await pageTab.$('[data-testid="pn-download-btn"]');
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

    const screenshotPath = path.join(SCREENSHOT_DIR, 'page_number_back_to_edit_fixed.png');
    await pageTab.screenshot({ path: screenshotPath });
    console.log('  📷 Screenshot saved:', screenshotPath);

    if (!canvasAfter.found || canvasAfter.width === 0 || canvasAfter.height === 0 || canvasAfter.nonZeroPixels === 0) {
      throw new Error(`Canvas is still blank! details: ${JSON.stringify(canvasAfter)}`);
    }

    console.log('🎉 [SUCCESS] Page Number preview canvas is fully restored and NOT blank on "返回调整"!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
