/* «Клумба» — интерактивные блоки под историей:
   прополка руками, моя клумба (+ картинка для сторис), семечко дня, садовница. */
(() => {
  "use strict";

  /* ================= НАСТРОЙКИ — данные Надежды ================= */
  const KLUMBA = {
    name: "Надежда",
    telegram: "", // например "https://t.me/username"
    whatsapp: "", // например "https://wa.me/79001234567"
    role: "гипнотерапевт",
    format: "", // «онлайн, 60–90 минут»
    price: "", // «5 000 ₽ за сессию»
    about:
      "Я не обрываю листья и не уговариваю «просто думать позитивно». Вместе мы находим фразу, из которой вырос сорняк, и вынимаем его с корнем — бережно, без боли ради боли. А на освободившемся месте ты сама решаешь, что посадить.",
    reviews: [], // [{ text: "…", who: "Анна, 34" }] — только настоящие, с согласия
    voice: {
      greeting: "audio/privet.mp3",
      // озвучка истории по карточкам
      story: Object.fromEntries(["intro", "w0", "w1", "w2", "w3", "w4", "w5", "choke", "girl", "dig", "p0", "t0", "p1", "t1", "p2", "t2", "p3", "t3", "p4", "t4", "p5", "t5", "fin"].map((k) => [k, `audio/story/${k}.mp3`]))
    }
  };
  /* ============================================================== */

  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const Art = window.KlumbaArt;
  const Data = window.KlumbaData;
  if (!Art || !Data) return;
  const { WEEDS } = Data;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* нет вибро */ } };
  const duck = (v) => { try { window.KlumbaMusic && window.KlumbaMusic.duck && window.KlumbaMusic.duck(v); } catch (e) { /* без звука */ } };
  const bloomSound = () => { try { window.KlumbaMusic && window.KlumbaMusic.bloom && window.KlumbaMusic.bloom(); } catch (e) { /* без звука */ } };
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- контакты ---------- */
  function contactHref(text) {
    const q = text ? encodeURIComponent(text) : "";
    if (KLUMBA.telegram) return KLUMBA.telegram + (q ? "?text=" + q : "");
    if (KLUMBA.whatsapp) return KLUMBA.whatsapp + (q ? (KLUMBA.whatsapp.includes("?") ? "&" : "?") + "text=" + q : "");
    return "";
  }
  const hasContact = () => !!(KLUMBA.telegram || KLUMBA.whatsapp);
  function wire(el, text) {
    if (!el) return;
    const href = contactHref(text);
    if (href) {
      el.href = href;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.href = "#gardener";
      el.removeAttribute("target");
    }
  }
  wire($("cta"), "Здравствуйте, Надежда! Хочу на сессию — прополоть свою клумбу.");

  /* ---------- SVG-подпись-«таблетка» с переносом ---------- */
  function wrap(text, max) {
    const words = text.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max && cur) {
        lines.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function pill(parent, text, x, y, o) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", o.cls || "");
    const lines = wrap(text, o.max || 16);
    const lh = o.size * 1.22;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-family", o.serif ? "Fraunces, Georgia, serif" : "Manrope, system-ui, sans-serif");
    t.setAttribute("font-size", o.size);
    t.setAttribute("font-weight", o.weight || 700);
    if (o.italic) t.setAttribute("font-style", "italic");
    t.setAttribute("fill", o.color);
    lines.forEach((ln, i) => {
      const s = document.createElementNS(NS, "tspan");
      s.setAttribute("x", x);
      s.setAttribute("y", y - (lines.length - 1 - i) * lh);
      s.textContent = ln;
      t.appendChild(s);
    });
    g.appendChild(t);
    parent.appendChild(g);
    let bb;
    try { bb = t.getBBox(); } catch (e) { bb = { x: x - 60, y: y - lh, width: 120, height: lh * lines.length }; }
    const r = document.createElementNS(NS, "rect");
    const px = o.padX || 12, py = o.padY || 7;
    r.setAttribute("x", n1(bb.x - px));
    r.setAttribute("y", n1(bb.y - py));
    r.setAttribute("width", n1(bb.width + px * 2));
    r.setAttribute("height", n1(bb.height + py * 2));
    r.setAttribute("rx", o.rx || 12);
    r.setAttribute("fill", o.bg);
    if (o.stroke) {
      r.setAttribute("stroke", o.stroke);
      r.setAttribute("stroke-width", "1.5");
    }
    g.insertBefore(r, t);
    // не вылезать за края сцены
    if (o.W) {
      const left = bb.x - px, right = bb.x + bb.width + px;
      const dx = left < 6 ? 6 - left : right > o.W - 6 ? o.W - 6 - right : 0;
      if (dx) g.setAttribute("transform", `translate(${n1(dx)} 0)`);
    }
    return g;
  }

  /* ================================================================
     1. ПРОПОЛКА: вытащить сорняк руками
     ================================================================ */
  const pullStage = $("pullStage");
  const PULL_PICK = [0, 3, 5]; // «Не высовывайся», «Что люди подумают?», «У тебя не получится»
  const pulled = new Set();
  let pullLayout = "";

  function soilSpecks(r, w, top, bottom) {
    let d = "";
    for (let k = 0; k < 140; k++) {
      const x = r() * w, y = top + 8 + r() * (bottom - top - 8), rr = 1 + r() * 2.4;
      d += `M${n1(x - rr)} ${n1(y)}a${n1(rr)} ${n1(rr * 0.75)} 0 1 0 ${n1(rr * 2)} 0a${n1(rr)} ${n1(rr * 0.75)} 0 1 0 ${n1(-rr * 2)} 0`;
    }
    return d;
  }
  function grassEdge(r, w, y) {
    let d = "";
    for (let x = -6; x < w + 8; x += 5 + r() * 5) {
      const h = 6 + r() * 12, lean = (r() - 0.5) * 8;
      d += `M${n1(x)} ${n1(y + 3)}q${n1(lean * 0.4)} ${n1(-h * 0.6)} ${n1(lean)} ${n1(-h)}`;
    }
    return d;
  }

  function buildPull() {
    if (!pullStage) return;
    const narrow = pullStage.clientWidth < 620;
    const key = narrow ? "n" : "w";
    if (key === pullLayout) return;
    pullLayout = key;
    const W = narrow ? 420 : 760, H = narrow ? 560 : 470, G = narrow ? 330 : 290;
    const xs = narrow ? [78, 210, 342] : [150, 380, 610];
    const hs = narrow ? [150, 205, 165] : [165, 205, 175];
    const r = rng(42);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "pull__svg");
    svg.innerHTML =
      `<defs><linearGradient id="soilG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4c36"/><stop offset=".45" stop-color="#4a3424"/><stop offset="1" stop-color="#2e2016"/></linearGradient></defs>` +
      `<g class="pull__flowers"></g>` +
      `<g class="pull__weeds"></g>` +
      `<path pointer-events="none" d="M0 ${G} ${Array.from({ length: 13 }, (_, k) => `L${n1((k * W) / 12)} ${n1(G + Math.sin(k * 1.7) * 3)}`).join("")} L${W} ${G} L${W} ${H} L0 ${H}Z" fill="url(#soilG)"/>` +
      `<path d="${soilSpecks(r, W, G, H)}" fill="#2a1d14" opacity=".45"/>` +
      `<path d="${grassEdge(r, W, G)}" stroke="#6f9b45" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<g class="pull__labels" pointer-events="none"></g><g class="pull__fx" pointer-events="none"></g>`;
    pullStage.innerHTML = "";
    pullStage.appendChild(svg);
    const gF = svg.querySelector(".pull__flowers"), gW = svg.querySelector(".pull__weeds");
    const gL = svg.querySelector(".pull__labels"), gX = svg.querySelector(".pull__fx");
    const weeds = PULL_PICK.map((wi, k) => {
      const w = WEEDS[wi], x = xs[k], h = hs[k];
      // цветок, который вырастет на месте сорняка
      const f = document.createElementNS(NS, "g");
      f.setAttribute("transform", `translate(${x} ${G + 2})`);
      f.innerHTML = `<g class="pf">${Art.flower(k === 1 ? "peony" : k === 0 ? "cosmos" : "tulip", 900 + wi * 7, k === 1 ? 120 : 150)}</g>`;
      gF.appendChild(f);
      // сорняк с корнем
      const g = document.createElementNS(NS, "g");
      g.setAttribute("transform", `translate(${x} ${G + 2})`);
      g.setAttribute("class", "pw");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `Вытащить сорняк «${w.phrase}»`);
      g.innerHTML = `<g class="pw__lift"><g transform="scale(.9)">${Art.root(333 + wi * 13, 150)}</g><g transform="scale(${narrow ? 0.72 : 0.8})">${Art.weed(700 + wi * 37, h)}</g><rect x="-60" y="${-h * 0.85}" width="120" height="${h * 0.9}" fill="transparent"/></g>`;
      gW.appendChild(g);
      const tag = pill(gL, w.phrase, x, G - h * (narrow ? 0.72 : 0.8) - 34, { size: narrow ? 17 : 16, max: narrow ? 11 : 16, bg: "#3b2f45", color: "#f4ecf7", rx: 10, W });
      tag.setAttribute("class", "pl-tag");
      return { wi, w, x, h, g, lift: g.firstChild, flower: f.firstChild, tag, G, gL, gX, narrow, W, state: pulled.has(wi) ? "done" : "idle", raw: 0 };
    });
    for (const P of weeds) {
      if (P.state === "done") {
        P.g.style.display = "none";
        P.tag.style.display = "none";
        P.flower.classList.add("is-in");
        truthTag(P);
      } else bindWeed(P, svg);
    }
    if (!pulled.size && !reduce) {
      const hint = document.createElementNS(NS, "g");
      hint.setAttribute("class", "pull__hint");
      hint.setAttribute("transform", `translate(${xs[0] + (narrow ? 34 : 44)} ${G - 40})`);
      hint.innerHTML = `<path d="M0 26V-4M-9 5L0 -6L9 5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0" cy="34" r="8" fill="#fff" opacity=".85"/>`;
      gL.appendChild(hint);
    }
  }

  function truthTag(P) {
    const t = pill(P.gL, WEEDS[P.wi].truth, P.x, P.G - (P.wi === 3 ? 150 : 180) - 16, { size: P.narrow ? 16 : 15, max: P.narrow ? 12 : 18, bg: "#d9558a", color: "#fff", rx: 14, weight: 800, W: P.W });
    t.setAttribute("class", "pl-truth");
  }

  function svgPoint(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function crumbs(P, n, power) {
    for (let k = 0; k < n; k++) {
      const c = document.createElementNS(NS, "circle");
      const r = 1.6 + Math.random() * 3.2;
      c.setAttribute("r", n1(r));
      c.setAttribute("fill", ["#3e2a1c", "#5a4030", "#6b4c36", "#2d1f15"][k % 4]);
      P.gX.appendChild(c);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = (60 + Math.random() * 160) * power;
      particles.push({ el: c, x: P.x + (Math.random() - 0.5) * 30, y: P.G, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.9 + Math.random() * 0.5 });
    }
    kick();
  }
  function petals(P) {
    const cols = ["#f7b8d0", "#fbd3e2", "#ee8cb4", "#ffffff", "#f5a3c4"];
    for (let k = 0; k < 16; k++) {
      const c = document.createElementNS(NS, "ellipse");
      c.setAttribute("rx", "4");
      c.setAttribute("ry", "2.4");
      c.setAttribute("fill", cols[k % cols.length]);
      P.gX.appendChild(c);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 60 + Math.random() * 120;
      particles.push({ el: c, x: P.x, y: P.G - 130, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.4 + Math.random() * 0.6, petal: true, rot: Math.random() * 360 });
    }
    kick();
  }

  const particles = [];
  const anims = new Set();
  let raf = 0, last = 0;
  function kick() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.vy += (p.petal ? 60 : 520) * dt;
      if (p.petal) p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.el.remove();
        particles.splice(i, 1);
        continue;
      }
      p.el.setAttribute("transform", `translate(${n1(p.x)} ${n1(p.y)})${p.petal ? ` rotate(${n1((p.rot += 200 * dt))})` : ""}`);
      p.el.setAttribute("opacity", n1(1 - k * k));
    }
    for (const a of anims) if (a(now) === false) anims.delete(a);
    raf = particles.length || anims.size ? requestAnimationFrame(loop) : 0;
  }

  function bindWeed(P, svg) {
    let start = null, t0 = 0, lastBuzz = 0, lastCrumb = 0;
    const setLift = (raw) => {
      P.raw = raw;
      const lift = 58 * (1 - Math.exp(-raw / 75));
      const sh = (Math.random() - 0.5) * 2 * (0.6 + raw / 32);
      P.lift.setAttribute("transform", `translate(${n1(sh)} ${n1(-lift)}) rotate(${n1(sh * 0.5)})`);
      P.tag.setAttribute("transform", `translate(${n1(sh * 0.6)} ${n1(-lift * 0.8)})`);
    };
    const onDown = (e) => {
      if (P.state !== "idle") return;
      e.preventDefault();
      hideHint();
      P.state = "drag";
      start = svgPoint(svg, e);
      t0 = performance.now();
      try { P.g.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      P.g.classList.add("is-drag");
    };
    const onMove = (e) => {
      if (P.state !== "drag" || !start) return;
      const pt = svgPoint(svg, e);
      const raw = Math.max(0, start.y - pt.y) + Math.max(0, Math.abs(pt.x - start.x) - 40) * 0.2;
      setLift(raw);
      const now = performance.now();
      if (raw > 12 && now - lastBuzz > 110) {
        lastBuzz = now;
        buzz(Math.round(6 + raw / 9));
      }
      if (raw > 18 && now - lastCrumb > 90) {
        lastCrumb = now;
        crumbs(P, 2, 0.35 + raw / 260);
      }
      if (raw >= 118) pop(P);
    };
    const onUp = () => {
      if (P.state !== "drag") return;
      P.g.classList.remove("is-drag");
      const quick = performance.now() - t0 < 320 && P.raw < 10;
      if (quick) return autoPull(P);
      // не дотянула — сорняк пружинит обратно
      P.state = "idle";
      const from = P.raw, t1 = performance.now();
      anims.add((now) => {
        const k = clamp((now - t1) / 380, 0, 1);
        const raw = from * (1 - k) * (1 - k);
        if (P.state === "idle") setLift(raw * (1 - k));
        return k < 1;
      });
      kick();
    };
    P.g.addEventListener("pointerdown", onDown);
    P.g.addEventListener("pointermove", onMove);
    P.g.addEventListener("pointerup", onUp);
    P.g.addEventListener("pointercancel", onUp);
    P.g.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && P.state === "idle") {
        e.preventDefault();
        hideHint();
        autoPull(P);
      }
    });
    P.setLift = setLift;
  }

  function autoPull(P) {
    P.state = "auto";
    const t1 = performance.now();
    let lb = 0;
    anims.add((now) => {
      const k = clamp((now - t1) / 700, 0, 1);
      P.setLift(k * 120);
      if (now - lb > 120) {
        lb = now;
        buzz(10 + k * 14);
        crumbs(P, 2, 0.4 + k * 0.5);
      }
      if (k >= 1) {
        pop(P);
        return false;
      }
      return true;
    });
    kick();
  }

  function pop(P) {
    if (P.state === "popping" || P.state === "done") return;
    P.state = "popping";
    P.g.classList.remove("is-drag");
    pulled.add(P.wi);
    buzz([18, 40, 30]);
    crumbs(P, 26, 1);
    const w = WEEDS[P.wi];
    const side = P.x > 300 ? -1 : 1;
    const rootTag = pill(P.gL, "корень: «" + w.program + "»", P.x + side * (P.narrow ? 38 : 110), P.G - 120, {
      size: 15, max: P.narrow ? 16 : 22, bg: "#f5ecdb", color: "#6b5a50", serif: true, italic: true, weight: 500, rx: 12, stroke: "#e2cfad", W: P.W
    });
    rootTag.classList.add("pl-root");
    P.tag.style.transition = "opacity .4s";
    P.tag.style.opacity = "0";
    const t1 = performance.now();
    const from = 58 * (1 - Math.exp(-P.raw / 75));
    let bloomed = false;
    anims.add((now) => {
      const t = (now - t1) / 1000;
      let lift, op = 1, rot = 0;
      if (t < 0.55) {
        const k = t / 0.55, e = 1 - Math.pow(1 - k, 3);
        lift = from + (205 - from) * e;
        rot = Math.sin(t * 30) * (1 - k) * 4;
      } else if (t < 1.9) {
        lift = 205 + Math.sin((t - 0.55) * 3) * 4;
        rot = Math.sin((t - 0.55) * 2.4) * 3;
      } else {
        const k = clamp((t - 1.9) / 0.7, 0, 1);
        lift = 205 + k * 120;
        op = 1 - k;
        rot = k * 14 * (P.x > 300 ? 1 : -1);
        rootTag.setAttribute("opacity", n1(1 - k));
      }
      P.lift.setAttribute("transform", `translate(0 ${n1(-lift)}) rotate(${n1(rot)})`);
      P.g.setAttribute("opacity", n1(op));
      if (t > 2.15 && !bloomed) {
        bloomed = true;
        P.flower.classList.add("is-in");
        truthTag(P);
        petals(P);
        bloomSound();
        buzz(12);
      }
      if (t >= 2.7) {
        P.g.style.display = "none";
        rootTag.remove();
        P.state = "done";
        if (pulled.size >= PULL_PICK.length) pullDone();
        return false;
      }
      return true;
    });
    kick();
  }

  function hideHint() {
    const h = pullStage && pullStage.querySelector(".pull__hint");
    if (h) h.remove();
  }
  function pullDone() {
    const d = $("pullDone");
    if (d && d.hidden) {
      d.hidden = false;
      requestAnimationFrame(() => d.classList.add("is-in"));
    }
  }
  wire($("pullCta"), "Здравствуйте, Надежда! Попробовала прополку на сайте — хочу вытащить свои сорняки по-настоящему.");

  if (pullStage) {
    buildPull();
    // на телефоне палец на сорняке не должен прокручивать страницу
    pullStage.addEventListener("touchmove", (e) => {
      if (e.target.closest && e.target.closest(".pw.is-drag")) e.preventDefault();
    }, { passive: false });
    let rt = 0;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if ([...pullStage.querySelectorAll(".pw")].some((g) => g.classList.contains("is-drag"))) return;
        buildPull();
      }, 200);
    });
  }

  /* ================================================================
     2. МОЯ КЛУМБА
     ================================================================ */
  // фраза → корень-программа (индекс в WEEDS)
  const PHRASES = [
    ["Не высовывайся", 0], ["Будь как все", 0], ["Тише едешь — дальше будешь", 0], ["Скромность украшает девушку", 0],
    ["Тебе нельзя быть такой", 1], ["Что ты за ребёнок такой", 1], ["Вот Катя нормальная, а ты…", 1], ["Не реви", 1], ["Ты же девочка", 1],
    ["Кем ты себя возомнила?", 2], ["Губу закатай", 2], ["Не по Сеньке шапка", 2], ["Мы люди простые", 2], ["Деньги портят людей", 2],
    ["Что люди подумают?", 3], ["Не позорь нас", 3], ["Перед людьми стыдно", 3], ["Будь как нормальные люди", 3],
    ["Будь удобной", 4], ["Не будь эгоисткой", 4], ["Уступи, ты же старшая", 4], ["Хорошие девочки не спорят", 4], ["Не расстраивай маму", 4],
    ["У тебя не получится", 5], ["Руки не оттуда растут", 5], ["Дай сюда, всё испортишь", 5], ["Даже не начинай", 5], ["Не смеши людей", 5]
  ];
  const chipsEl = $("chips"), gardenEl = $("myGarden"), sumEl = $("mySum");
  const chosen = [];
  const BW = 600, BH = 330, BG = 250;
  const FLOWERS = [
    ["cosmos", 60, 150], ["tulip", 128, 120], ["peony", 196, 80], ["cosmos", 262, 170], ["tulip", 330, 140],
    ["peony", 398, 90], ["cosmos", 462, 155], ["tulip", 530, 125]
  ];
  const SLOTS = [300, 95, 505, 200, 395, 30, 570, 250, 150, 450, 350, 55, 545, 280, 120, 480, 225, 420, 330, 175, 525, 75, 265, 370, 440, 15, 585, 310];

  function bedBase() {
    const r = rng(7);
    return (
      `<defs><linearGradient id="bedSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4c36"/><stop offset="1" stop-color="#34241a"/></linearGradient>` +
      `<linearGradient id="bedSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe9f1"/><stop offset="1" stop-color="#efe3f6"/></linearGradient></defs>` +
      `<rect width="${BW}" height="${BH}" fill="url(#bedSky)"/>` +
      `<g class="bed__flowers">${FLOWERS.map(([k, x, h], i) => `<g transform="translate(${x} ${BG + 2}) scale(.72)">${Art.flower(k, 500 + i * 11, h)}</g>`).join("")}</g>` +
      `<g class="bed__weeds"></g>` +
      `<path d="M0 ${BG} Q${BW / 4} ${BG - 6} ${BW / 2} ${BG} T${BW} ${BG} V${BH} H0Z" fill="url(#bedSoil)"/>` +
      `<path d="${soilSpecks(r, BW, BG, BH)}" fill="#2a1d14" opacity=".4"/>` +
      `<path d="${grassEdge(r, BW, BG)}" stroke="#6f9b45" stroke-width="2" fill="none" stroke-linecap="round"/>`
    );
  }

  function renderBed(animateLast) {
    const wg = gardenEl.querySelector(".bed__weeds");
    const fl = gardenEl.querySelector(".bed__flowers");
    const n = chosen.length;
    fl.setAttribute("opacity", n1(Math.max(0.4, 1 - n * 0.06)));
    wg.innerHTML = chosen
      .map((pi, k) => {
        const x = SLOTS[k % SLOTS.length] + (k >= SLOTS.length ? 12 : 0);
        const h = 120 + ((pi * 37 + k * 23) % 60);
        const cls = animateLast && k === n - 1 ? "bw is-new" : "bw";
        return `<g transform="translate(${x} ${BG + 3})"><g class="${cls}"><g transform="scale(.62)">${Art.weed(1200 + pi * 17, h)}</g></g></g>`;
      })
      .join("");
  }

  function mainRoot() {
    const cnt = [0, 0, 0, 0, 0, 0];
    for (const pi of chosen) cnt[PHRASES[pi][1]]++;
    let best = -1, bi = -1;
    cnt.forEach((c, i) => {
      if (c > best) {
        best = c;
        bi = i;
      }
    });
    const roots = cnt.map((c, i) => [c, i]).filter(([c]) => c > 0).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
    return { main: bi, roots };
  }

  function renderSum() {
    const n = chosen.length;
    const act = $("myActions");
    if (!n) {
      sumEl.innerHTML = `<p class="sum__empty">Отметь фразы слева — и увидишь, что растёт в твоей клумбе.</p>`;
      act.hidden = true;
      return;
    }
    const { main, roots } = mainRoot();
    const W = WEEDS[main];
    const word = n === 1 ? "сорняк" : n < 5 ? "сорняка" : "сорняков";
    sumEl.innerHTML =
      `<p class="sum__n"><b>${n}</b> ${word} в твоей клумбе</p>` +
      `<p class="sum__k">главный корень</p><p class="sum__root">«${esc(W.program)}»</p>` +
      `<p class="sum__k">вместо него вырастет</p><p class="sum__truth">«${esc(W.truth)}»</p>` +
      (roots.length > 1 ? `<p class="sum__more">Ещё корни: ${roots.slice(1).map((i) => `«${esc(WEEDS[i].program)}»`).join(", ")}</p>` : "");
    act.hidden = false;
  }

  function bedMessage() {
    const { main, roots } = mainRoot();
    return [
      "Здравствуйте, Надежда! Прошла «Мою клумбу» на сайте.",
      "Сорняки: " + chosen.map((pi) => "«" + PHRASES[pi][0] + "»").join(", "),
      "Главный корень: «" + WEEDS[main].program + "»",
      roots.length > 1 ? "Ещё: " + roots.slice(1).map((i) => "«" + WEEDS[i].program + "»").join(", ") : "",
      "Хочу начать прополку."
    ].filter(Boolean).join("\n");
  }

  if (chipsEl && gardenEl && sumEl) {
    gardenEl.setAttribute("viewBox", `0 0 ${BW} ${BH}`);
    gardenEl.innerHTML = bedBase();
    chipsEl.innerHTML = PHRASES.map(([t], i) => `<button type="button" class="phrase" data-i="${i}" aria-pressed="false">«${esc(t)}»</button>`).join("");
    chipsEl.addEventListener("click", (e) => {
      const b = e.target.closest(".phrase");
      if (!b) return;
      const i = +b.dataset.i, at = chosen.indexOf(i);
      if (at >= 0) chosen.splice(at, 1);
      else {
        chosen.push(i);
        buzz(8);
      }
      b.setAttribute("aria-pressed", String(at < 0));
      b.classList.toggle("is-on", at < 0);
      renderBed(at < 0);
      renderSum();
    });
    renderSum();
    const send = $("mySend");
    if (send) {
      if (hasContact()) send.addEventListener("click", () => { send.href = contactHref(bedMessage()); });
      else send.hidden = true;
    }
    const story = $("myStory");
    if (story) story.addEventListener("click", () => storyBed(story));
  }

  /* ---------- картинка для сторис ---------- */
  async function fonts() {
    try {
      await Promise.all([
        document.fonts.load('500 120px Fraunces'), document.fonts.load('italic 500 60px Fraunces'),
        document.fonts.load('800 40px Manrope'), document.fonts.load('600 36px Manrope')
      ]);
    } catch (e) { /* системные шрифты */ }
  }
  function svgImage(svgEl) {
    return new Promise((res, rej) => {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute("xmlns", NS);
      clone.setAttribute("width", BW * 2);
      clone.setAttribute("height", BH * 2);
      clone.querySelectorAll(".is-new").forEach((g) => g.classList.remove("is-new"));
      const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function wrapCanvas(c, text, maxW) {
    const words = text.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (c.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function storyCanvas() {
    const cv = document.createElement("canvas");
    cv.width = 1080;
    cv.height = 1920;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, "#fbe3ee");
    g.addColorStop(0.55, "#efe3f6");
    g.addColorStop(1, "#d9cdea");
    c.fillStyle = g;
    c.fillRect(0, 0, 1080, 1920);
    // бренд
    c.fillStyle = "#d9558a";
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.arc(96 + Math.cos((k * Math.PI) / 2) * 12, 118 + Math.sin((k * Math.PI) / 2) * 12, 11, 0, 7);
      c.fill();
    }
    c.fillStyle = "#f3c450";
    c.beginPath();
    c.arc(96, 118, 7, 0, 7);
    c.fill();
    c.fillStyle = "#2b2233";
    c.font = "800 34px Manrope, sans-serif";
    c.fillText("клумба", 132, 130);
    return { cv, c };
  }
  async function share(cv, name, title) {
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], name, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }
  async function storyBed(btn) {
    if (!chosen.length) return;
    btn.classList.add("is-busy");
    try {
      await fonts();
      const { cv, c } = storyCanvas();
      c.fillStyle = "#2b2233";
      c.font = "500 132px Fraunces, Georgia, serif";
      c.fillText("Моя клумба", 80, 330);
      c.font = "600 40px Manrope, sans-serif";
      c.fillStyle = "#625670";
      c.fillText("что когда-то посадили в меня", 84, 400);
      const img = await svgImage(gardenEl);
      c.save();
      rrect(c, 60, 450, 960, 528, 44);
      c.clip();
      c.drawImage(img, 60, 450, 960, 528);
      c.restore();
      // фразы-сорняки
      c.font = "700 34px Manrope, sans-serif";
      let x = 70, y = 1050;
      const shown = chosen.slice(0, 9);
      for (const pi of shown) {
        const t = "«" + PHRASES[pi][0] + "»", w = c.measureText(t).width + 44;
        if (x + w > 1010) {
          x = 70;
          y += 72;
        }
        c.fillStyle = "#3b2f45";
        rrect(c, x, y - 44, w, 60, 18);
        c.fill();
        c.fillStyle = "#f4ecf7";
        c.fillText(t, x + 22, y - 3);
        x += w + 14;
      }
      if (chosen.length > shown.length) {
        c.fillStyle = "#625670";
        c.fillText("и ещё " + (chosen.length - shown.length), x, y - 3);
      }
      const { main } = mainRoot();
      y += 110;
      c.fillStyle = "#9a8aa8";
      c.font = "800 26px Manrope, sans-serif";
      c.fillText("ГЛАВНЫЙ КОРЕНЬ", 80, y);
      c.fillStyle = "#6b5a50";
      c.font = "italic 500 58px Fraunces, Georgia, serif";
      for (const ln of wrapCanvas(c, "«" + WEEDS[main].program + "»", 920)) {
        y += 72;
        c.fillText(ln, 80, y);
        c.fillStyle = "rgba(194,59,92,.55)";
        c.fillRect(80, y - 20, c.measureText(ln).width, 4);
        c.fillStyle = "#6b5a50";
      }
      y += 90;
      c.fillStyle = "#9a8aa8";
      c.font = "800 26px Manrope, sans-serif";
      c.fillText("ВМЕСТО НЕГО ВЫРАСТЕТ", 80, y);
      c.fillStyle = "#b8386a";
      c.font = "800 60px Manrope, sans-serif";
      for (const ln of wrapCanvas(c, "«" + WEEDS[main].truth + "»", 920)) {
        y += 76;
        c.fillText(ln, 80, y);
      }
      c.fillStyle = "#2b2233";
      c.font = "600 34px Manrope, sans-serif";
      c.fillText("А что растёт у тебя? → " + location.host + location.pathname.replace(/\/$/, ""), 80, 1840);
      await share(cv, "moya-klumba.png", "Моя клумба");
    } finally {
      btn.classList.remove("is-busy");
    }
  }

  /* ================================================================
     3. СЕМЕЧКО ДНЯ
     ================================================================ */
  const SEEDS = [
    "Мне можно быть заметной", "Мне можно отдыхать, не заслужив", "Мне можно говорить «нет»", "Мне можно ошибаться",
    "Мне можно хотеть большего", "Мне можно не нравиться всем", "Мне можно начать с малого", "Моё мнение важно",
    "Мне можно просить о помощи", "Я достаточно хороша уже сейчас", "Мне можно менять решения", "Мне можно радоваться без повода",
    "Мне можно быть медленной", "Мне можно злиться", "Я могу выбрать себя", "Мне можно брать деньги за свой труд",
    "Мне можно не оправдываться", "Мои желания важны", "Мне можно быть громкой", "Мне можно не угадывать чужие ожидания",
    "Я имею право на свои чувства", "Мне можно отдыхать без чувства вины", "Мне можно пробовать и не знать заранее, получится ли",
    "Меня можно любить настоящей", "Мне можно выделяться", "Со мной всё в порядке", "Мне можно жить в своём темпе",
    "Мне можно сказать «я хочу»", "У меня получится", "Мне можно начинать заново столько раз, сколько нужно"
  ];
  const seedEl = $("seedText"), seedDate = $("seedDate");
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const todaySeed = SEEDS[((day % SEEDS.length) + SEEDS.length) % SEEDS.length];
  if (seedEl) seedEl.textContent = "«" + todaySeed + "»";
  if (seedDate) seedDate.textContent = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const seedSub = $("seedSub");
  if (seedSub) {
    if (hasContact()) wire(seedSub, "Здравствуйте, Надежда! Хочу получать «семечко дня» каждое утро.");
    else seedSub.hidden = true;
  }
  const seedStory = $("seedStory");
  if (seedStory)
    seedStory.addEventListener("click", async () => {
      seedStory.classList.add("is-busy");
      try {
        await fonts();
        const { cv, c } = storyCanvas();
        c.fillStyle = "#9a8aa8";
        c.font = "800 30px Manrope, sans-serif";
        c.fillText("СЕМЕЧКО ДНЯ · " + (seedDate ? seedDate.textContent.toUpperCase() : ""), 80, 560);
        // росток
        c.strokeStyle = "#6a9a3f";
        c.lineWidth = 9;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(540, 1560);
        c.quadraticCurveTo(530, 1420, 540, 1330);
        c.stroke();
        c.fillStyle = "#7fb04d";
        c.beginPath();
        c.ellipse(490, 1370, 62, 26, -0.5, 0, 7);
        c.fill();
        c.fillStyle = "#6a9a3f";
        c.beginPath();
        c.ellipse(592, 1345, 70, 28, 0.45, 0, 7);
        c.fill();
        c.fillStyle = "#4a3424";
        rrect(c, 330, 1555, 420, 60, 30);
        c.fill();
        c.fillStyle = "#2b2233";
        c.font = "italic 500 96px Fraunces, Georgia, serif";
        let y = 700;
        for (const ln of wrapCanvas(c, "«" + todaySeed + "»", 900)) {
          y += 118;
          c.fillText(ln, 80, y);
        }
        c.fillStyle = "#625670";
        c.font = "600 40px Manrope, sans-serif";
        y += 90;
        for (const ln of wrapCanvas(c, "Посади его сегодня: скажи себе утром и вечером.", 900)) {
          c.fillText(ln, 80, y);
          y += 56;
        }
        c.fillStyle = "#2b2233";
        c.font = "600 34px Manrope, sans-serif";
        c.fillText(location.host + location.pathname.replace(/\/$/, ""), 80, 1840);
        await share(cv, "semechko-dnya.png", "Семечко дня");
      } finally {
        seedStory.classList.remove("is-busy");
      }
    });

  /* ================================================================
     4. САДОВНИЦА
     ================================================================ */
  const gName = $("gName"), gAbout = $("gAbout"), gFacts = $("gFacts"), gRev = $("gReviews"), gCta = $("gCta"), gSoon = $("gSoon");
  if (gName) gName.textContent = KLUMBA.role ? `${KLUMBA.name} — ${KLUMBA.role}` : KLUMBA.name;
  if (gAbout) gAbout.textContent = KLUMBA.about;
  if (gFacts) {
    const facts = [KLUMBA.format && ["формат", KLUMBA.format], KLUMBA.price && ["стоимость", KLUMBA.price]].filter(Boolean);
    gFacts.innerHTML = facts.map(([k, v]) => `<li><small>${k}</small><span>${esc(v)}</span></li>`).join("");
    gFacts.hidden = !facts.length;
  }
  if (gRev) {
    if (KLUMBA.reviews.length) {
      gRev.innerHTML = KLUMBA.reviews
        .map((r, i) => `<li><button type="button" class="bud" aria-expanded="false"><span class="bud__flower" aria-hidden="true"><svg viewBox="-24 -24 48 48">${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<ellipse rx="6" ry="13" transform="rotate(${k * 45}) translate(0 -9)" fill="${["#f7b8d0", "#ee8cb4"][k % 2]}"/>`).join("")}<circle r="6" fill="#f3c450"/></svg></span><span class="bud__who">${esc(r.who || "отзыв " + (i + 1))}</span><span class="bud__text">${esc(r.text)}</span></button></li>`)
        .join("");
      gRev.addEventListener("click", (e) => {
        const b = e.target.closest(".bud");
        if (!b) return;
        const open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(open));
        if (open) bloomSound();
      });
    } else gRev.hidden = true;
  }
  if (gCta) {
    const links = [];
    if (KLUMBA.telegram) links.push(`<a class="btn" target="_blank" rel="noopener" href="${esc(KLUMBA.telegram)}?text=${encodeURIComponent("Здравствуйте, Надежда! Хочу на сессию.")}">Написать в Telegram</a>`);
    if (KLUMBA.whatsapp) links.push(`<a class="btn btn--ghost" target="_blank" rel="noopener" href="${esc(KLUMBA.whatsapp)}">Написать в WhatsApp</a>`);
    gCta.innerHTML = links.join("");
    if (gSoon) gSoon.hidden = links.length > 0;
  }
  const gVoice = $("gVoice");
  if (gVoice) {
    if (KLUMBA.voice.greeting) {
      const a = new Audio(KLUMBA.voice.greeting);
      a.preload = "none";
      gVoice.hidden = false;
      const lbl = gVoice.querySelector("span");
      gVoice.addEventListener("click", () => {
        if (a.paused) {
          a.play().catch(() => {});
          duck(true);
          gVoice.classList.add("is-on");
          if (lbl) lbl.textContent = "пауза";
        } else {
          a.pause();
          duck(false);
          gVoice.classList.remove("is-on");
          if (lbl) lbl.textContent = "послушать Надежду";
        }
      });
      a.addEventListener("ended", () => {
        duck(false);
        gVoice.classList.remove("is-on");
        if (lbl) lbl.textContent = "послушать Надежду";
      });
    } else gVoice.hidden = true;
  }

  /* ================================================================
     5. ГОЛОС ИСТОРИИ: каждая карточка — своя фраза (если файлы есть)
     ================================================================ */
  // Голос идёт через тот же AudioContext, что и музыка: на iPhone он
  // разблокируется первым касанием, и дальше фразы звучат при любой прокрутке
  // (обычный <audio> iOS не даёт запустить из прокрутки — отсюда «местами молчит»).
  const story = KLUMBA.voice.story || {};
  const order = Object.keys(story);
  if (order.length) {
    const buf = {}, loading = {};
    let src = null, gainN = null, playingKey = "", startedAt = 0, dur = 0;
    let curKey = window.KlumbaBeatKey || "", pending = "", playedKey = "", prefetched = false;
    const M = () => window.KlumbaMusic;
    const ctxOf = () => { const m = M(); return m && m.ctx; };
    const live = () => { const m = M(), c = ctxOf(); return !!(m && m.audible && c && c.state === "running"); };

    function load(k) {
      if (buf[k]) return Promise.resolve(buf[k]);
      if (loading[k]) return loading[k];
      const c = ctxOf();
      if (!c || !story[k]) return Promise.resolve(null);
      loading[k] = fetch(story[k])
        .then((r) => r.arrayBuffer())
        .then((ab) => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
        .then((b) => (buf[k] = b))
        .catch(() => { delete loading[k]; return null; });
      return loading[k];
    }
    async function prefetchAll() {
      if (prefetched) return;
      prefetched = true;
      const i = Math.max(0, order.indexOf(curKey));
      for (const k of order.slice(i).concat(order.slice(0, i))) await load(k);
    }
    function fadeOut(t = 0.28) {
      if (!src) return;
      const c = ctxOf(), now = c.currentTime;
      try {
        gainN.gain.cancelScheduledValues(now);
        gainN.gain.setValueAtTime(gainN.gain.value, now);
        gainN.gain.linearRampToValueAtTime(0, now + t);
        src.onended = null;
        src.stop(now + t + 0.02);
      } catch (e) { /* уже остановлен */ }
      src = null;
      playingKey = "";
    }
    async function start(k) {
      if (!live()) return;
      const b = await load(k);
      if (!b || !live() || k !== curKey) return; // пока грузилось, ушли дальше
      fadeOut(0.25);
      const c = ctxOf();
      const g = c.createGain();
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(1, c.currentTime + 0.06);
      g.connect(c.destination);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(g);
      s.onended = () => {
        if (src !== s) return;
        src = null;
        playingKey = "";
        // пока фраза звучала, открылась новая карточка — теперь её очередь
        if (pending && pending === curKey && pending !== k) {
          const p = pending;
          pending = "";
          start(p);
        } else {
          pending = "";
          duck(false);
        }
      };
      s.start();
      src = s;
      gainN = g;
      playingKey = k;
      playedKey = k;
      startedAt = c.currentTime;
      dur = b.duration;
      duck(true);
      const next = order[order.indexOf(k) + 1];
      if (next) load(next);
      prefetchAll();
    }
    function onBeat(k) {
      curKey = k;
      if (!live()) return;
      if (!src) return start(k);
      if (k === playingKey) return;
      const c = ctxOf(), played = c.currentTime - startedAt, left = dur - played;
      // фразу почти договорили — дать закончить и сразу следующую;
      // иначе мягко погасить и начать новую
      if (left < 1.6 || played / dur > 0.7) pending = k;
      else start(k);
    }
    function stopAll() {
      pending = "";
      fadeOut(0.3);
      duck(false);
    }

    addEventListener("klumba:beat", (e) => onBeat(e.detail));
    addEventListener("klumba:sound", (e) => {
      if (e.detail) {
        curKey = window.KlumbaBeatKey || curKey;
        if (curKey && playedKey !== curKey && !outroSeen) start(curKey);
        else prefetchAll();
      } else stopAll();
    });
    setTimeout(() => {
      curKey = window.KlumbaBeatKey || curKey;
      if (live() && curKey && !playedKey) start(curKey);
    }, 0);
    // ушли ниже истории — голос замолкает
    let outroSeen = false;
    const outro = $("outro");
    if (outro && "IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => {
        outroSeen = en.isIntersecting && en.intersectionRatio > 0.4;
        if (outroSeen) stopAll();
      }, { threshold: [0, 0.4] }).observe(outro);
    }
    // вкладку свернули — не продолжать фразу в фоне
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopAll(); });
  }
})();
