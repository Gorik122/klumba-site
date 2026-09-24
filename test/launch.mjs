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
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
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
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openPage(browser, port, viewport) {
  const page = await browser.newPage({ viewport });
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
    assert.match(open.caption, /Представь, что ты/);
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
