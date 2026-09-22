import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = process.env.SCRATCH
  || "/var/folders/rz/h_0z9kwx0tncqbk1kvjf15hm0000gn/T/grok-goal-f3cb7c1437f5/implementer";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BASELINE = new Set([
  "bed-alive.png",
  "bed.jpg",
  "gardener.jpg",
  "gardener.png",
  "girl-portrait.jpg",
  "girl-spray.jpg",
  "girl-water.jpg",
  "root.jpg"
]);

const WEEDS = [
  "«Не высовывайся»",
  "«Много хочешь»",
  "«Надо заслужить»",
  "«Будь удобной»",
  "«Что подумают»",
  "«Тебе нельзя»"
];

const SAMPLES = [
  { id: "open", p: 0.02, shot: "beat-open.png", beat: "living", text: "Ваша жизнь подобна этой клумбе.", hint: true },
  { id: "weed", p: 0.32, shot: "beat-weed.png", beat: "choked", weed: true },
  { id: "pull", p: 0.58, shot: "beat-pull.png", beat: "pull", text: "Она выдёргивает сорняк" },
  { id: "alive", p: 0.96, shot: "beat-alive.png", beat: "revived", text: "Клумба ожила." }
];

const REQUIRED_STILLS = ["living.jpg", "choked.jpg", "pull.jpg", "revived.jpg"];

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function contentType(file) {
  const ext = path.extname(file);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const type = contentType(file);
      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (!match) {
          res.writeHead(416);
          res.end();
          return;
        }
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : stat.size - 1;
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": "no-store"
        });
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function lineOf(html, needle) {
  const lines = html.split(/\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  return index + 1;
}

function inventory() {
  const html = read("index.html");
  const files = [
    "assets/film/living.jpg",
    "assets/film/choked.jpg",
    "assets/film/pull.jpg",
    "assets/film/pull-close.jpg",
    "assets/film/revived.jpg",
    "assets/film/breath-poster.jpg",
    "assets/film/breath.mp4"
  ];
  const rows = [];
  const stills = [];
  const videos = [];
  for (const rel of files) {
    const abs = path.join(root, rel);
    const name = path.basename(rel);
    const line = lineOf(html, rel);
    assert.ok(line > 0, `${rel} is not referenced by index.html`);
    assert.ok(!BASELINE.has(name), `${name} is a baseline file`);
    if (rel.endsWith(".mp4")) {
      const probe = JSON.parse(execFileSync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration:stream=codec_type,codec_name,width,height",
        "-of", "json",
        abs
      ], { encoding: "utf8" }));
      const stream = (probe.streams || []).find((item) => item.codec_type === "video");
      const duration = Number(probe.format.duration);
      assert.ok(stream, `${name} has no video stream`);
      assert.ok(duration >= 2, `${name} duration ${duration}`);
      videos.push(name);
      rows.push(`${name}  video ${stream.codec_name} ${stream.width}x${stream.height}  duration=${duration.toFixed(3)}s  index.html:${line}`);
    } else {
      const info = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", abs], { encoding: "utf8" });
      const width = Number(/pixelWidth: (\d+)/.exec(info)[1]);
      const height = Number(/pixelHeight: (\d+)/.exec(info)[1]);
      const long = Math.max(width, height);
      assert.ok(long >= 720, `${name} long edge ${long}`);
      stills.push(name);
      rows.push(`${name}  ${width}x${height}  long=${long}  index.html:${line}`);
    }
  }
  assert.ok(stills.length >= 4, `only ${stills.length} stills`);
  assert.ok(videos.length >= 1, "no video");
  for (const name of REQUIRED_STILLS) assert.ok(stills.includes(name), name);
  const text = rows.join("\n") + "\n";
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(path.join(scratch, "media.txt"), text);
  return text;
}

function loadScriptsLikeBrowser() {
  const js = read("garden.js");
  const html = read("index.html");
  const problems = [];
  if (/\brequire\s*\(/.test(js)) problems.push("garden.js uses require");
  if (/\bmodule\.exports\b/.test(js)) problems.push("garden.js uses module.exports");
  if (/(^|\n)\s*import\s/.test(js)) problems.push("garden.js uses import");
  if (/(^|\n)\s*export\s/.test(js)) problems.push("garden.js uses export");
  if (/type=["']module["']/.test(html)) problems.push("index.html uses a module script");
  if (!/<script src="garden\.js"><\/script>/.test(html)) problems.push("missing classic script src");
  const urls = [...html.matchAll(/(?:src|href|poster)="([^"]+)"/g)].map((match) => match[1]);
  for (const url of urls) {
    if (url.startsWith("data:") || url.startsWith("#")) continue;
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(url)) continue;
    if (/^[a-z]+:/i.test(url) || url.startsWith("//") || url.startsWith("/")) {
      problems.push(`not a relative url: ${url}`);
    }
  }

  const byId = {};
  function makeEl(tag) {
    return {
      tagName: String(tag || "div").toUpperCase(),
      id: "",
      className: "",
      dataset: {},
      style: {},
      children: [],
      innerHTML: "",
      textContent: "",
      muted: false,
      defaultMuted: false,
      playsInline: false,
      paused: true,
      currentTime: 0,
      videoWidth: 1280,
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild(child) { this.children.push(child); return child; },
      setAttribute() {},
      addEventListener() {},
      querySelector() { return makeEl("div"); },
      querySelectorAll() { return []; },
      getBoundingClientRect() {
        return { top: 0, left: 0, right: 1280, bottom: 800, width: 1280, height: 9600 };
      },
      getContext() {
        return {
          setTransform() {},
          clearRect() {},
          save() {},
          restore() {},
          translate() {},
          rotate() {},
          beginPath() {},
          ellipse() {},
          fill() {},
          fillStyle: "",
          globalAlpha: 1
        };
      },
      play() { this.paused = false; return Promise.resolve(); },
      pause() { this.paused = true; },
      reset() {}
    };
  }
  function register(id, tag) {
    const node = makeEl(tag);
    node.id = id;
    byId[id] = node;
    return node;
  }
  ["weeds", "track", "stage", "caption", "toast", "hint", "bar", "noteForm", "thanks"].forEach((id) => register(id));
  register("life", "canvas");
  const heroes = ["living", "breath", "choked", "pull", "pull-close", "revived"].map((id) => {
    const node = makeEl(id === "breath" ? "video" : "img");
    node.dataset.beat = id;
    return node;
  });

  const document = {
    getElementById(id) {
      if (!byId[id]) byId[id] = makeEl("div");
      return byId[id];
    },
    createElement(tag) {
      const node = makeEl(tag);
      let current = "";
      Object.defineProperty(node, "id", {
        configurable: true,
        get() { return current; },
        set(value) {
          current = String(value);
          byId[current] = node;
        }
      });
      return node;
    },
    querySelectorAll(sel) {
      return sel === ".hero" ? heroes : [];
    }
  };

  let frames = 0;
  const context = {
    window: {},
    document,
    history: { scrollRestoration: "auto" },
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    matchMedia() { return { matches: false }; },
    addEventListener() {},
    requestAnimationFrame(fn) {
      if (frames >= 2) return 0;
      frames += 1;
      fn(0);
      return frames;
    },
    performance: { now: () => 0 },
    console
  };
  context.window = context;

  let error = null;
  try {
    vm.runInContext(js, vm.createContext(context));
  } catch (err) {
    error = err;
    problems.push(`evaluate threw: ${err && err.stack ? err.stack : err}`);
  }
  const report = [
    `classic script: ${problems.length === 0}`,
    `frames exercised: ${frames}`,
    `window defined: ${typeof context.window === "object"}`,
    problems.length ? `problems:\n${problems.join("\n")}` : "problems: none",
    error ? "" : "evaluated without throwing"
  ].filter(Boolean).join("\n") + "\n";
  fs.writeFileSync(path.join(scratch, "script-load.txt"), report);
  assert.deepEqual(problems, []);
}

async function scrollTo(page, p) {
  await page.evaluate(async (progress) => {
    const track = document.getElementById("track");
    const max = track.getBoundingClientRect().height - innerHeight;
    window.scrollTo(0, max * progress);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, p);
}

async function dominant(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll("img, video")];
    let best = null;
    for (const node of nodes) {
      const cs = getComputedStyle(node);
      const opacity = parseFloat(cs.opacity);
      if (!(opacity > 0.5)) continue;
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const rect = node.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area < 4) continue;
      const visibleW = Math.min(rect.right, innerWidth) - Math.max(rect.left, 0);
      const visibleH = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
      if (visibleW <= 0 || visibleH <= 0) continue;
      if (!best || area > best.area + 0.5 || (Math.abs(area - best.area) <= 0.5 && opacity > best.opacity)) {
        const src = node.currentSrc || node.src || "";
        best = {
          tag: node.tagName,
          file: src.split("/").pop().split("?")[0],
          src,
          beat: node.dataset.beat || "",
          opacity,
          area,
          ratio: area / (innerWidth * innerHeight),
          width: rect.width,
          height: rect.height,
          naturalWidth: node.naturalWidth || node.videoWidth || 0,
          naturalHeight: node.naturalHeight || node.videoHeight || 0
        };
      }
    }
    return best;
  });
}

async function captionState(page) {
  return page.evaluate(() => {
    const caption = document.getElementById("caption");
    const hint = document.getElementById("hint");
    const rect = caption.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + Math.min(36, rect.height / 2);
    const hit = document.elementFromPoint(x, y);
    const hintRect = hint.getBoundingClientRect();
    return {
      text: caption.innerText,
      width: rect.width,
      height: rect.height,
      covered: !(hit === caption || caption.contains(hit)),
      hint: hint.innerText,
      hintOpacity: parseFloat(getComputedStyle(hint).opacity),
      hintBox: hintRect.width * hintRect.height
    };
  });
}

async function colorOf(page, beat) {
  return page.evaluate(async (id) => {
    const img = document.querySelector(`img.hero[data-beat="${id}"]`);
    if (!img) return null;
    if (!img.complete) await img.decode();
    const w = 48;
    const h = 27;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let lilac = 0;
    let pink = 0;
    let sat = 0;
    const n = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sat += max === 0 ? 0 : (max - min) / max;
      if (b > r - 15 && b > g && r > g - 20 && b > 90 && r > 80) lilac += 1;
      if (r > 150 && r > g + 12 && b > 70 && b < 230 && g < 210) pink += 1;
    }
    return {
      beat: id,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      lilac: lilac / n,
      pink: pink / n,
      sat: sat / n
    };
  }, beat);
}

async function runOnce(page, { shots }) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(page.__start, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll("img.hero")];
    return imgs.length >= 4 && imgs.every((img) => img.complete && img.naturalWidth >= 720);
  });

  const colors = {};
  for (const beat of ["living", "choked", "pull", "pull-close", "revived"]) {
    colors[beat] = await colorOf(page, beat);
  }

  const samples = [];
  for (const sample of SAMPLES) {
    await scrollTo(page, sample.p);
    await page.waitForFunction((beat) => {
      const node = document.querySelector(`.hero[data-beat="${beat}"]`);
      return node && parseFloat(getComputedStyle(node).opacity) > 0.8;
    }, sample.beat);
    const hero = await dominant(page);
    const cap = await captionState(page);
    if (shots) await page.screenshot({ path: path.join(scratch, sample.shot) });
    samples.push({ id: sample.id, hero, cap });
  }

  await scrollTo(page, 0.15);
  await page.mouse.click(200, 700);
  await page.waitForFunction(() => {
    const video = document.querySelector("video.hero");
    const opacity = parseFloat(getComputedStyle(video).opacity);
    return video && video.videoWidth > 0 && opacity > 0.5 && video.currentTime > 0.05;
  }, null, { timeout: 10000 });
  const videoBefore = await page.evaluate(() => {
    const video = document.querySelector("video.hero");
    return {
      currentTime: video.currentTime,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      opacity: parseFloat(getComputedStyle(video).opacity),
      paused: video.paused,
      file: (video.currentSrc || "").split("/").pop()
    };
  });
  await page.waitForTimeout(700);
  const videoAfter = await page.evaluate(() => {
    const video = document.querySelector("video.hero");
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 36;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, 64, 36);
    const data = ctx.getImageData(0, 0, 64, 36).data;
    let sum = 0;
    let sum2 = 0;
    let pink = 0;
    let lilac = 0;
    const n = 64 * 36;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const y = (r + g + b) / 3;
      sum += y;
      sum2 += y * y;
      if (r > 150 && r > g + 12 && b > 70) pink += 1;
      if (b > r - 15 && b > g && r > g - 20 && b > 90 && r > 80) lilac += 1;
    }
    const mean = sum / n;
    return {
      currentTime: video.currentTime,
      variance: sum2 / n - mean * mean,
      pink: pink / n,
      lilac: lilac / n
    };
  });

  const sweep = [];
  const seen = new Set();
  for (let step = 0; step <= 50; step += 1) {
    const p = step / 50;
    await scrollTo(page, p);
    const hero = await dominant(page);
    const cap = await captionState(page);
    sweep.push({
      p,
      file: hero ? hero.file : "",
      beat: hero ? hero.beat : "",
      tag: hero ? hero.tag : "",
      text: cap.text
    });
    if (hero && hero.tag === "IMG") seen.add(hero.file);
  }

  await page.locator("#write").scrollIntoViewIfNeeded();
  await page.locator("#noteForm input[name=msg]").fill("корень");
  await page.locator("#noteForm button").click();
  await page.locator("#thanks").scrollIntoViewIfNeeded();
  const thanks = await page.evaluate(() => {
    const node = document.getElementById("thanks");
    const rect = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    return {
      text: node.textContent,
      display: cs.display,
      height: rect.height,
      top: rect.top,
      bottom: rect.bottom,
      view: innerHeight
    };
  });

  return { errors, colors, samples, videoBefore, videoAfter, sweep, seen: [...seen], thanks };
}

function assertRun(result) {
  assert.deepEqual(result.errors, [], `page errors: ${result.errors.join(" | ")}`);

  for (const beat of ["living", "choked", "pull", "revived"]) {
    const color = result.colors[beat];
    assert.ok(color, beat);
    assert.ok(Math.max(color.naturalWidth, color.naturalHeight) >= 720, JSON.stringify(color));
    assert.ok(color.lilac > 0.35, `${beat} lilac ${color.lilac}`);
  }
  assert.ok(result.colors.living.pink > 0.05, JSON.stringify(result.colors.living));
  assert.ok(result.colors.revived.pink > 0.05, JSON.stringify(result.colors.revived));
  assert.ok(result.colors.pull.pink > 0.03, JSON.stringify(result.colors.pull));
  assert.ok(result.colors.choked.pink < result.colors.living.pink * 0.5, `choked should lose the pink bloom ${JSON.stringify(result.colors.choked)} vs ${JSON.stringify(result.colors.living)}`);

  for (const sample of SAMPLES) {
    const found = result.samples.find((item) => item.id === sample.id);
    assert.ok(found, sample.id);
    assert.equal(found.hero.beat, sample.beat, JSON.stringify(found.hero));
    assert.equal(found.hero.tag, "IMG");
    assert.equal(found.hero.file, `${sample.beat}.jpg`);
    assert.ok(!BASELINE.has(found.hero.file), found.hero.file);
    assert.ok(found.hero.src.includes("/assets/film/"), found.hero.src);
    assert.ok(found.hero.opacity > 0.5);
    assert.ok(found.hero.ratio >= 0.35, `hero ratio ${found.hero.ratio}`);
    assert.ok(found.hero.naturalWidth >= 720, JSON.stringify(found.hero));
    assert.ok(found.cap.width > 80 && found.cap.height > 40, JSON.stringify(found.cap));
    assert.equal(found.cap.covered, false, JSON.stringify(found.cap));
    assert.ok(found.cap.text.trim().length > 0);
    if (sample.text) assert.ok(found.cap.text.includes(sample.text), found.cap.text);
    if (sample.weed) assert.ok(WEEDS.some((phrase) => found.cap.text.includes(phrase)), found.cap.text);
    if (sample.hint) {
      assert.ok(found.cap.hint.includes("листай вниз"), found.cap.hint);
      assert.ok(found.cap.hintOpacity > 0.5, String(found.cap.hintOpacity));
    }
  }

  const joined = result.sweep.map((step) => step.text).join("\n");
  for (const phrase of WEEDS) assert.ok(joined.includes(phrase), phrase);
  assert.ok(joined.includes("Ваша жизнь подобна этой клумбе."));
  assert.ok(joined.includes("Она выдёргивает сорняк"));
  assert.ok(joined.includes("Клумба ожила."));

  for (const name of REQUIRED_STILLS) assert.ok(result.seen.includes(name), `${name} missing from ${result.seen.join(",")}`);
  for (const name of result.seen) assert.ok(!BASELINE.has(name), name);
  assert.ok(result.seen.length >= 4);

  assert.equal(result.videoBefore.file, "breath.mp4");
  assert.ok(result.videoBefore.videoWidth > 0, JSON.stringify(result.videoBefore));
  assert.ok(result.videoBefore.opacity > 0.5);
  assert.ok(result.videoAfter.currentTime > result.videoBefore.currentTime, `${result.videoBefore.currentTime} -> ${result.videoAfter.currentTime}`);
  assert.ok(result.videoAfter.variance > 40, JSON.stringify(result.videoAfter));
  assert.ok(result.videoAfter.lilac > 0.1 || result.videoAfter.pink > 0.02, JSON.stringify(result.videoAfter));

  assert.equal(result.thanks.text, "Пришло. Отвечу как человеку, не как рассылка.");
  assert.notEqual(result.thanks.display, "none");
  assert.ok(result.thanks.height > 8);
  assert.ok(result.thanks.top < result.thanks.view && result.thanks.bottom > 0, JSON.stringify(result.thanks));
}

test("media inventory and classic script", () => {
  inventory();
  loadScriptsLikeBrowser();
});

test("two consecutive story loads", { timeout: 180000 }, async () => {
  fs.mkdirSync(scratch, { recursive: true });
  const log = [];
  const note = (line) => {
    log.push(line);
    console.log(line);
  };
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: chrome,
      headless: true,
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--mute-audio",
        "--disable-background-timer-throttling"
      ]
    });
  } catch (err) {
    const text = String(err && err.stack ? err.stack : err);
    fs.writeFileSync(path.join(scratch, "launch-fail.txt"), text);
    fs.writeFileSync(path.join(scratch, "launch.log"), text);
    throw err;
  }

  const { server, port } = await startServer();
  const start = `http://127.0.0.1:${port}/index.html`;
  const signatures = [];
  try {
    for (let run = 1; run <= 2; run += 1) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      page.__start = start;
      const result = await runOnce(page, { shots: run === 1 });
      assertRun(result);
      const signature = {
        samples: result.samples.map((item) => ({
          id: item.id,
          file: item.hero.file,
          beat: item.hero.beat,
          text: item.cap.text,
          hint: item.cap.hint
        })),
        seen: [...result.seen].sort(),
        thanks: result.thanks.text
      };
      signatures.push(signature);
      note(`run ${run} samples ${JSON.stringify(signature.samples.map((item) => item.beat + ":" + item.file))}`);
      note(`run ${run} stills ${signature.seen.join(", ")}`);
      note(`run ${run} video ${result.videoBefore.currentTime.toFixed(3)} -> ${result.videoAfter.currentTime.toFixed(3)} variance ${result.videoAfter.variance.toFixed(1)}`);
      note(`run ${run} colors ${JSON.stringify(result.colors)}`);
      await page.close();
    }
    assert.deepEqual(signatures[0], signatures[1]);
    note("both runs passed with the same beats");
  } finally {
    fs.writeFileSync(path.join(scratch, "launch.log"), log.join("\n") + "\n");
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
