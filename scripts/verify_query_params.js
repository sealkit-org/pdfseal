import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DUMMY_PDF = path.join(process.cwd(), 'temp_test_dummy.pdf');

async function ensureDummyPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([500, 500]);
  const bytes = await doc.save();
  fs.writeFileSync(DUMMY_PDF, bytes);
}

async function verifyAllParams() {
  await ensureDummyPdf();
  console.log('🔍 Testing query parameter reactivity with file upload on http://localhost:5173...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Test Compress ?target=2.0
  console.log('\n--- 1. Testing Compress ?target=2.0 ---');
  await page.goto('http://localhost:5173/compress-pdf?target=2.0', { waitUntil: 'networkidle2' });
  let fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(DUMMY_PDF);
  await new Promise(r => setTimeout(r, 1000));
  const compressCheck = await page.evaluate(() => {
    const numberInput = document.querySelector('input[type="number"]');
    return {
      targetSizeVal: numberInput ? numberInput.value : null
    };
  });
  console.log('Compress result:', compressCheck);

  // 2. Test Watermark ?text=CONFIDENTIAL&opacity=35&color=2563eb
  console.log('\n--- 2. Testing Watermark ?text=CONFIDENTIAL&opacity=35&color=2563eb ---');
  await page.goto('http://localhost:5173/watermark-pdf?text=CONFIDENTIAL&opacity=35&color=2563eb', { waitUntil: 'networkidle2' });
  fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(DUMMY_PDF);
  await new Promise(r => setTimeout(r, 1000));
  const watermarkCheck = await page.evaluate(() => {
    const textInput = document.querySelector('input[type="text"]');
    return {
      watermarkText: textInput ? textInput.value : null
    };
  });
  console.log('Watermark result:', watermarkCheck);

  // 3. Test Page Number ?start=5
  console.log('\n--- 3. Testing Page Number ?start=5 ---');
  await page.goto('http://localhost:5173/page-number?start=5', { waitUntil: 'networkidle2' });
  fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(DUMMY_PDF);
  await new Promise(r => setTimeout(r, 1000));
  const pageNumCheck = await page.evaluate(() => {
    const startInput = document.querySelector('input[type="number"]');
    return {
      startNumberVal: startInput ? startInput.value : null
    };
  });
  console.log('PageNumber result:', pageNumCheck);

  // 4. Test Split ?range=2-4
  console.log('\n--- 4. Testing Split ?range=2-4 ---');
  await page.goto('http://localhost:5173/split-pdf?range=2-4', { waitUntil: 'networkidle2' });
  fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(DUMMY_PDF);
  await new Promise(r => setTimeout(r, 1000));
  const splitCheck = await page.evaluate(() => {
    const rangeInput = document.querySelector('input[type="text"]');
    return {
      rangeValue: rangeInput ? rangeInput.value : null
    };
  });
  console.log('Split result:', splitCheck);

  await browser.close();
  try { fs.unlinkSync(DUMMY_PDF); } catch (e) {}
  console.log('\n✨ All parameter checks completed!');
}

verifyAllParams().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
