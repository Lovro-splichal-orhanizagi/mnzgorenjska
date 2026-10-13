-- Zamrznitev cene ob poškodbi (spec docs/superpowers/specs/2026-10-13-zamrznitev-cene-design.md).
--
-- Uradna odsotnost vrste poškodba ali bolezen zadrži padec cene "ni igral"
-- (−0.1 na krog): brez potrditve kluba največ 2 kroga, s potrditvijo
-- klubskega računa največ 6, vedno do vrnitve oziroma zaprtja in še en krog.
-- Zadržani padci gredo v `zadrzani_padci`; če odsotnost "ni držala" (igral
-- je med njo), jih `preveri_uradne_odsotnosti` uveljavi naenkrat. Dvig cene
-- zamrznitev nikoli ne prepreči. Dopust, kazen in drugo cene ne zamrznejo.

alter table public.uradne_odsotnosti
  add column if not exists klub_potrdil_at timestamptz,
  add column if not exists klub_potrdil uuid references public.profiles on delete set null;

create table public.zadrzani_padci (
  player_id      bigint not null references public.players on delete cascade,
  round_id       bigint not null references public.rounds on delete cascade,
  odsotnost_id   bigint not null references public.uradne_odsotnosti on delete cascade,
  znesek         numeric not null check (znesek < 0),
  created_at     timestamptz not null default now(),
  uveljavljeno_at timestamptz,
  primary key (player_id, round_id)
);
create index zadrzani_padci_odsotnost on public.zadrzani_padci (odsotnost_id) where uveljavljeno_at is null;
alter table public.zadrzani_padci enable row level security;
revoke all on public.zadrzani_padci from anon, authenticated;

-- Dan kroga: dan odigranja, sicer dan roka.
create or replace function public.dan_kroga(p_round_id bigint)
returns date language sql stable set search_path = public
as $$
  select coalesce(r.played_on, (r.deadline_at at time zone 'Europe/Ljubljana')::date)
    from rounds r where r.id = p_round_id
$$;

-- Odsotnost, ki v tem krogu zamrzne ceno te vrstice igralca (glavne ali
-- povezane), ali null. Krogi se štejejo v ligi in sezoni kroga od dneva
-- začetka odsotnosti dalje; konec je vrnitev ali zaprtje ("Spet sem nared"),
-- in še prvi krog na ta dan ali po njem.
create or replace function public.zamrznjena_odsotnost(p_player_id bigint, p_round_id bigint)
returns bigint language sql stable security definer set search_path = public
as $$
  with krog as (
    select r.id, r.competition_id, r.season, r.number, dan_kroga(r.id) as dan
      from rounds r where r.id = p_round_id
  ),
  krogi as (
    select r.number, dan_kroga(r.id) as dan
      from rounds r, krog k
     where r.competition_id = k.competition_id and r.season = k.season
  )
  select o.id
    from uradne_odsotnosti o
    join zahtevki_igralca z on z.id = o.zahtevek_id and z.status = 'potrjen'
    cross join krog k
   where o.vrsta in ('poskodba', 'bolezen')
     and o.status <> 'ni_drzalo'
     and (z.player_id = p_player_id
          or exists (select 1 from povezani_igralci pi where pi.zahtevek_id = z.id and pi.player_id = p_player_id))
     and k.dan >= o.od
     and (select count(distinct x.number) from krogi x where x.dan >= o.od and x.number <= k.number)
         <= case when o.klub_potrdil_at is not null then 6 else 2 end
     -- Brez potrditve kluba oseba v sezoni prihrani največ 2 padca, ne glede
     -- na to, kolikokrat odsotnost zapre in odpre (kroženje).
     and (o.klub_potrdil_at is not null or (
          select count(*) from zadrzani_padci zp
            join uradne_odsotnosti o2 on o2.id = zp.odsotnost_id
            join rounds rr on rr.id = zp.round_id
           where o2.zahtevek_id = o.zahtevek_id and o2.klub_potrdil_at is null
             and rr.season = k.season and zp.round_id <> k.id) < 2)
     -- Pred tem krogom ni bilo nobenega na dan konca ali po njem.
     and not exists (
       select 1 from krogi x
        where x.number < k.number
          and x.dan >= least(o.vrnitev,
                             case when o.status = 'zaprto' then (o.zaprto_at at time zone 'Europe/Ljubljana')::date end))
   order by o.created_at desc
   limit 1
$$;
revoke all on function public.dan_kroga(bigint), public.zamrznjena_odsotnost(bigint, bigint) from public, anon, authenticated;
-- Pogled `uradne_odsotnosti_view` (javen) ju kliče za `cena_zamrznjena`;
-- povesta le, kar pogled že kaže (dan kroga, ali je cena zamrznjena).
grant execute on function public.dan_kroga(bigint), public.zamrznjena_odsotnost(bigint, bigint) to anon, authenticated;

-- --------------------------------------------------------------------------
-- Klub potrdi odsotnost svojega igralca (poškodba, bolezen).
-- --------------------------------------------------------------------------
create or replace function public.klub_potrdi_odsotnost(p_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  o uradne_odsotnosti;
  v_team bigint;
begin
  select * into o from uradne_odsotnosti where id = p_id;
  select team_id into v_team from players where id = o.player_id;
  if auth.uid() is null or v_team is null or not je_klubski_racun(auth.uid(), v_team) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if o.user_id = auth.uid() then
    raise insufficient_privilege using message = 'Svoje odsotnosti ne moreš potrditi.';
  end if;
  if o.status <> 'odprto' or o.vrsta not in ('poskodba', 'bolezen') then
    raise exception 'Potrditi je mogoče le odprto poškodbo ali bolezen.';
  end if;
  update uradne_odsotnosti set klub_potrdil_at = now(), klub_potrdil = auth.uid()
   where id = p_id and klub_potrdil_at is null;
end;
$$;

-- Odprte poškodbe in bolezni igralcev kluba za razdelek Urejanje kluba.
create or replace function public.klub_odsotnosti(p_team_id bigint)
returns table (id bigint, player_id bigint, player_name text, vrsta text, od date, vrnitev date,
               opomba text, potrjena boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  return query
    select o.id, o.player_id, p.full_name, o.vrsta, o.od, o.vrnitev, o.opomba, o.klub_potrdil_at is not null
      from uradne_odsotnosti o
      join zahtevki_igralca z on z.id = o.zahtevek_id and z.status = 'potrjen'
      join players p on p.id = o.player_id
     where p.team_id = p_team_id and o.status = 'odprto' and o.vrsta in ('poskodba', 'bolezen')
     order by o.created_at desc;
end;
$$;
revoke all on function public.klub_potrdi_odsotnost(bigint), public.klub_odsotnosti(bigint) from public, anon;
grant execute on function public.klub_potrdi_odsotnost(bigint), public.klub_odsotnosti(bigint) to authenticated;

-- --------------------------------------------------------------------------
-- Borza: enaka kot 20260927220000_kontumacije.sql, le veja "ni igral" in CTE
-- `zadrzano` sta novi.
-- --------------------------------------------------------------------------
create or replace function public.preracunaj_cene(p_round_id bigint)
 RETURNS TABLE(igralec bigint, stara_cena numeric, nova_cena numeric, forma numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  NAJNIZJA constant numeric := (select najnizja from meje_borze());
  NAJVISJA constant numeric := (select najvisja from meje_borze());
  v_stevilka int;
  v_sezona text;
  v_tekmovanje bigint;
  v_prvi int;
  v_zadnja_sezona text;
  v_prejsnji bigint;
  v_po_starem boolean;
  v_z_odmikom boolean;
  -- Stare meje za kroge, odigrane pred to migracijo (glej glavo).
  STARA_NAJVISJA constant numeric := 15.0;
  STARI_ODMIK constant numeric := 3.0;
begin
  select r.number, r.season, r.competition_id, c.prvi_fantasy_krog, r.borza_po_starem, r.borza_z_odmikom
    into v_stevilka, v_sezona, v_tekmovanje, v_prvi, v_po_starem, v_z_odmikom
    from rounds r
    join competitions c on c.id = r.competition_id
   where r.id = p_round_id;
  if v_stevilka is null then
    raise exception 'krog % ne obstaja', p_round_id;
  end if;

  -- Krog, odigran pred novimi pravili, je zaključen (glej glavo migracije).
  if v_po_starem then
    return;
  end if;

  -- Arhivske sezone trga ne premikajo.
  select max(r.season) into v_zadnja_sezona
    from rounds r where r.competition_id = v_tekmovanje;
  if v_sezona is distinct from v_zadnja_sezona then
    return;
  end if;

  -- Krogi pred začetkom fantasy dela lige so samo rezultati.
  if v_stevilka < coalesce(v_prvi, 1) then
    return;
  end if;

  -- Brez odigrane tekme ni premika cene.
  if not krog_je_odigran(p_round_id) then
    return;
  end if;

  select r.id into v_prejsnji
    from rounds r
   where r.competition_id = v_tekmovanje
     and r.season = v_sezona
     and r.number = v_stevilka - 1
   order by r.id
   limit 1;

  return query
  with forma as (
    select
      ps.player_id,
      sum(ps.points) as tocke,
      sum(ps.points) filter (where ps.round_id = p_round_id) as tocke_kroga
    from player_scores ps
    join rounds r on r.id = ps.round_id
    where r.season = v_sezona
      and r.competition_id = v_tekmovanje
      and r.number between greatest(1, v_stevilka - 2) and v_stevilka
    group by ps.player_id
  ),
  -- Kdo je igral (minute > 0) in kateri klub je imel uvoženo tekmo, v tem
  -- in v prejšnjem krogu.
  igral as (
    select distinct a.player_id, m.round_id
      from appearances a
      join matches m on m.id = a.match_id
     where m.round_id in (p_round_id, v_prejsnji)
       and a.minutes_played > 0
  ),
  klub_igral as (
    select distinct x.team_id, m.round_id
      from matches m
      cross join lateral (values (m.home_team_id), (m.away_team_id)) x(team_id)
     where m.round_id in (p_round_id, v_prejsnji)
       and m.imported_at is not null
  ),
  stanje as (
    select
      p.id,
      p.value as stara,
      coalesce(f.tocke, 0) as tocke,
      coalesce(f.tocke_kroga, 0) as tocke_kroga,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = p_round_id) as je_igral,
      exists (select 1 from igral i where i.player_id = p.id and i.round_id = v_prejsnji) as prej_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = p_round_id) as klub_igral,
      exists (select 1 from klub_igral k where k.team_id = p.team_id and k.round_id = v_prejsnji) as prej_klub_igral
    from players p
    left join forma f on f.player_id = p.id
    where not p.value_locked
      and p.competition_id = v_tekmovanje
      and not exists (
        select 1 from price_changes pc
        where pc.player_id = p.id and pc.round_id = p_round_id
      )
      -- Zadržan padec je za ta krog obračun (20261013233100): če odsotnost
      -- pozneje "ni držala", ga uveljavi preverba, ne ponoven obračun.
      and not exists (
        select 1 from zadrzani_padci zp
        where zp.player_id = p.id and zp.round_id = p_round_id
      )
      -- Zapisniki enega kroga ne pridejo hkrati. Igralec, katerega klub v
      -- oknu forme se nima uvozene tekme, pocaka — brez vrstice v
      -- `price_changes` ga naslednji nocni tek obracuna znova, ko podatki
      -- pridejo. Cakajo posamezniki, ne cela liga (20260916140000).
      and not exists (
        select 1
          from rounds r
          join matches m on m.round_id = r.id
         where r.competition_id = v_tekmovanje
           and r.season = v_sezona
           and r.number between greatest(1, v_stevilka - 2) and v_stevilka
           and m.imported_at is null
           and not m.kontumacija
           and p.team_id in (m.home_team_id, m.away_team_id)
      )
  ),
  dvig as (
    select
      s.*,
      greatest(
        -- +0.1 za vsaki dve točki nad osnovnima dvema, največ +1.0
        least(1.0, greatest(0, floor((s.tocke_kroga - 2) / 2.0) * 0.1)),
        -- stalna forma ostane spodnja meja
        case
          when s.tocke >= 18 then 0.3
          when s.tocke >= 12 then 0.2
          when s.tocke >= 7 then 0.1
          else 0
        end
      ) as gor
    from stanje s
  ),
  premik as (
    select
      d.id,
      d.stara,
      d.tocke,
      case
        when d.je_igral and d.gor > 0 then d.gor
        -- rdeč karton, avtogol, kup prejetih — ali tri slabe tekme
        when d.je_igral and (d.tocke_kroga < 0 or d.tocke <= 2) then -0.1
        when d.je_igral then 0
        -- Ni igral: pade šele drugi zaporedni krog, ko je klub igral brez njega.
        -- Uradna poškodba ali bolezen (20261013233100): padec se zadrži.
        when d.klub_igral and d.prej_klub_igral and not d.prej_igral
             and zamrznjena_odsotnost(d.id, p_round_id) is not null then 0
        when d.klub_igral and d.prej_klub_igral and not d.prej_igral then -0.1
        else 0
      end as delta
    from dvig d
  ),
  omejeno as (
    select
      pr.id,
      pr.stara,
      pr.tocke,
      case
        when v_z_odmikom then least(
          greatest(pr.stara + pr.delta, NAJNIZJA, p.value_start - STARI_ODMIK),
          STARA_NAJVISJA,
          p.value_start + STARI_ODMIK
        )
        else least(greatest(pr.stara + pr.delta, NAJNIZJA), NAJVISJA)
      end as nova
    from premik pr
    join players p on p.id = pr.id
    where pr.delta <> 0
  ),
  -- Zadržani padci: kar bi borza odštela, če igralec ne bi javil poškodbe.
  -- Uveljavi jih preveri_uradne_odsotnosti, če odsotnost "ni držala".
  zadrzano as (
    insert into zadrzani_padci (player_id, round_id, odsotnost_id, znesek)
    select d.id, p_round_id, zamrznjena_odsotnost(d.id, p_round_id), -0.1
      from dvig d
     where not d.je_igral and d.klub_igral and d.prej_klub_igral and not d.prej_igral
       and zamrznjena_odsotnost(d.id, p_round_id) is not null
    on conflict (player_id, round_id) do nothing
  ),
  zapis as (
    insert into price_changes (player_id, round_id, old_value, new_value, form)
    select o.id, p_round_id, o.stara, o.nova, o.tocke
    from omejeno o
    where o.nova <> o.stara
    on conflict (player_id, round_id) do update
      set new_value = excluded.new_value,
          form = excluded.form,
          changed_at = now()
    returning price_changes.player_id, price_changes.old_value,
              price_changes.new_value, price_changes.form
  )
  select z.player_id, z.old_value, z.new_value, z.form from zapis z;
end;
$function$;

-- --------------------------------------------------------------------------
-- Preverba po uvozu: enaka kot 20261012135100, dodana uveljavitev zadržanih
-- padcev.
-- --------------------------------------------------------------------------
create or replace function public.preveri_uradne_odsotnosti()
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_n int;
begin
  with kandidati as (
    select distinct on (r.id) r.id, m.id as match_id, m.played_on, rp.competition_id
      from uradne_odsotnosti r
      join players rp on rp.id = r.player_id
      join zahtevki_igralca z on z.id = r.zahtevek_id and z.status = 'potrjen'
      join lateral (
        select z.player_id
        union
        select pi.player_id from povezani_igralci pi where pi.zahtevek_id = z.id
      ) s on true
      join appearances a on a.player_id = s.player_id and a.minutes_played > 0
      join matches m on m.id = a.match_id
     where r.status <> 'ni_drzalo'
       and (r.status = 'odprto' or r.zaprto_at > now() - interval '60 days')
       and m.played_on is not null
       and m.played_on >= r.od
       and (r.vrnitev is null or m.played_on < r.vrnitev)
       and m.played_on > (r.created_at at time zone 'Europe/Ljubljana')::date
       and (r.zaprto_at is null or m.played_on < (r.zaprto_at at time zone 'Europe/Ljubljana')::date)
     order by r.id, m.played_on, m.id
  )
  update uradne_odsotnosti r
     set status = 'ni_drzalo',
         zaprto_at = coalesce(r.zaprto_at, now()),
         ni_drzalo_datum = k.played_on,
         ni_drzalo_match_id = k.match_id,
         sezona = coalesce(sezona_lige(k.competition_id, k.played_on), r.sezona)
    from kandidati k
   where r.id = k.id;
  get diagnostics v_n = row_count;

  -- Zamrznitev ni držala: zadržani padci te odsotnosti se uveljavijo naenkrat
  -- (ne pod spodnjo mejo borze) in le enkrat (20261013233100). Kazen gre v
  -- `price_changes` zadnjega odigranega kroga igralčeve lige: nočna borza
  -- (uveljavi_zapadle_cene) cene nastavlja iz teh vrstic, zato bi neposreden
  -- popravek `players.value` povozila; tako je kazen tudi v zgodovini cene.
  -- Igralcu z ročno zaklenjeno ceno (`value_locked`) se kazen ne uveljavi.
  with vsote as (
    select zp.player_id, sum(zp.znesek) as vsota
      from zadrzani_padci zp
      join uradne_odsotnosti o on o.id = zp.odsotnost_id
     where o.status = 'ni_drzalo' and zp.uveljavljeno_at is null
     group by zp.player_id
  ),
  cilji as (
    select v.player_id, v.vsota, p.value,
           (select r.id from rounds r
             where r.competition_id = p.competition_id
               and r.season = (select max(r2.season) from rounds r2 where r2.competition_id = p.competition_id)
               and krog_je_odigran(r.id)
             order by r.number desc, r.id desc limit 1) as round_id
      from vsote v join players p on p.id = v.player_id
     where not p.value_locked
  ),
  zgodovina as (
    insert into price_changes (player_id, round_id, old_value, new_value, form)
    select c.player_id, c.round_id, c.value,
           greatest((select najnizja from meje_borze()), c.value + c.vsota), 0
      from cilji c where c.round_id is not null
    on conflict (player_id, round_id) do update
      set new_value = greatest((select najnizja from meje_borze()), price_changes.new_value + excluded.new_value - excluded.old_value),
          changed_at = now()
  ),
  cene as (
    update players p
       set value = greatest((select najnizja from meje_borze()), p.value + c.vsota)
      from cilji c
     where p.id = c.player_id
    returning p.id
  )
  update zadrzani_padci zp
     set uveljavljeno_at = now()
    from uradne_odsotnosti o
   where o.id = zp.odsotnost_id and o.status = 'ni_drzalo' and zp.uveljavljeno_at is null;

  return v_n;
end;
$$;

-- --------------------------------------------------------------------------
-- Javni pogled: dodana stolpca na koncu (pravice ostanejo).
-- --------------------------------------------------------------------------
create or replace view public.uradne_odsotnosti_view as
  select r.id,
         r.player_id,
         z.player_id as glavni_player_id,
         p.competition_id,
         coalesce(
           nullif(btrim(p.full_name), ''),
           btrim(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, ''))
         ) as player_name,
         t.id          as team_id,
         t.name        as team_name,
         t.short_name  as team_short,
         t.logo_url    as team_logo,
         r.vrsta,
         r.od,
         r.vrnitev,
         case when p.anonimiziran_at is null then r.opomba end as opomba,
         r.status,
         r.created_at,
         r.zaprto_at,
         r.ni_drzalo_datum,
         coalesce(r.user_id = auth.uid(), false) as moje,
         -- Zamrznitev cene (20261013233100): odprta poškodba ali bolezen;
         -- koliko krogov, pove `klub_potrdil` (2 brez, 6 s potrditvijo).
         -- Velja, dokler zadnji odigrani krog lige od začetka odsotnosti še
         -- spada v zamrznitev (ali odigranega kroga še ni bilo).
         (r.status = 'odprto' and r.vrsta in ('poskodba', 'bolezen') and (
            not exists (select 1 from rounds x where x.competition_id = p.competition_id
                          and dan_kroga(x.id) between r.od and (now() at time zone 'Europe/Ljubljana')::date)
            or zamrznjena_odsotnost(r.player_id,
                 (select x.id from rounds x where x.competition_id = p.competition_id
                    and dan_kroga(x.id) between r.od and (now() at time zone 'Europe/Ljubljana')::date
                  order by x.number desc, x.id desc limit 1)) is not null)) as cena_zamrznjena,
         r.klub_potrdil_at is not null as klub_potrdil
    from uradne_odsotnosti r
    join zahtevki_igralca z on z.id = r.zahtevek_id and z.status = 'potrjen'
    join players p on p.id = r.player_id
    left join teams t on t.id = p.team_id;
