// Funzioni di utilità condivise

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Neutralizza il testo prima di inserirlo in HTML (protezione XSS). */
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** Accetta solo URL http(s); altrimenti restituisce il fallback. */
export function safeUrl(value, fallback = "") {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : fallback;
  } catch {
    return fallback;
  }
}

const priceFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? priceFormatter.format(n) : "";
}
