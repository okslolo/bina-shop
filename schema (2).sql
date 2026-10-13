-- ============================================================================
-- sab shop — schema database Supabase (shop senza Vinted)
--
-- Pensato per un progetto Supabase NUOVO e VUOTO: eseguilo una sola volta in
-- SQL Editor > New query > Run.
--
-- Come funziona la sicurezza (importante):
--  * Chiunque può LEGGERE categorie e articoli (serve alla vetrina).
--  * Nessuno può scrivere articoli dal sito pubblico.
--  * Gli ordini si creano SOLO con la funzione place_order(): controlla gli
--    articoli, calcola il totale dai prezzi del database (non da quelli inviati
--    dal browser) e li riserva. Ordini e dati dei clienti non sono leggibili
--    dal pubblico.
--  * La pagina admin è riservata agli utenti nella tabella "admins".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Categorie
-- ----------------------------------------------------------------------------
create table public.categories (
  id    bigint generated always as identity primary key,
  name  text not null check (length(btrim(name)) between 1 and 80),
  slug  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table  public.categories      is 'Categorie del catalogo (es. Abiti, Borse).';
comment on column public.categories.slug is 'Identificativo URL: minuscolo, senza spazi (es. abiti, top-camicie).';

-- ----------------------------------------------------------------------------
-- 2) Articoli (pezzi unici: ogni riga è un solo capo)
-- ----------------------------------------------------------------------------
create table public.products (
  id           bigint generated always as identity primary key,
  title        text not null check (length(btrim(title)) between 1 and 200),
  description  text check (description is null or length(description) <= 4000),
  price        numeric(10, 2) not null check (price >= 0 and price < 100000),
  image_url    text check (image_url is null or image_url ~* '^https?://'),
  category     text references public.categories (slug) on update cascade on delete set null,
  size         text check (size is null or length(size) <= 40),
  condition    text check (condition is null or length(condition) <= 80),
  likes        integer not null default 0 check (likes >= 0),
  status       text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  created_at   timestamptz not null default now()
);

comment on table  public.products           is 'Articoli in vendita (pezzi unici).';
comment on column public.products.image_url is 'Indirizzo pubblico della foto (Storage > product-images).';
comment on column public.products.likes     is 'Cuori dei visitatori: ordina la sezione "I più amati".';
comment on column public.products.status    is 'available = acquistabile, reserved = in un ordine, sold = venduto.';

create index products_category_idx   on public.products (category);
create index products_created_at_idx on public.products (created_at desc);
create index products_likes_idx      on public.products (likes desc);
create index products_status_idx     on public.products (status);

-- ----------------------------------------------------------------------------
-- 3) Amministratori (chi può usare la pagina admin)
-- ----------------------------------------------------------------------------
create table public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admins is 'Utenti autorizzati alla pagina admin. Si aggiungono a mano (vedi README).';

-- ----------------------------------------------------------------------------
-- 4) Ordini
-- ----------------------------------------------------------------------------
create table public.orders (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  status          text not null default 'new' check (status in ('new', 'paid', 'shipped', 'cancelled')),
  customer_name   text not null,
  email           text not null,
  phone           text,
  address         text not null,
  city            text not null,
  zip             text not null,
  province        text,
  country         text not null default 'Italia',
  notes           text,
  payment_method  text,
  total           numeric(10, 2) not null check (total >= 0)
);

comment on table  public.orders        is 'Ordini ricevuti dal sito. Contiene dati personali dei clienti: non esporre al pubblico.';
comment on column public.orders.status is 'new = da gestire, paid = pagato, shipped = spedito, cancelled = annullato.';

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_email_idx      on public.orders (lower(email));

create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders (id) on delete cascade,
  product_id  bigint references public.products (id) on delete set null,
  title       text not null,
  price       numeric(10, 2) not null
);

comment on table public.order_items is 'Articoli di ogni ordine, con titolo e prezzo al momento dell''acquisto.';

create index order_items_order_idx on public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- 5) Funzioni
-- ----------------------------------------------------------------------------

-- true se l'utente collegato è un amministratore
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Crea un ordine in modo sicuro. Restituisce { order_number, total }.
-- Errori (nel campo "message"): EMPTY_CART, TOO_MANY_ITEMS, INVALID_NAME,
-- INVALID_EMAIL, INVALID_ADDRESS, INVALID_PAYMENT, TOO_MANY_ORDERS, BUSY,
-- ITEM_UNAVAILABLE (con in "details" gli id non più disponibili).
create function public.place_order(
  p_items    bigint[],
  p_name     text,
  p_email    text,
  p_phone    text,
  p_address  text,
  p_city     text,
  p_zip      text,
  p_province text,
  p_country  text,
  p_notes    text,
  p_payment  text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids        bigint[];
  v_unavail    bigint[];
  v_total      numeric(10, 2);
  v_order_id   bigint;
begin
  if p_items is null or coalesce(array_length(p_items, 1), 0) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  select array_agg(distinct i order by i) into v_ids from unnest(p_items) as i;
  if array_length(v_ids, 1) > 20 then
    raise exception 'TOO_MANY_ITEMS';
  end if;

  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then
    raise exception 'INVALID_NAME';
  end if;
  if p_email is null or length(p_email) > 200 or btrim(p_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if length(btrim(coalesce(p_address, ''))) < 3 or length(p_address) > 200
     or length(btrim(coalesce(p_city, ''))) < 2 or length(p_city) > 100
     or length(btrim(coalesce(p_zip, ''))) < 3 or length(p_zip) > 12
     or length(coalesce(p_province, '')) > 60
     or length(coalesce(p_country, '')) > 60
     or length(coalesce(p_phone, '')) > 40
     or length(coalesce(p_notes, '')) > 1000 then
    raise exception 'INVALID_ADDRESS';
  end if;
  if p_payment is null or length(btrim(p_payment)) not between 1 and 40 then
    raise exception 'INVALID_PAYMENT';
  end if;

  -- Limiti contro gli abusi: pochi ordini aperti per email, e un tetto orario generale
  if (select count(*) from public.orders
      where status = 'new' and lower(email) = lower(btrim(p_email))) >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;
  if (select count(*) from public.orders where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'BUSY';
  end if;

  -- Blocca le righe degli articoli (in ordine, per evitare blocchi incrociati) e controlla che siano disponibili
  perform 1 from public.products where id = any (v_ids) order by id for update;

  select array_agg(i order by i) into v_unavail
  from unnest(v_ids) as i
  where not exists (select 1 from public.products p where p.id = i and p.status = 'available');

  if v_unavail is not null then
    raise exception 'ITEM_UNAVAILABLE' using detail = array_to_string(v_unavail, ',');
  end if;

  select sum(price) into v_total from public.products where id = any (v_ids);

  insert into public.orders (customer_name, email, phone, address, city, zip, province, country, notes, payment_method, total)
  values (
    btrim(p_name), lower(btrim(p_email)), nullif(btrim(coalesce(p_phone, '')), ''),
    btrim(p_address), btrim(p_city), btrim(p_zip), nullif(btrim(coalesce(p_province, '')), ''),
    coalesce(nullif(btrim(coalesce(p_country, '')), ''), 'Italia'),
    nullif(btrim(coalesce(p_notes, '')), ''), btrim(p_payment), v_total
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, title, price)
  select v_order_id, id, title, price from public.products where id = any (v_ids);

  update public.products set status = 'reserved' where id = any (v_ids);

  return jsonb_build_object('order_number', 'SAB-' || lpad(v_order_id::text, 5, '0'), 'total', v_total);
end;
$$;

-- Cambia lo stato di un ordine e aggiorna gli articoli di conseguenza (solo admin)
--   new -> riservati | paid, shipped -> venduti | cancelled -> di nuovo disponibili
create function public.admin_set_order_status(p_order_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('new', 'paid', 'shipped', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  update public.products
  set status = case p_status when 'cancelled' then 'available' when 'new' then 'reserved' else 'sold' end
  where id in (select product_id from public.order_items where order_id = p_order_id and product_id is not null);
end;
$$;

-- Aggiunge (+1) o toglie (-1) un cuore a un articolo
create function public.like_product(p_id bigint, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_likes integer;
begin
  if p_delta is null or p_delta not in (-1, 1) then
    raise exception 'INVALID_DELTA';
  end if;
  update public.products set likes = greatest(likes + p_delta, 0) where id = p_id returning likes into v_likes;
  return v_likes;
end;
$$;

-- Permessi sulle funzioni: di base nessuno, poi solo quelli necessari
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin()                                                                      to anon, authenticated;
grant execute on function public.place_order(bigint[], text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.like_product(bigint, integer)                                                   to anon, authenticated;
grant execute on function public.admin_set_order_status(bigint, text)                                            to authenticated;

-- ----------------------------------------------------------------------------
-- 6) Sicurezza a livello di riga (RLS) e permessi sulle tabelle
-- ----------------------------------------------------------------------------
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.admins      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

revoke all on public.categories, public.products, public.admins, public.orders, public.order_items from anon, authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant usage on sequence public.categories_id_seq, public.products_id_seq to authenticated;
grant select on public.admins, public.orders, public.order_items to authenticated;

-- Categorie e articoli: lettura pubblica, scrittura solo admin
create policy "Lettura pubblica categorie" on public.categories for select to anon, authenticated using (true);
create policy "Admin gestisce categorie"   on public.categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Lettura pubblica articoli"  on public.products   for select to anon, authenticated using (true);
create policy "Admin gestisce articoli"    on public.products   for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ordini: li legge solo l'admin (la creazione passa da place_order)
create policy "Admin legge ordini"         on public.orders      for select to authenticated using (public.is_admin());
create policy "Admin legge righe ordini"   on public.order_items for select to authenticated using (public.is_admin());

-- Amministratori: ciascuno vede solo la propria riga
create policy "Ognuno vede se stesso"      on public.admins      for select to authenticated using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 7) Foto: contenitore pubblico in lettura, caricamento solo admin
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Admin carica foto"   on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admin modifica foto" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admin elimina foto"  on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 8) Categorie iniziali (modificabili dalla pagina admin o dal Table Editor)
-- ----------------------------------------------------------------------------
insert into public.categories (name, slug) values
  ('Abiti',              'abiti'),
  ('Top & Camicie',      'top-camicie'),
  ('Gonne & Pantaloni',  'gonne-pantaloni'),
  ('Giacche & Cappotti', 'giacche-cappotti'),
  ('Borse',              'borse'),
  ('Accessori',          'accessori'),
  ('Scarpe',             'scarpe');
