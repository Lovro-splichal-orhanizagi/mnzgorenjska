-- SLF-457: klub 12917 "St. Valentin ASK 1b" je dvojnik kluba 3685 "St. Valent.ASK 1b"
-- (ÖFB preimenovanje, SLF-456 / #744). Ima 26 praznih tekem (id 1092497..1092522),
-- vsaka podvaja tekmo kluba 3685 v istem krogu. Izbris odobren na kartici SLF-457.
-- Na sveži bazi (CI) kluba ni: migracija ne naredi nič. Na produkciji se ustavi,
-- če stanje ni natanko tako, kot je bilo preverjeno (nič se ne briše na pol).
do $$
declare
  dup constant bigint := 12917;
  glavni constant bigint := 3685;
  n int;
  ids bigint[];
  fk record;
begin
  if not exists (select 1 from public.teams where id = dup) then
    return;
  end if;

  if (select name from public.teams where id = dup) <> 'St. Valentin ASK 1b'
     or not exists (select 1 from public.teams where id = glavni and name = 'St. Valent.ASK 1b') then
    raise exception 'SLF-457: klub % ali % nima pričakovanega imena', dup, glavni;
  end if;

  select array_agg(id order by id) into ids
    from public.matches where home_team_id = dup or away_team_id = dup;
  if ids is distinct from (select array_agg(g::bigint order by g) from generate_series(1092497, 1092522) g) then
    raise exception 'SLF-457: tekme kluba % niso natanko 1092497..1092522 (%)', dup, ids;
  end if;

  select count(*) into n from public.matches
   where id = any (ids)
     and imported_at is null and zapisnik_id is null
     and coalesce(home_goals, 0) = 0 and coalesce(away_goals, 0) = 0;
  if n <> 26 then
    raise exception 'SLF-457: samo % od 26 tekem je praznih', n;
  end if;

  -- vsaka podvaja tekmo kluba 3685 v istem krogu
  select count(*) into n from public.matches d
   where d.id = any (ids)
     and exists (select 1 from public.matches g
                  where g.round_id = d.round_id
                    and (g.home_team_id = glavni or g.away_team_id = glavni)
                    and g.id <> all (ids));
  if n <> 26 then
    raise exception 'SLF-457: samo % od 26 tekem podvaja tekmo kluba %', n, glavni;
  end if;

  -- nobena vrstica nikjer ne sme kazati na tekme ali klub (nastopi, goli, napovedi, popravki ...)
  for fk in
    select c.conrelid::regclass as tabela, a.attname as stolpec, c.confrelid as cilj
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and cardinality(c.conkey) = 1
       and c.confrelid in ('public.matches'::regclass, 'public.teams'::regclass)
       and c.conrelid <> 'public.matches'::regclass
  loop
    if fk.cilj = 'public.matches'::regclass then
      execute format('select count(*) from %s where %I = any ($1)', fk.tabela, fk.stolpec) into n using ids;
    else
      execute format('select count(*) from %s where %I = $1', fk.tabela, fk.stolpec) into n using dup;
    end if;
    if n > 0 then
      raise exception 'SLF-457: % vrstic v %.% še kaže na brisano', n, fk.tabela, fk.stolpec;
    end if;
  end loop;

  delete from public.matches where id = any (ids);
  get diagnostics n = row_count;
  if n <> 26 then
    raise exception 'SLF-457: izbrisanih % tekem namesto 26', n;
  end if;
  delete from public.teams where id = dup;
end $$;
