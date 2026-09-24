/* Клумба — анимированная история на canvas.
   Все тексты — в блоке «ТЕКСТЫ». Ссылка на запись — CONTACT_URL. */
(() => {
  'use strict';

  // ================================================================
  // ТЕКСТЫ
  // ================================================================

  // Ссылка для кнопок «Записаться». Пока пусто — кнопки ведут к финальному блоку.
  const CONTACT_URL = '';

  const STORY = {
    intro: {
      kicker: 'клумба',
      big: 'Внутри тебя — цветущая клумба.',
      sub: 'Смелость, желания, голос, красота — всё это твоё и растёт само. Пока в землю не попадают чужие семена.'
    },
    firstSeed: 'Но однажды прилетает чужое семя.',
    gloom: {
      kicker: 'что происходит',
      big: 'Клумба тускнеет.',
      sub: 'Сорняки забирают свет и воду. Ты вроде бы есть — но тебя не видно. Дело не в тебе. Дело в чужом, что проросло.'
    },
    roots: {
      kicker: 'под землёй',
      big: 'Самое цепкое — не видно.',
      sub: 'Сверху — просто фраза. А в глубине — корень: программа, которая решает за тебя, когда молчать, сжаться и не начинать.'
    },
    enter: {
      kicker: 'садовница',
      big: 'Срезать стебель мало — отрастёт.',
      sub: 'Поэтому она не пропалывает сверху. Она опускает руки в землю — туда, где сидит корень.'
    },
    revival: {
      kicker: 'снова цветёт',
      big: 'Клумба снова твоя.',
      sub: 'Проявляться — не подвиг. Это то, что цветы делают сами, когда им ничего не мешает.'
    }
  };

  // 6 сорняков: фраза на ярлыке, комментарий, корень-программа, что вырастает вместо
  const WEEDS = [
    {
      phrase: '«Не высовывайся»',
      note: 'Сказали один раз — а прорастает каждый раз, когда хочется, чтобы тебя увидели.',
      root: '«Быть заметной — опасно»',
      grow: 'Можно быть заметной.'
    },
    {
      phrase: '«Что люди скажут?»',
      note: 'И вот ты уже выбираешь не то, что хочешь, а то, за что не осудят.',
      root: '«Чужое мнение важнее моего»',
      grow: 'Моё мнение о себе — главное.'
    },
    {
      phrase: '«Кто ты такая, чтобы…»',
      note: '…вести блог, поднять цены, мечтать о большем. Фраза даже не заканчивается — она просто останавливает.',
      root: '«Я не имею права»',
      grow: 'Я имею право.'
    },
    {
      phrase: '«Хорошие девочки так не делают»',
      note: 'Не спорят, не просят, не занимают места. Хорошую девочку ведь не за что оставить.',
      root: '«Любят только удобных»',
      grow: 'Меня можно любить и неудобной.'
    },
    {
      phrase: '«Много о себе возомнила»',
      note: 'Стоит начать расти — и тебе тут же напоминают, где «твоё место».',
      root: '«Хотеть большего — стыдно»',
      grow: 'Хотеть большего — нормально.'
    },
    {
      phrase: '«Тебе нельзя быть такой»',
      note: 'Яркой. Громкой. Смелой. Счастливой. Любой, какой хочется быть.',
      root: '«Настоящую меня не примут»',
      grow: 'Быть собой — безопасно.'
    }
  ];

  // Где растёт каждый сорняк (доля ширины), высота, глубина корня, вид
  const WEED_LOOK = [
    { xf: 0.47, hf: 1.00, rf: 1.00, kind: 'thistle', tag: 0.7 },
    { xf: 0.72, hf: 0.98, rf: 0.86, kind: 'dandelion', tag: 0.68 },
    { xf: 0.22, hf: 1.02, rf: 0.94, kind: 'burdock', tag: 0.72 },
    { xf: 0.60, hf: 0.76, rf: 0.90, kind: 'nettle', tag: 0.42 },
    { xf: 0.86, hf: 0.78, rf: 0.82, kind: 'grass', tag: 0.46 },
    { xf: 0.34, hf: 0.74, rf: 1.00, kind: 'bindweed', tag: 0.4 }
  ];

  // ================================================================
  // УТИЛИТЫ
  // ================================================================
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeOutBack = (t) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const bell = (t) => Math.sin(clamp(t) * Math.PI);
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (c, a = 1) => (a >= 1
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a.toFixed(3)})`);
  const DUST = [138, 124, 106];
  const wither = (c, k) => (k <= 0 ? c : mix(c, mix([(c[0] + c[1] + c[2]) / 3, (c[0] + c[1] + c[2]) / 3, (c[0] + c[1] + c[2]) / 3], DUST, 0.55), clamp(k)));

  // Сглаженная кривая через точки (Catmull-Rom → Bézier)
  function spline(pts, closed) {
    const n = pts.length;
    if (n < 2) return;
    ctx.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const q0 = closed || i > 0 ? p0 : p1;
      const q3 = closed || i + 2 < n ? p3 : p2;
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - q0[0]) / 6, p1[1] + (p2[1] - q0[1]) / 6,
        p2[0] - (q3[0] - p1[0]) / 6, p2[1] - (q3[1] - p1[1]) / 6,
        p2[0], p2[1]
      );
    }
    if (closed) ctx.closePath();
  }
  function fillSpline(pts, color) {
    ctx.beginPath();
    spline(pts, true);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // Сужающаяся «лента» вдоль ломаной (стебли, корни, руки)
  function taper(pts, w0, w1, upto = 1) {
    const n = pts.length;
    if (n < 2) return false;
    let cnt = Math.max(2, Math.ceil(upto * (n - 1)) + 1);
    if (cnt > n) cnt = n;
    const L = [], R = [];
    for (let i = 0; i < cnt; i++) {
      let p = pts[i];
      if (i === cnt - 1 && upto < 1) {
        const f = upto * (n - 1) - (cnt - 2);
        const a = pts[cnt - 2], b = pts[cnt - 1];
        p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const t = i / (n - 1);
      const w = (w0 + (w1 - w0) * t) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    return true;
  }
  function ellipse(x, y, rx, ry, rot, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ================================================================
  // DOM
  // ================================================================
  const story = document.getElementById('story');
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const tagsEl = document.getElementById('tags');
  const rootcard = document.getElementById('rootcard');
  const rootcardText = document.getElementById('rootcardText');
  const rootcardKicker = document.getElementById('rootcardKicker');
  const narration = document.getElementById('narration');
  const hint = document.getElementById('hint');
  const progressBar = document.getElementById('progress');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (CONTACT_URL) {
    document.querySelectorAll('[data-contact]').forEach((a) => {
      a.href = CONTACT_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  // ================================================================
  // ТАЙМЛАЙН (в «шагах» прокрутки)
  // ================================================================
  const TL = {};
  let TOTAL = 0;
  (function buildTimeline() {
    let t = 0;
    const seg = (name, d) => { TL[name] = { a: t, b: t + d, d }; t += d; };
    seg('intro', 1.5);
    for (let i = 0; i < 6; i++) seg('weed' + i, 1.25);
    seg('gloom', 1.15);
    seg('roots', 1.3);
    seg('enter', 1.45);
    for (let k = 0; k < 6; k++) seg('pull' + k, 2.2);
    seg('revival', 1.7);
    seg('outro', 1.1);
    TOTAL = t;
  })();
  const UNIT_VH = 46; // сколько «вьюпорта» прокрутки на один шаг
  story.style.height = (TOTAL * UNIT_VH + 100) + 'vh';
  const loc = (name, U) => (U - TL[name].a) / TL[name].d; // локальный прогресс сегмента (не обрезан)

  // Порядок прополки: справа налево
  const PULL_ORDER = WEED_LOOK.map((w, i) => i).sort((a, b) => WEED_LOOK[b].xf - WEED_LOOK[a].xf);

  // ================================================================
  // НАРРАТИВ (DOM)
  // ================================================================
  const beats = [];
  function addBeat(a, b, html, cls) {
    const el = document.createElement('article');
    el.className = 'beat' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    narration.appendChild(el);
    const beat = { a, b, el, op: -1, ty: 999, vis: false, vars: {} };
    beats.push(beat);
    return beat;
  }
  // неразрывные пробелы: перед тире и после коротких слов (типографика)
  const typo = (t) => t.replace(/ — /g, '\u00A0— ').replace(/(^|[\s«(])([а-яёА-ЯЁ]{1,2}) /g, '$1$2\u00A0');
  const esc = (t) => typo(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const pad = (n) => String(n).padStart(2, '0');
  function bigBeat(seg, d, level) {
    const tag = level === 1 ? 'h1' : 'h2';
    return addBeat(TL[seg].a, TL[seg].b,
      `<p class="kicker">${esc(d.kicker)}</p><${tag} class="big">${esc(d.big)}</${tag}><p class="sub">${esc(d.sub)}</p>`);
  }
  bigBeat('intro', STORY.intro, 1);
  WEEDS.forEach((w, i) => {
    const s = TL['weed' + i];
    if (i === 0) {
      addBeat(s.a, s.b, `<p class="kicker">сорняк 01 из 06</p><h2 class="big">${esc(STORY.firstSeed)}</h2><p class="sub">${esc(w.note)}</p>`);
    } else {
      addBeat(s.a, s.b, `<p class="kicker">сорняк ${pad(i + 1)} из 06</p><p class="mid">${esc(w.note)}</p>`);
    }
  });
  bigBeat('gloom', STORY.gloom);
  bigBeat('roots', STORY.roots);
  bigBeat('enter', STORY.enter);
  const pullBeats = PULL_ORDER.map((wi, k) => {
    const s = TL['pull' + k];
    const w = WEEDS[wi];
    return addBeat(s.a, s.b,
      `<p class="kicker">корень ${pad(k + 1)} из 06</p><p class="old">${esc(w.root)}</p><h2 class="big grow">${esc(w.grow)}</h2>`, 'is-pull');
  });
  addBeat(TL.revival.a, TOTAL + 1,
    `<p class="kicker">${esc(STORY.revival.kicker)}</p><h2 class="big">${esc(STORY.revival.big)}</h2><p class="sub">${esc(STORY.revival.sub)}</p>`);

  // Ярлыки на сорняках
  const tagEls = WEEDS.map((w) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = `${esc(w.phrase)}<span class="strike"></span>`;
    tagsEl.appendChild(el);
    return { el, w: 0, h: 0, cache: '' };
  });
  function measureTags() {
    tagEls.forEach((t) => {
      t.w = t.el.offsetWidth;
      t.h = t.el.offsetHeight;
    });
    rootcard.dataset.w = rootcard.offsetWidth;
  }

  // ================================================================
  // СЦЕНА: размеры и построение
  // ================================================================
  let W = 0, H = 0, DPR = 1, u = 1, G = 0, mobile = false, gsc = 1;
  let bedL = 0, bedR = 0;
  let flowers = [], weeds = [], pebbles = [], specks = [], grass = [], mushrooms = [], hills = [], clouds = [], foliage = [];
  let flowerRootsPath = null, soilPaths = null;

  const groundAt = (x) => G - 9 * u * Math.cos(clamp((x - W / 2) / (W * 0.95), -1, 1) * Math.PI / 2)
    + 2.2 * u * Math.sin(x * 0.021 + 1.3) + 1.2 * u * Math.sin(x * 0.067);

  const PAL = {
    peony: [['#f07aa9', '#f7a9c8', '#ffd7e6'], ['#ff8f86', '#ffb9a8', '#ffe1d6'], ['#f5e6ef', '#fbd0df', '#fff6f9'], ['#d95a95', '#ee8fbb', '#fbc6dd']],
    tulip: [['#ff6f9f', '#ffa6c4'], ['#ffad6b', '#ffd3a6'], ['#b98ae6', '#dcc2f5'], ['#ff8aa0', '#ffc6cf']],
    cosmos: [['#f59ac0', '#e2659b'], ['#fff5f8', '#f1c9da'], ['#e1629c', '#c44983'], ['#c9a2ee', '#a27ad6']],
    lupin: [['#e8649f', '#ffc8de'], ['#a67cdb', '#e0cdf7'], ['#f28cb4', '#fff0f6']],
    allium: [['#b88be3', '#dcc4f6']],
    daisy: [['#fffaf4', '#f3dbe4']],
    bell: [['#a98ce0', '#d6c5f5'], ['#f6a6c9', '#ffd9e8']],
    spray: [['#fff7fb', '#ffd9ea'], ['#f7c6de', '#ffffff'], ['#e5d4fb', '#fff6ff']]
  };
  const LEAF = hex('#6f9e56'), LEAF_D = hex('#4d7c43'), LEAF_L = hex('#8fbd67'), STEM = hex('#5f8c4b');

  function build() {
    const R = mulberry(20260924);
    bedL = mobile ? -0.36 * W : -0.16 * W;
    bedR = mobile ? 1.36 * W : 1.16 * W;
    const bedW = bedR - bedL;

    // ---- цветы
    flowers = [];
    const pick = (arr) => arr[(R() * arr.length) | 0];
    const types = ['peony', 'peony', 'peony', 'tulip', 'tulip', 'cosmos', 'cosmos', 'lupin', 'lupin', 'allium', 'daisy', 'bell', 'spray', 'spray'];
    const addFlower = (x, row, opts = {}) => {
      const type = opts.type || pick(types);
      const tall = type === 'lupin' || type === 'allium';
      const baseH = row === 0 ? (tall ? 200 : 160) : (tall ? 150 : 104);
      const f = {
        x, row, type,
        h0: baseH * (0.75 + R() * 0.45) * u * (opts.hMul || 1) * (mobile ? 1.22 : 1),
        size: (row === 0 ? 1.12 : 1.3) * (0.85 + R() * 0.35) * u * (opts.sMul || 1),
        lean: (R() - 0.5) * 0.28,
        dir: R() < 0.5 ? -1 : 1,
        phase: R() * TAU,
        pal: pick(PAL[type]).map(hex),
        leaves: [],
        delay: 0.15 + Math.abs(x - W / 2) / W * 0.9 + R() * 0.25,
        health: 1,
        bonus: !!opts.bonus,
        reborn: opts.reborn ?? -1,
        bloom: 1
      };
      const nl = 1 + ((R() * 3) | 0);
      for (let j = 0; j < nl; j++) f.leaves.push({ t: 0.12 + j * 0.16 + R() * 0.08, side: j % 2 ? 1 : -1, len: (22 + R() * 16) * u });
      flowers.push(f);
      return f;
    };
    const backStep = (mobile ? 24 : 28) * u;
    for (let x = bedL; x < bedR; x += backStep * (0.7 + R() * 0.6)) addFlower(x, 0);
    const frontStep = (mobile ? 32 : 38) * u;
    for (let x = bedL + 10; x < bedR; x += frontStep * (0.7 + R() * 0.6)) addFlower(x, 1);
    // дополнительные цветы, которые распускаются в финале
    for (let x = bedL + 20; x < bedR; x += frontStep * 1.6 * (0.7 + R() * 0.6)) addFlower(x + R() * 20, 1, { bonus: true, sMul: 1.05 });

    // ---- сорняки
    weeds = WEED_LOOK.map((look, i) => makeWeed(i, look, R));
    // цветы, которые вырастут на месте сорняков
    weeds.forEach((w, i) => {
      const f1 = addFlower(w.x - 4 * u, 1, { type: i % 2 ? 'peony' : 'lupin', hMul: 1.15, sMul: 1.2, reborn: i });
      f1.pal = (i % 2 ? PAL.peony[0] : PAL.lupin[0]).map(hex);
      const f2 = addFlower(w.x + 14 * u, 1, { type: i % 2 ? 'cosmos' : 'tulip', hMul: 0.8, sMul: 1.05, reborn: i });
      f2.delayR = 0.25;
    });
    flowers.sort((a, b) => a.row - b.row);

    // ---- трава
    grass = [];
    for (let x = bedL; x < bedR; x += (mobile ? 11 : 13) * u * (0.6 + R() * 0.8)) {
      const blades = [];
      const n = 3 + ((R() * 3) | 0);
      for (let j = 0; j < n; j++) blades.push({ a: (R() - 0.5) * 1.1, h: (10 + R() * 18) * u, w: (2 + R() * 2) * u });
      grass.push({ x, front: R() < 0.45, blades, phase: R() * TAU, ci: (R() * 3) | 0 });
    }
    // ---- листва: плотная «подушка» клумбы
    foliage = [];
    for (let x = bedL; x < bedR; x += (mobile ? 17 : 20) * u * (0.7 + R() * 0.6)) {
      const n = 4 + ((R() * 4) | 0);
      const back = R() < 0.5;
      for (let j = 0; j < n; j++) {
        foliage.push({
          x: x + (R() - 0.5) * 10 * u, a: (R() - 0.5) * 2.2, len: (back ? 46 : 32) * u * (0.7 + R() * 0.7),
          w: (0.3 + R() * 0.16), c: back ? (R() < 0.5 ? 0 : 1) : 1 + ((R() * 2) | 0), back, phase: R() * TAU
        });
      }
    }
    // ---- грибочки (как в мудборде)
    mushrooms = [];
    const mcount = mobile ? 4 : 6;
    for (let j = 0; j < mcount; j++) {
      const x = lerp(0.08, 0.92, (j + R() * 0.6) / mcount) * W;
      if (weeds.some((w) => Math.abs(w.x - x) < 26 * u)) continue;
      mushrooms.push({ x, s: (0.7 + R() * 0.6) * u, lean: (R() - 0.5) * 0.3, cap: pick(['#e8525f', '#f07a9e', '#e8525f']) });
    }

    // ---- почва
    pebbles = [];
    specks = [];
    const soilArea = (bedR - bedL) * H * 0.7;
    const np = Math.round(soilArea / (mobile ? 5200 : 6500));
    for (let j = 0; j < np; j++) {
      const x = bedL + R() * bedW;
      const d = Math.pow(R(), 0.8);
      pebbles.push({ x, y: groundAt(x) + 14 * u + d * H * 0.62, rx: (2 + R() * 6) * u, ry: (1.5 + R() * 4) * u, rot: R() * 3, c: (R() * 4) | 0 });
    }
    for (let j = 0; j < np * 3; j++) {
      const x = bedL + R() * bedW;
      specks.push({ x, y: groundAt(x) + 6 * u + R() * H * 0.62, s: (0.8 + R() * 1.6) * u, c: R() < 0.5 ? 0 : 1 });
    }
    // статичные пути почвы (крапинки, камешки)
    soilPaths = { specks: [new Path2D(), new Path2D()], pebbles: [new Path2D(), new Path2D(), new Path2D(), new Path2D()], hi: new Path2D() };
    specks.forEach((p) => soilPaths.specks[p.c].rect(p.x, p.y, p.s, p.s));
    pebbles.forEach((p) => {
      const P = soilPaths.pebbles[p.c];
      P.moveTo(p.x + p.rx * Math.cos(p.rot), p.y + p.rx * Math.sin(p.rot));
      P.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, TAU);
      if (p.rx > 4 * u) {
        const hx = p.x - p.rx * 0.3, hy = p.y - p.ry * 0.35;
        soilPaths.hi.moveTo(hx + p.rx * 0.35 * Math.cos(p.rot), hy + p.rx * 0.35 * Math.sin(p.rot));
        soilPaths.hi.ellipse(hx, hy, p.rx * 0.35, p.ry * 0.25, p.rot, 0, TAU);
      }
    });
    // тонкие корешки цветов — один общий путь
    flowerRootsPath = new Path2D();
    flowers.forEach((f) => {
      if (f.bonus || f.reborn >= 0) return;
      const gx = f.x, gy = groundAt(f.x);
      const n = 2 + ((R() * 3) | 0);
      for (let j = 0; j < n; j++) {
        let x = gx, y = gy + 2 * u;
        flowerRootsPath.moveTo(x, y);
        const len = (18 + R() * 34) * u * (f.row ? 1 : 0.8);
        const ang = (R() - 0.5) * 1.2;
        const steps = 4;
        for (let k = 0; k < steps; k++) {
          x += Math.sin(ang + (R() - 0.5) * 0.8) * len / steps;
          y += Math.cos(ang) * len / steps;
          flowerRootsPath.lineTo(x, y);
        }
      }
    });

    // ---- фон: холмы и облака
    hills = [0, 1].map((layer) => ({ layer, amp: (layer ? 42 : 60) * u, ph: R() * 10 }));
    clouds = [];
    for (let j = 0; j < 5; j++) clouds.push({ x: R() * W * 1.4 - W * 0.2, y: (0.08 + R() * 0.3) * G, r: (70 + R() * 90) * u, sp: 3 + R() * 5, a: 0.25 + R() * 0.25 });

    buildKeys();
  }

  // ---------------- сорняк
  function makeWeed(i, look, R) {
    const x = (mobile ? 0.06 + look.xf * 0.88 : look.xf) * W;
    const w = {
      i, look, kind: look.kind, x,
      base: groundAt(x),
      height: (mobile ? 232 : 262) * u * look.hf * (0.95 + R() * 0.1),
      rootDepth: (mobile ? 150 : 205) * u * look.rf,
      lean: (R() - 0.5) * 0.22,
      phase: R() * TAU,
      wob: R() * 10,
      leaves: [], roots: [], thorns: [],
      g: 0, rg: 0, lift: 0, limp: 0, dissolve: 0, presence: 0, highlight: 0,
      grip: null
    };
    // листья
    const k = look.kind;
    if (k === 'dandelion') {
      for (let j = 0; j < 6; j++) {
        w.leaves.push({ t: 0.015 + j * 0.006, side: j % 2 ? 1 : -1, ang: 1.0 + R() * 0.45, len: (70 + R() * 30) * u, wid: 20 * u, shape: 'jagged' });
      }
      w.leaves.push({ t: 0.35, side: 1, ang: 0.5, len: 26 * u, wid: 8 * u, shape: 'jagged' });
    } else {
      const n = k === 'grass' ? 5 : k === 'burdock' ? 4 : 6;
      for (let j = 0; j < n; j++) {
        const t = 0.1 + j * (0.66 / n) + R() * 0.04;
        const shrink = 1 - j / (n + 1) * 0.55;
        const base = { thistle: [62, 23], burdock: [80, 46], nettle: [52, 25], grass: [96, 8], bindweed: [40, 26] }[k];
        w.leaves.push({
          t, side: k === 'nettle' ? (j % 2 ? 1 : -1) : (j % 2 ? 1 : -1),
          ang: (k === 'grass' ? 0.35 : 0.75) + R() * 0.35,
          len: base[0] * u * shrink * (0.9 + R() * 0.2), wid: base[1] * u * shrink,
          shape: { thistle: 'spiny', burdock: 'broad', nettle: 'serrated', grass: 'blade', bindweed: 'arrow' }[k]
        });
        if (k === 'nettle') w.leaves.push({ t: t + 0.01, side: j % 2 ? -1 : 1, ang: 0.8, len: base[0] * u * shrink * 0.9, wid: base[1] * u * shrink * 0.9, shape: 'serrated' });
      }
    }
    w.leaves.forEach((lf) => { lf.path = leafPath(lf.shape, lf.len, lf.wid, R); lf.dark = R() < 0.5; });
    if (k === 'thistle' || k === 'burdock') {
      for (let j = 0; j < 14; j++) w.thorns.push({ t: 0.08 + j * 0.055, side: j % 2 ? 1 : -1 });
    }
    // корень: главный + боковые
    const D = w.rootDepth;
    const main = [[0, 0]];
    let px = 0, py = 0;
    const steps = 16;
    const drift = (R() - 0.5) * 0.5;
    for (let j = 1; j <= steps; j++) {
      py += D / steps;
      px += (R() - 0.5) * 9 * u + drift * 4 * u;
      main.push([px, py]);
    }
    w.roots.push({ pts: main, w0: 12 * u, w1: 1.6 * u, t0: 0, t1: 1, main: true });
    const nb = 6 + ((R() * 3) | 0);
    for (let j = 0; j < nb; j++) {
      const f = 0.12 + (j / nb) * 0.68 + R() * 0.05;
      const idx = Math.round(f * steps);
      const start = main[idx];
      const side = j % 2 ? 1 : -1;
      const len = (0.35 + R() * 0.35) * D * (1 - f * 0.45);
      let ang = side * (0.7 + R() * 0.6);
      const pts = [start.slice()];
      let bx = start[0], by = start[1];
      const bs = 7;
      for (let q = 1; q <= bs; q++) {
        ang += (R() - 0.5) * 0.5 - side * 0.06;
        bx += Math.sin(ang) * len / bs;
        by += Math.cos(ang) * len / bs * 0.8 + 1.2 * u;
        pts.push([bx, by]);
      }
      const mw = 12 * u * (1 - f) + 1.6 * u * f;
      w.roots.push({ pts, w0: mw * 0.62, w1: 0.9 * u, t0: f * 0.8, t1: f * 0.8 + 0.4 });
      // под-корешки
      const sub = pts[3 + ((R() * 2) | 0)];
      const pts2 = [sub.slice()];
      let sx = sub[0], sy = sub[1], sa = ang + side * 0.6 * (R() < 0.5 ? 1 : -1);
      for (let q = 1; q <= 4; q++) {
        sa += (R() - 0.5) * 0.6;
        sx += Math.sin(sa) * len * 0.09;
        sy += Math.cos(sa) * len * 0.09 + 1.5 * u;
        pts2.push([sx, sy]);
      }
      w.roots.push({ pts: pts2, w0: mw * 0.32, w1: 0.6 * u, t0: f * 0.8 + 0.2, t1: f * 0.8 + 0.5 });
    }
    // «волоски»
    w.hairs = [];
    for (let j = 0; j < 22; j++) {
      const f = 0.1 + R() * 0.85;
      const p = main[Math.round(f * steps)];
      w.hairs.push({ f, x: p[0], y: p[1], a: (R() - 0.5) * 2.6, l: (4 + R() * 7) * u });
    }
    // семечко-парашютик
    w.seedFrom = { x: x + (R() - 0.5) * 220 * u, y: -H * 0.25 };
    return w;
  }

  function leafPath(shape, len, wid, R) {
    const p = new Path2D();
    const pts = [];
    if (shape === 'jagged') { // одуванчик: зубцы назад
      const lobes = 5;
      pts.push([0, 0]);
      for (let j = 0; j < lobes; j++) {
        const f = 0.12 + j / lobes * 0.8;
        const wv = wid * (0.55 + 0.45 * Math.sin(f * Math.PI));
        pts.push([-wv, -len * (f - 0.05)]);
        pts.push([-wv * 0.38, -len * (f + 0.07)]);
      }
      pts.push([0, -len]);
      for (let j = lobes - 1; j >= 0; j--) {
        const f = 0.12 + j / lobes * 0.8;
        const wv = wid * (0.55 + 0.45 * Math.sin(f * Math.PI));
        pts.push([wv * 0.38, -len * (f + 0.07)]);
        pts.push([wv, -len * (f - 0.05)]);
      }
    } else if (shape === 'spiny') { // чертополох
      const lobes = 4;
      pts.push([0, 0]);
      for (let j = 0; j < lobes; j++) {
        const f = 0.15 + j / lobes * 0.78;
        const wv = wid * Math.sin((f * 0.9 + 0.08) * Math.PI);
        pts.push([-wv * 1.25, -len * (f + 0.02)]);
        pts.push([-wv * 0.35, -len * (f + 0.1)]);
      }
      pts.push([0, -len * 1.06]);
      for (let j = lobes - 1; j >= 0; j--) {
        const f = 0.15 + j / lobes * 0.78;
        const wv = wid * Math.sin((f * 0.9 + 0.08) * Math.PI);
        pts.push([wv * 0.35, -len * (f + 0.1)]);
        pts.push([wv * 1.25, -len * (f + 0.02)]);
      }
    } else if (shape === 'broad') { // лопух
      const n = 18;
      for (let j = 0; j <= n; j++) {
        const a = (j / n) * Math.PI;
        const r = 1 + 0.07 * Math.sin(j * 2.3);
        pts.push([-Math.sin(a) * wid * r, -len * 0.5 + Math.cos(a) * len * 0.5 * r]);
      }
      for (let j = n - 1; j > 0; j--) {
        const a = (j / n) * Math.PI;
        const r = 1 + 0.07 * Math.sin(j * 1.7 + 1);
        pts.push([Math.sin(a) * wid * r, -len * 0.5 + Math.cos(a) * len * 0.5 * r]);
      }
    } else if (shape === 'serrated') { // крапива
      const n = 16;
      for (let j = 0; j <= n; j++) {
        const f = j / n;
        const wv = wid * Math.sin(Math.pow(f, 0.8) * Math.PI) * (j % 2 ? 0.86 : 1);
        pts.push([-wv, -len * f]);
      }
      for (let j = n - 1; j > 0; j--) {
        const f = j / n;
        const wv = wid * Math.sin(Math.pow(f, 0.8) * Math.PI) * (j % 2 ? 0.86 : 1);
        pts.push([wv, -len * f]);
      }
    } else if (shape === 'blade') { // пырей
      pts.push([-wid * 0.5, 0], [-wid * 0.55, -len * 0.5], [-wid * 0.15, -len * 0.92], [0, -len], [wid * 0.2, -len * 0.9], [wid * 0.55, -len * 0.45], [wid * 0.5, 0]);
    } else { // вьюнок: стрелка
      pts.push([0, 0], [-wid * 0.9, len * 0.12], [-wid * 0.7, -len * 0.2], [-wid * 0.45, -len * 0.55], [0, -len], [wid * 0.45, -len * 0.55], [wid * 0.7, -len * 0.2], [wid * 0.9, len * 0.12]);
    }
    p.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length; j++) p.lineTo(pts[j][0], pts[j][1]);
    p.closePath();
    return p;
  }

  // ================================================================
  // КЛЮЧЕВЫЕ ТОЧКИ: камера и садовница
  // ================================================================
  let camKeys = [];
  let girlSpots = [];
  function buildKeys() {
    gsc = (mobile ? 0.84 : 0.9) * u;
    const reach = 118 * gsc; // расстояние от сорняка до садовницы
    girlSpots = PULL_ORDER.map((wi) => weeds[wi].x + reach);
    const zp = mobile ? 1.3 : 1.14;
    const K = [];
    const key = (t, x, y, z) => K.push({ t, x, y, z });
    const cx = W / 2;
    key(0, cx, G - 0.02 * H, 1.07);
    key(TL.intro.b - 0.2, cx, G, 1.0);
    key(TL.gloom.a, cx, G, 1.0);
    key(TL.gloom.b, cx, G + 0.02 * H, 1.02);
    key(TL.roots.a + 0.8, cx, G + 0.13 * H, 0.86);
    key(TL.roots.b, cx, G + 0.12 * H, 0.88);
    const f0 = focusFor(0);
    key(TL.enter.a + 0.9, f0, G - 0.02 * H, zp);
    for (let k = 0; k < 6; k++) {
      const s = TL['pull' + k].a;
      const fx = focusFor(k);
      if (k > 0) key(s + 0.36, fx, G - 0.02 * H, zp);
      key(s + 0.75, fx, G + 0.06 * H, zp);
      key(s + 0.95, fx, G + 0.06 * H, zp);
      key(s + 1.4, fx - 10 * u, G - (mobile ? 0.07 : 0.1) * H, zp);
      key(s + 1.75, fx - 10 * u, G - (mobile ? 0.07 : 0.1) * H, zp);
      key(s + 2.2, fx, G - 0.02 * H, zp);
    }
    key(TL.revival.a + 1.1, cx, G - 0.01 * H, 1.0);
    key(TL.outro.a + 0.1, cx, G - 0.01 * H, 1.0);
    key(TOTAL, cx, G - 0.3 * H, 1.0);
    camKeys = K;
  }
  function focusFor(k) {
    const w = weeds[PULL_ORDER[k]];
    return w.x + (mobile ? 50 : 42) * u;
  }
  const cam = { x: 0, y: 0, z: 1 };
  function cameraAt(U) {
    const K = camKeys;
    let i = 0;
    while (i < K.length - 1 && K[i + 1].t <= U) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    const t = b.t > a.t ? easeInOut(clamp((U - a.t) / (b.t - a.t))) : 0;
    cam.z = lerp(a.z, b.z, t);
    cam.x = lerp(a.x, b.x, t);
    cam.y = lerp(a.y, b.y, t);
    const half = W / 2 / cam.z;
    cam.x = clamp(cam.x, bedL + half, bedR - half);
  }
  const SX = (x) => (x - cam.x) * cam.z + W / 2;
  const SY = (y) => (y - cam.y) * cam.z + G;

  // ================================================================
  // СОСТОЯНИЕ ПО ПРОКРУТКЕ
  // ================================================================
  const S = {
    mood: 0, glow: 0, time: 0, U: 0,
    girl: { on: 0, x: 0, lean: 0.22, kneel: 0.35, headTilt: 0, hn: [0, 0], hf: [0, 0], grip: 0, eye: 0, smile: 0, bob: 0, holding: -1 },
    pullIdx: -1, pullS: 0, labelWeed: -1, labelA: 0
  };

  // руки лежат на бёдрах (поза «сидит на пятках»)
  function restHands(gx, gy) {
    return {
      n: [gx + (-18) * gsc, gy + (-70) * gsc],
      f: [gx + (-30) * gsc, gy + (-64) * gsc]
    };
  }

  function update(U) {
    S.U = U;
    cameraAt(U);
    // ---- сорняки: рост
    weeds.forEach((w, i) => {
      const s = loc('weed' + i, U);
      w.seed = range(s, 0.0, 0.26);
      w.g = easeOut(range(s, 0.2, 0.82));
      w.rg = easeOut(range(s, 0.24, 1.0));
      w.tagIn = smooth(range(s, 0.5, 0.72));
      w.lift = 0; w.limp = 0; w.dissolve = 0; w.highlight = 0; w.grip = null; w.removal = 0; w.strike = 0;
    });
    // ---- садовница и прополка
    const girl = S.girl;
    const enter = loc('enter', U);
    girl.on = smooth(range(enter, 0.28, 0.72));
    girl.rise = 1 - easeOut(range(enter, 0.28, 0.8));
    girl.eye = 0; girl.smile = 0; girl.headTilt = 0.05; girl.bob = 0; girl.holding = -1;
    S.pullIdx = -1; S.labelWeed = -1; S.labelA = 0;

    let gx = girlSpots[0];
    girl.lean = 0.22; girl.kneel = 0.35; girl.grip = 0;
    let hands = null;

    for (let k = 0; k < 6; k++) {
      const s = (U - TL['pull' + k].a);
      if (s < 0) break;
      const wi = PULL_ORDER[k];
      const w = weeds[wi];
      const done = s >= TL['pull' + k].d;
      const tx = girlSpots[k];
      const gy = groundAt(tx);
      // перемещение
      const m = easeInOut(range(s, 0, 0.36));
      gx = lerp(k === 0 ? girlSpots[0] : girlSpots[k - 1], tx, m);
      girl.bob = 0;
      // наклон и руки
      const reach = easeInOut(range(s, 0.36, 0.84));
      const lift = easeInOut(range(s, 0.95, 1.42));
      const back = easeInOut(range(s, 1.92, 2.2));
      girl.lean = lerp(lerp(0.22, 1.2, reach), 0.1, lift);
      girl.lean = lerp(girl.lean, 0.22, back);
      girl.kneel = lerp(lerp(0.35 + bell(m) * 0.3, 0.12, reach), 1, lift);
      girl.kneel = lerp(girl.kneel, 0.35, back);
      girl.headTilt = lerp(0.08, 0.3, reach) * (1 - lift) + lift * 0.14 * (1 - back);
      girl.grip = range(s, 0.8, 0.94) * (1 - range(s, 1.9, 2.05));

      const crownX = w.x + 4 * u, crownY = w.base;
      const digN = [w.x + 9 * u, w.base + 24 * u], digF = [w.x - 9 * u, w.base + 28 * u];
      const holdY = w.base - (w.rootDepth + 34 * u);
      const holdN = [tx - 116 * gsc, holdY], holdF = [tx - 130 * gsc, holdY + 9 * u];
      const rest = restHands(gx, gy - girl.bob * gsc);
      let hn, hf;
      if (s < 0.95) {
        // руки из покоя вниз, в землю (по дуге)
        const r = reach;
        const arc = (a, b, t, lift0) => {
          const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift0;
          const it = 1 - t;
          return [it * it * a[0] + 2 * it * t * cx + t * t * b[0], it * it * a[1] + 2 * it * t * cy + t * t * b[1]];
        };
        hn = arc(rest.n, digN, r, 40 * u);
        hf = arc(rest.f, digF, r, 40 * u);
        const shake = range(s, 0.84, 0.95) * Math.sin(S.time * 40) * 1.5 * u;
        hn[0] += shake; hf[0] += shake;
      } else {
        const l = lift;
        hn = [lerp(digN[0], holdN[0], l), lerp(digN[1], holdN[1], l)];
        hf = [lerp(digF[0], holdF[0], l), lerp(digF[1], holdF[1], l)];
        // покачивание в руках
        const sw = Math.sin(S.time * 2.2) * 2 * u * range(s, 1.3, 1.5);
        hn[1] += sw; hf[1] += sw;
        if (back > 0) {
          hn = [lerp(hn[0], rest.n[0], back), lerp(hn[1], rest.n[1], back)];
          hf = [lerp(hf[0], rest.f[0], back), lerp(hf[1], rest.f[1], back)];
        }
      }
      hands = { n: hn, f: hf };

      // сорняк
      w.highlight = range(s, 0.5, 0.7) * (1 - range(s, 1.7, 1.95));
      w.lift = lift;
      w.limp = easeInOut(range(s, 1.0, 1.55));
      w.dissolve = easeIn(range(s, 1.66, 2.08));
      w.removal = smooth(range(s, 0.95, 2.0));
      w.strike = easeInOut(range(s, 1.0, 1.35));
      if (s >= 0.95 && !done) {
        const mx = (hn[0] + hf[0]) / 2, my = (hn[1] + hf[1]) / 2;
        w.grip = { x: lerp(crownX, mx - 4 * u, lift), y: lerp(crownY, my + 8 * u, lift), rot: lerp(0, -0.42, lift) + Math.sin(S.time * 1.8) * 0.03 * lift * S.motion };
        girl.holding = wi;
      }
      if (!done) {
        S.pullIdx = k; S.pullS = s;
        S.labelWeed = wi;
        S.labelA = range(s, 0.58, 0.78) * (1 - range(s, 1.75, 1.98));
      }
    }
    girl.x = gx;
    girl.y = groundAt(gx);
    if (!hands) hands = restHands(gx, girl.y - girl.bob * gsc);

    // финал: садовница выпрямляется, смотрит вверх
    const rv = loc('revival', U);
    if (rv > 0) {
      const r = easeInOut(range(rv, 0.05, 0.7));
      girl.lean = lerp(girl.lean, 0.02, r);
      girl.headTilt = lerp(girl.headTilt, -0.34, r);
      girl.eye = r;
      girl.smile = r;
      girl.kneel = lerp(girl.kneel, 0.92, r);
      // ладони у груди — радость
      const chest = [gx - 72 * gsc, girl.y - 196 * gsc];
      hands.n = [lerp(hands.n[0], chest[0], r), lerp(hands.n[1], chest[1], r)];
      hands.f = [lerp(hands.f[0], chest[0] - 10 * gsc, r), lerp(hands.f[1], chest[1] + 4 * gsc, r)];
    }
    girl.hn = hands.n;
    girl.hf = hands.f;

    // ---- в кадре «под землёй» корни мерцают
    const rb = bell(range(U, TL.roots.a + 0.1, TL.roots.b + 0.4));
    if (rb > 0) weeds.forEach((w, i) => { w.highlight = Math.max(w.highlight, rb * (0.45 + 0.2 * Math.sin(S.time * 2.4 + i))); });
    // ---- присутствие сорняков → здоровье клумбы
    let total = 0;
    weeds.forEach((w) => {
      w.presence = w.g * (1 - w.removal);
      total += w.presence;
    });
    S.mood = clamp(total / 5.2);
    S.glow = easeInOut(range(loc('revival', U), 0, 0.8));
    const spread = W * (mobile ? 0.3 : 0.17);
    flowers.forEach((f) => {
      let local = 0;
      for (let i = 0; i < weeds.length; i++) {
        const w = weeds[i];
        if (w.presence <= 0) continue;
        const d = (f.x - w.x) / spread;
        local += w.presence * Math.exp(-d * d);
      }
      const stress = clamp(total * 0.13 + local * 0.6);
      f.health = 1 - stress;
      if (f.reborn >= 0) {
        const s = U - TL['pull' + PULL_ORDER.indexOf(f.reborn)].a;
        f.bloom = easeOut(range(s, 1.72 + (f.delayR || 0), 2.2 + (f.delayR || 0)));
        f.health = 1;
      } else if (f.bonus) {
        f.bloom = easeOut(range(loc('revival', U), 0.1 + (f.x - bedL) / (bedR - bedL) * 0.35, 0.55 + (f.x - bedL) / (bedR - bedL) * 0.35));
      } else {
        f.bloom = 1;
      }
    });
  }

  // ================================================================
  // РИСОВАНИЕ
  // ================================================================
  const SKY = {
    bloom: [hex('#b9a2d8'), hex('#d8c5ec'), hex('#f7dbe8')],
    gloom: [hex('#8d879b'), hex('#aaa3b3'), hex('#c7bfc3')],
    glow: [hex('#c6a4e3'), hex('#efcde6'), hex('#ffe3cf')]
  };
  function skyColors() {
    return [0, 1, 2].map((j) => mix(mix(SKY.bloom[j], SKY.gloom[j], S.mood), SKY.glow[j], S.glow));
  }

  function drawSky() {
    const c = skyColors();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(c[0]));
    g.addColorStop(0.55, rgb(c[1]));
    g.addColorStop(0.72, rgb(c[2]));
    g.addColorStop(1, rgb(c[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // мягкое солнце
    const sx = W * 0.5 + (W / 2 - cam.x) * 0.15;
    const sy = SY(G - 0.33 * H) * 0.6 + G * 0.1;
    const a = 0.55 * (1 - S.mood * 0.85) + S.glow * 0.35;
    const r = Math.max(W, H) * 0.55;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    rg.addColorStop(0, `rgba(255,246,236,${a})`);
    rg.addColorStop(0.35, `rgba(255,228,236,${a * 0.45})`);
    rg.addColorStop(1, 'rgba(255,228,236,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    // облака
    clouds.forEach((cl) => {
      const x = ((cl.x + S.time * cl.sp) % (W * 1.5)) - W * 0.25;
      const y = cl.y;
      const cg = ctx.createRadialGradient(x, y, 0, x, y, cl.r);
      const ca = cl.a * (1 - S.mood * 0.5);
      cg.addColorStop(0, `rgba(255,245,250,${ca})`);
      cg.addColorStop(1, 'rgba(255,245,250,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(x, y, cl.r * 1.6, cl.r * 0.55, 0, 0, TAU);
      ctx.fill();
    });
  }

  function drawHills() {
    const c = skyColors();
    hills.forEach((hl) => {
      const par = hl.layer ? 0.55 : 0.3;
      const base = hl.layer ? G - 30 * u : G - 70 * u;
      const col = hl.layer
        ? mix(mix(hex('#b49bcf'), hex('#8f8a8f'), S.mood), hex('#c7a6d8'), S.glow)
        : mix(mix(hex('#c8b3de'), hex('#a39fac'), S.mood), hex('#dcbfe3'), S.glow);
      ctx.beginPath();
      const x0 = -20, x1 = W + 20;
      ctx.moveTo(x0, H);
      for (let x = x0; x <= x1; x += 12) {
        const wx = (x - W / 2) / (cam.z * par + (1 - par)) + cam.x * par + W / 2 * (1 - par);
        const y = base - hl.amp * (0.55 + 0.25 * Math.sin(wx * 0.004 + hl.ph) + 0.2 * Math.sin(wx * 0.011 + hl.ph * 2));
        const sy = (y - (cam.y * par + G * (1 - par))) * (cam.z * par + (1 - par)) + G;
        ctx.lineTo(x, sy);
      }
      ctx.lineTo(x1, H);
      ctx.closePath();
      ctx.fillStyle = rgb(mix(col, c[2], hl.layer ? 0.15 : 0.35));
      ctx.fill();
    });
  }

  const PEBBLE_C = [hex('#8a6a58'), hex('#6f5446'), hex('#a08472'), hex('#5b463c')], PEBBLE_D = hex('#4a403c');
  function soilColors() {
    const top = mix(mix(hex('#6d4636'), hex('#5a4b45'), S.mood), hex('#77493a'), S.glow);
    const mid = mix(mix(hex('#4b2e24'), hex('#3f332f'), S.mood), hex('#523026'), S.glow);
    const deep = mix(hex('#2a1a15'), hex('#231c1a'), S.mood);
    return { top, mid, deep };
  }

  function drawSoil() {
    const sc = soilColors();
    const x0 = bedL - 40, x1 = bedR + 40;
    ctx.beginPath();
    ctx.moveTo(x0, groundAt(x0));
    for (let x = x0; x <= x1; x += 14) ctx.lineTo(x, groundAt(x));
    ctx.lineTo(x1, G + H * 1.5);
    ctx.lineTo(x0, G + H * 1.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, G - 12 * u, 0, G + H * 0.55);
    g.addColorStop(0, rgb(sc.top));
    g.addColorStop(0.12, rgb(sc.mid));
    g.addColorStop(1, rgb(sc.deep));
    ctx.fillStyle = g;
    ctx.fill();
    // слои
    ctx.lineWidth = 10 * u;
    ctx.strokeStyle = 'rgba(255,220,190,0.035)';
    [0.16, 0.34].forEach((f, j) => {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 20) {
        const y = G + f * H + Math.sin(x * 0.006 + j * 2) * 12 * u + Math.sin(x * 0.019) * 5 * u;
        if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    // крапинки
    const spc = [rgb(mix(sc.top, [255, 230, 200], 0.18), 0.5), rgb(mix(sc.deep, [0, 0, 0], 0.3), 0.6)];
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = spc[c];
      ctx.fill(soilPaths.specks[c]);
    }
    // камешки
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = rgb(mix(PEBBLE_C[c], PEBBLE_D, S.mood * 0.5));
      ctx.fill(soilPaths.pebbles[c]);
    }
    ctx.fillStyle = 'rgba(255,235,215,0.18)';
    ctx.fill(soilPaths.hi);
    // корешки цветов
    ctx.lineWidth = 1.3 * u;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(mix(hex('#e9d3b4'), hex('#9b8b7c'), S.mood), 0.28);
    ctx.stroke(flowerRootsPath);
    // червячок
    drawWorm();
    // тёмная кромка под поверхностью
    ctx.beginPath();
    ctx.moveTo(x0, groundAt(x0));
    for (let x = x0; x <= x1; x += 14) ctx.lineTo(x, groundAt(x));
    ctx.lineWidth = 5 * u;
    ctx.strokeStyle = rgb(mix(sc.top, [40, 20, 15], 0.35));
    ctx.stroke();
  }

  function drawWorm() {
    const t = S.time * 0.35;
    const baseX = W * 0.32 + Math.sin(t * 0.5) * 60 * u;
    const baseY = G + 0.2 * H;
    const pts = [];
    for (let j = 0; j < 9; j++) {
      const f = j / 8;
      pts.push([baseX + f * 46 * u, baseY + Math.sin(f * 5 + t * 5) * 4 * u + f * 6 * u]);
    }
    ctx.beginPath();
    taper(pts, 7 * u, 5.5 * u);
    ctx.fillStyle = rgb(mix(hex('#e39a9a'), hex('#9d8584'), S.mood));
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,50,50,0.35)';
    ctx.lineWidth = 0.8 * u;
    for (let j = 1; j < 8; j++) {
      const p = pts[j];
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - 3 * u);
      ctx.lineTo(p[0], p[1] + 3 * u);
      ctx.stroke();
    }
  }

  // ---------------- корень сорняка
  function rootPoints(w, br) {
    if (!w.grip) return br.pts;
    // висящий корень: боковые корни опускаются
    const k = w.lift;
    return br.pts.map((p) => [p[0] * (1 - 0.3 * k), p[1] + Math.abs(p[0]) * 0.25 * k]);
  }
  function drawRoot(w, alpha = 1) {
    if (w.rg <= 0.001) return;
    const d = w.dissolve;
    const col = mix(mix(hex('#d7b98a'), hex('#c9a878'), S.mood), hex('#6e5c4c'), d);
    const edge = mix(hex('#7b5a37'), hex('#3d3129'), d);
    // подсветка
    if (w.highlight > 0.01) {
      ctx.save();
      ctx.shadowColor = `rgba(255,120,190,${0.85 * w.highlight})`;
      ctx.shadowBlur = 18 * u * cam.z;
      ctx.beginPath();
      w.roots.forEach((br) => {
        const vis = range(w.rg, br.t0, br.t1);
        if (vis > 0) taper(rootPoints(w, br), br.w0 + 3 * u, br.w1 + 2 * u, vis);
      });
      ctx.fillStyle = `rgba(255,170,210,${0.55 * w.highlight * alpha})`;
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    w.roots.forEach((br) => {
      const vis = range(w.rg, br.t0, br.t1);
      if (vis > 0) taper(rootPoints(w, br), br.w0, br.w1, vis);
    });
    ctx.fillStyle = rgb(col, alpha);
    ctx.fill();
    ctx.lineWidth = 1.1 * u;
    ctx.strokeStyle = rgb(edge, 0.55 * alpha);
    ctx.stroke();
    // волоски
    ctx.beginPath();
    w.hairs.forEach((h) => {
      if (h.f > w.rg) return;
      const p = w.grip ? [h.x * (1 - 0.3 * w.lift), h.y] : [h.x, h.y];
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + Math.sin(h.a) * h.l, p[1] + Math.cos(h.a) * h.l * 0.6);
    });
    ctx.lineWidth = 0.9 * u;
    ctx.strokeStyle = rgb(col, 0.6 * alpha);
    ctx.stroke();
    // светлая жилка на главном корне
    const main = w.roots[0];
    ctx.beginPath();
    taper(rootPoints(w, main).map((p) => [p[0] - 1.5 * u, p[1]]), main.w0 * 0.3, 0.3 * u, w.rg * 0.85);
    ctx.fillStyle = rgb(mix(col, [255, 250, 235], 0.45), 0.6 * alpha);
    ctx.fill();
  }

  // ---------------- стебель сорняка
  function weedStem(w, t) {
    const N = 22;
    const pts = [[0, 0]];
    const angs = [w.lean * 0.3];
    let x = 0, y = 0;
    const L = w.height;
    const sway = Math.sin(t * 1.15 + w.phase) * 0.035 + Math.sin(t * 2.7 + w.wob) * 0.01;
    for (let j = 1; j <= N; j++) {
      const s = j / N;
      const th = w.lean * s + sway * s + Math.sin(s * 5 + w.wob) * 0.05 + - w.limp * 2.6 * s * s;
      x += Math.sin(th) * L / N;
      y -= Math.cos(th) * L / N;
      pts.push([x, y]);
      angs.push(th);
    }
    return { pts, angs, N };
  }
  function stemAt(stem, s) {
    const f = clamp(s) * stem.N;
    const i = Math.min(stem.N - 1, Math.floor(f));
    const r = f - i;
    const a = stem.pts[i], b = stem.pts[i + 1];
    return { x: a[0] + (b[0] - a[0]) * r, y: a[1] + (b[1] - a[1]) * r, a: stem.angs[i] + (stem.angs[i + 1] - stem.angs[i]) * r };
  }

  const WEED_C = {
    stem: hex('#44503a'), leaf: hex('#4d5e39'), leaf2: hex('#3e4d31'), vein: hex('#2c3823'),
    thistle: hex('#8b6f9c'), fluff: hex('#e9e5dc'), burr: hex('#6a5b47'), catkin: hex('#7b8656'), trumpet: hex('#e7e2ea')
  };

  function drawWeedBody(w, stem, alpha) {
    const d = w.dissolve;
    const dead = (c) => mix(c, hex('#5b4a3d'), d * 0.9);
    const g = w.g;
    if (g <= 0.001) return;
    // стебель
    const stemCol = rgb(dead(WEED_C.stem), alpha);
    if (w.kind !== 'grass') {
      ctx.beginPath();
      taper(stem.pts, 7.5 * u, 2 * u, g);
      ctx.fillStyle = stemCol;
      ctx.fill();
    }
    // шипы
    if (w.thorns.length) {
      ctx.beginPath();
      w.thorns.forEach((th) => {
        if (th.t > g) return;
        const p = stemAt(stem, th.t);
        const nx = Math.cos(p.a) * th.side, ny = Math.sin(p.a) * th.side;
        ctx.moveTo(p.x + nx * 2 * u, p.y + ny * 2 * u);
        ctx.lineTo(p.x + nx * 7 * u - Math.sin(p.a) * 3 * u, p.y + ny * 7 * u + Math.cos(p.a) * 3 * u);
      });
      ctx.lineWidth = 1.2 * u;
      ctx.strokeStyle = stemCol;
      ctx.stroke();
    }
    // листья
    w.leaves.forEach((lf) => {
      const appear = range(g, lf.t, lf.t + 0.22);
      if (appear <= 0) return;
      const p = stemAt(stem, lf.t);
      const sc = easeOutBack(appear) * (1 - d * 0.25) * (1 - w.limp * 0.3);
      const droop = (w.limp * 0.5 + d * 0.6) * (lf.side > 0 ? -1.2 : 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a + lf.side * (lf.ang + droop) + Math.sin(S.time * 1.4 + lf.t * 9 + w.phase) * 0.04);
      ctx.scale(sc, sc);
      ctx.fillStyle = rgb(dead(lf.dark ? WEED_C.leaf2 : WEED_C.leaf), alpha);
      ctx.fill(lf.path);
      ctx.lineWidth = 1.3 * u / Math.max(0.3, sc);
      ctx.strokeStyle = `rgba(28,36,22,${0.4 * alpha})`;
      ctx.stroke(lf.path);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -lf.len * 0.9);
      ctx.lineWidth = 1.2 * u / Math.max(0.3, sc);
      ctx.strokeStyle = rgb(dead(WEED_C.vein), 0.7 * alpha);
      ctx.stroke();
      ctx.restore();
    });
    // пырей: пучок узких листьев вместо стебля
    if (w.kind === 'grass') {
      ctx.beginPath();
      taper(stem.pts, 3.2 * u, 1.2 * u, g);
      ctx.fillStyle = stemCol;
      ctx.fill();
    }
    // вьюнок: усики
    if (w.kind === 'bindweed') {
      ctx.lineWidth = 1.3 * u;
      ctx.strokeStyle = stemCol;
      [0.35, 0.62, 0.85].forEach((t, j) => {
        if (t > g - 0.05) return;
        const p = stemAt(stem, t);
        ctx.beginPath();
        const side = j % 2 ? 1 : -1;
        for (let q = 0; q <= 20; q++) {
          const f = q / 20;
          const r = (1 - f) * 9 * u + 1;
          const a = f * 11 * side + p.a;
          const cx = p.x + side * 10 * u * f, cy = p.y - 8 * u * f;
          const xx = cx + Math.cos(a) * r, yy = cy + Math.sin(a) * r;
          if (q === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      });
    }
    // «голова»
    const headIn = easeOutBack(range(g, 0.82, 1));
    if (headIn > 0) {
      const tip = stemAt(stem, 1);
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(tip.a);
      ctx.scale(headIn * 1.35, headIn * 1.35);
      drawWeedHead(w, alpha, dead);
      ctx.restore();
    }
  }

  function drawWeedHead(w, alpha, dead) {
    const k = w.kind;
    if (k === 'thistle') {
      ellipse(0, -8 * u, 10 * u, 11 * u, 0, rgb(dead(hex('#5f6d47')), alpha));
      ctx.beginPath();
      for (let j = -6; j <= 6; j++) {
        const a = j * 0.2;
        ctx.moveTo(Math.sin(a) * 6 * u, -14 * u);
        ctx.lineTo(Math.sin(a) * 16 * u, -14 * u - Math.cos(a) * 16 * u);
      }
      ctx.lineWidth = 2.2 * u;
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgb(dead(WEED_C.thistle), alpha);
      ctx.stroke();
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = j / 10 * TAU;
        ctx.moveTo(Math.cos(a) * 8 * u, -8 * u + Math.sin(a) * 9 * u);
        ctx.lineTo(Math.cos(a) * 14 * u, -8 * u + Math.sin(a) * 14 * u);
      }
      ctx.lineWidth = 1.2 * u;
      ctx.strokeStyle = rgb(dead(WEED_C.stem), alpha);
      ctx.stroke();
    } else if (k === 'dandelion') {
      const r = 20 * u;
      const cg = ctx.createRadialGradient(0, -r, 0, 0, -r, r);
      cg.addColorStop(0, `rgba(250,248,244,${0.35 * alpha})`);
      cg.addColorStop(1, `rgba(250,248,244,${0.08 * alpha})`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      for (let j = 0; j < 34; j++) {
        const a = j * 2.39996;
        const rr = r * (0.9 + (j % 3) * 0.05);
        ctx.moveTo(0, -r);
        ctx.lineTo(Math.cos(a) * rr, -r + Math.sin(a) * rr);
      }
      ctx.lineWidth = 0.9 * u;
      ctx.strokeStyle = rgb(dead(WEED_C.fluff), 0.8 * alpha);
      ctx.stroke();
      ellipse(0, -r, 3.5 * u, 3.5 * u, 0, rgb(dead(hex('#9c8f7a')), alpha));
    } else if (k === 'burdock') {
      [[0, -9], [-10, 2], [10, 1]].forEach(([bx, by]) => {
        ctx.beginPath();
        for (let j = 0; j < 14; j++) {
          const a = j / 14 * TAU;
          ctx.moveTo(bx * u + Math.cos(a) * 5 * u, by * u + Math.sin(a) * 5 * u);
          ctx.lineTo(bx * u + Math.cos(a) * 10 * u, by * u + Math.sin(a) * 10 * u);
        }
        ctx.lineWidth = 1.4 * u;
        ctx.strokeStyle = rgb(dead(hex('#8f6f86')), alpha);
        ctx.stroke();
        ellipse(bx * u, by * u, 7 * u, 7 * u, 0, rgb(dead(WEED_C.burr), alpha));
      });
    } else if (k === 'nettle') {
      ctx.lineWidth = 2 * u;
      ctx.strokeStyle = rgb(dead(WEED_C.catkin), alpha);
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(j * 10 * u, -6 * u, j * 14 * u, 16 * u + Math.abs(j) * 4 * u);
        ctx.stroke();
        for (let q = 1; q < 5; q++) {
          const f = q / 5;
          ellipse(j * 14 * u * f * 0.95, -4 * u * f + (16 + Math.abs(j) * 4) * u * f * f, 2.4 * u, 2.4 * u, 0, rgb(dead(WEED_C.catkin), alpha));
        }
      }
      ellipse(0, -6 * u, 5 * u, 8 * u, 0, rgb(dead(WEED_C.leaf), alpha));
    } else if (k === 'grass') {
      ellipse(0, -22 * u, 5.5 * u, 24 * u, 0, rgb(dead(hex('#7c7a5a')), alpha));
      ctx.beginPath();
      for (let j = 0; j < 18; j++) {
        const y = -4 * u - j * 2.4 * u;
        const side = j % 2 ? 1 : -1;
        ctx.moveTo(side * 4 * u, y);
        ctx.lineTo(side * 11 * u, y - 5 * u);
      }
      ctx.lineWidth = 1 * u;
      ctx.strokeStyle = rgb(dead(hex('#6a6a4c')), alpha);
      ctx.stroke();
    } else if (k === 'bindweed') {
      ctx.save();
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.moveTo(-3 * u, 0);
      ctx.lineTo(-13 * u, -22 * u);
      ctx.quadraticCurveTo(0, -27 * u, 13 * u, -22 * u);
      ctx.lineTo(3 * u, 0);
      ctx.closePath();
      ctx.fillStyle = rgb(dead(WEED_C.trumpet), alpha);
      ctx.fill();
      ellipse(0, -22 * u, 13 * u, 4 * u, 0, rgb(dead(hex('#cfc6d6')), alpha));
      ellipse(0, -21.5 * u, 4 * u, 1.6 * u, 0, rgb(dead(hex('#9d8fa8')), alpha));
      ctx.restore();
    }
  }

  function drawSeed(w) {
    if (w.seed <= 0 || w.seed >= 1) return;
    const t = w.seed;
    const topY = cam.y - (G / cam.z) - 20;
    const x = lerp(w.seedFrom.x, w.x, easeInOut(t)) + Math.sin(t * 9) * 18 * u * (1 - t);
    const y = lerp(topY, w.base, easeIn(t) * 0.35 + t * 0.65);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 7) * 0.4);
    ctx.globalAlpha = 1 - range(t, 0.85, 1);
    ctx.beginPath();
    for (let j = -4; j <= 4; j++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(j * 3.2 * u, -14 * u + Math.abs(j) * 1.2 * u);
    }
    ctx.lineWidth = 0.9 * u;
    ctx.strokeStyle = 'rgba(70,60,70,0.8)';
    ctx.stroke();
    ellipse(0, 3 * u, 2 * u, 4 * u, 0, '#3f3431');
    ctx.restore();
  }

  function weedFrame(w) {
    // трансформация сорняка: в земле или в руках
    if (w.grip) return { x: w.grip.x, y: w.grip.y, r: w.grip.rot };
    return { x: w.x, y: w.base, r: 0 };
  }

  function drawWeed(w, stemCache) {
    if (w.g <= 0.001 || w.dissolve >= 1) return;
    const fr = weedFrame(w);
    const alpha = 1 - w.dissolve;
    ctx.save();
    ctx.translate(fr.x, fr.y);
    ctx.rotate(fr.r);
    if (w.grip) {
      drawRoot(w, alpha);
      // комочки земли на корне
      const clod = 1 - range(w.limp, 0.4, 1) * 0.6;
      const sc = soilColors();
      for (let j = 0; j < 6; j++) {
        const a = j * 1.7;
        ellipse(Math.sin(a) * 7 * u, 6 * u + j * 3 * u, (4 + (j % 3)) * u * clod, (3 + (j % 2)) * u * clod, a, rgb(sc.mid, alpha * clod));
      }
    }
    drawWeedBody(w, stemCache, alpha);
    ctx.restore();
  }

  // ---------------- цветы
  const CENTER = hex('#f4c54a');
  function flowerColor(f, c) {
    let col = wither(c, (1 - f.health) * 0.85);
    if (S.glow > 0) col = mix(col, mix(c, [255, 255, 255], -0.08), S.glow * 0.5);
    if (f.row === 0) col = mix(col, skyColors()[1], 0.18);
    return col;
  }
  // цвета цветка кэшируются и пересчитываются только когда заметно меняется «здоровье»
  function flowerCols(f) {
    const key = ((f.health * 32) | 0) * 10000 + ((S.glow * 24) | 0) * 100 + (f.row === 0 ? ((S.mood * 24) | 0) : 0);
    if (f.ck === key) return f.cc;
    f.ck = key;
    const cc = {
      stem: rgb(flowerColor(f, STEM)),
      leaf: rgb(flowerColor(f, LEAF)),
      P: f.pal.map((c) => rgb(flowerColor(f, c))),
      center: rgb(flowerColor(f, CENTER))
    };
    if (f.type === 'lupin') {
      cc.lup = [0.12, 0.45, 0.8].map((t) => {
        const c = mix(f.pal[0], f.pal[1], t);
        return [rgb(flowerColor(f, c)), rgb(flowerColor(f, mix(c, [255, 255, 255], 0.14)))];
      });
    }
    f.cc = cc;
    return cc;
  }
  // несколько эллипсов одним путём
  function ovals(list, color) {
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      ctx.moveTo(e[0] + e[2] * Math.cos(e[4]), e[1] + e[2] * Math.sin(e[4]));
      ctx.ellipse(e[0], e[1], e[2], e[3], e[4], 0, TAU);
    }
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawFlower(f) {
    const bloom = f.bloom * S.intro(f);
    if (bloom <= 0.01) return;
    const cc = flowerCols(f);
    const wk = 1 - f.health;
    const x0 = f.x, y0 = groundAt(f.x) + 2 * u;
    const life = 1 - wk * 0.7;
    const sway = (Math.sin(S.time * 1.3 + f.phase + f.x * 0.004) * 0.05 + Math.sin(S.time * 0.7 + f.x * 0.002) * 0.04) * life * S.motion;
    const height = f.h0 * (0.3 + 0.7 * easeOut(bloom)) * (1 - wk * 0.18) * (1 + S.glow * 0.05);
    const droop = wk * 1.25 * f.dir;
    const N = 6;
    let x = x0, y = y0, th = 0;
    // стебель
    ctx.beginPath();
    ctx.moveTo(x, y);
    const leafAt = [];
    for (let j = 1; j <= N; j++) {
      const s = j / N;
      th = f.lean * s + sway * s + droop * s * s * s;
      x += Math.sin(th) * height / N;
      y -= Math.cos(th) * height / N;
      ctx.lineTo(x, y);
      leafAt.push(x, y);
    }
    ctx.lineWidth = 2.6 * f.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cc.stem;
    ctx.stroke();
    // листья — одним путём
    ctx.beginPath();
    for (let i = 0; i < f.leaves.length; i++) {
      const lf = f.leaves[i];
      const k = Math.min(N - 1, Math.round(lf.t * N)) - 1;
      const px = k < 0 ? x0 : leafAt[k * 2], py = k < 0 ? y0 : leafAt[k * 2 + 1];
      const a = f.lean * lf.t + lf.side * (0.9 + wk * 0.7) + sway * 0.5;
      const L = lf.len * (0.4 + 0.6 * easeOut(bloom)) * (1 - wk * 0.2);
      const sa = Math.sin(a), ca = Math.cos(a);
      const tx = px + sa * L, ty = py - ca * L;
      const mx = px + sa * L * 0.5, my = py - ca * L * 0.5;
      const w = L * 0.28;
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(mx + ca * w, my + sa * w, tx, ty);
      ctx.quadraticCurveTo(mx - ca * w, my - sa * w, px, py);
    }
    ctx.fillStyle = cc.leaf;
    ctx.fill();
    // соцветие
    const open = easeOutBack(range(bloom, 0.35, 1)) * (1 - wk * 0.25);
    if (open <= 0.02) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(th * 0.8 + droop * 0.25);
    const s = f.size * open * (1 + S.glow * 0.08);
    ctx.scale(s, s);
    drawHead(f, cc);
    ctx.restore();
  }

  const PEONY_O = [], PEONY_I = [];
  for (let j = 0; j < 7; j++) { const a = j / 7 * TAU; PEONY_O.push([Math.cos(a) * 9, -12 + Math.sin(a) * 7, 11, 9, a]); }
  for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + 0.4; PEONY_I.push([Math.cos(a) * 5.5, -13 + Math.sin(a) * 4.5, 8, 6.5, a]); }
  const ALLIUM = [];
  for (let j = 0; j < 16; j++) { const a = j * 2.4, r = 9 * Math.sqrt((j + 0.5) / 16); ALLIUM.push([Math.cos(a) * r, -13 + Math.sin(a) * r, 2.6, 2.6, 0]); }
  const SPRAY = [[-12, -10], [-7, -17], [0, -20], [7, -16], [12, -9], [-3, -12], [4, -9]];
  const LUPIN = [[], [], [], [], [], []];
  for (let j = 0; j < 11; j++) {
    const t = j / 11, yb = -4 - t * 44, r = 5.6 * (1 - t * 0.6);
    const g = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
    LUPIN[g * 2].push([-r * 0.9, yb, r, r * 0.75, 0.3]);
    LUPIN[g * 2 + 1].push([r * 0.9, yb - 2, r, r * 0.75, -0.3]);
  }

  function drawHead(f, cc) {
    const P = cc.P;
    switch (f.type) {
      case 'peony':
        ovals(PEONY_O, P[0]);
        ovals(PEONY_I, P[1]);
        ellipse(0, -14, 6, 5, 0, P[2]);
        ellipse(-1.5, -15.5, 2.6, 2, 0.3, 'rgba(255,255,255,0.35)');
        break;
      case 'tulip':
        ctx.beginPath();
        ctx.moveTo(-10, -20); ctx.quadraticCurveTo(-12, -2, 0, 0); ctx.quadraticCurveTo(12, -2, 10, -20);
        ctx.quadraticCurveTo(6, -14, 3.5, -22); ctx.quadraticCurveTo(0, -16, -3.5, -22); ctx.quadraticCurveTo(-6, -14, -10, -20);
        ctx.fillStyle = P[0];
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5.5, -19); ctx.quadraticCurveTo(-7, -4, 0, -1); ctx.quadraticCurveTo(7, -4, 5.5, -19); ctx.quadraticCurveTo(0, -24, -5.5, -19);
        ctx.fillStyle = P[1];
        ctx.fill();
        break;
      case 'cosmos':
      case 'daisy': {
        const n = f.type === 'daisy' ? 12 : 8;
        const L = f.type === 'daisy' ? 9 : 12;
        const rw = L * (f.type === 'daisy' ? 0.2 : 0.38);
        ctx.save();
        ctx.translate(0, -8);
        ctx.scale(1, 0.72);
        for (let c = 0; c < 2; c++) {
          ctx.beginPath();
          for (let j = c; j < n; j += 2) {
            const a = j / n * TAU;
            const cx = Math.sin(a) * L * 0.62, cy = -Math.cos(a) * L * 0.62;
            ctx.moveTo(cx + rw * Math.cos(a), cy + rw * Math.sin(a));
            ctx.ellipse(cx, cy, rw, L * 0.62, a, 0, TAU);
          }
          ctx.fillStyle = c ? P[0] : P[1];
          ctx.fill();
        }
        ctx.restore();
        ellipse(0, -8, 4.2, 3.2, 0, cc.center);
        ellipse(-1, -9, 1.6, 1.1, 0, 'rgba(255,255,255,0.4)');
        break;
      }
      case 'lupin':
        for (let g = 0; g < 3; g++) {
          ovals(LUPIN[g * 2], cc.lup[g][0]);
          ovals(LUPIN[g * 2 + 1], cc.lup[g][1]);
        }
        ellipse(0, -50, 2.2, 3.5, 0, P[1]);
        break;
      case 'allium':
        ellipse(0, -13, 13, 13, 0, P[0]);
        ovals(ALLIUM, P[1]);
        break;
      case 'spray':
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = cc.stem;
        ctx.beginPath();
        SPRAY.forEach(([px, py]) => { ctx.moveTo(0, 0); ctx.quadraticCurveTo(px * 0.3, py * 0.6, px, py); });
        ctx.stroke();
        ctx.beginPath();
        SPRAY.forEach(([px, py], j) => { if (j % 2 === 0) { ctx.moveTo(px + 3.1, py); ctx.arc(px, py, 3.1, 0, TAU); } });
        ctx.fillStyle = P[0];
        ctx.fill();
        ctx.beginPath();
        SPRAY.forEach(([px, py], j) => { if (j % 2) { ctx.moveTo(px + 3.1, py); ctx.arc(px, py, 3.1, 0, TAU); } });
        ctx.fillStyle = P[1];
        ctx.fill();
        break;
      case 'bell':
        for (let c = 0; c < 2; c++) {
          ctx.beginPath();
          [[-8, 0.5], [0, 0], [8, -0.5]].forEach(([bx, a], j) => {
            if (j % 2 !== c) return;
            const cy = -6 - j * 5, ang = a + 3.14;
            const cs = Math.cos(ang), sn = Math.sin(ang);
            const P2 = (px, py) => [bx + px * cs - py * sn, cy + px * sn + py * cs];
            const q = [P2(-3, 0), P2(-7, 9), P2(-8, 13), P2(8, 13), P2(7, 9), P2(3, 0)];
            ctx.moveTo(q[0][0], q[0][1]);
            ctx.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]);
            ctx.lineTo(q[3][0], q[3][1]);
            ctx.quadraticCurveTo(q[4][0], q[4][1], q[5][0], q[5][1]);
            ctx.closePath();
          });
          ctx.fillStyle = c ? P[1] : P[0];
          ctx.fill();
        }
        break;
    }
  }

  const FOL = [hex('#4a7843'), hex('#62984e'), hex('#7fb25e')];
  function drawFoliage(back) {
    const wk = S.mood;
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < foliage.length; i++) {
        const l = foliage[i];
        if (l.back !== back || l.c !== c) continue;
        const intro = S.introAt(l.x);
        if (intro <= 0.01) continue;
        any = true;
        const gy = groundAt(l.x) + 3 * u;
        const a = l.a * (1 + wk * 0.3) + Math.sin(S.time * 1.2 + l.phase + l.x * 0.01) * 0.06 * S.motion;
        const len = l.len * easeOut(intro) * (1 - wk * 0.18) * (1 + S.glow * 0.08);
        const sa = Math.sin(a), ca = Math.cos(a);
        const tx = l.x + sa * len, ty = gy - ca * len;
        const wv = len * l.w;
        const mx = l.x + sa * len * 0.5, my = gy - ca * len * 0.5;
        const px = ca * wv, py = sa * wv;
        ctx.moveTo(l.x, gy);
        ctx.quadraticCurveTo(mx + px, my + py, tx, ty);
        ctx.quadraticCurveTo(mx - px, my - py, l.x, gy);
      }
      if (!any) continue;
      let col = wither(FOL[c], wk * 0.6);
      if (back) col = mix(col, skyColors()[1], 0.1);
      col = mix(col, [140, 205, 110], S.glow * 0.12);
      ctx.fillStyle = rgb(col);
      ctx.fill();
    }
  }

  const GRASS_C = [LEAF, LEAF_D, LEAF_L];
  function drawGrass(front) {
    const wind = S.motion * (1 - S.mood * 0.6);
    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      for (let i = 0; i < grass.length; i++) {
        const g = grass[i];
        if (g.front !== front || g.ci !== c) continue;
        const x = g.x, y = groundAt(g.x) + 3 * u;
        const sw = Math.sin(S.time * 1.6 + g.phase + g.x * 0.01) * 0.12 * wind;
        for (let j = 0; j < g.blades.length; j++) {
          const b = g.blades[j];
          const a = b.a + sw;
          const tx = x + Math.sin(a) * b.h, ty = y - Math.cos(a) * b.h;
          ctx.moveTo(x - b.w, y);
          ctx.quadraticCurveTo(x + Math.sin(a) * b.h * 0.5 - b.w * 0.3, y - b.h * 0.5, tx, ty);
          ctx.quadraticCurveTo(x + Math.sin(a) * b.h * 0.5 + b.w * 0.3, y - b.h * 0.5, x + b.w, y);
        }
      }
      ctx.fillStyle = rgb(wither(mix(GRASS_C[c], [0, 0, 0], front ? 0.08 : -0.05), S.mood * 0.6));
      ctx.fill();
    }
  }

  function drawMushrooms() {
    mushrooms.forEach((m) => {
      const x = m.x, y = groundAt(m.x) + 2 * u;
      const s = m.s * S.introAt(m.x);
      if (s <= 0.01) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(m.lean);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-5, -12, -3, -20); ctx.lineTo(3, -20); ctx.quadraticCurveTo(5, -12, 4, 0); ctx.closePath();
      ctx.fillStyle = rgb(wither(hex('#fff4ea'), S.mood * 0.6));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-15, -18); ctx.quadraticCurveTo(-13, -34, 0, -34); ctx.quadraticCurveTo(13, -34, 15, -18); ctx.quadraticCurveTo(0, -21, -15, -18);
      ctx.fillStyle = rgb(wither(hex(m.cap), S.mood * 0.7));
      ctx.fill();
      [[-7, -25, 2.2], [2, -29, 1.8], [8, -23, 1.6], [-1, -22, 1.3]].forEach(([dx, dy, r]) => ellipse(dx, dy, r, r * 0.8, 0, 'rgba(255,248,240,0.9)'));
      ctx.restore();
    });
  }

  // ---------------- садовница
  const GC = {
    skin: hex('#f8d6c4'), skinS: hex('#ecbaa4'), skinD: hex('#d99c86'),
    hair: hex('#5f3125'), hairHi: hex('#8e4e37'), hairD: hex('#3f1e17'),
    blouse: hex('#fff8f2'), blouseS: hex('#eddcd2'), blouseD: hex('#d7c0b4'),
    skirt: hex('#a5af55'), skirtS: hex('#87923f'), skirtD: hex('#6c7632'),
    glove: hex('#ff5c9f'), gloveHi: hex('#ffa5c9'), gloveS: hex('#d93d84'),
    boot: hex('#fb6aa4'), bootS: hex('#d6448a'),
    bow: hex('#f2679f'), bowS: hex('#cf4a82'), sock: hex('#fdf5f0'),
    lips: hex('#d9507b'), blush: hex('#f7a0b2'), lash: hex('#34181c')
  };
  function ik(sx, sy, tx, ty, L1, L2, bend) {
    const dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    d = clamp(d, Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.5);
    const a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const a1 = a + bend * A;
    const ex = sx + Math.cos(a1) * L1, ey = sy + Math.sin(a1) * L1;
    const a2 = Math.atan2(ty - ey, tx - ex);
    return { ex, ey, wx: ex + Math.cos(a2) * L2, wy: ey + Math.sin(a2) * L2, a1, a2 };
  }
  // контур «конечности» вдоль отрезка a→b с заданными ширинами
  function limb(a, b, widths, bend = 0) {
    const n = widths.length;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const off = Math.sin(t * Math.PI) * bend;
      const px = a[0] + dx * t + nx * off, py = a[1] + dy * t + ny * off;
      const w = widths[i] / 2;
      left.push([px + nx * w, py + ny * w]);
      right.push([px - nx * w, py - ny * w]);
    }
    return left.concat(right.reverse());
  }

  // Поза: колени на земле (K), бедро поворачивается вокруг колена — сидит на пятках (kneel=0) или стоит на коленях (kneel=1)
  const KNEE = [-40, -12];
  const THIGH = 100;
  function girlPose() {
    const g = S.girl;
    const phi = lerp(0.42, 1.5, g.kneel);
    const hip = [KNEE[0] + Math.cos(phi) * THIGH, KNEE[1] - Math.sin(phi) * THIGH];
    const c = Math.cos(-g.lean), s = Math.sin(-g.lean);
    const T = (px, py) => [hip[0] + px * c - py * s, hip[1] + px * s + py * c];
    const c2 = Math.cos(-g.lean * 0.5), s2 = Math.sin(-g.lean * 0.5);
    const P = (px, py) => [hip[0] + px * c2 - py * s2, hip[1] + px * s2 + py * c2];
    const oy = g.y + g.rise * 26 * u;
    const toLocal = (p) => [(p[0] - g.x) / gsc, (p[1] - oy) / gsc];
    return { hip, T, P, toLocal, oy };
  }

  function drawHand(wr, ang, grip, shade) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = -uy, py = ux;
    const col = rgb(mix(GC.glove, GC.gloveS, 0.1 + shade));
    // ладонь
    ellipse(wr[0] + ux * 9, wr[1] + uy * 9, 12, 9.5, ang, col);
    // пальцы
    const fl = lerp(17, 9, grip);
    fillSpline(limb([wr[0] + ux * 12, wr[1] + uy * 12], [wr[0] + ux * (14 + fl), wr[1] + uy * (14 + fl)], [16, 15, 12, lerp(8, 12, grip)]), col);
    // большой палец
    const tx = wr[0] + ux * 8 + px * 8, ty = wr[1] + uy * 8 + py * 8;
    ellipse(tx + ux * 4, ty + uy * 4, 8, 4.2, ang + lerp(0.5, 1.2, grip), rgb(mix(GC.glove, GC.gloveS, 0.25 + shade)));
    // блик
    ellipse(wr[0] + ux * 10 - px * 3, wr[1] + uy * 10 - py * 3, 5, 2, ang, `rgba(255,220,236,${0.45 * (1 - shade * 2)})`);
  }

  function drawArm(sh, target, far, grip) {
    const L1 = 82, L2 = 74;
    const a = ik(sh[0], sh[1], target[0], target[1], L1, L2, -1);
    const E = [a.ex, a.ey], Wr = [a.wx, a.wy];
    const shade = far ? 0.3 : 0;
    const ux = Math.cos(a.a2), uy = Math.sin(a.a2);
    // предплечье в перчатке
    fillSpline(limb(E, Wr, [20, 19, 16, 13, 12]), rgb(mix(GC.glove, GC.gloveS, 0.12 + shade)));
    ctx.beginPath();
    taper([[E[0] + ux * 22 + uy * 4, E[1] + uy * 22 - ux * 4], [Wr[0] - ux * 8 + uy * 3, Wr[1] - uy * 8 - ux * 3]], 3.2, 1.6);
    ctx.fillStyle = `rgba(255,222,237,${0.55 * (1 - shade * 2)})`;
    ctx.fill();
    drawHand(Wr, a.a2, grip, shade);
    // раструб перчатки
    fillSpline(limb([E[0] - ux * 1, E[1] - uy * 1], [E[0] + ux * 17, E[1] + uy * 17], [27, 24, 19]), rgb(mix(GC.gloveHi, GC.gloveS, shade * 1.5)));
    // рукав-фонарик
    const bx = Math.cos(a.a1), by = Math.sin(a.a1);
    const sleeve = far ? GC.blouseS : GC.blouse;
    fillSpline(limb([sh[0] - bx * 6, sh[1] - by * 6], [E[0] + bx * 2, E[1] + by * 2], [30, 40, 38, 30, 21, 18], far ? 0 : -2), rgb(sleeve));
    // складки на рукаве
    ctx.beginPath();
    const fx = (t, o) => [sh[0] + (E[0] - sh[0]) * t - by * o, sh[1] + (E[1] - sh[1]) * t + bx * o];
    let p1 = fx(0.12, -8), p2 = fx(0.45, -3), p3 = fx(0.78, -2);
    ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1]);
    p1 = fx(0.18, 9); p2 = fx(0.5, 6); p3 = fx(0.8, 4);
    ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1]);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(GC.blouseD, far ? 0.5 : 0.6);
    ctx.stroke();
    // манжета-рюш
    const cf = [E[0] - bx * 4, E[1] - by * 4];
    ellipse(cf[0], cf[1], 6.5, 13, a.a1, rgb(far ? GC.blouseS : mix(GC.blouse, [255, 255, 255], 0.6)));
    ctx.beginPath();
    ctx.ellipse(cf[0], cf[1], 6.5, 13, a.a1, 0, TAU);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgb(GC.blouseD, 0.5);
    ctx.stroke();
    return a;
  }

  // голень лежит на земле от колена назад, сапог — до носка
  function drawShin(dx, dy, far) {
    const k = [KNEE[0] + dx, KNEE[1] + dy - 2];
    const sock = far ? mix(GC.sock, GC.blouseD, 0.4) : GC.sock;
    const boot = far ? GC.bootS : GC.boot;
    fillSpline(limb(k, [k[0] + 46, k[1] - 2], [26, 24, 21]), rgb(sock));
    fillSpline([
      [k[0] + 36, k[1] - 13], [k[0] + 70, k[1] - 14], [k[0] + 96, k[1] - 16], [k[0] + 108, k[1] - 20],
      [k[0] + 116, k[1] - 10], [k[0] + 128, k[1] + 4], [k[0] + 124, k[1] + 12], [k[0] + 96, k[1] + 12],
      [k[0] + 60, k[1] + 12], [k[0] + 38, k[1] + 11], [k[0] + 32, k[1] - 2]
    ], rgb(boot));
    ellipse(k[0] + 35, k[1] - 1, 5.5, 12.5, 0, rgb(mix(boot, [0, 0, 0], 0.14)));
    ctx.beginPath();
    ctx.moveTo(k[0] + 46, k[1] - 8); ctx.quadraticCurveTo(k[0] + 76, k[1] - 11, k[0] + 104, k[1] - 12);
    ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.strokeStyle = far ? 'rgba(255,200,225,0.3)' : 'rgba(255,220,236,0.8)';
    ctx.stroke();
  }

  function drawGirlBody() {
    const g = S.girl;
    if (g.on <= 0.001) return;
    const { hip, T, P, toLocal, oy } = girlPose();
    // hip — точка таза: к ней «привязаны» бёдра и юбка
    ctx.save();
    ctx.translate(g.x, oy);
    ctx.scale(gsc, gsc);
    ctx.globalAlpha = g.on;
    // тень
    const sh = ctx.createRadialGradient(-6, 0, 0, -6, 0, 160);
    sh.addColorStop(0, 'rgba(40,18,22,0.30)');
    sh.addColorStop(1, 'rgba(40,18,22,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(-6, 1, 160, 15, 0, 0, TAU);
    ctx.fill();

    // ---- дальняя голень и сапог (чуть выше и темнее — для глубины)
    drawShin(-8, -5, true);
    // ---- дальняя рука
    drawArm(T(1, -127), toLocal(g.hf), true, g.grip);
    // ---- ближняя голень и сапог
    drawShin(0, 0, false);

    // ---- юбка (до колена), повторяет бедро
    const K = KNEE;
    let ax = K[0] - hip[0], ay = K[1] - hip[1];
    const L = Math.hypot(ax, ay) || 1;
    ax /= L; ay /= L;
    const tx = -ay, ty = ax; // «верх» бедра
    const along = (t, off) => [hip[0] + ax * L * t + tx * off, hip[1] + ay * L * t + ty * off];
    const sw = Math.sin(S.time * 1.3) * 1.2 * S.motion;
    const skirt = [
      T(-15, -52), P(-25, -24),
      along(0.32, 27), along(0.72, 23),
      [K[0] - 18 + sw, K[1] - 12], [K[0] - 20 + sw, K[1] + 6], [K[0] - 4, K[1] + 12],
      [K[0] + 22, K[1] + 8], along(0.62, -19), along(0.25, -24),
      P(36, 6), P(31, -28), T(18, -52)
    ];
    fillSpline(skirt, rgb(GC.skirt));
    // складки и тень
    ctx.beginPath();
    let q1 = along(0.2, 12), q2 = along(0.6, 6), q3 = [K[0] - 10 + sw, K[1] + 4];
    ctx.moveTo(q1[0], q1[1]); ctx.quadraticCurveTo(q2[0], q2[1], q3[0], q3[1]);
    q1 = along(0.3, -8); q2 = along(0.65, -12); q3 = [K[0] + 12, K[1] + 8];
    ctx.moveTo(q1[0], q1[1]); ctx.quadraticCurveTo(q2[0], q2[1], q3[0], q3[1]);
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(GC.skirtS, 0.65);
    ctx.stroke();
    fillSpline([along(0.1, -22), along(0.5, -20), [K[0] + 22, K[1] + 8], [K[0] + 4, K[1] + 10], along(0.6, -10), along(0.2, -14)], rgb(GC.skirtS, 0.55));

    // ---- корпус (блузка)
    const torso = [T(-15, -52), T(-17, -64), T(-22, -80), T(-30, -96), T(-27, -110), T(-19, -124), T(-12, -136), T(-7, -142), T(7, -146), T(18, -141), T(27, -129), T(29, -110), T(25, -86), T(20, -64), T(18, -52)];
    fillSpline(torso, rgb(GC.blouse));
    fillSpline([T(15, -139), T(26, -128), T(28, -108), T(24, -84), T(19, -62), T(13, -60), T(16, -86), T(16, -114)], rgb(GC.blouseS, 0.9));
    // под грудью — лёгкая тень
    ctx.beginPath();
    const u1 = T(-29, -93), u2 = T(-21, -80), u3 = T(-8, -78);
    ctx.moveTo(u1[0], u1[1]); ctx.quadraticCurveTo(u2[0], u2[1], u3[0], u3[1]);
    ctx.lineWidth = 2.2; ctx.strokeStyle = rgb(GC.blouseD, 0.45); ctx.stroke();
    // пуговки
    [[-27, -108], [-25, -92], [-18, -76], [-16, -62]].forEach(([bx, by]) => {
      const p = T(bx + 3, by);
      ellipse(p[0], p[1], 1.8, 1.8, 0, rgb(GC.blouseD));
    });
    // пояс
    ctx.beginPath();
    taper([T(-16, -54), T(2, -55), T(20, -54)], 8, 8);
    ctx.fillStyle = rgb(GC.skirtD);
    ctx.fill();

    // ---- голова
    const nb = T(0, -143);
    ctx.save();
    ctx.translate(nb[0], nb[1]);
    ctx.rotate(-g.lean * 0.42 - g.headTilt);
    ctx.translate(0, 10);
    ctx.scale(1.08, 1.08);
    drawGirlHead(g);
    ctx.restore();

    // ---- воротник-рюш и бант
    const col = T(-2, -141);
    ctx.save();
    ctx.translate(col[0], col[1]);
    ctx.rotate(-g.lean);
    for (let j = 0; j < 5; j++) ellipse(-12 + j * 6, -1 + Math.abs(j - 2) * 1.2, 5, 4, 0, rgb(mix(GC.blouse, [255, 255, 255], 0.7)));
    ctx.restore();
    const bw = T(-14, -134);
    ctx.save();
    ctx.translate(bw[0], bw[1]);
    ctx.rotate(-g.lean * 0.9);
    const flap = Math.sin(S.time * 2.1) * 0.08 * S.motion;
    ellipse(-7, -2, 10, 6, -0.45 + flap, rgb(GC.bow));
    ellipse(6, -3, 9, 5.5, 0.55 - flap, rgb(GC.bowS));
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-9 + flap * 20, 13, -5, 25); ctx.lineTo(-0.5, 23); ctx.quadraticCurveTo(-3, 11, 2, 0);
    ctx.moveTo(2, 0); ctx.quadraticCurveTo(7, 11, 9 + flap * 20, 22); ctx.lineTo(12.5, 19); ctx.quadraticCurveTo(9, 9, 4, 0);
    ctx.fillStyle = rgb(GC.bowS);
    ctx.fill();
    ellipse(0, -1.5, 4, 4, 0, rgb(mix(GC.bow, [0, 0, 0], 0.18)));
    ctx.restore();
    ctx.restore();
  }

  function drawGirlHead(g) {
    const hs = Math.sin(S.time * 1.7) * 1.4 * S.motion;
    // шея
    fillSpline([[-9, 2], [-11, -12], [-10, -28], [7, -30], [9, -12], [9, 2]], rgb(GC.skinS));
    // волосы сзади (объём, волны)
    fillSpline([[2, -82], [22, -88], [36, -74], [38, -54], [34, -36], [26, -24], [16, -22], [10, -34], [8, -56]], rgb(GC.hairD));
    // лицо в профиль
    const face = [[-17, -25], [-23.5, -28.5], [-25.8, -32.5], [-28.4, -35.6], [-26.6, -37.8], [-29, -40.4], [-27.4, -43.2], [-29.2, -45.6], [-33.4, -48.6], [-28.6, -55], [-27.4, -58.4], [-28.3, -61.8], [-27.8, -68], [-23.5, -76], [-11, -83.5], [5, -84.5], [20, -73], [24, -56], [17, -40], [5, -33], [-8, -27]];
    fillSpline(face, rgb(GC.skin));
    // тень под челюстью
    ctx.beginPath();
    ctx.moveTo(-18, -27); ctx.quadraticCurveTo(-4, -30, 8, -37); ctx.lineTo(8, -30); ctx.quadraticCurveTo(-4, -24, -16, -24);
    ctx.fillStyle = rgb(GC.skinS, 0.8);
    ctx.fill();
    // румянец
    const bl = ctx.createRadialGradient(-15, -46, 0, -15, -46, 10);
    bl.addColorStop(0, rgb(GC.blush, 0.6));
    bl.addColorStop(1, rgb(GC.blush, 0));
    ctx.fillStyle = bl;
    ctx.beginPath();
    ctx.arc(-15, -46, 10, 0, TAU);
    ctx.fill();
    // губы
    const sm = g.smile;
    ctx.beginPath();
    ctx.moveTo(-28.8, -40.2);
    ctx.quadraticCurveTo(-27.2, -41.6, -24.6, -39.6 - sm * 1.2);
    ctx.quadraticCurveTo(-26.6, -38.2, -28.4, -38.4);
    ctx.closePath();
    ctx.moveTo(-28.4, -37.4);
    ctx.quadraticCurveTo(-26.4, -37.2, -24.6, -39.2 - sm * 1.2);
    ctx.quadraticCurveTo(-25.6, -35, -27.8, -35.2);
    ctx.closePath();
    ctx.fillStyle = rgb(GC.lips);
    ctx.fill();
    // глаз
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(GC.lash);
    if (g.eye > 0.5) {
      ctx.beginPath();
      ctx.moveTo(-26.4, -57.4); ctx.quadraticCurveTo(-22.5, -60.2, -18.4, -57.6); ctx.quadraticCurveTo(-22.4, -55.4, -26.4, -57.4);
      ctx.fillStyle = '#fffaf7';
      ctx.fill();
      ellipse(-23.6, -57.6, 2.3, 2.5, 0, '#3b2a2a');
      ellipse(-24.2, -58.4, 0.8, 0.8, 0, '#ffffff');
      ctx.beginPath();
      ctx.moveTo(-26.8, -57.6); ctx.quadraticCurveTo(-22.5, -61, -18, -57.8);
      ctx.lineWidth = 1.7; ctx.stroke();
      ctx.beginPath();
      [[-26.2, -58.2], [-24.6, -59.4], [-22.8, -59.9]].forEach(([lx, ly]) => { ctx.moveTo(lx, ly); ctx.lineTo(lx - 1.8, ly - 2.4); });
      ctx.lineWidth = 1.1; ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-26.4, -57.4); ctx.quadraticCurveTo(-22.4, -54.4, -18.4, -57);
      ctx.lineWidth = 2.1; ctx.stroke();
      ctx.beginPath();
      [[-25.4, -56.3], [-23.4, -55.4], [-21.3, -55.3]].forEach(([lx, ly]) => { ctx.moveTo(lx, ly); ctx.lineTo(lx - 1.6, ly + 2); });
      ctx.lineWidth = 1.2; ctx.stroke();
    }
    // бровь
    ctx.beginPath();
    ctx.moveTo(-28, -63); ctx.quadraticCurveTo(-23, -66, -16, -64);
    ctx.lineWidth = 2.1; ctx.strokeStyle = rgb(GC.hairD); ctx.stroke();
    // волосы: основная масса
    fillSpline([[-29.5, -66], [-30, -76], [-21, -88], [-4, -93], [14, -90], [28, -79], [32, -62], [28, -44], [20, -36], [12, -42], [12, -54], [4, -64], [-10, -70], [-20, -72], [-26, -68]], rgb(GC.hair));
    // волна надо лбом
    fillSpline([[-30, -67], [-29, -79], [-19, -86], [-9, -86], [-17, -80], [-24, -73]], rgb(GC.hairHi));
    // пучок
    ellipse(22, -86, 15, 14, 0.4, rgb(GC.hair));
    ctx.beginPath();
    ctx.arc(22, -86, 9.5, 0.6, 3.8);
    ctx.lineWidth = 2.2; ctx.strokeStyle = rgb(GC.hairHi); ctx.stroke();
    ctx.beginPath();
    ctx.arc(24, -84, 4.5, 2.5, 5.5);
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgb(GC.hairD, 0.7); ctx.stroke();
    // пряди
    ctx.beginPath();
    ctx.moveTo(-3, -70); ctx.quadraticCurveTo(-7 + hs, -56, -2 + hs, -44);
    ctx.moveTo(26, -44); ctx.quadraticCurveTo(34 + hs, -30, 28 + hs, -16);
    ctx.lineWidth = 2.3; ctx.strokeStyle = rgb(GC.hair); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -89); ctx.quadraticCurveTo(8, -93, 22, -80);
    ctx.moveTo(4, -76); ctx.quadraticCurveTo(18, -74, 24, -60);
    ctx.lineWidth = 2; ctx.strokeStyle = rgb(GC.hairHi, 0.85); ctx.stroke();
    // ухо и жемчужина
    ellipse(7, -52, 4.6, 7.2, -0.2, rgb(GC.skinS));
    ellipse(6.4, -41.5, 3.4, 3.4, 0, '#fffaf4');
    ellipse(5.4, -42.6, 1.2, 1.2, 0, '#ffffff');
    // лента-ободок
    ctx.beginPath();
    ctx.moveTo(-26, -80); ctx.quadraticCurveTo(-10, -97, 10, -92); ctx.quadraticCurveTo(24, -87, 30, -72);
    ctx.lineWidth = 6.5; ctx.lineCap = 'round'; ctx.strokeStyle = rgb(GC.bow); ctx.stroke();
    // бант
    const fl = Math.sin(S.time * 2.4) * 0.12 * S.motion;
    ctx.save();
    ctx.translate(18, -92);
    ellipse(-7, -5, 9, 5.2, -0.9 + fl, rgb(GC.bow));
    ellipse(7, -6, 9, 5.2, 0.55 - fl, rgb(GC.bowS));
    ctx.beginPath();
    ctx.moveTo(1, 0); ctx.quadraticCurveTo(11, 6 + fl * 20, 17, 17); ctx.lineTo(20.5, 14); ctx.quadraticCurveTo(13, 3, 3, -2);
    ctx.moveTo(2, 1); ctx.quadraticCurveTo(7, 13, 7 + fl * 25, 24); ctx.lineTo(10.5, 23); ctx.quadraticCurveTo(10, 11, 4, 0);
    ctx.fillStyle = rgb(GC.bowS);
    ctx.fill();
    ellipse(0, -2, 3.4, 3.4, 0, rgb(mix(GC.bow, [0, 0, 0], 0.2)));
    ctx.restore();
  }

  function drawGirlFrontArm() {
    const g = S.girl;
    if (g.on <= 0.001) return;
    const { T, toLocal, oy } = girlPose();
    ctx.save();
    ctx.translate(g.x, oy);
    ctx.scale(gsc, gsc);
    ctx.globalAlpha = g.on;
    drawArm(T(8, -129), toLocal(g.hn), false, g.grip);
    ctx.restore();
  }

  // ---------------- частицы
  const parts = [];
  function spawn(p) {
    if (parts.length > 420) return;
    parts.push(Object.assign({ life: 0, max: 2, vx: 0, vy: 0, g: 0, drag: 0.98, r: 2, rot: 0, vr: 0, a: 1, type: 'mote' }, p));
  }
  let lastU = 0;
  function spawnParticles(dt) {
    const bf = 1 - S.mood;
    // пыльца
    if (S.motion && Math.random() < dt * (6 + 18 * bf + 20 * S.glow)) {
      const x = cam.x + (Math.random() - 0.5) * W / cam.z;
      spawn({ type: 'mote', x, y: G - Math.random() * H * 0.4, vx: (Math.random() - 0.3) * 8 * u, vy: -(4 + Math.random() * 8) * u, max: 4 + Math.random() * 4, r: (1 + Math.random() * 1.6) * u, c: bf > 0.4 ? [255, 236, 170] : [210, 205, 200] });
    }
    // споры от сорняков
    weeds.forEach((w) => {
      if (w.presence > 0.6 && !w.grip && S.motion && Math.random() < dt * 0.9) {
        const tip = stemAt(weedStem(w, S.time), 1);
        spawn({ type: 'spore', x: w.x + tip.x, y: w.base + tip.y, vx: (6 + Math.random() * 14) * u, vy: -(2 + Math.random() * 5) * u, max: 5, r: 1.6 * u, c: [110, 100, 105] });
      }
    });
    // лепестки в финале
    if (S.glow > 0.3 && S.motion && Math.random() < dt * 10 * S.glow) {
      spawn({ type: 'petal', x: cam.x + (Math.random() - 0.5) * W / cam.z, y: cam.y - G / cam.z - 20, vx: (10 + Math.random() * 20) * u, vy: (18 + Math.random() * 20) * u, max: 9, r: (3 + Math.random() * 3) * u, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, c: [[255, 182, 206], [255, 214, 228], [229, 196, 245]][(Math.random() * 3) | 0] });
    }
    // события прополки (только при движении вперёд)
    const k = S.pullIdx;
    if (k >= 0 && S.U > lastU) {
      const w = weeds[PULL_ORDER[k]];
      const s = S.pullS;
      const prev = s - (S.U - lastU);
      if (prev < 0.97 && s >= 0.97) {
        for (let j = 0; j < 26; j++) spawn({ type: 'crumb', x: w.x + (Math.random() - 0.5) * 30 * u, y: w.base - 2 * u, vx: (Math.random() - 0.5) * 90 * u, vy: -(40 + Math.random() * 90) * u, g: 260 * u, max: 1.4, r: (1.5 + Math.random() * 2.5) * u, c: [74, 48, 36] });
      }
      if (s > 1.66 && s < 2.1 && w.grip) {
        const n = Math.round((S.U - lastU) * 160);
        const fr = weedFrame(w);
        for (let j = 0; j < Math.min(n, 24); j++) {
          const onRoot = Math.random() < 0.45;
          let lx, ly;
          if (onRoot) {
            const br = w.roots[(Math.random() * w.roots.length) | 0];
            const p = br.pts[(Math.random() * br.pts.length) | 0];
            lx = p[0] * 0.8; ly = p[1];
          } else {
            const st = weedStem(w, S.time);
            const p = stemAt(st, Math.random());
            lx = p.x; ly = p.y;
          }
          const c = Math.cos(fr.r), sn = Math.sin(fr.r);
          const sparkle = Math.random() < 0.3;
          spawn({ type: sparkle ? 'sparkle' : 'dust', x: fr.x + lx * c - ly * sn, y: fr.y + lx * sn + ly * c, vx: (Math.random() - 0.3) * 30 * u, vy: -(10 + Math.random() * 40) * u, max: 1.6 + Math.random(), r: (sparkle ? 2.2 : 1.8 + Math.random() * 2) * u, c: sparkle ? [255, 190, 220] : [96, 80, 66] });
        }
      }
    }
    // появление садовницы
    const e = loc('enter', S.U), ePrev = loc('enter', lastU);
    if (ePrev < 0.3 && e >= 0.3) {
      const g = S.girl;
      for (let j = 0; j < 46; j++) {
        const a = Math.random() * TAU;
        spawn({ type: Math.random() < 0.5 ? 'petal' : 'sparkle', x: g.x - 20 * u + Math.cos(a) * 30 * u, y: g.y - 130 * u + Math.sin(a) * 60 * u, vx: Math.cos(a) * (40 + Math.random() * 60) * u, vy: Math.sin(a) * (40 + Math.random() * 60) * u - 20 * u, drag: 0.94, max: 1.8 + Math.random(), r: (2.5 + Math.random() * 3) * u, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6, c: [[255, 182, 206], [255, 226, 238], [240, 200, 255]][(Math.random() * 3) | 0] });
      }
    }
    lastU = S.U;
  }
  function stepParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      const dr = Math.pow(p.drag, dt * 60);
      p.vx *= dr; p.vy *= dr;
      if (p.type === 'petal' || p.type === 'spore' || p.type === 'mote') p.vx += Math.sin(S.time * 2 + p.y * 0.02) * 6 * u * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'crumb' && p.y > groundAt(p.x)) { p.y = groundAt(p.x); p.vy *= -0.2; p.vx *= 0.5; }
    }
  }
  function drawParticles() {
    parts.forEach((p) => {
      const t = p.life / p.max;
      const a = Math.min(1, t * 5) * (1 - t);
      if (p.type === 'petal') {
        ellipse(p.x, p.y, p.r, p.r * 0.55, p.rot, rgb(p.c, a * 0.9));
      } else if (p.type === 'sparkle') {
        const r = p.r * (1 + Math.sin(p.life * 20) * 0.3);
        ctx.fillStyle = rgb(p.c, a);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.5, p.y); ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.5, p.y); ctx.closePath();
        ctx.moveTo(p.x - r * 2, p.y); ctx.lineTo(p.x, p.y + r * 0.5); ctx.lineTo(p.x + r * 2, p.y); ctx.lineTo(p.x, p.y - r * 0.5); ctx.closePath();
        ctx.fill();
      } else if (p.type === 'spore') {
        ctx.strokeStyle = rgb(p.c, a * 0.7);
        ctx.lineWidth = 0.8 * u;
        ctx.beginPath();
        for (let j = -2; j <= 2; j++) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + j * 2.5 * u, p.y - 6 * u); }
        ctx.stroke();
        ellipse(p.x, p.y + 1.5 * u, 1.2 * u, 2 * u, 0, rgb(p.c, a));
      } else {
        ellipse(p.x, p.y, p.r, p.r, 0, rgb(p.c, a * (p.type === 'mote' ? 0.75 : 1)));
      }
    });
  }

  // ---------------- бабочки
  const flies = [
    { ph: 0, cx: 0.3, cy: 0.33, c: [255, 170, 205], c2: [255, 225, 236] },
    { ph: 2.1, cx: 0.68, cy: 0.28, c: [205, 170, 245], c2: [240, 226, 255] },
    { ph: 4.2, cx: 0.52, cy: 0.4, c: [255, 246, 236], c2: [255, 214, 186], late: true },
    { ph: 5.3, cx: 0.18, cy: 0.22, c: [255, 196, 150], c2: [255, 234, 214], late: true }
  ];
  function drawButterflies() {
    const pres = clamp(1 - S.mood * 1.6);
    flies.forEach((f) => {
      const on = f.late ? S.glow : Math.max(pres, S.glow);
      if (on <= 0.01) return;
      const t = S.time * 0.35 + f.ph;
      const x = cam.x + (f.cx - 0.5) * W / cam.z + Math.sin(t * 1.3) * 90 * u + Math.sin(t * 3.1) * 20 * u;
      const y = G - f.cy * G - Math.sin(t * 2.2) * 40 * u - (1 - on) * H * 0.6;
      const flap = Math.abs(Math.sin(S.time * 11 + f.ph));
      const dir = Math.cos(t * 1.3) >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(u * dir, u);
      ctx.globalAlpha = on;
      ctx.rotate(0.2);
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.scale(side * (0.25 + flap * 0.75), 1);
        ellipse(6, -5, 8, 6.5, -0.5, rgb(f.c));
        ellipse(5, 4, 5.5, 4.5, 0.4, rgb(f.c2));
        ctx.restore();
      });
      ellipse(0, 0, 1.4, 6, 0, '#4a3140');
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  // ================================================================
  // КАДР
  // ================================================================
  S.motion = 1;
  S.introT = 0;
  S.intro = (f) => (f.reborn >= 0 || f.bonus ? 1 : clamp((S.introT - f.delay) / 1.1));
  S.introAt = (x) => clamp((S.introT - 0.2 - Math.abs(x - W / 2) / W * 0.9) / 0.9);

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawSky();
    drawHills();
    // мир
    ctx.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (W / 2 - cam.x * cam.z), DPR * (G - cam.y * cam.z));
    drawSoil();
    const stems = weeds.map((w) => weedStem(w, S.time));
    weeds.forEach((w) => {
      if (w.grip) return;
      ctx.save();
      ctx.translate(w.x, w.base);
      drawRoot(w, 1 - w.dissolve);
      ctx.restore();
    });
    drawGrass(false);
    flowers.forEach((f) => { if (f.row === 0) drawFlower(f); });
    drawFoliage(true);
    weeds.forEach((w, i) => { if (!w.grip) drawWeed(w, stems[i]); });
    weeds.forEach((w) => drawSeed(w));
    flowers.forEach((f) => { if (f.row === 1) drawFlower(f); });
    drawFoliage(false);
    drawMushrooms();
    drawGirlBody();
    weeds.forEach((w, i) => { if (w.grip) drawWeed(w, stems[i]); });
    drawGirlFrontArm();
    drawGrass(true);
    drawButterflies();
    drawParticles();
    // затемнение-«тоска»
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (S.mood > 0.01) {
      ctx.fillStyle = `rgba(70,62,80,${S.mood * 0.12})`;
      ctx.fillRect(0, 0, W, H);
    }
    // виньетка
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.85);
    vg.addColorStop(0, 'rgba(30,15,35,0)');
    vg.addColorStop(1, `rgba(30,15,35,${0.18 + S.mood * 0.12})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    return stems;
  }

  // ================================================================
  // DOM-оверлеи
  // ================================================================
  function updateDOM(stems) {
    const U = S.U;
    // тексты
    beats.forEach((b) => {
      const fade = 0.24;
      let op = 0;
      if (U >= b.a && U <= b.b) {
        op = b.a === 0 ? 1 : range(U, b.a + 0.02, b.a + fade);
        op = Math.min(op, 1 - range(U, b.b - fade, b.b - 0.02));
      }
      op = Math.round(clamp(op) * 1000) / 1000;
      const vis = op > 0.001;
      if (vis !== b.vis) { b.vis = vis; b.el.style.visibility = vis ? 'visible' : 'hidden'; }
      if (!vis) return;
      if (b.op !== op) { b.op = op; b.el.style.opacity = op; }
      const ty = Math.round((1 - op) * (U < (b.a + b.b) / 2 ? 14 : -10));
      if (b.ty !== ty) { b.ty = ty; b.el.style.transform = `translateY(${ty}px)`; }
    });
    pullBeats.forEach((b, k) => {
      const w = weeds[PULL_ORDER[k]];
      const s = U - TL['pull' + k].a;
      const strike = Math.round(w.strike * 100) / 100;
      const grow = Math.round(range(s, 1.3, 1.62) * 100) / 100;
      const old = Math.round(range(s, 0.86, 1.02) * 100) / 100;
      if (b.vars.o !== old) { b.vars.o = old; b.el.style.setProperty('--old', old); }
      if (b.vars.s !== strike) { b.vars.s = strike; b.el.style.setProperty('--strike', strike); }
      if (b.vars.g !== grow) { b.vars.g = grow; b.el.style.setProperty('--grow', grow); }
    });

    // ярлыки
    const cur = currentWeed();
    weeds.forEach((w, i) => {
      const t = tagEls[i];
      let op = w.tagIn * (1 - w.dissolve);
      const fr = weedFrame(w);
      const isCur = i === cur;
      const pulling = isCur && S.pullIdx >= 0;
      const ps = pulling ? S.pullS : 0;
      // во время прополки ярлык уезжает влево от стебля, чтобы не закрывать садовницу
      const shift = pulling ? smooth(range(ps, 0.05, 0.45)) : 0;
      const p = stemAt(stems[i], lerp(w.look.tag, 0.78, shift));
      const c = Math.cos(fr.r), sn = Math.sin(fr.r);
      const wx = fr.x + p.x * c - p.y * sn, wy = fr.y + p.x * sn + p.y * c;
      let sx = SX(wx) - shift * (t.w * 0.5 + 34 * u * cam.z);
      const sy = SY(wy) - shift * 10 * u;
      if (pulling) op *= 1 - smooth(range(ps, 1.36, 1.6));
      let sc = isCur ? 1 : (mobile ? 0.62 : 0.84);
      if (!isCur) op *= mobile ? 0.55 : 0.85;
      if (S.girl.on > 0 && !isCur) op *= 1 - 0.6 * S.girl.on;
      op *= 1 - smooth(range(U, TL.roots.a, TL.roots.a + 0.5)) * (1 - smooth(range(U, TL.enter.a + 0.2, TL.enter.a + 0.8)));
      sc *= Math.min(1.12, cam.z);
      const half = t.w * sc * 0.5 + 8;
      if (isCur) sx = clamp(sx, half, W - half);
      else if (sx < half || sx > W - half) op *= Math.max(0, 1 - Math.max(half - sx, sx - (W - half)) / 60);
      const rot = (i % 2 ? 1 : -1) * (2 + i) + Math.sin(S.time * 1.2 + i) * 1.2;
      const key = `${(sx - t.w / 2).toFixed(1)},${(sy - t.h / 2).toFixed(1)},${rot.toFixed(1)},${sc.toFixed(3)},${op.toFixed(3)},${w.strike.toFixed(2)},${isCur}`;
      if (t.cache === key) return;
      t.cache = key;
      t.el.style.opacity = op.toFixed(3);
      t.el.style.transform = `translate(${(sx - t.w / 2).toFixed(1)}px, ${(sy - t.h / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
      t.el.style.setProperty('--s', w.strike.toFixed(2));
      t.el.style.zIndex = isCur ? 3 : 1;
    });

    // табличка на корне
    if (S.labelWeed >= 0 && S.labelA > 0.001) {
      const w = weeds[S.labelWeed];
      if (rootcard.dataset.for !== String(S.labelWeed)) {
        rootcard.dataset.for = S.labelWeed;
        rootcardKicker.textContent = 'программа · корень ' + pad(PULL_ORDER.indexOf(S.labelWeed) + 1);
        rootcardText.textContent = WEEDS[S.labelWeed].root;
        rootcard.dataset.w = rootcard.offsetWidth;
        rootcard.dataset.h = rootcard.offsetHeight;
      }
      const fr = weedFrame(w);
      const main = w.roots[0].pts;
      const mid = main[Math.round(main.length * 0.45)];
      const c = Math.cos(fr.r), sn = Math.sin(fr.r);
      const kx = w.grip ? 0.7 : 1;
      const wx = fr.x + mid[0] * kx * c - mid[1] * sn, wy = fr.y + mid[0] * kx * sn + mid[1] * c;
      const cw = +rootcard.dataset.w || 220, ch = +rootcard.dataset.h || 70;
      let x = SX(wx) - cw - 26 * u;
      let y = SY(wy) - ch / 2;
      if (mobile) {
        // на телефоне — под корнем
        const tip = main[main.length - 1];
        const ty = fr.y + tip[0] * kx * sn + tip[1] * c;
        x = SX(wx) - cw / 2;
        y = SY(ty) + 14;
      }
      x = clamp(x, 12, W - cw - 12);
      y = clamp(y, 12, H - ch - 12);
      rootcard.style.opacity = S.labelA.toFixed(3);
      rootcard.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.92 + 0.08 * S.labelA).toFixed(3)})`;
    } else if (rootcard.style.opacity !== '0') {
      rootcard.style.opacity = '0';
    }

    // плавный переход в финальный блок
    const endK = (Math.round(smooth(range(U, TL.outro.a, TOTAL)) * 100) / 100).toFixed(2);
    if (stage.dataset.end !== endK) { stage.dataset.end = endK; stage.style.setProperty('--end', endK); }
    // подсказка и прогресс
    const hp = U < 0.12 ? '1' : '0';
    if (hint.style.opacity !== hp) hint.style.opacity = hp;
    const pr = (U / TOTAL).toFixed(4);
    if (progressBar.dataset.v !== pr) { progressBar.dataset.v = pr; progressBar.style.transform = `scaleX(${pr})`; }
  }
  function currentWeed() {
    const U = S.U;
    if (S.pullIdx >= 0) return PULL_ORDER[S.pullIdx];
    for (let i = 5; i >= 0; i--) if (U >= TL['weed' + i].a && U < TL['weed' + i].b + 0.001) return i;
    return -1;
  }

  // ================================================================
  // ЦИКЛ
  // ================================================================
  let curU = 0, targetU = 0, lastT = performance.now(), first = true, paused = false, perf = 0;
  function readScroll() {
    const r = story.getBoundingClientRect();
    const max = r.height - H;
    return clamp(-r.top / max) * TOTAL;
  }
  let maxDPR = 2, slow = 0, adaptive = true;
  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h;
    sizeCanvas();
    mobile = W < 700;
    G = H * (mobile ? 0.7 : H < 800 ? 0.665 : 0.63);
    u = clamp(Math.min(H / 900, W / (mobile ? 460 : 540)), 0.5, 1.35);
    build();
    measureTags();
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!paused) {
      S.time += dt * S.motion;
      S.introT += dt;
    }
    targetU = readScroll();
    const k = 1 - Math.exp(-dt * 7);
    curU += (targetU - curU) * k;
    if (Math.abs(targetU - curU) < 0.0004) curU = targetU;
    const r = story.getBoundingClientRect();
    const visible = r.bottom > 0 && r.top < H;
    if (visible || first) {
      first = false;
      const t0 = performance.now();
      update(curU);
      if (!paused) { spawnParticles(dt); stepParticles(dt); }
      const stems = render();
      updateDOM(stems);
      perf = perf * 0.95 + (performance.now() - t0) * 0.05;
      // слабое устройство: если кадры стабильно медленные — снижаем чёткость холста
      if (adaptive && !paused) {
        slow = dt > 0.03 ? slow + dt : Math.max(0, slow - dt * 0.5);
        if (slow > 1.6 && maxDPR > 1) { maxDPR = Math.max(1, maxDPR - 0.5); sizeCanvas(); slow = 0; }
      }
    }
    requestAnimationFrame(frame);
  }
  function applyMotionPref() {
    S.motion = reduceMotion.matches ? 0 : 1;
    if (!S.motion) S.introT = 10;
  }
  applyMotionPref();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', applyMotionPref);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureTags(); tagEls.forEach((t) => { t.cache = ''; }); });
  resize();
  curU = targetU = readScroll();
  requestAnimationFrame(frame);

  // Отладка: klumba.go(шаг) — перейти к моменту истории; klumba.pause() — остановить время
  window.klumba = {
    TL, TOTAL, get U() { return curU; },
    go(U) {
      adaptive = false;
      const r = story.getBoundingClientRect();
      const top = window.scrollY + r.top;
      window.scrollTo(0, top + (U / TOTAL) * (r.height - H));
      curU = targetU = U;
      lastU = U;
    },
    pause(v = true) { paused = v; },
    get perf() { return perf; },
    girlBox() {
      const { T } = girlPose();
      const h = T(0, -190);
      return { x: SX(S.girl.x + h[0] * gsc), y: SY(S.girl.y + h[1] * gsc) };
    },
    time(t) { adaptive = false; S.time = t; S.introT = 10; }
  };
})();
