import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testAllTools() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const tools = [
    { route: '/watermark-pdf', name: 'Watermark' },
    { route: '/page-number', name: 'Page Number' },
    { route: '/sanitize-pdf', name: 'Sanitize' },
    { route: '/protect-pdf', name: 'Protect' },
    { route: '/unlock-pdf', name: 'Unlock' },
    { route: '/sign-pdf', name: 'Sign' },
    { route: '/compress-pdf', name: 'Compress' }
  ];

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const t of tools) {
    await page.goto(`http://localhost:5173${t.route}`, { waitUntil: 'networkidle2' });
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile('d:/project/open/pdfseal/temp_e2e_test/test_10p.pdf');
      await new Promise(r => setTimeout(r, 1000));
    }
    const res = await page.evaluate(() => ({
      windowHeight: window.innerHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollHeight - window.innerHeight
    }));
    console.log(`${t.name.padEnd(15)}: Overflow = ${res.overflow > 0 ? '❌ +' + res.overflow + 'px' : '✅ 0px (No Scrollbar)'}`);
  }

  await browser.close();
}

testAllTools().catch(console.error);
