document.addEventListener("DOMContentLoaded", () => {
  console.log("[APP] DOM carregou. app.js está rodando.");

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
    if (btn) {
      btn.textContent = theme === "dark" ? "DARK" : "LIGHT";
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }

    console.log("[THEME] Tema aplicado:", theme);
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    console.log("[THEME] Clique no botão. Trocando:", current, "→", next);
    applyTheme(next);
  }

  applyTheme(getInitialTheme());

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  } else {
    console.warn("[THEME] Botão #themeToggle não encontrado.");
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

  async function loadProducts() {
    try {
      const res = await fetch("./data/engates-rapidos.json", {
        cache: "no-store",
      });
      products = await res.json();
      console.log("[DATA] Produtos carregados:", products.length);
      render();
    } catch (e) {
      console.error("[DATA] Erro ao carregar JSON", e);
      if (grid) {
        grid.innerHTML =
          "<p style='color:var(--muted)'>Erro ao carregar produtos.</p>";
      }
    }
  }

  function render() {
    if (!grid) return;

    const q = (search?.value || "").toLowerCase().trim();

    const list = products.filter((p) =>
      String(p?.name || "").toLowerCase().includes(q) ||
      String(p?.sku || "").toLowerCase().includes(q)
    );

    grid.innerHTML = list
      .map(
        (p) => `
        <div class="card" data-id="${p.id}">
          <div class="card-title">${escapeHtml(p.name)}</div>
          <div class="card-meta">
            <span class="badge">SKU ${escapeHtml(p.sku || "-")}</span>
            <span class="stock ok">0</span>
          </div>
        </div>
      `
      )
      .join("");

    grid.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () =>
        openSheet(card.dataset.id)
      );
    });
  }

  function openSheet(id) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p || !sheet || !overlay) return;

    sheetTitle.textContent = p.name;
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
