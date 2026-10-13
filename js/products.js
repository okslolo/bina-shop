// Accesso ai dati: legge categorie e prodotti da Supabase.
// Se Supabase NON è configurato usa i dati demo; se è configurato ma la
// richiesta fallisce, l'errore viene propagato (la UI mostra un messaggio
// invece di far vedere prodotti finti su un sito reale).
import { getSupabase } from "./supabase-client.js";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./demo-data.js";

const PRODUCT_COLUMNS = "id, title, description, price, image_url, vinted_url, category, likes, created_at";

/** @returns {Promise<Array<{id:number,name:string,slug:string}>>} */
export async function fetchCategories() {
  const supabase = await getSupabase();
  if (!supabase) return DEMO_CATEGORIES;

  const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
  if (error) throw error;
  return data ?? [];
}

/**
 * @param {{
 *   category?: string,                              slug della categoria (opzionale)
 *   limit?: number,
 *   minLikes?: number,                              mostra solo prodotti con almeno N like
 *   sort?: "new"|"likes"|"price-asc"|"price-desc"
 * }} [options]
 */
export async function fetchProducts({ category, limit, minLikes, sort = "new" } = {}) {
  const supabase = await getSupabase();

  if (!supabase) {
    let list = DEMO_PRODUCTS.filter(
      (p) => (!category || p.category === category) && (!minLikes || p.likes >= minLikes)
    );
    list.sort(demoSorters[sort] ?? demoSorters.new);
    return limit ? list.slice(0, limit) : list;
  }

  let query = supabase.from("products").select(PRODUCT_COLUMNS);
  if (category) query = query.eq("category", category);
  if (minLikes) query = query.gte("likes", minLikes);

  if (sort === "likes") {
    query = query.order("likes", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "price-asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price-desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);

const demoSorters = {
  new: byDate,
  likes: (a, b) => b.likes - a.likes || byDate(a, b),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
};
