import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCRATCH_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\66e497d8-57f7-45a1-8688-e09dae8eef51';

async function generateSamplePdfs(count = 15) {
  const filePaths = [];
  for (let i = 1; i <= count; i++) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage(PageSizes.A4);
    page.drawText(`Document Part ${i} for Merge Test`, { x: 50, y: 750, size: 16, font });
    const fp = path.join(SCRATCH_DIR, `merge_sample_${i}.pdf`);
    fs.writeFileSync(fp, await doc.save());
    filePaths.push(fp);
  }
  return filePaths;
}

async function testLayout() {
  const filePaths = await generateSamplePdfs(15);
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
    console.log(`\n=================== Testing MergeTool Viewport: ${vp.name} (${vp.width}x${vp.height}) ===================`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/#/merge-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Upload 15 files
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(...filePaths);

    await page.waitForFunction(() => {
      return document.querySelectorAll('.space-y-2 > div').length >= 15;
    }, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const metrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const listContainer = document.querySelector('.overflow-y-auto.space-y-2');
      const bottomBar = document.querySelector('.pt-3.border-t.border-slate-100');
      const exportBtn = bottomBar ? bottomBar.querySelector('button.bg-blue-600') : null;

      const listRect = listContainer ? listContainer.getBoundingClientRect() : null;
      const bottomRect = bottomBar ? bottomBar.getBoundingClientRect() : null;
      const btnRect = exportBtn ? exportBtn.getBoundingClientRect() : null;

      return {
        windowInnerHeight: window.innerHeight,
        docScrollHeight: docEl.scrollHeight,
        hasWindowVerticalScroll: docEl.scrollHeight > window.innerHeight,
        overflowPx: Math.max(0, docEl.scrollHeight - window.innerHeight),
        list: listRect ? {
          top: Math.round(listRect.top),
          bottom: Math.round(listRect.bottom),
          height: Math.round(listRect.height),
          scrollHeight: listContainer.scrollHeight,
          clientHeight: listContainer.clientHeight,
          hasOwnScroll: listContainer.scrollHeight > listContainer.clientHeight
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
      const shotPath = path.join(SCRATCH_DIR, 'merge_current_15files.png');
      await page.screenshot({ path: shotPath });
      console.log('Saved 900p screenshot to:', shotPath);
    }
  }

  await browser.close();
}

testLayout().catch(console.error);
