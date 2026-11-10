import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('docs', 'screens');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  console.log('Navigating to http://localhost:5173/?debug=1 ...');
  await page.goto('http://localhost:5173/?debug=1', { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(1500);

  async function scrollToProgress(p) {
    await page.evaluate((prog) => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      window.scrollTo(0, prog * maxScroll);
    }, p);
    // Allow Three.js smooth conductor lerp and render to settle
    await sleep(800);
  }

  const checkpoints = [
    { p: 0.00, file: '01-p0.00-hero.png', desc: 'Hero & Pad' },
    { p: 0.10, file: '02-p0.10-liftoff.png', desc: 'Ignition & Liftoff' },
    { p: 0.25, file: '03-p0.25-ascent.png', desc: 'Atmospheric Ascent' },
    { p: 0.40, file: '04-p0.40-booster-meco-sep.png', desc: 'Booster MECO & Separation' },
    { p: 0.50, file: '05-p0.50-fairing-jettison.png', desc: 'Fairing Jettison (Lander Revealed)' },
    { p: 0.58, file: '06-p0.58-lander-release.png', desc: 'Lander Release & Deployment' },
    { p: 0.70, file: '07-p0.70-moon-approach.png', desc: 'Moon Approach' },
    { p: 0.78, file: '08-p0.78-powered-descent.png', desc: 'Powered Descent Retro-Burn' },
    { p: 0.83, file: '09-p0.83-touchdown-dust.png', desc: 'Touchdown with Dust Billow' },
    { p: 0.90, file: '10-p0.90-zoomout-morph.png', desc: 'Zoom-out Dome Morph' },
    { p: 1.00, file: '11-p1.00-skydome-dashboard.png', desc: 'Sky-Dome Dashboard' }
  ];

  console.log('--- FORWARD SCROLL SWEEP ---');
  for (const cp of checkpoints) {
    console.log(`Capturing p = ${cp.p.toFixed(2)} (${cp.desc})...`);
    await scrollToProgress(cp.p);
    await page.screenshot({ path: path.join(outDir, cp.file) });
  }

  console.log('--- REVERSE SCROLL SWEEP ---');
  console.log('Scrubbing back to p = 0.45...');
  await scrollToProgress(0.45);
  await page.screenshot({ path: path.join(outDir, '12-reverse-scrub-p0.45.png') });

  console.log('--- TAB SCREENSHOTS ---');
  // Scroll to dashboard
  await scrollToProgress(1.0);

  // Timeline Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Timeline'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '13-timeline-tab.png') });

  // Compare Sites Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Compare Sites'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '14-compare-sites-tab.png') });

  // Analysis Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analysis'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '15-analysis-tab.png') });

  // About Data Modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="About Data"]');
    (btn)?.click();
  });
  await sleep(500);
  await page.screenshot({ path: path.join(outDir, '16-about-data-modal.png') });

  await browser.close();
  console.log('All screenshots captured successfully into docs/screens!');
}

run().catch((err) => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
