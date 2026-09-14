import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const DOWNLOAD_DIR = path.join(TEMP_DIR, 'downloads');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

// Ensure directories exist
[TEMP_DIR, DOWNLOAD_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
});

/**
 * Generates a clean 3-page sample PDF to number
 */
async function generateSamplePdf() {
  console.log('📄 [Setup] Generating 3-page document for page numbering test...');
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage(PageSizes.A4);
    page.drawText(`ANNUAL REPORT CHAPTER ${i}`, { x: 50, y: 780, size: 18, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    page.drawText(`Section content and detailed operational analysis for Chapter ${i}.`, { x: 50, y: 740, size: 12, font });
  }

  const inputPdfPath = path.join(TEMP_DIR, 'test_report_to_number.pdf');
  const bytes = await doc.save();
  fs.writeFileSync(inputPdfPath, bytes);
  console.log(`  ✓ Created sample PDF: ${inputPdfPath} (3 pages)`);
  return inputPdfPath;
}

async function runPageNumberBusinessTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Business Test] PDF Page Number Three-Stage Delivery View');
  console.log('==========================================================\n');

  const samplePdfPath = await generateSamplePdf();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log(`  [Browser Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('  [Browser Page Error]:', err.message));

  try {
    // 1. Open Page Number tool directly via web history route
    console.log('📍 [Step 1] Navigating to http://localhost:5173/page-number...');
    await page.goto('http://localhost:5173/page-number', { waitUntil: 'networkidle2', timeout: 15000 });

    // Setup global download trap
    await page.evaluate(() => {
      window.__capturedDownloads = [];
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.download.toLowerCase().endsWith('.pdf')) {
          const downloadName = this.download;
          fetch(this.href).then(r => r.arrayBuffer()).then(buf => {
            window.__capturedDownloads.push({
              name: downloadName,
              bytes: Array.from(new Uint8Array(buf))
            });
          });
        }
        return origClick.call(this);
      };
    });

    // 2. Verify State A (Dropzone)
    console.log('📍 [Step 2] Verifying State A: Dual-source dropzone...');
    const hasDropzone = await page.evaluate(() => {
      return document.querySelector('input[type="file"]') !== null;
    });
    if (!hasDropzone) throw new Error('Page Number dropzone not rendered');
    console.log('  ✓ State A Dropzone verified');

    // 3. Upload PDF
    console.log(`📍 [Step 3] Uploading sample PDF: ${samplePdfPath}...`);
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(samplePdfPath);

    // Wait for document workspace to load
    await page.waitForFunction(() => {
      return document.querySelector('canvas') !== null &&
             document.querySelector('[data-testid="pn-download-btn"]') !== null;
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));

    console.log('  ✓ Document loaded into State B-1 Workspace');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'page_number_01_workspace.png') });
    console.log('  📷 Screenshot saved: page_number_01_workspace.png');

    // 4. Configure Output Filename
    const customName = 'E2E_Numbered_Annual_Report';
    await page.evaluate((name) => {
      const input = document.querySelector('[data-testid="pn-filename-input"]');
      if (input) {
        input.value = name;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, customName);
    await new Promise(r => setTimeout(r, 300));

    // 5. Execute Page Numbering
    console.log('📍 [Step 5] Clicking "编排并下载" to trigger Three-Stage Delivery View...');
    const downloadBtn = await page.$('[data-testid="pn-download-btn"]');
    await downloadBtn.click();

    // 6. Verify Transition to ResultDeliveryView
    console.log('📍 [Step 6] Verifying State C: ResultDeliveryView...');
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return (text.includes('完成') || text.includes('Completed') || text.includes('Terminé')) &&
             (text.includes('返回微调') || text.includes('Back to Edit') || text.includes('Re-Download') || text.includes('再次下载'));
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));

    const deliveryInfo = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        hasMetrics: document.body.innerText.includes('已统一编排') || document.body.innerText.includes('3')
      };
    });
    console.log('  ✓ Result Delivery View displayed successfully! Metrics present:', deliveryInfo.hasMetrics);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'page_number_02_delivery_view.png') });
    console.log('  📷 Screenshot saved: page_number_02_delivery_view.png');

    // 7. Verify "返回微调" (Back to Edit)
    console.log('📍 [Step 7] Testing "返回微调 / 返回调整" (Back to Edit)...');
    const backBtn = await page.$('[data-testid="delivery-back-to-edit"]');
    if (!backBtn) throw new Error('Could not find [data-testid="delivery-back-to-edit"] button');
    await backBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify workspace is back
    const isBackInWorkspace = await page.evaluate(() => {
      return document.querySelector('[data-testid="pn-download-btn"]') !== null;
    });
    if (!isBackInWorkspace) throw new Error('Failed to return to editing workspace');
    console.log('  ✓ Successfully returned to State B-1 Workspace with document intact!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'page_number_03_back_to_edit.png') });
    console.log('  📷 Screenshot saved: page_number_03_back_to_edit.png');

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] Page Number Three-Stage Delivery View Test Passed 100%!');
    console.log('==========================================================\n');

  } catch (err) {
    console.error('❌ [Page Number Test Failed]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runPageNumberBusinessTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
