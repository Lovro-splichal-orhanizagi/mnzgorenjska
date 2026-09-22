-- Kdo je zdaj odsoten — na enem mestu, da se to vidi tam, kjer se odloča.
--
-- Poročila o poškodbah so doslej živela samo na strani Odsotnosti in na
-- profilu igralca. Manager, ki sestavlja ekipo, jih ni videl: da bi izvedel,
-- da je napadalec poškodovan, bi moral na vsakega posebej klikniti. Pet
-- poročil je v bazi in vsa so samoprijave igralcev — torej najzanesljivejši
-- vir, ki ga imamo — pa vendar jih ob nakupu ni videl nihče.
--
-- Pogled pove zadnje stanje na igralca: šteje samo ZADNJE poročilo. Če je
-- zadnje "vrnitev", igralec ni odsoten; poročilo, starejše od 30 dni, pa ne
-- pomeni ničesar — poškodba brez novice se pozdravi sama.

create or replace view odsotni_igralci as
select distinct on (r.player_id)
       r.player_id,
       p.competition_id,
       r.kind,
       r.content,
       r.created_at
  from player_reports r
  join players p on p.id = r.player_id
 where r.created_at > now() - interval '30 days'
 order by r.player_id, r.created_at desc;

comment on view odsotni_igralci is
  'Zadnje poročilo na igralca v zadnjih 30 dneh. kind = vrnitev pomeni, da '
  'igralec NI odsoten — pogled vrne zadnje stanje, ne seznama poškodb.';

grant select on odsotni_igralci to anon, authenticated;
