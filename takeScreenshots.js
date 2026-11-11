import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching Chrome with WebGL enabled...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=default'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  // Helper for scrolling to fraction
  async function scrollToProgress(p) {
    await page.evaluate((prog) => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      window.scrollTo(0, prog * maxScroll);
    }, p);
    await new Promise(r => setTimeout(r, 600));
  }

  // 1. Stage 0: Hero & Rocket on pad
  console.log('Capturing stage 1: Hero & Pad...');
  await scrollToProgress(0.0);
  await page.screenshot({ path: path.join(outDir, '01-hero-launchpad.png') });

  // 2. Stage 2: Liftoff
  console.log('Capturing stage 2: Liftoff...');
  await scrollToProgress(0.22);
  await page.screenshot({ path: path.join(outDir, '02-rocket-liftoff.png') });

  // 3. Stage 3: Fairing separation
  console.log('Capturing stage 3: Fairing separation...');
  await scrollToProgress(0.48);
  await page.screenshot({ path: path.join(outDir, '03-fairing-separation.png') });

  // 4. Stage 4: Lunar powered descent
  console.log('Capturing stage 4: Lunar powered descent...');
  await scrollToProgress(0.72);
  await page.screenshot({ path: path.join(outDir, '04-lunar-descent.png') });

  // 5. Stage 5: Touchdown
  console.log('Capturing stage 5: Touchdown...');
  await scrollToProgress(0.85);
  await page.screenshot({ path: path.join(outDir, '05-lunar-touchdown.png') });

  // 6. Stage 6: Sky-Dome Dashboard
  console.log('Capturing stage 6: Sky-Dome Dashboard...');
  await scrollToProgress(1.0);
  await page.screenshot({ path: path.join(outDir, '06-skydome-dashboard.png') });

  // 7. Timeline Tab
  console.log('Capturing Timeline Tab...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Timeline'));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '07-timeline-tab.png') });

  // 8. Compare Sites Tab
  console.log('Capturing Compare Sites Tab...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Compare Sites'));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '08-compare-sites-tab.png') });

  // 9. Analysis Tab
  console.log('Capturing Analysis Tab...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analysis'));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(outDir, '09-analysis-tab.png') });

  // 10. About Data Modal
  console.log('Capturing About Data Modal...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="About Data"]');
    (btn)?.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(outDir, '10-about-data-modal.png') });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch(console.error);
