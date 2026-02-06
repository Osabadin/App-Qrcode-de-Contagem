/* ================= THEME ================= */

const THEME_KEY = "ui.theme.v1";

function getInitialTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☾" : "☀";
}

document.getElementById("themeToggle")
  .addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

applyTheme(getInitialTheme());

/* ================= APP ================= */

const grid = document.getElementById("grid");
const search = document.getElementById("search");

const overlay = document.getElementById("overlay");
const sheet = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheetTitle");
const sheetSubtitle = document.getElementById("sheetSubtitle");
const closeSheet = document.getElementById("closeSheet");

let products = [];

async function loadProducts(){
  const res = await fetch("./data/engates-rapidos.json");
  products = await res.json();
  render();
}

function render(){
  const q = search.value.toLowerCase();

  grid.innerHTML = products
    .filter(p => p.name.toLowerCase().includes(q))
    .map(p => `
      <div class="card" data-id="${p.id}">
        <div class="card-title">${p.name}</div>
        <div class="card-meta">
          <span class="badge">ID ${p.id}</span>
          <span class="stock ok">0</span>
        </div>
      </div>
    `).join("");

  document.querySelectorAll(".card").forEach(card => {
    card.onclick = () => openSheet(card.dataset.id);
  });
}

function openSheet(id){
  const p = products.find(x => x.id == id);
  sheetTitle.textContent = p.name;
  sheetSubtitle.textContent = `ID ${p.id}`;
  overlay.classList.remove("hidden");
  sheet.classList.remove("hidden");
}

function close(){
  overlay.classList.add("hidden");
  sheet.classList.add("hidden");
}

overlay.onclick = close;
closeSheet.onclick = close;
search.oninput = render;

loadProducts();
