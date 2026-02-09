document.addEventListener("DOMContentLoaded", () => {
  // ⚠️ COLE AQUI O URL QUE VOCÊ COPIOU DO GOOGLE APPS SCRIPT
  const API_URL = "https://script.google.com/macros/s/AKfycbxH4Lx4k9Rck16hjPIn8brZz6SQy9vu6DmglabfT7divFYcpFM6-tuxkI2XjwbxbnvdVw/exec";

  /* ================= CONFIGURAÇÕES BÁSICAS ================= */
  const THEME_KEY = "ui.theme.v1";
  const FONT_KEY = "ui.font.v1";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "DARK" : "LIGHT";
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const curr = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(curr === "dark" ? "light" : "dark");
  });

  const fontSelect = document.getElementById("fontSelect");
  function setUIFont(f) {
    document.documentElement.style.setProperty("--ui-font", `${f}, system-ui, sans-serif`);
    localStorage.setItem(FONT_KEY, f);
  }
  setUIFont(localStorage.getItem(FONT_KEY) || "Montserrat");
  if (fontSelect) {
    fontSelect.value = localStorage.getItem(FONT_KEY) || "Montserrat";
    fontSelect.addEventListener("change", () => setUIFont(fontSelect.value));
  }

  /* ================= APP CORE ================= */
  const grid = document.getElementById("grid");
  const search = document.getElementById("search");
  const addProductBtn = document.getElementById("addProductBtn");
  const overlay = document.getElementById("overlay");
  const sheet = document.getElementById("sheet");

  let products = [];

  async function loadProducts() {
    grid.innerHTML = "<p style='color:var(--muted)'>Sincronizando com Google Sheets...</p>";
    try {
      const res = await fetch(API_URL);
      products = await res.json();
      render();
    } catch (e) {
      grid.innerHTML = "<p>Erro ao conectar com a planilha.</p>";
    }
  }

  function render() {
    if (!grid) return;
    const q = (search?.value || "").toLowerCase().trim();
    const list = products.filter(p => 
      String(p.name_abbr || "").toLowerCase().includes(q) || 
      String(p.sku || "").toLowerCase().includes(q)
    );

    grid.innerHTML = list.map(p => `
      <div class="card" data-id="${p.id}" draggable="true">
        <div class="card-title">${escapeHtml(p.name_abbr || "Sem nome")}</div>
        <div class="card-meta">
          <span class="badge">SKU ${escapeHtml(p.sku || "-")}</span>
          <span class="stock ok">0</span>
        </div>
      </div>
    `).join("");

    initDragAndDrop();
    grid.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", () => {
        if (!card.classList.contains("dragging")) openSheet(card.dataset.id);
      });
    });
  }

  /* ================= ADICIONAR NA PLANILHA ================= */
  addProductBtn?.addEventListener("click", async () => {
    const name = prompt("Abreviação do novo produto:");
    if (!name) return;
    const sku = prompt("SKU:") || "S/N";

    const newProd = {
      action: "add",
      id: "ID-" + Date.now(),
      name_abbr: name,
      name_official: name,
      sku: sku
    };

    // Feedback visual imediato
    products.push(newProd);
    render();

    // Envia para o Google Sheets
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", // Necessário para Google Apps Script
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd)
      });
    } catch (e) {
      alert("Erro ao salvar na planilha, mas o item aparecerá até você atualizar a página.");
    }
  });

  /* ================= DRAG & DROP ================= */
  function initDragAndDrop() {
    const cards = grid.querySelectorAll(".card");
    cards.forEach(card => {
      card.addEventListener("dragstart", () => setTimeout(() => card.classList.add("dragging"), 0));
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("touchstart", () => card.classList.add("dragging"), {passive:true});
      card.addEventListener("touchend", () => card.classList.remove("dragging"));
    });

    const move = (e, y) => {
      const dragging = document.querySelector(".dragging");
      if (!dragging) return;
      if (e.type === "touchmove") e.preventDefault();
      const after = getDragAfterElement(grid, y);
      if (after == null) grid.appendChild(dragging);
      else grid.insertBefore(dragging, after);
    };

    grid.addEventListener("dragover", e => { e.preventDefault(); move(e, e.clientY); });
    grid.addEventListener("touchmove", e => move(e, e.touches[0].clientY), {passive:false});
  }

  function getDragAfterElement(container, y) {
    const draggables = [...container.querySelectorAll(".card:not(.dragging)")];
    return draggables.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /* ================= UI ================= */
  function openSheet(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    document.getElementById("sheetTitle").textContent = p.name_abbr;
    document.getElementById("sheetSubtitle").textContent = `SKU ${p.sku}`;
    overlay.classList.remove("hidden");
    sheet.classList.remove("hidden");
  }

  const close = () => { overlay.classList.add("hidden"); sheet.classList.add("hidden"); };
  overlay?.addEventListener("click", close);
  document.getElementById("closeSheet")?.addEventListener("click", close);
  search?.addEventListener("input", render);

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  loadProducts();
});
