-- Okno "Tvoj profil" na strani igralca: lastnik potrjenega profila vidi, koliko
-- ogledov ima profil in katere fantasy ekipe ga imajo. Brez kljukice (preverjen)
-- vidi le zamegljeno okno; številk funkcija takrat sploh ne vrne, da jih ni
-- mogoče prebrati iz odgovora.
--
-- Štejemo vse: vsak ogled strani igralca (tudi lastnikov, osvežitev in
-- iskalnike, ki jih zabeleži strežnik HTML), vse ekipe (tudi hišne) in vse
-- lige. Okno pravi "ogledi", ne "ljudje".

-- Stolpci namenoma brez končnice _id in brez tujih ključev: test FCF_TARGET
-- zavrne vsak *_id stolpec na tabeli, ki je ne pozna.
create table public.ogledi_igralcev (
  igralec bigint not null,
  dan date not null default current_date,
  drzava text not null default 'XX' check (drzava ~ '^[A-Z0-9]{2}$'),
  stevilo integer not null default 0,
  primary key (igralec, dan, drzava)
);
comment on table public.ogledi_igralcev is
  'Ogledi strani igralca po dnevu in državi (Cloudflare cf-ipcountry). Piše le zabelezi_ogled_igralca, bere le vaba_profila.';
revoke all on table public.ogledi_igralcev from public, anon, authenticated;

-- Brskalnik ob vsakem odprtju strani igralca, strežnik HTML za iskalnike
-- (ti JavaScripta ne poženejo). Država iz glave Cloudflara; strežnik HTML jo
-- poda sam, ker njegov klic ne gre skozi Cloudflare.
create or replace function public.zabelezi_ogled_igralca(p_igralec bigint, p_drzava text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drzava text := upper(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'cf-ipcountry',
    p_drzava, 'XX'));
begin
  if p_igralec is null or not exists (select 1 from players where id = p_igralec) then
    return;
  end if;
  if v_drzava !~ '^[A-Z0-9]{2}$' then
    v_drzava := 'XX';
  end if;
  insert into ogledi_igralcev (igralec, dan, drzava, stevilo)
  values (p_igralec, current_date, v_drzava, 1)
  on conflict (igralec, dan, drzava) do update
    set stevilo = ogledi_igralcev.stevilo + 1;
end;
$$;
revoke all on function public.zabelezi_ogled_igralca(bigint, text) from public;
grant execute on function public.zabelezi_ogled_igralca(bigint, text) to anon, authenticated;

-- Okno za lastnika profila. Vrne null, če klicatelj ni lastnik potrjenega
-- profila (ali so preverjeni izklopljeni). Brez kljukice le
-- {"preverjen": false}; s kljukico ogledi (7 dni, sezona, 8 tednov, države)
-- in ekipe vseh povezanih vrstic igralca z vlogo v ekipi, brez ostalega kadra.
create or replace function public.vaba_profila(p_igralec bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_zahtevek bigint := prevzem_zahtevek_igralca(p_igralec);
  v_igralci bigint[];
begin
  if auth.uid() is null or v_zahtevek is null or not vidi_preverjene()
     or not exists (select 1 from zahtevki_igralca z
                     where z.id = v_zahtevek and z.status = 'potrjen' and z.user_id = auth.uid()) then
    return null;
  end if;
  if not je_preverjen(p_igralec) then
    return jsonb_build_object('preverjen', false);
  end if;

  select array_agg(distinct x) into v_igralci
    from (select player_id as x from zahtevki_igralca where id = v_zahtevek
          union select player_id from povezani_igralci where zahtevek_id = v_zahtevek) s;

  return jsonb_build_object(
    'preverjen', true,
    'ogledi_7', (select coalesce(sum(stevilo), 0) from ogledi_igralcev
                  where igralec = any (v_igralci) and dan > current_date - 7),
    'ogledi_skupaj', (select coalesce(sum(stevilo), 0) from ogledi_igralcev
                       where igralec = any (v_igralci)),
    'tedni', (select coalesce(jsonb_agg(jsonb_build_object('teden', t.teden, 'ogledi', t.n) order by t.teden), '[]')
                from (select date_trunc('week', dan)::date as teden, sum(stevilo) as n
                        from ogledi_igralcev
                       where igralec = any (v_igralci) and dan >= date_trunc('week', current_date)::date - 49
                       group by 1) t),
    'drzave', (select coalesce(jsonb_agg(jsonb_build_object('drzava', d.drzava, 'ogledi', d.n) order by d.n desc), '[]')
                 from (select drzava, sum(stevilo) as n from ogledi_igralcev
                        where igralec = any (v_igralci) and dan > current_date - 30 and drzava <> 'XX'
                        group by 1 order by 2 desc limit 6) d),
    'ekipe', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', e.id, 'ime', e.ime, 'lastnik', e.lastnik, 'liga', e.liga,
                  'mesto', e.mesto, 'tock', e.tock, 'vloga', e.vloga) order by e.mesto nulls last, e.ime), '[]')
                from (with moje as (
                        select r.*, ft.name, ft.competition_id
                          from fantasy_roster r
                          join fantasy_teams ft on ft.id = r.fantasy_team_id
                         where r.player_id = any (v_igralci)
                         limit 500),
                      -- Lestvica vsake lige enkrat, ne enkrat na ekipo.
                      mesta as (
                        select s.fantasy_team_id, s.owner_name, s.total_points,
                               rank() over (partition by s.competition_id order by s.total_points desc)::int as mesto
                          from fantasy_team_standings s
                         where s.competition_id in (select distinct competition_id from moje))
                      select m.fantasy_team_id as id, m.name as ime, st.owner_name as lastnik, c.slug as liga,
                             st.total_points as tock, st.mesto,
                             case when m.is_captain then 'kapetan'
                                  when m.is_vice then 'podkapetan'
                                  when m.is_starter then 'postava'
                                  else 'klop' end as vloga
                        from moje m
                        join competitions c on c.id = m.competition_id
                        left join mesta st on st.fantasy_team_id = m.fantasy_team_id) e)
  );
end;
$$;
revoke all on function public.vaba_profila(bigint) from public;
grant execute on function public.vaba_profila(bigint) to authenticated;
