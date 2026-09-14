import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCRATCH_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\66e497d8-57f7-45a1-8688-e09dae8eef51';

async function generate62PagePdf() {
  const filePath = path.join(SCRATCH_DIR, 'test_62_pages.pdf');
  if (fs.existsSync(filePath)) return filePath;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 62; i++) {
    const page = doc.addPage(PageSizes.A4);
    page.drawText(`Page ${i} of 62 - Test Document for Layout Measurement`, { x: 50, y: 750, size: 14, font, color: rgb(0.1, 0.4, 0.2) });
  }
  fs.writeFileSync(filePath, await doc.save());
  return filePath;
}

async function testLayout() {
  const pdfPath = await generate62PagePdf();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 1920, height: 1080, name: '1080p' },
    { width: 1440, height: 900, name: '900p' },
    { width: 1366, height: 768, name: '768p' }
  ];

  const page = await browser.newPage();

  for (const vp of viewports) {
    console.log(`\n=================== Testing OrganizeTool Viewport: ${vp.name} (${vp.width}x${vp.height}) ===================`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/#/organize-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Upload 62-page PDF
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    await page.waitForFunction(() => {
      return document.querySelectorAll('.grid > div').length >= 60;
    }, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const grid = document.querySelector('.grid.content-start');
      const bottomBar = document.querySelector('.shrink-0.space-y-2\\.5');
      const exportBtn = bottomBar ? bottomBar.querySelector('button.bg-indigo-600') : null;

      const gridRect = grid ? grid.getBoundingClientRect() : null;
      const bottomRect = bottomBar ? bottomBar.getBoundingClientRect() : null;
      const btnRect = exportBtn ? exportBtn.getBoundingClientRect() : null;

      return {
        windowInnerHeight: window.innerHeight,
        docScrollHeight: docEl.scrollHeight,
        hasWindowVerticalScroll: docEl.scrollHeight > window.innerHeight,
        overflowPx: Math.max(0, docEl.scrollHeight - window.innerHeight),
        grid: gridRect ? {
          top: Math.round(gridRect.top),
          bottom: Math.round(gridRect.bottom),
          height: Math.round(gridRect.height),
          scrollHeight: grid.scrollHeight,
          clientHeight: grid.clientHeight,
          hasOwnScroll: grid.scrollHeight > grid.clientHeight
        } : null,
        bottomBar: bottomRect ? {
          top: Math.round(bottomRect.top),
          bottom: Math.round(bottomRect.bottom),
          height: Math.round(bottomRect.height),
          isFullyVisible: bottomRect.bottom <= window.innerHeight
        } : null,
        exportBtn: btnRect ? {
          top: Math.round(btnRect.top),
          bottom: Math.round(btnRect.bottom),
          isFullyVisible: btnRect.bottom <= window.innerHeight
        } : null
      };
    });

    console.log('Metrics:', JSON.stringify(metrics, null, 2));

    if (vp.name === '900p') {
      const shotPath = path.join(SCRATCH_DIR, 'organize_current_62p.png');
      await page.screenshot({ path: shotPath });
      console.log('Saved 900p screenshot to:', shotPath);
    }
  }

  await browser.close();
}

testLayout().catch(console.error);
