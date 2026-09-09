-- Zveza med državo in tekmovanjem.
--
-- Ob načrtu za države sem to raven namenoma izpustil: nanjo ne bi kazalo nič
-- razen `competitions`, zato jo je poceni dodati pozneje, takrat pa bi bila
-- prazna struktura z eno vrstico.
--
-- Zdaj ima nalogo. Z MNZ Ljubljana bo tekmovanj šest in ravna vrsta gumbov
-- ne zadošča več; izbirnik jih mora grupirati, in grupira jih po zvezi.
-- Hkrati je zveza naravno mesto za vir podatkov: ena zveza = eno spletišče.

create table if not exists federations (
  id         bigint primary key generated always as identity,
  country_id bigint  not null references countries(id) on delete cascade,
  code       text    not null unique,   -- 'mnzg', 'mnzlj'
  name       text    not null,          -- 'MNZ Gorenjska Kranj' (kakor se podpisuje)
  short_name text    not null,          -- 'Gorenjska'
  site_url   text,                      -- spletisce zveze; noga ga navede kot vir
  sort_order integer not null default 0,
  active     boolean not null default true
);

comment on table federations is
  'Regijska zveza (MNZ). Med državo in tekmovanjem; po njej izbirnik grupira lige.';
comment on column federations.code is
  'Ujema se z `competitions.source` — ena zveza objavlja na enem spletišču.';

alter table federations enable row level security;

drop policy if exists "zveze so javne" on federations;
create policy "zveze so javne" on federations for select using (true);

drop policy if exists "admin ureja zveze" on federations;
create policy "admin ureja zveze" on federations
  for all using (is_admin()) with check (is_admin());

insert into federations (country_id, code, name, short_name, site_url, sort_order)
select id, 'mnzg', 'MNZ Gorenjska Kranj', 'Gorenjska', 'https://www.mnzgkranj.si/', 1
  from countries where code = 'SI'
on conflict (code) do nothing;

-- --------------------------------------------------------------------------
-- Tekmovanje pripada zvezi
-- --------------------------------------------------------------------------
alter table competitions add column if not exists federation_id bigint references federations(id);

update competitions c
   set federation_id = (select f.id from federations f where f.code = c.source)
 where c.federation_id is null;

-- Ostane ničelen: tekmovanje brez znane zveze naj se še vedno da vpisati,
-- izbirnik ga pokaže pod državo brez skupine.
comment on column competitions.federation_id is
  'Zveza, ki tekmovanje objavlja. Ničelno je dovoljeno — izbirnik tako tekmovanje pokaže brez skupine.';

-- --------------------------------------------------------------------------
-- Pogled za izbirnik
-- --------------------------------------------------------------------------
-- `create or replace` ne more prerazporediti stolpcev, `c.*` pa se je ravno
-- razsiril za `federation_id` — zato najprej odvrzemo. Pogled je nov in nanj
-- se nic ne kaze.
drop view if exists competitions_view;

create view competitions_view as
  select c.*,
         d.code       as country_code,
         d.name       as country_name,
         f.code       as federation_code,
         f.name       as federation_name,
         f.short_name as federation_short,
         f.site_url   as federation_url,
         f.sort_order as federation_sort
    from competitions c
    join countries d on d.id = c.country_id
    left join federations f on f.id = c.federation_id;

comment on view competitions_view is
  'Tekmovanja z državo in zvezo — vse, kar izbirnik potrebuje za grupiranje in iskanje.';
