/* Музыка клумбы: сказочная, играет сама из Web Audio (без файлов).
   Каждый шаг прокрутки звенит нотой музыкальной шкатулки, фон и лад
   меняются вместе с историей, чужие фразы отзываются глухим ударом,
   вынутый корень — россыпью колокольчиков. Включается сама с первого касания, кнопкой — выключается. */
(() => {
  "use strict";

  const KEY = "klumba-sound";
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // настроение по ходу истории: фон (аккорд), шкатулка (лад), яркость
  const MOODS = [
    { at: 0, pad: [50, 57, 64, 66, 69], scale: [62, 64, 66, 68, 69, 71, 73, 74, 76, 78, 81, 83], bright: 1 },        // D лидийский — волшебное начало
    { at: 0.055, pad: [50, 57, 62, 65, 69], scale: [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79], bright: 0.7 },       // D минор — первые чужие слова
    { at: 0.2, pad: [46, 53, 62, 65, 68], scale: [62, 63, 65, 66, 68, 69, 71, 72, 74], bright: 0.5 },                // сгущается
    { at: 0.355, pad: [43, 50, 58, 61, 63], scale: [58, 61, 62, 63, 66, 67, 70], bright: 0.35 },                      // клумба задыхается
    { at: 0.385, pad: [46, 58, 62, 65, 69, 76], scale: [70, 72, 74, 76, 77, 79, 81, 82, 84, 86, 88], bright: 1.1 },   // приходит садовница
    { at: 0.445, pad: [43, 55, 58, 62, 69], scale: [62, 65, 67, 69, 70, 72, 74, 77, 79], bright: 0.65 },             // глубже, чем видно
    { at: 0.515, pad: [50, 57, 62, 64, 69], scale: [62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79], bright: 0.85 },     // корни выходят
    { at: 0.875, pad: [50, 57, 62, 66, 69, 76], scale: [74, 76, 78, 81, 83, 86, 88, 90, 93], bright: 1.25 }          // сад снова живой
  ];
  const moodAt = (p) => { let k = 0; for (let i = 0; i < MOODS.length; i++) if (p >= MOODS[i].at) k = i; return k; };

  let ctx = null, master, dry, wet, lp, on = false, wanted = false;
  let pad = null, padMood = -1, lastP = -1, acc = 0, step = 0, lastNote = 0, lastScroll = 0, idleT = 0;
  let pulledSeen = 0, girlSeen = false, finSeen = false;

  function impulse(sec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    return b;
  }

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} // iPhone: играть и при беззвучном режиме
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    lp.connect(master);
    dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(lp);
    const rev = ctx.createConvolver(); rev.buffer = impulse(3.4);
    wet = ctx.createGain(); wet.gain.value = 0.55;
    rev.connect(wet); wet.connect(lp);
    dry.rev = rev;
    return true;
  }
  const out = (node, pan) => {
    let n = node;
    if (pan && ctx.createStereoPanner) { const s = ctx.createStereoPanner(); s.pan.value = pan; n.connect(s); n = s; }
    n.connect(dry); n.connect(dry.rev);
  };

  // нота музыкальной шкатулки / колокольчика
  function chime(m, t, vel, dec, pan) {
    const f = hz(m), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    [[1, 1], [2, 0.28], [3.01, 0.1], [4.2, 0.05]].forEach(([k, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f * k;
      og.gain.value = a;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dec + 0.05);
    });
    out(g, pan);
  }

  // мягкий фон-аккорд, плавно перетекающий при смене настроения
  function setPad(k) {
    if (k === padMood) return;
    padMood = k;
    const t = ctx.currentTime, M = MOODS[k];
    if (pad) {
      const old = pad;
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setValueAtTime(old.g.gain.value, t);
      old.g.gain.linearRampToValueAtTime(0, t + 2.6);
      setTimeout(() => old.oscs.forEach((o) => { try { o.stop(); } catch (e) {} }), 3000);
    }
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 500 + 900 * M.bright;
    f.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.055, t + 3);
    f.connect(g);
    out(g);
    const oscs = [];
    M.pad.forEach((m, i) => {
      [-6, 6].forEach((cents, j) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = j ? "sine" : "triangle";
        o.frequency.value = hz(m);
        o.detune.value = cents;
        og.gain.value = 1 / M.pad.length;
        // медленное «дыхание» фона
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.07 + 0.05 * i;
        lg.gain.value = 0.35 / M.pad.length;
        lfo.connect(lg); lg.connect(og.gain);
        o.connect(og); og.connect(f);
        o.start(t); lfo.start(t);
        oscs.push(o, lfo);
      });
    });
    pad = { g, oscs };
  }

  function sparkle(scale, n, t, dir) {
    for (let i = 0; i < n; i++) {
      const m = scale[Math.min(scale.length - 1, i % scale.length)] + (i >= scale.length ? 12 : 0);
      chime(dir > 0 ? m + 12 : m, t + i * 0.07, 0.09, 1.6, (i / n) * 1.2 - 0.6);
    }
  }

  // --- вызывается из garden.js каждый кадр ---
  function frame(p, s) {
    if (!on || !ctx) return;
    const now = ctx.currentTime, k = moodAt(p), M = MOODS[k];
    setPad(k);
    lp.frequency.setTargetAtTime(1800 + 4200 * Math.min(1.2, M.bright) * (1 - 0.45 * (s.gloom || 0)), now, 0.4);

    if (lastP < 0) lastP = p;
    const dp = p - lastP;
    lastP = p;
    if (Math.abs(dp) > 0.2) { acc = 0; return; } // прыжок (перезагрузка, якорь)
    acc += Math.abs(dp);
    if (Math.abs(dp) > 0.00002) lastScroll = now;

    // шаг прокрутки = нота; вниз — мелодия поднимается, вверх — спускается
    if (acc > 0.0045 && now - lastNote > 0.085) {
      acc = 0;
      lastNote = now;
      step += dp >= 0 ? 1 : -1;
      const L = M.scale.length, i = ((step % (L * 2 - 2)) + (L * 2 - 2)) % (L * 2 - 2);
      const idx = i < L ? i : L * 2 - 2 - i;
      chime(M.scale[idx], now, 0.07 + Math.min(0.06, Math.abs(dp) * 8), 1.3 + 0.8 * M.bright, (idx / L) * 1.1 - 0.55);
    }

    // в тишине шкатулка тихо перебирает сама
    if (now - lastScroll > 1.2 && now > idleT) {
      idleT = now + 1.4 + Math.random() * 1.8;
      const m = M.scale[Math.floor(Math.random() * M.scale.length)];
      chime(m + (Math.random() < 0.3 ? 12 : 0), now, 0.035, 2.2, Math.random() - 0.5);
    }

    // события истории (только вперёд)
    if (!girlSeen && p >= 0.385 && p < 0.45) { girlSeen = true; sparkle(MOODS[4].scale, 11, now, 0); }
    if (p < 0.37) girlSeen = false;
    const pulled = s.pulled || 0;
    if (pulled > pulledSeen) sparkle(M.scale, 6, now, 1);
    pulledSeen = pulled;
    if (!finSeen && p >= 0.88) { finSeen = true; sparkle(MOODS[7].scale, 9, now, 0); }
    if (p < 0.86) finSeen = false;
  }

  // удар чужой фразы: глухой толчок и режущий полутон
  function hurt() {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(lp);
    o.start(t); o.stop(t + 0.75);
    chime(63, t + 0.02, 0.07, 1.8, -0.3);
    chime(64, t + 0.02, 0.06, 1.8, 0.3);
  }

  // --- кнопка ---
  const btn = document.getElementById("sound");
  function paint() {
    if (!btn) return;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Выключить музыку" : "Включить музыку");
    btn.querySelector(".sound__label").textContent = on ? "звук вкл" : "музыка";
  }
  function start() {
    if (!ctx && !init()) return;
    if (ctx.state !== "running") ctx.resume();
    on = true;
    lastP = -1;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0.9, t + 1.2);
    sparkle(MOODS[0].scale, 7, t + 0.1, 0);
    paint();
  }
  function stop() {
    on = false;
    if (ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 700);
    }
    paint();
  }
  const save = (v) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} };
  if (btn) btn.addEventListener("click", () => { wanted = !on; save(wanted); wanted ? start() : stop(); });

  // музыка включена по умолчанию (пока человек сам её не выключит) и стартует
  // с первого касания/прокрутки — без жеста браузер звучать не даёт
  try { wanted = localStorage.getItem(KEY) !== "0"; } catch (e) { wanted = true; }
  const GESTURES = ["pointerdown", "touchend", "click", "keydown", "wheel"];
  const first = (e) => {
    if (btn && btn.contains(e.target)) return;
    if (!wanted) return;
    if (!on) start();
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
    setTimeout(() => {
      if (ctx && ctx.state === "running") GESTURES.forEach((n) => removeEventListener(n, first, true));
    }, 300);
  };
  GESTURES.forEach((n) => addEventListener(n, first, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !on) return;
    document.hidden ? ctx.suspend() : ctx.resume();
  });
  paint();

  window.KlumbaMusic = { frame, hurt, get on() { return on; } };
})();
