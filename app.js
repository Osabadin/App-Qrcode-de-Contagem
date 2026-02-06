const AREA_KEY = "areas.v1";
const CURRENT_AREA = "Conexões e Engates Rápidos";

const grid = document.getElementById("grid");
const search = document.getElementById("search");

const overlay = document.getElementById("overlay");
const sheet = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheetTitle");
const sheetSubtitle = document.getElementById("sheetSubtitle");
const closeSheet = document.getElementById("closeSheet");

const editProductBtn = document.getElementById("editProduct");
const editStockBtn = document.getElementById("editStock");
const removeFromAreaBtn = document.getElementById("removeFromArea");

let allProducts = [];
let selected = null;

function loadAreas() {
  const raw = localStorage.getItem(AREA_KEY);
  if (raw) return JSON.parse(raw);

  // primeira execução: cria área com todos os produtos (depois que carregar)
  return { [CURRENT_AREA]: { productIds: [], overrides: {} } };
}

function saveAreas(areas) {
  localStorage.setItem(AREA_KEY, JSON.stringify(areas));
}

// Overrides locais por área (nome/estoque custom)
function getAreaState() {
  const areas = loadAreas();
  if (!areas[CURRENT_AREA]) areas[CURRENT_AREA] = { productIds: [], overrides: {} };
  return { areas, area: areas[CURRENT_AREA] };
}

function ensureAreaHasProducts() {
  const { areas, area } = getAreaState();
  if (!area.productIds.length) {
    area.productIds = allProducts.map(p => p.id);
    saveAreas(areas);
  }
}

function applyOverrides(product) {
  const { area } = getAreaState();
  const ov = area.overrides?.[product.id] || {};
  return {
    ...product,
    name: ov.name ?? product.name,
    // estoque local (se existir), senão usa o do JSON (placeholder)
    stock: Number(ov.stock ?? product.stock ?? 0),
  };
}

async function loadProducts() {
  const res = await fetch("./data/engates-rapidos.json", { cache: "no-store" });
  allProducts = await res.json();

  ensureAreaHasProducts();
  render();
}

function getVisibleProducts(query) {
  const q = (query || "").trim().toLowerCase();
  const { area } = getAreaState();

  const ids = new Set(area.productIds);
  const areaProducts = allProducts.filter(p => ids.has(p.id)).map(applyOverrides);

  if (!q) return areaProducts;
  return areaProducts.filter(p =>
    (p.name || "").toLowerCase().includes(q) ||
    String(p.id).includes(q) ||
    String(p.sku || "").includes(q)
  );
}

function stockClass(stock) {
  // ajuste como preferir (negativo em vermelho)
  if (Number(stock) < 0) return "bad";
  return "ok";
}

function render() {
  const list = getVisibleProducts(search.value);

  grid.innerHTML = list.map(p => `
    <article class="card" data-id="${p.id}">
      <h3 class="card-title">${escapeHtml(p.name)}</h3>
      <div class="card-meta">
        <span class="badge">ID ${p.id}</span>
        <span class="stock ${stockClass(p.stock)}">${Number(p.stock).toLocaleString("pt-BR")}</span>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const p = getVisibleProducts(search.value).find(x => x.id === id);
      openSheet(p);
    });
  });
}

function openSheet(product) {
  selected = product;
  sheetTitle.textContent = product.name;
  sheetSubtitle.textContent = `ID: ${product.id} • SKU: ${product.sku ?? "-"}`;
  overlay.classList.remove("hidden");
  sheet.classList.remove("hidden");
}

function close() {
  overlay.classList.add("hidden");
  sheet.classList.add("hidden");
  selected = null;
}

overlay.addEventListener("click", close);
closeSheet.addEventListener("click", close);

search.addEventListener("input", render);

// Ações do balão
editProductBtn.addEventListener("click", () => {
  if (!selected) return;

  const newName = prompt("Novo nome do produto:", selected.name);
  if (!newName) return;

  const { areas, area } = getAreaState();
  area.overrides[selected.id] = { ...(area.overrides[selected.id] || {}), name: newName };
  saveAreas(areas);

  close();
  render();
});

editStockBtn.addEventListener("click", () => {
  if (!selected) return;

  const raw = prompt("Novo estoque (número):", String(selected.stock ?? 0));
  if (raw === null) return;

  const val = Number(String(raw).replace(",", "."));
  if (Number.isNaN(val)) {
    alert("Valor inválido.");
    return;
  }

  const { areas, area } = getAreaState();
  area.overrides[selected.id] = { ...(area.overrides[selected.id] || {}), stock: val };
  saveAreas(areas);

  close();
  render();
});

removeFromAreaBtn.addEventListener("click", () => {
  if (!selected) return;
  if (!confirm("Remover este produto da área?")) return;

  const { areas, area } = getAreaState();
  area.productIds = area.productIds.filter(id => id !== selected.id);
  // opcional: limpa override também
  delete area.overrides[selected.id];

  saveAreas(areas);

  close();
  render();
});

// Helpers
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadProducts();

