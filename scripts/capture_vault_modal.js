import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\b608726f-3d0b-43fa-8dc9-6f578332820d';

async function main() {
  console.log('🚀 Starting Vite preview server...');
  const preview = spawn('cmd.exe', ['/c', 'npm', 'run', 'preview', '--', '--port', '4173'], {
    cwd: 'd:\\project\\open\\pdfseal',
    stdio: 'pipe'
  });

  await new Promise(r => setTimeout(r, 2500));

  console.log('🌐 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

    console.log('📱 Navigating to http://localhost:4173/merge-pdf...');
    await page.goto('http://localhost:4173/merge-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    // Click "从收纳箱选择" (Vault button in dropzone)
    console.log('📱 Opening Vault Picker Modal...');
    const vaultBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.includes('收纳箱') || b.innerText.includes('Vault'));
    });

    if (vaultBtn) {
      await vaultBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const shotPath = path.join(ARTIFACT_DIR, 'mobile_vault_modal_fixed.png');
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`✅ Saved mobile vault modal screenshot: ${shotPath}`);
    } else {
      console.error('❌ Could not find Vault button');
    }

  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    await browser.close();
    preview.kill();
  }
}

main();
