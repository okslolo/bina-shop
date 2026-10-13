-- ============================================================================
-- Migrazione: aggiunge il campo "likes" a products
-- Serve SOLO se hai già eseguito la prima versione di schema.sql.
-- (Se parti da zero, esegui direttamente schema.sql: include già tutto.)
-- Incolla in: Supabase > SQL Editor > New query > Run
-- ============================================================================

alter table public.products
  add column if not exists likes integer not null default 0 check (likes >= 0);

comment on column public.products.likes is 'Numero di like/preferiti dell''annuncio su Vinted, aggiornato a mano. Ordina la sezione "I più amati".';

create index if not exists products_likes_idx on public.products (likes desc);

-- Esempio: imposta i like di un prodotto (oppure modificali dal Table Editor)
-- update public.products set likes = 12 where id = 1;
