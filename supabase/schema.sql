-- ============================================================================
-- sab shop — schema database Supabase
-- Incolla tutto questo file in: Supabase > SQL Editor > New query > Run
-- Lo script è rieseguibile senza errori (idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabella categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id    bigint generated always as identity primary key,
  name  text not null,
  slug  text not null unique
);

comment on table public.categories is 'Categorie del catalogo (es. Abiti, Borse).';
comment on column public.categories.slug is 'Identificativo URL, in minuscolo e senza spazi (es. abiti).';

-- ----------------------------------------------------------------------------
-- 2) Tabella products
-- "category" contiene lo slug di una categoria (collegato a categories.slug)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text,
  price        numeric(10, 2) not null check (price >= 0),
  image_url    text,
  vinted_url   text not null
               default 'https://www.vinted.it/member/103339040'
               check (vinted_url ~* '^https?://'),
  category     text references public.categories (slug)
               on update cascade on delete set null,
  likes        integer not null default 0 check (likes >= 0),
  created_at   timestamptz not null default now()
);

-- Per chi aveva già eseguito una versione precedente dello script (senza "likes"):
alter table public.products
  add column if not exists likes integer not null default 0 check (likes >= 0);

comment on table public.products is 'Prodotti in vetrina. Ogni prodotto rimanda al relativo annuncio Vinted.';
comment on column public.products.vinted_url is 'Link all''annuncio Vinted (o al profilo se non hai il link diretto).';
comment on column public.products.likes is 'Numero di like/preferiti dell''annuncio su Vinted, aggiornato a mano. Ordina la sezione "I più amati".';

create index if not exists products_category_idx   on public.products (category);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_likes_idx      on public.products (likes desc);

-- ----------------------------------------------------------------------------
-- 3) Sicurezza (Row Level Security)
-- Il sito è pubblico: chiunque può LEGGERE, nessuno può scrivere dal browser.
-- Per aggiungere/modificare prodotti usa il Table Editor di Supabase
-- (le modifiche dalla dashboard non sono soggette a queste policy).
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products   enable row level security;

-- (Le policy si creano solo se mancano: così lo script resta rieseguibile
--  senza istruzioni di cancellazione, che nella dashboard fanno comparire avvisi.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'categories' and policyname = 'Lettura pubblica categorie'
  ) then
    create policy "Lettura pubblica categorie"
      on public.categories for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'Lettura pubblica prodotti'
  ) then
    create policy "Lettura pubblica prodotti"
      on public.products for select
      to anon, authenticated
      using (true);
  end if;
end $$;

grant select on public.categories to anon, authenticated;
grant select on public.products   to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) Storage per le foto dei prodotti (bucket pubblico in sola lettura)
-- Carica le immagini in Storage > product-images, poi copia l'URL pubblico
-- nel campo image_url del prodotto.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 5) Categorie iniziali (modificabili dal Table Editor)
-- Create solo se mancanti. I prodotti di esempio, più sotto, sono FACOLTATIVI:
-- sono commentati perché in un sito vero devono comparire solo i tuoi articoli.
-- ----------------------------------------------------------------------------
insert into public.categories (name, slug) values
  ('Abiti',              'abiti'),
  ('Top & Camicie',      'top-camicie'),
  ('Gonne & Pantaloni',  'gonne-pantaloni'),
  ('Giacche & Cappotti', 'giacche-cappotti'),
  ('Borse',              'borse'),
  ('Accessori',          'accessori'),
  ('Scarpe',             'scarpe')
on conflict (slug) do nothing;

-- Facoltativo: per provare il sito con 8 prodotti finti togli il "/*" qui sotto e il "*/" in fondo.
/*
insert into public.products (title, description, price, image_url, vinted_url, category, likes)
select * from (values
  ('Abito midi a fiori in chiffon',   'Leggero e fluido, perfetto per le giornate di primavera. Ottime condizioni.',              24.00, null, 'https://www.vinted.it/member/103339040', 'abiti',            23),
  ('Camicia in seta color cipria',    'Taglio morbido e tessuto setoso, si abbina a tutto.',                                      18.00, null, 'https://www.vinted.it/member/103339040', 'top-camicie',      14),
  ('Blazer vintage doppiopetto',      'Spalle strutturate e linea pulita: un classico che non passa mai di moda.',                32.00, null, 'https://www.vinted.it/member/103339040', 'giacche-cappotti', 31),
  ('Gonna plissé effetto argento',    'Plissettatura lunga con riflessi satinati. Taglia unica regolabile in vita.',              20.00, null, 'https://www.vinted.it/member/103339040', 'gonne-pantaloni',   9),
  ('Borsa a tracolla in pelle rosa',  'Compatta ma capiente, con tracolla regolabile e chiusura a calamita.',                     28.00, null, 'https://www.vinted.it/member/103339040', 'borse',            18),
  ('Foulard in seta vintage',         'Stampa delicata su fondo chiaro: ideale al collo, in testa o sulla borsa.',                12.00, null, 'https://www.vinted.it/member/103339040', 'accessori',         6),
  ('Ballerine nude con fiocco',       'Comode e raffinate, usate pochissimo.',                                                    15.00, null, 'https://www.vinted.it/member/103339040', 'scarpe',            4),
  ('Jeans a vita alta lavaggio chiaro','Vestibilità dritta e vita alta, denim morbido.',                                          22.00, null, 'https://www.vinted.it/member/103339040', 'gonne-pantaloni',  12)
) as v (title, description, price, image_url, vinted_url, category, likes)
where not exists (select 1 from public.products);
*/
