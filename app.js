document.addEventListener("DOMContentLoaded", () => {
  /* ================= THEME ================= */

  const THEME_KEY = "ui.theme.v1";

  function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;

    const prefersLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;

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

  /* ================= FONT SELECT (Títulos/Subtítulos) ================= */

  const FONT_KEY = "ui.font.v1";
  const fontSelect = document.getElementById("fontSelect");

  function cssFontName(name) {
    // Se tiver espaço, precisa de aspas no CSS font-family
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

  /* ================= APP ================= */

  const grid = document.getElementById("grid");
  const search = document.getElementById("search");

  const overlay = document.getElementById("overlay");
  const sheet = document.getElementById("sheet");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetSubtitle = document.getElementById("sheetSubtitle");
  const closeSheet = document.getElementById("closeSheet");

  let products = [];

  function getDisplayName(p) {
    // Mostra apenas o nome abreviado no app
    return p?.name_abbr || p?.abbr || p?.name_short || p?.name || "";
  }

  async function loadProducts() {
    try {
      const res = await fetch("./data/engates-rapidos.json", { cache: "no-store" });
      products = await res.json();
      render();
    } catch (e) {
      console.error("Erro ao carregar ./data/engates-rapidos.json", e);
      if (grid) grid.innerHTML = "<p style='color:var(--muted)'>Erro ao carregar produtos.</p>";
    }
  }

  function render() {
    if (!grid) return;

    const q = (search?.value || "").toLowerCase().trim();

    const list = products.filter(p =>
      String(getDisplayName(p)).toLowerCase().includes(q) ||
      String(p?.sku || "").toLowerCase().includes(q)
    );

    grid.innerHTML = list.map(p => `
      <div class="card" data-id="${p.id}">
        <div class="card-title">${escapeHtml(getDisplayName(p))}</div>
        <div class="card-meta">
          <span class="badge">SKU ${escapeHtml(p.sku || "-")}</span>
          <span class="stock ok">0</span>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", () => openSheet(card.dataset.id));
    });
  }

  function openSheet(id) {
    const p = products.find(x => String(x.id) === String(id));
    if (!p || !sheet || !overlay) return;

    sheetTitle.textContent = getDisplayName(p);
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
