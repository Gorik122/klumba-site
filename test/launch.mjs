import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PHRASES = [
  "Не высовывайся",
  "Тебе нельзя быть такой",
  "Кем ты себя возомнила?",
  "Что люди подумают?",
  "Будь удобной",
  "У тебя не получится"
];

const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

function startServer() {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mp3": "audio/mpeg" };
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Content-Length": body.length });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openPage(browser, port, viewport) {
  const page = await browser.newPage({ viewport });
  // музыка в проверках не нужна: headless-браузер разрешает звук без касания
  await page.addInitScript(() => { try { localStorage.setItem("klumba-sound", "0"); } catch (e) {} });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__klumba);
  return { page, errors };
}

async function at(page, p) {
  await page.evaluate((v) => window.__klumba.seek(v), p);
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const visible = (sel) => [...document.querySelectorAll(sel)]
      .filter((el) => Number(getComputedStyle(el).opacity) > 0.5)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent, left: r.left, right: r.right };
      });
    return {
      caption: document.getElementById("caption").textContent,
      hint: Number(getComputedStyle(document.getElementById("hint")).opacity),
      girl: Number(document.getElementById("gRoot").getAttribute("opacity")),
      weeds: visible(".tag--weed"),
      roots: visible(".tag--root"),
      truths: visible(".tag--truth"),
      flowers: document.querySelectorAll("#dots li.is-flower").length,
      width: innerWidth
    };
  });
}

test("classic script and relative urls only", () => {
  const html = read("index.html");
  const js = read("garden.js");
  assert.match(html, /<script src="garden\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/);
  assert.doesNotMatch(js, /(^|\n)\s*(import|export)\s/);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (url.startsWith("data:") || url.startsWith("#")) continue;
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(url)) continue;
    assert.ok(!/^[a-z]+:|^\/\//i.test(url), `external url: ${url}`);
  }
});

test("the garden story plays from bloom to weeds to roots and back", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const { page, errors } = await openPage(browser, server.address().port, { width: 1440, height: 900 });

    const open = await at(page, 0);
    assert.match(open.caption, /Представь, что твоя жизнь/);
    assert.ok(open.hint > 0.5, "scroll hint visible");
    assert.equal(open.weeds.length, 0, "no weeds yet");

    const weedy = await at(page, 0.34);
    assert.ok(PHRASES.some((ph) => weedy.caption.includes(ph)), weedy.caption);
    assert.ok(weedy.weeds.length >= 5, `weeds visible: ${weedy.weeds.length}`);
    for (const w of weedy.weeds) assert.ok(PHRASES.some((ph) => w.text.includes(ph)), w.text);
    assert.equal(weedy.roots.length, 0, "roots stay hidden until the gardener digs");

    const gardener = await at(page, 0.43);
    assert.match(gardener.caption, /И тогда приходит она/);
    assert.ok(gardener.girl > 0.9, `gardener opacity ${gardener.girl}`);

    const roots = await at(page, 0.513);
    assert.match(roots.caption, /опускает руки в/);
    assert.ok(roots.roots.length >= 5, `root labels: ${roots.roots.length}`);
    for (const r of roots.roots) assert.match(r.text, /программа/);

    const pulled = await at(page, 0.572);
    assert.match(pulled.caption, /выдернут/);
    assert.ok(pulled.flowers >= 1);

    const end = await at(page, 0.97);
    assert.match(end.caption, /Это снова твой сад/);
    assert.equal(end.flowers, 6, "all six weeds replaced by flowers");
    assert.equal(end.truths.length, 6, "six new beliefs on the flowers");
    assert.equal(end.weeds.length, 0);
    assert.equal(end.roots.length, 0);

    assert.equal(await page.locator("#map li").count(), 6);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test("a bridge explains where the weeds come from", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const { page, errors } = await openPage(browser, server.address().port, { width: 1280, height: 800 });
    const caption = () => page.evaluate(() => document.getElementById("caption").textContent);
    const weedTags = () => page.evaluate(() => [...document.querySelectorAll(".tag--weed")].filter((el) => Number(getComputedStyle(el).opacity) > 0.3).length);
    const until = (re) => page.waitForFunction((src) => new RegExp(src).test(document.getElementById("caption").textContent), re.source, { timeout: 8000 });

    await page.evaluate(() => window.__klumba.seek(0.02));
    await until(/Представь, что твоя жизнь/);

    // сначала «всё красиво» — сорняков нет
    await page.evaluate(() => window.__klumba.seekBridge(0.2));
    await until(/Вот твоя жизнь/);
    assert.equal(await weedTags(), 0, "no weeds while life is still fine");
    assert.ok((await page.evaluate(() => window.__klumba.bridge)) >= 0);

    // потом «включается программа» — слова из детства падают в землю, сорняков всё ещё нет
    await page.evaluate(() => window.__klumba.seekBridge(0.8));
    await until(/включается программа/);
    assert.match(await caption(), /слова из\s*детства/);
    assert.equal(await weedTags(), 0, "weeds sprout only after the words fall");

    // и только потом — первый сорняк
    await page.evaluate(() => window.__klumba.seek(0.075));
    await until(/Не высовывайся/);
    assert.equal(await page.evaluate(() => window.__klumba.bridge), -1, "bridge is over");

    // вверх по странице всё возвращается в том же порядке
    await page.evaluate(() => window.__klumba.seekBridge(0.3));
    await until(/Вот твоя жизнь/);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test("labels stay on screen on a phone", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const { page, errors } = await openPage(browser, server.address().port, { width: 390, height: 844 });
    for (const p of [0.3, 0.43, 0.51, 0.6, 0.75, 0.97]) {
      const s = await at(page, p);
      for (const t of [...s.weeds, ...s.roots, ...s.truths]) {
        assert.ok(t.left >= 0 && t.right <= s.width, `p=${p} "${t.text}" ${t.left}..${t.right}`);
      }
    }
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});

test("the story is a game: welcome flower, one step at a time, level window, pulling roots", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const { page, errors } = await openPage(browser, server.address().port, { width: 390, height: 844 });
    const caption = () => page.evaluate(() => document.getElementById("caption").textContent);
    const step = () => page.evaluate(() => window.__klumbaGame.step);
    const until = (id) => page.waitForFunction((s) => window.__klumbaGame.ready && window.__klumbaGame.step === s, id, { timeout: 9000 });
    const hold = async (ms) => {
      const b = await page.locator(".gm-hold").boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
    };

    // приветствие: розовый экран, цветок «нажми на меня», страница сама не листается
    assert.ok(await page.locator("#gmWelcome").isVisible());
    assert.match(await page.locator("#gmStart").textContent(), /нажми на/);
    assert.match(await page.locator(".gm-lead").textContent(), /метафоры/);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => scrollY), 0, "no scrolling past the welcome");

    // нажали на цветок — «Представь, что твоя жизнь — клумба»; один свайп — открывается клумба
    const flower = await page.locator("#gmStart").boundingBox(); // цветок «дышит» без остановки — жмём в центр, как пальцем
    await page.mouse.click(flower.x + flower.width / 2, flower.y + flower.height / 2);
    await page.waitForTimeout(1500);
    assert.match(await page.locator("#gmIntro").textContent(), /Представь, что твоя жизнь/);
    await page.keyboard.press("ArrowDown");
    await until("life");
    assert.match(await caption(), /Вот твоя жизнь/);
    await page.waitForSelector("#gmWelcome", { state: "detached", timeout: 3000 });

    // колесо / свайп — ровно один абзац
    await page.mouse.wheel(0, 120);
    await until("seeds");
    assert.match(await caption(), /включается программа/);

    // чужие фразы: дальше — только ответив «Тебе так говорили?»
    await page.keyboard.press("ArrowDown");
    await until("w0");
    assert.match(await caption(), /Не высовывайся/);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(700);
    assert.equal(await step(), "w0", "an unanswered phrase holds the story");
    for (let i = 0; i < PHRASES.length; i++) {
      await until("w" + i);
      assert.ok((await caption()).includes(PHRASES[i]));
      await page.locator(`.gm-bar [data-a="${i % 2 ? 0 : 1}"]`).click();
    }

    // клумба задыхается — первая заметка «можно написать Надежде»
    await until("choke");
    assert.match(await page.locator(".gm-bar .gm-note").textContent(), /ни к чему не обязывает/);
    assert.match(await page.locator(".gm-bar .gm-note__a").getAttribute("href"), /^https:\/\/t\.me\//);
    assert.match(await page.locator(".gm-bar").textContent(), /3 из\s6/);

    // посередине — окно нового уровня
    await page.keyboard.press("ArrowDown");
    await page.waitForSelector(".gm-pop.is-in");
    assert.match(await page.locator(".gm-pop").textContent(), /новый уровень[\s\S]*противник — это\sты/);
    assert.match(await page.locator(".gm-pop").textContent(), /Не высовывайся/, "the example uses her own weed");
    await page.locator(".gm-pop__go").click();
    await until("girl");
    assert.match(await caption(), /И тогда приходит она/);

    await page.keyboard.press("ArrowDown");
    await until("dig");
    await page.locator('.gm-bar [data-next]').click();
    await until("roots");
    const rootsShown = await visibleRoots(page);
    assert.ok(rootsShown >= 2, `roots revealed: ${rootsShown}`); // на телефоне налезающие таблички прячутся

    // корень: отпустила рано — он уходит обратно; дотянула — на его месте цветок
    await page.keyboard.press("ArrowDown");
    await until("pull0");
    await hold(350);
    await page.waitForTimeout(900);
    assert.equal(await step(), "pull0");
    assert.match(await caption(), /корень 01/);
    for (let k = 0; k < 6; k++) {
      await until("pull" + k);
      await hold(1900);
      await until("bloom" + k);
      assert.match(await caption(), /выдернут/);
      if (k < 5) await page.keyboard.press("ArrowDown");
    }
    assert.equal(await page.locator("#dots li.is-flower").count(), 6);

    await page.keyboard.press("ArrowDown");
    await until("fin");
    assert.match(await caption(), /Это снова твой сад/);

    // конец игры: страница снова листается, дальше — блоки под историей
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => !window.__klumbaGame.on);
    assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains("is-game"))));
    await page.waitForFunction(() => Math.abs(document.getElementById("outro").getBoundingClientRect().top) < 40, null, { timeout: 6000 });
    assert.equal(await page.locator(".gm-note--page").count(), 1, "second note under the roots map");

    // фразы, на которые она ответила «да», уже растут в «Моей клумбе»
    await page.locator("#mybed").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll(".phrase.is-on").length === 3, null, { timeout: 6000 });
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});

function visibleRoots(page) {
  return page.evaluate(() => [...document.querySelectorAll(".tag--root")].filter((el) => Number(getComputedStyle(el).opacity) > 0.5).length);
}

test("music steps back while Nadezhda's voice message plays", async () => {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { try { localStorage.setItem("klumba-sound", "1"); } catch (e) {} });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "load" });
    // первое касание — «сразу к Надежде» на приветствии: музыка включается, игра пропускается
    await page.locator("#gmSkip").click();
    await page.waitForFunction(() => window.KlumbaMusic && window.KlumbaMusic.songPlaying, null, { timeout: 8000 });
    const level = () => page.evaluate(() => window.KlumbaMusic.duckLevel);
    assert.ok((await level()) > 0.95, "music at full level before the voice");

    await page.locator("#gVoice").scrollIntoViewIfNeeded();
    await page.locator("#gVoice").click();
    await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => window.KlumbaMusic.ducked), "voice ducks the music");
    assert.ok((await level()) < 0.25, `song level under the voice: ${await level()}`);

    await page.locator("#gVoice").click(); // пауза
    await page.waitForTimeout(3000);
    assert.equal(await page.evaluate(() => window.KlumbaMusic.ducked), false);
    assert.ok((await level()) > 0.9, `music back after the voice: ${await level()}`);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
});
