-- Dejanja prijavljenih uporabnikov: kje se posameznik ustavi.
--
-- `lijak_dnevno` šteje korake brez uporabnika in zato ne pove, kaj je naredil
-- tisti, ki ekipe ni sestavil ali ni plačal. Od zdaj `zabelezi_korak` pri
-- prijavljenem zapiše še vrstico z njegovim id-jem in platformo, če to
-- odjemalec dovoli (`p_osebno`: brskalnik brez "Ne sledi"). Neprijavljenih ne
-- beležimo osebno (brez oznake naprave, torej brez soglasja za piškotke).
--
-- Zasebno: brez pravic za anon/authenticated, zaprto za agente, izbris po
-- 90 dneh in z računom. Bere le servis (poročilo lijaka) in admin prek RPC.

create table public.dejanja_uporabnikov (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  dejanje text not null,
  platforma text check (platforma in ('web', 'ios', 'android')),
  created_at timestamptz not null default now()
);
create index dejanja_uporabnikov_uporabnik on public.dejanja_uporabnikov (user_id, created_at);
create index dejanja_uporabnikov_cas on public.dejanja_uporabnikov (created_at);

alter table public.dejanja_uporabnikov enable row level security;
revoke all on public.dejanja_uporabnikov from public, anon, authenticated;

insert into agent.zaprte_tabele (tabela, zakaj) values
  ('public.dejanja_uporabnikov', 'dejanja posameznih uporabnikov v aplikaciji')
on conflict (tabela) do nothing;

-- Stari klic (en parameter) iz starih svežnjev v aplikaciji ostane veljaven
-- prek privzetih vrednosti; osebno zapiše le novi odjemalec.
drop function public.zabelezi_korak(text);
create function public.zabelezi_korak(p_korak text, p_platforma text default null, p_osebno boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_korak not in ('prazna_ekipa', 'predlog', 'prva_shramba', 'sestavi_iz_maila', 'pivo',
                     'vodic_zacetek', 'vodic_preskok', 'vodic_konec',
                     'osnutek_brez_prijave', 'osnutek_shranjen', 'igralec_cta', 'kartica_deljena',
                     'pivo_okno', 'pivo_okno_ekipa', 'pivo_okno_krog', 'pivo_klik_ekipa', 'pivo_klik_krog',
                     'pivo_okno_zaprto', 'push_pas', 'push_pas_zaprt', 'push_dovoljeno', 'push_zavrnjeno',
                     'aplikacija_odprta') then
    return;
  end if;

  insert into lijak_dnevno (dan, korak, stevilo)
  values (current_date, p_korak, 1)
  on conflict (dan, korak) do update set stevilo = lijak_dnevno.stevilo + 1;

  -- Isto dejanje istega človeka največ enkrat na minuto (osvežitve, zanke).
  if p_osebno and auth.uid() is not null and not exists (
    select 1 from dejanja_uporabnikov
     where user_id = auth.uid() and dejanje = p_korak and created_at > now() - interval '1 minute'
  ) then
    insert into dejanja_uporabnikov (user_id, dejanje, platforma)
    values (auth.uid(), p_korak, case when p_platforma in ('web', 'ios', 'android') then p_platforma end);
  end if;
end;
$$;
revoke all on function public.zabelezi_korak(text, text, boolean) from public;
grant execute on function public.zabelezi_korak(text, text, boolean) to anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('dejanja-90-dni', '40 3 * * *',
    $urnik$delete from public.dejanja_uporabnikov where created_at < now() - interval '90 days'$urnik$);
exception
  when others then
    raise notice 'pg_cron ni na voljo (%): stara dejanja se ne brišejo sama.', sqlerrm;
end;
$$;
