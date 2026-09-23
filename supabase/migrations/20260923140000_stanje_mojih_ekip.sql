-- Stanje vseh mojih ekip naenkrat — za pas z obvestili na vrhu strani.
--
-- Pas je doslej preverjal le ekipo v IZBRANI ligi in le napake, zaradi
-- katerih ekipa ne dobi točk. Kdor igra v več ligah, za drugo ligo ni izvedel
-- ničesar; poškodovanega kapetana pa ni omenil nihče, ker ekipa z njim ostane
-- veljavna. Ta funkcija vrne za vsako mojo ekipo v aktivni ligi:
--   * ali je veljavna in zakaj ne (isti razlog kot v opozorilnem e-mailu),
--   * ali bo neveljavna ekipa ob roku res ostala brez točk — v prvem fantasy
--     krogu se zaklene tudi nepopolna (isto pravilo kot `zakleni_krog`),
--   * igralce kadra z veljavnim poročilom o poškodbi ali odsotnosti.
-- Vse v enem klicu, ker ima lahko človek ekipo v sedemnajstih ligah.

create or replace function public.stanje_mojih_ekip()
returns table (
  competition_id bigint,
  slug text,
  liga text,
  team_id bigint,
  team_name text,
  veljavna boolean,
  brez_tock boolean,
  razlog text,
  krog integer,
  rok timestamptz,
  opozorila jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.slug,
         coalesce(c.short_name, c.name),
         ft.id,
         ft.name,
         v.veljavna,
         not v.veljavna
           and nk.number is not null
           and nk.number >= greatest(nastavitev_int('strogi_zaklep_od_kroga', 2),
                                     coalesce(c.prvi_fantasy_krog, 1) + 1),
         case when not v.veljavna then razlog_neveljavne_ekipe(ft.id) end,
         nk.number,
         nk.deadline_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'player_id', p.id,
                    'ime', p.full_name,
                    'vrsta', o.kind,
                    'opis', o.content,
                    'datum', o.created_at,
                    'v_postavi', r.is_starter,
                    'kapetan', r.is_captain,
                    'namestnik', r.is_vice)
                  order by r.is_captain desc, r.is_vice desc, r.is_starter desc, p.full_name)
             from fantasy_roster r
             join players p on p.id = r.player_id
             join odsotni_igralci o on o.player_id = r.player_id
            where r.fantasy_team_id = ft.id
              and o.kind in ('poskodba', 'odsotnost')
         ), '[]'::jsonb)
    from fantasy_teams ft
    join competitions c on c.id = ft.competition_id and c.active
    cross join lateral (select roster_je_veljaven(ft.id) as veljavna) v
    left join naslednji_krog nk on nk.competition_id = c.id
   where ft.owner_id = auth.uid()
   order by c.sort_order nulls last, c.id;
$$;

revoke all on function public.stanje_mojih_ekip() from public, anon;
grant execute on function public.stanje_mojih_ekip() to authenticated;


-- Lendava MNL igra ob nedeljah ob 10:00; privzeti pomak šest ur je rok
-- postavil na 4:00 zjutraj, ko ekipe nihče ne ureja. Isto kot mladinci.
update public.competitions set rok_pomak_ur = 2 where slug = 'le-mnl';

update public.rounds r
   set deadline_at = r.deadline_at + interval '4 hours'
  from public.competitions c
 where c.id = r.competition_id
   and c.slug = 'le-mnl'
   and r.lineups_locked_at is null
   and r.deadline_at > now()
   and extract(hour from r.deadline_at at time zone 'Europe/Ljubljana') < 7;
