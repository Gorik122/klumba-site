const phrases = ["Я достойна", "Просто успокойся", "Это нелогично", "Хватит так думать"];
const dropsMax = 7;
let will = 4;
let drops = 0;
let said = null;

const willEl = document.querySelector("#will");
const willBars = document.querySelector("#willBars");
const saidEl = document.querySelector("#said");
const bubble = document.querySelector("#bubble");
const dropEl = document.querySelector("#drops");
const dropBars = document.querySelector("#dropBars");
const grownEl = document.querySelector("#grown");
const plant = document.querySelector("#plant");
const go = document.querySelector("#go");
const weed = document.querySelector(".card .plant:not(#plant)");
const stage1 = weed.closest(".stage");
const stage2 = plant.closest(".stage");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

willBars.innerHTML = Array.from({ length: 4 }, () => "<i></i>").join("");
dropBars.innerHTML = Array.from({ length: dropsMax }, () => "<i></i>").join("");

function paint() {
  willEl.textContent = `Сила воли: ${will} из 4`;
  willBars.querySelectorAll("i").forEach((b, i) => b.classList.toggle("on", i < will));
  saidEl.textContent = said
    ? will === 0
      ? `Ты сказала «${said}». Сила воли кончилась. Сорняк на месте.`
      : `Ты сказала «${said}». Сорняк даже не дрогнул. Осталось фраз: ${will}.`
    : "Нажми фразу ниже. Смотри: сорняк не уйдёт.";
  bubble.hidden = !said;
  bubble.textContent = said || "";
  document.querySelectorAll("[data-phrase]").forEach((btn) => { btn.disabled = will <= 0; });
  stage1.classList.toggle("is-empty", will <= 0);
  dropEl.textContent = `Повтор: ${drops} из ${dropsMax}`;
  dropBars.querySelectorAll("i").forEach((b, i) => b.classList.toggle("on", i < drops));
  grownEl.textContent = drops === 0
    ? "Нажми кнопку семь раз. Каждый раз семя чуть больше."
    : drops >= dropsMax
      ? "Семь повторов. Цветок взошёл не от фразы, а потому что ты сделала это много раз."
      : `Повтор ${drops} из ${dropsMax}. Подсознание уже считает. Ещё ${dropsMax - drops}.`;
  const src = drops === 0 ? "img/seed.webp" : "img/rose.webp";
  if (!plant.src.endsWith(src)) plant.src = src;
  plant.style.transform = `scale(${drops === 0 ? 0.55 : 0.35 + (drops / dropsMax) * 0.65})`;
  stage2.classList.toggle("is-bloom", drops >= dropsMax);
  go.disabled = drops >= dropsMax;
  go.textContent = drops === 0 ? "Повторить один раз" : drops >= dropsMax ? "Цветок взошёл" : "Ещё один повтор";
}

function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* фраза летит в сорняк, ударяется и осыпается буквами — сорняк стоит */
function throwPhrase(btn, text) {
  if (still) return;
  const s = stage1.getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  const w = weed.getBoundingClientRect();
  const fly = document.createElement("span");
  fly.className = "fly";
  fly.textContent = text;
  stage1.append(fly);
  const x0 = b.left + b.width / 2 - s.left;
  const y0 = b.top + b.height / 2 - s.top;
  const x1 = w.left + w.width / 2 - s.left;
  const y1 = w.top + w.height * 0.45 - s.top;
  fly.style.left = `${x0}px`;
  fly.style.top = `${y0}px`;
  const hop = fly.animate(
    [
      { transform: "translate(-50%,-50%) scale(.9)", opacity: 0 },
      { transform: `translate(calc(-50% + ${(x1 - x0) * 0.5}px), calc(-50% + ${(y1 - y0) * 0.5 - 40}px)) scale(1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.8)`, opacity: 1 },
    ],
    { duration: 560, easing: "cubic-bezier(.3,.6,.4,1)" }
  );
  hop.onfinish = () => {
    fly.remove();
    restart(weed, "is-hit");
    [...text].forEach((ch, i) => {
      if (ch === " ") return;
      const l = document.createElement("span");
      l.className = "crumb";
      l.textContent = ch;
      l.style.left = `${x1 + (i - text.length / 2) * 8}px`;
      l.style.top = `${y1}px`;
      stage1.append(l);
      const dx = (Math.random() - 0.5) * 60;
      const dy = s.height - y1 - 30 + Math.random() * 16;
      l.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 220}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.4,0,.8,.6)", delay: i * 12 }
      ).onfinish = () => l.remove();
    });
  };
}

/* капля падает в землю, по земле расходится круг */
function waterDrop() {
  if (still) return;
  const drop = document.createElement("i");
  drop.className = "drop";
  const x = 44 + Math.random() * 12;
  drop.style.left = `${x}%`;
  stage2.append(drop);
  const h = stage2.clientHeight;
  drop.animate(
    [
      { transform: "translate(-50%, -30px) scaleY(1.3)", opacity: 0 },
      { transform: "translate(-50%, 0) scaleY(1.3)", opacity: 1, offset: 0.15 },
      { transform: `translate(-50%, ${h - 64}px) scaleY(1.1)`, opacity: 1 },
    ],
    { duration: 620, easing: "cubic-bezier(.5,0,1,.6)" }
  ).onfinish = () => {
    drop.remove();
    const ring = document.createElement("i");
    ring.className = "ring";
    ring.style.left = `${x}%`;
    stage2.append(ring);
    ring.addEventListener("animationend", () => ring.remove());
    restart(plant, "is-drink");
    if (drops >= dropsMax) bloom();
  };
}

/* на седьмом повторе цветок раскрывается — лепестки разлетаются */
function bloom() {
  const r = stage2.getBoundingClientRect();
  const p = plant.getBoundingClientRect();
  const cx = p.left + p.width / 2 - r.left;
  const cy = p.top + p.height * 0.3 - r.top;
  const colors = ["#ee8cb4", "#f6b8cf", "#f3c450", "#fbd9e6", "#d9558a"];
  for (let i = 0; i < 26; i++) {
    const pet = document.createElement("i");
    pet.className = "petal";
    pet.style.left = `${cx}px`;
    pet.style.top = `${cy}px`;
    pet.style.background = colors[i % colors.length];
    stage2.append(pet);
    const a = (i / 26) * Math.PI * 2 + Math.random() * 0.4;
    const d = 70 + Math.random() * 90;
    pet.animate(
      [
        { transform: "translate(-50%,-50%) rotate(0) scale(.3)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d * 0.7}px)) rotate(${a * 180}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d * 0.7 + 90}px)) rotate(${a * 300}deg) scale(.8)`, opacity: 0 },
      ],
      { duration: 1600 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)" }
    ).onfinish = () => pet.remove();
  }
}

document.querySelector("#pills").innerHTML = phrases.map((p) => `<button type="button" data-phrase="${p}">${p}</button>`).join("");
document.querySelector("#pills").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-phrase]");
  if (!btn || will <= 0) return;
  said = btn.dataset.phrase;
  will -= 1;
  paint();
  restart(bubble, "is-pop");
  throwPhrase(btn, said);
});
go.addEventListener("click", () => {
  if (drops >= dropsMax) return;
  drops += 1;
  paint();
  waterDrop();
});
document.querySelector("#reset").addEventListener("click", () => {
  will = 4; drops = 0; said = null; paint();
});
paint();
