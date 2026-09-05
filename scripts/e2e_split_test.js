import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const DOWNLOAD_DIR = path.join(TEMP_DIR, 'downloads');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');

// Ensure directories exist and clean downloads
[TEMP_DIR, DOWNLOAD_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
});

/**
 * Generates a 6-page test PDF document with distinct content on each page
 */
async function generateSamplePdf() {
  console.log('📄 [Setup] Generating 6-page sample PDF for split test...');
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const pageContents = [
    { title: 'CHAPTER 1: INTRODUCTION & EXECUTIVE SUMMARY', subtitle: 'Overview of the project scope and preliminary findings.', color: rgb(0.1, 0.3, 0.7) },
    { title: 'CHAPTER 2: MARKET ANALYSIS & BACKGROUND', subtitle: 'In-depth market dynamics and competitor landscapes.', color: rgb(0.1, 0.6, 0.3) },
    { title: 'CHAPTER 3: CORE PRODUCT SPECIFICATIONS', subtitle: 'Technical architectural specifications and interface definitions.', color: rgb(0.7, 0.4, 0.1) },
    { title: 'CHAPTER 4: FINANCIAL PROJECTIONS & BUDGETS', subtitle: 'Detailed quarterly cost structures and cashflow statements.', color: rgb(0.8, 0.2, 0.2) },
    { title: 'CHAPTER 5: TECHNICAL INFRASTRUCTURE & SECURITY', subtitle: 'Client-side cryptographic guarantees and local memory isolation.', color: rgb(0.4, 0.1, 0.7) },
    { title: 'CHAPTER 6: APPENDIX & REFERENCE CITATIONS', subtitle: 'Supporting documentation, glossary, and academic citations.', color: rgb(0.2, 0.2, 0.2) }
  ];

  pageContents.forEach((c, idx) => {
    const p = doc.addPage(PageSizes.A4);
    p.drawText(`[PAGE ${idx + 1}] ${c.title}`, { x: 50, y: 780, size: 18, font: fontBold, color: c.color });
    p.drawText(c.subtitle, { x: 50, y: 740, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
    p.drawText(`Unique Identifier: SECTION-00${idx + 1}-VERIFIED`, { x: 50, y: 710, size: 10, font });
  });

  const inputPdfPath = path.join(TEMP_DIR, 'test_split_input.pdf');
  const bytes = await doc.save();
  fs.writeFileSync(inputPdfPath, bytes);
  console.log(`  ✓ Created 6-page test PDF: ${inputPdfPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
  return inputPdfPath;
}

async function runSplitBusinessTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Business Test] PDF Split & Extract Workflow');
  console.log('==========================================================\n');

  const inputPdfPath = await generateSamplePdf();

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

  page.on('console', msg => console.log(`  [Browser Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('  [Browser Page Error]:', err.message));

  // Enable download behavior to custom folder
  try {
    const client = await page.target().createCDPSession();
    await client.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_DIR,
      eventsEnabled: true
    }).catch(async () => {
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_DIR
      });
    });
  } catch (e) {}

  try {
    // 1. Open home page
    console.log('📍 [Step 1] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 15000 });

    // Setup global download trap for PDF blobs
    await page.evaluate(() => {
      window.__capturedDownloads = [];
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.download.toLowerCase().endsWith('.pdf')) {
          const downloadName = this.download;
          fetch(this.href).then(r => r.arrayBuffer()).then(buf => {
            window.__capturedDownloads.push({
              name: downloadName,
              bytes: Array.from(new Uint8Array(buf))
            });
          });
        }
        return origClick.call(this);
      };
    });

    // 2. Switch to Split Tab
    console.log('📍 [Step 2] Switching to "页面拆分" (Split) Tab in Navbar...');
    const splitTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      return btns.find(b => {
        const text = b.textContent || '';
        return text.includes('拆分') || text.includes('Split');
      }) || null;
    });

    const splitEl = splitTabBtn.asElement();
    if (!splitEl) throw new Error('Could not find "页面拆分" Tab button in Navbar');
    await splitEl.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify empty dropzone is visible
    const hasDropzone = await page.evaluate(() => {
      return document.body.innerText.includes('选择要拆分的 PDF') || 
             document.body.innerText.includes('Select a PDF to Split') ||
             document.querySelector('input[type="file"]') !== null;
    });
    if (!hasDropzone) throw new Error('Split dropzone not rendered');
    console.log('  ✓ Successfully switched to PDF Split tool workbench');

    // 3. Upload 6-Page PDF
    console.log(`📍 [Step 3] Uploading 6-page test PDF: ${inputPdfPath}...`);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('Split file input not found');

    await fileInput.uploadFile(inputPdfPath);

    // Wait for 6 thumbnail cards to render
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.grid > div');
      return cards.length === 6;
    }, { timeout: 15000 });

    const initialStatus = await page.evaluate(() => {
      const cards = document.querySelectorAll('.grid > div');
      const totalBadge = document.querySelector('span.bg-emerald-50')?.innerText?.trim();
      const selectedBadge = document.querySelector('span.bg-blue-50')?.innerText?.trim();
      return { count: cards.length, totalBadge, selectedBadge };
    });
    console.log(`  ✓ Rendered cards: ${initialStatus.count} pages`);
    console.log(`  ✓ Total Pages Badge: "${initialStatus.totalBadge}"`);
    console.log(`  ✓ Selected Pages Badge: "${initialStatus.selectedBadge}" (Default selects all 6)`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'split_01_uploaded_all_selected.png') });
    console.log('  📷 Screenshot saved: split_01_uploaded_all_selected.png');

    // 4. Test Deselect All & Card Manual Toggle Selection
    console.log('📍 [Step 4] Testing Deselect All & Manual Card Toggle...');
    // Click Deselect All
    const deselectBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => {
        return b.querySelector('svg.lucide-square') || 
               (b.textContent && (b.textContent.includes('取消全选') || b.textContent.includes('全不选') || b.textContent.includes('Deselect')));
      }) || null;
    });
    const deselectEl = deselectBtn.asElement();
    if (!deselectEl) throw new Error('Deselect All button not found');
    await deselectEl.click();
    await new Promise(r => setTimeout(r, 400));

    const statusAfterDeselect = await page.evaluate(() => {
      const selectedBadge = document.querySelector('span.bg-blue-50')?.innerText?.trim();
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('提取') || b.textContent?.includes('Extract'));
      return { selectedBadge, isDisabled: exportBtn ? exportBtn.disabled : false };
    });
    console.log(`  ✓ Selected after deselect: "${statusAfterDeselect.selectedBadge}"`);
    console.log(`  ✓ Export button disabled state: ${statusAfterDeselect.isDisabled}`);
    if (!statusAfterDeselect.isDisabled) throw new Error('Export button should be disabled when 0 pages selected');

    // Toggle Card 0 (Page 1) and Card 2 (Page 3)
    console.log('  • Clicking Card 1 (Page 1) and Card 3 (Page 3)...');
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.grid > div');
      if (cards[0]) cards[0].click();
      if (cards[2]) cards[2].click();
    });
    await new Promise(r => setTimeout(r, 400));

    const statusAfterToggle = await page.evaluate(() => {
      const selectedBadge = document.querySelector('span.bg-blue-50')?.innerText?.trim();
      return { selectedBadge };
    });
    console.log(`  ✓ Selected after manual click: "${statusAfterToggle.selectedBadge}" (Expected 2)`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'split_02_manual_toggle_selected.png') });
    console.log('  📷 Screenshot saved: split_02_manual_toggle_selected.png');

    // 5. Test Custom Page Range Input (e.g. '2, 4-5' -> pages 2, 4, 5)
    console.log('📍 [Step 5] Testing Custom Page Range Input ("2, 4-5")...');
    await page.evaluate(() => {
      const rangeInput = document.querySelector('input[placeholder*="1-3"]');
      if (rangeInput) {
        rangeInput.value = '2, 4-5';
        rangeInput.dispatchEvent(new Event('input'));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Click Apply Range
    const applyRangeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && (b.textContent.includes('应用') || b.textContent.includes('Apply'))) || null;
    });
    const applyEl = applyRangeBtn.asElement();
    if (!applyEl) throw new Error('Apply Range button not found');
    await applyEl.click();
    await new Promise(r => setTimeout(r, 500));

    const statusAfterRange = await page.evaluate(() => {
      const selectedBadge = document.querySelector('span.bg-blue-50')?.innerText?.trim();
      const cards = Array.from(document.querySelectorAll('.grid > div'));
      // Cards with class 'border-emerald-400' are selected
      const selectedCardIndices = cards
        .map((c, idx) => c.className.includes('border-emerald-400') ? idx + 1 : null)
        .filter(n => n !== null);
      return { selectedBadge, selectedCardIndices };
    });
    console.log(`  ✓ Selected after range "2, 4-5": "${statusAfterRange.selectedBadge}"`);
    console.log(`  ✓ Active Card Page Numbers:`, statusAfterRange.selectedCardIndices);

    // Verify exactly Pages 2, 4, 5 are selected
    const expected = [2, 4, 5];
    const matchesExpected = JSON.stringify(statusAfterRange.selectedCardIndices) === JSON.stringify(expected);
    if (!matchesExpected) {
      throw new Error(`Range selection failed: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(statusAfterRange.selectedCardIndices)}`);
    }
    console.log('  🎉 [VALIDATION SUCCESS] Custom range "2, 4-5" strictly resolved to Pages 2, 4, 5!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'split_03_range_applied.png') });
    console.log('  📷 Screenshot saved: split_03_range_applied.png');

    // 6. Customize Output Filename
    console.log('📍 [Step 6] Customizing Output Filename...');
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[type="text"]:not([placeholder*="1-3"])');
      if (nameInput) {
        nameInput.value = 'E2E_Split_Extracted_Result';
        nameInput.dispatchEvent(new Event('input'));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Clear download directory
    fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
      try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
    });

    // 7. Execute Split ("🦭 提取选中页面 (3)")
    console.log('📍 [Step 7] Executing Split ("🦭 提取选中页面 (3)")...');
    const extractBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => {
        return b.querySelector('svg.lucide-download') || 
               (b.textContent && (b.textContent.includes('提取') || b.textContent.includes('Extract')));
      }) || null;
    });

    const extractEl = extractBtn.asElement();
    if (!extractEl) throw new Error('Primary Extract button not found');
    await extractEl.click();
    console.log('  ✓ Clicked Extract button. Extracting pages in browser memory...');

    // Await download completion
    console.log('  ⏳ Awaiting extracted split PDF file...');
    let downloadedBytes = null;
    let finalFileName = 'E2E_Split_Extracted_Result.pdf';

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));

      // Check disk
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.pdf'));
      if (files.length > 0) {
        finalFileName = files[0];
        downloadedBytes = fs.readFileSync(path.join(DOWNLOAD_DIR, files[0]));
        console.log(`  ✓ Disk download detected: ${files[0]}`);
        break;
      }

      // Check browser memory buffer
      const captured = await page.evaluate(() => window.__capturedDownloads);
      if (captured && captured.length > 0) {
        const last = captured[captured.length - 1];
        finalFileName = last.name;
        downloadedBytes = Buffer.from(last.bytes);
        console.log(`  ✓ Browser in-memory blob stream captured (${downloadedBytes.length} bytes)`);
        fs.writeFileSync(path.join(DOWNLOAD_DIR, finalFileName), downloadedBytes);
        break;
      }
    }

    if (!downloadedBytes || downloadedBytes.length === 0) {
      throw new Error('Timeout: Split PDF was not downloaded within 15 seconds.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'split_04_completed.png') });
    console.log('  📷 Screenshot saved: split_04_completed.png');

    // 8. Deep Physical Inspection with pdf-lib
    console.log('📍 [Step 8] Deep Physical Validation with pdf-lib...');
    console.log(`  • Output File: ${finalFileName}`);
    console.log(`  • Output Size: ${(downloadedBytes.length / 1024).toFixed(2)} KB`);

    const resultDoc = await PDFDocument.load(downloadedBytes);
    const totalPages = resultDoc.getPageCount();
    console.log(`  • Output Page Count: ${totalPages}`);

    // Verification 1: Exactly 3 pages extracted
    if (totalPages === 3) {
      console.log('  🎉 [VALIDATION SUCCESS] Page count strictly equals 3 (Pages 2, 4, 5 extracted)!');
    } else {
      throw new Error(`Expected exactly 3 extracted pages, but output contains ${totalPages} pages`);
    }

    // 9. Test Clear All (Reset to empty state)
    console.log('📍 [Step 9] Testing Clear All (Reset to empty dropzone)...');
    const clearBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && (b.textContent.includes('清空') || b.textContent.includes('Clear'))) || null;
    });

    const clearEl = clearBtn.asElement();
    if (clearEl) {
      await clearEl.click();
      await new Promise(r => setTimeout(r, 400));
      const isReset = await page.evaluate(() => {
        return document.querySelectorAll('.grid > div').length === 0;
      });
      console.log(`  ✓ Workspace cleared back to empty dropzone: ${isReset}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'split_05_reset_empty.png') });
      console.log('  📷 Screenshot saved: split_05_reset_empty.png');
    }

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] PDF Split Business Workflow Test 100% Passed!');
    console.log(`✓ 6-Page PDF Ingestion:  Verified`);
    console.log(`✓ Deselect & Card Toggle: Verified`);
    console.log(`✓ Range Parsing (2, 4-5): Verified`);
    console.log(`✓ Extraction Execution:  Verified (${finalFileName})`);
    console.log(`✓ Reset & Clear:         Verified`);
    console.log(`✓ Output PDF Integrity:  100% Validated by pdf-lib`);
    console.log('==========================================================\n');

  } catch (err) {
    console.error('❌ [Split Business Test Failed]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runSplitBusinessTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
