/**
 * E2E Business Test: PDF Redact (Client-side Stream Redaction)
 *
 * Part 1 — Tool flow: upload fixture → drag a mask over the target line
 *          (snap-to-text) → burn → download → re-extract text in Node and
 *          assert the target line is destroyed while sibling lines survive.
 *
 * Part 2 — Pipeline flow: seed a custom flow containing node_redact via
 *          localStorage, upload a 2-page fixture (text page + image page),
 *          run, download and assert: page-1 hit line removed, sibling line
 *          kept, and the image page is left untouched (rules do not cover
 *          image pages — the per-page annotation itself is asserted at unit
 *          level in tests/pipeline.test.js).
 *
 * Prereq: dev server on http://localhost:5173 (npm run dev).
 */
import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts, PageSizes, PDFName, PDFRawStream } from 'pdf-lib';
import { execSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = path.join(process.cwd(), 'temp_e2e_test');
const DOWNLOAD_DIR = path.join(TEMP_DIR, 'downloads');
const SCREENSHOT_DIR = path.join(process.cwd(), 'e2e_screenshots');
const PROFILE_DIR = path.join(TEMP_DIR, 'chrome_profile_redact');

// Ensure directories exist and clean downloads
[TEMP_DIR, DOWNLOAD_DIR, SCREENSHOT_DIR, PROFILE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
});

/** Standard 1x1 JPEG (base64), same as in tests/redact.test.js, used for image page fixture */
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/2gAIAQEAAD8A0s8g/9k=';

// ---------- Fixtures ----------

async function makeToolFixturePdf() {
  console.log('📄 [Setup] Generating tool-flow fixture (3 known text lines)...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage(PageSizes.A4);
  page.drawText('Public Document Header', { x: 50, y: 780, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('SECRET-ACCOUNT-8899-DEADLINE', { x: 50, y: 650, size: 14, font, color: rgb(0.7, 0.1, 0.1) });
  page.drawText('Public footer line', { x: 50, y: 520, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  const bytes = await doc.save();
  const p = path.join(TEMP_DIR, 'redact_tool_fixture.pdf');
  fs.writeFileSync(p, bytes);
  console.log(`  ✓ Created: ${p} (${(bytes.length / 1024).toFixed(1)} KB, 1 page)`);
  return p;
}

async function makePipelineFixturePdf() {
  console.log('📄 [Setup] Generating pipeline fixture (page1 text / page2 text + image)...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const p1 = doc.addPage(PageSizes.A4);
  p1.drawText('Public intro line', { x: 50, y: 760, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  p1.drawText('SECRET-ACCOUNT-8899-DEADLINE', { x: 50, y: 700, size: 14, font, color: rgb(0.7, 0.1, 0.1) });

  const p2 = doc.addPage(PageSizes.A4);
  p2.drawText('Public specs line', { x: 50, y: 760, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  const jpg = await doc.embedJpg(Uint8Array.from(atob(TINY_JPEG_BASE64), (c) => c.charCodeAt(0)));
  p2.drawImage(jpg, { x: 60, y: 500, width: 120, height: 90 });

  const bytes = await doc.save();
  const p = path.join(TEMP_DIR, 'redact_pipeline_fixture.pdf');
  fs.writeFileSync(p, bytes);
  console.log(`  ✓ Created: ${p} (${(bytes.length / 1024).toFixed(1)} KB, 2 pages)`);
  return p;
}

// ---------- Node-side text extraction (same as tests/redact.test.js) ----------

let pdfjsModule = null;
async function getPdfjs() {
  if (!pdfjsModule) pdfjsModule = await import('pdfjs-dist');
  return pdfjsModule;
}

async function extractTextPages(bytes) {
  const pdfjs = await getPdfjs();
  let fontUrl = pathToFileURL(
    resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts')
  ).href;
  if (!fontUrl.endsWith('/')) fontUrl += '/';
  const task = pdfjs.getDocument({
    // pdf.js 4.x rejects Node Buffer; copy into plain Uint8Array
    data: new Uint8Array(bytes).slice(),
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: fontUrl
  });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it) => it.str).join('\n'));
  }
  await pdf.destroy();
  return pages;
}

// ---------- Helpers ----------

async function captureDownload(page, patterns, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 600));

    const diskFiles = fs.readdirSync(DOWNLOAD_DIR)
      .filter((f) => patterns.some((p) => f.toLowerCase().endsWith(p)))
      .map((f) => ({ name: f, bytes: fs.readFileSync(path.join(DOWNLOAD_DIR, f)) }));
    if (diskFiles.length > 0) {
      console.log(`  ✓ Disk downloads captured: ${diskFiles.map((d) => d.name).join(', ')}`);
      return diskFiles;
    }

    const captured = await page.evaluate(() => window.__capturedDownloads || []);
    if (captured.length > 0) {
      const files = captured.map((c) => ({ name: c.name, bytes: Buffer.from(c.bytes) }));
      files.forEach((d) => fs.writeFileSync(path.join(DOWNLOAD_DIR, d.name), d.bytes));
      console.log(`  ✓ Browser in-memory blobs captured: ${files.map((d) => d.name).join(', ')}`);
      return files;
    }
  }
  throw new Error(`Timeout: no download matching ${patterns.join('/')} within ${timeoutMs}ms`);
}

/** Extracts first PDF using PowerShell Expand-Archive when download is a zip */
function extractPdfFromZip(zipPath) {
  const dest = path.join(TEMP_DIR, 'zip_out_' + Date.now());
  execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${dest}' -Force"`);
  const found = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (f.toLowerCase().endsWith('.pdf')) found.push({ name: f, bytes: fs.readFileSync(full) });
    }
  };
  walk(dest);
  if (!found.length) throw new Error('No PDF found inside downloaded ZIP');
  return found;
}

function assert(cond, message) {
  if (!cond) throw new Error('ASSERT FAILED: ' + message);
  console.log('  ✓ ' + message);
}

/** Redirect browser downloads (incl. blob anchors) into DOWNLOAD_DIR */
async function setupDownloadRedirect(page) {
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
}

// ---------- Part 1: Tool flow ----------

async function runToolFlow(toolFixturePath, browser) {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Part 1] Redact Tool Flow (draw → burn → verify)');
  console.log('==========================================================\n');

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (err) => console.error('  [Browser Page Error]:', err.message));

  try {
    // 1. Direct navigation (web-history SPA fallback)
    console.log('📍 [Step 1] Navigating to http://localhost:5173/redact-pdf...');
    await page.goto('http://localhost:5173/redact-pdf', { waitUntil: 'networkidle2', timeout: 20000 });
    await setupDownloadRedirect(page);

    // Download trap for PDF blobs
    await page.evaluate(() => {
      window.__capturedDownloads = [];
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download && this.download.toLowerCase().endsWith('.pdf')) {
          const downloadName = this.download;
          fetch(this.href).then((r) => r.arrayBuffer()).then((buf) => {
            window.__capturedDownloads.push({ name: downloadName, bytes: Array.from(new Uint8Array(buf)) });
          });
        }
        return origClick.call(this);
      };
    });

    // 2. Upload fixture (empty state file input)
    console.log(`📍 [Step 2] Uploading fixture: ${toolFixturePath}...`);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('Redact file input not found');
    await fileInput.uploadFile(toolFixturePath);

    // 3. Wait for editor state (overlay) and draw a mask band over the secret line
    console.log('📍 [Step 3] Drawing a mask over the secret line (snap-to-text)...');
    await page.waitForSelector('[data-testid="redact-overlay"]', { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 800)); // canvas render settle

    const box = await (await page.$('[data-testid="redact-overlay"]')).boundingBox();
    if (!box) throw new Error('Overlay bounding box unavailable');
    // Secret line sits at ~21.6%-23.2% page height; a 20%→26% band intersects only it
    const x0 = box.x + box.width * 0.15, y0 = box.y + box.height * 0.20;
    const x1 = box.x + box.width * 0.85, y1 = box.y + box.height * 0.26;
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 12 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 400));

    // 4. Burn button must be enabled now
    const burnState = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="redact-burn-btn"]');
      return { exists: !!btn, disabled: btn ? btn.disabled : null };
    });
    assert(burnState.exists && burnState.disabled === false, 'Burn button enabled after mask drawn');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redact_tool_01_mask_drawn.png') });
    console.log('  📷 Screenshot saved: redact_tool_01_mask_drawn.png');

    // 5. Burn → confirm modal → execute
    console.log('📍 [Step 5] Burning redaction (confirm modal)...');
    await (await page.$('[data-testid="redact-burn-btn"]')).click();
    await page.waitForSelector('[data-testid="redact-confirm-btn"]', { timeout: 10000 });
    await (await page.$('[data-testid="redact-confirm-btn"]')).click();

    // 6. Wait for result delivery view
    console.log('📍 [Step 6] Waiting for ResultDeliveryView...');
    await page.waitForSelector('[data-testid="delivery-redownload"]', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redact_tool_02_result.png') });
    console.log('  📷 Screenshot saved: redact_tool_02_result.png');

    // 7. Download output and capture bytes
    console.log('📍 [Step 7] Downloading redacted output...');
    await (await page.$('[data-testid="delivery-redownload"]')).click();
    const downloads = await captureDownload(page, ['.pdf']);
    const outBytes = downloads[0].bytes;
    console.log(`  ✓ Captured output: ${downloads[0].name} (${(outBytes.length / 1024).toFixed(1)} KB)`);

    // 8. Node-side re-extraction: target line destroyed, siblings survive
    console.log('📍 [Step 8] Re-extracting text from output (pdf.js in Node)...');
    const pages = await extractTextPages(outBytes);
    const page1 = pages[0] || '';
    assert(!page1.includes('SECRET-ACCOUNT-8899'), 'Target line "SECRET-ACCOUNT-8899-DEADLINE" destroyed');
    assert(page1.includes('Public Document Header'), 'Sibling line "Public Document Header" survives');
    assert(page1.includes('Public footer line'), 'Sibling line "Public footer line" survives');
  } finally {
    await page.close();
  }
}

// ---------- Part 2: Pipeline flow ----------

async function runPipelineFlow(pipelineFixturePath, browser) {
  console.log('\n==========================================================');
  console.log('🧪 [E2E Part 2] Redact Pipeline Flow (node_redact batch run)');
  console.log('==========================================================\n');

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (err) => console.error('  [Browser Page Error]:', err.message));

  // Seed a custom flow (localStorage) before the app boots
  await page.evaluateOnNewDocument((flow) => {
    localStorage.setItem('pdfseal_user_custom_pipelines', JSON.stringify([flow]));
  }, {
    id: 'e2e_redact_flow',
    name: 'E2E Redact Flow',
    desc: 'Seeded by e2e_redact_test.js',
    isCustom: true,
    updatedAt: Date.now(),
    exportConfig: { destination: 'download_files' },
    steps: [{
      id: 'step_redact_e2e_1',
      nodeId: 'node_redact',
      params: {
        rules: [{ id: 'rule_1', type: 'keyword', value: 'SECRET-ACCOUNT-8899', caseSensitive: false }],
        style: 'black'
      }
    }]
  });

  try {
    // Clean up residual downloads from Part 1 to prevent contamination
    fs.readdirSync(DOWNLOAD_DIR).forEach((f) => {
      try { fs.unlinkSync(path.join(DOWNLOAD_DIR, f)); } catch (e) {}
    });

    // 1. Open pipeline workbench
    console.log('📍 [Step 1] Navigating to http://localhost:5173/pipeline...');
    await page.goto('http://localhost:5173/pipeline', { waitUntil: 'networkidle2', timeout: 20000 });
    await setupDownloadRedirect(page);

    await page.evaluate(() => {
      window.__capturedDownloads = [];
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download && (this.download.toLowerCase().endsWith('.pdf') || this.download.toLowerCase().endsWith('.zip'))) {
          const downloadName = this.download;
          fetch(this.href).then((r) => r.arrayBuffer()).then((buf) => {
            window.__capturedDownloads.push({ name: downloadName, bytes: Array.from(new Uint8Array(buf)) });
          });
        }
        return origClick.call(this);
      };
    });

    await page.waitForSelector('[data-testid="pipeline-run-btn"]', { timeout: 20000 });

    // 2. Switch to the seeded custom flow
    console.log('📍 [Step 2] Selecting seeded flow "E2E Redact Flow"...');
    const selected = await page.evaluate(() => {
      const sel = document.querySelector('[data-testid="pipeline-flow-select"]');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === 'user_e2e_redact_flow');
      if (!opt) return false;
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    assert(selected, 'Seeded custom flow available in flow selector');
    await new Promise((r) => setTimeout(r, 600));

    // 3. Upload fixture
    console.log(`📍 [Step 3] Uploading pipeline fixture: ${pipelineFixturePath}...`);
    const fileInput = await page.$('[data-testid="pipeline-file-input"]');
    if (!fileInput) throw new Error('Pipeline file input not found');
    await fileInput.uploadFile(pipelineFixturePath);
    await page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="pipeline-run-btn"]');
      return btn && !btn.disabled;
    }, { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 400));

    // 4. Run pipeline
    console.log('📍 [Step 4] Running pipeline with node_redact...');
    await (await page.$('[data-testid="pipeline-run-btn"]')).click();
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="pipeline-download-all-btn"]') !== null ||
             document.body.innerText.includes('已完成处理') ||
             document.body.innerText.includes('Completed');
    }, { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'redact_pipeline_01_result.png') });
    console.log('  📷 Screenshot saved: redact_pipeline_01_result.png');

    // 5. Download deliverables (single PDF or ZIP)
    console.log('📍 [Step 5] Downloading deliverables...');
    await (await page.$('[data-testid="pipeline-download-all-btn"]')).click();
    let files = await captureDownload(page, ['.pdf', '.zip']);
    if (files.some((f) => f.name.toLowerCase().endsWith('.zip'))) {
      const zipped = files.filter((f) => f.name.toLowerCase().endsWith('.zip'));
      files = zipped.flatMap((f) => extractPdfFromZip(path.join(DOWNLOAD_DIR, f.name)));
      console.log(`  ✓ Extracted from ZIP: ${files.map((f) => f.name).join(', ')}`);
    }

    // 6. Node-side validation
    console.log('📍 [Step 6] Re-extracting text from pipeline output (pdf.js in Node)...');
    const target = files[0];
    const pages = await extractTextPages(target.bytes);
    assert(pages.length >= 2, `Output has ${pages.length} pages`);
    const p1 = pages[0] || '';
    const p2 = pages[1] || '';
    assert(!p1.includes('SECRET-ACCOUNT-8899'), 'Page 1: rule hit line destroyed');
    assert(p1.includes('Public intro line'), 'Page 1: sibling line survives');
    assert(p2.includes('Public specs line'), 'Page 2 (image page): text untouched — rules do not cover image pages');

    // Image XObject still present on page 2 (untouched, no rasterization without hits)
    const outDoc = await PDFDocument.load(target.bytes, { ignoreEncryption: true, updateMetadata: false });
    const p2Node = outDoc.getPage(1).node;
    let imageCount = 0;
    const xo = p2Node.Resources()?.lookup?.(PDFName.of('XObject'));
    if (xo?.entries) {
      for (const [, v] of xo.entries()) {
        const sm = xo.context.lookup(v);
        const subtype = sm?.dict?.get?.(PDFName.of('Subtype'));
        if (sm instanceof PDFRawStream && subtype?.toString() === '/Image') imageCount += 1;
      }
    }
    assert(imageCount >= 1, `Page 2 image XObject preserved (found ${imageCount})`);
  } finally {
    await page.close();
  }
}

// ---------- Main ----------

async function main() {
  const toolFixture = await makeToolFixturePdf();
  const pipelineFixture = await makePipelineFixturePdf();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--user-data-dir=${path.join(os.tmpdir(), 'pdfseal_e2e_redact_profile')}`,
      '--window-size=1440,900'
    ]
  });

  try {
    await runToolFlow(toolFixture, browser);
    await runPipelineFlow(pipelineFixture, browser);

    console.log('\n==========================================================');
    console.log('🎉 [SUCCESS] PDF Redact E2E Test 100% Passed!');
    console.log('✓ Tool Flow:  draw/snap → burn → download → text destroyed, siblings survive');
    console.log('✓ Pipeline:   node_redact batch rule → hit destroyed, image page untouched');
    console.log('==========================================================\n');
  } finally {
    await browser.close();
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('❌ [Redact E2E Failed]:', err);
  process.exit(1);
});
