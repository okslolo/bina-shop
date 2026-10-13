# sab shop

Sito vetrina di moda femminile (rosa cipria, bianco e argento) con catalogo dinamico su **Supabase** e acquisto sul profilo **Vinted**: <https://www.vinted.it/member/103339040>

È un sito statico (HTML + CSS + JavaScript semplice): **nessuna build, nessuna installazione obbligatoria**. Funziona anche aprendo `index.html` con doppio clic.

## Struttura

```
sab-shop/
├── index.html          Home: hero, categorie, più amati, ultimi arrivi, blocco Vinted
├── catalog.html        Catalogo con filtri, ricerca e ordinamento
├── chi-siamo.html      Chi Siamo
├── contatti.html       Contatti + FAQ
├── css/styles.css      Stile (colori e font in :root, in cima al file)
├── js/
│   ├── config.js           ← QUI inserisci URL/chiave Supabase, email, Instagram
│   ├── demo-data.js        Dati di esempio (usati finché Supabase non è configurato)
│   └── app.js              Tutta la logica: connessione a Supabase, prodotti, catalogo, header e footer
├── supabase/schema.sql Tabelle, sicurezza (RLS), contenitore foto, categorie (esempi facoltativi)
├── supabase/migration-likes.sql   Solo se avevi già eseguito la prima versione dello schema
└── package.json        Solo per il comando `npm start`
```

## Avvio in locale

Apri `index.html` con doppio clic, oppure (consigliato, è più simile al sito online) avvia un piccolo server locale:

```bash
python3 -m http.server 5173     # poi apri http://localhost:5173
# oppure
npm start                       # usa "serve", poi apri http://localhost:5173
```

Senza configurare nulla vedi subito il sito con **8 prodotti demo** e una barra grigia “Anteprima” in alto: serve a ricordarti che quelli non sono i tuoi articoli.

## Database: il progetto Supabase “sab shop”

Il sito è **già collegato** al progetto Supabase **sab shop**: Project URL e chiave pubblica sono già in `js/config.js`. Manca un solo passaggio, da fare una volta sola:

1. Apri il progetto **sab shop** su <https://supabase.com/dashboard> → **SQL Editor → New query**.
2. Incolla tutto il contenuto di `supabase/schema.sql` e premi **Run** (deve rispondere “Success”).
   Crea le tabelle `categories` e `products`, la sola lettura pubblica, il contenitore foto `product-images` e 7 categorie. **Non** inserisce articoli: ci saranno solo i tuoi.
3. Ricarica il sito. Finché non aggiungi il primo articolo vedrai “Nuovi arrivi in arrivo”: è normale.

Per usare invece un altro progetto Supabase: **Project Settings → API**, copia **Project URL** e la chiave **anon / publishable** e incollali in `js/config.js` (`supabaseUrl` e `supabaseAnonKey`), poi esegui `schema.sql` in quel progetto.

> La chiave *anon* è pubblica per natura: la sicurezza è garantita dalle policy RLS dello script, che consentono **solo la lettura**. Non inserire mai la chiave `service_role` nel sito.

## Gestire il catalogo

- **Aggiungere prodotti**: Supabase → **Table Editor → products → Insert row**.
  Campi: `title`, `description`, `price`, `image_url`, `vinted_url` (link all'annuncio; se non lo hai lascia il default del profilo), `category` (lo *slug* di una categoria, es. `abiti`), `likes` (numero di like dell'annuncio su Vinted).
- **Foto**: vedi “Aggiungere un articolo con la foto” qui sotto. Senza foto compare un segnaposto elegante (una gruccia rosa).
- **Categorie**: tabella `categories` (`name` visibile, `slug` in minuscolo senza spazi).
- **Provare il sito con articoli finti**: in fondo a `schema.sql` c'è un blocco commentato con 8 prodotti di esempio; non attivarlo su un sito vero.

## Aggiungere un articolo con la foto

1. Supabase → **Storage** → contenitore **product-images** → **Upload file** e scegli la foto. Meglio un nome semplice, senza spazi (es. `abito-rosa.jpg`). Le foto in verticale (4:5) vengono mostrate per intero.
2. Clicca sul file caricato → **Get URL** (copia l'indirizzo). Inizia con `https://…supabase.co/storage/v1/object/public/product-images/`.
3. **Table Editor → products → Insert → Insert row**: compila `title`, `price`, `category` (lo slug, es. `abiti`), `vinted_url` (il link dell'annuncio) e incolla l'indirizzo della foto in **`image_url`**. Salva.
4. Ricarica il sito: la foto compare. Se vedi la gruccia rosa al posto della foto, l'indirizzo in `image_url` è sbagliato o la foto non è nel contenitore `product-images`.

## Collegamento con Vinted e sezione “I più amati”

**Cosa è collegato**
- Ogni prodotto ha il campo `vinted_url`: il pulsante “Acquista su Vinted” e un clic sulla foto aprono **l'annuncio reale** su Vinted. Incolla lì il link diretto all'annuncio (es. `https://www.vinted.it/items/123456-nome-articolo`).
- La Home mostra **“I più amati”**: i 4 prodotti con più `likes`, dal più al meno amato, con il cuore e il numero sulla foto, e il pulsante **“Vedi tutto il catalogo”** (apre `catalog.html?sort=likes`, già ordinato per like). Se nessun prodotto ha like (tutti a 0), la sezione resta nascosta.
- Nel catalogo trovi anche l'ordinamento **“Più amati”**.

**Cosa NON è automatico**
Per quanto ne so Vinted non offre un'API pubblica per leggere gli annunci di un venditore, e il suo sito blocca la lettura automatica delle pagine. Per questo il sito **non si sincronizza da solo**: titolo, prezzo, foto e numero di like vanno inseriti/aggiornati a mano nel Table Editor di Supabase (quando pubblichi un nuovo articolo, lo vendi o i like cambiano). Gli script che “leggono” Vinted di nascosto non sono affidabili e vanno contro le regole della piattaforma, quindi non li ho inclusi.

**Aggiornare i like**: Table Editor → `products` → modifica la colonna `likes`. Oppure da SQL: `update public.products set likes = 12 where id = 1;`

**Se avevi già eseguito la prima versione di `schema.sql`**: esegui anche `supabase/migration-likes.sql` (aggiunge la colonna `likes`). Senza quella colonna il sito mostra comunque i prodotti, ma senza cuori e senza la sezione “I più amati”.

## Non vedo i miei articoli: cosa controllare

Se la pagina non mostra i prodotti, apri la sezione **“Dettagli tecnici”** nel riquadro di errore (o la barra colorata in cima alla pagina): dice la causa. Le più comuni:

| Cosa vedi | Causa | Cosa fare |
|---|---|---|
| Barra grigia “Anteprima” e prodotti di esempio senza foto | `js/config.js` ha ancora i segnaposto | Inserisci Project URL e chiave anon (vedi “Database”) |
| Barra arancione “Configurazione da correggere” | Hai sostituito solo l'URL o solo la chiave, oppure hai usato una chiave segreta | Servono entrambi; usa la chiave **anon / publishable**, mai quella segreta |
| “Impossibile raggiungere Supabase… in pausa” | I progetti gratuiti si **mettono in pausa dopo giorni di inattività** | Dashboard Supabase → **Restore project**, attendi qualche minuto e ricarica |
| “La tabella non esiste” | Non hai ancora eseguito `schema.sql` nel progetto **sab shop** | Esegui `supabase/schema.sql` nel SQL Editor (vedi “Database”) |
| “Nuovi arrivi in arrivo” con spiegazione | Tabella `products` vuota, oppure policy RLS mancanti | Inserisci almeno un prodotto; riesegui `schema.sql` per le policy |
| “Chiave Supabase non valida” | Chiave copiata male o di un altro progetto | Copiala di nuovo da Project Settings → API |

Il piano gratuito di Supabase mette i progetti **in pausa dopo circa una settimana senza attività**: se il sito smette di mostrare gli articoli, controlla prima questo. Per riattivarlo: dashboard → progetto **sab shop** → **Restore project**.

## Personalizzare

- **Colori e font**: variabili CSS in `:root` (`--rose-*`, `--silver-*`, `--font-*`) in `css/styles.css`.
- **Testi**: direttamente negli HTML. Il testo di *Chi Siamo* è un'ottima base ma è generico: adattalo alla tua storia.
- **Email e Instagram**: in `js/config.js` (se vuoti non vengono mostrati).

## Codice di recupero prodotti (riferimento)

```js
import { createClient } from "@supabase/supabase-js"; // con bundler: npm i @supabase/supabase-js

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getMostLikedProducts(limit = 4) {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, description, price, image_url, vinted_url, category, likes, created_at")
    .order("likes", { ascending: false }) // più amati per primi
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
```

Nel progetto la libreria viene caricata dalla CDN solo quando Supabase è configurato (vedi `getSupabase()` in `js/app.js`).

## Pubblicazione online

Essendo un sito statico puoi caricare la cartella così com'è su Netlify, Vercel, Cloudflare Pages o GitHub Pages.

## Note

- Il sito non gestisce pagamenti: ogni pulsante “Acquista su Vinted” apre l'annuncio (`vinted_url`) in una nuova scheda.
- Disponibilità e prezzi su Vinted possono cambiare: aggiorna il database quando vendi un articolo.
