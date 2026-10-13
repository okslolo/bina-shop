// Pagina Contatti: mostra email e Instagram solo se configurati in config.js
import "./layout.js";
import { CONFIG } from "./config.js";
import { safeUrl } from "./utils.js";

const email = (CONFIG.email || "").trim();
const emailCard = document.getElementById("contact-email");
if (emailCard && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  emailCard.href = `mailto:${email}`;
  emailCard.querySelector("[data-value]").textContent = email;
  emailCard.hidden = false;
}

const instagram = safeUrl(CONFIG.instagramUrl);
const instagramCard = document.getElementById("contact-instagram");
if (instagramCard && instagram) {
  instagramCard.href = instagram;
  instagramCard.hidden = false;
}

const vintedLinks = document.querySelectorAll("[data-vinted]");
vintedLinks.forEach((a) => {
  a.href = CONFIG.vintedUrl;
});
