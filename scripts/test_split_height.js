import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCRATCH_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\66e497d8-57f7-45a1-8688-e09dae8eef51';

async function generate62PagePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 62; i++) {
    const page = doc.addPage(PageSizes.A4);
    page.drawText(`Page ${i} of 62 - Test Document for Layout Measurement`, { x: 50, y: 750, size: 14, font, color: rgb(0.1, 0.4, 0.2) });
  }
  const filePath = path.join(SCRATCH_DIR, 'test_62_pages.pdf');
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

  const modes = [
    { index: 0, name: 'Mode 1: Extract' },
    { index: 1, name: 'Mode 2: Burst' },
    { index: 2, name: 'Mode 3: Interval' },
    { index: 3, name: 'Mode 4: Multi-range' }
  ];

  const page = await browser.newPage();

  for (const vp of viewports) {
    console.log(`\n=================== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===================`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/#/split-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Upload 62-page PDF
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    await page.waitForFunction(() => {
      return document.querySelectorAll('.grid > div').length >= 60;
    }, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    for (const mode of modes) {
      const modeButtons = await page.$$('div.bg-slate-100\\/80 button');
      if (modeButtons.length > mode.index) {
        await modeButtons[mode.index].click();
        await new Promise(r => setTimeout(r, 400));
      }

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const bottomBar = document.querySelector('.shrink-0.space-y-2\\.5');
        const exportBtn = bottomBar ? bottomBar.querySelector('button.bg-emerald-600') : null;
        const bottomRect = bottomBar ? bottomBar.getBoundingClientRect() : null;
        const btnRect = exportBtn ? exportBtn.getBoundingClientRect() : null;

        return {
          windowInnerHeight: window.innerHeight,
          docScrollHeight: docEl.scrollHeight,
          hasWindowVerticalScroll: docEl.scrollHeight > window.innerHeight,
          overflowPx: Math.max(0, docEl.scrollHeight - window.innerHeight),
          bottomBarVisible: bottomRect ? bottomRect.bottom <= window.innerHeight : false,
          exportBtnVisible: btnRect ? btnRect.bottom <= window.innerHeight : false,
          bottomBarBottom: bottomRect ? Math.round(bottomRect.bottom) : null
        };
      });

      console.log(`  [${mode.name}]: Window Scroll: ${metrics.hasWindowVerticalScroll ? '❌ YES (+' + metrics.overflowPx + 'px)' : '✅ NO'}, Export Btn Visible: ${metrics.exportBtnVisible ? '✅ YES' : '❌ NO'} (bottom: ${metrics.bottomBarBottom}/${metrics.windowInnerHeight})`);
    }
  }

  await browser.close();
}

testLayout().catch(console.error);
