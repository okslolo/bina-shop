/* ==========================================================================
   sab shop — logica del sito
   Script "classico" (niente ES modules): funziona anche aprendo i file con
   doppio clic, senza bisogno di un server locale.
   Ordine di caricamento nelle pagine: config.js → demo-data.js → app.js
   ========================================================================== */
(function () {
  "use strict";

  const CONFIG = window.SAB_CONFIG;
  const DEMO = window.SAB_DEMO;

  /* ------------------------------------------------------------------------
     Utilità
     ---------------------------------------------------------------------- */
  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  /** Neutralizza il testo prima di inserirlo in HTML (protezione XSS). */
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

  /** Accetta solo URL http(s); altrimenti restituisce il fallback. */
  function safeUrl(value, fallback) {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : fallback || "";
    } catch (e) {
      return fallback || "";
    }
  }

  const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  function formatPrice(value) {
    const n = Number(value);
    return Number.isFinite(n) ? priceFormatter.format(n) : "";
  }

  const EMPTY_DB_HINT =
    "Supabase ha risposto, ma senza nessun prodotto. Controlla che la tabella products contenga righe e che le policy di sola lettura (RLS) siano attive: esegui supabase/schema.sql nel SQL Editor.";

  function namedError(name, message) {
    const error = new Error(message);
    error.name = name;
    return error;
  }

  /** Traduce gli errori tecnici di Supabase in indicazioni per chi gestisce il sito. */
  function describeError(error) {
    const code = String((error && error.code) || "");
    const message = String((error && error.message) || error || "");
    const name = String((error && error.name) || "");

    if (name === "ConfigError" || name === "LibraryError") return message;

    if (code === "PGRST205" || code === "42P01" || /could not find the table|relation .* does not exist/i.test(message)) {
      return "La tabella non esiste nel database: esegui supabase/schema.sql nel SQL Editor di Supabase (e controlla di aver usato il progetto giusto).";
    }
    if (code === "42703" || /column .* does not exist/i.test(message)) {
      return "Manca una colonna nella tabella products: esegui supabase/migration-likes.sql (oppure schema.sql) nel SQL Editor di Supabase.";
    }
    if (code === "42501" || /permission denied|row-level security/i.test(message)) {
      return "Permessi mancanti: esegui di nuovo supabase/schema.sql per ricreare le policy di sola lettura.";
    }
    if (/invalid api key|invalid jwt|jwt expired|no api key/i.test(message)) {
      return "Chiave Supabase non valida: copia di nuovo la chiave anon / publishable da Project Settings → API in js/config.js.";
    }
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
      return "Impossibile raggiungere Supabase: controlla l'URL in js/config.js e che il progetto non sia in pausa (i progetti gratuiti si mettono in pausa dopo giorni di inattività: Dashboard → Restore project).";
    }
    return "Errore imprevisto: " + (message || "sconosciuto");
  }

  /* ------------------------------------------------------------------------
     Supabase (la libreria viene scaricata solo se hai inserito URL e chiave)
     ---------------------------------------------------------------------- */
  const SUPABASE_UMD = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  /** true se la chiave è SEGRETA (service_role / sb_secret_…): non deve mai stare in un sito pubblico. */
  function isSecretKey(key) {
    if (key.indexOf("sb_secret_") === 0) return true;
    try {
      const payload = key.split(".")[1];
      if (!payload) return false;
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role";
    } catch (e) {
      return false;
    }
  }

  /**
   * Stato della configurazione Supabase:
   *  { mode: "demo" }              segnaposto non sostituiti → prodotti di esempio
   *  { mode: "invalid", message }  configurazione incompleta o sbagliata
   *  { mode: "live" }              pronto: i prodotti arrivano da Supabase
   */
  function getConfigStatus() {
    const url = String(CONFIG.supabaseUrl || "").trim();
    const key = String(CONFIG.supabaseAnonKey || "").trim();
    const urlIsPlaceholder = !url || url.indexOf("YOUR-PROJECT-REF") !== -1;
    const keyIsPlaceholder = !key || key.indexOf("YOUR-SUPABASE") !== -1;

    if (urlIsPlaceholder && keyIsPlaceholder) return { mode: "demo" };
    if (urlIsPlaceholder || keyIsPlaceholder) {
      return {
        mode: "invalid",
        message:
          "In js/config.js hai sostituito " + (urlIsPlaceholder ? "solo la chiave" : "solo l'URL") + ": servono entrambi (supabaseUrl e supabaseAnonKey).",
      };
    }
    if (isSecretKey(key)) {
      return {
        mode: "invalid",
        message:
          "In js/config.js c'è una chiave SEGRETA (service_role / sb_secret_…): non va mai messa in un sito pubblico. Rigenerala dalla dashboard di Supabase e usa la chiave anon / publishable.",
      };
    }
    if (!/^https:\/\//i.test(url) || /supabase\.com\/dashboard/i.test(url)) {
      return {
        mode: "invalid",
        message: "supabaseUrl non è l'URL dell'API: deve essere del tipo https://xxxxxxxx.supabase.co (Project Settings → API → Project URL).",
      };
    }
    return { mode: "live" };
  }

  const isSupabaseConfigured = () => getConfigStatus().mode === "live";

  // Accetta anche URL incollati con "/" finale o con "/rest/v1"
  const normalizeUrl = (url) => String(url).trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () =>
        reject(
          namedError(
            "LibraryError",
            "Impossibile scaricare la libreria Supabase dalla CDN (jsDelivr): controlla la connessione o eventuali blocchi (adblock, rete aziendale)."
          )
        );
      document.head.appendChild(script);
    });
  }

  let clientPromise = null;

  /** Restituisce il client Supabase, oppure null se non è configurato (modalità demo). */
  function getSupabase() {
    const status = getConfigStatus();
    if (status.mode === "demo") return Promise.resolve(null);
    if (status.mode === "invalid") return Promise.reject(namedError("ConfigError", status.message));

    if (!clientPromise) {
      const ready = window.supabase && window.supabase.createClient ? Promise.resolve() : loadScript(SUPABASE_UMD);
      clientPromise = ready
        .then(() =>
          window.supabase.createClient(normalizeUrl(CONFIG.supabaseUrl), String(CONFIG.supabaseAnonKey).trim(), {
            auth: { persistSession: false }, // sito pubblico: nessun login
          })
        )
        .catch((error) => {
          clientPromise = null; // permette di riprovare
          throw error;
        });
    }
    return clientPromise;
  }

  /* ------------------------------------------------------------------------
     Accesso ai dati
     Senza Supabase configurato si usano i dati demo. Se è configurato ma la
     richiesta fallisce, l'errore viene propagato (la UI lo mostra) invece di
     far vedere prodotti finti su un sito reale.
     ---------------------------------------------------------------------- */
  const COLUMNS = "id, title, description, price, image_url, vinted_url, category, likes, created_at";
  const COLUMNS_NO_LIKES = "id, title, description, price, image_url, vinted_url, category, created_at";

  const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);
  const sorters = {
    new: byDate,
    likes: (a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0) || byDate(a, b),
    "price-asc": (a, b) => Number(a.price) - Number(b.price),
    "price-desc": (a, b) => Number(b.price) - Number(a.price),
  };

  async function fetchCategories() {
    const supabase = await getSupabase();
    if (!supabase) return DEMO.categories;

    const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
    if (error) throw error;
    return data || [];
  }

  // Se la colonna "likes" non esiste ancora nel database (schema vecchio), il sito
  // continua a funzionare senza like invece di non mostrare nulla.
  let likesSupported = true;
  const isMissingLikes = (error) => Boolean(error) && (error.code === "42703" || /likes/i.test(error.message || ""));

  /**
   * @param {{category?: string, limit?: number, minLikes?: number,
   *          sort?: "new"|"likes"|"price-asc"|"price-desc"}} [options]
   */
  async function fetchProducts(options) {
    const opts = options || {};
    const sort = opts.sort || "new";
    const supabase = await getSupabase();

    if (!supabase) {
      const list = DEMO.products
        .filter((p) => (!opts.category || p.category === opts.category) && (!opts.minLikes || p.likes >= opts.minLikes))
        .sort(sorters[sort] || sorters.new);
      return opts.limit ? list.slice(0, opts.limit) : list;
    }

    const buildQuery = (useLikes) => {
      let query = supabase.from("products").select(useLikes ? COLUMNS : COLUMNS_NO_LIKES);
      if (opts.category) query = query.eq("category", opts.category);
      if (useLikes && opts.minLikes) query = query.gte("likes", opts.minLikes);

      if (useLikes && sort === "likes") {
        query = query.order("likes", { ascending: false }).order("created_at", { ascending: false });
      } else if (sort === "price-asc") {
        query = query.order("price", { ascending: true });
      } else if (sort === "price-desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      if (opts.limit) query = query.limit(opts.limit);
      return query;
    };

    // Nota: "withLikes" è per QUESTA richiesta. Home e catalogo possono fare più richieste
    // in parallelo: se guardassimo solo il flag globale, la seconda troverebbe il ripiego
    // già attivato dalla prima e andrebbe in errore invece di ripiegare a sua volta.
    let withLikes = likesSupported;
    let { data, error } = await buildQuery(withLikes);

    if (error && withLikes && isMissingLikes(error)) {
      if (likesSupported) {
        likesSupported = false;
        console.warn("[sab shop] La colonna 'likes' non esiste: esegui supabase/migration-likes.sql. Intanto mostro i prodotti senza like.");
      }
      withLikes = false;
      ({ data, error } = await buildQuery(false));
    }

    if (error) throw error;

    // Senza la colonna likes non esiste una classifica: la sezione "più amati" resta vuota
    if (!withLikes && opts.minLikes) return [];
    return data || [];
  }

  /* ------------------------------------------------------------------------
     Componenti di interfaccia
     ---------------------------------------------------------------------- */
  const ICON_EXTERNAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
  const ICON_HEART = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-8-4.9-9.5-10C1.6 7 3.8 4.5 6.6 4.5c2 0 3.700 1.200 5.400 3.300 1.700-2.100 3.400-3.300 5.400-3.300 2.800 0 5 2.500 4.100 6-1.500 5.100-9.500 10-9.500 10Z"/></svg>`;
  const ICON_HANGER = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 27v-3.5a4.5 4.5 0 1 0-4.5-4.5"/><path d="M32 27 8 43.5a2.5 2.5 0 0 0 1.4 4.5h45.2a2.5 2.5 0 0 0 1.4-4.5L32 27Z"/></svg>`;

  const placeholderHTML = () => `<div class="product-placeholder" aria-hidden="true">${ICON_HANGER}</div>`;

  function likesBadgeHTML(likes) {
    const n = Math.floor(Number(likes));
    if (!Number.isFinite(n) || n <= 0) return "";
    return `<span class="product-likes">${ICON_HEART}<span aria-hidden="true">${n}</span><span class="visually-hidden">${n} like</span></span>`;
  }

  function productCardHTML(product, categoryName) {
    const url = safeUrl(product.vinted_url, CONFIG.vintedUrl);
    const title = esc(product.title);
    const imageUrl = safeUrl(product.image_url);
    const image = imageUrl
      ? `<img class="product-img" src="${esc(imageUrl)}" alt="${title}" loading="lazy" decoding="async">`
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
              Acquista su Vinted ${ICON_EXTERNAL}
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

  function renderProducts(container, products, categories) {
    const names = new Map((categories || []).map((c) => [c.slug, c.name]));
    container.innerHTML = products.map((p) => productCardHTML(p, names.get(p.category))).join("");
    container.setAttribute("aria-busy", "false");
    bindImageFallback(container);
  }

  function renderSkeletons(container, count) {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = Array.from({ length: count || 8 }, () => `<div class="skeleton" aria-hidden="true"></div>`).join("");
  }

  /** Messaggio centrato (nessun risultato, errore, ecc.) con pulsante verso Vinted. */
  function renderState(container, state) {
    container.setAttribute("aria-busy", "false");
    container.innerHTML = `
      <div class="state-box">
        <h3>${esc(state.title)}</h3>
        <p>${esc(state.text)}</p>
        <a class="btn btn-primary" href="${esc(CONFIG.vintedUrl)}" target="_blank" rel="noopener noreferrer">Vai al guardaroba su Vinted ${ICON_EXTERNAL}</a>
        ${
          state.detail
            ? `<details class="state-detail"><summary>Dettagli tecnici (per chi gestisce il sito)</summary><p>${esc(state.detail)}</p></details>`
            : ""
        }
      </div>`;
  }

  /** Le categorie sono un "extra": se falliscono i prodotti si vedono comunque. */
  function categoriesSafe() {
    return fetchCategories().catch((error) => {
      console.warn("[sab shop] Categorie non disponibili:", error);
      return [];
    });
  }

  /* ------------------------------------------------------------------------
     Header e footer condivisi
     ---------------------------------------------------------------------- */
  const NAV = [
    { href: "index.html", label: "Home", page: "home" },
    { href: "catalog.html", label: "Catalog", page: "catalog" },
    { href: "chi-siamo.html", label: "Chi Siamo", page: "about" },
    { href: "contatti.html", label: "Contatti", page: "contact" },
  ];

  function headerHTML(current) {
    const links = NAV.map(
      (item) => `<a href="${item.href}"${item.page === current ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`
    ).join("");

    return `
    <header class="site-header">
      <div class="container header-inner">
        <a class="logo" href="index.html" aria-label="${esc(CONFIG.brandName)} – Home">sab <em>shop</em></a>
        <nav class="nav" id="primary-nav" aria-label="Navigazione principale">${links}</nav>
        <a class="btn btn-primary header-cta" href="${esc(CONFIG.vintedUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="cta-extra">Shop su&nbsp;</span>Vinted ${ICON_EXTERNAL}
        </a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Apri il menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;
  }

  function footerHTML() {
    const instagram = safeUrl(CONFIG.instagramUrl)
      ? `<li><a href="${esc(safeUrl(CONFIG.instagramUrl))}" target="_blank" rel="noopener noreferrer">Instagram</a></li>`
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
            <ul>${NAV.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`).join("")}</ul>
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
          <p>© ${new Date().getFullYear()} ${esc(CONFIG.brandName)}. Tutti i diritti riservati.</p>
          <p>Gli acquisti si concludono sulla piattaforma Vinted: prezzi, disponibilità, spedizione e condizioni di reso sono quelli indicati nel singolo annuncio. Vinted è un marchio di Vinted UAB; ${esc(CONFIG.brandName)} è un profilo venditore indipendente, non affiliato né sponsorizzato dalla piattaforma.</p>
        </div>
      </div>
    </footer>`;
  }

  // Avviso in cima alla pagina quando Supabase non è (ancora) collegato davvero:
  // evita di scambiare i prodotti di esempio per quelli veri.
  function configNoticeHTML() {
    const status = getConfigStatus();
    if (status.mode === "demo") {
      return `<div class="demo-bar" role="status"><strong>Anteprima.</strong> Stai vedendo prodotti di esempio: per mostrare i tuoi articoli collega Supabase in <code>js/config.js</code> e inseriscili nella tabella <code>products</code>.</div>`;
    }
    if (status.mode === "invalid") {
      return `<div class="demo-bar demo-bar--warn" role="alert"><strong>Configurazione da correggere.</strong> ${esc(status.message)}</div>`;
    }
    return "";
  }

  function initLayout() {
    const current = document.body.dataset.page;

    const headerSlot = document.getElementById("site-header");
    if (headerSlot) headerSlot.innerHTML = configNoticeHTML() + headerHTML(current);

    const footerSlot = document.getElementById("site-footer");
    if (footerSlot) footerSlot.innerHTML = footerHTML();

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

  /* ------------------------------------------------------------------------
     Home: "I più amati" + "Ultimi arrivi" + categorie
     ---------------------------------------------------------------------- */
  async function initHome() {
    const likedSection = document.getElementById("piu-amati");
    const likedGrid = document.getElementById("liked-grid");
    const latestSection = document.getElementById("vetrina");
    const latestGrid = document.getElementById("featured-grid");
    const categorySection = document.getElementById("categorie");
    const categoryChips = document.getElementById("home-categories");

    renderSkeletons(latestGrid, CONFIG.homeLatestCount);

    try {
      const [categories, liked, latest] = await Promise.all([
        categoriesSafe(),
        // Solo i prodotti con almeno 1 like, dal più al meno amato
        fetchProducts({ sort: "likes", minLikes: 1, limit: CONFIG.homeMostLikedCount }),
        fetchProducts({ limit: CONFIG.homeLatestCount * 2 + CONFIG.homeMostLikedCount }),
      ]);

      // I più amati (la sezione resta nascosta se nessun articolo ha like)
      if (liked.length > 0) {
        renderProducts(likedGrid, liked, categories);
        likedSection.hidden = false;
      }

      // Ultimi arrivi (senza ripetere quelli già mostrati tra i più amati)
      const likedIds = new Set(liked.map((p) => p.id));
      const wanted = liked.length > 0 ? CONFIG.homeLatestCount : CONFIG.homeLatestCount * 2;
      const latestList = latest.filter((p) => !likedIds.has(p.id)).slice(0, wanted);

      if (latestList.length > 0) {
        renderProducts(latestGrid, latestList, categories);
      } else if (liked.length === 0) {
        renderState(latestGrid, {
          title: "Nuovi arrivi in arrivo",
          text: "Non ci sono ancora articoli in vetrina. Nel frattempo puoi sfogliare tutto il guardaroba su Vinted.",
          detail: isSupabaseConfigured() ? EMPTY_DB_HINT : "",
        });
      } else {
        latestSection.hidden = true;
      }

      // Categorie
      if (categories.length > 0 && categoryChips && categorySection) {
        categoryChips.innerHTML = categories
          .map((c) => `<a class="chip" href="catalog.html?cat=${encodeURIComponent(c.slug)}">${esc(c.name)}</a>`)
          .join("");
        categorySection.hidden = false;
      }
    } catch (error) {
      console.error("[sab shop] Errore nel caricamento dei prodotti:", error);
      renderState(latestGrid, {
        title: "Non riusciamo a caricare i prodotti",
        text: "Riprova tra qualche istante. Intanto puoi trovare tutti gli articoli sul nostro profilo Vinted.",
        detail: describeError(error),
      });
    }
  }

  /* ------------------------------------------------------------------------
     Catalogo: filtri per categoria, ricerca e ordinamento
     ---------------------------------------------------------------------- */
  async function initCatalog() {
    const els = {
      grid: document.getElementById("catalog-grid"),
      chips: document.getElementById("category-chips"),
      search: document.getElementById("search"),
      sort: document.getElementById("sort"),
      count: document.getElementById("results-count"),
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
        .filter((p) => !q || `${p.title} ${p.description || ""}`.toLowerCase().includes(q))
        .sort(sorters[state.sort] || sorters.new);
    }

    function renderChips() {
      const counts = new Map();
      state.products.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));

      const items = [{ slug: "", name: "Tutti", count: state.products.length }]
        .concat(
          state.categories
            .map((c) => ({ slug: c.slug, name: c.name, count: counts.get(c.slug) || 0 }))
            .filter((c) => c.count > 0 || c.slug === state.category)
        );

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

      if (state.products.length === 0) {
        // Il database non ha restituito nessun articolo (non è colpa dei filtri)
        renderState(els.grid, {
          title: "Nuovi articoli in arrivo",
          text: "Stiamo preparando il catalogo. Nel frattempo puoi sfogliare tutto il guardaroba su Vinted.",
          detail: isSupabaseConfigured() ? EMPTY_DB_HINT : "",
        });
        return;
      }

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
      try {
        const url = new URL(location.href);
        if (state.category) url.searchParams.set("cat", state.category);
        else url.searchParams.delete("cat");
        history.replaceState(null, "", url);
      } catch (e) {
        /* con file:// alcuni browser non permettono di modificare l'URL: non è un problema */
      }
    }

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

    renderSkeletons(els.grid, 8);
    els.sort.value = state.sort;

    try {
      const result = await Promise.all([categoriesSafe(), fetchProducts()]);
      state.categories = result[0];
      state.products = result[1];
      renderChips();
      renderGrid();
    } catch (error) {
      console.error("[sab shop] Errore nel caricamento del catalogo:", error);
      els.count.textContent = "";
      renderState(els.grid, {
        title: "Non riusciamo a caricare il catalogo",
        text: "Riprova tra qualche istante. Intanto puoi trovare tutti gli articoli sul nostro profilo Vinted.",
        detail: describeError(error),
      });
    }
  }

  /* ------------------------------------------------------------------------
     Contatti: mostra email e Instagram solo se configurati in config.js
     ---------------------------------------------------------------------- */
  function initContact() {
    const email = (CONFIG.email || "").trim();
    const emailCard = document.getElementById("contact-email");
    if (emailCard && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailCard.href = "mailto:" + email;
      emailCard.querySelector("[data-value]").textContent = email;
      emailCard.hidden = false;
    }

    const instagram = safeUrl(CONFIG.instagramUrl);
    const instagramCard = document.getElementById("contact-instagram");
    if (instagramCard && instagram) {
      instagramCard.href = instagram;
      instagramCard.hidden = false;
    }

    document.querySelectorAll("[data-vinted]").forEach((a) => {
      a.href = CONFIG.vintedUrl;
    });
  }

  /* ------------------------------------------------------------------------
     Avvio
     ---------------------------------------------------------------------- */
  initLayout();

  const page = document.body.dataset.page;
  if (page === "home") initHome();
  else if (page === "catalog") initCatalog();
  else if (page === "contact") initContact();
})();
