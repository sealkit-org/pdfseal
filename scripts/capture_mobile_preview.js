import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\b608726f-3d0b-43fa-8dc9-6f578332820d';

async function main() {
  console.log('🚀 Starting Vite preview server...');
  const preview = spawn('cmd.exe', ['/c', 'npm', 'run', 'preview', '--', '--port', '4173'], {
    cwd: 'd:\\project\\open\\pdfseal',
    stdio: 'pipe'
  });

  // Wait for server to start
  await new Promise(r => setTimeout(r, 2500));

  console.log('🌐 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // 1. Mobile Portrait Viewport (iPhone 14/15/16: 390 x 844, dpr 3, touch enabled)
    console.log('📱 Emulating Mobile Portrait Viewport (390 x 844)...');
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

    await page.goto('http://localhost:4173/merge-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_portrait_preview.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`✅ Saved mobile portrait screenshot: ${mobileScreenshotPath}`);

    // 2. Open Mobile Tools Drawer
    console.log('🎛️ Clicking All Tools button to open drawer...');
    // Click drawer button in bottom nav or top nav
    const allToolsBtn = await page.$('button[title="All Tools"], button[title="全部工具"]');
    if (allToolsBtn) {
      await allToolsBtn.click();
      await new Promise(r => setTimeout(r, 600));
      const drawerScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_drawer_preview.png');
      await page.screenshot({ path: drawerScreenshotPath, fullPage: false });
      console.log(`✅ Saved mobile drawer screenshot: ${drawerScreenshotPath}`);
    }

    // 3. Desktop Viewport (1280 x 800)
    console.log('💻 Emulating Desktop Viewport (1280 x 800)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    });
    await desktopPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await desktopPage.goto('http://localhost:4173/merge-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'desktop_view_preview.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`✅ Saved desktop view screenshot: ${desktopScreenshotPath}`);

  } catch (err) {
    console.error('❌ Error capturing screenshots:', err);
  } finally {
    await browser.close();
    preview.kill();
    process.exit(0);
  }
}

main();
