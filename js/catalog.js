// Catalogo: filtri per categoria, ricerca e ordinamento.
// I prodotti vengono scaricati una volta sola e filtrati nel browser (veloce per cataloghi piccoli/medi).
import "./layout.js";
import { fetchProducts, fetchCategories } from "./products.js";
import { renderProducts, renderSkeletons, renderState } from "./ui.js";
import { esc } from "./utils.js";

const els = {
  grid: document.getElementById("catalog-grid"),
  chips: document.getElementById("category-chips"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  count: document.getElementById("results-count"),
};

const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);

const sorters = {
  new: byDate,
  likes: (a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0) || byDate(a, b),
  "price-asc": (a, b) => Number(a.price) - Number(b.price),
  "price-desc": (a, b) => Number(b.price) - Number(a.price),
};

const params = new URLSearchParams(location.search);

const state = {
  products: [],
  categories: [],
  category: params.get("cat") || "",
  query: "",
  sort: sorters[params.get("sort")] ? params.get("sort") : "new", // es. catalog.html?sort=likes
};

function visibleProducts() {
  const q = state.query.trim().toLowerCase();
  return state.products
    .filter((p) => !state.category || p.category === state.category)
    .filter((p) => !q || `${p.title} ${p.description ?? ""}`.toLowerCase().includes(q))
    .sort(sorters[state.sort] ?? sorters.new);
}

function renderChips() {
  const counts = new Map();
  state.products.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));

  const items = [
    { slug: "", name: "Tutti", count: state.products.length },
    ...state.categories
      .map((c) => ({ slug: c.slug, name: c.name, count: counts.get(c.slug) ?? 0 }))
      .filter((c) => c.count > 0 || c.slug === state.category),
  ];

  els.chips.innerHTML = items
    .map(
      (i) => `<button type="button" class="chip" data-cat="${esc(i.slug)}" aria-pressed="${i.slug === state.category}">
        ${esc(i.name)} <span class="chip-count">${i.count}</span></button>`
    )
    .join("");
}

function renderGrid() {
  const list = visibleProducts();
  els.count.textContent = `${list.length} ${list.length === 1 ? "articolo" : "articoli"}`;

  if (list.length === 0) {
    renderState(els.grid, {
      title: "Nessun articolo trovato",
      text: "Prova a cambiare filtri o ricerca, oppure dai un'occhiata al guardaroba completo su Vinted.",
    });
    return;
  }
  renderProducts(els.grid, list, state.categories);
}

function syncUrl() {
  const url = new URL(location.href);
  if (state.category) url.searchParams.set("cat", state.category);
  else url.searchParams.delete("cat");
  history.replaceState(null, "", url);
}

function bindEvents() {
  els.chips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;
    state.category = button.dataset.cat;
    syncUrl();
    renderChips();
    renderGrid();
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    renderGrid();
  });

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    renderGrid();
  });
}

async function init() {
  renderSkeletons(els.grid, 8);
  els.sort.value = state.sort;
  bindEvents();

  try {
    [state.categories, state.products] = await Promise.all([fetchCategories(), fetchProducts()]);
    renderChips();
    renderGrid();
  } catch (error) {
    console.error("[sab shop] Errore nel caricamento del catalogo:", error);
    els.count.textContent = "";
    renderState(els.grid, {
      title: "Non riusciamo a caricare il catalogo",
      text: "Riprova tra qualche istante. Intanto puoi trovare tutti gli articoli sul nostro profilo Vinted.",
    });
  }
}

init();
