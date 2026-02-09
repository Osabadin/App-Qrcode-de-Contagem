document.addEventListener("DOMContentLoaded", () => {
  /* ================= THEME ================= */
  const THEME_KEY = "ui.theme.v1";

  function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "DARK" : "LIGHT";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  applyTheme(getInitialTheme());
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

  /* ================= FONT SELECT ================= */
  const FONT_KEY = "ui.font.v1";
  const fontSelect = document.getElementById("fontSelect");

  function cssFontName(name) {
    return name.includes(" ") ? `"${name}"` : name;
  }

  function setUIFont(fontName) {
    const cssValue = `${cssFontName(fontName)}, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
    document.documentElement.style.setProperty("--ui-font", cssValue);
    localStorage.setItem(FONT_KEY, fontName);
  }

  function getSavedUIFont() {
    const saved = localStorage.getItem(FONT_KEY);
    return saved || "Montserrat";
  }

  const initialFont = getSavedUIFont();
  setUIFont(initialFont);

  if (fontSelect) {
    fontSelect.value = initialFont;
    fontSelect.addEventListener("change", () => setUIFont(fontSelect.value));
  }

  /* ================= APP CORE ================= */
  const grid = document.getElementById("grid");
  const search = document.getElementById("search");
  const overlay = document.getElementById("overlay");
  const sheet = document.getElementById("sheet");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetSubtitle = document.getElementById("sheetSubtitle");
  const closeSheet = document.getElementById("closeSheet");

  let products = [];
  const ORDER_KEY = "inventory.order.v1";

  async function loadProducts() {
    try {
      const res = await fetch("./data/engates-rapidos.json", { cache: "no-store" });
      let data = await res.json();
      
      // Tenta recuperar a ordem salva pelo usuário
      const savedOrder = localStorage.getItem(ORDER_KEY);
      if (savedOrder) {
        const idList = JSON.parse(savedOrder);
        // Reordena o array conforme os IDs salvos
        data.sort((a, b) => idList.indexOf(String(a.id)) - idList.indexOf(String(b.id)));
      }
      
      products = data;
      render();
    } catch (e) {
      console.error("Erro ao carregar os dados:", e);
      if (grid) grid.innerHTML = "<p style='color:var(--muted)'>Erro ao carregar produtos.</p>";
    }
  }

  function render() {
    if (!grid) return;
    const q = (search?.value || "").toLowerCase().trim();

    const list = products.filter((p) =>
      String(p?.name_abbr || "").toLowerCase().includes(q) ||
      String(p?.name_official || p?.name || "").toLowerCase().includes(q) ||
      String(p?.sku || "").toLowerCase().includes(q)
    );

    grid.innerHTML = list.map((p) => `
      <div class="card" data-id="${p.id}" draggable="true">
        <div class="card-title">
          ${escapeHtml(p.name_abbr || p.name_official || p.name || "Sem nome")}
        </div>
        <div class="card-meta">
          <span class="badge">SKU ${escapeHtml(p.sku || "-")}</span>
          <span class="stock ok">0</span>
        </div>
      </div>
    `).join("");

    initDragAndDrop();

    grid.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // Não abre o modal se estiver arrastando
        if (card.classList.contains("dragging")) return;
        openSheet(card.dataset.id);
      });
    });
  }

  /* ================= DRAG & DROP LOGIC ================= */
  function initDragAndDrop() {
    const cards = grid.querySelectorAll(".card");

    cards.forEach(card => {
      card.addEventListener("dragstart", () => {
        setTimeout(() => card.classList.add("dragging"), 0);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        saveCurrentOrder();
      });

      // Suporte para Touch (Mobile)
      card.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return; // Ignora multi-touch
        card.classList.add("dragging");
      }, { passive: true });

      card.addEventListener("touchend", () => {
        card.classList.remove("dragging");
        saveCurrentOrder();
      });
    });

    grid.addEventListener("dragover", e => {
      e.preventDefault();
      const dragging = document.querySelector(".dragging");
      const afterElement = getDragAfterElement(grid, e.clientY);
      if (afterElement == null) {
        grid.appendChild(dragging);
      } else {
        grid.insertBefore(dragging, afterElement);
      }
    });

    // Movimentação touch
    grid.addEventListener("touchmove", e => {
      const dragging = document.querySelector(".dragging");
      if (!dragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const afterElement = getDragAfterElement(grid, touch.clientY);
      if (afterElement == null) {
        grid.appendChild(dragging);
      } else {
        grid.insertBefore(dragging, afterElement);
      }
    }, { passive: false });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".card:not(.dragging)")];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function saveCurrentOrder() {
    const currentCards = [...grid.querySelectorAll(".card")];
    const newOrderIds = currentCards.map(c => String(c.dataset.id));
    
    // Atualiza o array em memória
    products.sort((a, b) => newOrderIds.indexOf(String(a.id)) - newOrderIds.indexOf(String(b.id)));
    
    // Salva no navegador para persistir após o refresh
    localStorage.setItem(ORDER_KEY, JSON.stringify(newOrderIds));
  }

  /* ================= UI ACTIONS ================= */
  function openSheet(id) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p || !sheet || !overlay) return;

    sheetTitle.textContent = p.name_abbr || p.name_official || p.name;
    sheetSubtitle.textContent = `SKU ${p.sku || "-"}`;

    overlay.classList.remove("hidden");
    sheet.classList.remove("hidden");
  }

  function close() {
    overlay?.classList.add("hidden");
    sheet?.classList.add("hidden");
  }

  overlay?.addEventListener("click", close);
  closeSheet?.addEventListener("click", close);
  search?.addEventListener("input", render);

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  loadProducts();
});
