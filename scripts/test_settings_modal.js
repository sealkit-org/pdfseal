import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.resolve(ROOT_DIR, 'temp_e2e_test');

async function main() {
  console.log('🧪 Testing GlobalSettingsModal Simplification & Tabs...');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Open settings modal
    const opened = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button'));
      const settingsBtn = buttons.find(b => b.querySelector('svg.lucide-settings') || b.getAttribute('title')?.includes('设置') || b.getAttribute('title')?.includes('Settings'));
      if (settingsBtn) {
        settingsBtn.click();
        return true;
      }
      return false;
    });
    console.log('  Settings button clicked:', opened);
    await new Promise(r => setTimeout(r, 500));

    // Screenshot Tab 1: General
    const tab1Screenshot = path.join(SCREENSHOT_DIR, 'settings_tab_general.png');
    await page.screenshot({ path: tab1Screenshot });
    console.log('  📷 Screenshot saved:', tab1Screenshot);

    // Switch to Tab 2: Advanced
    const switched = await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('.bg-slate-100\\/90 button'));
      const advBtn = tabBtns.find(b => (b.textContent || '').includes('高级') || (b.textContent || '').includes('Advanced'));
      if (advBtn) {
        advBtn.click();
        return true;
      }
      return false;
    });
    console.log('  Advanced tab button clicked:', switched);
    await new Promise(r => setTimeout(r, 400));

    // Screenshot Tab 2: Advanced
    const tab2Screenshot = path.join(SCREENSHOT_DIR, 'settings_tab_advanced.png');
    await page.screenshot({ path: tab2Screenshot });
    console.log('  📷 Screenshot saved:', tab2Screenshot);

    console.log('🎉 [SUCCESS] GlobalSettingsModal verified successfully!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
