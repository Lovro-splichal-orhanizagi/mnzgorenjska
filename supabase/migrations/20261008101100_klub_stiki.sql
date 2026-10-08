-- Stiki s klubi: kdo je kateremu klubu pisal, kaj je klub odgovoril.
--
-- Doslej je bilo to v lokalnih datotekah enega človeka (~/Projects/SLFF/
-- outreach). Zdaj pišejo klubom trije, zato je seznam v administraciji in
-- vsak vidi, komu je že kdo pisal — da klub ne dobi istega maila dvakrat.
--
-- Naslovi so podatki klubov, ne uporabnikov, a jih vseeno vidi le admin.
--
-- `klub_stik`: en klub (en naslov) — stanje, kdo ga ima v rokah, opomba.
-- `klub_stik_posta`: vsak poslan mail (ali odgovor). Vpis tu sam posodobi
-- `zadnji_mail_at`, `mailov` in stanje (nov → poslano → opomnik), ne povozi
-- pa stanja, ki ga je nastavil človek (odgovoril, sodeluje, ne želi …).

create table public.klub_stik (
  id bigint generated always as identity primary key,
  team_id bigint references public.teams(id) on delete set null,
  klub text not null,
  drzava text not null check (drzava in ('SI', 'SK', 'HR')),
  liga_slug text,
  email text,
  kontakt text,
  vir_url text,
  stanje text not null default 'nov'
    check (stanje in ('nov', 'ni_maila', 'poslano', 'opomnik', 'odgovoril', 'sodeluje', 'ne_zeli', 'napacen_mail')),
  odgovorni text,
  opomba text,
  zadnji_mail_at timestamptz,
  mailov int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create unique index klub_stik_email_uq on public.klub_stik (lower(email)) where email is not null and email <> '';
create index klub_stik_team_idx on public.klub_stik (team_id);

create table public.klub_stik_posta (
  id bigint generated always as identity primary key,
  stik_id bigint not null references public.klub_stik(id) on delete cascade,
  poslano_at timestamptz not null default now(),
  vrsta text not null default 'prvi' check (vrsta in ('prvi', 'opomnik', 'odgovor', 'klic', 'drugo')),
  zadeva text,
  poslal text,
  opomba text,
  created_by uuid default auth.uid()
);
create index klub_stik_posta_stik_idx on public.klub_stik_posta (stik_id, poslano_at desc);

alter table public.klub_stik enable row level security;
alter table public.klub_stik_posta enable row level security;
create policy "admin ureja stike" on public.klub_stik for all
  using (is_admin()) with check (is_admin());
create policy "admin ureja posto stikov" on public.klub_stik_posta for all
  using (is_admin()) with check (is_admin());
revoke all on public.klub_stik, public.klub_stik_posta from anon;

create function public.klub_stik_ob_spremembi()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
create trigger klub_stik_spremenjen before update on public.klub_stik
  for each row execute function public.klub_stik_ob_spremembi();

create function public.klub_stik_ob_posti()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update klub_stik s
     set zadnji_mail_at = greatest(coalesce(s.zadnji_mail_at, new.poslano_at), new.poslano_at),
         mailov = s.mailov + case when new.vrsta in ('prvi', 'opomnik') then 1 else 0 end,
         stanje = case
           when new.vrsta = 'odgovor' and s.stanje in ('nov', 'poslano', 'opomnik') then 'odgovoril'
           when new.vrsta = 'opomnik' and s.stanje in ('nov', 'poslano') then 'opomnik'
           when new.vrsta = 'prvi' and s.stanje = 'nov' then 'poslano'
           else s.stanje
         end
   where s.id = new.stik_id;
  return new;
end $$;
revoke all on function public.klub_stik_ob_posti() from public;
create trigger klub_stik_posta_vpisana after insert on public.klub_stik_posta
  for each row execute function public.klub_stik_ob_posti();
