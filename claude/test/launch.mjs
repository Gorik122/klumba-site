// Смоук-тест сайта «Клумба»: страница грузится без ошибок, сцена рисуется,
// сорняки получают ярлыки, корни — таблички «программа», в финале клумба оживает.
// Запуск: npm test   (Chrome берётся из CHROME_PATH или стандартного места на macOS)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(os.tmpdir(), 'klumba-shots');
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
};

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

function readConfig() {
  const src = fs.readFileSync(path.join(root, 'garden.js'), 'utf8');
  const phrases = [...src.matchAll(/phrase:\s*'([^']+)'/g)].map((m) => m[1]);
  const roots = [...src.matchAll(/root:\s*'([^']+)'/g)].map((m) => m[1]);
  return { phrases, roots };
}

test('в конфиге 6 сорняков и 6 корней-программ', () => {
  const { phrases, roots } = readConfig();
  assert.equal(phrases.length, 6);
  assert.equal(roots.length, 6);
});

test('история прокручивается от цветущей клумбы до финала', { skip: !chrome && 'нет Chrome: задайте CHROME_PATH' }, async () => {
  fs.mkdirSync(shots, { recursive: true });
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath: chrome });
  const errors = [];
  try {
    for (const vp of [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'phone' }]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      page.on('pageerror', (e) => errors.push(`${vp.name}: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`${vp.name}: ${m.text()}`); });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => window.klumba && window.klumba.TOTAL > 0);
      const TL = await page.evaluate(() => window.klumba.TL);
      const go = async (U, shot) => {
        await page.evaluate((U) => { window.klumba.time(5); window.klumba.go(U); }, U);
        await page.waitForTimeout(350);
        if (shot) await page.screenshot({ path: path.join(shots, `${vp.name}-${shot}.png`) });
      };

      // 1. Старт: холст нарисован (не пустой) и виден заголовок
      await go(0, '1-bloom');
      const painted = await page.evaluate(() => {
        const c = document.getElementById('scene');
        const d = c.getContext('2d').getImageData(0, Math.floor(c.height * 0.6), c.width, 4).data;
        const set = new Set();
        for (let i = 0; i < d.length; i += 64) set.add(d[i] >> 4 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4) << 8);
        return set.size;
      });
      assert.ok(painted > 8, `холст выглядит пустым (${painted} цветов)`);
      assert.match(await page.locator('.beat h1').innerText(), /клумба/i);

      // 2. После роста всех сорняков — 6 ярлыков с фразами
      await go(TL.gloom.a + 0.5, '2-weeds');
      const tags = await page.$$eval('.tag', (els) => els.map((e) => ({ text: e.textContent.trim(), op: +getComputedStyle(e).opacity })));
      assert.equal(tags.length, 6);
      assert.ok(tags.every((t) => t.op > 0.2), 'все ярлыки видны');

      // 3. Прополка: табличка «программа» на корне
      await go(TL.pull0.a + 1.5, '3-pull');
      const card = await page.$eval('#rootcard', (e) => ({ text: e.textContent, op: +getComputedStyle(e).opacity }));
      assert.ok(card.op > 0.5, 'табличка на корне видна');
      assert.match(card.text, /программа/i);

      // 4. Финал: клумба снова цветёт
      await go(TL.revival.a + 1.2, '4-revived');
      const final = await page.$$eval('.beat', (els) => els.filter((e) => +getComputedStyle(e).opacity > 0.5).map((e) => e.textContent));
      assert.ok(final.some((t) => /снова/i.test(t)), 'виден текст финала');

      // 5. Кнопка записи в финальном блоке
      assert.ok(await page.locator('#zapis .btn').isVisible());
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  assert.deepEqual(errors, [], errors.join('\n'));
  console.log('Скриншоты:', shots);
});
