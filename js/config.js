// ==========================================================================
// Configurazione di sab shop
// Script classico: funziona anche aprendo le pagine con doppio clic.
// Modifica SOLO questo file per collegare Supabase e personalizzare i contatti.
// ==========================================================================
window.SAB_CONFIG = {
  brandName: "sab shop",

  // Profilo Vinted ufficiale
  vintedUrl: "https://www.vinted.it/member/103339040",

  // --- Supabase ---------------------------------------------------------
  // Trovi questi valori in: Supabase > Project Settings > API
  //  - Project URL            (es. https://abcdxyz.supabase.co)
  //  - anon / publishable key (chiave PUBBLICA, sicura da usare nel browser
  //    perché l'accesso ai dati è limitato dalle policy RLS di schema.sql)
  // NON inserire mai qui la chiave "service_role" / "secret".
  supabaseUrl: "https://kkkthzajwmnorstjdbdj.supabase.co",
  supabaseAnonKey: "sb_publishable_OmWsZIkvm33NVKVJP8Ct5Q_3OT9yQ_A",

  // --- Contatti e social (lascia vuoto per nascondere) ------------------
  email: "",
  instagramUrl: "",

  // Quanti prodotti mostrare nelle sezioni della Home
  homeMostLikedCount: 4, // "I più amati" (ordinati per like)
  homeLatestCount: 4, // "Ultimi arrivi"
};
