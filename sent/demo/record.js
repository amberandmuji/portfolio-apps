const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const base = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/';
  const app = fs.readdirSync(base).find(f => f.endsWith('.app'));
  const macos = base + app + '/Contents/MacOS/';
  const browser = await chromium.launch({ executablePath: macos + fs.readdirSync(macos)[0] });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + process.cwd() + '/demo.html#manual');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames');
  const FPS = 30, N = 10 * FPS;
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    await page.screenshot({ path: `frames/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
  }
  await browser.close();
  console.log('frames', N);
})();
