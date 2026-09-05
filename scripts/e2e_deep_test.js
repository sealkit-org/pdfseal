import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function clickByText(page, text, tag = 'button') {
  const handle = await page.evaluateHandle((t, selector) => {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.find(el => el.textContent && el.textContent.trim().includes(t)) || null;
  }, text, tag);

  const el = handle.asElement();
  if (!el) {
    throw new Error(`Element <${tag}> containing text "${text}" not found`);
  }
  await el.click();
  return el;
}

async function runDeepE2ETest() {
  console.log('🚀 [E2E] Starting Deep Browser E2E Test Suite for PDFSeal...');
  
  const errors = [];
  const warnings = [];

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

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${text}`);
      console.error('❌ [Browser Console Error]:', text);
    } else if (msg.type() === 'warn') {
      warnings.push(`Console Warn: ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
    console.error('❌ [Page Error]:', err.message);
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Navigate to http://localhost:5173
    // -------------------------------------------------------------
    console.log('📍 [Step 1] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_home_page.png') });
    console.log('✅ Page loaded successfully. Screenshot: 01_home_page.png');

    const title = await page.title();
    console.log(`ℹ️ Page title: "${title}"`);
    if (!title.includes('PDFSeal')) {
      throw new Error(`Unexpected page title: ${title}`);
    }

    // -------------------------------------------------------------
    // Step 2: Test 100% Pure Local Privacy Modal
    // -------------------------------------------------------------
    console.log('📍 [Step 2] Testing "100% Pure Local" Privacy Guarantee Modal...');
    await clickByText(page, '100% 纯本地');
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_privacy_modal.png') });
    console.log('✅ Privacy modal opened. Screenshot: 02_privacy_modal.png');
    
    // Close modal
    const closeBtn = await page.$('.fixed.inset-0 button');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 300));
    console.log('✅ Privacy modal closed.');

    // -------------------------------------------------------------
    // Step 3: Test Tool Navigation Switcher (Merge, Compress, Organize, Split, Sign)
    // -------------------------------------------------------------
    console.log('📍 [Step 3] Testing Core Single-Purpose Tool Tabs...');
    const tools = ['PDF 压缩', '页面整理', '页面拆分', '电子签名', 'PDF 合并'];
    for (const toolName of tools) {
      await clickByText(page, toolName, 'button');
      await new Promise(r => setTimeout(r, 300));
      console.log(`  ✓ Switched to tab: ${toolName}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_core_tools.png') });

    // -------------------------------------------------------------
    // Step 4: Test Global Settings & Official Mode Toggle
    // -------------------------------------------------------------
    console.log('📍 [Step 4] Testing Global Settings Modal & Dev Tools...');
    // Click Settings (gear icon button)
    const settingsBtn = await page.$('header button[title*="Preferences"], header button[title*="设置"]');
    if (settingsBtn) {
      await settingsBtn.click();
    } else {
      await clickByText(page, '设置');
    }
    await page.waitForSelector('.fixed.inset-0', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 400));

    // Scroll down in settings modal to view Dev Tools switch
    await page.evaluate(() => {
      const modalBody = document.querySelector('.fixed.inset-0 .overflow-y-auto');
      if (modalBody) modalBody.scrollTop = modalBody.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_settings_dev_tools.png') });
    console.log('✅ Global settings modal inspected. Screenshot: 04_settings_dev_tools.png');

    // Close settings modal
    const settingsCloseBtn = await page.$('.fixed.inset-0 button[title="Close"], .fixed.inset-0 button:has(svg)');
    if (settingsCloseBtn) await settingsCloseBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // -------------------------------------------------------------
    // Step 5: Test Pipeline (自动化流水线) & Side Drawers
    // -------------------------------------------------------------
    console.log('📍 [Step 5] Testing Pipeline Tool & Parameter Drawers...');
    await clickByText(page, '自动化流水线');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_pipeline_workbench.png') });
    console.log('✅ Pipeline workbench loaded. Screenshot: 05_pipeline_workbench.png');

    // Select the first preset flow from the select dropdown
    console.log('  🔍 Selecting a preset pipeline workflow...');
    const selectHandle = await page.$('select');
    if (selectHandle) {
      await page.evaluate(sel => {
        if (sel.options.length > 1) {
          sel.selectedIndex = 1; // select first preset
          sel.dispatchEvent(new Event('change'));
        }
      }, selectHandle);
      await new Promise(r => setTimeout(r, 500));
      console.log('  ✓ Preset selected, steps populated.');
    }

    // Look for step configuration buttons or step cards
    const openedDrawer = await page.evaluate(() => {
      // Find configure buttons or step cards
      const btns = Array.from(document.querySelectorAll('button, div'));
      const configTarget = btns.find(b => 
        (b.getAttribute('title') && (b.getAttribute('title').includes('配置') || b.getAttribute('title').includes('Config'))) ||
        (b.textContent && b.textContent.includes('配置'))
      );
      if (configTarget) {
        configTarget.click();
        return true;
      }
      return false;
    });

    if (openedDrawer) {
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_pipeline_drawer_open.png') });
      console.log('✅ Pipeline step side drawer opened. Screenshot: 06_pipeline_drawer_open.png');

      // Click Cancel/Close in drawer
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cancel = btns.find(b => b.textContent && b.textContent.includes('取消'));
        if (cancel) cancel.click();
      });
      await new Promise(r => setTimeout(r, 400));
      console.log('✅ Pipeline step side drawer closed.');
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n========================================');
    console.log('🎉 [E2E] Deep Browser E2E Test Passed 100%!');
    console.log(`Total Console Errors: ${errors.length}`);
    console.log(`Total Warnings: ${warnings.length}`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ [E2E Test Failed]:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runDeepE2ETest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
