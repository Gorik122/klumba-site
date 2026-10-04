/* «Клумба» как игра.
   Приветствие с цветком → «Представь, что твоя жизнь — клумба» → одним свайпом
   открывается вся клумба → история идёт по шагам: один свайп, нажатие или действие —
   один абзац, чтобы его прочитали, а не пролистали глазами. На чужих фразах —
   «Тебе так говорили?», под землёй — «Заглянуть», корни — зажать и тянуть.
   Посередине — окно «новый уровень», дважды — мягкое «можно написать Надежде».
   Тексты и рисунки истории — из garden.js, здесь только управление. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const html = document.documentElement;
  const K = window.__klumba;
  const D = window.KlumbaData;
  const welcome = $("gmWelcome");
  window.KlumbaGame = true;
  if (!html.classList.contains("is-game") || !welcome || !K || !D || !D.TL || typeof K.go !== "function") {
    html.classList.remove("is-game");
    if (welcome) welcome.remove();
    return;
  }

  const { WEEDS, TL } = D;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* нет вибро */ } };
  const contactHref = (text) => { try { return window.KlumbaContact ? window.KlumbaContact.href(text) : ""; } catch (e) { return ""; } };

  const NOTE = "Если внутри появилось странное чувство, боль или тоска — можно написать Надежде. Это ни к чему не обязывает: она поможет разобрать твою ситуацию и объяснит, откуда идёт корень.";
  const NOTE_MSG = "Здравствуйте, Надежда! Прошла «Клумбу» на сайте — внутри что-то откликнулось. Хочу разобраться, откуда идёт корень.";
  const FLOWER = `<svg viewBox="0 0 16 16" aria-hidden="true"><g fill="#ee8cb4"><circle cx="8" cy="4.6" r="3"/><circle cx="11.4" cy="8" r="3"/><circle cx="8" cy="11.4" r="3"/><circle cx="4.6" cy="8" r="3"/></g><circle cx="8" cy="8" r="2" fill="#f3c450"/></svg>`;
  const PETALS = ["#f7b8d0", "#fbd3e2", "#ee8cb4", "#ffffff", "#f5a3c4", "#f3c450"];

  function noteHTML(cls) {
    const href = contactHref(NOTE_MSG);
    return `<div class="gm-note${cls ? " " + cls : ""}"><p>${NOTE}</p>` +
      (href ? `<a class="gm-note__a" href="${href}" target="_blank" rel="noopener">Написать Надежде</a>` : "") +
      `</div>`;
  }

  /* ================= шаги истории ================= */
  // место каждого шага — доля истории (p) или ход мостика (b) из garden.js
  const at = (k, u) => TL.pull0 + TL.pullStep * (k + u);
  const GRAB = 0.34, OUT = 0.66; // садовница взялась за сорняк → корень вышел
  const STEPS = [{ id: "life", b: 0.25 }, { id: "seeds", b: 0.8 }];
  WEEDS.forEach((w, i) => STEPS.push({ id: "w" + i, p: TL.weed0 + i * TL.weedStep + TL.weedLen, ask: i }));
  STEPS.push({ id: "choke", p: (TL.choke + TL.girlIn[0]) / 2, note: true });
  STEPS.push({ id: "girl", p: TL.dig - 0.01, level: true });
  STEPS.push({ id: "dig", p: TL.dig + 0.004, peek: true });
  STEPS.push({ id: "roots", p: TL.pull0 - 0.002 });
  for (let k = 0; k < WEEDS.length; k++) {
    STEPS.push({ id: "pull" + k, p: at(k, GRAB), pull: k });
    STEPS.push({ id: "bloom" + k, p: at(k, 0.985) });
  }
  STEPS.push({ id: "fin", p: TL.finale + 0.05, end: true });

  let on = true;          // игра идёт: страница сама не листается
  let phase = "hello";    // hello → intro → story
  let idx = -1;           // текущий шаг
  let ready = false;      // шаг доехал, кнопки показаны
  let modal = false;      // открыто окно уровня
  let levelSeen = false;
  let token = 0;          // номер перехода: старые таймеры не трогают новый шаг
  const answers = [];     // «Тебе так говорили?» по каждой фразе

  // пока идёт игра, блоки под историей недоступны: Tab не утащит страницу вниз
  const below = [...document.querySelectorAll("main > section")];
  below.forEach((s) => (s.inert = true));

  const bar = document.createElement("div");
  bar.className = "gm-bar is-away";
  bar.setAttribute("aria-live", "polite");
  document.body.appendChild(bar);

  /* ================= приветствие ================= */
  const startBtn = $("gmStart"), intro = $("gmIntro"), cue = $("gmCue"), skip = $("gmSkip");
  const introText = intro.querySelector(".gm-intro__text");
  let introAt = 0;

  function start() {
    if (phase !== "hello") return;
    phase = "intro";
    // «Представь, что твоя жизнь — клумба» — тот же текст, что в истории
    const cap = document.querySelector("#caption .in");
    introText.innerHTML = cap && /клумба/i.test(cap.textContent) ? cap.innerHTML : "<h1>Представь, что твоя жизнь&nbsp;— клумба.</h1>";
    const r = startBtn.getBoundingClientRect();
    burstAt(welcome, r.left + r.width / 2, r.top + r.height / 2, 24);
    startBtn.classList.add("is-go");
    welcome.classList.add("is-intro");
    introAt = performance.now();
    buzz(14);
    // клумба за занавесом заранее встаёт на «Вот твоя жизнь…»
    setTimeout(() => { if (phase === "intro") K.seekBridge(0.02); }, 700);
  }

  function reveal() {
    if (phase !== "intro" || performance.now() - introAt < 1300) return;
    phase = "story";
    welcome.classList.add("is-gone");
    setTimeout(() => welcome.remove(), 1300);
    // слова «Вот твоя жизнь…» проявляются вместе с клумбой
    setTimeout(() => {
      const el = document.querySelector("#caption .in");
      if (el) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
    }, 250);
    goTo(0);
  }

  function nudgeFlower() {
    startBtn.classList.remove("is-nudge");
    void startBtn.offsetWidth;
    startBtn.classList.add("is-nudge");
  }

  startBtn.addEventListener("click", start);
  startBtn.addEventListener("animationend", (e) => { if (e.animationName === "gmNudge") startBtn.classList.remove("is-nudge"); });
  cue.addEventListener("click", reveal);
  skip.addEventListener("click", (e) => {
    e.preventDefault();
    phase = "story";
    welcome.classList.add("is-gone");
    setTimeout(() => welcome.remove(), 1300);
    exitGame();
    const g = $("gardener");
    if (g) g.scrollIntoView({ behavior: "auto", block: "start" });
  });

  /* ================= переходы между шагами ================= */
  function goTo(i) {
    const S = STEPS[i];
    if (!S) return;
    idx = i;
    ready = false;
    const my = ++token;
    holdReset();
    bar.classList.add("is-away");
    if (S.b !== undefined) K.goBridge(S.b);
    else K.go(S.p);
    // кнопки появляются, когда история доехала и абзац уже на экране
    const t0 = performance.now();
    const tick = (now) => {
      if (my !== token) return;
      const there = S.b !== undefined ? Math.abs(K.bridge - S.b) < 0.02 : Math.abs(K.p - S.p) < 0.0025;
      if ((there && now - t0 > 500) || now - t0 > 3500) return arrive(S, my);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function arrive(S, my) {
    bar.innerHTML = barHTML(S);
    bar.dataset.step = S.id;
    const hold = bar.querySelector(".gm-hold");
    if (hold) bindHold(hold);
    setTimeout(() => {
      if (my !== token) return;
      ready = true;
      bar.classList.remove("is-away");
    }, 260);
  }

  function barHTML(S) {
    if (S.ask !== undefined) {
      const a = answers[S.ask];
      return `<p class="gm-q">Тебе так говорили?</p>` +
        `<div class="gm-row"><button type="button" class="gm-btn gm-btn--dark${a === true ? " is-on" : ""}" data-a="1">Да, говорили</button>` +
        `<button type="button" class="gm-btn gm-btn--light${a === false ? " is-on" : ""}" data-a="0">Нет</button></div>`;
    }
    if (S.pull !== undefined) {
      return `<button type="button" class="gm-hold" aria-label="Зажми и тяни корень"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="gm-hold__bg" cx="50" cy="50" r="46"/><circle class="gm-hold__ring" cx="50" cy="50" r="46"/></svg><span>тяни</span></button>` +
        `<p class="gm-tip">зажми и держи</p>`;
    }
    if (S.peek) return `<button type="button" class="gm-btn" data-next>Заглянуть под землю <i class="gm-arr"></i></button>`;
    let out = "";
    if (S.note) {
      const n = answers.filter(Boolean).length;
      if (n) out += `<p class="gm-q">Ты слышала ${n} из&nbsp;${WEEDS.length} фраз</p>`;
      out += noteHTML("");
    }
    out += `<button type="button" class="gm-btn" data-next>${S.end ? "Дальше — твоя клумба" : "Дальше"} <i class="gm-arr"></i></button>`;
    if (idx < 2) out += `<p class="gm-tip">или листай</p>`;
    return out;
  }

  function next() {
    if (phase === "hello") return nudgeFlower();
    if (phase === "intro") return reveal();
    if (!on || modal || !ready) return;
    const S = STEPS[idx];
    if (!S) return;
    if ((S.ask !== undefined && answers[S.ask] === undefined) || S.pull !== undefined) return nudge();
    if (S.end) return finish();
    if (STEPS[idx + 1].level && !levelSeen) return openLevel();
    goTo(idx + 1);
  }

  function back() {
    if (phase !== "story" || !on || modal || idx <= 0) return;
    goTo(idx - 1);
  }

  function nudge() {
    bar.classList.remove("is-nudge");
    void bar.offsetWidth;
    bar.classList.add("is-nudge");
    buzz(10);
  }
  bar.addEventListener("animationend", (e) => { if (e.animationName === "gmShake") bar.classList.remove("is-nudge"); });

  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !ready) return;
    if (b.dataset.a !== undefined) answer(b.dataset.a === "1", b);
    else if (b.hasAttribute("data-next")) next();
  });

  function answer(yes, btn) {
    const S = STEPS[idx];
    answers[S.ask] = yes;
    bar.querySelectorAll("[data-a]").forEach((x) => x.classList.toggle("is-on", x === btn));
    buzz(yes ? 14 : 8);
    ready = false;
    const my = token;
    setTimeout(() => { if (my === token) goTo(idx + 1); }, 420);
  }

  /* ================= корень: зажать и тянуть ================= */
  const PULL_T = 1.5; // секунд держать
  const H = { down: false, prog: 0, raf: 0, last: 0, buzzAt: 0, warned: false };
  let ring = null;

  function bindHold(btn) {
    ring = btn.querySelector(".gm-hold__ring");
    btn.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (x) { /* старый браузер */ }
      holdStart();
    });
    for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) btn.addEventListener(n, holdStop);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function holdStart() {
    const S = STEPS[idx];
    if (!on || !ready || !S || S.pull === undefined) return;
    H.down = true;
    bar.classList.add("is-holding");
    if (!H.raf) {
      H.last = performance.now();
      H.raf = requestAnimationFrame(holdLoop);
    }
  }

  function holdStop() {
    if (!H.down) return;
    H.down = false;
    bar.classList.remove("is-holding");
    if (H.prog > 0.04 && H.prog < 1 && !H.warned) {
      H.warned = true;
      const tip = bar.querySelector(".gm-tip");
      if (tip) tip.textContent = "не отпускай — корень ещё держится";
    }
  }

  function holdReset() {
    H.down = false;
    H.prog = 0;
    H.warned = false;
    if (H.raf) cancelAnimationFrame(H.raf);
    H.raf = 0;
    bar.classList.remove("is-holding");
  }

  function holdLoop(now) {
    H.raf = 0;
    const S = STEPS[idx];
    if (!S || S.pull === undefined) return;
    const dt = Math.min(0.05, (now - H.last) / 1000);
    H.last = now;
    H.prog = H.down ? Math.min(1, H.prog + dt / PULL_T) : Math.max(0, H.prog - dt / 0.8);
    // корень сначала сопротивляется, потом идёт легче; отпустишь — уходит обратно в землю
    K.go(at(S.pull, GRAB + (OUT - GRAB) * Math.pow(H.prog, 1.7)));
    if (ring) ring.style.strokeDashoffset = (289.03 * (1 - H.prog)).toFixed(1);
    if (H.down && now > H.buzzAt) {
      buzz(6);
      H.buzzAt = now + 140;
    }
    if (H.prog >= 1) return pulledOut();
    if (H.down || H.prog > 0) H.raf = requestAnimationFrame(holdLoop);
  }

  function pulledOut() {
    H.down = false;
    bar.classList.remove("is-holding");
    buzz([24, 50, 34]);
    goTo(idx + 1);
  }

  /* ================= окно «новый уровень» ================= */
  let pop = null;

  function openLevel() {
    modal = true;
    ready = false;
    bar.classList.add("is-away");
    const mine = WEEDS.find((w, i) => answers[i]);
    const ex = (mine || WEEDS[4]).phrase;
    pop = document.createElement("div");
    pop.className = "gm-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    pop.setAttribute("aria-labelledby", "gmPopT");
    pop.innerHTML =
      `<div class="gm-pop__card">` +
      `<div class="gm-pop__medal" aria-hidden="true">${FLOWER}</div>` +
      `<p class="kicker">уровень 1 пройден</p>` +
      `<h2 id="gmPopT">Поздравляю! Ты&nbsp;перешла на&nbsp;новый уровень</h2>` +
      `<p class="gm-pop__foe">Следующий твой противник — это&nbsp;ты.</p>` +
      `<p class="gm-pop__p">Не настоящая ты, а&nbsp;внутренний голос, который выучил чужие фразы и&nbsp;теперь повторяет их твоим голосом. Сорняки посадили другие — а&nbsp;поливает их он, каждый раз, когда ты ему веришь.</p>` +
      `<p class="gm-pop__h">как понять, что включилась программа</p>` +
      `<ul class="gm-pop__list">` +
      `<li>Реакция сильнее, чем повод: мелочь — а&nbsp;внутри обвал.</li>` +
      `<li>В голове звучат «всегда», «никогда», «опять&nbsp;я».</li>` +
      `<li>Тело сжимается раньше, чем ты успела подумать.</li>` +
      `<li>Хочется оправдаться, спрятаться или срочно всем угодить.</li>` +
      `</ul>` +
      `<p class="gm-pop__h">приём этого уровня — «чей это голос?»</p>` +
      `<ol class="gm-pop__steps">` +
      `<li>Заметь укол и&nbsp;назови его: «Это сорняк „${ex}“».</li>` +
      `<li>Спроси себя: «Чей это голос? Кто мне так говорил?»</li>` +
      `<li>Ответь новым цветком: «Мне можно…» — и&nbsp;сделай один маленький шаг по-своему.</li>` +
      `</ol>` +
      `<p class="gm-pop__end">Воевать с&nbsp;собой не придётся. Достаточно перестать поливать то, что посадили другие.</p>` +
      `<button type="button" class="btn gm-pop__go">Принять вызов</button>` +
      `</div>`;
    document.body.appendChild(pop);
    pop.querySelector(".gm-pop__go").addEventListener("click", closeLevel);
    requestAnimationFrame(() => requestAnimationFrame(() => pop && pop.classList.add("is-in")));
    setTimeout(() => {
      if (!pop) return;
      const m = pop.querySelector(".gm-pop__medal").getBoundingClientRect();
      burstAt(pop, m.left + m.width / 2, m.top + m.height / 2, 26);
      try { pop.querySelector(".gm-pop__go").focus({ preventScroll: true }); } catch (e) { /* без фокуса */ }
    }, 320);
    try { window.KlumbaMusic && window.KlumbaMusic.bloom && window.KlumbaMusic.bloom(); } catch (e) { /* без звука */ }
    buzz([18, 70, 26]);
  }

  function closeLevel() {
    if (!modal) return;
    modal = false;
    levelSeen = true;
    const p = pop;
    pop = null;
    p.classList.remove("is-in");
    setTimeout(() => p.remove(), 400);
    goTo(idx + 1);
  }

  /* ================= конец истории ================= */
  function finish() {
    exitGame();
    const outro = $("outro");
    if (outro) setTimeout(() => outro.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" }), 30);
  }

  function exitGame() {
    if (!on) return;
    on = false;
    ready = false;
    token++;
    holdReset();
    html.classList.remove("is-game");
    below.forEach((s) => (s.inert = false));
    bar.remove();
    removeEventListener("wheel", onWheel, OPT);
    removeEventListener("touchstart", onTouchStart, PASSIVE);
    removeEventListener("touchmove", onTouchMove, OPT);
    removeEventListener("touchend", onTouchEnd, PASSIVE);
    removeEventListener("keydown", onKey);
    removeEventListener("keyup", onKeyUp);
    document.removeEventListener("click", onClick);
  }

  /* ================= жесты: один свайп — один шаг ================= */
  const OPT = { passive: false };
  const PASSIVE = { passive: true };
  let wLock = 0, wAcc = 0, wLast = 0;

  function onWheel(e) {
    if (!on || e.ctrlKey) return; // ctrl + колесо — масштаб страницы
    if (modal && e.target.closest && e.target.closest(".gm-pop__card")) return; // окно уровня листается само
    e.preventDefault();
    if (modal) return;
    const now = performance.now();
    // хвост инерции прошлого жеста (тачпад) не листает дальше
    if (now < wLock) { wLock = Math.max(wLock, now + 200); return; }
    if (now - wLast > 250) wAcc = 0;
    wLast = now;
    wAcc += e.deltaY * (e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 400 : 1);
    if (Math.abs(wAcc) < 30) return;
    const dir = wAcc > 0;
    wAcc = 0;
    wLock = now + 700;
    if (dir) next();
    else back();
  }

  let T0 = null;
  function onTouchStart(e) {
    T0 = null;
    if (!on || e.touches.length !== 1) return;
    if (e.target.closest && e.target.closest(".gm-hold, .gm-pop__card")) return;
    const t = e.touches[0];
    T0 = { x: t.clientX, y: t.clientY };
  }
  function onTouchMove(e) {
    if (!on || e.touches.length > 1) return; // щипок — масштаб
    if (modal && e.target.closest && e.target.closest(".gm-pop__card")) return;
    if (e.cancelable) e.preventDefault();
  }
  function onTouchEnd(e) {
    if (!on || !T0 || modal) { T0 = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - T0.x, dy = t.clientY - T0.y;
    T0 = null;
    if (Math.abs(dy) < 42 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
    if (dy < 0) next();
    else back();
  }

  // нажатие по сцене — как «дальше» (там, где не нужно выбирать или тянуть)
  function onClick(e) {
    if (!on || modal) return;
    if (e.target.closest("button, a, input, label, .gm-pop, .gm-bar")) return;
    if (phase === "story") {
      const S = STEPS[idx];
      if (!S || !ready) return;
      if (S.ask !== undefined || S.pull !== undefined) return nudge();
    }
    next();
  }

  function onKey(e) {
    if (!on) return;
    if (modal) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLevel();
      }
      return;
    }
    const k = e.key;
    const S = phase === "story" ? STEPS[idx] : null;
    if (S && S.pull !== undefined && (k === " " || k === "Enter" || k === "ArrowDown")) {
      e.preventDefault();
      if (!e.repeat) holdStart();
      return;
    }
    const onCtl = e.target.closest && e.target.closest("button, a");
    if (k === " " || k === "Enter") {
      if (onCtl) return;
      e.preventDefault();
      next();
    } else if (k === "ArrowDown" || k === "PageDown") {
      e.preventDefault();
      next();
    } else if (k === "ArrowUp" || k === "PageUp") {
      e.preventDefault();
      back();
    } else if (k === "Home" || k === "End") e.preventDefault();
  }
  function onKeyUp(e) {
    if (!on) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") holdStop();
  }

  addEventListener("wheel", onWheel, OPT);
  addEventListener("touchstart", onTouchStart, PASSIVE);
  addEventListener("touchmove", onTouchMove, OPT);
  addEventListener("touchend", onTouchEnd, PASSIVE);
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKeyUp);
  document.addEventListener("click", onClick);

  // повернули телефон или изменили окно — история остаётся на том же шаге
  addEventListener("resize", () => {
    if (!on || phase !== "story" || idx < 0 || H.prog > 0) return;
    const S = STEPS[idx];
    if (S.b !== undefined) K.goBridge(S.b);
    else K.go(S.p);
  });

  /* ================= салют из лепестков ================= */
  function burstAt(host, x, y, n) {
    if (reduce.matches || !host) return;
    const b = document.createElement("div");
    b.className = "gm-burst";
    b.style.left = x.toFixed(1) + "px";
    b.style.top = y.toFixed(1) + "px";
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 80 + Math.random() * 120;
      s.style.setProperty("--x", (Math.cos(a) * d).toFixed(1) + "px");
      s.style.setProperty("--y", (Math.sin(a) * d * 0.9 + 30).toFixed(1) + "px"); // чуть вниз — лепестки падают
      s.style.setProperty("--r", Math.round(Math.random() * 600 - 300) + "deg");
      s.style.background = PETALS[i % PETALS.length];
      s.style.animationDelay = (Math.random() * 0.12).toFixed(2) + "s";
      b.appendChild(s);
    }
    host.appendChild(b);
    setTimeout(() => b.remove(), 1700);
  }

  /* ================= после истории ================= */
  // заметка №2 — после разворота корней, где читают про детство
  const map = $("map");
  if (map) map.insertAdjacentHTML("afterend", noteHTML("gm-note--page"));

  // «Моя клумба»: фразы, которые она отметила в истории, сами прорастают, когда блок появится на экране
  const bed = $("mybed"), chips = $("chips");
  if (bed && chips && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      if (on || !ents.some((en) => en.isIntersecting)) return;
      io.disconnect();
      const want = WEEDS.map((w, i) => (answers[i] ? `«${w.phrase}»` : "")).filter(Boolean);
      const btns = [...chips.querySelectorAll(".phrase")].filter((b) => want.includes(b.textContent) && b.getAttribute("aria-pressed") !== "true");
      if (!btns.length) return;
      const lead = bed.querySelector(".outro__lead");
      if (lead) lead.insertAdjacentHTML("afterend", `<p class="gm-planted">Фразы, которые ты отметила в истории, уже посажены. Добавь те, что ещё слышала.</p>`);
      btns.forEach((b, k) => setTimeout(() => b.click(), 500 + k * 420));
    }, { threshold: 0.3 });
    io.observe(bed);
  }

  // для проверок
  window.__klumbaGame = {
    get phase() { return phase; },
    get step() { return STEPS[idx] ? STEPS[idx].id : ""; },
    get ready() { return ready; },
    get on() { return on; },
    get modal() { return modal; },
    answers
  };
})();
