-- Dvoje, kar je bilo javno, pa ne bi smelo biti.

-- === 1. Klepet je anonimen samo na videz ===================================
--
-- Sporocilo se pokaze pod psevdonimom ("Beli Navijac 45"), a je tabela
-- `chat_messages` imela politiko `javno branje using (true)` in z njo je bil
-- javen tudi `user_id`. Ker je javen tudi `fantasy_teams.owner_id`, se je dalo
-- z anonimnim kljucem vsako sporocilo pripisati konkretni ekipi — in prek
-- lestvice njenemu lastniku. Psevdonim torej ni skrival nicesar pred tistim,
-- ki je znal poklicati API.
--
-- Vsebina klepeta ostane javna, ker je mislena kot javna. Skrije se samo
-- avtorstvo: pogled vrne `je_moje`, ne `user_id`, in s tem je vmesniku
-- povedano vse, kar potrebuje (ali sme ponuditi brisanje).
create or replace view public.klepet_sporocila as
  select m.id,
         m.content,
         m.alias,
         m.created_at,
         (m.user_id = auth.uid()) as je_moje
    from public.chat_messages m;

-- Pogled tece s pravicami lastnika, zato sporocila vidi vsak, `user_id` pa
-- ne zapusti baze.
grant select on public.klepet_sporocila to anon, authenticated;

drop policy if exists "javno branje" on public.chat_messages;

-- Svoja sporocila avtor se vedno bere neposredno — po vpisu jih vmesnik
-- prebere nazaj, brisanje pa ze ima svojo politiko.
create policy "avtor bere svoja" on public.chat_messages
  for select using (auth.uid() = user_id or public.is_admin());

comment on view public.klepet_sporocila is
  'Klepet brez avtorstva: vsebina je javna, user_id ne zapusti baze.';

-- === 2. Koda zasebne mini lige je bila javna ===============================
--
-- `mini_lige` je imela `branje mini lig using (true)`, torej je bilo mogoce
-- prebrati vse mini lige skupaj s `code`. Koda je edino, kar mini ligo zapira
-- — kdor jo ima, se pridruzi. Doslej ni bilo skode le zato, ker mini lige se
-- ni uporabil nihce.
--
-- Pridruzevanje po kodi tece prek `pridruzi_mini_ligi`, ki je SECURITY
-- DEFINER, zato zaostritev ne zapre poti tistemu, ki kodo res ima.
-- Politika ne more brati tabele, ki jo varuje — zato pripadnost pove funkcija
-- s pravicami lastnika. Brez tega Postgres javi `infinite recursion detected
-- in policy for relation "mini_liga_clani"`, ker bi politika mini lige brala
-- clane, politika clanov pa mini ligo.
create or replace function public.sem_v_mini_ligi(p_liga bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1
             from mini_liga_clani c
             join fantasy_teams t on t.id = c.fantasy_team_id
            where c.mini_liga_id = p_liga and t.owner_id = auth.uid()
         )
      or exists (
           select 1 from mini_lige l
            where l.id = p_liga and l.owner_id = auth.uid()
         );
$$;

revoke all on function public.sem_v_mini_ligi(bigint) from public;
grant execute on function public.sem_v_mini_ligi(bigint) to authenticated;

drop policy if exists "branje mini lig" on public.mini_lige;

create policy "clan bere svojo mini ligo" on public.mini_lige
  for select using (public.sem_v_mini_ligi(id));

-- Enako za clanstvo: kdo je v zasebni ligi, je stvar te lige.
drop policy if exists "branje clanov" on public.mini_liga_clani;

create policy "clan bere sotekmovalce" on public.mini_liga_clani
  for select using (public.sem_v_mini_ligi(mini_liga_id));

-- Lestvica mini lige je doslej tekla s pravicami lastnika pogleda in je zato
-- obsla RLS: kdor je uganil `mini_liga_id`, je prebral tujo zasebno lestvico.
-- Odslej velja zanjo isto pravilo kot za tabelo pod njo.
alter view public.mini_liga_lestvica set (security_invoker = on);
