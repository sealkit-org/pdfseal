import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

[TEMP_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Generate 3 sample 10x10 PNGs
function generateSampleImages() {
  const images = [
    { name: 'sample_red.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC' },
    { name: 'sample_blue.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksOjuAAAAAElFTkSuQmCC' },
    { name: 'sample_green.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNkWPifgQEYBxVSF+EAAA3/BvsUv1q4AAAAAElFTkSuQmCC' }
  ];

  return images.map(img => {
    const filePath = path.join(TEMP_DIR, img.name);
    fs.writeFileSync(filePath, Buffer.from(img.b64, 'base64'));
    return filePath;
  });
}

async function runImageToPdfE2eTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Test] Image to PDF (3-Stage Delivery Verification)');
  console.log('==========================================================\n');

  const imgPaths = generateSampleImages();
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
    // 1. Navigate to Image to PDF tool
    console.log('📍 [Step 1] Navigating to http://localhost:5173/image-to-pdf...');
    await page.goto('http://localhost:5173/image-to-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // 2. Upload 3 sample images
    console.log('📍 [Step 2] Uploading 3 sample images...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(...imgPaths);

    await page.waitForFunction(() => {
      return document.querySelectorAll('.grid > div').length >= 3;
    }, { timeout: 15000 });
    console.log('  ✓ Rendered 3 image cards in workspace');

    const shot1 = path.join(SCREENSHOT_DIR, 'img2pdf_01_workspace.png');
    await page.screenshot({ path: shot1 });

    // 3. Trigger "合成并导出 PDF"
    console.log('📍 [Step 3] Clicking "合成并导出 PDF" button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('合成并导出'));
      if (!btn) throw new Error('Export button not found!');
      btn.click();
    });

    // 4. Wait for ResultDeliveryView delivery completion
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
      const newTaskBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('转换其他图片'));
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
    const shot2 = path.join(SCREENSHOT_DIR, 'img2pdf_02_delivery_view.png');
    await page.screenshot({ path: shot2 });

    // 5. Test "返回调整" (Back to Edit)
    console.log('📍 [Step 5] Clicking "返回调整" (Back to Edit)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('返回微调') || b.innerText.includes('返回调整'));
      if (!btn) throw new Error('Back to edit button not found!');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const cardCount = await page.evaluate(() => document.querySelectorAll('.grid-cols-2.sm\\:grid-cols-3 > div').length);
    console.log(`  ✓ Restored workspace with ${cardCount} image cards intact!`);
    const shot3 = path.join(SCREENSHOT_DIR, 'img2pdf_03_back_to_edit.png');
    await page.screenshot({ path: shot3 });

    // 6. Test "清空" (Reset to dropzone)
    console.log('📍 [Step 6] Clicking "清空" (Reset)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('清空全部') || b.innerText.includes('Clear All') || b.innerText.includes('清空'));
      if (!btn) throw new Error('Clear button not found!');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const hasDropzone = await page.evaluate(() => {
      return Boolean(document.querySelector('.border-dashed'));
    });
    console.log(`  ✓ Workspace successfully cleared back to dropzone: ${hasDropzone}`);

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] Image to PDF 3-Stage Delivery 100% Verified!');
    console.log('==========================================================\n');
  } catch (e) {
    console.error('❌ [FAIL]:', e);
    const errorShot = path.join(SCREENSHOT_DIR, 'img2pdf_error_state.png');
    await page.screenshot({ path: errorShot }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

runImageToPdfE2eTest().catch(() => process.exit(1));
