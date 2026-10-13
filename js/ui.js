// Componenti di interfaccia riutilizzabili: card prodotto, scheletri, stati.
import { CONFIG } from "./config.js";
import { esc, safeUrl, formatPrice } from "./utils.js";

const HANGER_SVG = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 27v-3.5a4.5 4.5 0 1 0-4.5-4.5"/><path d="M32 27 8 43.5a2.5 2.5 0 0 0 1.4 4.5h45.2a2.5 2.5 0 0 0 1.4-4.5L32 27Z"/></svg>`;

const EXTERNAL_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`;

const HEART_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.500s-8-4.900-9.500-10C1.600 7 3.800 4.500 6.600 4.500c2 0 3.700 1.200 5.400 3.300 1.700-2.100 3.400-3.300 5.400-3.300 2.800 0 5 2.500 4.100 6-1.500 5.100-9.500 10-9.500 10Z"/></svg>`;

function likesBadgeHTML(likes) {
  const n = Math.floor(Number(likes));
  if (!Number.isFinite(n) || n <= 0) return "";
  return `<span class="product-likes">${HEART_SVG}<span aria-hidden="true">${n}</span><span class="visually-hidden">${n} like</span></span>`;
}

const placeholderHTML = () => `<div class="product-placeholder" aria-hidden="true">${HANGER_SVG}</div>`;

/** HTML di una singola card prodotto. */
export function productCardHTML(product, categoryName) {
  const url = safeUrl(product.vinted_url, CONFIG.vintedUrl);
  const title = esc(product.title);
  const image = safeUrl(product.image_url)
    ? `<img class="product-img" src="${esc(safeUrl(product.image_url))}" alt="${title}" loading="lazy" decoding="async">`
    : placeholderHTML();

  return `
    <article class="product-card">
      <a class="product-media" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Vedi ${title} su Vinted">
        ${image}
        ${categoryName ? `<span class="product-tag">${esc(categoryName)}</span>` : ""}
        ${likesBadgeHTML(product.likes)}
      </a>
      <div class="product-body">
        <h3 class="product-title">${title}</h3>
        ${product.description ? `<p class="product-desc">${esc(product.description)}</p>` : ""}
        <div class="product-foot">
          <span class="price">${esc(formatPrice(product.price))}</span>
          <a class="btn btn-primary btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
            Acquista su Vinted ${EXTERNAL_SVG}
          </a>
        </div>
      </div>
    </article>`;
}

/** Se un'immagine non si carica, la sostituisce con il segnaposto elegante. */
function bindImageFallback(container) {
  if (container.dataset.fallbackBound) return;
  container.dataset.fallbackBound = "1";
  container.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (img instanceof HTMLImageElement && img.classList.contains("product-img")) {
        img.insertAdjacentHTML("afterend", placeholderHTML());
        img.remove();
      }
    },
    true // gli eventi "error" delle immagini non risalgono: serve la fase di cattura
  );
}

export function renderProducts(container, products, categories = []) {
  const names = new Map(categories.map((c) => [c.slug, c.name]));
  container.innerHTML = products.map((p) => productCardHTML(p, names.get(p.category))).join("");
  container.setAttribute("aria-busy", "false");
  bindImageFallback(container);
}

export function renderSkeletons(container, count = 8) {
  container.setAttribute("aria-busy", "true");
  container.innerHTML = Array.from({ length: count }, () => `<div class="skeleton" aria-hidden="true"></div>`).join("");
}

/** Messaggio centrato (nessun risultato, errore di caricamento, ecc.) con CTA verso Vinted. */
export function renderState(container, { title, text, ctaLabel = "Vai al guardaroba su Vinted" }) {
  container.setAttribute("aria-busy", "false");
  container.innerHTML = `
    <div class="state-box">
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      <a class="btn btn-primary" href="${esc(CONFIG.vintedUrl)}" target="_blank" rel="noopener noreferrer">${esc(ctaLabel)} ${EXTERNAL_SVG}</a>
    </div>`;
}

export { EXTERNAL_SVG };
