import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '简体中文' }
];

async function runI18nE2ETest() {
  console.log('🌐 [I18N E2E] Starting Multi-Language Browser Validation Suite...');
  
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

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
      console.error('❌ [Console Error]:', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
    console.error('❌ [Page Error]:', err.message);
  });

  try {
    console.log('📍 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });

    const results = [];

    for (const lang of LANGUAGES) {
      console.log(`\n------------------------------------------------------------`);
      console.log(`🔍 [Testing Language: ${lang.name} (${lang.code})]`);
      console.log(`------------------------------------------------------------`);

      // Switch language using the top selector
      await page.evaluate((code) => {
        const select = document.querySelector('header select');
        if (select) {
          select.value = code;
          select.dispatchEvent(new Event('change'));
        }
      }, lang.code);

      await new Promise(r => setTimeout(r, 600));

      // Extract translated strings from DOM
      const domData = await page.evaluate(() => {
        const title = document.title;
        const brandSubtitle = document.querySelector('header p')?.textContent?.trim() || '';
        const localBadge = document.querySelector('header button')?.textContent?.trim() || '';
        
        // Navigation Tabs
        const tabs = Array.from(document.querySelectorAll('div.bg-slate-100\\/90 button span'))
          .map(s => s.textContent.trim())
          .filter(Boolean);

        // Dropzone titles
        const dropTitle = document.querySelector('h3')?.textContent?.trim() || '';
        const dropSubtitle = document.querySelector('h3 + p')?.textContent?.trim() || '';

        // Check for leaked raw keys (e.g. key_name_something)
        const fullBodyText = document.body.innerText;
        const rawKeyMatches = fullBodyText.match(/\b(param_[a-z0-9_]+|tab_[a-z0-9_]+|pipeline_[a-z0-9_]+)\b/g) || [];

        return {
          title,
          brandSubtitle,
          localBadge,
          tabs: tabs.slice(0, 5),
          dropTitle,
          dropSubtitle,
          rawKeyCount: rawKeyMatches.length,
          rawKeys: Array.from(new Set(rawKeyMatches))
        };
      });

      console.log(`  • Document Title: "${domData.title}"`);
      console.log(`  • Local Badge:    "${domData.localBadge.replace(/\s+/g, ' ')}"`);
      console.log(`  • Subtitle:       "${domData.brandSubtitle}"`);
      console.log(`  • Nav Tabs (5):   ${JSON.stringify(domData.tabs)}`);
      console.log(`  • Dropzone Title: "${domData.dropTitle}"`);

      if (domData.rawKeyCount > 0) {
        console.warn(`  ⚠️ Warning: Leaked raw keys found in UI (${domData.rawKeyCount}):`, domData.rawKeys);
      } else {
        console.log(`  ✓ 0 raw key leaks detected.`);
      }

      // Save screenshot for this language
      const screenshotPath = path.join(SCREENSHOT_DIR, `lang_${lang.code}_home.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`  📷 Screenshot saved: lang_${lang.code}_home.png`);

      // Test Pipeline page in this language
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const pipelineBtn = btns.find(b => b.querySelector('svg.lucide-zap'));
        if (pipelineBtn) pipelineBtn.click();
      });

      await new Promise(r => setTimeout(r, 600));

      const pipelineData = await page.evaluate(() => {
        const heading = document.querySelector('h2')?.textContent?.trim() || '';
        const pipelineSubtitle = document.querySelector('h2')?.parentElement?.parentElement?.querySelector('p')?.textContent?.trim() || '';
        return { heading, pipelineSubtitle };
      });

      console.log(`  • Pipeline Title: "${pipelineData.heading}"`);

      // Save pipeline screenshot for this language
      const pipelineScreenshotPath = path.join(SCREENSHOT_DIR, `lang_${lang.code}_pipeline.png`);
      await page.screenshot({ path: pipelineScreenshotPath });
      console.log(`  📷 Screenshot saved: lang_${lang.code}_pipeline.png`);

      // Switch back to Merge tool
      await page.evaluate(() => {
        const firstTab = document.querySelector('div.bg-slate-100\\/90 button');
        if (firstTab) firstTab.click();
      });
      await new Promise(r => setTimeout(r, 400));

      results.push({
        lang: lang.code,
        name: lang.name,
        domData,
        pipelineData
      });
    }

    // Switch back to Chinese by default
    await page.evaluate(() => {
      const select = document.querySelector('header select');
      if (select) {
        select.value = 'zh';
        select.dispatchEvent(new Event('change'));
      }
    });

    console.log('\n============================================================');
    console.log('🎉 [I18N E2E] Multi-Language Validation Completed Successfully!');
    console.log(`Total Languages Tested: ${LANGUAGES.length}`);
    console.log(`Total Console Errors: ${errors.length}`);
    console.log(`Screenshots Directory: ${SCREENSHOT_DIR}`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('❌ [I18N E2E Failed]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runI18nE2ETest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
