import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\muffin\\.gemini\\antigravity\\brain\\b608726f-3d0b-43fa-8dc9-6f578332820d';
const TEMP_DIR = path.join(process.cwd(), 'temp_preview_images');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function generateSampleImages() {
  const images = [
    { name: 'photo_1.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' },
    { name: 'photo_2.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' },
    { name: 'photo_3.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' },
    { name: 'photo_4.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' },
    { name: 'photo_5.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' },
    { name: 'photo_6.png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA7SURBVHhe7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4M3V4AAEqe2aMAAAAAElFTkSuQmCC' }
  ];

  return images.map(img => {
    const p = path.join(TEMP_DIR, img.name);
    fs.writeFileSync(p, Buffer.from(img.b64, 'base64'));
    return p;
  });
}

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

    // 1. Image To PDF with 6 images
    console.log('📱 Navigating to http://localhost:4173/image-to-pdf...');
    await page.goto('http://localhost:4173/image-to-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    const imgPaths = generateSampleImages();
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(...imgPaths);
      await new Promise(r => setTimeout(r, 1200));

      const shot1Path = path.join(ARTIFACT_DIR, 'mobile_img2pdf_sticky_grid.png');
      await page.screenshot({ path: shot1Path, fullPage: false });
      console.log(`✅ Saved 6-photo sticky preview: ${shot1Path}`);

      // Click settings capsule to open bottom sheet
      console.log('📱 Opening settings bottom sheet...');
      const capsule = await page.$('div.lg\\:hidden.cursor-pointer');
      if (capsule) {
        await capsule.click();
        await new Promise(r => setTimeout(r, 500));
        const shot2Path = path.join(ARTIFACT_DIR, 'mobile_img2pdf_sheet.png');
        await page.screenshot({ path: shot2Path, fullPage: false });
        console.log(`✅ Saved mobile bottom sheet screenshot: ${shot2Path}`);
      }
    }

    // 2. Compress PDF
    console.log('📱 Navigating to http://localhost:4173/compress-pdf...');
    await page.goto('http://localhost:4173/compress-pdf', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    // Upload a small test pdf to view preset 2x2 grid
    // Create a 1-page dummy PDF
    const dummyPdf = path.join(TEMP_DIR, 'test.pdf');
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595.28, 841.89]);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(dummyPdf, pdfBytes);

    const pdfInput = await page.$('input[type="file"]');
    if (pdfInput) {
      await pdfInput.uploadFile(dummyPdf);
      await new Promise(r => setTimeout(r, 1500));

      const shot3Path = path.join(ARTIFACT_DIR, 'mobile_compress_grid.png');
      await page.screenshot({ path: shot3Path, fullPage: false });
      console.log(`✅ Saved mobile compress 2x2 grid screenshot: ${shot3Path}`);
    }

  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    await browser.close();
    preview.kill();
  }
}

main();
