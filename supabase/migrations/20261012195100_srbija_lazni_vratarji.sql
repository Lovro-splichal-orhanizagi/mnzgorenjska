-- Srbija: igralci iz polja, ki jih je ENA oznaka vratarja prekrstila v GK.
--
-- Uvoz (smeVVrata v scripts/uvoz-zapisnikov.mjs) igralca z neznano ali ugibano
-- pozicijo za vselej prekrsti v vratarja, ko ga en sam zapisnik označi za
-- vratarja. Srbski viri (fsb, fss, fssid) označijo le vratarja, COMET pa igralca
-- iz polja na posamezni tekmi kdaj vodi kot vratarja (Mirković Dalibor,
-- Šarbanovac: 5 tekem z 11 ob vratarju Paunoviću, na eni z 1 in (G) — tako ga
-- kažeta fss.rs in prvaliga.rs). Tako so napadalci s 5–7 goli postali vratarji.
-- Odslej jih po vsakem uvozu vrne scripts/lazni-vratarji.mjs; ta migracija
-- popravi obstoječe po istem pravilu.
--
-- Pravilo (zadnja sezona, v kateri je igralec začel kako tekmo — letos ali,
-- če letos še ni igral, lani; le začetki): GK iz zapisnika je lažen, če je
-- vsaj 2 tekmi začel v polju, medtem ko je začel drug označen vratar njegove
-- ekipe, in je takih tekem več, kot jih je začel kot vratar.
--
-- Nova pozicija: kot v scripts/ugani-pozicije.mjs — znotraj kluba med igralci
-- brez zanesljive pozicije (z vsaj 180 minutami) je četrtina najboljših
-- strelcev na 90 minut FWD, med ostalimi 42 % z največ kartoni DEF, ostali MID;
-- premalo minut ali manj kot štirje v kadru → MID. position_source 'ugibanje'
-- (glasovanje ga lahko popravi). Cen ne preračunava; točke preračuna sprožilec
-- players_pozicija_preracun. Srbske lige 12. 10. 2026 nimajo fantasy ekip.

create temporary table _lazni_vratarji as
with lige as (
  select c.id from competitions c
   where c.slug like 'rs-%' and c.source in ('fsb', 'fss', 'fssid')
),
zacetki as (
  select a.player_id, a.match_id, a.team_id, a.is_goalkeeper, r.season
    from lige l
    join rounds r on r.competition_id = l.id
    join matches m on m.round_id = r.id
    join appearances a on a.match_id = m.id and a.started
),
-- Ekipe na tekmi, kjer je začel označen vratar.
z_vratarjem as (
  select distinct match_id, team_id from zacetki where is_goalkeeper
),
glasovi as (
  select z.player_id, z.season,
         count(*) filter (where z.is_goalkeeper) as gk,
         count(*) filter (where not z.is_goalkeeper and v.match_id is not null) as polje
    from zacetki z
    left join z_vratarjem v on v.match_id = z.match_id and v.team_id = z.team_id
   group by z.player_id, z.season
),
-- Zadnja sezona, v kateri je igralec začel kako tekmo.
zadnja as (
  select distinct on (player_id) * from glasovi order by player_id, season desc
)
select p.id, p.team_id, p.competition_id, g.season, g.gk, g.polje
  from players p
  join zadnja g on g.player_id = p.id
 where p.competition_id in (select id from lige)
   and p.position = 'GK' and p.position_source = 'zapisnik'
   and g.polje >= 2 and g.polje > g.gk;

create temporary table _lazni_razvrstitev as
with kader as (
  select po.id, po.team_id, po.competition_id,
         po.goals::numeric / greatest(1, po.minutes::numeric / 90) as goli90,
         coalesce(k.kartoni, 0)::numeric / greatest(1, po.minutes::numeric / 90) as kartoni90
    from player_overview po
    left join lateral (
      select sum(a.yellow_cards + a.red_cards) as kartoni from appearances a where a.player_id = po.id
    ) k on true
   where (po.competition_id, po.team_id) in (select competition_id, team_id from _lazni_vratarji)
     and (po.id in (select id from _lazni_vratarji)
          or po.position_source not in ('zapisnik', 'admin', 'glasovanje'))
     and po.minutes >= 180
),
po_golih as (
  select k.*,
         count(*) over w as n,
         row_number() over (w order by goli90 desc, id) as rg
    from kader k
  window w as (partition by competition_id, team_id)
),
napadalci as (
  select p.*, p.rg <= greatest(1, round(p.n * 0.25)) as fwd from po_golih p
),
po_kartonih as (
  select x.*,
         case when x.fwd then null
              else row_number() over (partition by x.competition_id, x.team_id, x.fwd
                                      order by x.kartoni90 desc, x.goli90 asc, x.id) end as rk
    from napadalci x
)
select id,
       case when n < 4 then 'MID'
            when fwd then 'FWD'
            when rk <= greatest(1, round(n * 0.42)) then 'DEF'
            else 'MID' end as poz
  from po_kartonih;

update players p
   set position = coalesce(r.poz, 'MID'), position_source = 'ugibanje'
  from _lazni_vratarji l
  left join _lazni_razvrstitev r on r.id = l.id
 where p.id = l.id and p.position = 'GK' and p.position_source = 'zapisnik';

drop table _lazni_razvrstitev;
drop table _lazni_vratarji;
