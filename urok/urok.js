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

function paint() {
  willEl.textContent = `Сила воли: ${will} из 4`;
  willBars.innerHTML = Array.from({ length: 4 }, (_, i) => `<i class="${i < will ? "on" : ""}"></i>`).join("");
  saidEl.textContent = said
    ? will === 0
      ? `Ты сказала «${said}». Сила воли кончилась. Сорняк на месте.`
      : `Ты сказала «${said}». Сорняк даже не дрогнул. Осталось фраз: ${will}.`
    : "Нажми фразу ниже. Смотри: сорняк не уйдёт.";
  bubble.hidden = !said;
  bubble.textContent = said || "";
  document.querySelectorAll("[data-phrase]").forEach((btn) => { btn.disabled = will <= 0; });
  dropEl.textContent = `Повтор: ${drops} из ${dropsMax}`;
  dropBars.innerHTML = Array.from({ length: dropsMax }, (_, i) => `<i class="${i < drops ? "on" : ""}"></i>`).join("");
  grownEl.textContent = drops === 0
    ? "Нажми кнопку семь раз. Каждый раз семя чуть больше."
    : drops >= dropsMax
      ? "Семь повторов. Цветок взошёл не от фразы, а потому что ты сделала это много раз."
      : `Повтор ${drops} из ${dropsMax}. Подсознание уже считает. Ещё ${dropsMax - drops}.`;
  plant.src = drops === 0 ? "img/seed.webp" : "img/rose.webp";
  plant.style.transform = `scale(${drops === 0 ? 0.55 : 0.35 + (drops / dropsMax) * 0.65})`;
  go.disabled = drops >= dropsMax;
  go.textContent = drops === 0 ? "Повторить один раз" : drops >= dropsMax ? "Цветок взошёл" : "Ещё один повтор";
}

document.querySelector("#pills").innerHTML = phrases.map((p) => `<button type="button" data-phrase="${p}">${p}</button>`).join("");
document.querySelector("#pills").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-phrase]");
  if (!btn || will <= 0) return;
  said = btn.dataset.phrase;
  will -= 1;
  paint();
});
go.addEventListener("click", () => {
  if (drops >= dropsMax) return;
  drops += 1;
  paint();
});
document.querySelector("#reset").addEventListener("click", () => {
  will = 4; drops = 0; said = null; paint();
});
paint();
