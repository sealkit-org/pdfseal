import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testPageNumberFix() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 1920, height: 1080, name: '1080p' },
    { width: 1536, height: 864, name: '864p (1080p 125%)' },
    { width: 1440, height: 900, name: '900p' },
    { width: 1366, height: 768, name: '768p' },
    { width: 1280, height: 720, name: '720p' }
  ];

  const page = await browser.newPage();

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/page-number', { waitUntil: 'networkidle2' });

    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('d:/project/open/pdfseal/temp_e2e_test/test_10p.pdf');
    await new Promise(r => setTimeout(r, 600));

    // Apply Candidate Fix via DOM
    await page.evaluate(() => {
      const section = document.querySelector('main > section');
      if (section) section.classList.add('min-h-0');

      const card = document.querySelector('.bg-white.rounded-3xl');
      if (card) {
        card.classList.add('min-h-0');
        card.classList.remove('p-5', 'sm:p-7');
        card.classList.add('p-4', 'sm:p-5');
      }

      const grid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-12');
      if (grid) {
        grid.style.maxHeight = 'calc(100vh - 310px)';
      }

      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.maxHeight = 'calc(100vh - 400px)';
      }
    });

    await new Promise(r => setTimeout(r, 200));

    const after = await page.evaluate(() => ({
      windowH: window.innerHeight,
      docH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollHeight - window.innerHeight,
      hasScrollbar: document.documentElement.scrollHeight > window.innerHeight
    }));

    console.log(`PageNumber [${vp.name}]: Overflow = ${after.hasScrollbar ? '❌ +' + after.overflow + 'px' : '✅ 0px (PERFECT NO SCROLL)'}`);
  }

  await browser.close();
}

testPageNumberFix().catch(console.error);
