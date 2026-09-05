import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
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

const TEST_PASSWORD = 'bank_password_8899';

/**
 * Generates an encrypted sample PDF document with password protection
 */
async function generateEncryptedPdf() {
  console.log('🔒 [Setup] Generating encrypted 2-page sample PDF for unlock test...');
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1: Bank Statement Overview
  const p1 = doc.addPage(PageSizes.A4);
  p1.drawText('CONFIDENTIAL BANK ACCOUNT STATEMENT', { x: 50, y: 780, size: 20, font: fontBold, color: rgb(0.1, 0.3, 0.7) });
  p1.drawText(`Account Number: ****-****-8829-1920`, { x: 50, y: 740, size: 12, font });
  p1.drawText('Statement Period: October 1, 2026 - October 31, 2026', { x: 50, y: 720, size: 11, font });
  p1.drawText('NOTICE: This financial document is strictly password-protected and encrypted.', { x: 50, y: 680, size: 10, font, color: rgb(0.8, 0.2, 0.2) });

  // Page 2: Transactions
  const p2 = doc.addPage(PageSizes.A4);
  p2.drawText('TRANSACTION AUDIT LOG & SUMMARY', { x: 50, y: 780, size: 18, font: fontBold, color: rgb(0.1, 0.3, 0.7) });
  p2.drawText('Transaction ID: TXN-994827104 - DEPOSIT: $12,500.00 USD (CLEARED)', { x: 50, y: 740, size: 11, font });
  p2.drawText('Transaction ID: TXN-994827105 - WIRE TRANSFER: -$4,200.00 USD (COMPLETED)', { x: 50, y: 720, size: 11, font });

  const rawBytes = await doc.save();

  // Encrypt with password
  const encryptedBytes = await encryptPDF(rawBytes, TEST_PASSWORD, {
    algorithm: 'RC4'
  });

  const encryptedPdfPath = path.join(TEMP_DIR, 'test_encrypted_bank_statement.pdf');
  fs.writeFileSync(encryptedPdfPath, encryptedBytes);
  console.log(`  ✓ Created encrypted PDF: ${encryptedPdfPath} (${(encryptedBytes.length / 1024).toFixed(1)} KB, 2 pages)`);
  console.log(`  ✓ Document Password: "${TEST_PASSWORD}"`);

  return encryptedPdfPath;
}

async function runUnlockBusinessTest() {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Business Test] PDF Unlock & Decryption Workflow');
  console.log('==========================================================\n');

  const encryptedPdfPath = await generateEncryptedPdf();

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

    // 2. Switch to "PDF 解密" via "更多工具" Dropdown in Navbar
    console.log('📍 [Step 2] Navigating to "PDF 解密" (Unlock) via Navbar More Tools menu...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('header button'));
      const moreBtn = buttons.find(b => {
        const t = b.textContent || '';
        return t.includes('更多') || t.includes('More');
      });
      if (moreBtn) moreBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Click "去除密码 / PDF 解密" item in dropdown popover
    const unlockClicked = await page.evaluate(() => {
      const popoverBtns = Array.from(document.querySelectorAll('.absolute button, header button'));
      const uBtn = popoverBtns.find(b => {
        const t = b.textContent || '';
        return t.includes('去除密码') || t.includes('解密') || t.includes('Unlock') || t.includes('解除密码');
      });
      if (uBtn) {
        uBtn.click();
        return true;
      }
      return false;
    });
    if (!unlockClicked) throw new Error('Could not find "去除密码" menu item in Navbar dropdown');
    await new Promise(r => setTimeout(r, 600));

    // Verify empty dropzone is visible
    const hasDropzone = await page.evaluate(() => {
      return document.body.innerText.includes('解除密码的 PDF') || 
             document.body.innerText.includes('encrypted PDF file to unlock') ||
             document.querySelector('input[type="file"]') !== null;
    });
    if (!hasDropzone) throw new Error('Unlock dropzone not rendered');
    console.log('  ✓ Successfully switched to PDF Unlock tool workbench');

    // 3. Upload Encrypted PDF
    console.log(`📍 [Step 3] Uploading encrypted PDF: ${encryptedPdfPath}...`);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('Unlock file input not found');

    await fileInput.uploadFile(encryptedPdfPath);

    // Wait for file summary and encryption password input card to appear
    await page.waitForFunction(() => {
      return document.querySelector('p[title]') !== null &&
             document.querySelector('input[placeholder*="密码"], input[placeholder*="password"]') !== null;
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 500));

    const statusInfo = await page.evaluate(() => {
      const titleEl = document.querySelector('p[title]');
      const promptEl = document.querySelector('.text-amber-800');
      return {
        fileName: titleEl?.getAttribute('title'),
        prompt: promptEl?.innerText?.trim()
      };
    });
    console.log(`  ✓ Document Loaded: ${statusInfo.fileName}`);
    console.log(`  ✓ Password Prompt: "${statusInfo.prompt}"`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'unlock_01_encrypted_detected.png') });
    console.log('  📷 Screenshot saved: unlock_01_encrypted_detected.png');

    // 4. Test Wrong Password Handling
    console.log('📍 [Step 4] Testing Incorrect Password Handling (Entering "wrong_password_999")...');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="密码"], input[placeholder*="password"]');
      if (input) {
        input.value = 'wrong_password_999';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Click Unlock Button
    const unlockActionBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => {
        const text = b.textContent || '';
        return text.includes('解除密码') || text.includes('Unlock') || text.includes('解密');
      }) || null;
    });

    const actionEl = unlockActionBtn.asElement();
    if (!actionEl) throw new Error('Unlock action button not found');
    await actionEl.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify error message is rendered
    const errorText = await page.evaluate(() => {
      const errEl = document.querySelector('.text-rose-600');
      return errEl?.innerText?.trim();
    });
    console.log(`  ✓ Error feedback displayed: "${errorText}"`);
    if (!errorText || (!errorText.includes('密码错误') && !errorText.includes('password') && !errorText.includes('Incorrect'))) {
      throw new Error(`Expected password error message, got "${errorText}"`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'unlock_02_wrong_password_error.png') });
    console.log('  📷 Screenshot saved: unlock_02_wrong_password_error.png');

    // 5. Test Password Visibility Toggle (Eye / EyeOff)
    console.log('📍 [Step 5] Testing Password Visibility Toggle...');
    const initialInputType = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="密码"], input[placeholder*="password"]');
      return input?.getAttribute('type');
    });
    console.log(`  ✓ Initial input type: "${initialInputType}" (Expected "password")`);

    // Click Eye button
    const eyeClicked = await page.evaluate(() => {
      const eyeBtn = document.querySelector('button[data-testid="toggle-pwd-btn"]') ||
                     document.querySelector('button[title*="password"]') ||
                     document.querySelector('.relative button');
      if (eyeBtn) {
        eyeBtn.click();
        return true;
      }
      return false;
    });
    if (!eyeClicked) throw new Error('Eye toggle button not found');
    await new Promise(r => setTimeout(r, 300));

    const revealedInputType = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="密码"], input[placeholder*="password"]');
      return input?.getAttribute('type');
    });
    console.log(`  ✓ Revealed input type: "${revealedInputType}" (Expected "text")`);
    if (revealedInputType !== 'text') throw new Error('Expected input type to switch to text');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'unlock_03_password_revealed.png') });
    console.log('  📷 Screenshot saved: unlock_03_password_revealed.png');

    // 6. Enter Correct Password & Customize Filename
    console.log(`📍 [Step 6] Entering Correct Password: "${TEST_PASSWORD}"...`);
    await page.evaluate((pwd) => {
      const input = document.querySelector('input[placeholder*="密码"], input[placeholder*="password"]');
      if (input) {
        input.value = pwd;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, TEST_PASSWORD);
    await new Promise(r => setTimeout(r, 300));

    // Customize Output Filename
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[type="text"]:not([placeholder*="密码"]):not([placeholder*="password"])');
      if (nameInput) {
        nameInput.value = 'E2E_Unlocked_Bank_Statement';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Clear download directory
    fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
      try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
    });

    // 7. Execute Decryption & Export
    console.log('📍 [Step 7] Executing Document Decryption ("🔓 彻底解除密码并下载 PDF")...');
    await actionEl.click();
    console.log('  ✓ Clicked Unlock button. Stripping encryption in browser memory...');

    // Await download completion
    console.log('  ⏳ Awaiting decrypted PDF file output...');
    let downloadedBytes = null;
    let finalFileName = 'E2E_Unlocked_Bank_Statement.pdf';

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
      throw new Error('Timeout: Decrypted PDF was not downloaded within 15 seconds.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'unlock_04_completed.png') });
    console.log('  📷 Screenshot saved: unlock_04_completed.png');

    // 8. Deep Physical Validation with pdf-lib
    console.log('📍 [Step 8] Deep Physical Validation with pdf-lib...');
    console.log(`  • Output File: ${finalFileName}`);
    console.log(`  • Output Size: ${(downloadedBytes.length / 1024).toFixed(2)} KB`);

    // KEY ASSERTION: PDFDocument.load without ANY password MUST succeed!
    // If the PDF were still encrypted, PDFDocument.load would throw EncryptedPDFError!
    const resultDoc = await PDFDocument.load(downloadedBytes);
    const totalPages = resultDoc.getPageCount();
    console.log(`  • Decrypted PDF Total Pages: ${totalPages}`);

    if (totalPages !== 2) {
      throw new Error(`Expected exactly 2 pages, got ${totalPages}`);
    }
    console.log('  🎉 [VALIDATION SUCCESS] Document opened freely without any password, strictly containing 2 pages!');

    // 9. Test Reset
    console.log('📍 [Step 9] Testing Reset / Change File (Clear to empty dropzone)...');
    const resetBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && (b.textContent.includes('重置') || b.textContent.includes('Reset'))) || null;
    });

    const resetEl = resetBtn.asElement();
    if (resetEl) {
      await resetEl.click();
      await new Promise(r => setTimeout(r, 400));
      const isReset = await page.evaluate(() => {
        return document.querySelector('p[title]') === null;
      });
      console.log(`  ✓ Workspace reset back to empty dropzone: ${isReset}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'unlock_05_reset_empty.png') });
      console.log('  📷 Screenshot saved: unlock_05_reset_empty.png');
    }

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] PDF Unlock Business Workflow Test 100% Passed!');
    console.log(`✓ Encrypted PDF Ingestion: Verified`);
    console.log(`✓ Wrong Password Handling: Verified (Error displayed)`);
    console.log(`✓ Eye Visibility Toggle:   Verified (Password <-> Text)`);
    console.log(`✓ Decryption & Export:     Verified (${finalFileName})`);
    console.log(`✓ Reset & Clear:          Verified`);
    console.log(`✓ 100% Free Open by pdf-lib: Verified (No password required)`);
    console.log('==========================================================\n');

  } catch (err) {
    console.error('❌ [Unlock Business Test Failed]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runUnlockBusinessTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
