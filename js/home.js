// Home: "I più amati" (ordinati per like), "Ultimi arrivi" e categorie, da Supabase.
import "./layout.js";
import { CONFIG } from "./config.js";
import { fetchProducts, fetchCategories } from "./products.js";
import { renderProducts, renderSkeletons, renderState } from "./ui.js";
import { esc } from "./utils.js";

const likedSection = document.getElementById("piu-amati");
const likedGrid = document.getElementById("liked-grid");
const latestGrid = document.getElementById("featured-grid");
const categorySection = document.getElementById("categorie");
const categoryChips = document.getElementById("home-categories");

async function init() {
  renderSkeletons(latestGrid, CONFIG.homeLatestCount);

  try {
    const [categories, liked, latest] = await Promise.all([
      fetchCategories(),
      // Solo i prodotti con almeno 1 like, dal più al meno amato
      fetchProducts({ sort: "likes", minLikes: 1, limit: CONFIG.homeMostLikedCount }),
      fetchProducts({ limit: CONFIG.homeLatestCount * 2 + CONFIG.homeMostLikedCount }),
    ]);

    // --- I più amati (la sezione resta nascosta se nessun articolo ha like)
    if (liked.length > 0) {
      renderProducts(likedGrid, liked, categories);
      likedSection.hidden = false;
    }

    // --- Ultimi arrivi (senza ripetere quelli già mostrati tra i più amati)
    const likedIds = new Set(liked.map((p) => p.id));
    const wanted = liked.length > 0 ? CONFIG.homeLatestCount : CONFIG.homeLatestCount * 2;
    const latestList = latest.filter((p) => !likedIds.has(p.id)).slice(0, wanted);

    if (latestList.length > 0) {
      renderProducts(latestGrid, latestList, categories);
    } else if (liked.length === 0) {
      renderState(latestGrid, {
        title: "Nuovi arrivi in arrivo",
        text: "Stiamo preparando la vetrina. Nel frattempo puoi sfogliare tutto il guardaroba su Vinted.",
      });
    } else {
      document.getElementById("vetrina").hidden = true;
    }

    // --- Categorie
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
    });
  }
}

init();
