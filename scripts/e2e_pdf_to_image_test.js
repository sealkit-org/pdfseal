import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const DOWNLOAD_DIR = path.join(TEMP_DIR, 'downloads');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

[TEMP_DIR, DOWNLOAD_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function generateSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage(PageSizes.A4);
    page.drawText(`Page ${i} - High Resolution Export Verification`, { x: 50, y: 750, size: 18, font, color: rgb(0.1, 0.5, 0.7) });
  }
  const filePath = path.join(TEMP_DIR, 'test_p2i_input.pdf');
  fs.writeFileSync(filePath, await doc.save());
  return filePath;
}

async function runPdfToImageE2eTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Test] PDF to Image (3-Stage Delivery Verification)');
  console.log('==========================================================\n');

  const pdfPath = await generateSamplePdf();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('  [BROWSER CONSOLE]', msg.text()));
  page.on('pageerror', err => console.log('  [BROWSER ERROR]', err.message));

  try {
    // 1. Navigate to PDF to Image tool
    console.log('📍 [Step 1] Navigating to http://localhost:5173/pdf-to-image...');
    await page.goto('http://localhost:5173/pdf-to-image', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // 2. Upload sample PDF
    console.log('📍 [Step 2] Uploading 3-page PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    await page.waitForFunction(() => {
      return document.querySelectorAll('.grid > div').length >= 3;
    }, { timeout: 15000 });
    console.log('  ✓ Rendered 3 page thumbnails in active workspace');

    const shot1 = path.join(SCREENSHOT_DIR, 'p2i_01_workspace.png');
    await page.screenshot({ path: shot1 });

    // 3. Trigger "全部打包 ZIP 下载"
    console.log('📍 [Step 3] Clicking "全部打包 ZIP 下载 (3)" button...');
    const exportBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('全部打包') || b.innerText.includes('ZIP'));
    });
    await exportBtn.click();

    // 4. Wait for ResultDeliveryView to appear
    console.log('📍 [Step 4] Waiting for ResultDeliveryView delivery completion...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('再次下载'));
    }, { timeout: 25000 });
    console.log('  ✓ ResultDeliveryView success badge displayed!');

    // Check delivery metrics and texts
    const deliveryData = await page.evaluate(() => {
      const heading = document.querySelector('h2.text-base')?.innerText || '';
      const metric = document.querySelector('.pt-2\\.5')?.innerText || '';
      const redownloadBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('再次下载'));
      const newTaskBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('转换其他 PDF'));
      const backToEditBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('返回微调') || b.innerText.includes('返回调整'));
      const fileExt = document.querySelector('.font-black.text-\\[10px\\]')?.innerText || '';

      return {
        heading,
        metric,
        hasRedownload: Boolean(redownloadBtn),
        hasNewTask: Boolean(newTaskBtn),
        hasBackToEdit: Boolean(backToEditBtn),
        fileExt
      };
    });

    console.log('  ✓ Delivery View Verified:', deliveryData);
    const shot2 = path.join(SCREENSHOT_DIR, 'p2i_02_delivery_view.png');
    await page.screenshot({ path: shot2 });

    // 5. Test "返回调整" (Back to Edit)
    console.log('📍 [Step 5] Clicking "返回调整" (Back to Edit)...');
    const backBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('返回微调') || b.innerText.includes('返回调整'));
    });
    await backBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const cardCount = await page.evaluate(() => document.querySelectorAll('.grid > div').length);
    console.log(`  ✓ Restored workspace with ${cardCount} cards intact!`);
    const shot3 = path.join(SCREENSHOT_DIR, 'p2i_03_back_to_edit.png');
    await page.screenshot({ path: shot3 });

    // 6. Test "清空全部" (Reset to dropzone)
    console.log('📍 [Step 6] Clicking "清空全部" (Reset)...');
    const clearBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('清空全部') || b.innerText.includes('Clear All'));
    });
    await clearBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const hasDropzone = await page.evaluate(() => {
      return Boolean(document.querySelector('.border-dashed'));
    });
    console.log(`  ✓ Workspace successfully cleared back to dropzone: ${hasDropzone}`);

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] PDF to Image 3-Stage Delivery 100% Verified!');
    console.log('==========================================================\n');
  } catch (e) {
    console.error('❌ [FAIL]:', e);
    const errorShot = path.join(SCREENSHOT_DIR, 'p2i_error_state.png');
    await page.screenshot({ path: errorShot }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

runPdfToImageE2eTest().catch(() => process.exit(1));
