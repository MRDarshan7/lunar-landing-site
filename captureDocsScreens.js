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

  async function scrollToProgress(p) {
    await page.evaluate((prog) => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      window.scrollTo(0, prog * maxScroll);
    }, p);
    // Allow Three.js smooth conductor lerp and render to settle
    await sleep(850);
  }

  // =========================================================================
  // 1. DESKTOP 1440x900 FULL SEQUENCE
  // =========================================================================
  console.log('\n--- 1. DESKTOP 1440x900 CHECKPOINTS ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/?debug=1', { waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(1500);

  const checkpoints1440 = [
    { p: 0.00, file: '01-p0.00-hero-1440x900.png', desc: 'Hero framing with full rocket nose to pad' },
    { p: 0.05, file: '02-p0.05-pad-venting-1440x900.png', desc: 'Launch pad boil-off venting' },
    { p: 0.10, file: '03-p0.10-liftoff-flash-1440x900.png', desc: 'Ignition flash, clamps released, liftoff' },
    { p: 0.25, file: '04-p0.25-ascent-1440x900.png', desc: 'Atmospheric ascent, plume, clouds recede' },
    { p: 0.40, file: '05-p0.40-booster-sep-1440x900.png', desc: 'Booster MECO & tumbling stage separation' },
    { p: 0.45, file: '06-p0.45-fairing-sep-start-1440x900.png', desc: 'Fairing separation start' },
    { p: 0.50, file: '07-p0.50-fairing-reveal-1440x900.png', desc: 'Fairing jettison, stowed gold lander revealed' },
    { p: 0.52, file: '08-p0.52-ascent-end-1440x900.png', desc: 'End of ascent climb (smooth continuous transition)' },
    { p: 0.55, file: '09-p0.55-lander-release-1440x900.png', desc: 'Upper stage separation, lander released' },
    { p: 0.58, file: '10-p0.58-lander-deploy-1440x900.png', desc: 'Lander deployment, upper stage receded behind camera' },
    { p: 0.65, file: '11-p0.65-translunar-cruise-1440x900.png', desc: 'Translunar cruise, approaching Moon visible ahead' },
    { p: 0.70, file: '12-p0.70-descent-flip-1440x900.png', desc: 'Powered descent retro-flip about CM' },
    { p: 0.78, file: '13-p0.78-deceleration-burn-1440x900.png', desc: 'Deceleration burn, lunar terrain rising' },
    { p: 0.83, file: '14-p0.83-touchdown-dust-1440x900.png', desc: 'Touchdown, ballistic dust, leg compression' },
    { p: 0.90, file: '15-p0.90-dome-morph-1440x900.png', desc: 'Zoom-out morph to sky-dome around centered lander' },
    { p: 1.00, file: '16-p1.00-skydome-dashboard-1440x900.png', desc: 'Interactive Sky-Dome Dashboard' }
  ];

  for (const cp of checkpoints1440) {
    console.log(`Capturing 1440x900 p = ${cp.p.toFixed(2)} (${cp.desc})...`);
    await scrollToProgress(cp.p);
    await page.screenshot({ path: path.join(outDir, cp.file) });
  }

  // =========================================================================
  // 2. REVERSE SCROLL SWEEP
  // =========================================================================
  console.log('\n--- 2. REVERSE SCROLL SWEEP ---');
  console.log('Scrubbing back from p = 1.00 down to p = 0.45...');
  await scrollToProgress(0.45);
  await page.screenshot({ path: path.join(outDir, '17-reverse-scrub-p0.45-1440x900.png') });

  // =========================================================================
  // 3. DESKTOP 1920x1080 HERO FRAMING
  // =========================================================================
  console.log('\n--- 3. 1920x1080 HERO FRAMING ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await scrollToProgress(0.00);
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, '18-hero-1920x1080-p0.00.png') });

  // =========================================================================
  // 4. MOBILE PORTRAIT 390x844 (HERO & DASHBOARD)
  // =========================================================================
  console.log('\n--- 4. MOBILE PORTRAIT 390x844 ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await scrollToProgress(0.00);
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, '19-mobile-hero-390x844-p0.00.png') });

  await scrollToProgress(1.00);
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, '20-mobile-dashboard-390x844-p1.00.png') });

  // =========================================================================
  // 5. DASHBOARD TABS & DATA MODAL (1440x900)
  // =========================================================================
  console.log('\n--- 5. DASHBOARD TABS & MODAL ---');
  await page.setViewport({ width: 1440, height: 900 });
  await scrollToProgress(1.00);
  await sleep(800);

  // Timeline Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Timeline'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '21-dashboard-timeline-tab.png') });

  // Compare Sites Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Compare Sites'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '22-dashboard-compare-sites-tab.png') });

  // Analysis Tab
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Analysis'));
    btn?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '23-dashboard-analysis-tab.png') });

  // About Data Modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="About Data"]');
    (btn)?.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(outDir, '24-dashboard-about-data-modal.png') });

  await browser.close();
  console.log('\nAll 24 verification screenshots captured successfully into docs/screens!');
}

run().catch((err) => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
