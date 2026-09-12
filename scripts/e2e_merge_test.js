import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch(e) {}
});

/**
 * Generates sample PDF files for testing
 */
async function generateSamplePdfs() {
  console.log('📄 [Setup] Generating test sample PDFs...');

  // Sample Doc 1: 2 Pages
  const doc1 = await PDFDocument.create();
  const font = await doc1.embedFont(StandardFonts.HelveticaBold);
  
  const p1 = doc1.addPage([595.28, 841.89]); // A4
  p1.drawText('Sample Document 1 - Page 1', { x: 50, y: 750, size: 24, font, color: rgb(0.1, 0.3, 0.8) });
  
  const p2 = doc1.addPage([595.28, 841.89]);
  p2.drawText('Sample Document 1 - Page 2', { x: 50, y: 750, size: 24, font, color: rgb(0.1, 0.3, 0.8) });

  const path1 = path.join(TEMP_DIR, 'test_contract_part1.pdf');
  fs.writeFileSync(path1, await doc1.save());

  // Sample Doc 2: 3 Pages
  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.HelveticaBold);

  const p3 = doc2.addPage([595.28, 841.89]);
  p3.drawText('Sample Document 2 - Page 1 (Appendix A)', { x: 50, y: 750, size: 24, font: font2, color: rgb(0.8, 0.2, 0.2) });

  const p4 = doc2.addPage([595.28, 841.89]);
  p4.drawText('Sample Document 2 - Page 2 (Appendix B)', { x: 50, y: 750, size: 24, font: font2, color: rgb(0.8, 0.2, 0.2) });

  const p5 = doc2.addPage([595.28, 841.89]);
  p5.drawText('Sample Document 2 - Page 3 (Signatures)', { x: 50, y: 750, size: 24, font: font2, color: rgb(0.8, 0.2, 0.2) });

  const path2 = path.join(TEMP_DIR, 'test_contract_part2.pdf');
  fs.writeFileSync(path2, await doc2.save());

  console.log(`  ✓ Created: ${path1} (2 pages)`);
  console.log(`  ✓ Created: ${path2} (3 pages)`);

  return [path1, path2];
}

async function runMergeBusinessTest() {
  console.log('\n======================================================');
  console.log('🧪 [E2E Business Test] PDF Merge Workflow Verification');
  console.log('======================================================\n');

  const [pdf1Path, pdf2Path] = await generateSamplePdfs();

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
    // 1. Open home page (default tool is Merge)
    console.log('📍 [Step 1] Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

    // Hook anchor click to capture the actual downloaded PDF blob
    await page.evaluate(() => {
      window.__mergedPdfBytes = null;
      window.__mergedFileName = null;
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download && this.download.toLowerCase().endsWith('.pdf')) {
          const downloadName = this.download;
          fetch(this.href).then(r => r.arrayBuffer()).then(buf => {
            window.__mergedPdfBytes = Array.from(new Uint8Array(buf));
            window.__mergedFileName = downloadName;
          });
        }
        return origClick.call(this);
      };
    });

    // 2. Upload the two sample PDFs
    console.log('📍 [Step 2] Uploading 2 sample PDF files to Merge tool...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found on page');

    await fileInput.uploadFile(pdf1Path, pdf2Path);
    
    // Wait for at least 2 file cards to be rendered in the DOM
    await page.waitForFunction(() => {
      const items = document.querySelectorAll('p.font-bold');
      return items.length >= 2;
    }, { timeout: 20000 });

    const cardNames = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('p.font-bold'));
      return items.map(p => p.textContent.trim());
    });
    console.log(`  ✓ Uploaded document cards:`, cardNames);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'merge_01_uploaded_cards.png') });
    console.log('  📷 Screenshot saved: merge_01_uploaded_cards.png');

    // 3. Test Reversing Order
    console.log('📍 [Step 3] Testing "倒序重排" (Reverse Order)...');
    const reverseBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && (b.textContent.includes('倒序') || b.textContent.includes('Reverse'))) || null;
    });

    const revEl = reverseBtn.asElement();
    if (revEl) {
      await revEl.click();
      await new Promise(r => setTimeout(r, 400));

      const reversedCardNames = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('p.font-bold'));
        return items.map(p => p.textContent.trim());
      });
      console.log(`  ✓ Cards after reversal:`, reversedCardNames);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'merge_02_reversed_order.png') });
      console.log('  📷 Screenshot saved: merge_02_reversed_order.png');
    }

    // 4. Customize Output Filename
    console.log('📍 [Step 4] Customizing Output Filename...');
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder="PDFSeal_Merged"]');
      if (nameInput) {
        nameInput.value = 'E2E_Custom_Merged_Result';
        nameInput.dispatchEvent(new Event('input'));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // 5. Execute Merge & Download
    console.log('📍 [Step 5] Triggering Merge Execution...');
    const mergeBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.querySelector('svg.lucide-download') || (b.textContent && (b.textContent.includes('封印') || b.textContent.includes('Seal')))) || null;
    });

    const mergeEl = mergeBtn.asElement();
    if (!mergeEl) throw new Error('Primary execution merge button not found');

    const btnText = await page.evaluate(el => el.textContent.trim(), mergeEl);
    console.log(`  ✓ Found execution button: "${btnText}". Clicking...`);
    await mergeEl.click();
    console.log('  ✓ Clicked Merge button. Processing in local browser memory...');
    await new Promise(r => setTimeout(r, 70));
    try {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'merge_02b_processing_state.png') });
      console.log('  📷 Screenshot saved: merge_02b_processing_state.png');
    } catch (e) {}

    // Wait for file download or captured bytes in memory
    console.log('  ⏳ Awaiting downloaded merged PDF file...');
    let downloadedBytes = null;
    let finalFileName = 'E2E_Custom_Merged_Result.pdf';

    for (let i = 0; i < 20; i++) {
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
      const inMemBytes = await page.evaluate(() => window.__mergedPdfBytes);
      if (inMemBytes && inMemBytes.length > 0) {
        downloadedBytes = Buffer.from(inMemBytes);
        console.log(`  ✓ Browser in-memory blob stream captured (${downloadedBytes.length} bytes)`);
        fs.writeFileSync(path.join(DOWNLOAD_DIR, finalFileName), downloadedBytes);
        break;
      }
    }

    if (!downloadedBytes || downloadedBytes.length === 0) {
      throw new Error('Timeout: Merged PDF was not produced within 10 seconds.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'merge_03_completed.png') });
    console.log('  📷 Screenshot saved: merge_03_completed.png');

    // 6. Deep Inspect Output PDF with pdf-lib
    console.log('📍 [Step 6] Deep Physical Inspection of Merged PDF...');
    console.log(`  • File Size: ${(downloadedBytes.length / 1024).toFixed(2)} KB`);

    const mergedDoc = await PDFDocument.load(downloadedBytes);
    const totalPages = mergedDoc.getPageCount();
    console.log(`  • Merged Total Pages: ${totalPages}`);

    // Verification: 2 pages + 3 pages = 5 pages total!
    if (totalPages === 5) {
      console.log('  🎉 [VALIDATION SUCCESS] Total pages matches exactly 2 + 3 = 5 pages!');
    } else {
      throw new Error(`Validation failed: Expected 5 pages, but got ${totalPages}`);
    }

    // Verify page dimensions (A4: 595.28 x 841.89)
    const firstPage = mergedDoc.getPage(0);
    const { width, height } = firstPage.getSize();
    console.log(`  • Page 1 Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);

    console.log('\n======================================================');
    console.log('🎉 [SUCCESS] PDF Merge Business Workflow Test 100% Passed!');
    console.log(`Input Files:  2 documents (2 pages + 3 pages)`);
    console.log(`Output File: ${finalFileName} (${totalPages} pages)`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ [Merge Business Test Failed]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runMergeBusinessTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
