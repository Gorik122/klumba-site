/* Полосы iPhone (под часами и у нижней панели Safari) в цвет того, что сейчас на экране.
   Как на darcoffee26.ru: iOS 26 берёт цвет полосы у fixed-элемента с плоским background-color
   у верхней/нижней кромки (ширина ≥90%, высота >10px, opacity ≥0.1) и не пересчитывает его,
   пока элемент не сменится — поэтому на каждый новый цвет создаём новый узел, старый убираем.
   Плюс theme-color и цвет html (виден при оттягивании страницы). Дизайн и текст не трогает. */
(function () {
  "use strict";
  var root = document.documentElement;
  var ua = navigator.userAgent || "";
  var ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* цвет верха и низа сцены по ходу истории (снято с экрана телефона, 41 точка, сглажено) */
  var STAGE = ["907eb04d3425","907eb04d3425","907fb04d3425","917fb04d3425","917fb04d3425","8a72a1503225","866e9d513225","7d628f543126","7c6897533326","765d8a543126","76618e523326","705680533025","6e5984523226","694d76542f25","67527b533226","62476e542f25","5f4b73533226","5d496f523125","5d50774f3425","5f52784a3122","64567b462f21","66587d442f20","63557b4e3525","5e5078583b2b","5d4f77634130","61537b63402f","66577f64402e","695a83613e2c","6c5d86613e2c","6f6089613e2c","72638d613e2c","756690613e2c","786994613e2c","7c6c98613e2c","7e6e9b613e2c","81709e613e2c","8574a2613e2c","8877a5613e2c","8b7aa8613e2c","8e7dac613e2c","8f7eae613e2c"];

  function rgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function hex(c) { return "#" + c.map(function (v) { return Math.round(v).toString(16).padStart(2, "0"); }).join(""); }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, Math.round(t * 8) / 8)); /* ступеньками — меньше пересчётов у Safari */
    var A = rgb(a), B = rgb(b);
    return hex([0, 1, 2].map(function (k) { return A[k] + (B[k] - A[k]) * t; }));
  }
  var FADE = 140; /* как у плавных переходов между блоками в styles.css */

  /* цвет в точке y экрана; edge: 0 — верх, 1 — низ */
  function colorAt(y, edge) {
    var list = document.elementsFromPoint ? document.elementsFromPoint(innerWidth / 2, y) : [document.elementFromPoint(innerWidth / 2, y)];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el || !el.closest) continue;
      if (el.closest(".gm-pop")) return null;
      var w = el.closest(".gm-welcome");
      if (w && !w.classList.contains("is-gone")) return edge ? "#f4e2f2" : "#fff6fa";
      if (el.closest(".stage")) {
        var t = document.getElementById("track");
        var f = t ? (scrollY - t.offsetTop) / Math.max(1, t.offsetHeight - innerHeight) : 0;
        var s = STAGE[Math.max(0, Math.min(STAGE.length - 1, Math.round(f * (STAGE.length - 1))))];
        return "#" + (edge ? s.slice(6) : s.slice(0, 6));
      }
      var sec = el.closest("section.outro, section.xsec");
      if (sec) {
        var r = sec.getBoundingClientRect(), yy = y - r.top, h = r.height;
        switch (sec.id) {
          case "outro": return "#efe6f3";
          case "pull": return mix("#efe6f3", "#f8eef3", yy / h);
          case "mybed": return mix("#f8eef3", "#f6f0f8", yy / FADE);
          case "seed":
            if (yy < FADE) return mix("#f6f0f8", "#efe6f3", yy / FADE);
            if (yy > h - FADE) return mix("#efe6f3", "#f7f1f8", (yy - (h - FADE)) / FADE);
            return "#efe6f3";
          case "gardener": return "#f7f1f8";
        }
        return "#efe6f3";
      }
    }
    return null;
  }

  var metas = document.querySelectorAll('meta[name="theme-color"]');
  /* Safari помнит первые meta — только setAttribute, не пересоздавать */
  function setMeta(c) { for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", c); }

  var strips = { top: null, bot: null };
  function strip(pos, c) {
    var prev = strips[pos];
    if (prev && prev.getAttribute("data-c") === c) return;
    var el = document.createElement("div");
    el.className = "kl-tint kl-tint--" + pos;
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-c", c);
    el.style.backgroundColor = c;
    document.body.appendChild(el);
    strips[pos] = el;
    if (prev) requestAnimationFrame(function () { requestAnimationFrame(function () { if (prev.parentNode) prev.parentNode.removeChild(prev); }); });
  }

  var last = { top: "", bot: "" }, lastCanvas = "";
  function paint() {
    queued = false;
    var top = colorAt(1, 0), bot = colorAt(innerHeight - 2, 1);
    if (top && top !== last.top) {
      last.top = top;
      setMeta(top);
      if (ios) strip("top", top);
    }
    if (bot && bot !== last.bot) {
      last.bot = bot;
      if (ios) strip("bot", bot);
    }
    /* фон под страницей виден при оттягивании: вверху — цвет верха, дальше — низа */
    var canvas = scrollY < innerHeight ? last.top : last.bot;
    if (canvas && canvas !== lastCanvas) { lastCanvas = canvas; root.style.backgroundColor = canvas; }
  }
  var queued = false;
  function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  addEventListener("load", queue);
  /* приветствие уходит без прокрутки — проверяем и по таймеру, пока игра идёт */
  setInterval(function () { if (!document.hidden) queue(); }, 600);
  queue();
})();
