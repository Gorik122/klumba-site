(() => {
  const weedsData = [
    {
      x: 18,
      phrase: "«Не высовывайся»",
      note: "Чужое мнение садится в землю и забирает воду у цветов.",
      gain: "Перестань думать о чужом мнении. У тебя появляются силы и желание творить."
    },
    {
      x: 30,
      phrase: "«Много хочешь»",
      note: "Желание объявляют лишним. Клумба начинает отдавать ресурс сорняку.",
      gain: "Перестань стыдить своё желание. Появляется место хотеть своё."
    },
    {
      x: 44,
      phrase: "«Надо заслужить»",
      note: "Жизнь ставят после подвига. Цветы тихо недополучают силу.",
      gain: "Перестань откладывать жизнь. Появляется право жить сейчас."
    },
    {
      x: 58,
      phrase: "«Будь удобной»",
      note: "Удобство кормит сорняк. Клумба тускнеет, пока ты меньше себя.",
      gain: "Перестань быть удобной. Появляется желание творить своё."
    },
    {
      x: 70,
      phrase: "«Что подумают»",
      note: "Чужой взгляд сидит в почве. На цветы уже не хватает земли.",
      gain: "Перестань жить чужим взглядом. Появляется своя опора."
    },
    {
      x: 82,
      phrase: "«Тебе нельзя»",
      note: "Запрет доедает клумбу. Жизнь, собранная из чужих страхов, потухает.",
      gain: "Перестань слушаться чужого запрета. Появляется сила быть собой."
    }
  ];

  const beats = [
    { id: "living", a: 0, b: 0, c: 0.08, d: 0.12 },
    { id: "breath", a: 0.08, b: 0.12, c: 0.18, d: 0.22, video: true },
    { id: "choked", a: 0.18, b: 0.22, c: 0.44, d: 0.5 },
    { id: "pull", a: 0.44, b: 0.5, c: 0.66, d: 0.72 },
    { id: "pull-close", a: 0.66, b: 0.72, c: 0.84, d: 0.9 },
    { id: "revived", a: 0.84, b: 0.9, c: 1.05, d: 1.12 }
  ];

  const weedSvg = `
    <svg viewBox="0 0 80 220">
      <path d="M40 220 C44 150 30 90 40 20" stroke="#6a4a32" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 160 C18 140 12 120 8 100" stroke="#7a5638" stroke-width="2" fill="none"/>
      <path d="M38 120 C58 100 66 80 72 58" stroke="#7a5638" stroke-width="2" fill="none"/>
      <circle cx="40" cy="16" r="5" fill="#8d6a48"/>
    </svg>`;

  const weedsWrap = document.getElementById("weeds");
  weedsData.forEach((w, i) => {
    const el = document.createElement("div");
    el.className = "weed";
    el.id = "w" + i;
    el.style.left = w.x + "%";
    el.style.height = (168 + (i % 3) * 22) + "px";
    el.innerHTML = `<div class="tag">${w.phrase}</div>${weedSvg}`;
    weedsWrap.appendChild(el);
  });

  const track = document.getElementById("track");
  const stage = document.getElementById("stage");
  const caption = document.getElementById("caption");
  const toast = document.getElementById("toast");
  const hint = document.getElementById("hint");
  const bar = document.getElementById("bar");
  const canvas = document.getElementById("life");
  const ctx = canvas.getContext("2d");
  const heroes = new Map([...document.querySelectorAll(".hero")].map((node) => [node.dataset.beat, node]));

  heroes.forEach((node) => {
    if (node.tagName === "VIDEO") {
      node.muted = true;
      node.defaultMuted = true;
      node.playsInline = true;
      node.setAttribute("muted", "");
      node.setAttribute("playsinline", "");
    }
  });

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const range = (p, a, b) => clamp(b === a ? 1 : (p - a) / (b - a), 0, 1);
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function envelope(p, a, b, c, d) {
    if (p < a || p >= d) return 0;
    if (b > a && p < b) return (p - a) / (b - a);
    if (p <= c) return 1;
    return (d - p) / (d - c);
  }

  function setCap(html) {
    if (caption.dataset.k !== html) {
      caption.innerHTML = html;
      caption.dataset.k = html;
    }
  }
  function setToast(text) {
    if (toast.dataset.k !== text) {
      toast.textContent = text;
      toast.dataset.k = text;
    }
  }

  const petals = [];
  const colors = ["#f3b6cf", "#fff4f8", "#e7c6ef", "#d98aa8"];
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  function spawn(top) {
    petals.push({
      x: Math.random() * innerWidth,
      y: top ? -12 : Math.random() * innerHeight * 0.45,
      r: 2.5 + Math.random() * 4,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.04,
      vx: 0.15 + Math.random() * 0.35,
      vy: 0.2 + Math.random() * 0.4,
      c: colors[(Math.random() * colors.length) | 0],
      w: Math.random() * 6
    });
  }
  for (let i = 0; i < 14; i++) spawn(false);

  function drawPetals(lively) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const target = lively ? 22 : 0;
    while (petals.length < target) spawn(true);
    if (petals.length > target + 4) petals.length = target;
    petals.forEach((p, i) => {
      p.w += 0.03;
      p.x += p.vx + Math.sin(p.w) * 0.25;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > innerHeight + 16) petals[i] = null;
    });
    for (let i = petals.length - 1; i >= 0; i--) if (!petals[i]) petals.splice(i, 1);
    ctx.globalAlpha = lively ? 0.8 : 0;
    petals.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.28);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function syncVideo(node, w, reduce) {
    if (reduce || w < 0.2) {
      if (!node.paused) node.pause();
      return;
    }
    if (node.paused) {
      const pending = node.play();
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    }
  }

  let lastP = -1;
  let frame = 0;

  function apply(p) {
    const reduce = reduceMotion();
    const end = ease(range(p, 0.9, 0.98));
    bar.style.width = (p * 100) + "%";

    beats.forEach((beat) => {
      const node = heroes.get(beat.id);
      let { a, b, c, d } = beat;
      if (reduce && beat.video) {
        node.style.opacity = "0";
        node.style.transform = "scale(1)";
        syncVideo(node, 0, true);
        return;
      }
      if (reduce && beat.id === "living") d = 0.22;
      const w = envelope(p, a, b, c, d);
      node.style.opacity = String(w);
      node.style.transform = `scale(${1.025 + w * 0.035})`;
      node.style.zIndex = String(2 + Math.round(w * 8));
      if (beat.video) syncVideo(node, w, reduce);
    });

    let feeding = 0;
    weedsData.forEach((w, i) => {
      const g0 = 0.08 + i * 0.06;
      const grown = ease(range(p, g0, g0 + 0.045));
      const p0 = 0.56 + i * 0.055;
      const pulled = ease(range(p, p0, p0 + 0.04));
      const el = document.getElementById("w" + i);
      const shown = grown > 0.02 && pulled < 0.96 && end < 0.5;
      el.style.opacity = shown ? String(Math.min(1, grown) * (1 - pulled * 0.9)) : "0";
      el.style.transform = `translateY(${pulled * 8}vh) scale(${0.15 + 0.85 * grown * (1 - pulled * 0.4)})`;
      el.querySelector(".tag").style.opacity = grown > 0.8 && pulled < 0.15 ? "1" : "0";
      if (grown > 0.7 && pulled < 0.2) feeding += 1;
    });

    const wilt = feeding / weedsData.length;
    stage.classList.toggle("is-wilt", wilt > 0.34 && end < 0.4);
    stage.classList.toggle("is-alive", end > 0.55 || wilt < 0.05);

    hint.style.opacity = p < 0.045 ? "1" : "0";
    const pullIdx = p >= 0.56 && p < 0.9 ? clamp(Math.floor((p - 0.56) / 0.055), 0, 5) : -1;
    const showToast = pullIdx >= 0;
    toast.style.opacity = showToast ? "1" : "0";
    toast.style.transform = `translateX(-50%) translateY(${showToast ? 0 : 12}px)`;
    if (showToast) setToast(weedsData[pullIdx].gain);
    else setToast("");

    if (p < 0.08) {
      setCap(`<div class="kicker">клумба</div><h1>Ваша жизнь подобна этой клумбе.</h1><p class="sub">Цветы живые и чуть шевелятся. Пока в земле не появляется то, чего вы не сажали.</p>`);
    } else if (p < 0.46) {
      const idx = clamp(Math.floor((p - 0.08) / 0.06), 0, 5);
      const w = weedsData[idx];
      setCap(`<div class="kicker">сорняк 0${idx + 1}</div><div class="quote">${w.phrase}</div><p class="sub">${w.note} Чем больше чужих мнений, тем тише клумба: вся сила уходит им.</p>`);
    } else if (p < 0.56) {
      setCap(`<div class="kicker">садовница</div><h2>Она заходит в клумбу.</h2><p class="sub">Жизнь из чужих страхов потухает. Она берёт сорняк не за стебель, а за корень.</p>`);
    } else if (p < 0.9) {
      const idx = clamp(Math.floor((p - 0.56) / 0.055), 0, 5);
      const w = weedsData[idx];
      setCap(`<div class="kicker">корень</div><h2>Она выдёргивает сорняк</h2><div class="quote">${w.phrase}</div>`);
    } else {
      setCap(`<div class="kicker">снова живая</div><h2>Клумба ожила.</h2><p class="sub">Чужие мнения вынуты. Цветы снова шевелятся, и сила возвращается вам.</p>`);
    }
  }

  function tick() {
    const rect = track.getBoundingClientRect();
    const p = clamp(-rect.top / (rect.height - innerHeight), 0, 1);
    frame++;
    if (Math.abs(p - lastP) > 0.0004 || lastP < 0) {
      lastP = p;
      apply(p);
    }
    if (!reduceMotion() && frame % 2 === 0) drawPetals(p < 0.2 || p > 0.9);
    requestAnimationFrame(tick);
  }

  document.getElementById("noteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("thanks").style.display = "block";
    e.target.reset();
  });

  const breath = heroes.get("breath");
  breath.addEventListener("canplay", () => {
    if (parseFloat(breath.style.opacity) > 0.2 && breath.paused && !reduceMotion()) {
      const pending = breath.play();
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    }
  });

  requestAnimationFrame(tick);
})();
