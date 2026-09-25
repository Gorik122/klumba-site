(() => {
  "use strict";

  /* =========================================================
     helpers
     ========================================================= */

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeIn = (t) => t * t;
  const backOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2));
  const n1 = (v) => Math.round(v * 10) / 10;
  const f2 = (v) => v.toFixed(2);
  const DEG = 180 / Math.PI;

  function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  function bez(P, t) {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
  }
  function qpts(A, C, B, n) {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t;
      out.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]);
    }
    return out;
  }
  const line = (pts) => "M" + pts.map((q) => n1(q[0]) + " " + n1(q[1])).join("L");
  // эллипс как кусок пути: так сотни мелких камней и точек собираются в несколько элементов
  function ellD(cx, cy, rx, ry, deg) {
    const a = deg / DEG, dx = Math.cos(a) * rx, dy = Math.sin(a) * rx;
    const arc = `A${n1(rx)} ${n1(ry)} ${n1(deg)} 0 1 `;
    return `M${n1(cx + dx)} ${n1(cy + dy)}${arc}${n1(cx - dx)} ${n1(cy - dy)}${arc}${n1(cx + dx)} ${n1(cy + dy)}Z`;
  }
  // копилка мелочи: одинаковый стиль — один path, слой задаёт порядок отрисовки;
  // части левее и правее клумбы — отдельные элементы, чтобы за кадром они не рисовались
  function pathHeap() {
    const m = new Map();
    return {
      add(layer, x, attrs, d) {
        const key = layer + (x < -SLAB ? "l" : x > SLAB ? "r" : "m") + "|" + attrs;
        m.set(key, (m.get(key) || "") + d);
      },
      svg: () => [...m].sort((a, b) => a[0].charCodeAt(0) - b[0].charCodeAt(0))
        .map(([k, d]) => `<path d="${d}" ${k.slice(k.indexOf("|") + 1)}/>`).join("")
    };
  }

  // filled, tapered shape along a polyline (roots)
  function taper(pts, wfn) {
    const L = [], R = [], n = pts.length - 1;
    for (let k = 0; k <= n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n, k + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, w = wfn(k / n) / 2;
      L.push(n1(pts[k][0] + nx * w) + " " + n1(pts[k][1] + ny * w));
      R.push(n1(pts[k][0] - nx * w) + " " + n1(pts[k][1] - ny * w));
    }
    return "M" + L.join("L") + "L" + R.reverse().join("L") + "Z";
  }

  /* =========================================================
     story data
     ========================================================= */

  // порядок = порядок появления сорняков
  const WEEDS = [
    { x: 70, h: 215, depth: 395, labelY: 285, phrase: "Не высовывайся", program: "Быть заметной — опасно", truth: "Мне можно быть заметной", note: "Сказали один раз — а ты до сих пор говоришь тише, чем думаешь." },
    { x: -200, h: 205, depth: 385, labelY: 285, phrase: "Тебе нельзя быть такой", program: "Со мной что-то не так", truth: "Со мной всё в порядке", note: "И ты начинаешь подрезать себя сама. Заранее. Пока не успели другие." },
    { x: 330, h: 210, depth: 380, labelY: 285, phrase: "Кем ты себя возомнила?", program: "Я не заслуживаю большего", truth: "Я достойна большего", note: "Каждый раз, когда тянет вверх, этот голос тянет обратно." },
    { x: -70, h: 300, depth: 275, labelY: 150, phrase: "Что люди подумают?", program: "Чужое мнение важнее моего", truth: "Моё мнение важно", note: "Решения принимаешь уже не ты, а воображаемая толпа." },
    { x: 200, h: 290, depth: 280, labelY: 150, phrase: "Будь удобной", program: "Меня любят, только пока я удобная", truth: "Меня можно любить настоящей", note: "Ты говоришь «да», когда внутри всё кричит «нет»." },
    { x: -330, h: 290, depth: 270, labelY: 150, phrase: "У тебя не получится", program: "Я недостаточно хороша", truth: "У меня получится", note: "И ты не начинаешь. Ни дело, ни отношения, ни новую жизнь." }
  ];
  // садовница идёт справа налево
  const PULL = WEEDS.map((w, i) => i).sort((a, b) => WEEDS[b].x - WEEDS[a].x);
  const PULL_INDEX = [];
  PULL.forEach((wi, k) => (PULL_INDEX[wi] = k));

  // доли прокрутки
  const TL = {
    weed0: 0.055, weedStep: 0.05, weedLen: 0.042,
    choke: 0.355,
    girlIn: [0.385, 0.415],
    dig: 0.445,
    reveal: 0.475,
    pull0: 0.515, pullStep: 0.06,
    finale: 0.875
  };

  // мир: земля y=0, небо y<0, почва y>0
  const BED = 480, SLAB = 700, DEPTH = 620;
  // сама почва тянется далеко за любой кадр: ни на одном экране не видно её края
  const EDGE = 2400, FLOOR = 1600;
  // шаг 30 от старого края: середина мха и слоёв почвы остаётся точно такой же
  const GRID = 30 * Math.ceil((EDGE - SLAB) / 30);
  const mound = (x) => {
    const t = x / BED;
    return t * t >= 1 ? 0 : -40 * Math.pow(1 - t * t, 0.75);
  };
  const GS = 1.3;          // масштаб садовницы
  const GIRL_DX = 108;     // где она встаёт на колени относительно сорняка
  const GIRL_HOME = 455;

  /* =========================================================
     plants
     ========================================================= */

  function blade(len, wid, ang, fill, rib, curl, tx, ty) {
    curl = curl || 0;
    const d = `M0 0C${n1(wid)} ${n1(-len * 0.3)} ${n1(wid * 0.8 + curl * 0.6)} ${n1(-len * 0.72)} ${n1(curl)} ${n1(-len)}C${n1(-wid * 0.7 + curl * 0.6)} ${n1(-len * 0.72)} ${n1(-wid)} ${n1(-len * 0.3)} 0 0Z`;
    const ribD = rib ? `<path d="M0 0Q${n1(curl * 0.4)} ${n1(-len * 0.55)} ${n1(curl * 0.95)} ${n1(-len * 0.95)}" stroke="${rib}" stroke-width="1.1" fill="none" opacity=".7"/>` : "";
    return `<g transform="translate(${n1(tx || 0)} ${n1(ty || 0)}) rotate(${n1(ang)})"><path d="${d}" fill="${fill}"/>${ribD}</g>`;
  }

  function genSpike(r, o) {
    const h = o.h, headY = -h * 0.44, headLen = h * 0.56, bend = (r() - 0.5) * 12;
    let body = blade(h * 0.42, 9, -16 - r() * 8, "#5d8f37", "#a3cf70", -12) + blade(h * 0.34, 8, 14 + r() * 8, "#4c7d2d", "#93c262", 10);
    body += `<path d="M0 0C${n1(bend * 0.4)} ${n1(headY * 0.4)} ${n1(bend)} ${n1(headY * 0.75)} 0 ${n1(headY)}" stroke="#588a33" stroke-width="4.4" fill="none" stroke-linecap="round"/>`;
    const pal = o.pal || ["#f5a8c7", "#ef92b8", "#f9c6da", "#ea80ac", "#fbd5e4"];
    let head = `<path d="M0 3L0 ${n1(-headLen + 2)}" stroke="#588a33" stroke-width="3.2" stroke-linecap="round"/>`;
    const step = 5.4, rows = Math.floor(headLen / step);
    for (let i = 0; i < rows; i++) {
      const t = i / rows, y = -i * step - 1;
      const w = 12.5 * Math.pow(1 - t, 0.8) * (0.8 + 0.2 * Math.sin(t * 3.4 + 0.4)) + 2.5;
      const n = t < 0.45 ? 4 : t < 0.8 ? 3 : 2;
      const off = (i % 2) * 2.4;
      for (let j = 0; j < n; j++) {
        const x = -w + (2 * w * j) / (n - 1) + off - 1.2 + (r() - 0.5) * 2.4;
        head += `<circle cx="${n1(x)}" cy="${n1(y + (r() - 0.5) * 2)}" r="${n1(4.3 - t * 1.7 + r() * 1.1)}" fill="${pick(r, pal)}" stroke="#dc74a0" stroke-width=".6"/>`;
      }
    }
    head += `<ellipse cx="0" cy="${n1(-headLen - 3)}" rx="3" ry="6.5" fill="#c9c46c"/>`;
    return { body, head, hx: 0, hy: headY, droop: 24 };
  }

  const TULIP_PAL = [["#d6547d", "#e8779a", "#f39cb6"], ["#e2705c", "#ee8f78", "#f7ae98"], ["#df7f9a", "#eea3b8", "#f8c8d6"], ["#c44476", "#dc6893", "#eb8fb0"]];
  function genTulip(r, o) {
    const h = o.h, bend = (r() - 0.5) * 24;
    const [c1, c2, c3] = pick(r, TULIP_PAL);
    let body = blade(h * 0.5, 9, (r() < 0.5 ? -1 : 1) * (10 + r() * 14), "#6a9c45", "#a7d27a", (r() - 0.5) * 20);
    body += `<path d="M0 0Q${n1(bend * 1.2)} ${n1(-h * 0.5)} ${n1(bend)} ${n1(-h)}" stroke="#5e9139" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    const head =
      `<path d="M-10 1C-14 -10 -11 -24 0 -27C11 -24 14 -10 10 1C6 6 -6 6 -10 1Z" fill="${c1}"/>` +
      `<path d="M-12 0C-15 -12 -11 -23 -3 -27C-1 -17 -1 -6 1 4C-5 5 -9 3 -12 0Z" fill="${c2}"/>` +
      `<path d="M12 0C15 -12 11 -23 3 -27C1 -17 1 -6 -1 4C5 5 9 3 12 0Z" fill="${c3}"/>` +
      `<path d="M-7 -5C-8 -11 -6.5 -18 -3.5 -22" stroke="#fff" stroke-width="1.4" fill="none" opacity=".35" stroke-linecap="round"/>`;
    return { body, head, hx: bend, hy: -h, droop: 50 };
  }

  const COSMOS_PAL = [["#f7b8d0", "#e48bb0"], ["#fde9f1", "#e9bcd0"], ["#dcaeea", "#c08ad6"], ["#f49cbb", "#d86e98"]];
  function genCosmos(r, o) {
    const h = o.h, bend = (r() - 0.5) * 36;
    const [fill, edge] = pick(r, COSMOS_PAL);
    const S = [[0, 0], [bend * 0.2, -h * 0.4], [bend * 0.9, -h * 0.7], [bend, -h]];
    let body = `<path d="M0 0C${n1(S[1][0])} ${n1(S[1][1])} ${n1(S[2][0])} ${n1(S[2][1])} ${n1(bend)} ${n1(-h)}" stroke="#6a9a3f" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < 3; k++) {
      const [bx, by] = bez(S, 0.22 + k * 0.2), s = k % 2 ? 1 : -1;
      body += `<path d="M${n1(bx)} ${n1(by)}q${s * 9} -4 ${s * 16} -14M${n1(bx + s * 7)} ${n1(by - 3)}l${s * 3} 6M${n1(bx + s * 11)} ${n1(by - 8)}l${s * 6} 1" stroke="#6a9a3f" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    }
    let head = `<g transform="rotate(${n1(r() * 45)}) scale(1 .88)">`;
    for (let k = 0; k < 8; k++) head += `<path transform="rotate(${k * 45})" d="M0 0C-5.5 -5 -6.5 -15 -3.2 -19.5L0 -17.5L3.2 -19.5C6.5 -15 5.5 -5 0 0Z" fill="${fill}" stroke="${edge}" stroke-width=".7"/>`;
    head += `</g><circle r="4.8" fill="#f1bf4a"/><circle r="4.8" fill="none" stroke="#d99a2e" stroke-width="1.2" stroke-dasharray="1.2 1.6"/>`;
    return { body, head, hx: bend, hy: -h, droop: 55 };
  }

  function genPeony(r, o) {
    const h = o.h;
    let body = blade(h * 0.62, 14, -54, "#5e8e3a", "#94c26a", -8) + blade(h * 0.55, 13, 50, "#4f7f30", "#86b35a", 8);
    body += `<path d="M0 0Q3 ${n1(-h / 2)} 0 ${n1(-h)}" stroke="#5a8a35" stroke-width="3.6" fill="none"/>`;
    const pal = ["#e2699a", "#ef8db3", "#f6b0cb", "#fbd3e3"];
    let head = `<circle r="17" fill="${pal[0]}"/>`;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + r() * 0.3;
      head += `<circle cx="${n1(Math.cos(a) * 11)}" cy="${n1(Math.sin(a) * 10)}" r="${n1(8 + r() * 1.5)}" fill="${pal[1]}" stroke="${pal[0]}" stroke-width=".7"/>`;
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r();
      head += `<circle cx="${n1(Math.cos(a) * 5.5)}" cy="${n1(Math.sin(a) * 5)}" r="6.4" fill="${pal[2]}" stroke="${pal[1]}" stroke-width=".7"/>`;
    }
    head += `<circle r="5" fill="${pal[3]}"/><path d="M-3 -1C-3 -4 3 -4 3 -1" stroke="${pal[1]}" stroke-width="1" fill="none"/>`;
    return { body, head, hx: 0, hy: -h, droop: 30 };
  }

  function genBigLeaf(r, o) {
    const h = o.h, dir = o.dir, len = h * 0.74, wid = 24 + r() * 6;
    let s = `<path d="M0 0Q${dir * 6} ${n1(-h * 0.16)} ${dir * 12} ${n1(-h * 0.28)}" stroke="#4a8537" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
    s += `<g transform="translate(${dir * 12} ${n1(-h * 0.28)}) rotate(${n1(dir * (12 + r() * 10))})">`;
    s += `<path d="M0 0C${n1(wid)} ${n1(-len * 0.25)} ${n1(wid * 1.05)} ${n1(-len * 0.7)} ${dir * 6} ${n1(-len)}C${n1(-wid)} ${n1(-len * 0.72)} ${n1(-wid * 1.02)} ${n1(-len * 0.25)} 0 0Z" fill="#3f7d3c"/>`;
    s += `<path d="M0 0C${n1(-wid)} ${n1(-len * 0.25)} ${n1(-wid * 1.02)} ${n1(-len * 0.72)} ${dir * 6} ${n1(-len)}C${dir * 3} ${n1(-len * 0.6)} 1 ${n1(-len * 0.3)} 0 0Z" fill="#336c35" opacity=".75"/>`;
    let v = "";
    for (let k = 1; k < 8; k++) {
      const t = k / 8, y = -len * t, hw = wid * Math.sin(Math.PI * Math.min(1, t * 1.08)) * 0.92;
      v += `M${n1(dir * 6 * t)} ${n1(y)}Q${n1(hw * 0.5)} ${n1(y - 6)} ${n1(hw)} ${n1(y - 14)}M${n1(dir * 6 * t)} ${n1(y)}Q${n1(-hw * 0.5)} ${n1(y - 6)} ${n1(-hw)} ${n1(y - 14)}`;
    }
    s += `<path d="${v}" stroke="#6aa65a" stroke-width=".9" fill="none" opacity=".55"/>`;
    s += `<path d="M0 0Q${dir * 2} ${n1(-len * 0.5)} ${dir * 6} ${n1(-len)}" stroke="#a6d387" stroke-width="1.6" fill="none"/>`;
    s += `</g>`;
    return { body: s, head: "", hx: 0, hy: 0, droop: 0 };
  }

  function genCroton(r) {
    let s = "";
    const n = 5 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const a = -62 + (124 * k) / (n - 1) + (r() - 0.5) * 10;
      const len = 55 + r() * 45, wid = 10 + r() * 5;
      const fill = pick(r, ["#6d7f2c", "#7a5a2b", "#8b3e2e", "#5d792d", "#9a4a2a"]);
      const d = `M0 0C${n1(wid)} ${n1(-len * 0.3)} ${n1(wid * 0.7)} ${n1(-len * 0.75)} 0 ${n1(-len)}C${n1(-wid * 0.7)} ${n1(-len * 0.75)} ${n1(-wid)} ${n1(-len * 0.3)} 0 0Z`;
      let veins = "";
      for (let v = 1; v < 5; v++) {
        const y = (-len * v) / 5, hw = wid * Math.sin((Math.PI * v) / 5) * 0.85;
        veins += `M0 ${n1(y)}L${n1(hw)} ${n1(y - 7)}M0 ${n1(y)}L${n1(-hw)} ${n1(y - 7)}`;
      }
      s += `<g transform="rotate(${n1(a)})"><path d="${d}" fill="${fill}"/><path d="${veins}" stroke="#d65a3c" stroke-width=".9" fill="none" opacity=".85"/><path d="M0 0L0 ${n1(-len * 0.95)}" stroke="#e9c24f" stroke-width="1.3"/></g>`;
    }
    return { body: s, head: "", hx: 0, hy: 0, droop: 0 };
  }

  function genPuff(r, o) {
    const pal = ["#f2a2c0", "#f7bed3", "#e98bb0", "#fbd2e1", "#f5b0c9"];
    const pts = [];
    for (let k = 0; k < 32; k++) {
      const x = (r() * 2 - 1) * o.w;
      pts.push([x, -r() * o.hh * (1 - (x / o.w) ** 2) - 2, 3.6 + r() * 3.4]);
    }
    pts.sort((a, b) => a[1] - b[1]);
    let s = "";
    for (const [x, y, rad] of pts) s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rad)}" fill="${pick(r, pal)}" stroke="#df7aa3" stroke-width=".5"/>`;
    return { body: s, head: "", hx: 0, hy: 0, droop: 0 };
  }

  function genMushroom(r, o) {
    const h = o.h, cw = o.cw, sw = cw * 0.3, ry = -h * 0.74;
    let s = `<ellipse cx="0" cy="-1" rx="${n1(sw * 1.6)}" ry="${n1(sw * 0.7)}" fill="#ece1d1"/>`;
    s += `<path d="M${n1(-sw)} 0C${n1(-sw * 1.1)} ${n1(-h * 0.35)} ${n1(-sw * 0.8)} ${n1(-h * 0.75)} ${n1(-sw * 0.72)} ${n1(-h)}L${n1(sw * 0.72)} ${n1(-h)}C${n1(sw * 0.8)} ${n1(-h * 0.75)} ${n1(sw * 1.1)} ${n1(-h * 0.35)} ${n1(sw)} 0Z" fill="#f6efe4"/>`;
    s += `<path d="M${n1(sw * 0.25)} 0C${n1(sw * 0.3)} ${n1(-h * 0.4)} ${n1(sw * 0.3)} ${n1(-h * 0.8)} ${n1(sw * 0.3)} ${n1(-h)}L${n1(sw * 0.72)} ${n1(-h)}C${n1(sw * 0.8)} ${n1(-h * 0.75)} ${n1(sw * 1.1)} ${n1(-h * 0.35)} ${n1(sw)} 0Z" fill="#e2d6c4" opacity=".7"/>`;
    s += `<path d="M${n1(-sw * 1.35)} ${n1(ry + 5)}Q0 ${n1(ry - 1)} ${n1(sw * 1.35)} ${n1(ry + 5)}L${n1(sw * 0.8)} ${n1(ry - 2)}Q0 ${n1(ry - 5)} ${n1(-sw * 0.8)} ${n1(ry - 2)}Z" fill="#fbf7f0" stroke="#dccfbb" stroke-width=".6"/>`;
    let cap = `<ellipse cx="0" cy="1.5" rx="${n1(cw * 0.9)}" ry="${n1(cw * 0.16)}" fill="#efdcc4"/>`;
    cap += `<path d="M${-cw} 2C${-cw} ${n1(-cw * 0.62)} ${n1(-cw * 0.46)} ${n1(-cw * 0.9)} 0 ${n1(-cw * 0.9)}C${n1(cw * 0.46)} ${n1(-cw * 0.9)} ${cw} ${n1(-cw * 0.62)} ${cw} 2C${n1(cw * 0.5)} ${n1(cw * 0.18)} ${n1(-cw * 0.5)} ${n1(cw * 0.18)} ${-cw} 2Z" fill="url(#gCap)"/>`;
    for (let k = 0; k < 14; k++) {
      const x = (r() * 2 - 1) * cw * 0.8, y = -r() * cw * 0.8;
      if ((x / cw) ** 2 + (y / (cw * 0.86)) ** 2 > 0.78 || y > -cw * 0.08) continue;
      cap += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(cw * (0.05 + r() * 0.06))}" fill="#fff7ee"/>`;
    }
    cap += `<path d="M${n1(-cw * 0.62)} ${n1(-cw * 0.42)}C${n1(-cw * 0.5)} ${n1(-cw * 0.7)} ${n1(-cw * 0.2)} ${n1(-cw * 0.8)} 0 ${n1(-cw * 0.8)}" stroke="#fff" stroke-width="${n1(cw * 0.07)}" fill="none" opacity=".28" stroke-linecap="round"/>`;
    return { body: s, head: cap, hx: 0, hy: -h, droop: 10 };
  }

  function genGrass(r) {
    let s = "";
    const n = 5 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const x0 = (r() - 0.5) * 12, h = 14 + r() * 22, x1 = x0 + (r() - 0.5) * 22;
      s += `<path d="M${n1(x0)} 0Q${n1(x0 + (x1 - x0) * 0.2)} ${n1(-h * 0.6)} ${n1(x1)} ${n1(-h)}" stroke="${pick(r, ["#6f9b3d", "#86ad4a", "#5b8834"])}" stroke-width="${n1(1.8 + r())}" fill="none" stroke-linecap="round"/>`;
    }
    return { body: s, head: "", hx: 0, hy: 0, droop: 0 };
  }

  function genForget(r) {
    let s = "";
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x = (r() - 0.5) * 26, y = -6 - r() * 16;
      s += `<path d="M${n1(x * 0.4)} 0Q${n1(x * 0.6)} ${n1(y * 0.5)} ${n1(x)} ${n1(y)}" stroke="#6f9b3d" stroke-width="1" fill="none"/>`;
      const col = pick(r, ["#a9b9f3", "#c6b5f1", "#fff4fa"]);
      for (let q = 0; q < 5; q++) {
        const a = (q / 5) * Math.PI * 2;
        s += `<circle cx="${n1(x + Math.cos(a) * 2.3)}" cy="${n1(y + Math.sin(a) * 2.3)}" r="1.9" fill="${col}"/>`;
      }
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="1.1" fill="#f3cf5e"/>`;
    }
    return { body: s, head: "", hx: 0, hy: 0, droop: 0 };
  }

  // цветок, который вырастает на месте сорняка
  function genRose(r, o) {
    const h = o.h, bend = (r() - 0.5) * 14;
    let body = `<path d="M0 0C${n1(bend * 0.3)} ${n1(-h * 0.4)} ${n1(bend)} ${n1(-h * 0.7)} ${n1(bend * 0.8)} ${n1(-h)}" stroke="#4d8a33" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    body += blade(42, 12, -58, "#5b9a3c", "#a3d474", -6, bend * 0.2, -h * 0.36);
    body += blade(36, 10, 60, "#4d8a33", "#90c862", 6, bend * 0.5, -h * 0.6);
    let head = `<circle r="40" fill="url(#gBloom)"/>`;
    for (let k = 0; k < 7; k++) head += `<path transform="rotate(${n1(k * 51.4 + r() * 8)})" d="M0 0C-11 -3 -15 -15 -9 -22C-4 -26 4 -26 9 -22C15 -15 11 -3 0 0Z" fill="#f38db4" stroke="#e06a9a" stroke-width=".7"/>`;
    head += `<circle r="11.5" fill="#f7a8c7"/><circle r="7" fill="#fbc6da"/>`;
    head += `<path d="M-6 -1C-6 -8 6 -8 6 -1C6 5 -3 5 -3 0C-3 -3 2 -3 2 0" stroke="#e06a9a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    return { body, head, hx: bend * 0.8, hy: -h, droop: 20 };
  }

  const GEN = { spike: genSpike, tulip: genTulip, cosmos: genCosmos, peony: genPeony, bigLeaf: genBigLeaf, croton: genCroton, puff: genPuff, mushroom: genMushroom, grass: genGrass, forget: genForget, rose: genRose };

  // задний ряд → передний
  const FLOWER_PLAN = [
    ["bigLeaf", -395, { h: 230, dir: -1 }], ["bigLeaf", -150, { h: 250, dir: 1 }], ["bigLeaf", 250, { h: 240, dir: 1 }], ["bigLeaf", 425, { h: 200, dir: -1 }],
    ["spike", -265, { h: 300 }], ["spike", -12, { h: 350 }], ["spike", 122, { h: 290 }], ["spike", 360, { h: 270 }],
    ["croton", -440, {}], ["croton", 40, {}], ["croton", 448, {}], ["croton", -205, {}],
    ["peony", -178, { h: 95 }], ["peony", 58, { h: 85 }], ["peony", 385, { h: 90 }],
    ["tulip", -410, { h: 130 }], ["tulip", -300, { h: 160 }], ["tulip", -122, { h: 140 }], ["tulip", 10, { h: 175 }], ["tulip", 165, { h: 150 }], ["tulip", 300, { h: 165 }], ["tulip", 452, { h: 120 }],
    ["cosmos", -352, { h: 190 }], ["cosmos", -236, { h: 150 }], ["cosmos", -55, { h: 200 }], ["cosmos", 96, { h: 160 }], ["cosmos", 236, { h: 205 }], ["cosmos", 412, { h: 170 }]
  ];
  const FRONT_PLAN = [
    ["puff", -392, { w: 34, hh: 34 }], ["puff", -252, { w: 40, hh: 30 }], ["puff", -22, { w: 44, hh: 36 }], ["puff", 132, { w: 36, hh: 28 }], ["puff", 284, { w: 42, hh: 34 }], ["puff", 420, { w: 30, hh: 26 }],
    ["mushroom", -432, { h: 34, cw: 16 }], ["mushroom", -322, { h: 62, cw: 24 }], ["mushroom", -140, { h: 96, cw: 34 }], ["mushroom", -96, { h: 40, cw: 17 }], ["mushroom", 30, { h: 58, cw: 22 }], ["mushroom", 206, { h: 88, cw: 31 }], ["mushroom", 332, { h: 46, cw: 19 }], ["mushroom", 462, { h: 30, cw: 13 }]
  ];

  /* =========================================================
     weeds & roots
     ========================================================= */

  function spikyLeaf(len, wid) {
    const n = 5, top = [], bot = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const wv = Math.sin(Math.PI * Math.min(1, t * 1.05)) * wid * (1 - t * 0.2);
      top.push([t * len, -wv * 0.55]);
      bot.push([t * len, wv * 0.55]);
      if (k < n) {
        const tt = (k + 0.6) / n, wt = Math.sin(Math.PI * tt) * wid * (1 - tt * 0.2) * 1.2;
        top.push([tt * len + len * 0.05, -wt]);
        bot.push([tt * len + len * 0.05, wt]);
      }
    }
    return line(top.concat([[len * 1.05, 0]], bot.reverse())) + "Z";
  }

  function weedHead(r) {
    let s = "";
    for (let k = 0; k < 11; k++) {
      const a = (-160 + (140 * k) / 10) / DEG, L = 9 + r() * 7;
      s += `M${n1(Math.cos(a) * 5)} ${n1(Math.sin(a) * 5 - 6)}L${n1(Math.cos(a) * (5 + L))} ${n1(Math.sin(a) * (5 + L) - 6)}`;
    }
    return `<path d="${s}" stroke="#86738f" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="0" cy="-3" rx="7.5" ry="9" fill="#5b5236"/><path d="M-6 -7l12 6M-6 0l12 -6M-5 -11l10 4M-5 3l10 -3" stroke="#7d734f" stroke-width="1"/>`;
  }

  function seedCluster(r) {
    let s = "";
    const n = 4 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = 2 + r() * 5;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.8 - 2;
      s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="1.6" ry="2.7" transform="rotate(${n1(a * DEG)} ${n1(x)} ${n1(y)})" fill="${pick(r, ["#9b8455", "#7f6a41", "#b09a68"])}"/>`;
    }
    return s;
  }

  function buildRoot(r, depth, labelY) {
    const N = 30, ph = r() * 6, amp = 12 + r() * 10, drift = (r() - 0.5) * 50;
    const main = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      main.push([Math.sin(t * 5.2 + ph) * amp * t + drift * t * t, -4 + t * depth]);
    }
    const wMain = (t) => 12 * Math.pow(1 - t, 0.85) + 1.3;
    let polys = taper(main, wMain);
    let glow = line(main);
    let hairs = "";
    const nb = 8 + Math.floor(r() * 3);
    for (let b = 0; b < nb; b++) {
      const t0 = 0.08 + (0.82 * b) / nb + r() * 0.04;
      const S = main[Math.round(t0 * N)];
      const side = b % 2 ? 1 : -1;
      const ang = (90 - side * (38 + r() * 38)) / DEG;
      const L = (70 + r() * 90) * (1 - t0 * 0.45);
      const E = [S[0] + Math.cos(ang) * L, S[1] + Math.sin(ang) * L + L * 0.15];
      const C = [S[0] + Math.cos(ang) * L * 0.5 + (r() - 0.5) * 30, S[1] + Math.sin(ang) * L * 0.5 - 8];
      const pts = qpts(S, C, E, 10);
      const w0 = wMain(t0) * 0.55;
      polys += taper(pts, (t) => lerp(w0, 0.7, t));
      if (b % 2 === 0 || t0 < 0.5) glow += line(pts);
      for (let q = 0; q < 2; q++) {
        const P = pts[3 + q * 3 + Math.floor(r() * 2)];
        const a2 = ang + side * (0.5 + r() * 0.5) * (q ? 1 : -1);
        const L2 = L * (0.28 + r() * 0.2);
        const E2 = [P[0] + Math.cos(a2) * L2, P[1] + Math.sin(a2) * L2 + 6];
        const C2 = [(P[0] + E2[0]) / 2 + (r() - 0.5) * 10, (P[1] + E2[1]) / 2];
        polys += taper(qpts(P, C2, E2, 6), (t) => lerp(w0 * 0.5, 0.45, t));
      }
      for (let hh = 0; hh < 7; hh++) {
        const P = pts[1 + Math.floor(r() * 9)], a3 = r() * Math.PI * 2, l3 = 4 + r() * 6;
        hairs += `M${n1(P[0])} ${n1(P[1])}l${n1(Math.cos(a3) * l3)} ${n1(Math.sin(a3) * l3)}`;
      }
    }
    let ax = 0;
    for (const q of main) if (q[1] <= labelY) ax = q[0];
    const hi = line(main.slice(1, N - 6).map((q) => [q[0] - 2, q[1]]));
    return { polys, glow, hairs, hi, main, anchor: [ax, labelY] };
  }

  /* =========================================================
     gardener
     ========================================================= */

  const SLEEVE = "M-6 -9C6 -17 30 -17 44 -9C51 -5 52 4 46 8C34 14 8 15 -5 9C-11 5 -11 -5 -6 -9Z";
  const SLEEVE_SHADE = "M-5 9C8 15 34 14 46 8C49 6 50 3 50 0C36 6 12 8 -8 4Z";
  function forearm(dark) {
    const sl = dark ? "#e3dae6" : "#fdfaf7", gl = dark ? "#d85a8c" : "#ee6fa0", gl2 = dark ? "#e06a98" : "#f37fab";
    return `<path d="M-2 -6.5C8 -7 18 -6.5 26 -5.5L26 5.5C18 6.5 8 7 -2 6.5Z" fill="${sl}"/>` +
      `<path d="M24 -8L30 -9L30 9L24 8Z" fill="${dark ? "#ece5ee" : "#ffffff"}" stroke="#e2d8e4" stroke-width=".7"/>` +
      `<path d="M28 -7.5C31 -7 34 -6.3 36 -5.6L36 5.6C34 6.3 31 7 28 7.5Z" fill="${gl2}"/>` +
      `<path d="M34 -5.6C40 -5.3 45 -5 49 -4.6L49 4.6C45 5 40 5.3 34 5.6Z" fill="${gl}"/>` +
      `<path d="M47 -5.5C53 -8 61 -7.5 63.5 -3C65.5 1 63.5 6.5 58 7.5C53 8.3 48 6.5 47 4Z" fill="${gl}"/>` +
      `<path d="M51 -6C55 -10 60 -9.5 60.5 -6.5C58 -5.8 55 -5 51 -4Z" fill="${gl2}"/>` +
      (dark ? "" : `<path d="M37 -3.2C42 -3.3 46 -3.1 49 -2.9M55 -2L62 -1M55 2.4L61.5 3.2" stroke="#f9b1cc" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>`);
  }

  const GIRL = `
<g id="gRoot" opacity="0">
  <ellipse cx="-14" cy="1" rx="96" ry="6" fill="#2a1a12" opacity=".2"/>
  <g><g id="gFarU"><path d="${SLEEVE}" fill="#e6dde9"/></g><g id="gFarF">${forearm(true)}</g></g>
  <g>
    <path d="M22 0C20 -9 27 -15 40 -15C52 -15 62 -10 64 -3C64 -1 63 0 61 0Z" fill="#1d1a21"/>
    <path d="M30 -11.5C38 -13.5 48 -13 56 -9" stroke="#57525f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-10 0C-10 -8 0 -12 12 -12L26 -12C24 -8 23 -4 24 0Z" fill="#f3eef3"/>
    <path d="M-14 -42C-4 -48 8 -56 16 -54C28 -46 33 -26 30 -10C28 -3 22 0 14 0L-62 0C-74 0 -79 -11 -71 -19C-58 -30 -36 -38 -14 -42Z" fill="#97aa41"/>
    <path d="M30 -10C28 -3 22 0 14 0L-62 0C-70 0 -74 -4 -74 -8C-50 -6 -10 -6 30 -10Z" fill="#7f9233"/>
    <path d="M-44 -24C-28 -28 -10 -30 8 -32M-20 -12C-6 -14 8 -16 22 -20" stroke="#83963a" stroke-width="1.2" fill="none" opacity=".8" stroke-linecap="round"/>
  </g>
  <g id="gTorso">
    <path d="M-6 -100C-6 -108 -5 -116 -4 -124L6 -124C6 -116 6 -108 6 -100Z" fill="#f0cdbd"/>
    <path d="M-12 -42C-14 -52 -19 -62 -21 -72C-23 -82 -18 -92 -12 -99C-7 -104 0 -106 6 -104C13 -101 17 -94 17 -84C18 -70 17 -56 15 -42Z" fill="#fdfaf7"/>
    <path d="M15 -42C17 -56 18 -70 17 -84C17 -90 15 -95 12 -98C12 -80 10 -60 6 -42Z" fill="#ebe3ed"/>
    <path d="M-19 -74C-16 -70 -12 -68 -8 -68" stroke="#e5dce8" stroke-width="1.2" fill="none"/>
    <circle cx="-17.5" cy="-60" r="1.1" fill="#ddd2e0"/><circle cx="-19.2" cy="-68" r="1.1" fill="#ddd2e0"/>
    <path d="M-13 -47L16 -47L15.5 -41L-12.5 -41Z" fill="#86993a"/>
    <g id="gHead">
      <circle cx="15" cy="-128" r="9" fill="#3a2419"/>
      <circle cx="19" cy="-120.5" r="6.5" fill="#3a2419"/>
      <path d="M11 -134C15 -136 20 -133 21 -128" stroke="#5b3b2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M7 -118C15 -124 17 -140 10 -149C4 -155 -8 -154 -13 -146C-16 -142 -16.5 -138 -16.5 -135C-17 -132 -20 -130 -21.5 -128C-20 -126 -18 -125.5 -17 -125C-17.8 -124 -18 -123 -17 -122C-16.2 -121.5 -16.8 -120.5 -17 -119.5C-16.8 -117 -15.5 -115 -12 -113.5C-8 -112 -3 -113 0 -115Z" fill="#f5d6c8"/>
      <ellipse cx="-10.5" cy="-126.5" rx="4.2" ry="3" fill="#f19aa8" opacity=".5"/>
      <path d="M-14 -134.5Q-11.5 -132.3 -8.5 -133.6" stroke="#3a2419" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M-13 -133.4l-1.2 1.6M-11.2 -132.8l-.8 1.8M-9.4 -133l-.4 1.8" stroke="#3a2419" stroke-width=".8" stroke-linecap="round"/>
      <path d="M-15 -140Q-12 -141.9 -8.5 -140.7" stroke="#4a2e20" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M-17.6 -123.4C-16.4 -124.3 -15 -123.8 -14.4 -122.6C-15.2 -121.3 -16.6 -120.8 -17.4 -121.3C-17.8 -122 -17.9 -122.8 -17.6 -123.4Z" fill="#c93a4c"/>
      <ellipse cx="1" cy="-130" rx="3" ry="4.3" fill="#eec3b2"/>
      <path d="M0 -132.5C1.8 -132 2 -129 .5 -128" stroke="#dca893" stroke-width=".8" fill="none"/>
      <circle cx="1.5" cy="-124.8" r="1.7" fill="#fffaf4" stroke="#e5d8c8" stroke-width=".5"/>
      <path d="M-15 -147C-13 -156 -4 -161 6 -159C16 -157 21 -147 20 -134C19 -126 14 -120 8 -118C9 -124 8 -131 5.5 -136C2 -142 -5 -145 -10 -145C-12.5 -145.2 -14.5 -146 -15 -147Z" fill="#3a2419"/>
      <circle cx="-8" cy="-153" r="6.5" fill="#3a2419"/>
      <path d="M-12 -152C-9 -157 -4 -157 -2 -153M-2 -158C8 -158 16 -152 18 -142M4 -151C10 -149 14 -144 15 -138" stroke="#5b3b2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    </g>
    <path d="M-8 -104L-8 -114Q-6 -117 -3.5 -114.5Q-1 -117.5 1.5 -114.5Q4 -117.5 6.5 -114.5Q8.5 -117 8 -113L8 -103C4 -101 -4 -101 -8 -104Z" fill="#fdfaf7" stroke="#e4dbe6" stroke-width=".7"/>
    <path d="M-10 -103C-14 -94 -16 -84 -21 -75L-16 -76C-13 -86 -11 -95 -8 -103Z" fill="#ee94b9"/>
    <path d="M-9 -103C-10 -95 -9 -87 -11 -79L-7 -80C-6 -88 -6 -96 -7 -103Z" fill="#f3a6c4"/>
    <path d="M-9 -106C-18 -116 -28 -112 -24 -104C-21 -99 -14 -102 -9 -106Z" fill="#f4a9c5"/>
    <path d="M-9 -105C-17 -100 -24 -92 -18 -89C-13 -88 -11 -97 -9 -105Z" fill="#f09dbf"/>
    <path d="M-11 -106C-16 -109 -21 -109 -22 -106" stroke="#e386ad" stroke-width="1" fill="none"/>
    <ellipse cx="-9.5" cy="-105" rx="3.6" ry="3.2" fill="#e389ad"/>
  </g>
  <g><g id="gNearU"><path d="${SLEEVE}" fill="#fdfaf7"/><path d="${SLEEVE_SHADE}" fill="#ebe3ed"/><path d="M41 -8C43 -3 43 3 41 8" stroke="#e2d8e4" stroke-width="1" fill="none"/></g><g id="gNearF">${forearm(false)}</g></g>
</g>`;

  /* =========================================================
     build scene
     ========================================================= */

  const svgBack = $("svgBack"), svgFlowers = $("svgFlowers"), svgWeeds = $("svgWeeds"), svgFront = $("svgFront"), svgGirl = $("svgGirl");
  const SVGS = [svgBack, svgFlowers, svgWeeds, svgFront, svgGirl];

  function slabPath() {
    let d = `M${-EDGE} 0`;
    for (let x = -BED; x <= BED; x += 20) d += `L${x} ${n1(mound(x))}`;
    d += `L${EDGE} 0L${EDGE} ${FLOOR}L${-EDGE} ${FLOOR}Z`;
    return d;
  }
  function band(y, th, seed) {
    const top = [], bot = [];
    for (let x = -SLAB - 20 - GRID; x <= SLAB + 20 + GRID; x += 30) {
      top.push([x, y + 8 * Math.sin(x * 0.011 + seed * 2) + 4 * Math.sin(x * 0.027 + seed)]);
      bot.push([x, y + th + 8 * Math.sin(x * 0.013 + seed * 3) + 3 * Math.sin(x * 0.031 + seed)]);
    }
    return line(top.concat(bot.reverse())) + "Z";
  }

  const flowers = [];
  const rebirth = [];
  const weeds = [];

  function addPlant(parent, kind, x, o, seed, front) {
    const r = makeRng(seed);
    const P = GEN[kind](r, o || {});
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = P.body + (P.head ? `<g class="h" transform="translate(${n1(P.hx)} ${n1(P.hy)})">${P.head}</g>` : "");
    parent.appendChild(g);
    const F = {
      g, h: g.querySelector(".h"), kind, x,
      y: mound(x) + (front ? 5 : 2),
      hx: n1(P.hx), hy: n1(P.hy), droop: P.droop,
      amp: front ? 0.6 + r() * 0.6 : 1.2 + r() * 1.4,
      sp: 0.6 + r() * 0.5, ph: r() * 6.28,
      dir: r() < 0.5 ? -1 : 1, s: 0.94 + r() * 0.12
    };
    return F;
  }

  function buildScene() {
    const r = makeRng(5);
    const slabD = slabPath();

    // ---------- back: небо, почва, мелкие корни ----------
    let speck = "";
    for (let k = 0; k < 16; k++) speck += `<circle cx="${n1(r() * 60)}" cy="${n1(r() * 60)}" r="${n1(0.6 + r() * 1.2)}" fill="${r() < 0.6 ? "#20150d" : "#8a6f58"}" opacity="${n1(0.3 + r() * 0.5)}"/>`;

    // цвет почвы по глубине: верхние слои как были, глубже почва плавно темнеет
    const soil = [[0, "#5e4433"], [0.2, "#43301f"], [0.55, "#4b3223"], [0.85, "#5d3c2a"], [1, "#6a4330"]]
      .map(([o, c]) => [-40 + o * (DEPTH + 40), c])
      .concat([[800, "#664230"], [1000, "#5a3b2b"], [1260, "#4e3427"], [FLOOR, "#452e23"]])
      .map(([y, c]) => `<stop offset="${((y + 40) / (FLOOR + 40)).toFixed(4)}" stop-color="${c}"/>`).join("");

    let b = `<defs>
      <linearGradient id="gSky" gradientUnits="userSpaceOnUse" x1="0" y1="-1300" x2="0" y2="900">
        <stop offset="0" stop-color="#9483bb"/><stop offset=".42" stop-color="#b8a6d4"/><stop offset=".72" stop-color="#d9cbe7"/><stop offset="1" stop-color="#ece2f0"/>
      </linearGradient>
      <radialGradient id="gGlow"><stop offset="0" stop-color="#ffe9f3" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd3e6" stop-opacity=".4"/><stop offset="1" stop-color="#ffd3e6" stop-opacity="0"/></radialGradient>
      <radialGradient id="gHalo"><stop offset="0" stop-color="#fff6fa" stop-opacity=".95"/><stop offset=".5" stop-color="#ffd6e7" stop-opacity=".45"/><stop offset="1" stop-color="#ffc9de" stop-opacity="0"/></radialGradient>
      <linearGradient id="gSoil" gradientUnits="userSpaceOnUse" x1="0" y1="-40" x2="0" y2="${FLOOR}">${soil}</linearGradient>
      <pattern id="pSpeck" width="60" height="60" patternUnits="userSpaceOnUse">${speck}</pattern>
      <clipPath id="cSlab"><path d="${slabD}"/></clipPath>
    </defs>`;
    b += `<rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#gSky)"/>`;
    b += `<circle id="bGlow" cx="0" cy="-220" r="640" fill="url(#gGlow)" opacity="0"/>`;
    b += `<rect id="bGloom" x="-6000" y="-6000" width="12000" height="12000" fill="#2e2640" opacity="0"/>`;
    b += `<circle id="bHalo" cx="${GIRL_HOME}" cy="-150" r="240" fill="url(#gHalo)" opacity="0"/>`;
    b += `<path d="${slabD}" fill="url(#gSoil)"/>`;
    b += `<g clip-path="url(#cSlab)">`;
    [[150, 26, "#34251a", 0.55], [320, 34, "#563a29", 0.5], [470, 52, "#76523a", 0.45],
     [660, 34, "#3e2a1d", 0.5], [820, 60, "#76523a", 0.35], [1010, 42, "#35251a", 0.45], [1200, 76, "#6a4834", 0.3], [1420, 54, "#2f2017", 0.4]].forEach(([y, th, col, op], k) => {
      b += `<path d="${band(y, th, k + 1)}" fill="${col}" opacity="${op}"/>`;
    });
    b += `<rect x="${-EDGE}" y="-60" width="${EDGE * 2}" height="${FLOOR + 60}" fill="url(#pSpeck)" opacity=".6"/>`;
    const STONES = ["#7b6655", "#8c7766", "#6a5646", "#9a8676", "#5e4c3f", "#a08a73"];
    for (let k = 0; k < 64; k++) {
      const x = -SLAB + 10 + r() * (SLAB * 2 - 20), y = 26 + r() * (DEPTH - 50);
      const rx = 2.5 + r() * (4 + (y / DEPTH) * 10), ry = rx * (0.55 + r() * 0.3), rot = n1(r() * 180);
      const col = pick(r, STONES);
      b += `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${rot})"><ellipse rx="${n1(rx)}" ry="${n1(ry)}" fill="${col}"/><ellipse cx="${n1(-rx * 0.25)}" cy="${n1(-ry * 0.3)}" rx="${n1(rx * 0.45)}" ry="${n1(ry * 0.35)}" fill="#fff" opacity=".13"/></g>`;
    }
    // камни в продолжении почвы: свой генератор (середина не меняется), по path на цвет
    const rs = makeRng(606), heap = pathHeap();
    for (let n = 0, tries = 0; n < 330 && tries < 6000; tries++) {
      const x = (rs() * 2 - 1) * (EDGE - 20), y = 26 + rs() * (FLOOR - 80);
      if (Math.abs(x) < SLAB - 10 && y < DEPTH - 24) continue;
      if ((Math.abs(x) > 1600 || y > 1250) && rs() < 0.7) continue;
      const rx = 2.5 + rs() * (4 + Math.min(1.4, y / DEPTH) * 10), ry = rx * (0.55 + rs() * 0.3), rot = rs() * 180;
      const a = rot / DEG, c = Math.cos(a), s = Math.sin(a);
      heap.add(0, x, `fill="${pick(rs, STONES)}"`, ellD(x, y, rx, ry, rot));
      heap.add(1, x, `fill="#fff" opacity=".13"`, ellD(x - 0.25 * rx * c + 0.3 * ry * s, y - 0.25 * rx * s - 0.3 * ry * c, rx * 0.45, ry * 0.35, rot));
      n++;
    }
    b += heap.svg() + `</g>`;
    b += `<path d="M-418 118c6 -6 12 6 18 0s12 6 18 0s12 6 16 2" stroke="#d98d8f" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="-419" cy="118" r="1" fill="#3b2a20"/>`;

    // тонкие корешки цветов
    let fr = "";
    FLOWER_PLAN.forEach(([kind, x], k) => {
      if (kind === "croton" || kind === "bigLeaf") return;
      const y0 = mound(x) + 8;
      for (let q = 0; q < 3; q++) {
        const L = 40 + r() * 70, dx = (r() - 0.5) * 50;
        fr += `M${n1(x + (q - 1) * 3)} ${n1(y0)}q${n1(dx * 0.3)} ${n1(L * 0.5)} ${n1(dx)} ${n1(L)}`;
      }
    });
    b += `<path d="${fr}" stroke="#cbb793" stroke-width="1.1" fill="none" opacity=".3" stroke-linecap="round"/>`;
    // следы вынутых корней + новые здоровые корни
    WEEDS.forEach((w, i) => {
      b += `<path id="ch${i}" d="" stroke="#1d130c" stroke-width="9" fill="none" stroke-linecap="round" opacity="0"/>`;
      let nr = "";
      for (let q = 0; q < 5; q++) {
        const L = 50 + r() * 80, dx = (r() - 0.5) * 70;
        nr += `M${n1(w.x)} ${n1(mound(w.x) + 6)}q${n1(dx * 0.3)} ${n1(L * 0.55)} ${n1(dx)} ${n1(L)}`;
      }
      b += `<path id="nr${i}" d="${nr}" stroke="#bfe08f" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0"/>`;
    });
    b += `<path d="${slabD}" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="3"/>`;
    svgBack.innerHTML = b;

    // ---------- flowers ----------
    svgFlowers.innerHTML = `<defs><radialGradient id="gBloom"><stop offset="0" stop-color="#fff4f9" stop-opacity=".9"/><stop offset=".55" stop-color="#ffc4dc" stop-opacity=".35"/><stop offset="1" stop-color="#ffc4dc" stop-opacity="0"/></radialGradient></defs>`;
    FLOWER_PLAN.forEach(([kind, x, o], k) => flowers.push(addPlant(svgFlowers, kind, x, o, 40 + k * 13, false)));
    WEEDS.forEach((w, i) => {
      const F = addPlant(svgFlowers, "rose", w.x + 6, { h: w.h > 250 ? 245 : 150 }, 400 + i * 7, false);
      F.amp = 1.4;
      F.wi = i;
      rebirth[i] = F;
      flowers.push(F);
    });

    // ---------- weeds with roots ----------
    let defs = "<defs>";
    WEEDS.forEach((w, i) => (defs += `<clipPath id="rc${i}"><rect id="rcr${i}" x="-420" y="-12" width="840" height="0"/></clipPath>`));
    svgWeeds.innerHTML = defs + "</defs>";
    buildMinor();
    WEEDS.forEach((w, i) => weeds.push(buildWeed(i)));

    // ---------- front: мох и грибы ----------
    const rf = makeRng(77), rq = makeRng(78); // rq — только для продолжения мха за клумбой
    const bumps = (x, xEnd, q) => {
      let d = "";
      while (x < xEnd) {
        const nx = Math.min(xEnd, x + 9 + q() * 8);
        const mx = (x + nx) / 2;
        d += `Q${n1(mx)} ${n1(mound(mx) - 9 - q() * 6)} ${n1(nx)} ${n1(mound(nx) - 3)}`;
        x = nx;
      }
      return d;
    };
    const M0 = -SLAB - 10 - GRID, M1 = SLAB + 10 + GRID;
    let moss = `<path d="M${M0} ${n1(mound(M0) + 16)}L${M0} ${n1(mound(M0) - 3)}`;
    moss += bumps(M0, -SLAB - 10, rq);
    moss += bumps(-SLAB - 10, SLAB + 10, rf);
    moss += bumps(SLAB + 10, M1, rq);
    moss += `L${M1} ${n1(mound(M1) + 16)}`;
    for (let x = M1; x >= M0; x -= 30) moss += `L${x} ${n1(mound(x) + 12 + Math.sin(x * 0.07) * 3)}`;
    moss += `Z" fill="#7a9842"/>`;
    let mossShade = "";
    for (let x = M0; x <= M1; x += 30) mossShade += (x === M0 ? "M" : "L") + `${x} ${n1(mound(x) + 3)}`;
    for (let x = M1; x >= M0; x -= 30) mossShade += `L${x} ${n1(mound(x) + 12 + Math.sin(x * 0.07) * 3)}`;
    let dots = "";
    for (let k = 0; k < 170; k++) {
      const dx = -SLAB + rf() * SLAB * 2;
      dots += `<circle cx="${n1(dx)}" cy="${n1(mound(dx) - 4 + rf() * 12)}" r="${n1(0.8 + rf() * 1.6)}" fill="${rf() < 0.5 ? "#a8c264" : "#5e7a31"}"/>`;
    }
    // за краем клумбы — тот же мох, трава и незабудки. Их почти всегда не видно,
    // поэтому они неподвижные и собраны в несколько path
    const turf = pathHeap();
    for (let k = 0; k < 400; k++) {
      const dx = (rq() < 0.5 ? -1 : 1) * (SLAB + rq() * (EDGE - SLAB)), rad = 0.8 + rq() * 1.6;
      turf.add(0, dx, `fill="${rq() < 0.5 ? "#a8c264" : "#5e7a31"}"`, ellD(dx, mound(dx) - 4 + rq() * 12, rad, rad, 0));
    }
    for (let gx = SLAB + 30; gx < EDGE; gx += 46 + rq() * 20) {
      for (const side of [-1, 1]) {
        const X = side * gx + (rq() - 0.5) * 16, Y = mound(X) + 5;
        if (rq() < 0.25) {
          for (let k = 3 + Math.floor(rq() * 3); k > 0; k--) {
            const x = X + (rq() - 0.5) * 26, y = Y - 6 - rq() * 16, col = pick(rq, ["#a9b9f3", "#c6b5f1", "#fff4fa"]);
            turf.add(2, X, `stroke="#6f9b3d" stroke-width="1" fill="none"`, `M${n1(X + (x - X) * 0.4)} ${n1(Y)}Q${n1(X + (x - X) * 0.6)} ${n1((Y + y) / 2)} ${n1(x)} ${n1(y)}`);
            for (let q = 0; q < 5; q++) turf.add(3, X, `fill="${col}"`, ellD(x + Math.cos(q * 1.2566) * 2.3, y + Math.sin(q * 1.2566) * 2.3, 1.9, 1.9, 0));
            turf.add(4, X, `fill="#f3cf5e"`, ellD(x, y, 1.1, 1.1, 0));
          }
        } else {
          for (let k = 5 + Math.floor(rq() * 4); k > 0; k--) {
            const x0 = X + (rq() - 0.5) * 12, h = 14 + rq() * 22, x1 = x0 + (rq() - 0.5) * 22;
            turf.add(1, X, `stroke="${pick(rq, ["#6f9b3d", "#86ad4a", "#5b8834"])}" stroke-width="2.3" fill="none" stroke-linecap="round"`,
              `M${n1(x0)} ${n1(Y)}Q${n1(x0 + (x1 - x0) * 0.2)} ${n1(Y - h * 0.6)} ${n1(x1)} ${n1(Y - h)}`);
          }
        }
      }
    }
    dots += turf.svg();
    svgFront.innerHTML = `<defs><radialGradient id="gCap" cx=".4" cy=".25" r=".9"><stop offset="0" stop-color="#e8604a"/><stop offset=".6" stop-color="#cf4029"/><stop offset="1" stop-color="#a92d1d"/></radialGradient></defs>` +
      moss + `<path d="${mossShade}Z" fill="#5f7b33" opacity=".75"/>` + dots;
    FRONT_PLAN.forEach(([kind, x, o], k) => flowers.push(addPlant(svgFront, kind, x, o, 200 + k * 11, true)));
    for (let k = 0; k < 26; k++) {
      const gx = -SLAB + 14 + (k / 25) * (SLAB * 2 - 28) + (rf() - 0.5) * 20;
      flowers.push(addPlant(svgFront, k % 3 === 0 ? "forget" : "grass", n1(gx), {}, 300 + k, true));
    }

    // ---------- gardener ----------
    svgGirl.innerHTML = GIRL;
  }

  const minor = [];
  function buildMinor() {
    const r = makeRng(4242);
    [-448, -398, -292, -250, -152, -112, -22, 24, 122, 160, 256, 292, 392, 444].forEach((x0) => {
      const x = x0 + (r() - 0.5) * 16;
      let near = 0;
      WEEDS.forEach((w, i) => { if (Math.abs(w.x - x) < Math.abs(WEEDS[near].x - x)) near = i; });
      let d = "", seeds = "";
      const n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const a = (-90 + (r() - 0.5) * 84) / DEG, L = 55 + r() * 115;
        const E = [Math.cos(a) * L, Math.sin(a) * L], C = [E[0] * 0.3 + (r() - 0.5) * 20, E[1] * 0.55];
        d += `M0 0Q${n1(C[0])} ${n1(C[1])} ${n1(E[0])} ${n1(E[1])}`;
        const pts = qpts([0, 0], C, E, 8);
        for (let q = 0; q < 3; q++) {
          const P = pts[3 + q + Math.floor(r() * 2)];
          const a2 = a + (q % 2 ? 1 : -1) * (0.5 + r() * 0.6), L2 = 16 + r() * 30;
          const E2 = [P[0] + Math.cos(a2) * L2, P[1] + Math.sin(a2) * L2];
          d += `M${n1(P[0])} ${n1(P[1])}L${n1(E2[0])} ${n1(E2[1])}`;
          seeds += `<circle cx="${n1(E2[0])}" cy="${n1(E2[1])}" r="${n1(1.3 + r())}"/>`;
        }
        seeds += `<circle cx="${n1(E[0])}" cy="${n1(E[1])}" r="${n1(1.8 + r())}"/>`;
      }
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("opacity", "0");
      g.innerHTML = `<path d="${d}" stroke="${pick(r, ["#8f7b52", "#7f6c48", "#9c875c"])}" stroke-width="1.7" fill="none" stroke-linecap="round"/><g fill="#a8925f">${seeds}</g>`;
      svgWeeds.appendChild(g);
      minor.push({ g, x: n1(x), y: mound(x) + 4, near, ph: r() * 6 });
    });
  }

  function buildWeed(i) {
    const w = WEEDS[i];
    const r = makeRng(700 + i * 37);
    const h = w.h;
    const P3 = [(r() - 0.5) * 34, -h];
    const P1 = [(r() - 0.5) * 34, -h * 0.34];
    const P2 = [P3[0] + (r() - 0.5) * 44, -h * 0.7];
    const stem = [[0, 0], P1, P2, P3];
    const stemD = `M0 0C${n1(P1[0])} ${n1(P1[1])} ${n1(P2[0])} ${n1(P2[1])} ${n1(P3[0])} ${n1(P3[1])}`;

    const branches = [];
    const nb = 9;
    for (let k = 0; k < nb; k++) {
      const t = 0.3 + (0.6 * k) / (nb - 1) + (r() - 0.5) * 0.04;
      const S = bez(stem, t), side = k % 2 ? 1 : -1;
      const ang = (-90 + side * (30 + r() * 30)) / DEG;
      const L = (38 + r() * 46) * (1.15 - t * 0.5);
      const E = [S[0] + Math.cos(ang) * L, S[1] + Math.sin(ang) * L];
      const C = [S[0] + Math.cos(ang) * L * 0.45 + side * 10, S[1] + Math.sin(ang) * L * 0.45 + 8];
      branches.push({ t, d: `M${n1(S[0])} ${n1(S[1])}Q${n1(C[0])} ${n1(C[1])} ${n1(E[0])} ${n1(E[1])}`, E });
    }
    const leaves = [-172, -150, -122, -58, -30, -8].map((a) => ({ a: n1(a + (r() - 0.5) * 12), len: 36 + r() * 22, wid: 11 + r() * 4, tx: 0, ty: 0, t: 0 }));
    [0.22, 0.4, 0.58].forEach((t, k) => {
      const A = bez(stem, t), side = k % 2 ? 1 : -1;
      leaves.push({ a: n1(side > 0 ? -28 - r() * 20 : -152 + r() * 20), len: 24 + r() * 12, wid: 8 + r() * 3, tx: n1(A[0]), ty: n1(A[1]), t });
    });
    let thorns = "";
    for (let k = 0; k < 7; k++) {
      const t = 0.12 + k * 0.1, A = bez(stem, t), B = bez(stem, t + 0.01);
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, s = k % 2 ? 1 : -1;
      thorns += `M${n1(A[0])} ${n1(A[1])}l${n1((-dy / len) * 6 * s + (dx / len) * 3)} ${n1((dx / len) * 6 * s + (dy / len) * 3)}`;
    }
    const root = buildRoot(r, w.depth, w.labelY);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("opacity", "0");
    g.innerHTML =
      `<g clip-path="url(#rc${i})">` +
        `<path class="rg" d="${root.glow}" stroke="#ff6f9f" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".12"/>` +
        `<path class="rg" d="${root.glow}" stroke="#ff9cc0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".2"/>` +
        `<path d="${root.polys}" fill="#e6d5b5" stroke="#9c815b" stroke-width=".8" stroke-linejoin="round"/>` +
        `<path d="${root.hairs}" stroke="#d9c6a2" stroke-width=".7" fill="none" stroke-linecap="round"/>` +
        `<path d="${root.hi}" stroke="#fbf3e4" stroke-width="1.4" fill="none" opacity=".55" stroke-linecap="round"/>` +
      `</g>` +
      `<g class="top">` +
        leaves.map((L) => `<g class="leaf" transform="translate(${L.tx} ${L.ty}) rotate(${L.a}) scale(0)"><path d="${spikyLeaf(L.len, L.wid)}" fill="${L.t ? "#4d5a2a" : "#55602f"}"/><path d="M2 0L${n1(L.len * 0.9)} 0" stroke="#87914f" stroke-width="1"/></g>`).join("") +
        `<path class="stem" d="${stemD}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1" stroke="#4b4128" stroke-width="6" fill="none" stroke-linecap="round" opacity="0"/>` +
        `<path class="th" d="${thorns}" stroke="#574c31" stroke-width="1.6" stroke-linecap="round" opacity="0"/>` +
        branches.map((bb) => `<path class="br" d="${bb.d}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1" stroke="#7d6a44" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0"/>`).join("") +
        branches.map((bb) => `<g class="sd" transform="translate(${n1(bb.E[0])} ${n1(bb.E[1])}) scale(0)">${seedCluster(r)}</g>`).join("") +
        `<g class="hd" transform="translate(${n1(P3[0])} ${n1(P3[1])}) scale(0)">${weedHead(r)}</g>` +
      `</g>` +
      `<circle class="fall" r="4.4" fill="#2d241c" opacity="0"/>`;
    svgWeeds.appendChild(g);

    // канал в почве после корня
    const cy = mound(w.x);
    $("ch" + i).setAttribute("d", line(root.main.map((q) => [w.x + q[0], cy + q[1]])));

    return {
      g, stem, P3, branches, leaves, root, cy,
      top: g.querySelector(".top"),
      stemEl: g.querySelector(".stem"),
      thEl: g.querySelector(".th"),
      brEls: [...g.querySelectorAll(".br")],
      sdEls: [...g.querySelectorAll(".sd")],
      leafEls: [...g.querySelectorAll(".leaf")],
      hdEl: g.querySelector(".hd"),
      fallEl: g.querySelector(".fall"),
      glowEls: [...g.querySelectorAll(".rg")],
      clipEl: $("rcr" + i),
      lastG: -1, ph: r() * 6
    };
  }

  function growWeed(W, g) {
    if (W.lastG === g) return;
    W.lastG = g;
    const gs = range(g, 0.28, 0.8);
    W.stemEl.setAttribute("stroke-dashoffset", f2(1 - gs));
    W.stemEl.setAttribute("opacity", gs > 0 ? 1 : 0);
    W.thEl.setAttribute("opacity", f2(range(g, 0.55, 0.75)));
    W.brEls.forEach((el, k) => {
      const t0 = 0.28 + 0.52 * W.branches[k].t;
      const v = range(g, t0, t0 + 0.2);
      el.setAttribute("stroke-dashoffset", f2(1 - v));
      el.setAttribute("opacity", v > 0 ? 1 : 0);
      const sv = backOut(range(g, t0 + 0.14, t0 + 0.28));
      const E = W.branches[k].E;
      W.sdEls[k].setAttribute("transform", `translate(${n1(E[0])} ${n1(E[1])}) scale(${f2(sv)})`);
    });
    W.leafEls.forEach((el, k) => {
      const L = W.leaves[k];
      const t0 = L.t ? 0.28 + 0.52 * L.t : 0.3 + k * 0.035;
      const v = backOut(range(g, t0, t0 + 0.22));
      el.setAttribute("transform", `translate(${L.tx} ${L.ty}) rotate(${L.a}) scale(${f2(v)})`);
    });
    W.hdEl.setAttribute("transform", `translate(${n1(W.P3[0])} ${n1(W.P3[1])}) scale(${f2(1.35 * backOut(range(g, 0.8, 0.97)))})`);
    W.top.setAttribute("opacity", g > 0.27 ? 1 : 0);
  }

  /* =========================================================
     gardener pose (pure functions)
     ========================================================= */

  const girlBase = (gx) => mound(gx - 40);
  const grabPoint = (w) => [w.x + 4, mound(w.x) + 36];

  function pullPose(k, u) {
    const w = WEEDS[PULL[k]];
    const gxT = w.x + GIRL_DX;
    const prev = k > 0 ? WEEDS[PULL[k - 1]].x + GIRL_DX : gxT;
    const P = { gx: gxT, lean: 61, head: 26, hand: null, handW: 1, bob: 0 };
    const m = k > 0 ? ease(range(u, 0.02, 0.18)) : 1;
    P.gx = lerp(prev, gxT, m);
    P.bob = k > 0 ? Math.sin(m * Math.PI) : 0;
    const G = grabPoint(w);
    const reach = k > 0 ? ease(range(u, 0.16, 0.34)) : 1;
    const lift = ease(range(u, 0.34, 0.66));
    const f = range(u, 0.66, 0.84);
    const back = ease(range(u, 0.84, 1));
    const lifted = [G[0] + 8 * lift, G[1] - 175 * lift];
    if (u < 0.34) {
      P.lean = lerp(10, 61, reach);
      P.head = lerp(12, 26, reach);
      P.hand = G;
      P.handW = reach;
    } else if (u < 0.66) {
      P.lean = lerp(61, 22, lift);
      P.head = lerp(26, 6, lift);
      P.hand = lifted;
    } else if (u < 0.84) {
      const ft = ease(f);
      P.lean = lerp(22, -3, ft);
      P.head = lerp(6, -16, ft);
      const over = [P.gx + 12, girlBase(P.gx) - 215];
      const a = ease(range(f, 0, 0.32));
      P.hand = [lerp(lifted[0], over[0], a), lerp(lifted[1], over[1], a)];
      P.handW = 1 - ease(range(f, 0.32, 1));
    } else {
      P.lean = lerp(-3, 10, back);
      P.head = lerp(-16, 12, back);
      P.hand = null;
      P.handW = 0;
    }
    return P;
  }

  function girlPose(p) {
    const P = { gx: GIRL_HOME, lean: 4, head: 10, hand: null, handW: 0, bob: 0, alpha: smooth(range(p, TL.girlIn[0], TL.girlIn[1])) };
    if (p < TL.dig) return P;
    if (p < TL.pull0) {
      const w = WEEDS[PULL[0]];
      const m = ease(range(p, TL.dig, TL.dig + 0.022));
      P.gx = lerp(GIRL_HOME, w.x + GIRL_DX, m);
      P.bob = Math.sin(m * Math.PI);
      const r = ease(range(p, TL.dig + 0.018, TL.dig + 0.05));
      P.lean = lerp(4, 61, r);
      P.head = lerp(10, 26, r);
      P.hand = grabPoint(w);
      P.handW = r;
      return P;
    }
    if (p < TL.finale) {
      const k = clamp(Math.floor((p - TL.pull0) / TL.pullStep), 0, 5);
      const Q = pullPose(k, range(p, TL.pull0 + k * TL.pullStep, TL.pull0 + (k + 1) * TL.pullStep));
      Q.alpha = 1;
      return Q;
    }
    const e = ease(range(p, TL.finale, TL.finale + 0.03));
    const L = pullPose(5, 1);
    L.lean = lerp(L.lean, 3, e);
    L.head = lerp(L.head, -9, e);
    L.alpha = 1;
    return L;
  }

  function ik(S, T, a, b) {
    const dx = T[0] - S[0], dy = T[1] - S[1];
    const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 1, a + b - 0.3);
    const phi = Math.atan2(dy, dx);
    const a1 = phi - Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const ex = S[0] + a * Math.cos(a1), ey = S[1] + a * Math.sin(a1);
    const a2 = Math.atan2(T[1] - ey, T[0] - ex);
    return { S, a1, ex, ey, a2, hx: ex + b * Math.cos(a2), hy: ey + b * Math.sin(a2) };
  }

  function solveGirl(P) {
    const by = girlBase(P.gx) - 8 * P.bob;
    const th = -P.lean / DEG;
    const c = Math.cos(th), s = Math.sin(th);
    const rot = (x, y) => [2 + (x - 2) * c - (y + 40) * s, -40 + (x - 2) * s + (y + 40) * c];
    const S = rot(4, -93), Sf = rot(8, -91);
    let T = [-52, -30], Tf = [-46, -28];
    if (P.hand && P.handW > 0) {
      const hx = (P.hand[0] - P.gx) / GS, hy = (P.hand[1] - by) / GS;
      T = [lerp(T[0], hx, P.handW), lerp(T[1], hy, P.handW)];
      Tf = [lerp(Tf[0], hx + 5, P.handW), lerp(Tf[1], hy + 3, P.handW)];
    }
    const A = ik(S, T, 50, 56), B = ik(Sf, Tf, 50, 56);
    return { by, A, B, hand: [P.gx + A.hx * GS, by + A.hy * GS] };
  }

  const releaseCache = [];
  function releaseOffset(k) {
    if (!releaseCache[k]) {
      const geo = solveGirl(pullPose(k, 0.66 + 0.3 * 0.18));
      const G = grabPoint(WEEDS[PULL[k]]);
      releaseCache[k] = [geo.hand[0] - G[0], geo.hand[1] - G[1]];
    }
    return releaseCache[k];
  }

  /* =========================================================
     camera
     ========================================================= */

  const CAM = {
    intro: { cx: 0, cy: -150, w: 1000, h: 560, mw: 600 },
    weeds: { cx: 0, cy: -150, w: 1080, h: 640, mw: 720 },
    choke: { cx: 0, cy: -150, w: 940, h: 540, mw: 660 },
    portrait: { cx: GIRL_HOME - 40, cy: -125, w: 560, h: 430, mw: 400 },
    // mcx — центр кадра на телефоне: сдвинут вправо, чтобы садовница у правого края влезла целиком
    reveal: { cx: 0, mcx: 70, cy: 175, w: 1180, h: 860, mw: 950 },
    finale: { cx: 0, cy: -175, w: 1080, h: 660, mw: 680 }
  };
  const mcx = (c) => ("mcx" in c ? c.mcx : c.cx);
  function camRect(p, gx) {
    const pull = { cx: gx - 120, cy: 60, w: 900, h: 760, mw: 640 };
    const K = [
      [0, CAM.intro], [0.05, CAM.intro], [0.1, CAM.weeds], [0.345, CAM.weeds], [0.37, CAM.choke], [0.38, CAM.choke],
      [0.41, CAM.portrait], [0.447, CAM.portrait], [0.495, CAM.reveal], [0.515, CAM.reveal], [0.545, pull],
      [TL.finale, pull], [TL.finale + 0.04, CAM.finale], [1, CAM.finale]
    ];
    for (let k = 0; k < K.length - 1; k++) {
      const [p0, a] = K[k], [p1, b] = K[k + 1];
      if (p <= p1 || k === K.length - 2) {
        const e = ease(range(p, p0, p1));
        return { cx: lerp(a.cx, b.cx, e), mcx: lerp(mcx(a), mcx(b), e), cy: lerp(a.cy, b.cy, e), w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e), mw: lerp(a.mw, b.mw, e) };
      }
    }
  }

  let VW = 1, VH = 1, NARROW = false;
  function sceneArea() {
    const wide = VW / VH > 1.05;
    if (wide && VW >= 900) return { x: VW * 0.37, y: 64, w: VW * 0.61, h: VH - 84, narrow: false };
    if (wide) return { x: VW * 0.38, y: 44, w: VW * 0.6, h: VH - 54, narrow: false };
    return { x: 0, y: VH * 0.3, w: VW, h: VH * 0.68, narrow: true };
  }
  function viewFor(rect) {
    const A = sceneArea();
    const rw = A.narrow ? rect.mw : rect.w;
    const cx = A.narrow ? rect.mcx : rect.cx;
    const s = Math.max(rw / A.w, rect.h / A.h);
    return { x0: cx - (A.x + A.w / 2) * s, y0: rect.cy - (A.y + A.h / 2) * s, s, vw: VW * s, vh: VH * s };
  }

  /* =========================================================
     labels, captions, UI
     ========================================================= */

  const labelsEl = $("labels");
  function mkTag(cls, html) {
    const d = document.createElement("div");
    d.className = "tag " + cls;
    d.innerHTML = html;
    labelsEl.appendChild(d);
    return { el: d, op: -1, x: 0, y: 0, strike: -1, w: 100 };
  }
  const tagsWeed = WEEDS.map((w) => mkTag("tag--weed", `«${w.phrase}»`));
  const tagsRoot = WEEDS.map((w) => mkTag("tag--root", `<span class="k">программа</span><span class="t">«${w.program}»</span>`));
  const tagsTruth = WEEDS.map((w) => mkTag("tag--truth", w.truth));

  // подписи ставятся по важности; те, что налезают на другие или на карточку текста, прячутся
  const tagQueue = [];
  let capRect = null;
  const queueTag = (T, px, py, op, mode, prio) => tagQueue.push({ T, px, py, op, mode, prio });
  function flushTags() {
    tagQueue.sort((a, b) => b.prio - a.prio);
    const placed = capRect ? [capRect] : [];
    for (const q of tagQueue) {
      let op = q.op;
      if (q.px < 6 || q.px > VW - 6) op = 0;
      if (op > 0.01) {
        const T = q.T, cx = clamp(q.px, T.w / 2 + 8, VW - T.w / 2 - 8);
        const top = q.mode === "below" ? q.py + 18 : q.py - T.h;
        const R = { l: cx - T.w / 2 - 2, r: cx + T.w / 2 + 2, t: top - 3, b: top + T.h + 3 };
        if (placed.some((P) => R.l < P.r && R.r > P.l && R.t < P.b && R.b > P.t)) op = 0;
        else placed.push(R);
      }
      placeTag(q.T, q.px, q.py, op, q.mode);
    }
    tagQueue.length = 0;
  }
  function measureCaption() {
    const r = captionEl.getBoundingClientRect();
    capRect = r.width ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null;
  }

  function placeTag(T, px, py, op, mode) {
    if (px < 6 || px > VW - 6) op = 0; // якорь за краем кадра
    op = op < 0.01 ? 0 : op > 0.99 ? 1 : op;
    if (op !== T.op) {
      T.el.style.opacity = op;
      T.op = op;
    }
    if (op === 0) return;
    px = clamp(px, T.w / 2 + 8, VW - T.w / 2 - 8);
    if (Math.abs(px - T.x) > 0.2 || Math.abs(py - T.y) > 0.2) {
      T.x = px;
      T.y = py;
      T.el.style.transform = mode === "below"
        ? `translate3d(${n1(px)}px, ${n1(py)}px, 0) translate(-50%, 18px)`
        : `translate3d(${n1(px)}px, ${n1(py)}px, 0) translate(-50%, -100%)`;
    }
  }

  const dotsEl = $("dots");
  const ICON_WEED = `<svg class="i-weed" viewBox="0 0 16 16"><path d="M8 15V5M8 9.5L4.5 6M8 7.5l3.5-3.5M8 12l3-2" stroke="#e9dccb" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="8" cy="4" r="1.8" fill="#b9a6c4"/></svg>`;
  const ICON_FLOWER = `<svg class="i-flower" viewBox="0 0 16 16"><g fill="#ee8cb4"><circle cx="8" cy="4.6" r="3"/><circle cx="11.4" cy="8" r="3"/><circle cx="8" cy="11.4" r="3"/><circle cx="4.6" cy="8" r="3"/></g><circle cx="8" cy="8" r="2" fill="#f3c450"/></svg>`;
  const dots = WEEDS.map(() => {
    const li = document.createElement("li");
    li.innerHTML = ICON_WEED + ICON_FLOWER;
    dotsEl.appendChild(li);
    return { el: li, state: "" };
  });

  // разворот программы: откуда она взялась у поколения, выросшего в 90-е и 2000-е
  const ROOTS = [
    {
      child: "Девяностые, родители боятся всего: потерять работу, выделиться, привлечь внимание. На школьном концерте ты хочешь спеть соло, а мама шепчет: «Не позорься, стой со всеми». Ответила у доски неправильно — класс смеётся, учительница добавляет: «Умная нашлась».",
      said: ["Не высовывайся", "Будь как все", "Тише едешь — дальше будешь", "Скромность украшает девушку"],
      life: "Ты знаешь ответ на планёрке — и молчишь, пока его не скажет кто-то другой. Не просишь повышения, прячешь свои работы и блог «для себя». Кажется, что просто характер такой. А внутри срабатывает старый сигнал: заметят — будет больно."
    },
    {
      child: "Ты была «слишком»: громкой, чувствительной, медленной — не такой, как двоюродная сестра или девочка из соседнего подъезда. Плакала — «прекрати истерику». Злилась — «девочки так себя не ведут».",
      said: ["Что ты за ребёнок такой", "Вот Катя нормальная, а ты…", "Не реви", "Ты же девочка"],
      life: "Ты всё время себя чинишь: курсы, марафоны, новая жизнь с понедельника. Любая критика ранит в самое сердце, а похвала не засчитывается. Фоном живёт ощущение «со мной что-то не так» — даже когда всё объективно хорошо."
    },
    {
      child: "Принесла пятёрку — «а почему не с плюсом?». Мечтала стать актрисой или открыть свой магазин — «Губу закатай, иди на бухгалтера, это надёжно». Семья жила от зарплаты до зарплаты, и хотеть большего считалось почти неприлично.",
      said: ["Кем ты себя возомнила?", "Не по Сеньке шапка", "Мы люди простые", "Деньги портят людей"],
      life: "Ты годами работаешь за меньшие деньги, чем стоишь, и боишься назвать свою цену. Хорошие отношения, деньги, успех кажутся «не для меня». А когда жизнь даёт больше, приходит тревога — и ты сама откатываешь всё назад."
    },
    {
      child: "Перед гостями — нарядное платье, улыбка и «расскажи стишок». Вышла во двор «не в том» — «переоденься, соседи увидят». В семье важнее было, как всё выглядит снаружи, чем что ты чувствуешь внутри.",
      said: ["Что люди скажут?", "Не позорь нас", "Перед людьми стыдно", "Будь как нормальные люди"],
      life: "Каждое решение проходит через воображаемый совет: мама, коллеги, подруги, бывшие одноклассники. Профессию, мужа, одежду выбираешь так, чтобы не осудили. О своём «хочу» узнаёшь последней — если вообще узнаёшь."
    },
    {
      child: "Тепло приходило, когда ты была «хорошей девочкой»: убрала, помогла, не спорила, не мешала уставшим после смены родителям. Стоило попросить своё или сказать «нет» — обида и молчание на весь вечер.",
      said: ["Не будь эгоисткой", "Уступи, ты же старшая", "Хорошие девочки не спорят", "Не расстраивай маму"],
      life: "Ты угадываешь желания всех вокруг и не знаешь своих. Говоришь «да», когда внутри «нет», а потом злишься на себя. Держишься за отношения и работу, где тебя используют: уйти — значит перестать быть любимой. Остаются усталость и «ничего не хочу», а причину не видно."
    },
    {
      child: "Попробовала сама — отобрали: «Дай сюда, всё испортишь». Взялась за рисование или танцы — сравнили с кем-то талантливее: «Это не твоё». Ошибка в тетради оборачивалась скандалом, поэтому безопаснее было не пробовать вовсе.",
      said: ["У тебя не получится", "Руки не оттуда растут", "Не смеши людей", "Даже не начинай"],
      life: "Ты откладываешь старт, пока «не будешь готова», — и готовой так и не становишься. Десятый курс вместо первого шага, всё должно быть идеально. Со стороны похоже на лень, а на деле это страх снова услышать тот голос из детства."
    }
  ];
  const mapEl = $("map");
  mapEl.innerHTML = WEEDS.map((w, i) => {
    const R = ROOTS[i];
    return `<li><button class="map__head" type="button" aria-expanded="false" aria-controls="root${i}">` +
      `<span><small>сорняк</small><span class="w">«${w.phrase}»</span></span>` +
      `<span><small>корень-программа</small><span class="r">«${w.program}»</span></span>` +
      `<span><small>новый цветок</small><span class="t">${w.truth}</span></span>` +
      `<i class="map__plus" aria-hidden="true"></i></button>` +
      `<div class="map__body" id="root${i}" role="region"><div class="map__in">` +
      `<div><small>как это могло начаться</small><p>${R.child}</p></div>` +
      `<div><small>что говорили ребёнку</small><p class="map__said">${R.said.map((q) => `<span>«${q}»</span>`).join("")}</p></div>` +
      `<div><small>как это управляет жизнью</small><p>${R.life}</p></div>` +
      `</div></div></li>`;
  }).join("");
  // открыт один разворот за раз; при открытии карточка «вздрагивает» импульсом
  mapEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".map__head");
    if (!btn) return;
    const li = btn.parentElement, open = !li.classList.contains("is-open");
    for (const other of mapEl.querySelectorAll(":scope > li.is-open")) {
      other.classList.remove("is-open");
      other.querySelector(".map__head").setAttribute("aria-expanded", "false");
    }
    if (open) {
      li.classList.add("is-open");
      li.classList.remove("is-pulse");
      void li.offsetWidth; // перезапуск анимации
      li.classList.add("is-pulse");
    }
    btn.setAttribute("aria-expanded", String(open));
  });
  mapEl.addEventListener("animationend", (e) => e.target.classList && e.target.classList.remove("is-pulse"));

  const captionEl = $("caption");
  // рамка-лоза вокруг карточки: листья, которые по ходу истории сменяются колючками
  captionEl.innerHTML = `<svg class="vine" aria-hidden="true"></svg><div class="cap-text"></div>`;
  const vineEl = captionEl.firstChild, capText = captionEl.lastChild;
  const NS = "http://www.w3.org/2000/svg", PAD = 9;
  let vineSlots = [], vineKey = "", thornShown = -1;
  function buildVine() {
    const w = captionEl.offsetWidth, h = captionEl.offsetHeight;
    const key = w + "x" + h;
    if (!w || key === vineKey) return;
    vineKey = key;
    const rad = parseFloat(getComputedStyle(captionEl).borderTopLeftRadius) || 22;
    const W = w + PAD * 2, H = h + PAD * 2;
    vineEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    vineEl.setAttribute("width", W);
    vineEl.setAttribute("height", H);
    // контур карточки, по которому вьётся лоза
    const r = Math.min(rad, w / 2, h / 2), x0 = PAD, y0 = PAD, x1 = PAD + w, y1 = PAD + h;
    const guide = document.createElementNS(NS, "path");
    guide.setAttribute("d", `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`);
    vineEl.innerHTML = "";
    vineEl.appendChild(guide);
    const L = guide.getTotalLength();
    const at = (s) => {
      s = ((s % L) + L) % L;
      const a = guide.getPointAtLength(s), b = guide.getPointAtLength((s + 1.5) % L), c = guide.getPointAtLength((s - 1.5 + L) % L);
      const tx = b.x - c.x, ty = b.y - c.y, n = Math.hypot(tx, ty) || 1;
      return { x: a.x, y: a.y, tx: tx / n, ty: ty / n, nx: ty / n, ny: -tx / n };
    };
    // два стебля, переплетающиеся вдоль края
    let d1 = "", d2 = "";
    for (let s = 0; s <= L; s += 4) {
      const q = at(s), o = 1.9 * Math.sin(s / 11);
      d1 += (s ? "L" : "M") + n1(q.x + q.nx * o) + " " + n1(q.y + q.ny * o);
      d2 += (s ? "L" : "M") + n1(q.x - q.nx * o) + " " + n1(q.y - q.ny * o);
    }
    let html = `<path class="vine__stem" d="${d1}Z"/><path class="vine__stem vine__stem--b" d="${d2}Z"/>`;
    const rv = makeRng(31);
    const slots = [];
    for (let s = 6; s < L - 10; s += 17 + rv() * 14) {
      const q = at(s), side = rv() < 0.62 ? 1 : -1;
      const ang = Math.atan2(q.ty, q.tx) * DEG;
      const tilt = (rv() < 0.5 ? 1 : -1);
      const sz = 0.75 + rv() * 0.5;
      const leafA = ang + tilt * 180 * (rv() < 0.5 ? 0 : 1) - side * 38; // лист ложится вдоль лозы
      const thornA = Math.atan2(q.ny * side, q.nx * side) * DEG + (rv() - 0.5) * 50; // колючка торчит наружу или внутрь
      const col = pick(rv, ["#7fae4a", "#6a9c3c", "#94c160"]);
      const bloom = rv() < 0.09;
      html += `<g transform="translate(${n1(q.x + q.nx * side * 1.2)} ${n1(q.y + q.ny * side * 1.2)})">` +
        `<g class="vine__leaf" style="transition-delay:${n1(rv() * 0.35)}s"><g transform="rotate(${n1(leafA)}) scale(${f2(sz)})">` +
        (bloom
          ? `<circle cx="3" cy="-3" r="2.3" fill="#f6a9c6"/><circle cx="6" cy="0" r="2.3" fill="#f6a9c6"/><circle cx="3" cy="3" r="2.3" fill="#f6a9c6"/><circle cx="0" cy="0" r="2.3" fill="#f6a9c6"/><circle cx="3" cy="0" r="1.5" fill="#f3cf5e"/>`
          : `<path d="M0 0C3 -3.4 8.5 -3.8 12 0C8.5 3.8 3 3.4 0 0Z" fill="${col}"/><path d="M1 0L10.5 0" stroke="#dcefc3" stroke-width=".6" opacity=".7"/>`) +
        `</g></g>` +
        `<g class="vine__thorn" style="transition-delay:${n1(rv() * 0.35)}s"><g transform="rotate(${n1(thornA)}) scale(${f2(1 + sz * 0.45)})"><path d="M-1 -2.2L9.5 0L-1 2.2Z" fill="#4a3829"/><path d="M0 -1L7.5 0" stroke="#8a6a52" stroke-width=".5"/></g></g></g>`;
      slots.push({ rank: rv() });
    }
    vineEl.innerHTML = html;
    vineSlots = [...vineEl.querySelectorAll(":scope > g")].map((g, i) => ({ g, rank: slots[i].rank, on: false }));
    thornShown = -1;
  }
  function setThorns(frac) {
    frac = Math.round(frac * 24) / 24;
    if (frac === thornShown) return;
    thornShown = frac;
    captionEl.classList.toggle("is-thorny", frac > 0.3);
    for (const S of vineSlots) {
      const on = S.rank < frac;
      if (on !== S.on) {
        S.on = on;
        S.g.classList.toggle("is-thorn", on);
      }
    }
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { buildVine(); const f = thornShown; thornShown = -1; setThorns(Math.max(0, f)); }).observe(captionEl);
  const stageEl = $("stage");
  function hurt() {
    for (const el of [captionEl, stageEl]) {
      el.classList.remove("is-hurt");
      void el.offsetWidth; // перезапуск анимации
      el.classList.add("is-hurt");
    }
    if (navigator.vibrate && !reduce.matches) navigator.vibrate([18, 40, 26]);
    if (window.KlumbaMusic) window.KlumbaMusic.hurt();
  }
  captionEl.addEventListener("animationend", (e) => { if (e.target === captionEl) captionEl.classList.remove("is-hurt"); });
  let capKey = "";
  function caption(p, st) {
    let key, html;
    if (p < TL.weed0 - 0.006) {
      key = "intro";
      html = `<p class="kicker">с самого начала</p><h1>Представь, что твоя жизнь&nbsp;— клумба.</h1><p class="sub">С рождения в ней растёт живое: смелость, интерес, желание быть собой. Оно цветёт само — если ему не мешать.</p>`;
    } else if (p < TL.choke) {
      const i = clamp(Math.floor((p - TL.weed0 + 0.006) / TL.weedStep), 0, 5);
      key = "w" + i;
      html = `<p class="kicker">чужие слова · 0${i + 1} / 06</p><p class="quote">«${WEEDS[i].phrase}»</p><p class="sub">${i === 0 ? "Чужая фраза падает в землю — и прорастает. " : ""}${WEEDS[i].note}</p>`;
    } else if (p < TL.girlIn[0]) {
      key = "choke";
      html = `<p class="kicker">клумба задыхается</p><h2>Сорняки забирают свет, воду и&nbsp;силу.</h2><p class="sub">Цветы никуда не делись — им просто нечем дышать. Кажется, что проблема в тебе. А она в том, что посадили другие.</p>`;
    } else if (p < TL.dig) {
      key = "girl";
      html = `<p class="kicker">садовница</p><h2>И тогда приходит она.</h2><p class="sub">Она не обрывает листья и не стрижёт верхушки. Она знает: пока корень в земле, сорняк вырастет снова.</p>`;
    } else if (p < TL.pull0) {
      key = "dig";
      html = `<p class="kicker">глубже, чем видно</p><h2>Она опускает руки в&nbsp;землю — к&nbsp;самым корням.</h2><p class="sub">Под каждым сорняком — корень. Это программа: убеждение, которое когда-то приняли за правду. Теперь оно тихо управляет жизнью.</p>`;
    } else if (p < TL.finale) {
      const k = clamp(Math.floor((p - TL.pull0) / TL.pullStep), 0, 5);
      const w = WEEDS[PULL[k]], u = st[PULL[k]].u;
      if (u < 0.64) {
        key = "p" + k;
        html = `<p class="kicker">корень 0${k + 1} / 06</p><span class="label">программа</span><p class="quote quote--small">«${w.program}»</p><p class="sub">Из неё вырос сорняк «${w.phrase}». Садовница тянет — медленно, чтобы вышел весь корень.</p>`;
      } else {
        key = "t" + k;
        html = `<p class="kicker">корень 0${k + 1} выдернут</p><span class="label">на его месте растёт</span><p class="quote quote--small">«${w.truth}»</p><p class="sub">Земля освободилась — и сила, которую забирал сорняк, уходит в новый цветок.</p>`;
      }
    } else {
      key = "fin";
      html = `<p class="kicker">клумба снова живая</p><h2>Это снова твой сад.</h2><p class="sub">Сила, которая уходила на сорняки, возвращается к тебе. Цветы тянутся к свету — и ты тоже.</p><ul class="chips">${WEEDS.map((w) => `<li>${w.truth}</li>`).join("")}</ul>`;
    }
    if (key !== capKey) {
      const prev = capKey;
      capKey = key;
      capText.innerHTML = `<div class="in">${html}</div>`;
      measureCaption();
      // новая чужая фраза бьёт: карточка вздрагивает, сцену сжимает болью
      const wi = key[0] === "w" ? +key.slice(1) : -1;
      const was = prev === "intro" ? -1 : prev[0] === "w" ? +prev.slice(1) : 99;
      if (wi >= 0 && wi > was) hurt();
    }
  }

  /* =========================================================
     particles
     ========================================================= */

  const canvas = $("fx");
  const ctx = canvas.getContext("2d");
  let DPR = 1;
  const parts = [];
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PETALS = ["#f7b8d0", "#fbd3e2", "#ee8cb4", "#ffffff", "#f5a3c4"];
  const CRUMBS = ["#3e2a1c", "#5a4030", "#2d1f15", "#6b4c36"];
  const DARK = hexRgb("#3b3028"), PINK = hexRgb("#f59bbf");
  const acc = {};
  function emitCount(key, rate, dt) {
    acc[key] = Math.max(0, (acc[key] || 0) + rate * dt);
    const n = Math.floor(acc[key]);
    acc[key] -= n;
    return Math.min(n, 40);
  }
  const add = (o) => parts.length < 650 && parts.push(o);

  const butterflies = [
    { ph: 0.3, cx: -160, col: "#f6a5c6", col2: "#fbd9e6" },
    { ph: 2.4, cx: 190, col: "#c9b2f0", col2: "#efe4ff" }
  ];

  function drawFx(v, dt, t, life) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = DPR / v.s;
    ctx.setTransform(k, 0, 0, k, -v.x0 * k, -v.y0 * k);

    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age > q.life) {
        parts.splice(i, 1);
        continue;
      }
      q.vy += (q.g || 0) * dt;
      q.x += q.vx * dt + (q.sway ? Math.sin(q.age * 2.2 + q.ph) * q.sway * dt : 0);
      q.y += q.vy * dt;
      q.rot += (q.vr || 0) * dt;
      const a = Math.min(1, q.age / 0.25) * Math.min(1, (q.life - q.age) / 0.6);
      ctx.globalAlpha = a * (q.alpha || 1);
      if (q.k === "petal") {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.scale(1, 0.55 + 0.45 * Math.sin(q.age * 3 + q.ph));
        ctx.fillStyle = q.col;
        ctx.beginPath();
        ctx.ellipse(0, 0, q.sz, q.sz * 0.6, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
      } else if (q.k === "bloom") {
        const m = Math.min(1, q.age / (q.life * 0.7));
        ctx.fillStyle = `rgb(${Math.round(lerp(DARK[0], PINK[0], m))},${Math.round(lerp(DARK[1], PINK[1], m))},${Math.round(lerp(DARK[2], PINK[2], m))})`;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, q.sz * (0.6 + m), q.sz * (0.6 + m) * (0.6 + 0.4 * m), q.rot, 0, 6.283);
        ctx.fill();
      } else if (q.k === "spark") {
        const s = q.sz * (0.4 + 0.6 * Math.sin((q.age / q.life) * Math.PI));
        ctx.fillStyle = q.col;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y - s);
        ctx.quadraticCurveTo(q.x, q.y, q.x + s, q.y);
        ctx.quadraticCurveTo(q.x, q.y, q.x, q.y + s);
        ctx.quadraticCurveTo(q.x, q.y, q.x - s, q.y);
        ctx.quadraticCurveTo(q.x, q.y, q.x, q.y - s);
        ctx.fill();
      } else {
        ctx.fillStyle = q.col;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.sz, 0, 6.283);
        ctx.fill();
      }
    }

    if (life > 0.02) {
      for (const b of butterflies) {
        const x = b.cx + 260 * Math.sin(t * 0.33 + b.ph) + 50 * Math.sin(t * 1.3 + b.ph * 2);
        const y = -250 + 70 * Math.sin(t * 0.52 + b.ph) + 22 * Math.sin(t * 2.3 + b.ph);
        const dir = Math.cos(t * 0.33 + b.ph) >= 0 ? 1 : -1;
        const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 11 + b.ph));
        ctx.globalAlpha = life;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(dir * 0.25);
        ctx.scale(dir, 1);
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side * flap, 1);
          ctx.fillStyle = b.col;
          ctx.beginPath();
          ctx.ellipse(5, -4, 7, 5, -0.5, 0, 6.283);
          ctx.fill();
          ctx.fillStyle = b.col2;
          ctx.beginPath();
          ctx.ellipse(4, 3.5, 4.5, 3.5, 0.4, 0, 6.283);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#3a2a33";
        ctx.fillRect(-0.9, -6, 1.8, 11);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* =========================================================
     main render
     ========================================================= */

  buildScene();

  const girl = {
    root: $("gRoot"), torso: $("gTorso"), head: $("gHead"),
    nu: $("gNearU"), nf: $("gNearF"), fu: $("gFarU"), ff: $("gFarF")
  };
  const bGlow = $("bGlow"), bGloom = $("bGloom"), bHalo = $("bHalo");
  const hint = $("hint");
  const stageFade = $("stageFade");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let lastFilter = "";
  const cache = new Map();
  function setA(el, name, val) {
    const key = el;
    let m = cache.get(key);
    if (!m) cache.set(key, (m = {}));
    if (m[name] !== val) {
      m[name] = val;
      el.setAttribute(name, val);
    }
  }

  function render(p, t, dt) {
    const still = reduce.matches;
    const tt = still ? 0 : t;

    // ----- состояние сорняков -----
    const st = [];
    let gloomSum = 0;
    for (let i = 0; i < 6; i++) {
      const g = range(p, TL.weed0 + i * TL.weedStep, TL.weed0 + i * TL.weedStep + TL.weedLen);
      const k = PULL_INDEX[i], s0 = TL.pull0 + k * TL.pullStep;
      const u = range(p, s0, s0 + TL.pullStep);
      const S = { g, k, u, lift: ease(range(u, 0.34, 0.66)), f: range(u, 0.66, 0.84), bloom: range(u, 0.8, 1) };
      S.act = g * (1 - smooth(range(u, 0.4, 0.8)));
      gloomSum += S.act;
      st.push(S);
    }
    const gloom = gloomSum / 6;
    const joy = smooth(range(p, TL.finale, TL.finale + 0.04));
    const life = p < TL.girlIn[0] ? clamp(1 - gloom * 1.7, 0, 1) : joy;

    // ----- садовница -----
    const pose = girlPose(p);
    const geo = solveGirl(pose);
    const alpha = pose.alpha;
    setA(girl.root, "opacity", f2(alpha));
    if (alpha > 0) {
      const sc = GS * (0.94 + 0.06 * alpha);
      setA(girl.root, "transform", `translate(${n1(pose.gx)} ${n1(geo.by)}) scale(${f2(sc)})`);
      setA(girl.torso, "transform", `rotate(${f2(-pose.lean)} 2 -40)`);
      setA(girl.head, "transform", `rotate(${f2(-pose.head - Math.sin(tt * 0.8) * 1.2)} 0 -118)`);
      const { A, B } = geo;
      setA(girl.nu, "transform", `translate(${n1(A.S[0])} ${n1(A.S[1])}) rotate(${f2(A.a1 * DEG)})`);
      setA(girl.nf, "transform", `translate(${n1(A.ex)} ${n1(A.ey)}) rotate(${f2(A.a2 * DEG)})`);
      setA(girl.fu, "transform", `translate(${n1(B.S[0])} ${n1(B.S[1])}) rotate(${f2(B.a1 * DEG)})`);
      setA(girl.ff, "transform", `translate(${n1(B.ex)} ${n1(B.ey)}) rotate(${f2(B.a2 * DEG)})`);
    }

    // ----- камера -----
    const v = viewFor(camRect(p, pose.gx));
    const vb = `${n1(v.x0)} ${n1(v.y0)} ${n1(v.vw)} ${n1(v.vh)}`;
    for (const s of SVGS) setA(s, "viewBox", vb);
    const px = (x) => (x - v.x0) / v.s;
    const py = (y) => (y - v.y0) / v.s;

    // ----- небо и почва -----
    setA(bGlow, "opacity", f2(life * 0.85));
    setA(bGloom, "opacity", f2(gloom * 0.5));
    setA(bHalo, "opacity", f2(range(p, 0.385, 0.41) * (1 - range(p, 0.44, 0.47))));
    const filter = `saturate(${f2(1 - 0.62 * gloom + 0.12 * joy)}) brightness(${f2(1 - 0.16 * gloom + 0.03 * joy)})`;
    if (filter !== lastFilter) {
      lastFilter = filter;
      svgFlowers.style.filter = filter;
      svgFront.style.filter = filter;
    }

    // ----- сорняки -----
    const currentK = p >= TL.pull0 && p < TL.finale ? clamp(Math.floor((p - TL.pull0) / TL.pullStep), 0, 5) : -1;
    for (let i = 0; i < 6; i++) {
      const w = WEEDS[i], S = st[i], W = weeds[i];
      growWeed(W, S.g);
      const rr = smooth(range(p, TL.dig + 0.006 + 0.004 * S.k, TL.dig + 0.04 + 0.004 * S.k));
      setA(W.clipEl, "height", n1(10 + rr * (w.depth + 130)));
      const G = grabPoint(w);
      let ox = 0, oy = 0, rot = 0, sc = 1, op = S.g > 0 ? 1 : 0;
      if (S.u >= 0.84) op = 0;
      else if (S.f >= 0.3) {
        const tau = (S.f - 0.3) / 0.7;
        const rel = releaseOffset(S.k);
        ox = rel[0] + 360 * tau;
        oy = rel[1] - 260 * tau + 320 * tau * tau;
        rot = 210 * tau;
        sc = 1 - 0.55 * tau;
        op = 1 - range(tau, 0.45, 1);
      } else if (S.u > 0.34 && S.k === currentK) {
        ox = geo.hand[0] - G[0];
        oy = geo.hand[1] - G[1];
      }
      setA(W.g, "opacity", f2(op));
      if (op > 0) {
        setA(W.g, "transform", `translate(${n1(w.x + ox)} ${n1(W.cy + oy)}) translate(4 36) rotate(${n1(rot)}) scale(${f2(sc)}) translate(-4 -36)`);
        const held = S.u > 0.2 && S.k === currentK;
        const sway = still || held ? 0 : Math.sin(tt * 0.9 + W.ph) * 1.8;
        setA(W.top, "transform", `rotate(${f2(sway)})`);
        const fg = range(S.g, 0, 0.28);
        if (S.g > 0 && S.g < 0.3) {
          setA(W.fallEl, "opacity", "1");
          setA(W.fallEl, "cx", n1(Math.sin(fg * 7) * 12 * (1 - fg)));
          setA(W.fallEl, "cy", n1(lerp(-640, -2, easeIn(fg))));
        } else setA(W.fallEl, "opacity", "0");
        const pulse = 0.5 + 0.5 * Math.sin(tt * 2.2 + i);
        const gl = (1 - S.lift) * (p > TL.dig ? 1 : 0.5);
        setA(W.glowEls[0], "opacity", f2((0.08 + 0.08 * pulse) * gl));
        setA(W.glowEls[1], "opacity", f2((0.14 + 0.1 * pulse) * gl));
      }

      // табличка с чужой фразой
      let tx, ty;
      if (S.g < 0.28) {
        const fg = range(S.g, 0, 0.28);
        tx = w.x + Math.sin(fg * 7) * 12 * (1 - fg);
        ty = W.cy + lerp(-640, -2, easeIn(fg)) - 12;
      } else {
        const tip = bez(W.stem, range(S.g, 0.28, 0.8));
        tx = w.x + ox + tip[0];
        ty = W.cy + oy + tip[1] - (S.g > 0.8 ? 26 : 14);
      }
      const focusW = currentK >= 0 && S.k !== currentK ? 0.6 : 1;
      const prioW = currentK >= 0 ? (S.k === currentK ? 90 : 40 - Math.abs(S.k - currentK)) : p < TL.dig ? 60 + i : 40 - S.k;
      queueTag(tagsWeed[i], px(tx), py(ty), S.g > 0 ? (1 - range(S.u, 0.3, 0.42)) * focusW : 0, "above", prioW);

      // бирка на корне
      const rv = range(p, TL.reveal + 0.005 * S.k, TL.reveal + 0.005 * S.k + 0.012);
      const ro = rv * (1 - range(S.f, 0, 0.28)) * (currentK >= 0 && S.k !== currentK ? (NARROW ? 0.45 : 0.8) : 1);
      queueTag(tagsRoot[i], px(w.x + ox + W.root.anchor[0]), py(W.cy + oy + W.root.anchor[1]), ro, "below", S.k === currentK ? 100 : 50 - Math.abs(S.k - Math.max(0, currentK)));
      if (ro > 0) {
        const strike = f2(range(S.u, 0.46, 0.62));
        if (strike !== tagsRoot[i].strike) {
          tagsRoot[i].strike = strike;
          tagsRoot[i].el.style.setProperty("--strike", strike);
        }
        tagsRoot[i].el.classList.toggle("is-now", S.k === currentK && S.u < 0.66);
      }

      // следы в почве
      setA($("ch" + i), "opacity", f2(0.3 * range(S.u, 0.5, 0.75) * (1 - 0.8 * range(S.u, 0.85, 1))));
      setA($("nr" + i), "opacity", f2(0.7 * range(S.u, 0.85, 1)));

      // точки прогресса
      const ds = S.u > 0.8 ? "is-flower" : S.g > 0.6 ? "is-weed" : "";
      if (ds !== dots[i].state) {
        dots[i].el.className = ds;
        dots[i].state = ds;
      }
    }

    for (const M of minor) {
      const S = st[M.near];
      const grow = smooth(range(S.g, 0.4, 1));
      const die = range(S.u, 0.45, 0.8);
      const val = grow * (1 - die);
      setA(M.g, "opacity", f2(Math.min(1, val * 1.6)));
      if (val <= 0.001) continue;
      const sway = still ? 0 : Math.sin(tt * 1.1 + M.ph) * 2.2;
      setA(M.g, "transform", `translate(${M.x} ${n1(M.y)}) rotate(${f2(sway)}) scale(${f2(0.35 + 0.65 * grow)} ${f2(val)})`);
    }

    // ----- цветы -----
    for (const F of flowers) {
      let wilt = gloom * 0.35;
      for (let i = 0; i < 6; i++) {
        if (st[i].act > 0) {
          const d = (F.x - WEEDS[i].x) / 190;
          wilt += st[i].act * Math.exp(-d * d) * 0.9;
        }
      }
      wilt = Math.min(1, wilt);
      let grow = 1;
      if (F.wi !== undefined) {
        grow = backOut(st[F.wi].bloom);
        wilt = 0;
        if (grow <= 0) {
          setA(F.g, "opacity", "0");
          continue;
        }
        setA(F.g, "opacity", "1");
      }
      const sway = still ? 0 : Math.sin(tt * F.sp + F.ph) * F.amp * (1 - wilt * 0.6);
      const sc = F.s * grow * (1 + 0.07 * joy);
      setA(F.g, "transform", `translate(${F.x} ${n1(F.y)}) rotate(${f2(sway + F.dir * 9 * wilt)}) scale(${f2(sc)} ${f2(sc * (1 - 0.07 * wilt))})`);
      if (F.h) setA(F.h, "transform", `translate(${F.hx} ${F.hy}) rotate(${f2(F.dir * F.droop * wilt + sway * 0.8)})`);
    }

    // новые убеждения на новых цветах
    for (let i = 0; i < 6; i++) {
      const F = rebirth[i], S = st[i];
      const grow = backOut(S.bloom) * F.s * (1 + 0.07 * joy);
      let to = range(S.u, 0.86, 0.97);
      if (NARROW) to *= currentK === S.k ? 1 : 0;
      queueTag(tagsTruth[i], px(F.x + F.hx * grow), py(F.y + (F.hy - 34) * grow), to, "above", S.k === currentK ? 95 : 70 - Math.abs(S.k - Math.max(0, currentK)));
    }
    flushTags();

    // ----- подпись и подсказка -----
    caption(p, st);
    if (window.KlumbaMusic) {
      let pulled = 0;
      for (const S of st) if (S.u > 0.84) pulled++;
      window.KlumbaMusic.frame(p, { gloom, pulled });
    }
    // колючек столько, сколько сорняков сейчас в земле
    let bad = 0;
    for (const S of st) bad += range(S.g, 0.2, 0.5) * (1 - range(S.u, 0.7, 0.9));
    setThorns(bad / 6);
    hint.style.opacity = p < 0.012 ? 1 : 0;
    stageFade.style.opacity = f2(smooth(range(p, 0.965, 1)));

    // ----- частицы -----
    if (!still) {
      let n = emitCount("petal", life * 7, dt);
      while (n--) add({ k: "petal", x: v.x0 + Math.random() * v.vw, y: v.y0 - 20 * v.s, vx: 12 + Math.random() * 22, vy: 22 + Math.random() * 26, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2, sz: 3.5 + Math.random() * 3.5, col: pick(Math.random, PETALS), age: 0, life: 12, ph: Math.random() * 6, sway: 18 });
      for (let i = 0; i < 6; i++) {
        const S = st[i], w = WEEDS[i], W = weeds[i];
        if (S.act > 0.5 && S.u < 0.3) {
          n = emitCount("ash" + i, 1.6, dt);
          while (n--) add({ k: "ash", x: w.x + W.P3[0] + (Math.random() - 0.5) * 40, y: W.cy + W.P3[1] + Math.random() * 40, vx: (Math.random() - 0.5) * 8, vy: -8 - Math.random() * 10, sz: 1.2 + Math.random() * 1.6, col: "#4b4038", alpha: 0.6, age: 0, life: 4 });
        }
        if (S.g > 0.26 && S.g < 0.34) {
          n = emitCount("land" + i, 90, dt);
          while (n--) add({ k: "crumb", x: w.x + (Math.random() - 0.5) * 14, y: W.cy - 2, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 60, g: 420, sz: 1.2 + Math.random() * 1.6, col: pick(Math.random, CRUMBS), age: 0, life: 0.9 });
        }
        if (S.u > 0.36 && S.u < 0.7 && S.k === currentK) {
          n = emitCount("crumb" + i, 55, dt);
          const oy = geo.hand[1] - grabPoint(w)[1];
          while (n--) {
            let x = w.x + (Math.random() - 0.5) * 26, y = W.cy - 3 + Math.random() * 6;
            if (Math.random() < 0.55) {
              const q = W.root.main[Math.floor(Math.random() * W.root.main.length)];
              if (W.cy + oy + q[1] < W.cy) {
                x = w.x + (geo.hand[0] - grabPoint(w)[0]) + q[0];
                y = W.cy + oy + q[1];
              }
            }
            add({ k: "crumb", x, y, vx: (Math.random() - 0.5) * 50, vy: -30 + Math.random() * 30, g: 420, sz: 1.3 + Math.random() * 2.2, col: pick(Math.random, CRUMBS), age: 0, life: 1.4 });
          }
        }
        if (S.f > 0.35 && S.f < 1 && S.u < 0.84) {
          const tau = (S.f - 0.3) / 0.7, rel = releaseOffset(S.k);
          n = emitCount("bloom" + i, 70, dt);
          while (n--) add({ k: "bloom", x: w.x + rel[0] + 360 * tau + (Math.random() - 0.5) * 50, y: W.cy + rel[1] - 260 * tau + 320 * tau * tau + 22 + Math.random() * 80, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, rot: Math.random() * 3, sz: 1.6 + Math.random() * 2, age: 0, life: 2.2 });
        }
        if (S.bloom > 0.05 && S.bloom < 0.6) {
          const F = rebirth[i];
          n = emitCount("spark" + i, 32, dt);
          while (n--) add({ k: "spark", x: F.x + F.hx + (Math.random() - 0.5) * 90, y: F.y + F.hy + (Math.random() - 0.5) * 90, vx: 0, vy: -12, sz: 3 + Math.random() * 4, col: pick(Math.random, ["#ffffff", "#ffd1e3", "#fff0b8"]), age: 0, life: 1 });
        }
      }
      if (p > 0.385 && p < 0.43) {
        n = emitCount("girl", 36, dt);
        while (n--) add({ k: "spark", x: pose.gx - 40 + (Math.random() - 0.5) * 220, y: geo.by - 110 + (Math.random() - 0.5) * 240, vx: 0, vy: -14, sz: 3 + Math.random() * 4.5, col: pick(Math.random, ["#ffffff", "#ffd1e3", "#fff0b8"]), age: 0, life: 1.1 });
      }
      drawFx(v, dt, t, life);
    } else if (parts.length) {
      parts.length = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* =========================================================
     loop
     ========================================================= */

  const track = $("track"), stage = $("stage");

  function resize() {
    VW = stage.clientWidth || innerWidth;
    VH = stage.clientHeight || innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VW * DPR);
    canvas.height = Math.round(VH * DPR);
    NARROW = sceneArea().narrow;
    for (const T of [...tagsWeed, ...tagsRoot, ...tagsTruth]) {
      T.x = T.y = -9999;
      T.w = T.el.offsetWidth;
      T.h = T.el.offsetHeight;
    }
    measureCaption();
  }

  // длина текущего абзаца истории в долях прокрутки
  function beatLen(p) {
    if (p < TL.weed0 - 0.006) return TL.weed0 - 0.006;
    if (p < TL.choke) return TL.weedStep;
    if (p < TL.girlIn[0]) return TL.girlIn[0] - TL.choke;
    if (p < TL.dig) return TL.dig - TL.girlIn[0];
    if (p < TL.pull0) return TL.pull0 - TL.dig;
    if (p < TL.finale) {
      const u = ((p - TL.pull0) % TL.pullStep) / TL.pullStep;
      return TL.pullStep * (u < 0.64 ? 0.64 : 0.36);
    }
    return 1 - TL.finale;
  }

  function scrollTarget() {
    const max = track.offsetHeight - VH;
    return max > 0 ? clamp(-track.getBoundingClientRect().top / max, 0, 1) : 0;
  }

  resize();
  addEventListener("resize", resize);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  let cur = scrollTarget();
  let prev = performance.now();
  function frame(now) {
    const dt = clamp((now - prev) / 1000, 0, 0.05);
    prev = now;
    requestAnimationFrame(frame);
    if (VW < 2 || VH < 2) {
      resize(); // вкладка была скрыта при загрузке
      if (VW < 2 || VH < 2) return;
    }
    const target = scrollTarget();
    if (reduce.matches) cur = target;
    else {
      // история догоняет прокрутку плавно и не быстрее ~одного абзаца за секунду:
      // даже резкий свайп проигрывает каждый кадр, а не перескакивает через текст
      const gap = target - cur;
      const vmax = gap > 0 ? beatLen(cur) / 0.9 : 0.2; // вперёд — абзац не быстрее чем за ~0.9 с

      let d = gap * (1 - Math.pow(0.0015, dt));
      d = clamp(d, -vmax * dt, vmax * dt);
      cur += d;
      if (Math.abs(target - cur) < 0.00004) cur = target;
    }
    render(cur, now / 1000, dt);
  }
  requestAnimationFrame(frame);

  // для проверок: window.__klumba.seek(0.5)
  window.__klumba = {
    seek(p) {
      const max = track.offsetHeight - VH;
      scrollTo(0, track.offsetTop + max * p);
      cur = p;
    },
    get p() { return cur; }
  };
})();
