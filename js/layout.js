// Header e footer condivisi da tutte le pagine.
// Ogni pagina ha <div id="site-header"></div> e <div id="site-footer"></div>
// e <body data-page="home|catalog|about|contact">.
import { CONFIG } from "./config.js";
import { esc } from "./utils.js";

const NAV = [
  { href: "index.html", label: "Home", page: "home" },
  { href: "catalog.html", label: "Catalog", page: "catalog" },
  { href: "chi-siamo.html", label: "Chi Siamo", page: "about" },
  { href: "contatti.html", label: "Contatti", page: "contact" },
];

const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`;

function headerHTML(current) {
  const links = NAV.map(
    (item) =>
      `<a href="${item.href}"${item.page === current ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
  ).join("");

  return `
  <header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="index.html" aria-label="${esc(CONFIG.brandName)} – Home">sab <em>shop</em></a>
      <nav class="nav" id="primary-nav" aria-label="Navigazione principale">${links}</nav>
      <a class="btn btn-primary header-cta" href="${esc(CONFIG.vintedUrl)}" target="_blank" rel="noopener noreferrer">
        <span class="cta-extra">Shop su&nbsp;</span>Vinted ${ARROW}
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Apri il menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

function footerHTML() {
  const instagram = CONFIG.instagramUrl
    ? `<li><a href="${esc(CONFIG.instagramUrl)}" target="_blank" rel="noopener noreferrer">Instagram</a></li>`
    : "";

  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="logo" href="index.html">sab <em>shop</em></a>
          <p>Moda femminile selezionata con cura: capi vintage, secondhand e di boutique pronti a una seconda vita.</p>
        </div>
        <div class="footer-col">
          <h4>Link utili</h4>
          <ul>
            ${NAV.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`).join("")}
          </ul>
        </div>
        <div class="footer-col">
          <h4>Seguici</h4>
          <ul>
            <li><a href="${esc(CONFIG.vintedUrl)}" target="_blank" rel="noopener noreferrer">Profilo Vinted</a></li>
            ${instagram}
            <li><a href="contatti.html">Scrivici</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© <span id="footer-year"></span> ${esc(CONFIG.brandName)}. Tutti i diritti riservati.</p>
        <p>Gli acquisti si concludono sulla piattaforma Vinted: prezzi, disponibilità, spedizione e condizioni di reso sono quelli indicati nel singolo annuncio. Vinted è un marchio di Vinted UAB; ${esc(CONFIG.brandName)} è un profilo venditore indipendente, non affiliato né sponsorizzato dalla piattaforma.</p>
      </div>
    </div>
  </footer>`;
}

function initLayout() {
  const current = document.body.dataset.page;

  const headerSlot = document.getElementById("site-header");
  if (headerSlot) headerSlot.innerHTML = headerHTML(current);

  const footerSlot = document.getElementById("site-footer");
  if (footerSlot) {
    footerSlot.innerHTML = footerHTML();
    const year = document.getElementById("footer-year");
    if (year) year.textContent = new Date().getFullYear();
  }

  // Menu mobile
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }
}

initLayout();
