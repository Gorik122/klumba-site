/* Блок «Садовница»: падают цветы и звёзды, внизу парит садовница с крылышками.
   Только украшение: текст и кнопки блока не трогает, всё под ними и не ловит касания. */
(function () {
  "use strict";
  var sec = document.getElementById("gardener");
  var box = document.getElementById("gdMagic");
  if (!sec || !box) return;

  var STAR = "M0 -10C1.4 -2.4 2.4 -1.4 10 0C2.4 1.4 1.4 2.4 0 10C-1.4 2.4 -2.4 1.4 -10 0C-2.4 -1.4 -1.4 -2.4 0 -10Z";
  var PINKS = ["#ee8cb4", "#f5a8c7", "#f9c6da", "#e2699a", "#dcaeea"];
  function flower(c) {
    var s = "";
    for (var k = 0; k < 5; k++) s += '<ellipse rx="4.6" ry="7" cy="-6.5" fill="' + c + '" transform="rotate(' + k * 72 + ')"/>';
    return '<svg viewBox="-14 -14 28 28">' + s + '<circle r="3.6" fill="#f3c450"/></svg>';
  }
  function petal(c) { return '<svg viewBox="-8 -10 16 20"><path d="M0 -9C6 -6 7 3 0 9C-7 3 -6 -6 0 -9Z" fill="' + c + '"/></svg>'; }
  function star(c) { return '<svg viewBox="-11 -11 22 22"><path d="' + STAR + '" fill="' + c + '"/></svg>'; }

  /* падающее: цветы, лепестки, звёзды */
  var html = "", N = innerWidth < 700 ? 16 : 26;
  for (var i = 0; i < N; i++) {
    var kind = i % 3, r = Math.random;
    var size = kind === 2 ? 9 + r() * 9 : kind === 0 ? 16 + r() * 10 : 11 + r() * 7;
    var col = kind === 2 ? (r() < .7 ? "#f3c450" : "#fff3c4") : PINKS[i % PINKS.length];
    var inner = kind === 0 ? flower(col) : kind === 1 ? petal(col) : star(col);
    html += '<i class="gd-fall gd-fall--' + ["fl", "pt", "st"][kind] + '" style="left:' + (r() * 100).toFixed(1) + "%;" +
      "--s:" + size.toFixed(0) + "px;--d:" + (9 + r() * 9).toFixed(1) + "s;--dl:-" + (r() * 18).toFixed(1) + "s;" +
      "--x:" + ((r() - .5) * 90).toFixed(0) + "px;--rot:" + ((r() < .5 ? -1 : 1) * (180 + r() * 360)).toFixed(0) + 'deg"><b>' + inner + "</b></i>";
  }

  /* садовница с крылышками */
  var girl = window.KlumbaGirl ? window.KlumbaGirl() : "";
  var wing = function (d, id) { return '<path d="' + d + '" fill="url(#' + id + ')" stroke="#fff" stroke-width="1.4" stroke-opacity=".9"/>'; };
  var fairy = girl ?
    '<div class="gd-fairy"><div class="gd-fairy__shadow"></div><div class="gd-fairy__fly">' +
    '<svg viewBox="-100 -230 230 250" class="gd-fairy__svg">' +
    "<defs>" +
    '<linearGradient id="gdW1" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#f9c6da" stop-opacity=".7"/><stop offset="1" stop-color="#cdb8f2" stop-opacity=".55"/></linearGradient>' +
    '<linearGradient id="gdW2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#f5b7d0" stop-opacity=".65"/><stop offset="1" stop-color="#d9c4f5" stop-opacity=".5"/></linearGradient>' +
    '<radialGradient id="gdGlow"><stop offset="0" stop-color="#fff6d8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd9ea" stop-opacity=".45"/><stop offset="1" stop-color="#ffd9ea" stop-opacity="0"/></radialGradient>' +
    "</defs>" +
    '<circle cx="0" cy="-80" r="120" fill="url(#gdGlow)" class="gd-fairy__glow"/>' +
    '<g class="gd-wing gd-wing--back">' + wing("M12 -92C30 -150 92 -196 118 -170C140 -146 96 -102 12 -86Z", "gdW1") + wing("M12 -84C46 -84 94 -64 92 -38C90 -16 50 -30 12 -78Z", "gdW2") + "</g>" +
    '<g class="gd-wing gd-wing--front">' + wing("M14 -92C42 -140 98 -166 112 -140C124 -116 82 -96 14 -86Z", "gdW1") + wing("M14 -84C44 -78 82 -56 78 -36C74 -20 42 -36 14 -78Z", "gdW2") +
    '<path d="M22 -96C44 -126 74 -146 96 -150M22 -82C42 -74 62 -60 74 -46" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/></g>' +
    girl +
    "</svg></div>" +
    '<i class="gd-twinkle" style="left:8%;top:12%">' + star("#f3c450") + "</i>" +
    '<i class="gd-twinkle" style="left:78%;top:4%;--dl:-.7s">' + star("#fff3c4") + "</i>" +
    '<i class="gd-twinkle" style="left:92%;top:44%;--dl:-1.3s">' + star("#f3c450") + "</i>" +
    '<i class="gd-twinkle" style="left:-4%;top:58%;--dl:-1.9s">' + star("#fff3c4") + "</i>" +
    "</div>" : "";

  box.innerHTML = html + fairy;
  sec.classList.add("has-magic");

  /* анимации — только когда блок на экране */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { box.classList.toggle("is-on", e.isIntersecting); });
    }, { rootMargin: "100px 0px" }).observe(sec);
  } else box.classList.add("is-on");
})();
