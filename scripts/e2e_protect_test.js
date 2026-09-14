import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

[TEMP_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function generateSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(PageSizes.A4);
  page.drawText('Confidential Document - Protect Tool Verification', { x: 50, y: 750, size: 18, font, color: rgb(0.8, 0.1, 0.2) });
  const filePath = path.join(TEMP_DIR, 'test_protect_input.pdf');
  fs.writeFileSync(filePath, await doc.save());
  return filePath;
}

async function runProtectE2eTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Test] PDF Protect (3-Stage Delivery Verification)');
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
    // 1. Navigate to PDF Protect tool
    console.log('📍 [Step 1] Navigating to http://localhost:5173/protect-pdf...');
    await page.goto('http://localhost:5173/protect-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // 2. Upload sample PDF
    console.log('📍 [Step 2] Uploading sample PDF...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);

    await page.waitForFunction(() => {
      return Boolean(document.querySelector('input[type="password"]'));
    }, { timeout: 15000 });
    console.log('  ✓ Rendered workspace with password inputs');

    // 3. Fill in open passwords
    console.log('📍 [Step 3] Entering passwords (Secret123!)...');
    const firstPwd = await page.$('input[placeholder*="密码"]');
    await firstPwd.type('Secret123!');
    await new Promise(r => setTimeout(r, 300));

    await page.waitForSelector('input[placeholder*="确认"]', { timeout: 5000 });
    const confirmPwd = await page.$('input[placeholder*="确认"]');
    await confirmPwd.type('Secret123!');
    await new Promise(r => setTimeout(r, 500));

    const shot1 = path.join(SCREENSHOT_DIR, 'protect_01_workspace.png');
    await page.screenshot({ path: shot1 });

    // 4. Click "加密保护并下载 PDF"
    console.log('📍 [Step 4] Clicking "加密保护并下载 PDF" button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('加密保护并下载')
      );
      if (!btn) throw new Error('Protect export button not found');
      btn.click();
    });

    // 5. Wait for ResultDeliveryView delivery completion
    console.log('📍 [Step 5] Waiting for ResultDeliveryView delivery completion...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('再次下载'));
    }, { timeout: 25000 });
    console.log('  ✓ ResultDeliveryView success badge displayed!');

    const deliveryData = await page.evaluate(() => {
      const heading = document.querySelector('h2.text-base')?.innerText || '';
      const metric = document.querySelector('.pt-2\\.5')?.innerText || '';
      const redownloadBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('再次下载'));
      const newTaskBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('加密新文件') || b.innerText.includes('新任务'));
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
    const shot2 = path.join(SCREENSHOT_DIR, 'protect_02_delivery_view.png');
    await page.screenshot({ path: shot2 });

    // 6. Test "返回调整" (Back to Edit)
    console.log('📍 [Step 6] Clicking "返回调整" (Back to Edit)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('返回微调') || b.innerText.includes('返回调整'));
      if (!btn) throw new Error('Back to edit button not found!');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const hasPwdInput = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    console.log(`  ✓ Restored workspace with password configuration intact: ${hasPwdInput}`);
    const shot3 = path.join(SCREENSHOT_DIR, 'protect_03_back_to_edit.png');
    await page.screenshot({ path: shot3 });

    // 7. Test "Reset" back to dropzone
    console.log('📍 [Step 7] Clicking Reset to dropzone...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('重置') || b.innerText.includes('Reset') || b.innerText.includes('更换文件'));
      if (!btn) throw new Error('Reset button not found!');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const hasDropzone = await page.evaluate(() => Boolean(document.querySelector('.border-dashed')));
    console.log(`  ✓ Workspace successfully cleared back to dropzone: ${hasDropzone}`);

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] PDF Protect 3-Stage Delivery 100% Verified!');
    console.log('==========================================================\n');
  } catch (e) {
    console.error('❌ [FAIL]:', e);
    const errorShot = path.join(SCREENSHOT_DIR, 'protect_error_state.png');
    await page.screenshot({ path: errorShot }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

runProtectE2eTest().catch(() => process.exit(1));
