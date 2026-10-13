// Client Supabase caricato "pigramente": la libreria viene scaricata solo
// se Supabase è configurato. Senza configurazione il sito funziona in
// modalità demo e non fa nessuna richiesta di rete verso Supabase.
import { CONFIG, isSupabaseConfigured } from "./config.js";

const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let clientPromise = null;

/** Restituisce il client Supabase, oppure null se non è configurato. */
export function getSupabase() {
  if (!isSupabaseConfigured()) return Promise.resolve(null);

  if (!clientPromise) {
    clientPromise = import(SUPABASE_ESM)
      .then(({ createClient }) =>
        createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
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
