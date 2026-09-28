/* Урок «Сознание и подсознание» — оживление. Текст и стиль страницы не трогаем, только движение. */
(() => {
  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("live");
  if (still) root.classList.add("still");
  const wrap = document.querySelector(".wrap");

  /* ── слова в цитатах и заголовке поднимаются по одному ── */
  function splitWords(el) {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const parts = c.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(t); return; }
            const s = document.createElement("span");
            s.className = "w";
            s.style.setProperty("--i", n++);
            s.textContent = t;
            frag.append(s);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== "BR" && c.tagName !== "svg") walk(c);
      });
    };
    walk(el);
    el.style.setProperty("--n", n);
    el.classList.add("words");
  }
  document.querySelectorAll(".wrap .pull, .wrap h1, .wrap h2").forEach(splitWords);

  /* ── всё содержимое проявляется при прокрутке ── */
  const targets = wrap.querySelectorAll(
    ":scope > *:not(.grid):not(script):not(style), .grid > .card, .story > *, .card > *:not(.stage)"
  );
  targets.forEach((el) => el.classList.add("rv"));
  wrap.querySelectorAll(".frame").forEach((el) => el.classList.add("unveil"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  wrap.querySelectorAll(".rv:not(.unveil), .words, .mind, .story, .stage").forEach((el) => io.observe(el));

  /* картинки со шторкой: IntersectionObserver не видит элемент, обрезанный clip-path, — проверяем по прокрутке */
  function unveilCheck() {
    wrap.querySelectorAll(".unveil:not(.in)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0) el.classList.add("in");
    });
  }

  /* ── стебель прогресса сверху: растёт по мере чтения, в конце — цветок ── */
  const stem = document.createElement("div");
  stem.className = "stem";
  stem.innerHTML =
    '<i class="stem-line"></i><svg class="stem-bud" viewBox="0 0 32 32" aria-hidden="true"><g fill="#ee8cb4"><circle cx="16" cy="8" r="6.2"/><circle cx="24" cy="16" r="6.2"/><circle cx="16" cy="24" r="6.2"/><circle cx="8" cy="16" r="6.2"/></g><circle cx="16" cy="16" r="3.6" fill="#f3c450"/></svg>';
  document.body.append(stem);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = root.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      stem.style.setProperty("--p", p.toFixed(4));
      stem.classList.toggle("is-open", p > 0.985);
      parallax();
      unveilCheck();
    });
  }

  /* ── картинки чуть плывут при прокрутке ── */
  const frames = [...wrap.querySelectorAll("img.frame")].filter((f) => !f.closest(".mind"));
  function parallax() {
    if (still) return;
    const vh = innerHeight;
    frames.forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.setProperty("--py", `${(k * -14).toFixed(1)}px`);
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* ── схема головы: свет сознания мигает раз в секунду, под водой дышит круг ── */
  const mind = document.querySelector(".mind");
  if (mind) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "mind-live");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `
      <defs>
        <radialGradient id="mlight"><stop offset="0" stop-color="#fffdf5"/><stop offset=".35" stop-color="#fff3c9" stop-opacity=".9"/><stop offset="1" stop-color="#fff3c9" stop-opacity="0"/></radialGradient>
        <radialGradient id="mdeep"><stop offset=".55" stop-color="#ee8cb4" stop-opacity="0"/><stop offset=".85" stop-color="#ee8cb4" stop-opacity=".22"/><stop offset="1" stop-color="#ee8cb4" stop-opacity="0"/></radialGradient>
        <clipPath id="munder"><rect x="0" y="31.6" width="100" height="70"/></clipPath>
      </defs>
      <g clip-path="url(#munder)">
        <circle class="m-deep" cx="52" cy="48" r="22" fill="url(#mdeep)"/>
        <circle class="m-deep m-deep2" cx="52" cy="48" r="22" fill="url(#mdeep)"/>
      </g>
      <path class="m-wave" d="M16 31.4 Q24 30.6 32 31.4 T48 31.4 T64 31.4 T80 31.4 T96 31.4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".35"/>
      <path class="m-wave m-wave2" d="M16 31.4 Q24 32.2 32 31.4 T48 31.4 T64 31.4 T80 31.4 T96 31.4" fill="none" stroke="#b9a6d6" stroke-opacity=".5" stroke-width=".3"/>
      <circle class="m-light" cx="44" cy="29" r="5.5" fill="url(#mlight)"/>
      <circle class="m-dot" cx="44" cy="29" r=".9" fill="#fff"/>`;
    mind.append(svg);
  }

  /* ── растения под заголовком качаются ── */
  document.querySelectorAll(".plants img").forEach((img, i) => img.style.setProperty("--d", `${i * -1.3}s`));

  /* ── светлячки над вечерней клумбой ── */
  const dusk = [...frames].find((f) => f.src.includes("dusk"));
  if (dusk && !still) {
    const box = document.createElement("div");
    box.className = "glowbox frame unveil rv";
    dusk.classList.remove("frame", "unveil", "rv");
    dusk.parentNode.insertBefore(box, dusk);
    box.append(dusk);
    for (let i = 0; i < 16; i++) {
      const f = document.createElement("i");
      f.className = "fly-light";
      f.style.left = `${6 + Math.random() * 88}%`;
      f.style.top = `${30 + Math.random() * 60}%`;
      f.style.setProperty("--dx", `${(Math.random() - 0.5) * 60}px`);
      f.style.setProperty("--dy", `${-20 - Math.random() * 40}px`);
      f.style.animationDuration = `${5 + Math.random() * 6}s, ${1.6 + Math.random() * 2.4}s`;
      f.style.animationDelay = `${-Math.random() * 8}s, ${-Math.random() * 3}s`;
      box.append(f);
    }
    frames.splice(frames.indexOf(dusk), 1, box);
  }

  /* ── лепестки медленно падают поверх страницы (очень редко) ── */
  if (!still) {
    const cv = document.createElement("canvas");
    cv.className = "petals";
    cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, devicePixelRatio || 1);
    let W = 0, H = 0;
    const colors = ["#f6b8cf", "#ee8cb4", "#fbd9e6", "#f7dc8a"];
    const count = innerWidth < 700 ? 9 : 14;
    const P = Array.from({ length: count }, () => spawn(true));
    function size() {
      W = cv.width = innerWidth * dpr;
      H = cv.height = innerHeight * dpr;
      cv.style.width = `${innerWidth}px`;
      cv.style.height = `${innerHeight}px`;
    }
    function spawn(any) {
      return {
        x: Math.random(), y: any ? Math.random() : -0.05,
        r: 3 + Math.random() * 4, vy: 0.00018 + Math.random() * 0.00025,
        sw: Math.random() * Math.PI * 2, sws: 0.0007 + Math.random() * 0.0009,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.002,
        c: colors[(Math.random() * colors.length) | 0], a: 0.35 + Math.random() * 0.3,
      };
    }
    size();
    addEventListener("resize", size);
    let last = performance.now();
    let lastY = scrollY;
    function frame(t) {
      const dt = Math.min(50, t - last);
      last = t;
      const dScroll = (scrollY - lastY) / innerHeight;
      lastY = scrollY;
      ctx.clearRect(0, 0, W, H);
      P.forEach((p, i) => {
        p.y += p.vy * dt - dScroll * 0.25;
        p.sw += p.sws * dt;
        p.rot += p.vr * dt;
        const x = (p.x + Math.sin(p.sw) * 0.02) * W;
        const y = p.y * H;
        if (p.y > 1.05 || p.y < -0.1) P[i] = spawn(false);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.55 + Math.abs(Math.sin(p.sw)) * 0.45);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * dpr, p.r * dpr * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      if (!document.hidden) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { last = performance.now(); requestAnimationFrame(frame); }
    });
  }
})();
